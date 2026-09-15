import { notFound } from 'next/navigation'
import {
  ArchivedBadge,
  SportBadge,
  StatusBadge,
  StravaConnectedBadge,
} from '@/components/activity/badges'
import { Comments } from '@/components/activity/comments'
import { JoinPanel } from '@/components/activity/join-panel'
import { OrganizerControls } from '@/components/activity/organizer-controls'
import { Roster } from '@/components/activity/roster'
import { BlockButton } from '@/components/moderation/block-button'
import { ReportPanel } from '@/components/moderation/report-panel'
import { AreaMap } from '@/components/map/area-map'
import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { formatStartFull, isArchived, isFull } from '@/lib/format'
import { formatActivityDistance, formatPace, formatRadius } from '@/lib/geo'
import { fill, getDictionary } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/config'
import {
  getActivityDetail,
  getComments,
  getMyJoinRequest,
  getRoster,
} from '@/lib/queries/activity-detail'
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

  const archived = isArchived(activity.startsAt)
  const full = isFull(activity.participantCount, activity.maxParticipants)
  const isOwner = userId === activity.ownerId

  // The roster RPC and the join-request read both return nothing for a signed
  // out viewer, so they are safe to run unconditionally — but skipping them
  // saves two round trips on the most common anonymous page view.
  const [comments, roster, myRequestStatus] = await Promise.all([
    getComments(id),
    userId ? getRoster(id) : Promise.resolve([]),
    userId && !isOwner ? getMyJoinRequest(id, userId) : Promise.resolve(null),
  ])

  // Requests are only meaningful while the activity is still going to happen.
  const openForRequests = !archived && activity.status === 'published'

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

        <section className="space-y-3">
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
            <JoinPanel
              activityId={activity.id}
              status={myRequestStatus}
              signedIn={userId !== null}
              open={openForRequests}
              full={full}
            />
          )}

          <Roster
            activityId={activity.id}
            entries={roster}
            isOwner={isOwner}
            currentUserId={userId}
            full={full}
          />
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

        {/*
          Below the comments, not beside the join button: reporting is rare and
          should not compete with the thing the page exists for. Absent for the
          organizer, who has the moderation tools instead, and for signed-out
          visitors, who have no account to report from.
        */}
        {userId && !isOwner ? (
          <section className="space-y-2 pt-2">
            <h2 className="text-fg-muted text-sm font-semibold">
              {t.moderation.safetyHeading}
            </h2>
            <div className="flex flex-col items-start gap-1">
              <ReportPanel
                targetType="activity"
                targetId={activity.id}
                label={t.moderation.reportActivity}
              />
              <ReportPanel
                targetType="user"
                targetId={activity.ownerId}
                label={fill(t.moderation.reportUser, {
                  name: activity.owner.displayName,
                })}
              />
              <BlockButton
                userId={activity.ownerId}
                displayName={activity.owner.displayName}
              />
            </div>
          </section>
        ) : null}
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
