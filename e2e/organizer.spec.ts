import { expect, test } from '@playwright/test'
import { anon, signInAsDemoUser } from './helpers'

/** Creates an activity through the UI and returns its id, so each test is self-contained. */
async function createActivity(page: import('@playwright/test').Page, title: string) {
  await page.goto('/activities/new')
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

test('an organizer can edit their activity', async ({ page }) => {
  await signInAsDemoUser(page)
  const title = `Editable ${Date.now()}`
  const id = await createActivity(page, title)

  await page.getByRole('link', { name: 'Edit details' }).click()
  await page.waitForURL(`**/activities/${id}/edit`)

  const newTitle = `${title} (edited)`
  await page.getByLabel('Title').fill(newTitle)
  await page.getByLabel('Description').fill('Now with a description.')
  await page.getByLabel('Distance').fill('12')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await page.waitForURL(`**/activities/${id}`)
  await expect(page.getByRole('heading', { name: newTitle })).toBeVisible()
  await expect(page.getByText('Now with a description.')).toBeVisible()
  await expect(page.getByText('12 km')).toBeVisible()

  // Clean up so repeated runs do not fill the feed with test data.
  await page.getByRole('button', { name: 'Delete activity' }).click()
  await page.getByRole('button', { name: 'Yes, delete it' }).click()
  await page.waitForURL('**/me')
})

test('an organizer can hide, publish, cancel and reinstate', async ({ page }) => {
  await signInAsDemoUser(page)
  const title = `Statuses ${Date.now()}`
  const id = await createActivity(page, title)

  // Hide, and confirm it leaves the public feed.
  await page.getByRole('button', { name: 'Hide from discovery' }).click()
  await expect(
    page.getByText('This activity is hidden. Only you can see it.'),
  ).toBeVisible()

  const { data: hidden } = await anon.rpc('nearby_activities', {
    p_lat: 47.0207,
    p_lng: 8.653,
    p_radius_m: 50000,
  })
  expect((hidden as Array<{ id: string }>).some((row) => row.id === id)).toBe(false)

  await page.getByRole('button', { name: 'Publish again' }).click()
  await expect(page.getByRole('button', { name: 'Hide from discovery' })).toBeVisible()

  // Cancelling is confirmed, not immediate.
  await page.getByRole('button', { name: 'Cancel activity' }).click()
  await expect(
    page.getByText(/Everyone who joined will see it as cancelled/),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Yes, cancel it' }).click()
  await expect(
    page.getByText('This activity was cancelled by the organizer.'),
  ).toBeVisible()

  // A cancelled activity stays readable but drops out of discovery.
  const { data: afterCancel } = await anon.rpc('nearby_activities', {
    p_lat: 47.0207,
    p_lng: 8.653,
    p_radius_m: 50000,
  })
  expect((afterCancel as Array<{ id: string }>).some((row) => row.id === id)).toBe(false)

  await page.getByRole('button', { name: 'Reinstate activity' }).click()
  await expect(
    page.getByText('This activity was cancelled by the organizer.'),
  ).toHaveCount(0)

  await page.getByRole('button', { name: 'Delete activity' }).click()
  await page.getByRole('button', { name: 'Yes, delete it' }).click()
  await page.waitForURL('**/me')
})

test('someone else cannot reach the edit page or see organizer tools', async ({
  page,
}) => {
  const { data } = await anon.rpc('nearby_activities', {
    p_lat: 47.0207,
    p_lng: 8.653,
    p_radius_m: 50000,
  })
  const activity = (data as Array<{ id: string; owner_id: string }>)[0]

  const { data: others } = await anon
    .from('profiles')
    .select('display_name')
    .neq('id', activity.owner_id)
    .limit(1)

  await signInAsDemoUser(page, others![0].display_name)

  await page.goto(`/activities/${activity.id}`)
  await expect(page.getByText('Organizer tools')).toHaveCount(0)

  // The edit route 404s rather than admitting the activity exists but is not theirs.
  await page.goto(`/activities/${activity.id}/edit`)
  await expect(page.getByText('Page not found')).toBeVisible()
})

test('an activity can be created with no participant limit', async ({ page }) => {
  await signInAsDemoUser(page)
  const title = `Unlimited ${Date.now()}`

  await page.goto('/activities/new')
  await page.getByRole('button', { name: 'Running' }).click()
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  await page.getByLabel('Date').fill(tomorrow)
  await page.getByLabel('Start time').fill('07:30')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Name this area').fill('Hauptplatz Schwyz')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Title').fill(title)

  // The number input disappears once there is no limit to enter.
  await expect(page.getByLabel('Maximum participants')).toBeVisible()
  await page.getByLabel('No limit — anyone can join').check()
  await expect(page.getByLabel('Maximum participants')).toHaveCount(0)

  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('No limit')).toBeVisible()
  await page.getByRole('button', { name: 'Publish activity' }).click()

  await page.waitForURL(/\/activities\/[0-9a-f-]{36}$/)
  const url = page.url()

  // No denominator anywhere, and the join button never reads "Full".
  await expect(page.getByText('0 joined · no limit')).toBeVisible()

  await page.goto('/?sports=run')
  const card = page.getByRole('link').filter({ hasText: title })
  await expect(card).toContainText('0 joined')
  await expect(card).not.toContainText('/')

  // The limit can be reinstated by editing.
  await page.goto(`${url}/edit`)
  await page.getByLabel('No limit — anyone can join').uncheck()
  await page.getByLabel('Maximum participants').fill('8')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.waitForURL(url)
  await expect(page.getByText('0 of 8')).toBeVisible()

  await page.getByRole('button', { name: 'Delete activity' }).click()
  await page.getByRole('button', { name: 'Yes, delete it' }).click()
  await page.waitForURL('**/me')
})
