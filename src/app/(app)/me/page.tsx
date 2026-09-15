import { ActivityListItem } from '@/components/activity/activity-list-item'
import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { EmptyState } from '@/components/ui/states'
import { getMyActivities, type MyActivity } from '@/lib/queries/my-activities'
import { getCurrentUserId } from '@/lib/supabase/server'

export const metadata = { title: 'My activities' }

export default async function MyActivitiesPage() {
  const userId = await getCurrentUserId()

  if (!userId) {
    return (
      <>
        <AppHeader title="My activities" />
        <PageBody>
          <EmptyState
            icon="👤"
            title="Sign in to see your activities"
            description="Everything you organize or join collects here."
          />
        </PageBody>
      </>
    )
  }

  const { organizingUpcoming, organizingPast, joinedUpcoming, joinedPast } =
    await getMyActivities(userId)

  const hasAnything =
    organizingUpcoming.length +
      organizingPast.length +
      joinedUpcoming.length +
      joinedPast.length >
    0

  return (
    <>
      <AppHeader title="My activities" />
      <PageBody className="space-y-6">
        {!hasAnything ? (
          <EmptyState
            icon="📋"
            title="Nothing here yet"
            description="Activities you organize and ones you have joined will show up here."
            action={{ label: 'Create your first activity', href: '/activities/new' }}
          />
        ) : null}

        <Section title="Organizing" activities={organizingUpcoming} role="organizer" />
        <Section title="Joined" activities={joinedUpcoming} role="participant" />
        <Section
          title="Past"
          activities={[...organizingPast, ...joinedPast]}
          role="organizer"
          muted
        />
      </PageBody>
    </>
  )
}

function Section({
  title,
  activities,
  role,
  muted,
}: {
  title: string
  activities: MyActivity[]
  role: 'organizer' | 'participant'
  muted?: boolean
}) {
  if (activities.length === 0) return null

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-fg text-base font-semibold">{title}</h2>
        <span className="text-fg-subtle text-xs">{activities.length}</span>
      </div>
      <div className={muted ? 'space-y-3 opacity-70' : 'space-y-3'}>
        {activities.map((activity) => (
          <ActivityListItem key={activity.id} activity={activity} role={role} />
        ))}
      </div>
    </section>
  )
}
