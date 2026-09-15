import { expect, test, type Page } from '@playwright/test'
import { signInAsDemoUser, path } from './helpers'

/**
 * Join requests need two people, so these tests drive two browser contexts.
 * Sharing one context and swapping the session would hide exactly the bugs
 * worth catching here — a request the organizer cannot see, or a roster that
 * leaks to the wrong viewer.
 */

const ORGANIZER = 'Mara K.'
const JOINER = 'Anouk B.'
const BYSTANDER = 'Noah S.'

async function createActivity(page: Page, title: string, maxParticipants?: string) {
  await page.goto(path('/activities/new'))
  await page.getByRole('button', { name: 'Running' }).click()
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  await page.getByLabel('Date').fill(tomorrow)
  await page.getByLabel('Start time').fill('07:30')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Name this area').fill('Hauptplatz Schwyz')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Title').fill(title)
  if (maxParticipants) {
    await page.getByLabel('Maximum participants').fill(maxParticipants)
  }
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Publish activity' }).click()
  await page.waitForURL(/\/activities\/[0-9a-f-]{36}$/)
  return page.url().split('/').pop()!
}

async function deleteActivity(page: Page, id: string) {
  await page.goto(path(`/activities/${id}`))
  await page.getByRole('button', { name: 'Delete activity' }).click()
  await page.getByRole('button', { name: 'Yes, delete it' }).click()
  await page.waitForURL('**/me')
}

test('a request goes from asking to approved, and the roster follows', async ({
  browser,
}) => {
  const organizerContext = await browser.newContext()
  const joinerContext = await browser.newContext()
  const organizer = await organizerContext.newPage()
  const joiner = await joinerContext.newPage()

  await signInAsDemoUser(organizer, ORGANIZER)
  await signInAsDemoUser(joiner, JOINER)

  const title = `Join flow ${Date.now()}`
  const id = await createActivity(organizer, title)

  // The organizer starts with nothing waiting and nobody in.
  await expect(organizer.getByText('No requests waiting.')).toBeVisible()
  await expect(organizer.getByText('Nobody has joined yet.')).toBeVisible()

  await joiner.goto(path(`/activities/${id}`))
  await joiner.getByLabel('Add a note for the organizer').fill('Is the pace easy?')
  await joiner.getByRole('button', { name: 'Request to join' }).click()
  await expect(joiner.getByText('Request sent')).toBeVisible()

  // Waiting is not joining: the count must not move until the organizer acts.
  await expect(joiner.getByText('0 of 10')).toBeVisible()

  // A pending requester may not see who else is coming.
  await expect(joiner.getByText('Who is coming')).toHaveCount(0)

  await organizer.reload()
  await expect(organizer.getByText('1 request waiting')).toBeVisible()
  await expect(organizer.getByText('Is the pace easy?')).toBeVisible()

  await organizer.getByRole('button', { name: 'Approve' }).click()
  await expect(organizer.getByText('No requests waiting.')).toBeVisible()
  await expect(organizer.getByText('1 of 10')).toBeVisible()
  await expect(organizer.getByRole('listitem').filter({ hasText: JOINER })).toHaveCount(1)

  await joiner.reload()
  await expect(joiner.getByText('You are in')).toBeVisible()
  // Now that they are in, they can see who they are meeting.
  await expect(joiner.getByText('Who is coming')).toBeVisible()

  // Leaving frees the place again.
  await joiner.getByRole('button', { name: 'Leave this activity' }).click()
  await joiner.getByRole('button', { name: 'Yes, leave' }).click()
  await expect(joiner.getByRole('button', { name: 'Request to join' })).toBeVisible()

  await organizer.reload()
  await expect(organizer.getByText('0 of 10')).toBeVisible()

  await deleteActivity(organizer, id)
  await organizerContext.close()
  await joinerContext.close()
})

test('a declined request cannot be sent again', async ({ browser }) => {
  const organizerContext = await browser.newContext()
  const joinerContext = await browser.newContext()
  const organizer = await organizerContext.newPage()
  const joiner = await joinerContext.newPage()

  await signInAsDemoUser(organizer, ORGANIZER)
  await signInAsDemoUser(joiner, JOINER)

  const id = await createActivity(organizer, `Decline flow ${Date.now()}`)

  await joiner.goto(path(`/activities/${id}`))
  await joiner.getByRole('button', { name: 'Request to join' }).click()
  await expect(joiner.getByText('Request sent')).toBeVisible()

  await organizer.reload()
  await organizer.getByRole('button', { name: 'Decline' }).click()
  await expect(organizer.getByText('No requests waiting.')).toBeVisible()

  await joiner.reload()
  await expect(joiner.getByText('Not this time')).toBeVisible()
  // No way back in: a decline the organizer has to keep repeating is not a
  // decline.
  await expect(joiner.getByRole('button', { name: 'Request to join' })).toHaveCount(0)

  await deleteActivity(organizer, id)
  await organizerContext.close()
  await joinerContext.close()
})

test('a full activity stops accepting, and the limit cannot drop below those approved', async ({
  browser,
}) => {
  const organizerContext = await browser.newContext()
  const firstContext = await browser.newContext()
  const secondContext = await browser.newContext()
  const organizer = await organizerContext.newPage()
  const first = await firstContext.newPage()
  const second = await secondContext.newPage()

  await signInAsDemoUser(organizer, ORGANIZER)
  await signInAsDemoUser(first, JOINER)
  await signInAsDemoUser(second, BYSTANDER)

  const id = await createActivity(organizer, `Full flow ${Date.now()}`, '1')

  await first.goto(path(`/activities/${id}`))
  await first.getByRole('button', { name: 'Request to join' }).click()
  await expect(first.getByText('Request sent')).toBeVisible()

  await organizer.reload()
  await organizer.getByRole('button', { name: 'Approve' }).click()
  await expect(organizer.getByText('1 of 1')).toBeVisible()

  // The second person meets a closed door rather than a request that will
  // never be approvable.
  await second.goto(path(`/activities/${id}`))
  await expect(second.getByRole('button', { name: 'Full' })).toBeDisabled()

  // And the organizer cannot shrink the activity out from under the person
  // they already accepted.
  await organizer.goto(path(`/activities/${id}/edit`))
  await expect(organizer.getByText('1 person has already joined.')).toBeVisible()
  await expect(organizer.getByLabel('Maximum participants')).toHaveAttribute('min', '1')

  await deleteActivity(organizer, id)
  await organizerContext.close()
  await firstContext.close()
  await secondContext.close()
})

test('a passer-by sees the count but not who is coming', async ({ browser, page }) => {
  const organizerContext = await browser.newContext()
  const organizer = await organizerContext.newPage()
  await signInAsDemoUser(organizer, ORGANIZER)

  const id = await createActivity(organizer, `Privacy ${Date.now()}`)

  // Signed out entirely: the roster is not public, the count is.
  await page.goto(path(`/activities/${id}`))
  await expect(page.getByText('0 of 10')).toBeVisible()
  await expect(page.getByText('Who is coming')).toHaveCount(0)
  await expect(page.getByText('Sign in to ask for a place.')).toBeVisible()

  await deleteActivity(organizer, id)
  await organizerContext.close()
})
