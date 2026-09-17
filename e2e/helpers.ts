import type { Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { assertLocal, loadEnv } from '../scripts/target'

loadEnv()

// The suite creates, edits, blocks and deletes freely, and reseeding is part
// of running it. It must not be able to reach a deployment, however the
// environment happens to be set.
assertLocal(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', 'The Playwright suite')

/**
 * Service-role client, for the few tests that need to set up or inspect state
 * no user could reach — creating a throwaway account, or checking what
 * survived deleting one. `assertLocal` above is what makes this safe to have
 * in a test helper at all.
 */
export const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

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

  await page.goto(path('/'))
  const response = await page.request.post('/api/auth/dev/login', {
    data: { userId: profile.id },
  })
  if (!response.ok()) throw new Error(`Dev login failed: ${response.status()}`)

  await page.reload()
  return profile
}

/**
 * Locale-prefixed path. Every page lives under /de or /en, so tests must say
 * which language they are exercising rather than relying on a redirect.
 */
export function path(p: string, locale: 'de' | 'en' = 'en'): string {
  return `/${locale}${p === '/' ? '' : p}`
}

/**
 * The local stack catches outgoing mail instead of sending it. Mailpit is what
 * makes the sign-in-link flow testable end to end without a mail provider —
 * the same reason development moved onto Docker.
 */
const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324'

/** The newest sign-in link Supabase mailed to an address. */
export async function signInLinkFor(email: string, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const search = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    )

    if (search.ok) {
      const { messages } = (await search.json()) as { messages?: { ID: string }[] }
      const newest = messages?.[0]

      if (newest) {
        const detail = (await (
          await fetch(`${MAILPIT}/api/v1/message/${newest.ID}`)
        ).json()) as { Text?: string }
        const link = /(https?:\/\/[^\s)]+\/auth\/v1\/verify[^\s)]*)/.exec(
          detail.Text ?? '',
        )
        if (link) return link[1]
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`No sign-in link arrived for ${email}`)
}

/** Removes an account created by a test, and the mail that created it. */
export async function deleteAccountByEmail(email: string): Promise<void> {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const user = data?.users.find((candidate) => candidate.email === email)
  if (user) await admin.auth.admin.deleteUser(user.id)

  await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`, {
    method: 'DELETE',
  }).catch(() => undefined)
}
