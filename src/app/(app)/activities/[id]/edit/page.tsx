import { notFound, redirect } from 'next/navigation'
import { EditActivityForm } from '@/components/activity/edit-activity-form'
import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { isArchived } from '@/lib/format'
import { getActivityDetail } from '@/lib/queries/activity-detail'
import { getCurrentUserId } from '@/lib/supabase/server'

export const metadata = { title: 'Edit activity' }

export default async function EditActivityPage({
  params,
}: PageProps<'/activities/[id]/edit'>) {
  const { id } = await params
  const [activity, userId] = await Promise.all([
    getActivityDetail(id),
    getCurrentUserId(),
  ])

  if (!activity) notFound()

  // Same 404 for "not yours" as for "does not exist": confirming that someone
  // else's activity exists is a leak, however small.
  if (!userId || userId !== activity.ownerId) notFound()

  // A past activity cannot be edited — the schema requires a future start time,
  // so the form would be unsubmittable. Send them back rather than showing a
  // page that cannot succeed.
  if (isArchived(activity.startsAt)) redirect(`/activities/${id}`)

  return (
    <>
      <AppHeader
        title="Edit activity"
        back={{ href: `/activities/${id}`, label: 'Back to the activity' }}
      />
      <PageBody>
        <EditActivityForm activity={activity} />
      </PageBody>
    </>
  )
}
