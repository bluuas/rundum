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
- **Say "Strava-connected", never "verified".**
- **Never imply affiliation with Strava**, and never scrape it.
- **Ask before adding anything outside the MVP scope.**

## Architecture

- Next.js 16 App Router. Note Next 16 renamed middleware to `proxy.ts`, and
  `params` / `searchParams` are promises.
- Server Components read data; **Server Actions** perform mutations, each one
  re-checking authentication and ownership (a Server Action is a public POST
  endpoint).
- Validation schemas in `src/lib/validation/` are shared by the client form and
  the server action, so the two cannot drift.
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
