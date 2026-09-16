'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DATE_RANGES, buildFilterQuery, type DateRange } from '@/lib/filters'
import { RADIUS_OPTIONS_M, formatRadius } from '@/lib/geo'
import { SPORTS, type SportKey } from '@/lib/sports'
import type { FeedFilters } from '@/lib/queries/activities'
import { cn } from '@/lib/utils'
import { fill } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n/provider'

type Filters = FeedFilters & { range: DateRange }

/**
 * Filter controls. Every change is a navigation, not local state, so the feed
 * stays a Server Component and the URL always describes what is on screen.
 *
 * Each control carries its own heading. Without one the values had to name
 * their own dimension — "Within 25 km" — which made the row of chips read as a
 * sentence fragment and left no room for the value itself.
 */
export function FilterBar({ filters }: { filters: Filters }) {
  const router = useRouter()
  const { t } = useI18n()
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
      ? t.filters.allSports
      : filters.sports.length === 1
        ? t.sports[filters.sports[0]]
        : fill(t.filters.nSports, { count: filters.sports.length })

  return (
    <div className="space-y-3">
      {/* Horizontally scrollable: three labelled controls, one thumb-width screen. */}
      <div className="-mx-4 flex [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden">
        <Field label={t.filters.sports}>
          <Chip
            active={filters.sports.length > 0}
            expanded={sportsOpen}
            onClick={() => setSportsOpen((v) => !v)}
          >
            {sportsLabel}
            <span aria-hidden className="ml-1 text-[10px]">
              ▾
            </span>
          </Chip>
        </Field>

        <Field label={t.filters.when}>
          <Select
            label={t.filters.when}
            value={filters.range}
            active={filters.range !== 'anytime'}
            options={DATE_RANGES.map((range) => ({
              value: range,
              label: t.filters.ranges[range],
            }))}
            onChange={(value) => apply({ range: value as DateRange })}
          />
        </Field>

        <Field label={t.filters.within}>
          <Select
            label={t.filters.within}
            value={String(filters.radiusM)}
            active={filters.radiusM !== 25_000}
            // Just the distance: the heading above already says what it means.
            options={RADIUS_OPTIONS_M.map((meters) => ({
              value: String(meters),
              label: formatRadius(meters),
            }))}
            onChange={(value) => apply({ radiusM: Number(value) })}
          />
        </Field>
      </div>

      {sportsOpen ? (
        <div className="border-border bg-surface rounded-card border">
          {/*
            One row per sport rather than a wrap of pills. Ten pills reflowed
            into ragged lines that were hard to scan, and a checkbox says
            "several of these" where a pill only says "this one is on".
          */}
          <ul className="divide-border divide-y">
            {SPORTS.map((sport) => {
              const selected = filters.sports.includes(sport.key)
              return (
                <li key={sport.key}>
                  <label className="hover:bg-surface-muted flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 transition-colors">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSport(sport.key)}
                      className="accent-brand h-4 w-4 shrink-0"
                    />
                    <span aria-hidden>{sport.icon}</span>
                    <span className="text-fg text-sm">{t.sports[sport.key]}</span>
                  </label>
                </li>
              )
            })}
          </ul>

          {filters.sports.length > 0 ? (
            <div className="border-border border-t px-3">
              <button
                type="button"
                onClick={() => apply({ sports: [] })}
                className="text-fg-muted hover:text-fg min-h-11 text-sm underline"
              >
                {t.filters.clearSports}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** A control with its heading above it. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col gap-1">
      <span className="text-fg-subtle px-1 text-[11px] font-medium tracking-wide uppercase">
        {label}
      </span>
      {children}
    </div>
  )
}

function Chip({
  active,
  expanded,
  onClick,
  children,
}: {
  active?: boolean
  expanded?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
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
          'min-h-11 w-full appearance-none rounded-full border py-0 pr-8 pl-3.5 text-sm font-medium transition-colors',
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
