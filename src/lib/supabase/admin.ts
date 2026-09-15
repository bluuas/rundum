import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Service-role client. Bypasses RLS entirely.
 *
 * Only two things legitimately need it: the Strava OAuth callback (which writes
 * to strava_tokens, a table no client role can touch) and the seed script.
 * An ESLint rule blocks importing this module outside scripts/, src/app/api/
 * and *.server.ts files, and `server-only` makes a client bundle fail loudly if
 * the rule is ever bypassed.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
