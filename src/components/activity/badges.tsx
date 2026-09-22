'use client'

import { Icon } from '@/components/ui/icon'
import { useI18n } from '@/lib/i18n/provider'
import { getSport, isSportKey } from '@/lib/sports'
import { cn } from '@/lib/utils'

export function SportBadge({
  sportKey,
  className,
}: {
  sportKey: string
  className?: string
}) {
  const { t } = useI18n()
  const sport = getSport(sportKey)
  const label = isSportKey(sportKey) ? t.sports[sportKey] : sport.label

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        sport.badgeClass,
        className,
      )}
    >
      <Icon name={sport.icon} className="text-[13px]" />
      {label}
    </span>
  )
}

/**
 * Marks an account that signed in through Strava.
 *
 * The wording is "Strava-connected", never "verified": Rundum has not verified
 * anything about this person, and must not imply an endorsement by Strava. The
 * brand guidelines also require that the Strava name never appear more
 * prominently than the application's own, which is why this is small, muted
 * text next to a 18px "Rundum" wordmark.
 */
export function StravaConnectedBadge({ className }: { className?: string }) {
  const { t } = useI18n()

  return (
    <span
      className={cn(
        'text-fg-subtle inline-flex items-center gap-1 text-[11px] font-medium',
        className,
      )}
      title={t.strava.connectedTitle}
    >
      {/* A plain chain link, never anything Strava-shaped. */}
      <Icon name="link-simple" />
      {t.strava.connected}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n()

  if (status === 'cancelled') {
    return (
      <span className="bg-danger-soft text-danger inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold">
        {t.activity.cancelled}
      </span>
    )
  }

  if (status === 'hidden') {
    return (
      <span className="bg-surface-muted text-fg-muted inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold">
        {t.activity.hidden}
      </span>
    )
  }

  return null
}

export function ArchivedBadge() {
  const { t } = useI18n()

  return (
    <span className="bg-surface-muted text-fg-muted inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold">
      {t.activity.archived}
    </span>
  )
}
