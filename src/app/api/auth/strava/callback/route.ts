import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  LOCALE_PREFERENCE_COOKIE,
  isLocale,
  localeHref,
  matchLocale,
  type Locale,
} from '@/lib/i18n/config'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { athleteDisplayName, exchangeCodeForToken } from '@/lib/strava/client'
import { getStravaConfig } from '@/lib/strava/config'
import { LOCALE_COOKIE, STATE_COOKIE, statesMatch } from '@/lib/strava/oauth-state'

/**
 * Where Strava sends the user back.
 *
 * The order of operations is the compliance-relevant part:
 *
 *   1. Verify `state` before touching anything, so a forged callback cannot
 *      link an attacker's Strava account to whoever clicks the link.
 *   2. Exchange the code for a token. The token response already carries the
 *      athlete's public profile, so this is the *only* call Strava receives.
 *      Nothing is fetched afterwards, and no activity data is ever requested.
 *   3. Store the tokens in `strava_tokens`, which no client role can read.
 *   4. Put the athlete's name and picture in `strava_profile_staging` — not in
 *      `profiles`. Publishing them straight to a profile would disclose one
 *      user's Strava Data to every other user, which the API Agreement forbids.
 *      The consent card on /profile offers them to their owner, and only an
 *      explicit yes copies them across.
 *
 * Errors come back as a query parameter rather than an error page: the user is
 * mid-sign-in and wants to land somewhere they can retry from.
 */

/** A neutral name for a brand-new account, containing nothing from Strava. */
function placeholderDisplayName(): string {
  return `Athlete ${randomBytes(2).toString('hex')}`
}

function failure(locale: Locale, reason: string, request: Request) {
  const url = new URL(localeHref(locale, '/profile'), request.url)
  url.searchParams.set('strava', reason)
  return NextResponse.redirect(url)
}

export async function GET(request: Request) {
  const jar = await cookies()
  /*
   * Which language to come back in, in order of how much it reflects a choice:
   * the cookie this flow set, then a preference saved earlier, then the
   * browser's own. The first can be gone — it expires after ten minutes, and a
   * forged callback never had one — and landing an English-speaking user on a
   * German error page is a poor way to explain that something went wrong.
   */
  const savedLocale = jar.get(LOCALE_COOKIE)?.value
  const preferred = jar.get(LOCALE_PREFERENCE_COOKIE)?.value
  const locale: Locale = isLocale(savedLocale)
    ? savedLocale
    : isLocale(preferred)
      ? preferred
      : matchLocale(request.headers.get('accept-language'))

  const savedState = jar.get(STATE_COOKIE)?.value
  jar.delete(STATE_COOKIE)
  jar.delete(LOCALE_COOKIE)

  const params = new URL(request.url).searchParams

  // Strava sends the user back with ?error=access_denied if they say no. That
  // is a decision, not a fault, so it gets its own quiet message.
  if (params.get('error')) return failure(locale, 'denied', request)

  if (!statesMatch(savedState, params.get('state') ?? undefined)) {
    return failure(locale, 'state', request)
  }

  const code = params.get('code')
  if (!code || !getStravaConfig()) return failure(locale, 'config', request)

  const token = await exchangeCodeForToken(code)
  const athleteId = token?.athlete?.id

  if (!token || !athleteId) return failure(locale, 'exchange', request)

  const admin = createAdminClient()
  const supabase = await createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  // Is this athlete already attached to an account?
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('strava_athlete_id', athleteId)
    .maybeSingle()

  // Connecting while signed in links the two. Refuse if the athlete already
  // belongs to somebody else — silently moving it would take the connection
  // away from an account that still relies on it.
  if (currentUser && existing && existing.id !== currentUser.id) {
    return failure(locale, 'linked', request)
  }

  let userId = currentUser?.id ?? existing?.id ?? null
  let createdEmail: string | null = null

  if (!userId) {
    // Strava's `read` scope does not include an email address, so the account
    // gets a synthetic one. It is never displayed and never receives mail; it
    // exists because Supabase identifies users by address.
    const email = `strava-${athleteId}@${
      process.env.STRAVA_ACCOUNT_EMAIL_DOMAIN ?? 'strava.rundum.invalid'
    }`

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        // Deliberately NOT the Strava name. The handle_new_user trigger copies
        // display_name straight into the public profiles table, which would
        // publish Strava Data before the user had been asked about it.
        display_name: placeholderDisplayName(),
        strava_athlete_id: athleteId,
        strava_connected: true,
      },
    })

    if (error || !created.user) {
      console.error('Strava sign-in: could not create user', error?.message)
      return failure(locale, 'server', request)
    }

    userId = created.user.id
    createdEmail = email
  }

  const { error: tokenError } = await admin.from('strava_tokens').upsert({
    user_id: userId,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: new Date(token.expires_at * 1000).toISOString(),
    scope: token.scope ?? null,
    updated_at: new Date().toISOString(),
  })

  if (tokenError) {
    console.error('Strava sign-in: could not store tokens', tokenError.message)
    return failure(locale, 'server', request)
  }

  await admin
    .from('profiles')
    .update({ strava_athlete_id: athleteId, strava_connected: true })
    .eq('id', userId)

  // Staged, not published. See strava-consent.server.ts for the full reasoning.
  const offeredName = athleteDisplayName(token.athlete)
  const offeredAvatar = token.athlete?.profile ?? null

  const { data: profile } = await admin
    .from('profiles')
    .select('strava_profile_consent_at')
    .eq('id', userId)
    .maybeSingle()

  if (!profile?.strava_profile_consent_at && (offeredName || offeredAvatar)) {
    await admin.from('strava_profile_staging').upsert({
      user_id: userId,
      display_name: offeredName,
      avatar_url: offeredAvatar,
      fetched_at: new Date().toISOString(),
    })
  }

  // Already signed in as this user: nothing more to do than land them back.
  if (currentUser?.id === userId) {
    const url = new URL(localeHref(locale, '/profile'), request.url)
    url.searchParams.set('strava', 'connected')
    return NextResponse.redirect(url)
  }

  // Issue a session without a password. generateLink produces a one-time hash
  // that verifyOtp exchanges for cookies on this server client — the link
  // itself is never sent anywhere.
  const email =
    createdEmail ?? (await admin.auth.admin.getUserById(userId)).data.user?.email

  if (!email) {
    console.error('Strava sign-in: user has no email to sign in with')
    return failure(locale, 'server', request)
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError || !link.properties?.hashed_token) {
    console.error('Strava sign-in: could not issue a session', linkError?.message)
    return failure(locale, 'server', request)
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: 'magiclink',
  })

  if (verifyError) {
    console.error('Strava sign-in: session verification failed', verifyError.message)
    return failure(locale, 'server', request)
  }

  const url = new URL(localeHref(locale, '/profile'), request.url)
  url.searchParams.set('strava', 'connected')
  return NextResponse.redirect(url)
}
