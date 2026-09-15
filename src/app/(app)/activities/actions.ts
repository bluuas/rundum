'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { snapToGrid } from '@/lib/geo'
import { createClient } from '@/lib/supabase/server'
import { activityInputSchema } from '@/lib/validation/activity'
import { commentInputSchema } from '@/lib/validation/comment'

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

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

  // The primary success metric. Recorded as its own row so the count is
  // durable even if the activity is later cancelled or deleted.
  const { error: eventError } = await supabase.from('activity_events').insert({
    event_type: 'activity_created',
    activity_id: activity.id,
    user_id: user.id,
    metadata: { sport_key: values.sportKey },
  })

  // Analytics must never block the user's actual goal.
  if (eventError) console.error('activity_created event failed', eventError)

  revalidatePath('/')
  revalidatePath('/me')

  return { ok: true, data: { id: activity.id } }
}

export async function addComment(input: unknown): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  if (!user) return { ok: false, error: 'Sign in to comment' }

  const parsed = commentInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Write something first' }
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

  revalidatePath(`/activities/${parsed.data.activityId}`)
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

  revalidatePath(`/activities/${activityId}`)
  return { ok: true, data: undefined }
}
