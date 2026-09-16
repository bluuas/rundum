import { fill, getDictionary } from '@/lib/i18n'
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config'
import { daysBetween, wallClock } from '@/lib/time'

/**
 * Date and time formatting.
 *
 * Swiss conventions throughout, without exception:
 *   - 24-hour time, never AM/PM
 *   - numeric dates as DD.MM.YYYY, never MM/DD/YYYY or YYYY-MM-DD
 *   - the city's clock, never the runtime's — see `src/lib/time.ts`
 *
 * Numeric formats are hand-rolled rather than delegated to
 * Intl.DateTimeFormat, because Intl output depends on the runtime's ICU data
 * and on the locale tag being interpreted as expected — which is exactly how an
 * en-US "7:30 PM" slips in. Formatting this small is not worth that risk, and
 * it makes the rule testable.
 *
 * Words — weekdays, "Today", "2h ago" — come from the dictionary, so they are
 * translated while the numbers stay Swiss in every language.
 */

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value
}

/** 24-hour time, "19:57". Never 7:57 PM, in any locale or any server region. */
export function formatTime(value: string | Date): string {
  const clock = wallClock(toDate(value))
  return `${pad(clock.hour)}:${pad(clock.minute)}`
}

/** Swiss numeric date, "15.09.2026". Identical in every locale. */
export function formatDate(value: string | Date): string {
  const clock = wallClock(toDate(value))
  return `${pad(clock.day)}.${pad(clock.month)}.${clock.year}`
}

/** Swiss date and time together, "15.09.2026, 19:57". */
export function formatDateTime(value: string | Date): string {
  return `${formatDate(value)}, ${formatTime(value)}`
}

/**
 * Short label for cards: "Today 18:30", "Sat 09:00", "15.09.2026 09:00".
 *
 * Relative words only within a week — beyond that "in 23 days" is harder to act
 * on than a date.
 */
export function formatStartShort(
  startsAt: string | Date,
  locale: Locale = DEFAULT_LOCALE,
  now = new Date(),
): string {
  const date = toDate(startsAt)
  const t = getDictionary(locale).time
  const days = daysBetween(date, now)
  const time = formatTime(date)

  if (days === 0) return fill(t.today, { time })
  if (days === 1) return fill(t.tomorrow, { time })
  if (days === -1) return fill(t.yesterday, { time })
  if (days > 1 && days < 7) return `${t.weekdayShort[wallClock(date).weekday]} ${time}`

  return `${formatDate(date)} ${time}`
}

/** Full label for the detail page: "Tuesday, 15.09.2026, 19:57". */
export function formatStartFull(
  startsAt: string | Date,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const date = toDate(startsAt)
  const t = getDictionary(locale).time
  return `${t.weekdayLong[wallClock(date).weekday]}, ${formatDate(date)}, ${formatTime(date)}`
}

/** Relative label for comments: "just now", "2h ago", then a Swiss date. */
export function formatRelative(
  timestamp: string | Date,
  locale: Locale = DEFAULT_LOCALE,
  now = new Date(),
): string {
  const date = toDate(timestamp)
  const t = getDictionary(locale).time
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return t.justNow
  if (seconds < 3_600) return fill(t.minutesAgo, { count: Math.floor(seconds / 60) })
  if (seconds < 86_400) return fill(t.hoursAgo, { count: Math.floor(seconds / 3_600) })
  if (seconds < 604_800) return fill(t.daysAgo, { count: Math.floor(seconds / 86_400) })

  return formatDate(date)
}

export function isArchived(startsAt: string | Date, now = new Date()): boolean {
  return toDate(startsAt).getTime() < now.getTime()
}

/**
 * Value for an <input type="date">, which is always ISO regardless of display.
 *
 * The city's date, not the browser's: the form is scheduling something that
 * happens in Schwyz, so "today" means today there.
 */
export function toDateInputValue(date: Date): string {
  const clock = wallClock(date)
  return `${clock.year}-${pad(clock.month)}-${pad(clock.day)}`
}

/** Value for an <input type="time">, which is always 24-hour regardless of display. */
export function toTimeInputValue(date: Date): string {
  const clock = wallClock(date)
  return `${pad(clock.hour)}:${pad(clock.minute)}`
}

/**
 * An activity with no participant limit is never full.
 *
 * The *labels* for participant counts live in the dictionaries, since they are
 * translated; this is the one piece of the rule that is pure logic.
 */
export function isFull(count: number, max: number | null): boolean {
  return max !== null && count >= max
}
