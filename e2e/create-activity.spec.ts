import { expect, test } from '@playwright/test'
import { signInAsDemoUser, path } from './helpers'

test('a signed-in user can create an activity and it appears in the feed', async ({
  page,
}) => {
  await signInAsDemoUser(page)

  const title = `Test run ${Date.now()}`

  /*
   * Watch for the two symptoms of a navigation that skipped the locale prefix.
   * The URL alone proves nothing: proxy.ts redirects an unprefixed path, so by
   * the time the browser settles it looks correct either way. What gives it
   * away is the redirect itself, and the console error from a client-side
   * navigation that met one mid-RSC-fetch.
   */
  const redirects: string[] = []
  const consoleErrors: string[] = []

  page.on('response', (response) => {
    if (response.status() === 307 && response.url().includes('/activities/')) {
      redirects.push(response.url())
    }
  })
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

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
  // Locale-prefixed, and arrived at directly rather than via the proxy.
  await page.waitForURL(/\/en\/activities\/[0-9a-f-]{36}$/)
  expect(redirects).toEqual([])
  expect(consoleErrors).toEqual([])
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

test('a ride asks for a speed, and says it back as one', async ({ page }) => {
  await signInAsDemoUser(page)

  const title = `Test ride ${Date.now()}`
  await page.goto(path('/activities/new'))

  await page.getByRole('button', { name: 'Cycling' }).click()

  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  await page.getByLabel('Date').fill(tomorrow)
  await page.getByLabel('Start time').fill('17:45')
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.getByLabel('Name this area').fill('Brunnen waterfront')
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Description').fill('Created by an end-to-end test.')
  await page.getByLabel('Distance').fill('50')

  /*
   * The whole point: a cyclist is asked for a speed, not a pace. "2:30 /km" is
   * a true statement about a 24 km/h ride and tells the person nothing without
   * arithmetic, so the field has to be the one they think in.
   */
  await expect(page.getByLabel('Pace')).toHaveCount(0)
  await expect(page.getByLabel('Speed')).toBeVisible()
  await page.getByLabel('Speed').fill('24')

  await page.getByRole('button', { name: 'Continue' }).click()

  // The review step, then the detail page, both in km/h.
  await expect(page.getByText('24 km/h')).toBeVisible()
  await page.getByRole('button', { name: 'Publish' }).click()

  await page.waitForURL(/\/en\/activities\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(page.getByText('24 km/h')).toBeVisible()
  await expect(page.getByText('/km')).toHaveCount(0)
})

test('a seeded swim reads in the unit swimmers use', async ({ page }) => {
  // 1300 seconds per kilometre is 2:10 per 100 m. Shown as "21:40 /km" it is
  // arithmetic homework; shown per 100 m it is a pace a swimmer recognises.
  await page.goto(path('/?sports=swim&radius=50000'))
  await expect(page.getByText('2:10 /100m').first()).toBeVisible()
})
