# Contributing to Rundum

Issues and pull requests are welcome. This document is the short version of
[`AGENTS.md`](AGENTS.md), which holds the full conventions.

## Getting set up

Requires Node 24+.

```bash
npm install
cp .env.example .env.local   # fill in your Supabase values
npm run dev
```

You need your own Supabase project; see the README for `db:push` and `db:seed`.
Sign in locally with `ALLOW_MOCK_AUTH=true` and the user switcher in the header.

## Before opening a pull request

```bash
npm run check        # typecheck, lint, unit tests
npm run db:verify    # security boundaries, against your own database
npm run test:e2e     # browser tests, needs a running dev server
```

CI runs the first of these on every pull request. The database and browser
tests are opt-in, because they need a real project to run against.

## The rules that are not negotiable

These are not style preferences. A pull request that breaks one will not be
merged, however good the rest of it is.

- **Never commit secrets.** `.env.local` is gitignored; `.env.example`
  documents the variables without values.
- **Never store or display an exact location.** There is no home-address column
  anywhere in the schema, and there must not be one. Coordinates go through
  `snapToGrid` before they reach the database, the map draws a circle rather
  than a pin, and feed distances are bucketed.
- **Strava tokens stay server-side**, in a table with RLS enabled and no
  policies. Do not add one.
- **Do not scrape Strava, and do not import or analyse past workouts.** Rundum
  plans future activities. Strava is called once, at sign-in, and there is no
  client for anything else — keep it that way.
- **Do not imply affiliation with Strava.** Accounts are "Strava-connected",
  never "verified". The only permitted interoperability phrases are "Powered by
  Strava" and "Compatible with Strava". Never redraw or approximate a Strava
  logo.
- **Dates and times are always Swiss**: 24-hour, `DD.MM.YYYY`. Use the helpers
  in `src/lib/format.ts`, never `toLocaleDateString` or a bare
  `Intl.DateTimeFormat` for anything a user will read.
- **Ask before adding anything outside the MVP scope.**

## Things that are easy to get wrong here

- **Authorization belongs in the database.** A rule more specific than "this row
  is yours" goes in a `security definer` RPC, not an RLS policy — a policy
  cannot say which column may change or which state transition is allowed.
- **Revalidate with `revalidateLocalized`**, never `revalidatePath` directly:
  every page lives under a locale segment, so an unprefixed path matches no
  route and fails silently.
- **A `'use server'` module may only export async functions.** Exporting a
  schema from one breaks every action in it, at runtime, invisibly to the type
  checker. Validation schemas live in `src/lib/validation/`.
- **Every screen needs four states**: loading, empty, error and content.
- **German and English both.** `en.ts` defines the shape; a missing German key
  is a build error. Numbers stay Swiss in both.

## Working on Strava sign-in

Creating a Strava application requires a Strava subscription, and new
applications start in single-player mode where only the owner can authenticate.
Use the local stand-in instead — `npm run dev:strava` — which implements the
three endpoints Rundum calls. Do not add a "pretend to be connected" shortcut in
the app: that would leave the real path untested.

## Commit messages

Say what changed and why it was worth changing. The why is the part nobody can
reconstruct later.
