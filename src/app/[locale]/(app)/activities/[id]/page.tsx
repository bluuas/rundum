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
import { formatStartFull, isArchived, isFull } from '@/lib/format'
import { formatActivityDistance, formatPace, formatRadius } from '@/lib/geo'
import { fill, getDictionary } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/config'
import { getActivityDetail, getComments } from '@/lib/queries/activity-detail'
import { isSportKey, type Level } from '@/lib/sports'
import { getCurrentUserId } from '@/lib/supabase/server'

/** Matches the 250 m storage grid, so the circle is honest about the precision. */
const AREA_CIRCLE_RADIUS_M = 250

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/activities/[id]'>) {
  const { id } = await params
  const activity = await getActivityDetail(id)
  return { title: activity?.title ?? 'Activity' }
}

export default async function ActivityDetailPage({
  params,
}: PageProps<'/[locale]/activities/[id]'>) {
  const { id, locale } = await params
  const t = getDictionary(locale as Locale)

  const [activity, userId] = await Promise.all([
    getActivityDetail(id),
    getCurrentUserId(),
  ])

  // RLS returns no row both for "does not exist" and for "not visible to you".
  // Rendering the same 404 for both is intentional.
  if (!activity) notFound()

  const comments = await getComments(id)
  const archived = isArchived(activity.startsAt)
  const full = isFull(activity.participantCount, activity.maxParticipants)
  const isOwner = userId === activity.ownerId

  const sportLabel = isSportKey(activity.sportKey)
    ? t.sports[activity.sportKey]
    : activity.sportKey

  const distance = formatActivityDistance(activity.distanceM)
  const pace = formatPace(activity.paceSecondsPerKm)
  const hasFacts = Boolean(distance || pace || activity.level)

  return (
    <>
      <AppHeader
        locale={locale as Locale}
        title={sportLabel}
        back={{ href: '/', label: t.states.backToDiscover }}
      />
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

          <p className="text-fg-muted text-sm">
            {formatStartFull(activity.startsAt, locale as Locale)}
          </p>
        </div>

        {activity.status === 'cancelled' ? (
          <p
            role="alert"
            className="bg-danger-soft text-danger rounded-card px-4 py-3 text-sm font-medium"
          >
            {t.detail.cancelledNotice}
          </p>
        ) : null}

        {archived && activity.status !== 'cancelled' ? (
          <p className="bg-surface-muted text-fg-muted rounded-card px-4 py-3 text-sm">
            {t.detail.archivedNotice}
          </p>
        ) : null}

        {activity.description ? (
          <p className="text-fg text-sm leading-relaxed whitespace-pre-wrap">
            {activity.description}
          </p>
        ) : null}

        {hasFacts ? (
          <dl className="border-border bg-surface rounded-card divide-border divide-y border text-sm">
            {distance ? <Row label={t.detail.distance} value={distance} /> : null}
            {pace ? <Row label={t.detail.pace} value={pace} /> : null}
            {activity.level ? (
              <Row label={t.detail.level} value={t.levels[activity.level as Level]} />
            ) : null}
          </dl>
        ) : null}

        <section className="space-y-2">
          <h2 className="text-fg text-base font-semibold">{t.detail.where}</h2>
          <AreaMap
            center={{ lat: activity.lat, lng: activity.lng }}
            areaRadiusM={AREA_CIRCLE_RADIUS_M}
            interactive={false}
            zoom={14}
            className="h-48"
          />
          <p className="text-fg text-sm font-medium">{activity.locationLabel}</p>
          <p className="text-fg-subtle text-xs">{t.detail.approximateNote}</p>
          {isOwner ? (
            <p className="text-fg-subtle text-xs">
              {fill(t.detail.discoverableWithin, {
                radius: formatRadius(activity.visibilityRadiusM),
              })}
            </p>
          ) : null}
        </section>

        <section className="space-y-3">
          <h2 className="text-fg text-base font-semibold">{t.detail.organizerHeading}</h2>
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
            <h2 className="text-fg text-base font-semibold">{t.detail.participants}</h2>
            <p className="text-fg-muted text-sm">
              {activity.maxParticipants === null
                ? fill(t.activity.noLimit, { count: activity.participantCount })
                : fill(t.activity.ofMax, {
                    count: activity.participantCount,
                    max: activity.maxParticipants,
                  })}
            </p>
          </div>

          {isOwner ? (
            <p className="text-fg-muted text-sm">{t.detail.youOrganize}</p>
          ) : (
            <>
              <Button fullWidth size="lg" disabled>
                {archived || activity.status === 'cancelled'
                  ? t.detail.noLongerOpen
                  : full
                    ? t.activity.full
                    : t.detail.requestToJoin}
              </Button>
              <p className="text-fg-subtle text-center text-xs">
                {t.detail.joinComingSoon}
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
