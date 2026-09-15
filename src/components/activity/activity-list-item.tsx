'use client'

import Link from 'next/link'
import { ArchivedBadge, SportBadge, StatusBadge } from '@/components/activity/badges'
import { formatStartShort, isArchived } from '@/lib/format'
import { formatActivityDistance, formatPace } from '@/lib/geo'
import { fill } from '@/lib/i18n'
import { localeHref } from '@/lib/i18n/config'
import { useI18n } from '@/lib/i18n/provider'
import type { MyActivity } from '@/lib/queries/my-activities'
import type { Level } from '@/lib/sports'

/**
 * Card for "My activities".
 *
 * Distinct from ActivityCard, which is built around distance-from-you — a
 * meaningless number for your own activities. This one surfaces state instead:
 * cancelled, hidden, archived, and how many people are waiting on you.
 */
export function ActivityListItem({
  activity,
  role,
}: {
  activity: MyActivity
  role: 'organizer' | 'participant'
}) {
  const { locale, t } = useI18n()
  const archived = isArchived(activity.startsAt)

  const facts = [
    formatActivityDistance(activity.distanceM),
    formatPace(activity.paceSecondsPerKm),
    activity.level ? t.levels[activity.level as Level] : null,
  ].filter(Boolean)

  const joinedLabel =
    activity.maxParticipants === null
      ? fill(t.activity.joined, { count: activity.participantCount })
      : fill(t.activity.joinedOf, {
          count: activity.participantCount,
          max: activity.maxParticipants,
        })

  return (
    <Link
      href={localeHref(locale, `/activities/${activity.id}`)}
      className="border-border bg-surface hover:border-border-strong rounded-card block border p-4 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <SportBadge sportKey={activity.sportKey} />
          <StatusBadge status={activity.status} />
          {archived && activity.status === 'published' ? <ArchivedBadge /> : null}
        </div>
        <span className="text-fg-muted shrink-0 text-xs font-medium">
          {formatStartShort(activity.startsAt, locale)}
        </span>
      </div>

      <h3 className="text-fg mt-3 leading-snug font-semibold">{activity.title}</h3>
      <p className="text-fg-muted mt-1 text-sm">{activity.locationLabel}</p>
      {facts.length > 0 ? (
        <p className="text-fg-muted mt-1 text-sm">{facts.join(' · ')}</p>
      ) : null}

      <div className="border-border mt-3 flex items-center justify-between gap-2 border-t pt-3 text-xs">
        <span className="text-fg-muted font-medium">{joinedLabel}</span>

        {role === 'organizer' && activity.pendingCount > 0 && !archived ? (
          <span className="bg-warning-soft text-warning rounded-full px-2 py-0.5 font-semibold">
            {fill(t.activity.awaitingReply, { count: activity.pendingCount })}
          </span>
        ) : null}

        {role === 'participant' && activity.myRequestStatus === 'pending' ? (
          <span className="bg-warning-soft text-warning rounded-full px-2 py-0.5 font-semibold">
            {t.activity.requestPending}
          </span>
        ) : null}

        {role === 'participant' && activity.myRequestStatus === 'approved' ? (
          <span className="bg-success-soft text-success rounded-full px-2 py-0.5 font-semibold">
            {t.activity.youAreIn}
          </span>
        ) : null}
      </div>
    </Link>
  )
}
