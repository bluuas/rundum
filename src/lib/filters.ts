import { DEFAULT_CITY_CENTER, DEFAULT_RADIUS_M, RADIUS_OPTIONS_M } from '@/lib/geo'
import { isSportKey, type SportKey } from '@/lib/sports'
import type { FeedFilters, FeedSort } from '@/lib/queries/activities'
import { startOfDayPlus, wallClock } from '@/lib/time'

/**
 * Feed filters live in the URL, not React state.
 *
 * That makes a filtered feed shareable, makes the back button behave, and lets
 * the feed stay a Server Component. These helpers are the only place that knows
 * the query-string shape.
 */

export type SearchParams = Record<string, string | string[] | undefined>

export const DATE_RANGES = ['anytime', 'today', 'tomorrow', 'week', 'weekend'] as const
export type DateRange = (typeof DATE_RANGES)[number]

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function isDateRange(value: unknown): value is DateRange {
  return typeof value === 'string' && (DATE_RANGES as readonly string[]).includes(value)
}

/**
 * Resolves a named range to an interval, on the city's calendar.
 *
 * "Today" is today in Schwyz for everybody. A viewer an hour ahead asking for
 * today's activities is asking about the same day the activities are on, not
 * about the day it happens to be where they are standing.
 */
export function resolveDateRange(
  range: DateRange,
  now = new Date(),
): {
  from: Date | null
  to: Date | null
} {
  const endOf = (daysFromToday: number) => startOfDayPlus(now, daysFromToday + 1)

  switch (range) {
    case 'today':
      return { from: null, to: endOf(0) }
    case 'tomorrow':
      return { from: startOfDayPlus(now, 1), to: endOf(1) }
    case 'week':
      return { from: null, to: endOf(6) }
    case 'weekend': {
      // Saturday 00:00 to Monday 00:00. During a weekend, that weekend.
      const day = wallClock(now).weekday // 0 = Sunday
      const daysUntilSaturday = day === 6 ? 0 : day === 0 ? -1 : 6 - day
      return {
        from: startOfDayPlus(now, daysUntilSaturday),
        to: startOfDayPlus(now, daysUntilSaturday + 2),
      }
    }
    case 'anytime':
    default:
      return { from: null, to: null }
  }
}

/** Anything unparseable falls back to the default rather than erroring. */
export function parseFilters(params: SearchParams): FeedFilters & { range: DateRange } {
  const radiusRaw = Number(first(params.radius))
  const radiusM = (RADIUS_OPTIONS_M as readonly number[]).includes(radiusRaw)
    ? radiusRaw
    : DEFAULT_RADIUS_M

  const sportsRaw = first(params.sports)
  const sports = (sportsRaw ? sportsRaw.split(',') : []).filter(isSportKey) as SportKey[]

  const range: DateRange = isDateRange(first(params.when))
    ? (first(params.when) as DateRange)
    : 'anytime'
  const { from, to } = resolveDateRange(range)

  const sortRaw = first(params.sort)
  const sort: FeedSort = sortRaw === 'closest' ? 'closest' : 'soonest'

  const lat = Number(first(params.lat))
  const lng = Number(first(params.lng))
  const hasCenter =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180

  return {
    center: hasCenter ? { lat, lng } : DEFAULT_CITY_CENTER,
    radiusM,
    sports,
    from,
    to,
    sort,
    limit: 50,
    range,
  }
}

/**
 * Builds the query string for a filter change, dropping defaults so the common
 * case has a clean URL.
 */
export function buildFilterQuery(
  current: FeedFilters & { range: DateRange },
  changes: Partial<{
    radiusM: number
    sports: SportKey[]
    range: DateRange
    sort: FeedSort
  }>,
): string {
  const next = { ...current, ...changes }
  const params = new URLSearchParams()

  if (next.radiusM !== DEFAULT_RADIUS_M) params.set('radius', String(next.radiusM))
  if (next.sports.length > 0) params.set('sports', next.sports.join(','))
  if (next.range !== 'anytime') params.set('when', next.range)
  if (next.sort !== 'soonest') params.set('sort', next.sort)

  if (
    next.center.lat !== DEFAULT_CITY_CENTER.lat ||
    next.center.lng !== DEFAULT_CITY_CENTER.lng
  ) {
    params.set('lat', next.center.lat.toFixed(4))
    params.set('lng', next.center.lng.toFixed(4))
  }

  const query = params.toString()
  return query ? `?${query}` : '/'
}

/** True when the user has narrowed anything, used to offer "clear filters". */
export function hasActiveFilters(filters: FeedFilters & { range: DateRange }): boolean {
  return (
    filters.sports.length > 0 ||
    filters.range !== 'anytime' ||
    filters.radiusM !== DEFAULT_RADIUS_M ||
    filters.sort !== 'soonest'
  )
}
