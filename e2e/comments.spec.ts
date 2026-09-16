import { expect, test } from '@playwright/test'
import { anon, signInAsDemoUser, path } from './helpers'

async function firstActivityId() {
  const { data } = await anon.rpc('nearby_activities', {
    p_lat: 47.0207,
    p_lng: 8.653,
    p_radius_m: 50000,
  })
  const rows = data as Array<{ id: string }>
  if (!rows?.length) throw new Error('No activities found. Run `npm run db:seed`.')
  return rows[0].id
}

test('a signed-in user can post and delete their own comment', async ({ page }) => {
  await signInAsDemoUser(page)
  const id = await firstActivityId()
  const body = `End-to-end comment ${Date.now()}`

  await page.goto(path(`/activities/${id}`))

  const box = page.getByPlaceholder('Ask a question, or say you are coming')
  await box.fill(body)
  await page.getByRole('button', { name: 'Post comment' }).click()

  // Scoped to the comment list: an unscoped text match would also hit the
  // textarea, whose DOM text node lingers after React clears its value.
  const posted = page.locator('li').filter({ hasText: body })
  await expect(posted).toHaveCount(1)

  // The box is cleared, ready for the next comment.
  await expect(box).toHaveValue('')

  // Survives a reload, so it really was persisted rather than only optimistic.
  await page.reload()
  await expect(page.locator('li').filter({ hasText: body })).toHaveCount(1)

  // The author can delete their own comment; it is a soft delete in the
  // database but disappears from the page entirely.
  await page
    .locator('li')
    .filter({ hasText: body })
    .getByRole('button', { name: 'Delete' })
    .click()
  await expect(page.locator('li').filter({ hasText: body })).toHaveCount(0)

  await page.reload()
  await expect(page.locator('li').filter({ hasText: body })).toHaveCount(0)
})

test('a signed-out visitor can read comments but not post', async ({ page }) => {
  const id = await firstActivityId()
  await page.goto(path(`/activities/${id}`))

  await expect(page.getByRole('heading', { name: /Comments/ })).toBeVisible()
  await expect(page.getByText('Sign in to join the conversation.')).toBeVisible()
  await expect(
    page.getByPlaceholder('Ask a question, or say you are coming'),
  ).toHaveCount(0)
})

test("the organizer can remove someone else's comment, but a bystander cannot", async ({
  page,
}) => {
  // Find an activity and comment on it as someone who is not the organizer.
  const { data } = await anon.rpc('nearby_activities', {
    p_lat: 47.0207,
    p_lng: 8.653,
    p_radius_m: 50000,
  })
  const activity = (
    data as Array<{ id: string; owner_id: string; owner_display_name: string }>
  )[0]

  const { data: others } = await anon
    .from('profiles')
    .select('display_name')
    .neq('id', activity.owner_id)
    .order('display_name')
    .limit(1)

  const commenterName = others![0].display_name
  const body = `Moderation test ${Date.now()}`

  await signInAsDemoUser(page, commenterName)
  await page.goto(path(`/activities/${activity.id}`))
  await page.getByPlaceholder('Ask a question, or say you are coming').fill(body)
  await page.getByRole('button', { name: 'Post comment' }).click()
  await expect(page.locator('li').filter({ hasText: body })).toHaveCount(1)

  // A third party sees the comment but is offered no way to remove it.
  // Ordered, because an unordered limit(1) returns whichever row Postgres
  // reaches first — which changes as rows are updated, so the test would be
  // asking about a different person from one run to the next.
  const { data: bystanders } = await anon
    .from('profiles')
    .select('display_name')
    .neq('id', activity.owner_id)
    .neq('display_name', commenterName)
    .order('display_name')
    .limit(1)

  await signInAsDemoUser(page, bystanders![0].display_name)
  await page.goto(path(`/activities/${activity.id}`))
  const asBystander = page.locator('li').filter({ hasText: body })
  await expect(asBystander).toHaveCount(1)
  // No removal — not "no buttons". Reporting somebody else's comment is
  // offered to everyone signed in, and is the point of the moderation work.
  await expect(asBystander.getByRole('button', { name: /Remove|Delete/ })).toHaveCount(0)
  await expect(
    asBystander.getByRole('button', { name: 'Report this comment' }),
  ).toHaveCount(1)

  // The organizer can moderate it.
  await signInAsDemoUser(page, activity.owner_display_name)
  await page.goto(path(`/activities/${activity.id}`))
  const asOwner = page.locator('li').filter({ hasText: body })
  await asOwner.getByRole('button', { name: 'Remove as organizer' }).click()
  await expect(page.locator('li').filter({ hasText: body })).toHaveCount(0)

  await page.reload()
  await expect(page.locator('li').filter({ hasText: body })).toHaveCount(0)
})
