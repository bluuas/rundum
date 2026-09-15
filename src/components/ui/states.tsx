'use client'

import type { ReactNode } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * The four states every screen in Rundum must handle: loading, empty, error and
 * the normal case. These primitives exist from the first commit so no screen
 * ships with only the happy path.
 */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('shimmer rounded-card', className)} />
}

/** Card-shaped placeholder matching ActivityCard's footprint. */
export function ActivityCardSkeleton() {
  return (
    <div className="py-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-5 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <div className="mt-4 flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  )
}

export function ActivityListSkeleton({
  count = 4,
  label = 'Loading…',
}: {
  count?: number
  label?: string
}) {
  return (
    <div className="divide-border divide-y" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <ActivityCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function EmptyState({
  icon = '🧭',
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="rounded-card border-border-strong bg-surface border border-dashed px-6 py-12 text-center">
      <div className="text-4xl" aria-hidden>
        {icon}
      </div>
      <h2 className="text-fg mt-4 text-base font-semibold">{title}</h2>
      {description ? (
        <p className="text-fg-muted mx-auto mt-2 max-w-xs text-sm">{description}</p>
      ) : null}
      {action ? (
        <ButtonLink href={action.href} className="mt-5">
          {action.label}
        </ButtonLink>
      ) : null}
    </div>
  )
}

export function ErrorState({
  title,
  description,
  retryLabel = 'Try again',
  onRetry,
}: {
  title: string
  description: string
  retryLabel?: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="rounded-card border-border bg-danger-soft border px-6 py-10 text-center"
    >
      <div className="text-3xl" aria-hidden>
        ⚠️
      </div>
      <h2 className="text-fg mt-3 text-base font-semibold">{title}</h2>
      <p className="text-fg-muted mx-auto mt-2 max-w-xs text-sm">{description}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} className="mt-5">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}
