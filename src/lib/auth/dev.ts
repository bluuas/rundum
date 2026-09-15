/**
 * Mock authentication for development.
 *
 * Signing in with Strava needs a registered Strava application and a public
 * callback URL, which makes local development awkward. Instead, demo accounts
 * seeded by scripts/seed-demo.ts share a known password, and the dev login
 * route signs in as one of them.
 *
 * This produces a *real* Supabase session, so nothing downstream — RLS, Server
 * Actions, auth.uid() — needs a development branch.
 */

/** Matches DEMO_PASSWORD in scripts/seed-demo.ts. Development only. */
export const DEMO_PASSWORD = 'rundum-demo-password'

/** Demo accounts all live on this domain, which is how the switcher finds them. */
export const DEMO_EMAIL_DOMAIN = 'demo.rundum.app'

/**
 * Two independent conditions, both required. The env flag alone is not enough:
 * if it were ever set in a production deployment, anyone could sign in as
 * anyone.
 */
export function isMockAuthEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ALLOW_MOCK_AUTH === 'true'
}
