import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { DEMO_EMAIL_DOMAIN, DEMO_PASSWORD, isMockAuthEnabled } from '@/lib/auth/dev'

/**
 * Signs in as a seeded demo user. Development only.
 *
 * This endpoint impersonates accounts, so it is gated on `isMockAuthEnabled()`,
 * which requires NODE_ENV to not be 'production' *and* ALLOW_MOCK_AUTH to be
 * set. The NODE_ENV half cannot be switched on by configuration, so a
 * production deployment returns 404 here even if someone sets the flag.
 *
 * The check is deliberately at request time rather than module scope: a
 * module-level throw would also fire during `next build`, which runs with
 * NODE_ENV=production, and break every build.
 */
export async function POST(request: Request) {
  if (!isMockAuthEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { userId } = (await request.json()) as { userId?: string }
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  // Resolve the address from auth.users rather than trusting the client, and
  // confirm it is a seeded demo account before signing in as it.
  const admin = createAdminClient()
  const { data, error: lookupError } = await admin.auth.admin.getUserById(userId)
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
