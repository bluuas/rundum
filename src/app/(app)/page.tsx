import { Suspense } from 'react'
import { ActivityCard } from '@/components/activity/activity-card'
import { FilterBar } from '@/components/activity/filter-bar'
import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { ActivityListSkeleton, EmptyState, ErrorState } from '@/components/ui/states'
import { hasActiveFilters, parseFilters } from '@/lib/filters'
import { formatRadius } from '@/lib/geo'
import { getNearbyActivities } from '@/lib/queries/activities'
import { SPORTS } from '@/lib/sports'

export default async function FeedPage({ searchParams }: PageProps<'/'>) {
  const params = await searchParams
  const filters = parseFilters(params)

  return (
    <>
      <AppHeader />
      <PageBody className="space-y-4">
        <div>
          <h1 className="text-fg text-xl font-bold tracking-tight">Near Schwyz</h1>
          <p className="text-fg-muted mt-0.5 text-sm">
            Upcoming activities within {formatRadius(filters.radiusM)}
          </p>
        </div>

        <FilterBar filters={filters} />

        {/*
          Suspense keyed on the filters so changing one shows the skeleton
          again rather than freezing the previous results.
        */}
        <Suspense key={JSON.stringify(params)} fallback={<ActivityListSkeleton />}>
          <FeedResults filters={filters} />
        </Suspense>
      </PageBody>
    </>
  )
}

async function FeedResults({ filters }: { filters: ReturnType<typeof parseFilters> }) {
  const { activities, error } = await getNearbyActivities(filters)

  if (error) {
    return (
      <ErrorState
        title="Could not load activities"
        description="The feed is temporarily unavailable. Pull down to refresh, or try again shortly."
      />
    )
  }

  if (activities.length === 0) {
    // The empty state is a funnel, not a dead end: creating an activity is the
    // metric this product is judged on.
    const sportLabel =
      filters.sports.length === 1
        ? SPORTS.find((sport) => sport.key === filters.sports[0])?.label.toLowerCase()
        : null

    return (
      <EmptyState
        icon="🏔️"
        title={
          sportLabel
            ? `No ${sportLabel} near Schwyz yet`
            : 'Nothing planned near Schwyz yet'
        }
        description={
          hasActiveFilters(filters)
            ? 'Try a wider radius or a different date — or be the first to plan one.'
            : 'Be the first to put something on the map. It takes about a minute.'
        }
        action={{ label: 'Create an activity', href: '/activities/new' }}
      />
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-fg-subtle text-xs" aria-live="polite">
        {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
      </p>
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  )
}
