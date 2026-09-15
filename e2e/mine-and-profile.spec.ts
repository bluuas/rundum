import { expect, test } from '@playwright/test'
import { signInAsDemoUser, path } from './helpers'

test('My activities lists what you organize', async ({ page }) => {
  // Anouk organizes several seeded activities.
  await signInAsDemoUser(page, 'Anouk B.')
  await page.goto(path('/me'))

  await expect(page.getByRole('heading', { name: 'Organizing' })).toBeVisible()
  await expect(page.getByRole('link').filter({ hasText: 'After-work 5k' })).toBeVisible()

  // Clicking through reaches the activity.
  await page.getByRole('link').filter({ hasText: 'After-work 5k' }).first().click()
  await page.waitForURL(/\/activities\/[0-9a-f-]{36}$/)
})

test('My activities prompts a signed-out visitor to sign in', async ({ page }) => {
  await page.goto(path('/me'))
  await expect(page.getByText('Sign in to see your activities')).toBeVisible()
})

test('Profile shows the signed-in user and can sign out', async ({ page }) => {
  await signInAsDemoUser(page, 'Mara K.')
  await page.goto(path('/profile'))

  await expect(page.getByRole('heading', { name: 'Mara K.' })).toBeVisible()
  await expect(page.getByText('Trail runner. Happiest above 1500 m.')).toBeVisible()
  await expect(page.getByText('Strava-connected')).toBeVisible()
  await expect(page.getByText('Schwyz')).toBeVisible()
  await expect(page.getByText('Your location privacy')).toBeVisible()

  // Back to the feed in the language you were reading, not wherever the
  // preference cookie happens to point.
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForURL(/\/en$/)

  await page.goto(path('/profile'))
  await expect(page.getByText('Not signed in')).toBeVisible()
})

test('a user without Strava is not labelled as connected', async ({ page }) => {
  // Anouk B. is seeded without a Strava connection.
  await signInAsDemoUser(page, 'Anouk B.')
  await page.goto(path('/profile'))

  await expect(page.getByText('Not connected to Strava')).toBeVisible()
  await expect(page.getByText('Strava-connected')).toHaveCount(0)
})
