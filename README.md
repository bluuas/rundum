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

**Status:** early prototype, under active development. Phases 1–5 of 10.

## What it does

- Sign in with Strava; accounts show a **Strava-connected** badge
- Create activities with a sport, time, approximate location, distance,
  pace or level, and a participant limit
- Discover activities nearby within a configurable radius
- Request to join; organizers approve or decline
- A public comment section on every activity
- Report and block, so the space stays usable

Launch city is **Schwyz, Switzerland**. The data model is multi-city from the
start — every activity carries a `city_id`.

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

Signing in with Strava needs a registered Strava application, so local
development uses mock authentication instead. Set `ALLOW_MOCK_AUTH=true` in
`.env.local` and a user switcher appears in the header. The mock login route
refuses to load when `NODE_ENV=production`, regardless of the flag.

## Scripts

| Command             | What it does                                             |
| ------------------- | -------------------------------------------------------- |
| `npm run dev`       | Start the dev server                                     |
| `npm run build`     | Production build                                         |
| `npm run check`     | Typecheck, lint and unit tests                           |
| `npm test`          | Unit tests (Vitest)                                      |
| `npm run test:e2e`  | Playwright tests on a phone viewport                     |
| `npm run smoke`     | End-to-end HTTP checks against a running dev server      |
| `npm run db:verify` | Checks RLS boundaries against the database, as anonymous |
| `npm run format`    | Format with Prettier                                     |

`npm run db:verify` is worth running after any change to the schema or to a
policy. It asserts, from outside the app with only the public anon key, that
`strava_tokens` is unreachable, that hidden and archived activities stay
invisible, that stored coordinates sit on the grid, and that both the searcher's
and the organizer's radius are enforced.

## Contributing

Issues and pull requests are welcome. Please note:

- **Never commit secrets.** `.env.local` is gitignored; `.env.example` documents
  the variables without values.
- Do not add scraping of Strava, or any feature that exposes a user's exact
  location.

## License

MIT — see [LICENSE](LICENSE).
