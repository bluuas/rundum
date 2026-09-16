# Rundum

Find people to train with, nearby and soon.

Rundum is a mobile-first web app for discovering and planning local sports
activities. Create an upcoming run, ride, hike or padel match, and see what
others have planned within a radius you choose.

> **Compatible with Strava.** Rundum is an independent project. It is not
> affiliated with, endorsed by, or sponsored by Strava, and is not an official
> Strava application. Strava is a trademark of Strava, Inc. Rundum uses Strava
> only as a sign-in provider, with the user's explicit consent, and never reads
> or displays Strava activity data.

**Status:** working prototype. All ten build phases are done; not yet launched.

## What it does

- Sign in with Strava; accounts show a **Strava-connected** badge
- Create activities with a sport, time, approximate location, distance,
  pace or level, and a participant limit
- Discover activities nearby within a configurable radius
- Request to join with an optional note; organizers approve or decline
- A public comment section on every activity
- Report an activity, a comment or a person; block someone and you stop
  seeing each other

Launch city is **Schwyz, Switzerland**. The data model is multi-city from the
start — every activity carries a `city_id`.

Available in **German and English**, German by default. The language is part of
the URL (`/de/...`, `/en/...`), so a link you share arrives in the language you
sent it in. Dates and times are always Swiss — 24-hour, `DD.MM.YYYY` — in both
languages; only the words around the numbers change.

## Strava API compliance

Rundum is built against the [Strava API Agreement](https://www.strava.com/legal/api)
and [brand guidelines](https://developers.strava.com/guidelines/). In practice:

- The only permitted interoperability phrases are "Powered by Strava" and
  "Compatible with Strava"; Rundum uses the latter, since it displays no Strava
  activity data
- Accounts are labelled **Strava-connected**, never "verified" — Rundum has
  verified nothing about the person
- Strava logos are never redrawn or approximated; sign-in uses the official,
  unmodified "Connect with Strava" button
- A user's Strava data is only ever shown to that user. Strava-sourced profile
  fields seed a Rundum profile the user then owns and consents to display
- Strava is called only during sign-in. Nothing is scraped or bulk-collected
- Disconnecting deletes the stored tokens and clears Strava-derived fields
- Rundum plans future activities; it does not record, import or analyse past
  workouts, so it does not replicate Strava's own functionality

## Privacy by design

Rundum never asks for, stores, or displays an exact personal location.

- Activity locations are **approximate meeting areas**, snapped server-side to a
  250 m grid before they are stored ([`src/lib/geo.ts`](src/lib/geo.ts))
- The map draws a circle, never a pin
- Distances in the feed are bucketed ("~3 km"), so repeated readings cannot be
  trilaterated back to a precise point
- There is no home-address column anywhere in the schema
- Strava access and refresh tokens stay server-side and are never sent to the
  browser

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres +
PostGIS + Auth) · Leaflet with OpenStreetMap tiles · Vitest · Playwright

## Getting started

Requires Node 24+.

```bash
git clone https://github.com/bluuas/rundum.git
cd rundum
npm install
cp .env.example .env.local   # then fill in your Supabase values
npm run dev
```

Open http://localhost:3000.

### Metrics

`/insights` shows how Rundum is doing against its one stated goal — the number
of activities created — and 404s for everyone else, with the gate enforced in
the database rather than in the page. The seed marks the first demo account as
an admin so the page is reachable in a fresh checkout. To grant it to a real
account:

```sql
update profiles set is_admin = true where id = '<user-id>';
```

`is_admin` grants access to the metrics functions and nothing else. It is not a
moderation role and does not bypass any policy.

### Database

Rundum uses a hosted Supabase project, managed from this repo:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npm run db:push     # apply migrations in supabase/migrations
npm run db:seed     # demo users and activities around Schwyz
npm run db:types    # regenerate src/lib/supabase/database.types.ts
```

### Development sign-in

Set `ALLOW_MOCK_AUTH=true` in `.env.local` and a user switcher appears in the
header, letting you sign in as any seeded demo user. The mock login route
refuses to load when `NODE_ENV=production`, regardless of the flag.

### Strava sign-in

Creating a Strava application requires a **Strava subscription**, and every new
application begins in **single-player mode** — only its own owner can
authenticate until it has ten connected athletes and passes Strava's review. The
sign-in flow therefore cannot be exercised against real Strava before launch.

Run the local stand-in instead:

```bash
npm run dev:strava     # fake Strava OAuth endpoints on :4400
```

and point the app at it:

```
STRAVA_AUTH_BASE_URL=http://localhost:4400
STRAVA_CLIENT_ID=fake-client-id
STRAVA_CLIENT_SECRET=fake-client-secret
```

Only the hostname differs from production. The state check, the code-for-token
exchange, server-side token storage, profile staging, the consent step and
deauthorization are the same code in both cases, and `e2e/strava-oauth.spec.ts`
runs against it. Going live is an environment change, not a code change.

Leaving `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` blank simply hides the
Strava button.

## Scripts

| Command              | What it does                                             |
| -------------------- | -------------------------------------------------------- |
| `npm run dev`        | Start the dev server                                     |
| `npm run dev:strava` | Local stand-in for Strava's OAuth endpoints              |
| `npm run build`      | Production build                                         |
| `npm run check`      | Typecheck, lint and unit tests                           |
| `npm test`           | Unit tests (Vitest)                                      |
| `npm run test:e2e`   | Playwright tests on a phone viewport                     |
| `npm run smoke`      | End-to-end HTTP checks against a running dev server      |
| `npm run db:verify`  | Checks RLS boundaries against the database, as anonymous |
| `npm run format`     | Format with Prettier                                     |

`npm run db:verify` is worth running after any change to the schema or to a
policy. It asserts, from outside the app with only the public anon key, that
`strava_tokens` is unreachable, that hidden and archived activities stay
invisible, that stored coordinates sit on the grid, and that both the searcher's
and the organizer's radius are enforced. It then signs in as a demo user to
check the rules a policy cannot express on its own — that a requester cannot
approve their own join request, that a pending requester cannot see who else is
coming, that a report has to name something real, and that blocking someone
actually removes them from the feed.

## Deploying

Rundum deploys to Vercel as a standard Next.js app; there is nothing to
configure beyond environment variables.

1. Import the repository in Vercel and set the Node version to 24.
2. Add the environment variables from `.env.example`. Only the two
   `NEXT_PUBLIC_` ones reach the browser; the rest must stay server-side.
3. **Do not set `ALLOW_MOCK_AUTH` or `DEMO_MODE` in production.** The mock
   login route refuses to load when `NODE_ENV=production`, so that flag alone
   cannot open it. `DEMO_MODE` deliberately does work in production — see
   _Publishing a demo_ below — so a real deployment must leave it unset.
4. Set `STRAVA_REDIRECT_URI` to `https://<your-domain>/api/auth/strava/callback`
   and register exactly that as the callback domain in your Strava application
   settings. Leave `STRAVA_AUTH_BASE_URL` unset so the app talks to real Strava.
5. Apply migrations to the production database with `npm run db:push`, and add
   your production domain to Supabase's allowed redirect URLs.

Before real users can sign in with Strava, the application has to leave
single-player mode: Strava limits a new application to its own owner until it
has ten connected athletes and passes review.

## Publishing a demo

Until Strava sign-in is available there is a second kind of deployment: a demo
anyone can try, where the seeded accounts are shared and you pick one from the
header. Deploy as above, then set `DEMO_MODE=true` and leave the three
`STRAVA_` values blank, which hides the Strava button rather than offering a
sign-in that cannot work.

Demo mode is a separate flag from `ALLOW_MOCK_AUTH` on purpose. That one is
disarmed in production so a stray env var can never open a real deployment, and
that property is worth keeping; this one says what it does in its name. What it
does _not_ change is who can be impersonated: the login route resolves the
address from `auth.users` and refuses anything that is not a seeded
`@demo.rundum.app` account, in every mode. An account created through Strava
belongs to a real person and is unreachable either way.

What a demo deployment gets:

- a shared-accounts warning in the header, on every screen;
- `robots.txt` disallowing everything, plus `noindex` — a demo full of seeded
  activities should not be what a search for Rundum finds;
- no Strava button, as long as the `STRAVA_` values are blank.

Two things to know before sending the link round:

- **Visitors write to a real database.** Give the demo its own Supabase
  project unless you are happy sharing one with development: `npm run db:seed`
  deletes every activity the demo accounts own, so a reseed throws away
  whatever your testers made, and the Playwright suite writes to the same
  tables while it runs.
- **Everyone can reach `/insights`**, since the admin account is one of the
  accounts on offer.

## Continuous integration

`.github/workflows/ci.yml` runs formatting, typecheck, lint, unit tests and a
production build on every pull request.

The database and browser tests are opt-in, because they need a real Supabase
project. Set the repository variable `RUN_E2E` to `true` and add
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` as secrets. That job reseeds the demo data, checks
the security boundaries with `db:verify`, and runs Playwright against the local
Strava stand-in — never against Strava itself.

## What is left before launch

[LAUNCH.md](LAUNCH.md) is the standing checklist: the open defects, the hard
gates (a second sign-in method, legal pages, account deletion, rate limiting),
what each is roughly worth in hours, and the security items ranked by what
would actually bite. Read it before planning work.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The short version: never commit
secrets, never store or display an exact location, keep Strava tokens
server-side, and ask before adding anything outside the MVP.

## License

MIT — see [LICENSE](LICENSE).
