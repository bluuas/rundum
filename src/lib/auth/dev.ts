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

/**
 * Public demo mode: account switching on a deployed build, deliberately.
 *
 * `ALLOW_MOCK_AUTH` cannot do this — it is disarmed in production precisely so
 * that a stray env var cannot open a real deployment, and that property is
 * worth keeping. This is a separate flag whose name states what it does, so
 * turning it on is a decision rather than an accident.
 *
 * What it does **not** do is widen who can be impersonated. The login route
 * resolves the address from auth.users and refuses anything that is not a
 * seeded `@demo.rundum.app` account, in both modes. An account created through
 * Strava belongs to a real person and is unreachable either way.
 *
 * Never set this on a deployment with real users.
 */
export function isDemoModeEnabled(): boolean {
  return process.env.DEMO_MODE === 'true'
}

/** Either mode shows the account switcher and opens the dev login route. */
export function isAccountSwitchingEnabled(): boolean {
  return isMockAuthEnabled() || isDemoModeEnabled()
}
