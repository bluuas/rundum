import { expect, test } from '@playwright/test'
import { path, signInAsDemoUser } from './helpers'

/**
 * The metrics page.
 *
 * The gate is the interesting part: the route is not linked from anywhere and
 * must give a non-admin the same 404 a non-existent page gives, so that it does
 * not advertise its own existence.
 */

const ADMIN = 'Mara K.'
const NOT_ADMIN = 'Anouk B.'

test('an admin sees the primary metric, and it moves when an activity is created', async ({
  page,
}) => {
  await signInAsDemoUser(page, ADMIN)
  await page.goto(path('/insights'))

  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible()
  await expect(page.getByText('Activities created')).toBeVisible()

  const hero = page.locator('dd, p').filter({ hasText: /^\d+$/ }).first()
  const before = Number(await hero.innerText())
  expect(before).toBeGreaterThan(0)

  // Creating one has to move the number this page exists to show.
  await page.goto(path('/activities/new'))
  await page.getByRole('button', { name: 'Running' }).click()
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  await page.getByLabel('Date').fill(tomorrow)
  await page.getByLabel('Start time').fill('07:30')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Name this area').fill('Hauptplatz Schwyz')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Title').fill(`Metric mover ${Date.now()}`)
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Publish activity' }).click()
  await page.waitForURL(/\/activities\/[0-9a-f-]{36}$/)
  const id = page.url().split('/').pop()!

  await page.goto(path('/insights'))
  await expect(hero).toHaveText(String(before + 1))

  // Deleting it must NOT decrement: the activity was still created, and the
  // metric is about whether people are planning.
  await page.goto(path(`/activities/${id}`))
  await page.getByRole('button', { name: 'Delete activity' }).click()
  await page.getByRole('button', { name: 'Yes, delete it' }).click()
  await page.waitForURL('**/me')

  await page.goto(path('/insights'))
  await expect(hero).toHaveText(String(before + 1))
})

test('the metrics page does not exist for anyone else', async ({ page }) => {
  await signInAsDemoUser(page, NOT_ADMIN)
  await page.goto(path('/insights'))
  await expect(page.getByText('Page not found')).toBeVisible()
  await expect(page.getByText('Activities created')).toHaveCount(0)
})

test('the metrics page does not exist when signed out', async ({ page }) => {
  await page.goto(path('/insights'))
  await expect(page.getByText('Page not found')).toBeVisible()
})
