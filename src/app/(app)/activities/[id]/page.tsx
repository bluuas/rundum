import { notFound } from 'next/navigation'
import {
  ArchivedBadge,
  SportBadge,
  StatusBadge,
  StravaConnectedBadge,
} from '@/components/activity/badges'
import { Comments } from '@/components/activity/comments'
import { OrganizerControls } from '@/components/activity/organizer-controls'
import { AreaMap } from '@/components/map/area-map'
import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { Button } from '@/components/ui/button'
import { formatParticipantLimit, formatStartFull, isArchived, isFull } from '@/lib/format'
import { formatActivityDistance, formatPace, formatRadius } from '@/lib/geo'
import { getActivityDetail, getComments } from '@/lib/queries/activity-detail'
import { LEVEL_LABELS, getSport, type Level } from '@/lib/sports'
import { getCurrentUserId } from '@/lib/supabase/server'

/** Matches the 250 m storage grid, so the circle is honest about the precision. */
const AREA_CIRCLE_RADIUS_M = 250

export async function generateMetadata({ params }: PageProps<'/activities/[id]'>) {
  const { id } = await params
  const activity = await getActivityDetail(id)
  return { title: activity?.title ?? 'Activity' }
}

export default async function ActivityDetailPage({
  params,
}: PageProps<'/activities/[id]'>) {
  const { id } = await params

  const [activity, userId] = await Promise.all([
    getActivityDetail(id),
    getCurrentUserId(),
  ])

  // RLS returns no row both for "does not exist" and for "not visible to you".
  // Rendering the same 404 for both is intentional.
  if (!activity) notFound()

  const comments = await getComments(id)
  const archived = isArchived(activity.startsAt)
  const sport = getSport(activity.sportKey)
  const isOwner = userId === activity.ownerId
  const full = isFull(activity.participantCount, activity.maxParticipants)

  const facts = [
    formatActivityDistance(activity.distanceM),
    formatPace(activity.paceSecondsPerKm),
    activity.level ? LEVEL_LABELS[activity.level as Level] : null,
  ].filter(Boolean)

  return (
    <>
      <AppHeader title={sport.label} back={{ href: '/', label: 'Back to discover' }} />
      <PageBody className="space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <SportBadge sportKey={activity.sportKey} />
            <StatusBadge status={activity.status} />
            {archived ? <ArchivedBadge /> : null}
          </div>

          <h1 className="text-fg text-2xl leading-tight font-bold tracking-tight">
            {activity.title}
          </h1>

          <p className="text-fg-muted text-sm">{formatStartFull(activity.startsAt)}</p>
        </div>

        {activity.status === 'cancelled' ? (
          <p
            role="alert"
            className="bg-danger-soft text-danger rounded-card px-4 py-3 text-sm font-medium"
          >
            This activity was cancelled by the organizer.
          </p>
        ) : null}

        {archived && activity.status !== 'cancelled' ? (
          <p className="bg-surface-muted text-fg-muted rounded-card px-4 py-3 text-sm">
            This activity has already taken place.
          </p>
        ) : null}

        {activity.description ? (
          <p className="text-fg text-sm leading-relaxed whitespace-pre-wrap">
            {activity.description}
          </p>
        ) : null}

        {facts.length > 0 ? (
          <dl className="border-border bg-surface rounded-card divide-border divide-y border text-sm">
            {formatActivityDistance(activity.distanceM) ? (
              <Row label="Distance" value={formatActivityDistance(activity.distanceM)!} />
            ) : null}
            {formatPace(activity.paceSecondsPerKm) ? (
              <Row label="Pace" value={formatPace(activity.paceSecondsPerKm)!} />
            ) : null}
            {activity.level ? (
              <Row label="Level" value={LEVEL_LABELS[activity.level as Level]} />
            ) : null}
          </dl>
        ) : null}

        <section className="space-y-2">
          <h2 className="text-fg text-base font-semibold">Where</h2>
          <AreaMap
            center={{ lat: activity.lat, lng: activity.lng }}
            areaRadiusM={AREA_CIRCLE_RADIUS_M}
            interactive={false}
            zoom={14}
            className="h-48"
          />
          <p className="text-fg text-sm font-medium">{activity.locationLabel}</p>
          <p className="text-fg-subtle text-xs">
            Approximate meeting area. The organizer shares the exact spot with people they
            accept.
          </p>
          {isOwner ? (
            <p className="text-fg-subtle text-xs">
              Discoverable within {formatRadius(activity.visibilityRadiusM)}.
            </p>
          ) : null}
        </section>

        <section className="space-y-3">
          <h2 className="text-fg text-base font-semibold">Organizer</h2>
          <div className="border-border bg-surface rounded-card flex items-center gap-3 border p-3">
            <span
              aria-hidden
              className="bg-brand-soft text-brand-soft-fg flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold"
            >
              {activity.owner.displayName.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="text-fg truncate text-sm font-medium">
                {activity.owner.displayName}
              </p>
              {activity.owner.stravaConnected ? <StravaConnectedBadge /> : null}
              {activity.owner.bio ? (
                <p className="text-fg-muted mt-1 text-xs">{activity.owner.bio}</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-fg text-base font-semibold">Participants</h2>
            <p className="text-fg-muted text-sm">
              {formatParticipantLimit(
                activity.participantCount,
                activity.maxParticipants,
              )}
            </p>
          </div>

          {isOwner ? (
            <p className="text-fg-muted text-sm">
              You are organizing this. Approving requests arrives in the next step.
            </p>
          ) : (
            <>
              <Button fullWidth size="lg" disabled>
                {archived || activity.status === 'cancelled'
                  ? 'No longer open'
                  : full
                    ? 'Full'
                    : 'Request to join'}
              </Button>
              <p className="text-fg-subtle text-center text-xs">
                Join requests arrive in the next step.
              </p>
            </>
          )}
        </section>

        {isOwner ? (
          <OrganizerControls
            activityId={activity.id}
            status={activity.status}
            archived={archived}
          />
        ) : null}

        <Comments
          activityId={activity.id}
          comments={comments}
          currentUserId={userId}
          activityOwnerId={activity.ownerId}
        />
      </PageBody>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="text-fg font-medium">{value}</dd>
    </div>
  )
}
