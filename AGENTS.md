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
- **Disconnecting must delete.** Removing the Strava connection must delete the
  `strava_tokens` row and clear Strava-derived fields.
- **Do not replicate Strava's own functionality.** Rundum plans future
  activities; it must not record, import or analyse past workouts.

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

## UI

- Every screen needs four states: loading, empty, error, and content. Use the
  primitives in `src/components/ui/states.tsx` and the per-segment
  `loading.tsx` / `error.tsx` files.
- Layout: `AppHeader` spans full width; page content goes in `PageBody`
  (a 480px centred column that already clears the fixed bottom nav).
- Tap targets are at least 44px. Design tokens are in `src/app/globals.css`;
  use semantic classes (`bg-surface`, `text-fg-muted`) rather than raw palette
  colours, so dark mode keeps working.

## Before pushing

Run `npm run check` (typecheck + lint + unit tests).
