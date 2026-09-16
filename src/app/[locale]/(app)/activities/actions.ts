'use server'

import { z } from 'zod'
import { revalidateLocalized } from '@/lib/revalidate'
import { snapToGrid } from '@/lib/geo'
import { withinRateLimit } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import type { JoinRequestStatus } from '@/lib/supabase/rows'
import { activityInputSchema } from '@/lib/validation/activity'
import { commentInputSchema } from '@/lib/validation/comment'
import { joinMessageSchema } from '@/lib/validation/join'

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false
      error: string
      /**
       * A stable key for failures the UI should phrase itself, so a German page
       * does not show an English sentence. `error` stays populated as the
       * fallback for anything without a key.
       */
      code?: 'belowApprovedCount' | 'rateLimited'
      fieldErrors?: Record<string, string[]>
    }

/**
 * Server Actions are public POST endpoints — reachable directly, not only
 * through the UI. Every one of them therefore re-checks authentication and
 * re-parses its input, regardless of what the client form already validated.
 */
async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function createActivity(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Sign in to create an activity' }

  const parsed = activityInputSchema.safeParse(input)
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error)
    return {
      ok: false,
      error: 'Please check the highlighted fields',
      fieldErrors: flat.fieldErrors as Record<string, string[]>,
    }
  }

  // After validation, so somebody fixing a typo does not spend an attempt.
  if (!(await withinRateLimit(supabase, 'createActivity'))) {
    return {
      ok: false,
      error: 'That is a lot of activities. Try again a little later.',
      code: 'rateLimited',
    }
  }

  const values = parsed.data

  const { data: city, error: cityError } = await supabase
    .from('cities')
    .select('id')
    .eq('slug', 'schwyz')
    .single()

  if (cityError || !city) {
    return { ok: false, error: 'Could not determine the city for this activity' }
  }

  // Snap before it leaves the app. The database trigger snaps again; this is
  // belt and braces, and it keeps the stored value identical to what the user
  // was shown on the map.
  const point = snapToGrid({ lat: values.lat, lng: values.lng })

  const { data: activity, error } = await supabase
    .from('activities')
    .insert({
      owner_id: user.id,
      city_id: city.id,
      sport_key: values.sportKey,
      title: values.title,
      description: values.description,
      starts_at: values.startsAt.toISOString(),
      meeting_point: `SRID=4326;POINT(${point.lng} ${point.lat})`,
      location_label: values.locationLabel,
      visibility_radius_m: values.visibilityRadiusM,
      distance_m: values.distanceM,
      pace_seconds_per_km: values.paceSecondsPerKm,
      level: values.level,
      max_participants: values.maxParticipants,
      status: 'published',
    })
    .select('id')
    .single()

  if (error || !activity) {
    console.error('createActivity failed', error)
    return { ok: false, error: 'Could not save the activity. Please try again.' }
  }

  // The primary success metric is written by a trigger on the insert above,
  // not here. An activity cannot then be created without being counted, and
  // the count cannot be written without an activity to point at — which the
  // Server Action doing it faithfully could not promise, and a client-facing
  // insert policy certainly could not.

  revalidateLocalized('/')
  revalidateLocalized('/me')

  return { ok: true, data: { id: activity.id } }
}

/**
 * Updates an activity the caller owns.
 *
 * Ownership is enforced by the RLS update policy (`owner_id = auth.uid()`), so
 * a request for someone else's activity matches no row and changes nothing.
 * The explicit owner check below only exists to turn that silence into a clear
 * message.
 */
export async function updateActivity(
  activityId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Sign in to edit an activity' }

  if (!z.uuid().safeParse(activityId).success) {
    return { ok: false, error: 'Unknown activity' }
  }

  const parsed = activityInputSchema.safeParse(input)
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error)
    return {
      ok: false,
      error: 'Please check the highlighted fields',
      fieldErrors: flat.fieldErrors as Record<string, string[]>,
    }
  }

  const values = parsed.data

  // An organizer may lower the participant limit, but not below the number of
  // people they have already approved. Nobody is silently un-invited: someone
  // who was told they are in stays in, and the organizer is asked to remove
  // people explicitly if that is what they meant.
  if (values.maxParticipants !== null) {
    const { count } = await supabase
      .from('join_requests')
      .select('id', { count: 'exact', head: true })
      .eq('activity_id', activityId)
      .eq('status', 'approved')

    const approved = count ?? 0
    if (values.maxParticipants < approved) {
      return {
        ok: false,
        error: `You have already approved ${approved} participants`,
        code: 'belowApprovedCount',
      }
    }
  }

  const point = snapToGrid({ lat: values.lat, lng: values.lng })

  const { data, error } = await supabase
    .from('activities')
    .update({
      sport_key: values.sportKey,
      title: values.title,
      description: values.description,
      starts_at: values.startsAt.toISOString(),
      meeting_point: `SRID=4326;POINT(${point.lng} ${point.lat})`,
      location_label: values.locationLabel,
      visibility_radius_m: values.visibilityRadiusM,
      distance_m: values.distanceM,
      pace_seconds_per_km: values.paceSecondsPerKm,
      level: values.level,
      max_participants: values.maxParticipants,
    })
    .eq('id', activityId)
    .eq('owner_id', user.id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('updateActivity failed', error)
    return { ok: false, error: 'Could not save your changes. Please try again.' }
  }

  if (!data) return { ok: false, error: 'You can only edit activities you organize' }

  revalidateLocalized('/')
  revalidateLocalized('/me')
  revalidateLocalized(`/activities/${activityId}`)

  return { ok: true, data: { id: activityId } }
}

/** The status changes an organizer can make. 'published' is how you un-hide. */
const ORGANIZER_STATUSES = ['published', 'cancelled', 'hidden', 'deleted'] as const
export type OrganizerStatus = (typeof ORGANIZER_STATUSES)[number]

/**
 * Changes an activity's status.
 *
 * Deleting is a status change, never a row removal: comments, join requests and
 * the activity_created analytics event all keep their referent, and a deletion
 * stays auditable.
 */
export async function setActivityStatus(
  activityId: string,
  status: OrganizerStatus,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Sign in first' }

  if (!z.uuid().safeParse(activityId).success) {
    return { ok: false, error: 'Unknown activity' }
  }

  if (!ORGANIZER_STATUSES.includes(status)) {
    return { ok: false, error: 'Unknown status' }
  }

  const { data, error } = await supabase
    .from('activities')
    .update({ status })
    .eq('id', activityId)
    .eq('owner_id', user.id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('setActivityStatus failed', error)
    return { ok: false, error: 'Could not update the activity' }
  }

  if (!data) return { ok: false, error: 'You can only change activities you organize' }

  revalidateLocalized('/')
  revalidateLocalized('/me')

  // Revalidating the activity's own path would re-render the page the client is
  // about to leave, and that render gets aborted mid-stream — which is what
  // logged "The destination stream closed early". A deleted activity has no
  // page worth refreshing.
  if (status !== 'deleted') revalidateLocalized(`/activities/${activityId}`)

  return { ok: true, data: undefined }
}

export async function addComment(input: unknown): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Sign in to comment' }

  const parsed = commentInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Write something first' }
  }

  if (!(await withinRateLimit(supabase, 'comment'))) {
    return {
      ok: false,
      error: 'That is a lot of comments. Try again a little later.',
      code: 'rateLimited',
    }
  }

  const { error } = await supabase.from('comments').insert({
    activity_id: parsed.data.activityId,
    author_id: user.id,
    body: parsed.data.body,
  })

  if (error) {
    console.error('addComment failed', error)
    return { ok: false, error: 'Could not post your comment. Please try again.' }
  }

  revalidateLocalized(`/activities/${parsed.data.activityId}`)
  return { ok: true, data: undefined }
}

/**
 * Soft-deletes a comment through the delete_comment RPC, which enforces
 * "author or activity owner" in the database. Doing the check there rather than
 * here means it holds no matter who calls it.
 */
export async function deleteComment(
  commentId: string,
  activityId: string,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Sign in first' }

  if (!z.uuid().safeParse(commentId).success) {
    return { ok: false, error: 'Unknown comment' }
  }

  const { error } = await supabase.rpc('delete_comment', { p_comment_id: commentId })

  if (error) {
    console.error('deleteComment failed', error)
    return { ok: false, error: 'Could not delete the comment' }
  }

  revalidateLocalized(`/activities/${activityId}`)
  return { ok: true, data: undefined }
}

// ---------------------------------------------------------------------------
// Join requests
// ---------------------------------------------------------------------------

/**
 * Why these actions return a code instead of a message.
 *
 * Every rule about joining lives in the database (see the RPCs in
 * 20260916090000_join_requests.sql), so the failure reason arrives as a
 * Postgres error. Passing its text straight to the UI would put an English
 * sentence on a German page, and would couple the interface to wording that
 * exists for the Postgres log. The RPCs therefore raise application-defined
 * SQLSTATEs, which map to a key the client translates.
 */
export type JoinErrorCode =
  | 'rateLimited'
  | 'signedOut'
  | 'notFound'
  | 'ownActivity'
  | 'notOpen'
  | 'alreadyStarted'
  | 'previouslyDeclined'
  | 'full'
  | 'alreadyDecided'
  | 'notOrganizer'
  | 'nothingToWithdraw'
  | 'unknown'

const SQLSTATE_TO_CODE: Record<string, JoinErrorCode> = {
  RU001: 'signedOut',
  RU002: 'notFound',
  RU003: 'ownActivity',
  RU004: 'notOpen',
  RU005: 'alreadyStarted',
  RU006: 'previouslyDeclined',
  RU007: 'full',
  RU008: 'alreadyDecided',
  RU009: 'notOrganizer',
  RU010: 'nothingToWithdraw',
  RU011: 'notFound',
}

export type JoinResult =
  { ok: true; status: JoinRequestStatus | null } | { ok: false; code: JoinErrorCode }

function toJoinError(error: { code?: string } | null): JoinErrorCode {
  const mapped = error?.code ? SQLSTATE_TO_CODE[error.code] : undefined
  if (!mapped) console.error('unmapped join error', error)
  return mapped ?? 'unknown'
}

/** Revalidates everywhere a join is visible: the activity, the feed and /me. */
function revalidateJoin(activityId: string) {
  revalidateLocalized(`/activities/${activityId}`)
  revalidateLocalized('/me')
  revalidateLocalized('/')
}

export async function requestToJoin(
  activityId: string,
  message?: string,
): Promise<JoinResult> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, code: 'signedOut' }

  if (!z.uuid().safeParse(activityId).success) return { ok: false, code: 'notFound' }

  const parsedMessage = joinMessageSchema.safeParse(message ?? '')
  if (!parsedMessage.success) return { ok: false, code: 'unknown' }

  if (!(await withinRateLimit(supabase, 'joinRequest'))) {
    return { ok: false, code: 'rateLimited' }
  }

  const { data, error } = await supabase.rpc('request_to_join', {
    p_activity_id: activityId,
    // The generated signature types the optional argument as string, so an
    // absent message is omitted rather than sent as null. The function's own
    // default is null either way.
    p_message: parsedMessage.data ?? undefined,
  })

  if (error) return { ok: false, code: toJoinError(error) }

  revalidateJoin(activityId)
  return { ok: true, status: data as JoinRequestStatus }
}

/**
 * Withdraws a pending request, or leaves an activity already joined.
 *
 * One action for both, because it is one action to the participant: they are no
 * longer coming. The database frees the seat either way.
 */
export async function withdrawJoinRequest(activityId: string): Promise<JoinResult> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, code: 'signedOut' }

  if (!z.uuid().safeParse(activityId).success) return { ok: false, code: 'notFound' }

  const { error } = await supabase.rpc('withdraw_join_request', {
    p_activity_id: activityId,
  })

  if (error) return { ok: false, code: toJoinError(error) }

  revalidateJoin(activityId)
  return { ok: true, status: 'withdrawn' }
}

/**
 * The organizer's decision on one request.
 *
 * Ownership and capacity are both checked inside the RPC, under a lock on the
 * activity, so approving two requests in quick succession cannot overfill an
 * activity — see the migration for why the count is not read here.
 */
export async function decideJoinRequest(
  requestId: string,
  activityId: string,
  approve: boolean,
): Promise<JoinResult> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, code: 'signedOut' }

  if (!z.uuid().safeParse(requestId).success) return { ok: false, code: 'notFound' }

  const { data, error } = await supabase.rpc('decide_join_request', {
    p_request_id: requestId,
    p_approve: approve,
  })

  if (error) return { ok: false, code: toJoinError(error) }

  revalidateJoin(activityId)
  return { ok: true, status: data as JoinRequestStatus }
}
