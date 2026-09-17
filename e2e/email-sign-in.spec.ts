import { expect, test } from '@playwright/test'
import { admin, anon, deleteAccountByEmail, path, signInLinkFor } from './helpers'

/**
 * Signing in without Strava.
 *
 * This is the launch blocker the whole flow exists for: a new Strava
 * application can only authenticate its own owner until ten athletes have
 * connected, so nobody could reach Rundum at all without another way in.
 *
 * Testable at all because development runs on the local Docker stack, where
 * Supabase hands outgoing mail to Mailpit rather than to a provider. These
 * tests read the real email and click the real link.
 */

/** A fresh address per run, so one test never inherits another's account. */
function newAddress(label: string): string {
  return `e2e-${label}-${Date.now()}@example.test`
}

test('an emailed link creates an account and asks what to call it', async ({ page }) => {
  const email = newAddress('signup')

  try {
    await page.goto(path('/signin'))
    await page.getByLabel('Email address').fill(email)
    await page.getByRole('button', { name: 'Send me a link' }).click()

    // Deliberately says nothing about whether the address had an account.
    await expect(page.getByText('Check your inbox')).toBeVisible()

    await page.goto(await signInLinkFor(email))
    await expect(page).toHaveURL(/\/en\/welcome/)

    /*
     * The point of the welcome step. Before a name is chosen the profile must
     * not carry any part of the address: "e2e-signup-…" published as the name
     * on every activity would be a disclosure nobody agreed to.
     */
    const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const created = users.users.find((user) => user.email === email)
    expect(created).toBeTruthy()

    const { data: before } = await admin
      .from('profiles')
      .select('display_name, display_name_chosen')
      .eq('id', created!.id)
      .single()

    expect(before?.display_name_chosen).toBe(false)
    expect(before?.display_name).toMatch(/^Athlete /)
    expect(before?.display_name).not.toContain('e2e-signup')
    expect(before?.display_name).not.toContain('@')

    // The welcome step is the first screen of somebody's first visit, on a
    // phone. It gets the same layout rule as everything else.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(
      overflow,
      `/welcome overflows horizontally by ${overflow}px`,
    ).toBeLessThanOrEqual(1)

    await page.getByLabel('Display name').fill('Rea R.')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page).toHaveURL(/\/en$/)

    // The name is set, and the flag with it — by the trigger, not by the form.
    const { data: after } = await admin
      .from('profiles')
      .select('display_name, display_name_chosen')
      .eq('id', created!.id)
      .single()

    expect(after?.display_name).toBe('Rea R.')
    expect(after?.display_name_chosen).toBe(true)
  } finally {
    await deleteAccountByEmail(email)
  }
})

test('signing in again lands in the app, not back on the welcome step', async ({
  page,
}) => {
  const email = newAddress('return')

  try {
    await page.goto(path('/signin'))
    await page.getByLabel('Email address').fill(email)
    await page.getByRole('button', { name: 'Send me a link' }).click()
    await expect(page.getByText('Check your inbox')).toBeVisible()

    await page.goto(await signInLinkFor(email))
    await page.getByLabel('Display name').fill('Rea R.')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/\/en$/)

    // Sign out, then come back the same way.
    await page.goto(path('/profile'))
    await page.getByRole('button', { name: 'Sign out' }).click()
    // Signing out lands on the feed, in the language they were reading.
    await expect(page).toHaveURL(/\/en$/)
    await page.goto(path('/profile'))
    await expect(page.getByText('Not signed in')).toBeVisible()

    await page.goto(path('/signin'))
    await page.getByLabel('Email address').fill(email)
    await page.getByRole('button', { name: 'Send me a link' }).click()
    await expect(page.getByText('Check your inbox')).toBeVisible()

    await page.goto(await signInLinkFor(email))

    // Straight to the feed: the name question is asked once.
    await expect(page).toHaveURL(/\/en$/)
    await page.goto(path('/profile'))
    await expect(page.getByRole('heading', { name: 'Rea R.' })).toBeVisible()
  } finally {
    await deleteAccountByEmail(email)
  }
})

test('a link forwarded to another browser is not a session', async ({
  browser,
  page,
}) => {
  const email = newAddress('forward')

  try {
    await page.goto(path('/signin'))
    await page.getByLabel('Email address').fill(email)
    await page.getByRole('button', { name: 'Send me a link' }).click()
    await expect(page.getByText('Check your inbox')).toBeVisible()

    const link = await signInLinkFor(email)

    /*
     * The PKCE verifier is a cookie in the browser that asked for the link, so
     * the code in the email is useless anywhere else. Worth a test: a sign-in
     * link lives in an inbox, and inboxes get forwarded and breached.
     */
    const stranger = await browser.newContext()
    const strangerPage = await stranger.newPage()
    await strangerPage.goto(link)

    /*
     * `exchange` specifically, not just any failure: that is the code exchange
     * refusing a request with no verifier, which is the PKCE property itself.
     * A test that accepted any error here would still pass if the link had
     * quietly fallen back to a flow that signs the stranger in.
     *
     * Matching on the message rather than on `getByRole('alert')` because the
     * dev overlay also publishes an alert when an earlier test logged a server
     * error, and a strict-mode violation there says nothing about this page.
     */
    await expect(strangerPage).toHaveURL(/\/signin\?error=exchange/)
    await expect(strangerPage.getByText('opened in a different browser')).toBeVisible()

    // And nobody is signed in over there.
    await strangerPage.goto(path('/profile'))
    await expect(strangerPage.getByText('Not signed in')).toBeVisible()
    await stranger.close()
  } finally {
    await deleteAccountByEmail(email)
  }
})

test('the sign-in page refuses an address that is not one', async ({ page }) => {
  await page.goto(path('/signin'))

  // type="email" would block submission before the action ever runs, so this
  // checks the server's answer to something the browser considers valid.
  await page.getByLabel('Email address').fill('nobody@invalid')
  await page.getByRole('button', { name: 'Send me a link' }).click()

  await expect(page.getByText('Check your inbox')).toBeHidden()
})

test('a signed-out visitor is offered the way in', async ({ page }) => {
  await page.goto(path('/profile'))
  await page.getByRole('link', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/en\/signin/)
  await expect(page.getByLabel('Email address')).toBeVisible()
})

test('nothing about a magic link reaches the browser bundle', async () => {
  // The anon client can read profiles, but never the flag that says whether
  // somebody has finished setting theirs up.
  const { data } = await anon.from('profiles').select('display_name').limit(1)
  expect(data).toBeTruthy()

  const { error } = await anon
    .from('profiles')
    // Types know the column; the database does not grant it. That gap is the
    // point — the column list on `profiles` is what keeps it private.
    .select('display_name_chosen')
    .limit(1)

  expect(error).toBeTruthy()
})
