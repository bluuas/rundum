import type { Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

export const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

/**
 * Signs in as a seeded demo user through the dev login route.
 *
 * Goes through the real endpoint rather than injecting a cookie, so the test
 * exercises the same session handling that a user gets.
 */
export async function signInAsDemoUser(page: Page, displayName?: string) {
  const query = anon.from('profiles').select('id, display_name').order('display_name')
  const { data } = displayName
    ? await query.eq('display_name', displayName)
    : await query.limit(1)

  const profile = data?.[0]
  if (!profile) throw new Error('No demo profiles found. Run `npm run db:seed`.')

  await page.goto('/')
  const response = await page.request.post('/api/auth/dev/login', {
    data: { userId: profile.id },
  })
  if (!response.ok()) throw new Error(`Dev login failed: ${response.status()}`)

  await page.reload()
  return profile
}
