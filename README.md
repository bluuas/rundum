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

**Status:** early prototype, under active development. Phases 1–8 of 10.

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

## Contributing

Issues and pull requests are welcome. Please note:

- **Never commit secrets.** `.env.local` is gitignored; `.env.example` documents
  the variables without values.
- Do not add scraping of Strava, or any feature that exposes a user's exact
  location.

## License

MIT — see [LICENSE](LICENSE).
