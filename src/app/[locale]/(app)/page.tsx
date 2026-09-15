import { Suspense } from 'react'
import { ActivityCard } from '@/components/activity/activity-card'
import { FilterBar } from '@/components/activity/filter-bar'
import { SortControl } from '@/components/activity/sort-control'
import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { ActivityListSkeleton, EmptyState, ErrorState } from '@/components/ui/states'
import { hasActiveFilters, parseFilters } from '@/lib/filters'
import { formatRadius } from '@/lib/geo'
import { fill, getDictionary, plural, type Dictionary } from '@/lib/i18n'
import { localeHref, type Locale } from '@/lib/i18n/config'
import { getNearbyActivities } from '@/lib/queries/activities'

/** Launch city. Comes from the `cities` table once more than one exists. */
const CITY = 'Schwyz'

export default async function FeedPage({ params, searchParams }: PageProps<'/[locale]'>) {
  const { locale } = await params
  const query = await searchParams
  const filters = parseFilters(query)
  const t = getDictionary(locale as Locale)

  return (
    <>
      <AppHeader locale={locale as Locale} />
      <PageBody className="space-y-4">
        <div>
          <h1 className="text-fg text-xl font-bold tracking-tight">
            {fill(t.feed.title, { city: CITY })}
          </h1>
          <p className="text-fg-muted mt-0.5 text-sm">
            {fill(t.feed.subtitle, { radius: formatRadius(filters.radiusM) })}
          </p>
        </div>

        <FilterBar filters={filters} />

        {/*
          Suspense keyed on the filters so changing one shows the skeleton
          again rather than freezing the previous results.
        */}
        <Suspense
          key={JSON.stringify(query)}
          fallback={<ActivityListSkeleton label={t.states.loadingActivities} />}
        >
          <FeedResults filters={filters} locale={locale as Locale} t={t} />
        </Suspense>
      </PageBody>
    </>
  )
}

async function FeedResults({
  filters,
  locale,
  t,
}: {
  filters: ReturnType<typeof parseFilters>
  locale: Locale
  t: Dictionary
}) {
  const { activities, error } = await getNearbyActivities(filters)

  if (error) {
    return <ErrorState title={t.feed.loadErrorTitle} description={t.feed.loadErrorBody} />
  }

  if (activities.length === 0) {
    // The empty state is a funnel, not a dead end: creating an activity is the
    // metric this product is judged on.
    const sportKey = filters.sports.length === 1 ? filters.sports[0] : null

    return (
      <EmptyState
        icon="🏔️"
        title={
          sportKey
            ? fill(t.feed.emptySportTitle, { sport: t.sports[sportKey], city: CITY })
            : fill(t.feed.emptyTitle, { city: CITY })
        }
        description={
          hasActiveFilters(filters) ? t.feed.emptyFiltered : t.feed.emptyUnfiltered
        }
        action={{
          label: t.feed.createCta,
          href: localeHref(locale, '/activities/new'),
        }}
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-fg-subtle text-xs" aria-live="polite">
          {plural(activities.length, { one: t.feed.countOne, other: t.feed.countOther })}
        </p>
        <SortControl filters={filters} />
      </div>
      {/*
        divide-y rather than a border on each card: the rule belongs between
        two entries, and a border-bottom would leave one hanging under the last.
      */}
      <div className="divide-border divide-y">
        {activities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  )
}
