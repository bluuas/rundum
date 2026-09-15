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
      {/* Tight: each section header carries its own padding, and folded
          headers should read as a short list rather than drift apart. */}
      <PageBody className="space-y-2">
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
          defaultOpen
        />
        <Section
          title={t.mine.joined}
          activities={joinedUpcoming}
          role="participant"
          defaultOpen
        />
        {/* Past starts folded: it is the archive, and it is the section that
            grows without bound. */}
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

/**
 * One foldable group of activities.
 *
 * A native `<details>`, so folding works before hydration and needs no client
 * component. The count stays in the header because it is the only thing left
 * to read once the section is closed.
 */
function Section({
  title,
  activities,
  role,
  muted,
  defaultOpen,
}: {
  title: string
  activities: MyActivity[]
  role: 'organizer' | 'participant'
  muted?: boolean
  defaultOpen?: boolean
}) {
  if (activities.length === 0) return null

  return (
    <details className="group" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center gap-2 py-3 select-none">
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="text-fg-subtle size-4 shrink-0 transition-transform group-open:rotate-90"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 3 5 5-5 5" />
        </svg>
        <h2 className="text-fg text-base font-semibold">{title}</h2>
        <span className="text-fg-subtle ml-auto text-xs">{activities.length}</span>
      </summary>
      <div
        className={muted ? 'divide-border divide-y opacity-70' : 'divide-border divide-y'}
      >
        {activities.map((activity) => (
          <ActivityListItem key={activity.id} activity={activity} role={role} />
        ))}
      </div>
    </details>
  )
}
