'use server'

import { revalidateLocalized } from '@/lib/revalidate'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { deauthorize, refreshAccessToken } from '@/lib/strava/client'

/**
 * Disconnecting from Strava.
 *
 * The API Agreement requires that removing the connection actually removes the
 * data, and Rundum treats that as three separate obligations:
 *
 *   1. Tell Strava. Deleting our copy of the tokens is not the same as revoking
 *      the grant, and the user asked for the latter. A stale token that still
 *      works is a connection the user believes they ended.
 *   2. Delete the tokens and anything still staged and unconsented.
 *   3. Clear the Strava-derived profile fields: the athlete id, the connected
 *      flag, and the avatar, whose URL points at Strava's own CDN.
 *
 * `display_name` is deliberately not cleared. At the consent step it stopped
 * being a mirror of Strava Data and became the user's own Rundum profile name —
 * the name other people know them by on activities they organize and comments
 * they wrote. Wiping it would damage the user's account to satisfy a rule about
 * Strava's data. They can change it themselves at any time, which is the point
 * of it being theirs.
 *
 * Named `.server.ts` because the ESLint rule restricts `admin` imports; the
 * tokens live in a table no client role can reach.
 */

export type DisconnectResult = { ok: true } | { ok: false; error: string }

export async function disconnectStrava(): Promise<DisconnectResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'Sign in first' }

  const admin = createAdminClient()

  const { data: tokens } = await admin
    .from('strava_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (tokens) {
    let accessToken = tokens.access_token

    // An expired token cannot revoke anything, so refresh first. A failure here
    // is logged and ignored: the user's instruction to disconnect is carried
    // out locally either way, rather than being blocked on Strava being up.
    if (new Date(tokens.expires_at).getTime() <= Date.now()) {
      const refreshed = await refreshAccessToken(tokens.refresh_token)
      if (refreshed) accessToken = refreshed.access_token
    }

    await deauthorize(accessToken)
  }

  await admin.from('strava_tokens').delete().eq('user_id', user.id)
  await admin.from('strava_profile_staging').delete().eq('user_id', user.id)

  const { error } = await admin
    .from('profiles')
    .update({
      strava_athlete_id: null,
      strava_connected: false,
      // Strava-hosted URL: this is Strava Data whatever the user consented to.
      avatar_url: null,
      // Reopens the consent question if they ever reconnect.
      strava_profile_consent_at: null,
    })
    .eq('id', user.id)

  if (error) {
    console.error('disconnectStrava failed', error)
    return { ok: false, error: 'Could not disconnect. Please try again.' }
  }

  revalidateLocalized('/profile')
  revalidateLocalized('/')
  return { ok: true }
}
