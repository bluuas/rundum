'use server'

import { z } from 'zod'
import { revalidateLocalized } from '@/lib/revalidate'
import { createClient } from '@/lib/supabase/server'
import { profileInputSchema } from '@/lib/validation/profile'
import { withinRateLimit } from '@/lib/rate-limit'
import { reportError } from '@/lib/observability'

/**
 * Editing your own profile.
 *
 * This exists because the Strava consent step needs it to be honest: the card
 * tells the user they can change these details afterwards, and declining leaves
 * them with a generated placeholder name. Without an editor, "no thanks" would
 * mean "be called Athlete 4f2a forever".
 *
 * No admin client and no ownership parameter: the update is scoped to
 * auth.uid() and the RLS policy `profiles_update_own` enforces it, so the worst
 * a forged request can do is edit its own profile.
 */

export type ProfileResult =
  { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

export async function updateProfile(input: unknown): Promise<ProfileResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'Sign in first' }

  const parsed = profileInputSchema.safeParse(input)
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error)
    return {
      ok: false,
      error: 'Please check the highlighted fields',
      fieldErrors: flat.fieldErrors as Record<string, string[]>,
    }
  }

  if (!(await withinRateLimit(supabase, 'profile'))) {
    return { ok: false, error: 'That is a lot of edits. Try again a little later.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: parsed.data.displayName, bio: parsed.data.bio })
    .eq('id', user.id)

  if (error) {
    reportError('updateProfile', error)
    return { ok: false, error: 'Could not save your profile. Please try again.' }
  }

  revalidateLocalized('/profile')
  revalidateLocalized('/')
  return { ok: true }
}
