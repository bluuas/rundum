import { NextResponse } from 'next/server'
import { isLocale, DEFAULT_LOCALE } from '@/lib/i18n/config'
import { STRAVA_AUTHORIZE_URL, STRAVA_SCOPE, getStravaConfig } from '@/lib/strava/config'
import {
  LOCALE_COOKIE,
  STATE_COOKIE,
  STATE_MAX_AGE_S,
  createState,
} from '@/lib/strava/oauth-state'

/**
 * Starts the Strava sign-in.
 *
 * A GET rather than a POST because it is the target of a link the user clicks;
 * it changes nothing on our side beyond setting a one-shot state cookie.
 *
 * The user's language is remembered in a second cookie rather than smuggled
 * through `state`, so the value compared on the way back stays a pure random
 * token with nothing to parse.
 */
export async function GET(request: Request) {
  const config = getStravaConfig()

  // Without credentials there is nothing to redirect to. The UI hides the
  // button in this case; this is the direct-URL path.
  if (!config) {
    return NextResponse.json(
      { error: 'Strava sign-in is not configured' },
      { status: 503 },
    )
  }

  const requested = new URL(request.url).searchParams.get('locale')
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE

  const state = createState()

  const authorize = new URL(STRAVA_AUTHORIZE_URL)
  authorize.searchParams.set('client_id', config.clientId)
  authorize.searchParams.set('redirect_uri', config.redirectUri)
  authorize.searchParams.set('response_type', 'code')
  // 'auto' lets Strava skip the prompt for a user who has already approved.
  authorize.searchParams.set('approval_prompt', 'auto')
  authorize.searchParams.set('scope', STRAVA_SCOPE)
  authorize.searchParams.set('state', state)

  const response = NextResponse.redirect(authorize.toString())

  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    // Lax rather than strict: the browser arrives back from strava.com, and a
    // strict cookie would not be sent on that cross-site navigation.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: STATE_MAX_AGE_S,
  }

  response.cookies.set(STATE_COOKIE, state, cookieOptions)
  response.cookies.set(LOCALE_COOKIE, locale, cookieOptions)

  return response
}
