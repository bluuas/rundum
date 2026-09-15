'use client'

import { useRouter } from 'next/navigation'
import { buildFilterQuery, type DateRange } from '@/lib/filters'
import type { FeedFilters, FeedSort } from '@/lib/queries/activities'
import { cn } from '@/lib/utils'

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

  return (
    <div className={cn('relative', className)}>
      <select
        aria-label="Sort activities"
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
        <option value="soonest">Soonest first</option>
        <option value="closest">Closest first</option>
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
