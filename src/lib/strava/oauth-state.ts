import 'server-only'
import { randomBytes } from 'node:crypto'

/**
 * CSRF protection for the OAuth redirect.
 *
 * Strava does not support PKCE, so `state` is the only thing standing between a
 * user and an attacker feeding them a callback URL carrying the attacker's
 * authorization code — which would silently link the victim's Rundum account to
 * the attacker's Strava account. The value is random per attempt, stored in an
 * httpOnly cookie the page cannot read, and compared on the way back.
 */

export const STATE_COOKIE = 'rundum_strava_state'
export const LOCALE_COOKIE = 'rundum_strava_locale'

/** Ten minutes: long enough to authorize, short enough not to linger. */
export const STATE_MAX_AGE_S = 600

export function createState(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Constant-time comparison.
 *
 * A length-varying early return would leak how much of a guess was right. The
 * window is small and the payoff low, but the correct comparison costs nothing.
 */
export function statesMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false

  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
