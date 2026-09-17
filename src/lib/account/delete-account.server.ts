'use server'

import { revalidateLocalized } from '@/lib/revalidate'
import { deauthorize, refreshAccessToken } from '@/lib/strava/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { reportError } from '@/lib/observability'

/**
 * Deleting an account.
 *
 * Four steps, in this order, because each one is only safe once the previous
 * has happened:
 *
 *   1. Cancel upcoming activities and tombstone comments, in one transaction
 *      inside the database. See prepare_account_deletion.
 *   2. Tell Strava the grant is over. Deleting our copy of a token is not
 *      revoking it, and somebody deleting their whole account has asked for
 *      rather more than somebody merely disconnecting.
 *   3. Delete the auth user. Everything else follows from the cascade:
 *      profile, join requests, blocks; and the pointers that should survive —
 *      activities, comments, reports — are set null rather than removed.
 *   4. Clear the session, so the browser is not holding a token for an account
 *      that no longer exists.
 *
 * Named `.server.ts` because deleting an auth user needs the service-role
 * client, which an ESLint rule keeps out of ordinary modules.
 */

export type DeleteAccountResult = { ok: true } | { ok: false; error: string }

export type DeletionSummary = {
  upcomingActivities: number
  affectedParticipants: number
  commentsWritten: number
}

/** What the confirmation screen tells them they are about to do. */
export async function getDeletionSummary(): Promise<DeletionSummary | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('account_deletion_summary')

  if (error) {
    reportError('account_deletion_summary', error)
    return null
  }

  const row = (data ?? [])[0]
  if (!row) return null

  return {
    upcomingActivities: Number(row.upcoming_activities),
    affectedParticipants: Number(row.affected_participants),
    commentsWritten: Number(row.comments_written),
  }
}

export async function deleteAccount(): Promise<DeleteAccountResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'Sign in first' }

  const { data: cancelled, error: prepareError } = await supabase.rpc(
    'prepare_account_deletion',
  )
  if (prepareError) {
    reportError('prepare_account_deletion', prepareError)
    return { ok: false, error: 'Could not delete your account. Please try again.' }
  }

  const admin = createAdminClient()

  const { data: tokens } = await admin
    .from('strava_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (tokens) {
    let accessToken = tokens.access_token
    if (new Date(tokens.expires_at).getTime() <= Date.now()) {
      const refreshed = await refreshAccessToken(tokens.refresh_token)
      if (refreshed) accessToken = refreshed.access_token
    }
    // Strava being unreachable does not get to keep somebody's account open.
    await deauthorize(accessToken)
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    reportError('deleteUser', deleteError)
    return { ok: false, error: 'Could not delete your account. Please try again.' }
  }

  await supabase.auth.signOut()

  revalidateLocalized('/')
  revalidateLocalized('/me')
  revalidateLocalized('/profile')
  // Each activity that was just cancelled: somebody who joined one may already
  // have it open, and would otherwise keep seeing it as happening.
  for (const id of (cancelled ?? []) as unknown as string[]) {
    revalidateLocalized(`/activities/${id}`)
  }

  return { ok: true }
}
