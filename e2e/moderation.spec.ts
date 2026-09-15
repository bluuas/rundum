import { expect, test, type Page } from '@playwright/test'
import { path, signInAsDemoUser } from './helpers'

/**
 * Reporting and blocking.
 *
 * The database-level guarantees are checked by `npm run db:verify`; these tests
 * cover what the person actually experiences — that a report is acknowledged,
 * that blocking removes someone from view, and that it can be undone.
 */

const ORGANIZER = 'Anouk A.'
const OTHER = 'Hanna H.'

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

async function deleteActivity(page: Page, id: string) {
  await page.goto(path(`/activities/${id}`))
  await page.getByRole('button', { name: 'Delete activity' }).click()
  await page.getByRole('button', { name: 'Yes, delete it' }).click()
  await page.waitForURL('**/me')
}

test('an activity can be reported, and the organizer is never told who by', async ({
  browser,
}) => {
  const organizerContext = await browser.newContext()
  const reporterContext = await browser.newContext()
  const organizer = await organizerContext.newPage()
  const reporter = await reporterContext.newPage()

  await signInAsDemoUser(organizer, ORGANIZER)
  await signInAsDemoUser(reporter, OTHER)

  const title = `Reportable ${Date.now()}`
  const id = await createActivity(organizer, title)

  // The organizer sees moderation tools on their own activity, not a report
  // link pointed at themselves.
  await expect(organizer.getByText('Something wrong?')).toHaveCount(0)

  await reporter.goto(path(`/activities/${id}`))
  await reporter.getByRole('button', { name: 'Report this activity' }).click()
  await reporter
    .getByLabel('Anything else we should know?')
    .fill('Testing the report flow.')
  await reporter.getByRole('button', { name: 'Send report' }).click()
  await expect(reporter.getByText('Thanks — we have it')).toBeVisible()

  // Nothing about the report is visible on the activity itself — not to the
  // organizer, and not to anyone else.
  await organizer.reload()
  await expect(organizer.getByText('Thanks — we have it')).toHaveCount(0)
  await expect(organizer.getByText(OTHER)).toHaveCount(0)

  await deleteActivity(organizer, id)
  await organizerContext.close()
  await reporterContext.close()
})

test('blocking hides the other person, and can be undone', async ({ browser }) => {
  const organizerContext = await browser.newContext()
  const blockerContext = await browser.newContext()
  const organizer = await organizerContext.newPage()
  const blocker = await blockerContext.newPage()

  await signInAsDemoUser(organizer, ORGANIZER)
  await signInAsDemoUser(blocker, OTHER)

  const title = `Blockable ${Date.now()}`
  const id = await createActivity(organizer, title)

  await blocker.goto(path(`/activities/${id}`))
  await expect(blocker.getByRole('heading', { name: title })).toBeVisible()

  await blocker.getByRole('button', { name: `Block ${ORGANIZER}` }).click()
  await blocker.getByRole('button', { name: 'Yes, block' }).click()

  // Blocking takes you off the page, because the page is no longer readable.
  await blocker.waitForURL(/\/en$/)

  // Gone from the feed, and gone as a page.
  await expect(blocker.getByText(title)).toHaveCount(0)
  await blocker.goto(path(`/activities/${id}`))
  await expect(blocker.getByText('Page not found')).toBeVisible()

  // The block is findable and reversible.
  await blocker.goto(path('/profile'))
  await expect(blocker.getByText('Blocked accounts')).toBeVisible()
  await expect(blocker.getByText(ORGANIZER)).toBeVisible()

  await blocker.getByRole('button', { name: 'Unblock' }).click()
  await expect(blocker.getByText('You have not blocked anyone.')).toBeVisible({
    timeout: 20_000,
  })

  await blocker.goto(path(`/activities/${id}`))
  await expect(blocker.getByRole('heading', { name: title })).toBeVisible()

  await deleteActivity(organizer, id)
  await organizerContext.close()
  await blockerContext.close()
})

test('blocking frees the place the blocked person held', async ({ browser }) => {
  const organizerContext = await browser.newContext()
  const joinerContext = await browser.newContext()
  const organizer = await organizerContext.newPage()
  const joiner = await joinerContext.newPage()

  await signInAsDemoUser(organizer, ORGANIZER)
  await signInAsDemoUser(joiner, OTHER)

  const id = await createActivity(organizer, `Freed place ${Date.now()}`)

  await joiner.goto(path(`/activities/${id}`))
  await joiner.getByRole('button', { name: 'Request to join' }).click()
  await expect(joiner.getByText('Request sent')).toBeVisible()

  await organizer.reload()
  await organizer.getByRole('button', { name: 'Approve' }).click()
  await expect(organizer.getByText('1 of 10')).toBeVisible()

  // Now the participant blocks the organizer. Leaving them counted would hold
  // a place at an activity they can no longer see.
  await joiner.reload()
  await joiner.getByRole('button', { name: `Block ${ORGANIZER}` }).click()
  await joiner.getByRole('button', { name: 'Yes, block' }).click()
  await joiner.waitForURL(/\/en$/)

  await organizer.reload()
  await expect(organizer.getByText('0 of 10')).toBeVisible()

  // Put the demo data back the way it was.
  await joiner.goto(path('/profile'))
  await joiner.getByRole('button', { name: 'Unblock' }).click()
  await expect(joiner.getByText('You have not blocked anyone.')).toBeVisible({
    timeout: 20_000,
  })

  await deleteActivity(organizer, id)
  await organizerContext.close()
  await joinerContext.close()
})
