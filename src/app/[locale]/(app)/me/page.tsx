import { ActivityListItem } from '@/components/activity/activity-list-item'
import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { EmptyState } from '@/components/ui/states'
import { getDictionary } from '@/lib/i18n'
import { localeHref, type Locale } from '@/lib/i18n/config'
import { getMyActivities, type MyActivity } from '@/lib/queries/my-activities'
import { getCurrentUserId } from '@/lib/supabase/server'

export async function generateMetadata({ params }: PageProps<'/[locale]/me'>) {
  const { locale } = await params
  return { title: getDictionary(locale as Locale).mine.title }
}

export default async function MyActivitiesPage({ params }: PageProps<'/[locale]/me'>) {
  const { locale } = await params
  const t = getDictionary(locale as Locale)
  const userId = await getCurrentUserId()

  if (!userId) {
    return (
      <>
        <AppHeader locale={locale as Locale} title={t.mine.title} />
        <PageBody>
          <EmptyState
            icon="👤"
            title={t.mine.signInTitle}
            description={t.mine.signInBody}
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
      <AppHeader locale={locale as Locale} title={t.mine.title} />
      <PageBody className="space-y-6">
        {!hasAnything ? (
          <EmptyState
            icon="📋"
            title={t.mine.emptyTitle}
            description={t.mine.emptyBody}
            action={{
              label: t.mine.emptyCta,
              href: localeHref(locale as Locale, '/activities/new'),
            }}
          />
        ) : null}

        <Section
          title={t.mine.organizing}
          activities={organizingUpcoming}
          role="organizer"
        />
        <Section title={t.mine.joined} activities={joinedUpcoming} role="participant" />
        <Section
          title={t.mine.past}
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
