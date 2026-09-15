import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { path, signInAsDemoUser } from './helpers'

config({ path: '.env.local', quiet: true })

/**
 * The Strava sign-in, driven against the local stand-in in
 * scripts/fake-strava.mts.
 *
 * Only the hostname differs from production: the state check, the code
 * exchange, server-side token storage, profile staging, the consent step and
 * deauthorization are the same code either way. Since a real Strava
 * application needs a subscription and starts in single-player mode, this is
 * the only way any of it gets exercised before launch.
 */

const FAKE_STRAVA = process.env.STRAVA_AUTH_BASE_URL?.includes('4400')

/**
 * Assertions that follow a Server Action get a longer window than Playwright's
 * five-second default. Each of these actions makes several round trips to a
 * hosted Supabase project, and under load that legitimately exceeds five
 * seconds — a failure there would be a statement about the network, not about
 * the behaviour under test.
 */
const AFTER_ACTION = { timeout: 20_000 }

test.describe(() => {
  test.skip(
    !FAKE_STRAVA,
    'Set STRAVA_AUTH_BASE_URL=http://localhost:4400 and run `npm run dev:strava`.',
  )

  // Service role: strava_tokens is unreachable by every client role, which is
  // the property under test, so the assertions need a key that bypasses RLS.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  /** Walks the fake consent screen for one of its canned athletes. */
  async function authorize(page: Page, athleteId: string) {
    await page.getByRole('link', { name: 'Connect with Strava' }).click()
    await page.waitForURL(/localhost:4400\/oauth\/authorize/)
    await expect(page.getByText('This is not Strava.')).toBeVisible()
    await page.getByLabel('Sign in as').selectOption(athleteId)
    await page.getByRole('button', { name: 'Authorize' }).click()
    await page.waitForURL(/\/profile/)
  }

  async function cleanUp(athleteId: number) {
    const { data } = await admin
      .from('profiles')
      .select('id')
      .eq('strava_athlete_id', athleteId)
      .maybeSingle()

    if (data) await admin.auth.admin.deleteUser(data.id)
  }

  test('signing in with Strava never publishes the Strava name until consent', async ({
    page,
  }) => {
    test.slow()
    await cleanUp(900001)

    await page.goto(path('/profile'))
    await authorize(page, '900001')

    await expect(page.getByRole('status')).toHaveText('Connected to Strava.')

    // The account exists, but under a generated placeholder. The Strava name is
    // offered, not applied — publishing it straight to a public profile would
    // disclose one user's Strava Data to every other user.
    await expect(
      page.getByRole('heading', { name: /^Athlete [0-9a-f]{4}$/ }),
    ).toBeVisible()
    await expect(page.getByText('Use your Strava profile details?')).toBeVisible()
    await expect(page.getByText('Rea Hofer')).toBeVisible()

    const { data: profile } = await admin
      .from('profiles')
      .select('id, display_name, strava_connected')
      .eq('strava_athlete_id', 900001)
      .single()

    expect(profile).not.toBeNull()
    if (!profile) return

    expect(profile.display_name).not.toBe('Rea Hofer')
    expect(profile.strava_connected).toBe(true)

    // Tokens are stored, and stored server-side only.
    const { data: tokens } = await admin
      .from('strava_tokens')
      .select('user_id')
      .eq('user_id', profile.id)
      .maybeSingle()
    expect(tokens).not.toBeNull()

    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const leaked = await anon.from('strava_tokens').select('user_id')
    expect(leaked.data ?? []).toHaveLength(0)

    // Accepting is what makes it the user's own profile name.
    await page.getByRole('button', { name: 'Use these details' }).click()
    await expect(page.getByRole('heading', { name: 'Rea Hofer' })).toBeVisible(
      AFTER_ACTION,
    )
    await expect(page.getByText('Use your Strava profile details?')).toHaveCount(0)

    // Disconnecting revokes at Strava and deletes what was stored.
    await page.getByRole('button', { name: 'Disconnect from Strava' }).click()
    await page.getByRole('button', { name: 'Yes, disconnect' }).click()
    await expect(page.getByRole('link', { name: 'Connect with Strava' })).toBeVisible(
      AFTER_ACTION,
    )

    const { data: afterTokens } = await admin
      .from('strava_tokens')
      .select('user_id')
      .eq('user_id', profile.id)
      .maybeSingle()
    expect(afterTokens).toBeNull()

    const { data: afterProfile } = await admin
      .from('profiles')
      .select('strava_athlete_id, strava_connected, avatar_url, display_name')
      .eq('id', profile.id)
      .single()
    expect(afterProfile?.strava_athlete_id).toBeNull()
    expect(afterProfile?.strava_connected).toBe(false)
    expect(afterProfile?.avatar_url).toBeNull()
    // The name they adopted is theirs now, and survives the disconnect.
    expect(afterProfile?.display_name).toBe('Rea Hofer')

    await admin.auth.admin.deleteUser(profile.id)
  })

  test('declining leaves a Strava-free profile that can still be renamed', async ({
    page,
  }) => {
    await cleanUp(900002)

    await page.goto(path('/profile'))
    await authorize(page, '900002')

    await page.getByRole('button', { name: 'No thanks' }).click()
    await expect(page.getByText('Use your Strava profile details?')).toHaveCount(
      0,
      AFTER_ACTION,
    )

    const { data: profile } = await admin
      .from('profiles')
      .select('id, display_name')
      .eq('strava_athlete_id', 900002)
      .single()

    expect(profile).not.toBeNull()
    if (!profile) return

    expect(profile.display_name).not.toBe('Til Brunner')

    // Nothing unconsented is kept around waiting for a change of mind.
    const { data: staged } = await admin
      .from('strava_profile_staging')
      .select('user_id')
      .eq('user_id', profile.id)
      .maybeSingle()
    expect(staged).toBeNull()

    // Declining must not mean living with a generated name forever.
    await page.getByRole('button', { name: 'Edit profile' }).click()
    await page.getByLabel('Display name').fill('Til from Seewen')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('heading', { name: 'Til from Seewen' })).toBeVisible(
      AFTER_ACTION,
    )

    await admin.auth.admin.deleteUser(profile.id)
  })

  test('cancelling at Strava connects nothing', async ({ page }) => {
    await cleanUp(900001)

    await page.goto(path('/profile'))
    await page.getByRole('link', { name: 'Connect with Strava' }).click()
    await page.waitForURL(/localhost:4400\/oauth\/authorize/)
    await page.getByRole('button', { name: 'Cancel' }).click()

    await page.waitForURL(/\/profile/)
    await expect(
      page.getByText('You cancelled the Strava sign-in. Nothing was connected.'),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Connect with Strava' })).toBeVisible()
  })

  test('a callback with the wrong state is refused', async ({ page }) => {
    // No state cookie was ever set for this one, so it is exactly what a forged
    // callback looks like: a code with a state we never issued.
    // API routes are not localised, so this one is not prefixed.
    await page.goto('/api/auth/strava/callback?code=whatever&state=not-the-one')
    await page.waitForURL(/\/profile/)
    await expect(
      page.getByText('That sign-in link had expired or did not match.'),
    ).toBeVisible()
  })

  test('an already-linked athlete is not moved to another account', async ({
    page,
    browser,
  }) => {
    await cleanUp(900001)

    // First account takes the athlete.
    await page.goto(path('/profile'))
    await authorize(page, '900001')
    await expect(page.getByRole('status')).toHaveText('Connected to Strava.')

    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('strava_athlete_id', 900001)
      .single()

    expect(profile).not.toBeNull()
    if (!profile) return

    // A different, signed-in account tries to claim the same athlete.
    const other = await browser.newContext()
    const otherPage = await other.newPage()
    await signInAsDemoUser(otherPage, 'Anouk B.')
    await otherPage.goto(path('/profile'))
    await authorize(otherPage, '900001')

    await expect(
      otherPage.getByText('That Strava account is already connected to another'),
    ).toBeVisible()

    await other.close()
    await admin.auth.admin.deleteUser(profile.id)
  })
})
