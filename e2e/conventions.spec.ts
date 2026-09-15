import { expect, test } from '@playwright/test'
import { anon, signInAsDemoUser } from './helpers'

/**
 * Two product rules that are easy to breach accidentally as screens are added:
 * Swiss date and time formatting, and the Strava brand terms. Both are checked
 * against rendered pages rather than source, since that is where they matter.
 */

const PAGES = ['/', '/me', '/profile', '/activities/new']

test('no page ever renders AM/PM or a month-first date', async ({ page }) => {
  await signInAsDemoUser(page, 'Anouk B.')

  const { data } = await anon.rpc('nearby_activities', {
    p_lat: 47.0207,
    p_lng: 8.653,
    p_radius_m: 50000,
  })
  const id = (data as Array<{ id: string }>)[0].id

  for (const path of [...PAGES, `/activities/${id}`]) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const text = await page.locator('body').innerText()

    // "19:57 PM" or "7:30 am" — a time followed by a meridiem marker.
    expect(text, `${path} renders a 12-hour time`).not.toMatch(
      /\d:\d{2}\s*[ap]\.?m\.?\b/i,
    )

    // MM/DD/YYYY or DD/MM/YYYY: Swiss dates use dots, never slashes.
    expect(text, `${path} renders a slash-separated date`).not.toMatch(
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
    )
  }
})

test('the detail page states the start time in Swiss format', async ({ page }) => {
  const { data } = await anon.rpc('nearby_activities', {
    p_lat: 47.0207,
    p_lng: 8.653,
    p_radius_m: 50000,
  })
  const id = (data as Array<{ id: string }>)[0].id

  await page.goto(`/activities/${id}`)
  // "Weekday, DD.MM.YYYY, HH:mm"
  await expect(page.getByText(/^\w+day, \d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/)).toBeVisible()
})

test('the create form prefills today and confirms the choice in Swiss format', async ({
  page,
}) => {
  await signInAsDemoUser(page)
  await page.goto('/activities/new')
  await page.getByRole('button', { name: 'Running' }).click()

  const today = new Date()
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  await expect(page.getByLabel('Date')).toHaveValue(iso)

  // Choosing a time echoes the full moment back unambiguously.
  await page.getByLabel('Start time').fill('18:30')
  await expect(page.getByText(/\d{2}\.\d{2}\.\d{4}, 18:30/)).toBeVisible()
})

test('Strava is referenced only in permitted, non-endorsing wording', async ({
  page,
}) => {
  await signInAsDemoUser(page, 'Mara K.')

  for (const path of PAGES) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const text = await page.locator('body').innerText()

    // "Verified" would imply Rundum vouched for the person.
    expect(text, `${path} uses the word "verified"`).not.toMatch(/\bverified\b/i)

    // Nothing may suggest this is an official Strava product. Note that
    // "not affiliated with, endorsed by, or sponsored by Strava" is the
    // required disclaimer, so "by Strava" on its own is not a violation.
    expect(text, `${path} claims to be an official Strava app`).not.toMatch(
      /official Strava|\bStrava (?:app|application)\b/i,
    )

    // Only two interoperability phrases are permitted. Any other "<verb> by
    // Strava" construction is a claim Strava has not granted.
    const interop = text.match(/\b\w+ (?:by|with) Strava\b/gi) ?? []
    for (const phrase of interop) {
      expect(
        ['Powered by Strava', 'Compatible with Strava', 'sponsored by Strava'],
        `${path} uses unpermitted wording "${phrase}"`,
      ).toContain(phrase)
    }
  }

  await page.goto('/profile')
  await expect(page.getByText(/Compatible with Strava/)).toBeVisible()
  await expect(
    page.getByText(/not affiliated with, endorsed by, or sponsored by Strava/),
  ).toBeVisible()
})

test('the Strava name is never more prominent than Rundum', async ({ page }) => {
  await page.goto('/profile')

  const wordmarkSize = await page
    .getByRole('heading', { name: 'Profile' })
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))

  const attribution = page.getByText(/Compatible with Strava/)
  const attributionSize = await attribution.evaluate((el) =>
    parseFloat(getComputedStyle(el).fontSize),
  )

  expect(attributionSize).toBeLessThan(wordmarkSize)
})
