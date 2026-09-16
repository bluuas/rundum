import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * How often one account may do a thing.
 *
 * A Server Action is a public POST endpoint: reachable with a session cookie
 * and curl, with no form in the way. These are the ceilings on that.
 *
 * They are set where a real person will never meet them and a script will meet
 * them immediately. Creating activities is the product's primary metric, so
 * its ceiling is deliberately loose — ten an hour is far past anything an
 * organizer does and still stops a loop dead. If one of these ever fires for a
 * real user, raise it; making the metric harder to move is the wrong trade.
 *
 * The counter lives in Postgres rather than in memory because the app runs
 * serverless: two requests from the same person rarely reach the same
 * instance, so an in-process bucket would count to one over and over.
 */
export const RATE_LIMITS = {
  createActivity: { limit: 30, windowSeconds: 3_600 },
  editActivity: { limit: 60, windowSeconds: 3_600 },
  comment: { limit: 30, windowSeconds: 3_600 },
  joinRequest: { limit: 40, windowSeconds: 3_600 },
  report: { limit: 10, windowSeconds: 86_400 },
  block: { limit: 50, windowSeconds: 86_400 },
  profile: { limit: 20, windowSeconds: 3_600 },
} as const

export type RateLimitBucket = keyof typeof RATE_LIMITS

/**
 * Counts one attempt. False means the caller has had enough for now.
 *
 * The subject is `auth.uid()`, decided inside the database function rather
 * than passed in — a limit you can sidestep by naming somebody else is not a
 * limit. Signed-out callers are not metered here; every action that uses this
 * requires a session, and anonymous traffic belongs at the edge.
 *
 * A database error means *allowed*. This sits in front of the thing the user
 * actually came to do, and refusing to let somebody create an activity
 * because a counter table was briefly unavailable would be the worse failure.
 */
export async function withinRateLimit(
  supabase: SupabaseClient<Database>,
  bucket: RateLimitBucket,
): Promise<boolean> {
  const { limit, windowSeconds } = RATE_LIMITS[bucket]

  const { data, error } = await supabase.rpc('consume_rate_limit', {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    console.error('rate limit check failed', bucket, error)
    return true
  }

  return data !== false
}
