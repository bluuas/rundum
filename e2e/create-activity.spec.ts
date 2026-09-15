import { expect, test } from '@playwright/test'
import { signInAsDemoUser, path } from './helpers'

test('a signed-in user can create an activity and it appears in the feed', async ({
  page,
}) => {
  await signInAsDemoUser(page)

  const title = `Test run ${Date.now()}`

  await page.goto(path('/activities/new'))

  // Step 1 — sport. Choosing one advances automatically.
  await page.getByRole('button', { name: 'Running' }).click()

  // Step 2 — when.
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  await page.getByLabel('Date').fill(tomorrow)
  await page.getByLabel('Start time').fill('07:30')
  await page.getByRole('button', { name: 'Continue' }).click()

  // Step 3 — where.
  await expect(page.getByText('Where do you meet?')).toBeVisible()
  await page.getByLabel('Name this area').fill('Hauptplatz Schwyz')
  await page.getByRole('button', { name: 'Continue' }).click()

  // Step 4 — details. Distance and pace appear because running supports them.
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Description').fill('Created by an end-to-end test.')
  await expect(page.getByLabel('Distance')).toBeVisible()
  await page.getByLabel('Distance').fill('8')
  await expect(page.getByLabel('Pace')).toBeVisible()
  await page.getByLabel('Pace').fill('5:30')
  await page.getByLabel('Maximum participants').fill('6')
  await page.getByRole('button', { name: 'Continue' }).click()

  // Step 5 — review, then publish.
  await expect(page.getByText('Ready to publish?')).toBeVisible()
  await expect(page.getByText('Hauptplatz Schwyz (approximate area)')).toBeVisible()
  await page.getByRole('button', { name: 'Publish activity' }).click()

  // Lands on the new activity's detail page.
  await page.waitForURL(/\/activities\/[0-9a-f-]{36}$/)
  const url = page.url()
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(page.getByText('8.0 km')).toBeVisible()
  await expect(page.getByText('5:30 /km')).toBeVisible()
  await expect(page.getByText('Approximate meeting area')).toBeVisible()

  // And it is discoverable in the feed.
  await page.goto(path('/?sports=run'))
  await expect(page.getByText(title)).toBeVisible()

  // Remove it again, so repeated runs do not fill the feed with test data.
  await page.goto(url)
  await page.getByRole('button', { name: 'Delete activity' }).click()
  await page.getByRole('button', { name: 'Yes, delete it' }).click()
  await page.waitForURL('**/me')
})

test('fields that do not apply to a sport are not offered', async ({ page }) => {
  await signInAsDemoUser(page)
  await page.goto(path('/activities/new'))

  // Yoga has neither distance nor pace.
  await page.getByRole('button', { name: 'Yoga' }).click()
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  await page.getByLabel('Date').fill(tomorrow)
  await page.getByLabel('Start time').fill('18:00')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Name this area').fill('Brunnen waterfront')
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByLabel('Title')).toBeVisible()
  await expect(page.getByLabel('Distance')).toHaveCount(0)
  await expect(page.getByLabel('Pace')).toHaveCount(0)
})

test('a signed-out visitor is asked to sign in before creating', async ({ page }) => {
  await page.goto(path('/activities/new'))
  await expect(page.getByText('Sign in to create an activity')).toBeVisible()
})
