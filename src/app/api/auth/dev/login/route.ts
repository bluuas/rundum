import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  DEMO_EMAIL_DOMAIN,
  DEMO_PASSWORD,
  isAccountSwitchingEnabled,
} from '@/lib/auth/dev'

/**
 * Signs in as a seeded demo user. Development, or a published demo.
 *
 * This endpoint impersonates accounts, so it is gated twice over. The mode gate
 * is `isAccountSwitchingEnabled()`: development with ALLOW_MOCK_AUTH, or an
 * explicit DEMO_MODE deployment. The account gate is below and does not depend
 * on the mode — only seeded demo addresses can be signed in as, so no mode
 * reaches an account that belongs to a real person.
 *
 * The check is deliberately at request time rather than module scope: a
 * module-level throw would also fire during `next build`, which runs with
 * NODE_ENV=production, and break every build.
 */
export async function POST(request: Request) {
  if (!isAccountSwitchingEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { userId } = (await request.json()) as { userId?: string }
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  // Resolve the address from auth.users rather than trusting the client, and
  // confirm it is a seeded demo account before signing in as it.
  const admin = createAdminClient()
  // getUserById throws rather than returning an error for an id that is not a
  // uuid at all, which on a published demo is a 500 for anyone poking at the
  // endpoint. An unusable id is simply an unknown account.
  const { data, error: lookupError } = await admin.auth.admin
    .getUserById(userId)
    .catch(() => ({ data: null, error: new Error('Unknown account') }))
  const email = data?.user?.email

  if (lookupError || !email) {
    return NextResponse.json({ error: 'Unknown account' }, { status: 404 })
  }

  if (!email.endsWith(`@${DEMO_EMAIL_DOMAIN}`)) {
    return NextResponse.json({ error: 'Not a demo account' }, { status: 403 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: DEMO_PASSWORD,
  })

  if (error) {
    return NextResponse.json(
      { error: `${error.message}. Has the seed script been run?` },
      { status: 401 },
    )
  }

  return NextResponse.json({ ok: true })
}
