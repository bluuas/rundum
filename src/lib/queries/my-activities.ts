import { createClient } from '@/lib/supabase/server'
import type {
  ActivityLevel,
  ActivityStatus,
  JoinRequestStatus,
} from '@/lib/supabase/rows'

export type MyActivity = {
  id: string
  title: string
  sportKey: string
  startsAt: string
  locationLabel: string
  status: ActivityStatus
  level: ActivityLevel | null
  distanceM: number | null
  paceSecondsPerKm: number | null
  /** NULL means no participant limit. */
  maxParticipants: number | null
  participantCount: number
  pendingCount: number
  /** Set only for activities the user joined rather than organized. */
  myRequestStatus?: JoinRequestStatus
}

export type MyActivities = {
  organizingUpcoming: MyActivity[]
  organizingPast: MyActivity[]
  joinedUpcoming: MyActivity[]
  joinedPast: MyActivity[]
}

const EMPTY: MyActivities = {
  organizingUpcoming: [],
  organizingPast: [],
  joinedUpcoming: [],
  joinedPast: [],
}

const COLUMNS =
  'id, title, sport_key, starts_at, location_label, status, level, distance_m, pace_seconds_per_km, max_participants'

type Row = {
  id: string
  title: string
  sport_key: string
  starts_at: string
  location_label: string
  status: ActivityStatus
  level: ActivityLevel | null
  distance_m: number | null
  pace_seconds_per_km: number | null
  max_participants: number | null
}

/**
 * Everything the signed-in user organizes or has joined.
 *
 * Unlike the feed, this deliberately includes cancelled, hidden and archived
 * activities: the owner needs to see their own drafts and history, and someone
 * who joined needs to see that an activity was cancelled. RLS already permits
 * exactly this — owners see all their own rows, and cancelled rows stay public.
 */
export async function getMyActivities(userId: string): Promise<MyActivities> {
  const supabase = await createClient()

  const [owned, myRequests] = await Promise.all([
    supabase
      .from('activities')
      .select(COLUMNS)
      .eq('owner_id', userId)
      .neq('status', 'deleted')
      .order('starts_at', { ascending: true }),
    supabase
      .from('join_requests')
      .select('activity_id, status')
      .eq('user_id', userId)
      .in('status', ['pending', 'approved']),
  ])

  if (owned.error) {
    console.error('getMyActivities: owned query failed', owned.error)
    return EMPTY
  }

  const ownedRows = (owned.data ?? []) as Row[]
  const requestRows = myRequests.data ?? []

  const joinedIds = requestRows.map((request) => request.activity_id)
  const joined = joinedIds.length
    ? await supabase
        .from('activities')
        .select(COLUMNS)
        .in('id', joinedIds)
        .neq('status', 'deleted')
        .order('starts_at', { ascending: true })
    : { data: [] as Row[], error: null }

  const joinedRows = (joined.data ?? []) as Row[]

  // One query for every participant count, rather than one per card. The
  // organizer can read join_requests for their own activities, and a joiner can
  // read their own row, so counts come back correctly filtered either way.
  const allIds = [...ownedRows, ...joinedRows].map((row) => row.id)
  const { data: counts } = allIds.length
    ? await supabase
        .from('join_requests')
        .select('activity_id, status')
        .in('activity_id', allIds)
    : { data: [] }

  const approved = new Map<string, number>()
  const pending = new Map<string, number>()
  for (const row of counts ?? []) {
    const target =
      row.status === 'approved' ? approved : row.status === 'pending' ? pending : null
    if (target) target.set(row.activity_id, (target.get(row.activity_id) ?? 0) + 1)
  }

  const requestStatus = new Map(requestRows.map((r) => [r.activity_id, r.status]))

  const toMyActivity = (row: Row, includeRequestStatus: boolean): MyActivity => ({
    id: row.id,
    title: row.title,
    sportKey: row.sport_key,
    startsAt: row.starts_at,
    locationLabel: row.location_label,
    status: row.status,
    level: row.level,
    distanceM: row.distance_m,
    paceSecondsPerKm: row.pace_seconds_per_km,
    maxParticipants: row.max_participants,
    participantCount: approved.get(row.id) ?? 0,
    pendingCount: pending.get(row.id) ?? 0,
    ...(includeRequestStatus ? { myRequestStatus: requestStatus.get(row.id) } : {}),
  })

  const now = Date.now()
  const isPast = (row: Row) => new Date(row.starts_at).getTime() < now

  return {
    organizingUpcoming: ownedRows
      .filter((r) => !isPast(r))
      .map((r) => toMyActivity(r, false)),
    // Most recent first: your last run is more interesting than your first.
    organizingPast: ownedRows
      .filter(isPast)
      .reverse()
      .map((r) => toMyActivity(r, false)),
    joinedUpcoming: joinedRows
      .filter((r) => !isPast(r))
      .map((r) => toMyActivity(r, true)),
    joinedPast: joinedRows
      .filter(isPast)
      .reverse()
      .map((r) => toMyActivity(r, true)),
  }
}

export type ProfileSummary = {
  id: string
  displayName: string
  bio: string | null
  stravaConnected: boolean
  cityName: string | null
  createdAt: string
  activitiesCreated: number
  activitiesJoined: number
}

export async function getProfileSummary(userId: string): Promise<ProfileSummary | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, bio, strava_connected, created_at, cities (name)')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return null

  const [created, joined] = await Promise.all([
    supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .neq('status', 'deleted'),
    supabase
      .from('join_requests')
      .select('activity_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'approved'),
  ])

  const city = data.cities as unknown as { name: string } | null

  return {
    id: data.id,
    displayName: data.display_name,
    bio: data.bio,
    stravaConnected: data.strava_connected,
    cityName: city?.name ?? null,
    createdAt: data.created_at,
    activitiesCreated: created.count ?? 0,
    activitiesJoined: joined.count ?? 0,
  }
}
