'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * Signs the current user out.
 *
 * A Server Action rather than the dev-only logout route, because this one ships
 * to production: it is how a Strava-connected user signs out too.
 */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
