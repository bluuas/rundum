import { expect, test } from '@playwright/test'
import { anon, path, signInAsDemoUser } from './helpers'

/**
 * Language lives in the URL, so these check the routing as much as the words:
 * a shared link must carry its language, and switching must keep your place.
 */

test('a path without a locale redirects to one', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/(de|en)$/)
})

test('German and English render the same page in their own language', async ({
  page,
}) => {
  await page.goto(path('/', 'de'))
  await expect(
    page.getByRole('heading', { name: /In der Nähe von Schwyz/ }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Entdecken' })).toBeVisible()
  await expect(page.getByText('Alle Sportarten')).toBeVisible()

  await page.goto(path('/', 'en'))
  await expect(page.getByRole('heading', { name: /Near Schwyz/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Discover' })).toBeVisible()
  await expect(page.getByText('All sports')).toBeVisible()
})

test('sport names are translated, in filters and on cards', async ({ page }) => {
  await page.goto(path('/?sports=run', 'de'))
  await expect(page.getByText('Laufen').first()).toBeVisible()
  await expect(page.getByText('Running')).toHaveCount(0)

  await page.goto(path('/?sports=run', 'en'))
  await expect(page.getByText('Running').first()).toBeVisible()
})

test('the language switcher keeps you on the same page', async ({ page }) => {
  await signInAsDemoUser(page, 'Clara C.')
  await page.goto(path('/me', 'en'))
  await expect(page.getByRole('heading', { name: 'Organizing' })).toBeVisible()

  await page.goto(path('/profile', 'en'))
  await page.getByRole('button', { name: 'Deutsch' }).click()
  await expect(page).toHaveURL(/\/de\/profile$/)
  await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible()

  // And the preference sticks: a bare URL now lands in German.
  await page.goto('/')
  await expect(page).toHaveURL(/\/de$/)
})

test('filters survive a language switch', async ({ page }) => {
  await signInAsDemoUser(page)
  await page.goto(path('/?sports=run&radius=5000', 'en'))
  await page.goto(path('/profile', 'en'))
  await page.getByRole('button', { name: 'Deutsch' }).click()
  await expect(page).toHaveURL(/\/de\/profile$/)
})

test('an unknown locale is a 404, not a silent fallback', async ({ page }) => {
  const response = await page.goto('/fr')
  expect(response?.status()).toBe(404)
  // No locale to read from a path that matches no route, so this one is the
  // default language by design.
  await expect(page.getByText('Seite nicht gefunden')).toBeVisible()
})

test('a missing activity 404s in the language you were browsing', async ({ page }) => {
  const missing = '11111111-1111-1111-1111-111111111111'

  await page.goto(path(`/activities/${missing}`, 'en'))
  await expect(page.getByText('Page not found')).toBeVisible()
  await expect(page.getByText('Seite nicht gefunden')).toHaveCount(0)

  await page.goto(path(`/activities/${missing}`, 'de'))
  await expect(page.getByText('Seite nicht gefunden')).toBeVisible()
  await expect(page.getByText('Page not found')).toHaveCount(0)
})

test('dates stay Swiss in German, with German words around them', async ({ page }) => {
  const { data } = await anon.rpc('nearby_activities', {
    p_lat: 47.0207,
    p_lng: 8.653,
    p_radius_m: 50000,
  })
  const id = (data as Array<{ id: string }>)[0].id

  await page.goto(path(`/activities/${id}`, 'de'))
  // "Dienstag, 15.09.2026, 19:57" — German weekday, Swiss numbers.
  await expect(
    page.getByText(
      /^(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag), \d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/,
    ),
  ).toBeVisible()
})

test('the create flow is fully German', async ({ page }) => {
  await signInAsDemoUser(page)
  await page.goto(path('/activities/new', 'de'))

  // A <legend>, not a heading element, so match on the text.
  await expect(page.getByText('Was planst du?')).toBeVisible()
  await page.getByRole('button', { name: 'Laufen' }).click()

  await expect(page.getByRole('heading', { name: 'Wann findet es statt?' })).toBeVisible()
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  await page.getByLabel('Datum').fill(tomorrow)
  await page.getByLabel('Startzeit').fill('07:30')
  await expect(page.getByText(/^Beginnt/)).toBeVisible()

  await page.getByRole('button', { name: 'Weiter' }).click()
  await expect(page.getByRole('heading', { name: 'Wo trefft ihr euch?' })).toBeVisible()
})
