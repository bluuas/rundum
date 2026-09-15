'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  DATE_RANGES,
  DATE_RANGE_LABELS,
  buildFilterQuery,
  type DateRange,
} from '@/lib/filters'
import { RADIUS_OPTIONS_M, formatRadius } from '@/lib/geo'
import { SPORTS, type SportKey } from '@/lib/sports'
import type { FeedFilters } from '@/lib/queries/activities'
import { cn } from '@/lib/utils'

type Filters = FeedFilters & { range: DateRange }

/**
 * Filter controls. Every change is a navigation, not local state, so the feed
 * stays a Server Component and the URL always describes what is on screen.
 */
export function FilterBar({ filters }: { filters: Filters }) {
  const router = useRouter()
  const [sportsOpen, setSportsOpen] = useState(false)

  function apply(changes: Parameters<typeof buildFilterQuery>[1]) {
    router.push(buildFilterQuery(filters, changes), { scroll: false })
  }

  function toggleSport(key: SportKey) {
    const next = filters.sports.includes(key)
      ? filters.sports.filter((sport) => sport !== key)
      : [...filters.sports, key]
    apply({ sports: next })
  }

  const sportsLabel =
    filters.sports.length === 0
      ? 'All sports'
      : filters.sports.length === 1
        ? SPORTS.find((sport) => sport.key === filters.sports[0])!.label
        : `${filters.sports.length} sports`

  return (
    <div className="space-y-3">
      {/* Horizontally scrollable chip row: many filters, one thumb-width screen. */}
      <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden">
        <Chip active={filters.sports.length > 0} onClick={() => setSportsOpen((v) => !v)}>
          {sportsLabel}
          <span aria-hidden className="ml-1 text-[10px]">
            ▾
          </span>
        </Chip>

        <Select
          label="When"
          value={filters.range}
          active={filters.range !== 'anytime'}
          options={DATE_RANGES.map((range) => ({
            value: range,
            label: DATE_RANGE_LABELS[range],
          }))}
          onChange={(value) => apply({ range: value as DateRange })}
        />

        <Select
          label="Within"
          value={String(filters.radiusM)}
          active={filters.radiusM !== 25_000}
          options={RADIUS_OPTIONS_M.map((meters) => ({
            value: String(meters),
            label: `Within ${formatRadius(meters)}`,
          }))}
          onChange={(value) => apply({ radiusM: Number(value) })}
        />
      </div>

      {sportsOpen ? (
        <div className="border-border bg-surface rounded-card border p-3">
          <div className="flex flex-wrap gap-2">
            {SPORTS.map((sport) => {
              const selected = filters.sports.includes(sport.key)
              return (
                <button
                  key={sport.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleSport(sport.key)}
                  className={cn(
                    'min-h-11 rounded-full border px-3 text-sm transition-colors',
                    selected
                      ? 'border-brand bg-brand text-brand-fg'
                      : 'border-border-strong text-fg-muted hover:bg-surface-muted',
                  )}
                >
                  <span aria-hidden className="mr-1">
                    {sport.icon}
                  </span>
                  {sport.label}
                </button>
              )
            })}
          </div>

          {filters.sports.length > 0 ? (
            <button
              type="button"
              onClick={() => apply({ sports: [] })}
              className="text-fg-muted hover:text-fg mt-3 min-h-11 text-sm underline"
            >
              Clear sports
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-11 shrink-0 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors',
        active
          ? 'border-brand bg-brand-soft text-brand-soft-fg'
          : 'border-border-strong text-fg-muted hover:bg-surface-muted',
      )}
    >
      {children}
    </button>
  )
}

/**
 * A native <select> styled as a chip. Native pickers are the right call on
 * mobile: they are accessible, keyboard-friendly and feel correct on every OS.
 */
function Select({
  label,
  value,
  active,
  options,
  onChange,
}: {
  label: string
  value: string
  active?: boolean
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="relative shrink-0">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'min-h-11 appearance-none rounded-full border py-0 pr-8 pl-3.5 text-sm font-medium transition-colors',
          active
            ? 'border-brand bg-brand-soft text-brand-soft-fg'
            : 'border-border-strong text-fg-muted bg-transparent',
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="text-fg-subtle pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px]"
      >
        ▾
      </span>
    </div>
  )
}
