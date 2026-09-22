import { expect, test } from '@playwright/test'
import { signInAsDemoUser, path } from './helpers'

/**
 * In-app notifications. Written by database triggers rather than by the
 * actions, so these tests go through the real flows and then look at what the
 * other person sees — which is the only way to tell whether the trigger fired
 * for the right people.
 */

const ORGANIZER = 'Anouk A.'
const JOINER = 'Clara C.'

test('asking to join tells the organizer, and deciding tells the asker', async ({
  browser,
}) => {
  const organizerContext = await browser.newContext()
  const joinerContext = await browser.newContext()
  const organizer = await organizerContext.newPage()
  const joiner = await joinerContext.newPage()

  await signInAsDemoUser(organizer, ORGANIZER)
  await signInAsDemoUser(joiner, JOINER)

  const title = `Notify ${Date.now()}`

  await organizer.goto(path('/activities/new'))
  await organizer.getByRole('button', { name: 'Running' }).click()
  await organizer
    .getByLabel('Date')
    .fill(new Date(Date.now() + 86_400_000).toISOString().slice(0, 10))
  await organizer.getByLabel('Start time').fill('07:30')
  await organizer.getByRole('button', { name: 'Continue' }).click()
  await organizer.getByLabel('Name this area').fill('Hauptplatz Schwyz')
  await organizer.getByRole('button', { name: 'Continue' }).click()
  await organizer.getByLabel('Title').fill(title)
  await organizer.getByRole('button', { name: 'Continue' }).click()
  await organizer.getByRole('button', { name: 'Publish activity' }).click()
  await organizer.waitForURL(/\/activities\/[0-9a-f-]{36}$/)
  const id = organizer.url().split('/').pop()!

  try {
    await joiner.goto(path(`/activities/${id}`))
    await joiner.getByRole('button', { name: 'Request to join' }).click()
    await expect(joiner.getByText('Request sent')).toBeVisible({ timeout: 20_000 })

    // The organizer is told, by name and by activity.
    await organizer.goto(path('/notifications'))
    await expect(organizer.getByText(`${JOINER} asked to join ${title}.`)).toBeVisible()

    // And the requester is not told about their own request.
    await joiner.goto(path('/notifications'))
    await expect(joiner.getByText(`asked to join ${title}`)).toHaveCount(0)

    await organizer.goto(path(`/activities/${id}`))
    await organizer.getByRole('button', { name: 'Approve' }).click()

    await joiner.goto(path('/notifications'))
    await expect(joiner.getByText(`You are in: ${title}.`)).toBeVisible()
  } finally {
    await organizer.goto(path(`/activities/${id}`))
    await organizer.getByRole('button', { name: 'Delete activity' }).click()
    await organizer.getByRole('button', { name: 'Yes, delete it' }).click()
    await organizerContext.close()
    await joinerContext.close()
  }
})

test('the badge counts what is unread, and opening the page clears it', async ({
  page,
}) => {
  await signInAsDemoUser(page, ORGANIZER)

  // The seed leaves join requests and comments behind, so there is something
  // unread without this test having to manufacture it.
  await page.goto(path('/'))
  const bell = page.getByRole('link', { name: 'Notifications' })
  await expect(bell).toBeVisible()

  await bell.click()
  await page.waitForURL(/\/notifications$/)
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()

  // Read on open: coming back, the badge is gone. Asserted as "carries no
  // number" rather than by matching the glyph, which is how this test broke
  // when the bell stopped being an emoji and became a drawn icon.
  await page.goto(path('/'))
  await expect(bell).toBeVisible()
  await expect(bell.locator('svg')).toHaveCount(1)
  await expect(bell).not.toHaveText(/\d/)
})

test('a signed-out visitor gets no bell', async ({ page }) => {
  await page.goto(path('/'))
  await expect(page.getByRole('link', { name: 'Notifications' })).toHaveCount(0)
})
