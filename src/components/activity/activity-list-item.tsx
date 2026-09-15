import Link from 'next/link'
import { ArchivedBadge, SportBadge, StatusBadge } from '@/components/activity/badges'
import { formatStartShort, isArchived } from '@/lib/format'
import { formatActivityDistance, formatPace } from '@/lib/geo'
import { LEVEL_LABELS, type Level } from '@/lib/sports'
import type { MyActivity } from '@/lib/queries/my-activities'

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
  const archived = isArchived(activity.startsAt)

  const facts = [
    formatActivityDistance(activity.distanceM),
    formatPace(activity.paceSecondsPerKm),
    activity.level ? LEVEL_LABELS[activity.level as Level] : null,
  ].filter(Boolean)

  return (
    <Link
      href={`/activities/${activity.id}`}
      className="border-border bg-surface hover:border-border-strong rounded-card block border p-4 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <SportBadge sportKey={activity.sportKey} />
          <StatusBadge status={activity.status} />
          {archived && activity.status === 'published' ? <ArchivedBadge /> : null}
        </div>
        <span className="text-fg-muted shrink-0 text-xs font-medium">
          {formatStartShort(activity.startsAt)}
        </span>
      </div>

      <h3 className="text-fg mt-3 leading-snug font-semibold">{activity.title}</h3>
      <p className="text-fg-muted mt-1 text-sm">{activity.locationLabel}</p>
      {facts.length > 0 ? (
        <p className="text-fg-muted mt-1 text-sm">{facts.join(' · ')}</p>
      ) : null}

      <div className="border-border mt-3 flex items-center justify-between gap-2 border-t pt-3 text-xs">
        <span className="text-fg-muted font-medium">
          {activity.participantCount}/{activity.maxParticipants} joined
        </span>

        {role === 'organizer' && activity.pendingCount > 0 && !archived ? (
          <span className="bg-warning-soft text-warning rounded-full px-2 py-0.5 font-semibold">
            {activity.pendingCount} awaiting your reply
          </span>
        ) : null}

        {role === 'participant' && activity.myRequestStatus === 'pending' ? (
          <span className="bg-warning-soft text-warning rounded-full px-2 py-0.5 font-semibold">
            Request pending
          </span>
        ) : null}

        {role === 'participant' && activity.myRequestStatus === 'approved' ? (
          <span className="bg-success-soft text-success rounded-full px-2 py-0.5 font-semibold">
            You are in
          </span>
        ) : null}
      </div>
    </Link>
  )
}
