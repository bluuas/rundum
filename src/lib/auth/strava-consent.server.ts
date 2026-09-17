'use server'

import { revalidateLocalized } from '@/lib/revalidate'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { reportError } from '@/lib/observability'

/**
 * Consent to publish Strava-sourced profile details.
 *
 * ── Why this flow exists ───────────────────────────────────────────────────
 * The Strava API Agreement says a user's Strava Data "can only be displayed or
 * disclosed in your Developer Application to that user", and that Strava Data
 * about *other* users may not be displayed at all — even when it is public on
 * Strava.
 *
 * Rundum's feed shows an organizer's name and avatar to everyone who can see
 * the activity. If those values were a live mirror of Strava's profile, we
 * would be disclosing one user's Strava Data to others, which the agreement
 * forbids.
 *
 * ── What we actually do ────────────────────────────────────────────────────
 * 1. At sign-in, whatever Strava returns is written to `strava_profile_staging`
 *    — a table no client role can read, just like `strava_tokens`. Nothing is
 *    published from it.
 * 2. The user is shown what Strava sent (to that user only, which the agreement
 *    permits) and asked whether to use it as their Rundum profile.
 * 3. Only on acceptance do the values move into `profiles`, where they become
 *    the user's own Rundum profile data: user-supplied, editable by them, and
 *    published with their consent. `strava_profile_consent_at` records when.
 * 4. We never re-read Strava to refresh those fields. After the copy they are
 *    Rundum's data, not a synchronised mirror of Strava Data.
 *
 * Declining is a first-class outcome: the user keeps a Rundum-only profile and
 * nothing Strava-sourced is ever shown to anyone else.
 *
 * ── Status ─────────────────────────────────────────────────────────────────
 * The staging table is populated by the Strava OAuth callback, which lands in
 * phase 7. Until then nothing writes to it, so the consent card simply does not
 * appear. The consent mechanism itself is complete and is what phase 7 will
 * call — it is deliberately built first, so the OAuth work cannot accidentally
 * ship a straight-to-profile copy.
 */

export type StravaProfileOffer = {
  displayName: string | null
  avatarUrl: string | null
}

/**
 * What Strava sent for the signed-in user, if they have not yet decided.
 *
 * Read with the service-role client because `strava_profile_staging` grants no
 * client role access. The query is pinned to the caller's own id, so this can
 * only ever return the requesting user's own data — which is the one disclosure
 * the agreement allows.
 */
export async function getPendingStravaProfile(): Promise<StravaProfileOffer | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('strava_profile_consent_at')
    .eq('id', user.id)
    .maybeSingle()

  // Already decided: nothing to offer.
  if (profile?.strava_profile_consent_at) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('strava_profile_staging')
    .select('display_name, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) return null

  return { displayName: data.display_name, avatarUrl: data.avatar_url }
}

export type ConsentResult = { ok: true } | { ok: false; error: string }

/**
 * Copies the staged Strava profile into the user's Rundum profile.
 *
 * After this, the values are the user's own profile data. The staging row is
 * deleted: it has served its purpose, and keeping unconsented Strava Data
 * around longer than needed serves nobody.
 */
export async function acceptStravaProfile(): Promise<ConsentResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sign in first' }

  const admin = createAdminClient()

  const { data: staged } = await admin
    .from('strava_profile_staging')
    .select('display_name, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!staged) return { ok: false, error: 'Nothing to import' }

  const { error } = await supabase
    .from('profiles')
    .update({
      // Only fields the user was actually shown and agreed to.
      ...(staged.display_name ? { display_name: staged.display_name } : {}),
      ...(staged.avatar_url ? { avatar_url: staged.avatar_url } : {}),
      strava_profile_consent_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    reportError('acceptStravaProfile', error)
    return { ok: false, error: 'Could not update your profile' }
  }

  await admin.from('strava_profile_staging').delete().eq('user_id', user.id)

  revalidateLocalized('/profile')
  revalidateLocalized('/')
  return { ok: true }
}

/**
 * Declines the offer.
 *
 * The staged data is deleted rather than kept for later: the user said no, and
 * holding Strava Data we have been told not to use is the wrong default. If
 * they change their mind they can reconnect.
 */
export async function declineStravaProfile(): Promise<ConsentResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sign in first' }

  const admin = createAdminClient()
  await admin.from('strava_profile_staging').delete().eq('user_id', user.id)

  // Consent is recorded either way, so the card does not reappear on every
  // visit. A timestamp with no copied fields means "asked and declined".
  const { error } = await supabase
    .from('profiles')
    .update({ strava_profile_consent_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    reportError('declineStravaProfile', error)
    return { ok: false, error: 'Could not save your choice' }
  }

  revalidateLocalized('/profile')
  return { ok: true }
}
