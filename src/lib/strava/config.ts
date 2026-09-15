import 'server-only'
import { isDemoModeEnabled } from '@/lib/auth/dev'

/**
 * Strava OAuth endpoints and credentials.
 *
 * The base URLs are overridable so the whole flow can run against the local
 * fake authorization server in `scripts/fake-strava.mts`. Only the hostname
 * differs: the redirect, the state check, the code-for-token exchange, token
 * storage, profile staging, consent and deauthorization are the same code in
 * both cases. Going live is a change of environment variables, not of logic.
 *
 * This matters more than usual here, because Strava requires a subscription to
 * create an application at all, and every new application starts in
 * "single-player mode" where only its own owner can authenticate. Without a
 * local stand-in, none of this could be exercised before launch.
 */

/** Where the browser is sent to authorize. Real Strava unless overridden. */
const AUTH_BASE = process.env.STRAVA_AUTH_BASE_URL ?? 'https://www.strava.com'

export const STRAVA_AUTHORIZE_URL = `${AUTH_BASE}/oauth/authorize`
export const STRAVA_TOKEN_URL = `${AUTH_BASE}/oauth/token`
export const STRAVA_DEAUTHORIZE_URL = `${AUTH_BASE}/oauth/deauthorize`

/**
 * The narrowest scope Strava offers.
 *
 * `read` returns the athlete's public profile in the token response and nothing
 * else. Rundum plans future activities and must not replicate Strava's own
 * functionality, so it never asks for `activity:read` — there is no code path
 * that could use it, and requesting a permission you do not need is its own
 * kind of misuse.
 */
export const STRAVA_SCOPE = 'read'

export type StravaConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

/**
 * Credentials, or null when they are not configured.
 *
 * Returns null rather than throwing so the app runs without Strava: the sign-in
 * button simply does not appear, and mock auth carries development. The secret
 * is read here and nowhere else, and never crosses to the client — note the
 * absence of any NEXT_PUBLIC_ prefix.
 */
export function getStravaConfig(): StravaConfig | null {
  // A published demo hands out shared accounts, so Strava is off there whatever
  // the credentials say: a real athlete's grant must never land on an account
  // the next visitor can sign in as. It would also be a sign-in nobody could
  // complete, since a new Strava application only admits its own owner.
  if (isDemoModeEnabled()) return null

  const clientId = process.env.STRAVA_CLIENT_ID
  const clientSecret = process.env.STRAVA_CLIENT_SECRET
  const redirectUri = process.env.STRAVA_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) return null
  return { clientId, clientSecret, redirectUri }
}

export function isStravaConfigured(): boolean {
  return getStravaConfig() !== null
}
