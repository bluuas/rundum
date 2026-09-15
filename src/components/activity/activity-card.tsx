import Link from 'next/link'
import { SportBadge, StravaConnectedBadge } from '@/components/activity/badges'
import { formatParticipants, formatStartShort, isFull } from '@/lib/format'
import { formatActivityDistance, formatDistanceBucket, formatPace } from '@/lib/geo'
import { LEVEL_LABELS, type Level } from '@/lib/sports'
import type { NearbyActivity } from '@/lib/supabase/rows'

export function ActivityCard({ activity }: { activity: NearbyActivity }) {
  const full = isFull(activity.participant_count, activity.max_participants)

  const facts = [
    formatActivityDistance(activity.activity_distance_m),
    formatPace(activity.pace_seconds_per_km),
    activity.level ? LEVEL_LABELS[activity.level as Level] : null,
  ].filter(Boolean)

  return (
    <Link
      href={`/activities/${activity.id}`}
      className="border-border bg-surface hover:border-border-strong rounded-card block border p-4 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <SportBadge sportKey={activity.sport_key} />
        <span className="text-fg-muted shrink-0 text-xs font-medium">
          {formatStartShort(activity.starts_at)}
        </span>
      </div>

      <h3 className="text-fg mt-3 leading-snug font-semibold">{activity.title}</h3>

      <p className="text-fg-muted mt-1 text-sm">
        {activity.location_label}
        {/* Bucketed, never exact — see formatDistanceBucket. */}
        <span className="text-fg-subtle">
          {' '}
          · {formatDistanceBucket(activity.distance_meters)}
        </span>
      </p>

      {facts.length > 0 ? (
        <p className="text-fg-muted mt-2 text-sm">{facts.join(' · ')}</p>
      ) : null}

      <div className="border-border mt-3 flex items-center justify-between gap-2 border-t pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="bg-brand-soft text-brand-soft-fg flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          >
            {activity.owner_display_name.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="text-fg truncate text-xs font-medium">
              {activity.owner_display_name}
            </p>
            {activity.owner_strava_connected ? <StravaConnectedBadge /> : null}
          </div>
        </div>

        <span
          className={
            full
              ? 'text-fg-subtle shrink-0 text-xs font-medium'
              : 'text-fg-muted shrink-0 text-xs font-medium'
          }
        >
          {full
            ? 'Full'
            : formatParticipants(activity.participant_count, activity.max_participants)}
        </span>
      </div>
    </Link>
  )
}
