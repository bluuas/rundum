'use client'

import { useRouter } from 'next/navigation'
import { buildFilterQuery, type DateRange } from '@/lib/filters'
import type { FeedFilters, FeedSort } from '@/lib/queries/activities'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/provider'

/**
 * Sort, rendered inline with the result count rather than as a filter chip.
 *
 * Sorting reorders what you already have; the chips above change *what* you
 * have. Keeping them apart, and matching the count's type size, makes that
 * distinction visible instead of implied.
 */
export function SortControl({
  filters,
  className,
}: {
  filters: FeedFilters & { range: DateRange }
  className?: string
}) {
  const router = useRouter()
  const { t } = useI18n()

  return (
    <div className={cn('relative', className)}>
      <select
        aria-label={t.filters.sort}
        value={filters.sort}
        onChange={(event) =>
          router.push(
            buildFilterQuery(filters, { sort: event.target.value as FeedSort }),
            {
              scroll: false,
            },
          )
        }
        className={cn(
          // Matches the count's text-xs. The 44px tap target is preserved by
          // padding rather than height, so the row stays visually compact.
          'text-fg-muted hover:text-fg cursor-pointer appearance-none bg-transparent py-3 pr-4 pl-0 text-xs font-medium',
        )}
      >
        <option value="soonest">{t.filters.sortSoonest}</option>
        <option value="closest">{t.filters.sortClosest}</option>
      </select>
      <span
        aria-hidden
        className="text-fg-subtle pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 text-[9px]"
      >
        ▾
      </span>
    </div>
  )
}
