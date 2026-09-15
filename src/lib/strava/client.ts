import 'server-only'
import {
  STRAVA_DEAUTHORIZE_URL,
  STRAVA_TOKEN_URL,
  getStravaConfig,
} from '@/lib/strava/config'

/**
 * The only three calls Rundum ever makes to Strava.
 *
 * Exchange a code at sign-in, refresh a token that has expired, and deauthorize
 * on disconnect. There is no client for reading activities, deliberately:
 * Rundum plans future activities and does not import or analyse past workouts,
 * and the absence of the code is a stronger guarantee than a policy about it.
 */

/**
 * What the token endpoint returns.
 *
 * The athlete object arrives with the token, which is why sign-in needs no
 * second API call. Every field is optional because a response we did not expect
 * must degrade to "no profile details offered", not to a crash.
 */
export type StravaTokenResponse = {
  access_token: string
  refresh_token: string
  /** Unix seconds. */
  expires_at: number
  scope?: string
  athlete?: {
    id: number
    firstname?: string | null
    lastname?: string | null
    profile?: string | null
  }
}

async function postForm(url: string, body: Record<string, string>): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
    // Tokens must never be cached anywhere.
    cache: 'no-store',
  })
}

export async function exchangeCodeForToken(
  code: string,
): Promise<StravaTokenResponse | null> {
  const config = getStravaConfig()
  if (!config) return null

  const response = await postForm(STRAVA_TOKEN_URL, {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: 'authorization_code',
  })

  if (!response.ok) {
    // The body can contain the code and other sensitive material, so log the
    // status only.
    console.error('Strava token exchange failed', response.status)
    return null
  }

  return (await response.json()) as StravaTokenResponse
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<StravaTokenResponse | null> {
  const config = getStravaConfig()
  if (!config) return null

  const response = await postForm(STRAVA_TOKEN_URL, {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  if (!response.ok) {
    console.error('Strava token refresh failed', response.status)
    return null
  }

  return (await response.json()) as StravaTokenResponse
}

/**
 * Revokes Rundum's access at Strava's end.
 *
 * Deleting our copy of the tokens is not the same as telling Strava the
 * connection is over, and the user asked for the latter. A failure here is
 * logged but does not stop the local deletion: the user's instruction to
 * disconnect is honoured either way.
 */
export async function deauthorize(accessToken: string): Promise<boolean> {
  const response = await postForm(STRAVA_DEAUTHORIZE_URL, {
    access_token: accessToken,
  })

  if (!response.ok) {
    console.error('Strava deauthorize failed', response.status)
    return false
  }

  return true
}

/** Strava's athlete name, as a single display name, or null if it sent none. */
export function athleteDisplayName(
  athlete: StravaTokenResponse['athlete'],
): string | null {
  const name = [athlete?.firstname, athlete?.lastname]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join(' ')
    .trim()

  // The profiles table requires 2–50 characters; anything outside that is not
  // a name we can offer.
  return name.length >= 2 && name.length <= 50 ? name : null
}
