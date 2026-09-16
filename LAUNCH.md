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

- [ ] **Times render in the runtime's timezone, not Switzerland's.** _3–5 h._

`src/lib/format.ts` uses `date.getHours()`, so an activity at 18:30 in Schwyz
renders as 16:30 when the process runs in UTC — which is what Vercel runs. It
also changes between the server-rendered HTML and hydration, and shows a
visitor abroad the time in _their_ zone, which is wrong for a local app: 18:30
in Schwyz is 18:30 for everyone.

Invisible in development because the machine is already in Zurich, and
invisible to the unit tests because they construct their dates in local time
too, so they are self-consistent and cannot catch it. `cities.timezone` already
exists and is already populated.

Fix: pin the zone, and add a test that fails under `TZ=America/New_York`.

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

- [ ] **Account deletion and data export.** GDPR Art. 17 and 20, and the DSG
      equivalent. There is no delete-account path at all today. Answer the
      design question first: `activities.owner_id` cascades from `profiles`, so
      one person leaving currently deletes plans other people had joined.
      _5–8 h._

- [ ] **Rate limiting.** There is none, anywhere. Every Server Action is a
      public POST endpoint — creating activities, commenting, requesting a
      place, reporting someone. Nothing here is catastrophic, but one bored
      visitor can fill the database. _4–6 h._

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

- [ ] **Error monitoring and security headers.** No Sentry equivalent, and
      `next.config.ts` sets no headers or CSP. _4–6 h._

## Needed soon after, not necessarily before

- [ ] **Notifications.** Today somebody asks to join and the organizer finds
      out only if they happen to open the app. For a planning product this is
      close to fatal for retention, and it is the largest single item on this
      page. Start with three emails: request received, request decided,
      activity cancelled. _10–16 h._

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

2. **The success metric is client-writable.** `activity_events_insert` lets any
   authenticated user insert `activity_created` rows carrying their own
   `user_id`. The one number the product is judged on can be inflated from a
   browser console. It belongs in a `security definer` function, not in a
   policy that trusts the client.

3. **No rate limiting.** As above. On a demo deployment,
   `/api/auth/dev/login` is additionally an unauthenticated session minter.

4. **No account deletion.** A legal exposure as much as a missing feature.

5. **No security headers or CSP.**

6. **`profiles` is world-readable, including `is_admin`.** Anonymous visitors
   can enumerate who the admins are. Cheap to restrict.

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
