import { createClient } from '@/lib/supabase/server'
import type { NearbyActivity } from '@/lib/supabase/rows'
import { DEFAULT_CITY_CENTER, DEFAULT_RADIUS_M, snapToGrid } from '@/lib/geo'
import type { SportKey } from '@/lib/sports'

export type FeedSort = 'soonest' | 'closest'

export type FeedFilters = {
  center: { lat: number; lng: number }
  radiusM: number
  sports: SportKey[]
  from: Date | null
  to: Date | null
  sort: FeedSort
  limit: number
}

export const DEFAULT_FILTERS: FeedFilters = {
  center: DEFAULT_CITY_CENTER,
  radiusM: DEFAULT_RADIUS_M,
  sports: [],
  from: null,
  to: null,
  sort: 'soonest',
  limit: 50,
}

/**
 * Nearby activities for the feed.
 *
 * All visibility rules — status, blocks, the organizer's chosen visibility
 * radius — live in the database (see nearby_activities and the RLS policies).
 * This function only translates filters; it must never add its own filtering
 * for security, because that would put the boundary in two places.
 */
export async function getNearbyActivities(
  filters: FeedFilters,
): Promise<{ activities: NearbyActivity[]; error: string | null }> {
  const supabase = await createClient()

  // Snap the search centre too. If it came from browser geolocation it is a
  // real personal location, and it has no business being precise on the wire.
  const center = snapToGrid(filters.center)

  const { data, error } = await supabase.rpc('nearby_activities', {
    p_lat: center.lat,
    p_lng: center.lng,
    p_radius_m: filters.radiusM,
    p_sports: filters.sports.length > 0 ? filters.sports : undefined,
    p_from: filters.from?.toISOString(),
    p_to: filters.to?.toISOString(),
    p_sort: filters.sort,
    p_limit: filters.limit,
  })

  if (error) {
    console.error('nearby_activities failed', error)
    return { activities: [], error: error.message }
  }

  return { activities: (data ?? []) as NearbyActivity[], error: null }
}
