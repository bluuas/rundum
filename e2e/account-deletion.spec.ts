import { expect, test, type Page } from '@playwright/test'
import { admin, anon, signInAsDemoUser, path } from './helpers'

/**
 * Deleting an account has to erase the person without destroying what other
 * people did around them. These tests are about the second half: the seeded
 * cast is never deleted, a throwaway account is made for each run.
 */

const PASSWORD = 'rundum-demo-password'

async function createThrowawayAccount(name: string) {
  const email = `throwaway-${Date.now()}@demo.rundum.app`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: name, strava_connected: false },
  })
  if (error || !data.user) throw error ?? new Error('Could not create the account')

  const { data: city } = await admin
    .from('cities')
    .select('id')
    .eq('slug', 'schwyz')
    .single()

  await admin
    .from('profiles')
    .update({ display_name: name, city_id: city!.id })
    .eq('id', data.user.id)

  return { id: data.user.id, email }
}

async function signInAs(page: Page, userId: string) {
  await page.goto(path('/'))
  const response = await page.request.post('/api/auth/dev/login', {
    data: { userId },
  })
  if (!response.ok()) throw new Error(`Dev login failed: ${response.status()}`)
  await page.reload()
}

async function createActivity(page: Page, title: string) {
  await page.goto(path('/activities/new'))
  await page.getByRole('button', { name: 'Running' }).click()
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  await page.getByLabel('Date').fill(tomorrow)
  await page.getByLabel('Start time').fill('07:30')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Name this area').fill('Hauptplatz Schwyz')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Publish activity' }).click()
  await page.waitForURL(/\/activities\/[0-9a-f-]{36}$/)
  return page.url().split('/').pop()!
}

test('deleting an account cancels what others joined instead of erasing it', async ({
  browser,
}) => {
  const leaverContext = await browser.newContext()
  const joinerContext = await browser.newContext()
  const leaver = await leaverContext.newPage()
  const joiner = await joinerContext.newPage()

  const account = await createThrowawayAccount(`Leaver ${Date.now() % 100000}`)
  await signInAs(leaver, account.id)
  await signInAsDemoUser(joiner, 'Clara C.')

  const title = `Leaving ${Date.now()}`
  const activityId = await createActivity(leaver, title)

  // Somebody else joins, and comments.
  await joiner.goto(path(`/activities/${activityId}`))
  await joiner.getByRole('button', { name: 'Request to join' }).click()
  await expect(joiner.getByText('Request sent')).toBeVisible({ timeout: 20_000 })
  await joiner
    .getByPlaceholder('Ask a question, or say you are coming')
    .fill('Looking forward to it')
  await joiner.getByRole('button', { name: 'Post comment' }).click()
  await expect(
    joiner.locator('li').filter({ hasText: 'Looking forward to it' }),
  ).toHaveCount(1)

  // The confirmation states the cost in numbers before anything happens.
  await leaver.goto(path('/profile'))
  await leaver.getByRole('button', { name: 'Delete my account' }).click()
  await expect(leaver.getByText('1 upcoming activity will be cancelled.')).toBeVisible()

  await leaver.getByRole('button', { name: 'Yes, delete it' }).click()
  await leaver.waitForURL(/\/en$/)

  // The account is gone.
  const { data: gone } = await admin.auth.admin.getUserById(account.id)
  expect(gone.user).toBeNull()

  // The activity is not: it is cancelled, and still there for the person who
  // had joined it, with the organizer detached rather than the row removed.
  await joiner.goto(path(`/activities/${activityId}`))
  await expect(joiner.getByRole('heading', { name: title })).toBeVisible()
  // Exact: the page also says "was cancelled by the organizer", and the
  // badge is the thing being asserted.
  await expect(joiner.getByText('Cancelled', { exact: true })).toBeVisible()
  await expect(joiner.getByText('Deleted account', { exact: true })).toBeVisible()

  // Their own comment survives them leaving.
  await expect(
    joiner.locator('li').filter({ hasText: 'Looking forward to it' }),
  ).toHaveCount(1)

  const { data: row } = await admin
    .from('activities')
    .select('owner_id, status')
    .eq('id', activityId)
    .single()
  expect(row!.owner_id).toBeNull()
  expect(row!.status).toBe('cancelled')

  // And the metric still counts what they created — it is about whether
  // people use Rundum to plan, not about what survived.
  const { count } = await admin
    .from('activity_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'activity_created')
    .is('user_id', null)
  expect(count ?? 0).toBeGreaterThan(0)

  await admin.from('activities').delete().eq('id', activityId)
  await leaverContext.close()
  await joinerContext.close()
})

test('a deleted account can no longer sign in', async ({ page }) => {
  const account = await createThrowawayAccount(`Ghost ${Date.now() % 100000}`)
  await signInAs(page, account.id)

  await page.goto(path('/profile'))
  await page.getByRole('button', { name: 'Delete my account' }).click()
  await expect(page.getByText('you have no upcoming activities')).toBeVisible()
  await page.getByRole('button', { name: 'Yes, delete it' }).click()
  await page.waitForURL(/\/en$/)

  // The session is cleared, not merely orphaned.
  await page.goto(path('/profile'))
  await expect(page.getByText('Not signed in')).toBeVisible()

  const { data } = await anon
    .from('profiles')
    .select('id')
    .eq('id', account.id)
    .maybeSingle()
  expect(data).toBeNull()
})
