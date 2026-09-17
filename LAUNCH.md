# Launch readiness

A snapshot of what stands between Rundum and a first public version, taken
**16.09.2026**. It is a working checklist, not a plan of record: tick things
off, and correct the estimates as you learn what they really cost.

Scope of "ship": a version you would hand to strangers in Schwyz, not to
friends. The demo deployment (`DEMO_MODE=true`, shared accounts) is a different
thing and is already live-able — see [README](README.md#publishing-a-demo).

## Where it stands

About 15,000 lines across `src`, `supabase`, `scripts` and `e2e`. 60 unit
tests, 50 Playwright tests, 23 smoke checks, CI on every pull request.

Working end to end: discovery with URL-held filters, the create flow, activity
details and comments, join requests with organizer approval, reporting and
blocking, an admin metrics page, German and English, and the full Strava OAuth
path against a local stand-in.

The hard parts are done and they are the right hard parts — the database is the
security boundary, coordinates are snapped before they are stored, and state
transitions live in `security definer` RPCs rather than in policies. What is
left is mostly not code: legal text, an email provider, a tile account, and one
decision about sign-in.

## Open defect

- [x] **Times render in the runtime's timezone, not Switzerland's.** Fixed.

It was on three surfaces, not one: display (`format.ts` read
`date.getHours()`), the write path (`combineDateAndTime` parsed
`'2026-07-15T18:30'` as the browser's local time, so an organizer scheduling
while abroad stored the wrong instant), and the feed's date filters, where
"today" meant the viewer's today. A fourth, one layer down: `metrics_daily`
bucketed the primary metric by the database session's days, so an activity
created at 00:30 in Schwyz counted on the day before.

All four now go through `src/lib/time.ts`, or through
`at time zone 'Europe/Zurich'` in SQL. The unit suite runs under
`TZ=America/New_York` and Playwright renders under `TZ=UTC`, which is what
makes the fix testable at all.

## Hard gates

Nothing below is optional for a public version.

- [ ] **A second sign-in method.** Strava limits every new application to
      "single-player mode" — only its owner can authenticate until ten athletes
      have connected and it passes review. Ten athletes cannot connect if they
      cannot sign in, so Strava cannot be the front door. It has to be an
      optional _link-later_ on an account created some other way; email magic
      link via Supabase is the cheapest path. This also means the Strava
      subscription is not an urgent purchase. _8–12 h._

- [ ] **Privacy policy, imprint, terms.** Switzerland's revised DSG applies,
      and GDPR too for any EU visitor. Rundum handles location-adjacent data
      and Strava-sourced profile fields, so a privacy notice is required, not
      advisable. Terms should also set a minimum age — strangers meeting for
      sport, with no age boundary stated anywhere today. _6–10 h, plus review
      by someone qualified._

- [x] **Account deletion.** Deleting detaches rather than destroys: upcoming
      activities are cancelled so the people who joined see what happened, past
      ones stay without a name on them, comments become tombstones, and the
      confirmation states the cost in numbers first.

- [ ] **Data export.** GDPR Art. 20. Not built. Less urgent than erasure —
      there is little to export beyond a profile and a list of activities —
      but it is the other half of the same right. _3–5 h._

- [x] **Rate limiting.** Every mutating Server Action now goes through
      `withinRateLimit`: a fixed window in Postgres keyed on `auth.uid()`
      inside the database function. Limits are in `src/lib/rate-limit.ts`.
      Anonymous traffic is still unmetered and belongs at the edge.

- [x] **Split the demo and production databases.** Done differently than
      planned, because Supabase allows two projects per organization and one
      was already spoken for: development and every test now run on a local
      Docker stack, the one hosted project is the demo, and production gets a
      fresh project at launch. `scripts/target.ts` refuses to seed anything it
      does not recognise.

- [ ] **Map tiles on a licensed provider.** `tile.openstreetmap.org` is covered
      by the OSMF tile usage policy, which excludes production applications.
      MapTiler or Stadia free tiers cover this; both need an account and a key.
      _2–4 h._

- [x] **Error monitoring — decided: the deployment's own log search**, no
      vendor. `reportError` emits one structured JSON line per failure with a
      stable scope, so failures are searchable rather than merely printed.

Known gap: client-side errors reach no server log, so a JavaScript failure in
somebody's browser is invisible unless they tell you. If that starts costing
more than it saves, Sentry is the answer.

- [x] **Security headers.** HSTS, nosniff, `Referrer-Policy`,
      `Permissions-Policy`, `frame-ancestors 'none'` and a nonce-based CSP,
      all set in `proxy.ts`.

## Needed soon after, not necessarily before

- [x] **In-app notifications.** A bell in the header with an unread count, and
      a page listing what happened: somebody asked to join, the organizer
      decided, an activity was cancelled, somebody commented. Written by
      database triggers, so nothing has to remember to send them.

- [ ] **A channel that actually reaches people.** _8–14 h._

In-app notifications make the telling visible; they do not make it arrive.
Somebody who does not open Rundum still turns up to a run that was cancelled
this morning.

Two ways to close that, neither needing an email provider. **Web Push** uses
VAPID keys you generate yourself — no third party at all — and works on Android,
but on iOS only once the app has been added to the home screen, which is a real
caveat for a mobile-first app in Switzerland. **Email** reaches everybody, and
needs a domain, DNS records and a sender.

- [ ] **A moderation inbox.** `submit_report` works and rows land in `reports`,
      where no human ever sees them. Either build somewhere to read them or
      take the button away — a report that goes nowhere is worse than no report
      button, because it tells the reporter something was done. _5–8 h._

- [ ] **Icons, manifest, sitemap, OG images, an about page.** `robots.ts`
      exists; `sitemap.xml` does not. _8–14 h._

## Effort

|                                                 | Hours     |
| ----------------------------------------------- | --------- |
| Second sign-in method                           | 8–12      |
| Timezone fix and pinning                        | 3–5       |
| Privacy policy, imprint, terms                  | 6–10      |
| Account deletion and data export                | 5–8       |
| Rate limiting                                   | 4–6       |
| Moderation inbox                                | 5–8       |
| Email notifications                             | 10–16     |
| Licensed map tiles                              | 2–4       |
| Error monitoring, security headers              | 4–6       |
| Split demo and production databases             | 2–3       |
| Icons, manifest, sitemap, OG images, about page | 8–14      |
| **Known work**                                  | **58–92** |

Add the usual buffer for what surfaces on contact with reality — the timezone
bug on this page was found by checking one file, and it was not on anybody's
list. Call it **75–130 hours**: two to three weeks full time, or eight to
twelve weeks of evenings.

A quieter target — in front of strangers, but not promoted — is sign-in,
timezone, legal pages, rate limiting, tiles and monitoring: **35–50 hours**.
Notifications and moderation can wait a few weeks if somebody is watching the
database daily.

## Security

Ordered by what would actually bite.

1. ~~**Demo and production must not share a Supabase project.**~~ Addressed.
   `DEMO_PASSWORD` is in a public repository and the anon key is public by
   design, so anyone can authenticate as a demo account directly against
   Supabase, bypassing the app. That is fine for a demo — it is the point — and
   is now confined to one project that will never hold a real account.
   The remaining rule: **never run `db:seed` against production**, which
   `scripts/target.ts` now enforces rather than trusting.

2. ~~**The success metric is client-writable.**~~ Fixed: a trigger writes it
   and no policy lets a client insert one.

3. ~~**No rate limiting.**~~ Fixed for signed-in traffic. Still open: on a demo
   deployment `/api/auth/dev/login` is an unauthenticated session minter, and
   anonymous traffic generally is unmetered. That belongs at the edge — Vercel
   WAF or similar — rather than in the database.

4. ~~**No account deletion.**~~ Built. Data _export_ is still missing.

5. ~~**No security headers or CSP.**~~ Fixed, in `proxy.ts`.

6. ~~**`profiles` is world-readable, including `is_admin`.**~~ Fixed: the
   table-wide grant is replaced by a column list that omits it.

What is already right, and worth not regressing: Strava tokens live in a table
no RLS policy grants access to, read only by the service-role client.
Coordinates pass through `snapToGrid` inside the database, so the privacy rule
cannot be bypassed by a bug in the app. Rules more specific than row ownership
live in `security definer` RPCs. Blocking is symmetric and frees the seat.

One residual worth naming in the privacy policy rather than fixing: somebody
who posts twenty activities from the same meeting point reveals a 250 m cell
they are probably in a lot.

Two things to confirm in the Supabase dashboard, which this repository cannot
see: what the current plan actually retains as backups and whether a restore
works, and that leaked-password protection and email confirmation are set the
way you expect. Note that a backup contains `strava_tokens`.

## The risk that is not engineering

An activities app in a town of 15,000 shows an empty feed to its first fifty
visitors. Everything built so far optimises _creating_ an activity; none of it
creates supply. Before launch: somebody — probably you — posting real
activities every week, and an answer to who else will.

The empty state is already a funnel rather than a dead end, and the primary
metric counts activities created rather than activities surviving. Both were
deliberate. Neither is a substitute for a first twenty activities that real
people turn up to.
