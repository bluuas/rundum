import { expect, test, type Page } from '@playwright/test'
import { signInAsDemoUser, path } from './helpers'

/**
 * Swiping a feed row to the right asks for a place, the way a mail app swipes
 * a message. The two things worth pinning down are that it reaches the same
 * server action the detail page does, and that a drag does not end up
 * following the link underneath it.
 */

const ORGANIZER = 'Anouk A.'
const JOINER = 'Clara C.'

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

async function swipeRight(page: Page, row: ReturnType<Page['getByRole']>, by: number) {
  // Without this the box can sit below the viewport, and the swipe lands on
  // whatever is on screen instead — which passes as "nothing happened".
  await row.scrollIntoViewIfNeeded()
  const box = await row.boundingBox()
  if (!box) throw new Error('Row has no box')
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + 24, y)
  await page.mouse.down()
  await page.mouse.move(box.x + 24 + by, y, { steps: 12 })
  await page.mouse.up()
}

test('swiping a feed row to the right requests a place', async ({ browser }) => {
  const organizerContext = await browser.newContext()
  const joinerContext = await browser.newContext()
  const organizer = await organizerContext.newPage()
  const joiner = await joinerContext.newPage()

  await signInAsDemoUser(organizer, ORGANIZER)
  await signInAsDemoUser(joiner, JOINER)

  const title = `Swipe flow ${Date.now()}`
  const id = await createActivity(organizer, title)

  // Cleanup runs even when an assertion below fails, so a red run does not
  // leave activities behind for every later run to trip over.
  try {
    await joiner.goto(path('/'))
    const row = joiner.getByRole('link').filter({ hasText: title }).first()
    await expect(row).toBeVisible()

    // Short of the threshold: the row springs back and nothing is sent.
    await swipeRight(joiner, row, 40)
    await expect(joiner.getByText('Request sent')).toHaveCount(0)

    // A drag is not a tap, however it ends.
    await expect(joiner).toHaveURL(/\/en$/)

    await swipeRight(joiner, row, 130)
    await expect(joiner.getByText('Request sent')).toBeVisible({ timeout: 20_000 })
    await expect(joiner).toHaveURL(/\/en$/)

    // It is the same request the detail page would have made.
    await organizer.goto(path(`/activities/${id}`))
    await expect(organizer.getByText('1 request waiting')).toBeVisible()
  } finally {
    await organizer.goto(path(`/activities/${id}`))
    await organizer.getByRole('button', { name: 'Delete activity' }).click()
    await organizer.getByRole('button', { name: 'Yes, delete it' }).click()
    await organizerContext.close()
    await joinerContext.close()
  }
})

test('your own activity does not offer the gesture', async ({ page }) => {
  await signInAsDemoUser(page, ORGANIZER)

  const title = `Own swipe ${Date.now()}`
  const id = await createActivity(page, title)

  try {
    await page.goto(path('/'))
    const row = page.getByRole('link').filter({ hasText: title }).first()
    await expect(row).toBeVisible()

    // The row is not wrapped in the draggable element at all, so there is no
    // gesture to make and no error to explain.
    await expect(
      row.evaluate((el) => (el.parentElement as HTMLElement).className),
    ).resolves.not.toContain('touch-pan-y')

    await swipeRight(page, row, 130)
    await expect(page.getByText('You are organizing this activity.')).toHaveCount(0)
    await expect(page.getByText('Request sent')).toHaveCount(0)
  } finally {
    await page.goto(path(`/activities/${id}`))
    await page.getByRole('button', { name: 'Delete activity' }).click()
    await page.getByRole('button', { name: 'Yes, delete it' }).click()
  }
})
