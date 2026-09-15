import { createClient } from '@/lib/supabase/server'
import type { ActivityLevel, ActivityStatus } from '@/lib/supabase/rows'

export type ActivityDetail = {
  id: string
  ownerId: string
  sportKey: string
  title: string
  description: string | null
  startsAt: string
  locationLabel: string
  lat: number
  lng: number
  visibilityRadiusM: number
  distanceM: number | null
  paceSecondsPerKm: number | null
  level: ActivityLevel | null
  /** NULL means no participant limit. */
  maxParticipants: number | null
  status: ActivityStatus
  participantCount: number
  owner: {
    displayName: string
    avatarUrl: string | null
    stravaConnected: boolean
    bio: string | null
  }
}

export type CommentWithAuthor = {
  id: string
  body: string
  createdAt: string
  authorId: string
  authorName: string
  authorStravaConnected: boolean
}

/**
 * One activity, or null if it does not exist or the viewer may not see it.
 *
 * Those two cases are deliberately indistinguishable: RLS simply returns no
 * row, and the page renders a 404 either way. Telling a blocked user that an
 * activity exists but is not for them would leak exactly what blocking is meant
 * to prevent.
 */
export async function getActivityDetail(id: string): Promise<ActivityDetail | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('activities')
    .select(
      `id, owner_id, sport_key, title, description, starts_at, location_label,
       visibility_radius_m, distance_m, pace_seconds_per_km, level,
       max_participants, status,
       profiles!activities_owner_id_fkey (display_name, avatar_url, strava_connected, bio)`,
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null

  // RLS lets an owner read their own rows in any state, including 'deleted'.
  // That is right for the database but wrong for this page: a deleted activity
  // should be gone for everyone, its owner included. They still see their
  // remaining activities on /me.
  if (data.status === 'deleted') return null

  // meeting_point is a PostGIS geography and does not survive PostgREST as
  // usable coordinates, so read the already-snapped lat/lng through the RPC
  // that exposes them.
  const { data: coords } = await supabase.rpc('activity_coordinates', {
    p_activity_id: id,
  })

  const point = (coords ?? [])[0] as { lat: number; lng: number } | undefined
  const owner = data.profiles as unknown as {
    display_name: string
    avatar_url: string | null
    strava_connected: boolean
    bio: string | null
  }

  const { data: participantCount } = await supabase.rpc('activity_participant_count', {
    p_activity_id: id,
  })

  return {
    id: data.id,
    ownerId: data.owner_id,
    sportKey: data.sport_key,
    title: data.title,
    description: data.description,
    startsAt: data.starts_at,
    locationLabel: data.location_label,
    lat: point?.lat ?? 0,
    lng: point?.lng ?? 0,
    visibilityRadiusM: data.visibility_radius_m,
    distanceM: data.distance_m,
    paceSecondsPerKm: data.pace_seconds_per_km,
    level: data.level,
    maxParticipants: data.max_participants,
    status: data.status,
    participantCount: participantCount ?? 0,
    owner: {
      displayName: owner.display_name,
      avatarUrl: owner.avatar_url,
      stravaConnected: owner.strava_connected,
      bio: owner.bio,
    },
  }
}

export async function getComments(activityId: string): Promise<CommentWithAuthor[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('comments')
    .select(
      `id, body, created_at, author_id,
       profiles!comments_author_id_fkey (display_name, strava_connected)`,
    )
    .eq('activity_id', activityId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return data.map((row) => {
    const author = row.profiles as unknown as {
      display_name: string
      strava_connected: boolean
    }
    return {
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      authorId: row.author_id,
      authorName: author?.display_name ?? 'Unknown',
      authorStravaConnected: author?.strava_connected ?? false,
    }
  })
}
