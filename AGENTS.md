<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Rundum — project conventions

Mobile-first web app for discovering local sports activities. Launch city:
Schwyz, CH. Primary success metric: **number of activities created**.

## Non-negotiables

- **Never commit secrets.** Only `.env.example` is tracked.
- **Strava tokens stay server-side.** They live in `strava_tokens`, which no RLS
  policy grants access to; only the service-role client reads it.
- **Never store or display an exact location.** Every coordinate passes through
  `snapToGrid` in `src/lib/geo.ts` before it reaches the database; feed
  distances are bucketed via `formatDistanceBucket`.
- **Dates and times are always Swiss.** 24-hour clock, `DD.MM.YYYY`. Never
  AM/PM, never month-first. Use the helpers in `src/lib/format.ts` and never
  `toLocaleString`, `toLocaleDateString` or a bare `Intl.DateTimeFormat` for a
  user-visible date — their output depends on the runtime's locale data, which
  is exactly how an en-US "7:30 PM" gets in. Native `<input type="date">` and
  `<input type="time">` render in the _browser's_ locale and cannot be
  overridden, so always restate the chosen moment underneath with
  `formatStartFull`.
- **Ask before adding anything outside the MVP scope.**

## Measuring

The primary success metric is **the number of activities created**. It is
counted from `activity_events`, not from rows in `activities`: an activity that
was later cancelled or deleted was still created, and the metric is about
whether people are using Rundum to plan, not about what survived. Anything that
would make creating an activity slower or more daunting needs a very good
reason.

`profiles.is_admin` gates the metrics functions and nothing else. It is not a
moderation role and bypasses no policy.

## Safety

- **Blocking is symmetric and has consequences beyond visibility.** `block_user`
  also withdraws any join request between the two people, in both directions —
  otherwise a blocked participant keeps a place at an activity RLS no longer
  lets them see, and it still counts against the limit. Unblocking restores
  visibility but never puts anyone back into an activity.
- **A missing activity and a blocked one render the same 404.** Distinguishing
  them would leak exactly what blocking is for.
- `reports.reason` stores a stable key (`spam`, `harassment`, …), never
  translated text: a moderator grouping reports should not be grouping by the
  reporter's language.

## Strava API compliance

Binding terms: <https://www.strava.com/legal/api> and the brand guidelines at
<https://developers.strava.com/guidelines/>. These are contractual, not
stylistic.

- **Say "Strava-connected", never "verified".** Rundum has verified nothing
  about the person, and must not imply Strava endorses them.
- **Never imply affiliation.** The app is not named after Strava, must not
  "suggest that your application is an official Strava app", and the word
  "Strava" must never be set larger or more prominently than "Rundum".
- **Attribution wording is fixed.** Only "Powered by Strava" or "Compatible
  with Strava" may be used as an interoperability claim. Rundum uses
  _Compatible with Strava_, since it does not display Strava activity data.
- **Never draw a Strava logo.** Logos must be the official unmodified EPS/SVG/
  PNG assets: "Never modify, alter or animate Strava logos", and "Never use any
  part of a Strava logo as the icon for your application". Do not approximate
  one in CSS or SVG — if the asset is not in the repo, use plain text.
- **Sign-in must use the official "Connect with Strava" button**, unmodified,
  pointing at `https://www.strava.com/oauth/authorize`.
- **Links to Strava content read "View on Strava"**, styled bold, underlined,
  or in `#FC5200`.
- **A user's Strava data may only be shown to that user.** Strava data about
  _other_ users may not be displayed at all, even when public on Strava. So
  Strava-sourced profile fields are a one-time seed for a Rundum profile the
  user then owns and consents to show; they are never re-read and re-published.
- **Never scrape, and never bulk-collect.** Only call Strava during sign-in.
- **Disconnecting must delete.** Removing the connection calls Strava's
  `/oauth/deauthorize` (revoking the grant is not the same as forgetting the
  token), then deletes the `strava_tokens` and `strava_profile_staging` rows and
  clears `strava_athlete_id`, `strava_connected` and `avatar_url` — the avatar
  URL points at Strava's CDN. `display_name` is deliberately kept: at the
  consent step it stopped being a mirror of Strava Data and became the user's
  own profile name, the one other people know them by. They can change it in
  the profile editor, which is what makes it theirs.
- **Do not replicate Strava's own functionality.** Rundum plans future
  activities; it must not record, import or analyse past workouts.

### Working on Strava sign-in

Creating a Strava application requires a **Strava subscription**, and every new
application starts in **single-player mode** — only its own owner can
authenticate until it has ten connected athletes and passes review. So the flow
cannot be developed or tested against real Strava before launch.

Use the local stand-in instead: `npm run dev:strava` plus
`STRAVA_AUTH_BASE_URL=http://localhost:4400`. Only the hostname changes — the
state check, the code exchange, token storage, profile staging, consent and
deauthorization are the same code. Do not add a "pretend to be connected"
shortcut in the app; that would leave the real path untested.

## Which database

Three, and confusing them is the expensive mistake:

- **local** — Docker, `npm run db:start`. Development and **every test**.
  `.env.local` points here.
- **demo** — the hosted `rundum-dummy` project, behind the published demo and
  nothing else. Reached only through `.env.demo`.
- **production** — hosted, created at launch. Nothing in this repo may seed it.

Demo accounts share a password printed in this repository, so `db:seed` asks
`scripts/target.ts` what it is talking to and refuses anything it does not
recognise. The Playwright suite and the smoke checks refuse anything but local:
they create, block and delete freely, and reseeding is part of running them.
Do not weaken those guards to make a run convenient.

A consequence worth keeping: the test suite can no longer disturb the demo, so
a reseed no longer throws away what people trying it have made.

## Demo deployments

`ALLOW_MOCK_AUTH` is disarmed when `NODE_ENV=production`, so that a stray env
var can never open a real deployment. Keep that. A published demo uses
`DEMO_MODE=true` instead — a separate flag that does work in production,
because that is what it is for, and whose name says so.

Neither flag widens _who_ can be impersonated. The login route resolves the
address from `auth.users` and refuses anything that is not a seeded
`@demo.rundum.app` account. That check, not the mode, is the security boundary,
and an account created through Strava is unreachable through it.

A demo deployment must stay obviously a demo: the shared-accounts banner in
`AppHeader`, `robots.txt` disallowing everything, and `noindex`.

## Languages

German and English, German by default — Schwyz is German-speaking.

- Locale lives in the **URL** (`/de/...`, `/en/...`), not a cookie, so a shared
  link carries its language and each language is separately cacheable.
  `proxy.ts` redirects an unprefixed path and 404s an unsupported one.
- `src/lib/i18n/dictionaries/en.ts` defines the shape; `de.ts` is typed as
  `Dictionary`, so a missing key is a build error, not an English string in a
  German page. Note `en.ts` must **not** use `as const`, or no translation could
  satisfy the type.
- Dictionary values are plain strings, never functions: the dictionary crosses
  the server/client boundary as a prop and must stay serializable. Use `fill()`
  for `{placeholders}` and `plural()` for counts.
- Server Components read `params.locale` and call `getDictionary`. Client
  Components call `useI18n()`. `loading.tsx` and `not-found.tsx` receive no
  params, so they must be Client Components that read context.
- Every internal link goes through `localeHref(locale, path)`.
- **Numbers stay Swiss in every language.** Only the words around them are
  translated — see `src/lib/format.ts`.
- The active dictionary is serialized into each page's HTML. Tests that match on
  raw HTML must strip `<script>` blocks first, or they will match strings that
  were never rendered.

## Architecture

- Next.js 16 App Router. Note Next 16 renamed middleware to `proxy.ts`, and
  `params` / `searchParams` are promises.
- Server Components read data; **Server Actions** perform mutations, each one
  re-checking authentication and ownership (a Server Action is a public POST
  endpoint).
- Validation schemas in `src/lib/validation/` are shared by the client form and
  the server action, so the two cannot drift.
- **A rule more specific than "this row is yours" belongs in a `security
definer` RPC, not an RLS policy.** A policy can say who may touch a row, but
  not which column they may change or which state transition they may make —
  which is how `join_requests_update` once let a requester approve their own
  request. `delete_comment`, `decide_join_request` and `activity_roster` are the
  pattern. Such RPCs raise application-defined SQLSTATEs (`RU001`…), and the UI
  maps the code to a translated message; never match on the exception text.
- Three Supabase clients in `src/lib/supabase/`: `browser`, `server`
  (request-scoped, respects RLS) and `admin` (service-role, bypasses RLS).
  An ESLint rule blocks importing `admin` outside `scripts/`, `src/app/api/`
  and `*.server.ts`.
- Filter state lives in the URL (`searchParams`), not React state, so feed
  views are shareable and the back button behaves.
- **Revalidate with `revalidateLocalized`, never `revalidatePath` directly.**
  Every page lives under a locale segment, so `revalidatePath('/profile')`
  matches no route — and fails silently, which is worse than erroring.
- **A `'use server'` module may only export async functions.** Exporting a
  schema or a constant from one is a runtime error that neither `tsc` nor
  ESLint catches, and it breaks _every_ action in that module. Validation
  schemas belong in `src/lib/validation/`.
- **Do not run `npm run build` while `next dev` is running.** They share
  `.next`, and the result is a dev server compiling against stale paths. Stop
  the dev server first, or delete `.next` afterwards.

## UI

- Every screen needs four states: loading, empty, error, and content. Use the
  primitives in `src/components/ui/states.tsx` and the per-segment
  `loading.tsx` / `error.tsx` files.
- Layout: `AppHeader` spans full width; page content goes in `PageBody`
  (a 480px centred column that already clears the fixed bottom nav).
- Tap targets are at least 44px. Design tokens are in `src/app/globals.css`;
  use semantic classes (`bg-surface`, `text-fg-muted`) rather than raw palette
  colours, so dark mode keeps working. A colour literal in a component is a
  bug — it survived the last repaint as `#0f766e` on the map circle, which is
  why that now takes its colour from `--brand` through a class.
- **Lines, not boxes.** Warm near-white paper, deep maroon accent. `--surface`
  equals `--bg` on purpose: a feed entry is part of the page rather than an
  object on it, so activity rows have no border, no fill and no radius, and the
  hairline between them comes from `divide-y` on the list. Panels that really
  are separate objects — organizer tools, the consent card, comments — keep
  their border, which is what still makes them read.
- **Fold with `<details>`, not state.** The sections on "My activities" are
  native `<details>`/`<summary>`, so they fold before hydration and the page
  stays a Server Component. The count stays in the header, because it is the
  only thing left to read once a section is closed. Folding is not remembered
  across navigations; nothing depends on it being remembered.
- **Sport badges are neutral.** One grey pill for every sport; the emoji and the
  name carry it. Ten hues were the loudest thing on a monochrome screen and read
  as decoration rather than information.
- **A gesture is never the only way to do something.** Swiping a feed row to
  the right requests a place, but the detail page keeps the button, which is
  what keyboard and screen-reader users get. So the revealed panel is
  `aria-hidden` and only the outcome is announced, and the gesture is offered
  only where it can succeed — signed in, and not on your own activity.
  Two things that cost an afternoon in `swipe-to-join.tsx`: a feed row is a
  link, and dragging a link starts a native drag-and-drop that fires
  `pointercancel` one move in unless `dragstart` is prevented; and the release
  must read how far the row travelled from a ref, because the `offset` state
  captured by the handler is a render behind on a fast swipe. In a Playwright
  swipe, `scrollIntoViewIfNeeded()` before `boundingBox()` — otherwise the drag
  lands on whatever is on screen and the test passes for the wrong reason.
- `--danger` is a brighter red than `--brand`, so "Cancel activity" does not
  arrive in the same colour as "Request to join". With a single red accent the
  two will always be close; keep them apart rather than letting them merge.

## Before pushing

Run `npm run check` (typecheck + lint + unit tests).
