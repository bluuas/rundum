import { cn } from '@/lib/utils'
import { getSport } from '@/lib/sports'

export function SportBadge({
  sportKey,
  className,
}: {
  sportKey: string
  className?: string
}) {
  const sport = getSport(sportKey)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        sport.badgeClass,
        className,
      )}
    >
      <span aria-hidden>{sport.icon}</span>
      {sport.label}
    </span>
  )
}

/**
 * Marks an account that signed in through Strava.
 *
 * The wording is "Strava-connected", never "verified": Rundum has not verified
 * anything about this person, and must not imply an endorsement by Strava.
 */
export function StravaConnectedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'text-fg-subtle inline-flex items-center gap-1 text-[11px] font-medium',
        className,
      )}
      title="This account signed in with Strava"
    >
      <span aria-hidden>🔗</span>
      Strava-connected
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  if (status === 'cancelled') {
    return (
      <span className="bg-danger-soft text-danger inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold">
        Cancelled
      </span>
    )
  }
  if (status === 'hidden') {
    return (
      <span className="bg-surface-muted text-fg-muted inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold">
        Hidden
      </span>
    )
  }
  return null
}

export function ArchivedBadge() {
  return (
    <span className="bg-surface-muted text-fg-muted inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold">
      Archived
    </span>
  )
}
