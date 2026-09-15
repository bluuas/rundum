import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

/**
 * Supabase client for Client Components. Uses the anon key and is subject to
 * RLS. Most data access should happen in Server Components instead; this exists
 * for the few places that need a session in the browser.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
