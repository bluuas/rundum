import { expect, test } from '@playwright/test'
import { anon } from './helpers'

/**
 * Rundum is mobile-first, so layout regressions at phone width are functional
 * bugs, not cosmetic ones. A horizontally scrolling page on a phone is the most
 * common and most avoidable of them.
 */
const NARROW = { width: 360, height: 780 }

test('no screen scrolls horizontally at 360px', async ({ page }) => {
  await page.setViewportSize(NARROW)

  const { data } = await anon.rpc('nearby_activities', {
    p_lat: 47.0207,
    p_lng: 8.653,
    p_radius_m: 50000,
  })
  const id = (data as Array<{ id: string }>)[0].id

  for (const path of [
    '/',
    '/?sports=run&radius=5000',
    '/activities/new',
    `/activities/${id}`,
    '/me',
    '/profile',
  ]) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(
      overflow,
      `${path} overflows horizontally by ${overflow}px`,
    ).toBeLessThanOrEqual(1)
  }
})

test('primary tap targets are at least 44px tall', async ({ page }) => {
  await page.setViewportSize(NARROW)
  await page.goto('/')

  const navLinks = page.getByRole('navigation', { name: 'Main' }).getByRole('link')
  const count = await navLinks.count()
  expect(count).toBeGreaterThan(0)

  for (let i = 0; i < count; i++) {
    const box = await navLinks.nth(i).boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }
})

test('the bottom nav stays reachable and marks the current tab', async ({ page }) => {
  await page.setViewportSize(NARROW)
  await page.goto('/')

  const nav = page.getByRole('navigation', { name: 'Main' })
  await expect(nav.getByRole('link', { name: 'Discover' })).toHaveAttribute(
    'aria-current',
    'page',
  )

  await nav.getByRole('link', { name: 'Create' }).click()
  await page.waitForURL('**/activities/new')
  await expect(nav.getByRole('link', { name: 'Create' })).toHaveAttribute(
    'aria-current',
    'page',
  )
})
