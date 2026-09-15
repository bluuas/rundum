import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

/**
 * Request-scoped Supabase client for Server Components, Server Actions and
 * Route Handlers. Uses the anon key, so every query is still filtered by RLS —
 * authorization is the database's job, not the caller's.
 *
 * Must be created per request: `cookies()` is request-scoped and the client
 * cannot be cached across requests.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server Components cannot set cookies. Session refresh happens in
            // proxy.ts instead, so ignoring this is safe.
          }
        },
      },
    },
  )
}

/**
 * The signed-in user's id, or null. Prefer this over reading the session:
 * getUser() revalidates the token with Supabase, whereas a session read trusts
 * a cookie the client could have tampered with.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}
