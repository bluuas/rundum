/**
 * Date and time formatting.
 *
 * Swiss conventions throughout, without exception:
 *   - 24-hour time, never AM/PM
 *   - numeric dates as DD.MM.YYYY, never MM/DD/YYYY or YYYY-MM-DD
 *
 * These are hand-rolled rather than delegated to Intl.DateTimeFormat, because
 * Intl output depends on the runtime's ICU data and on the locale tag being
 * interpreted as expected — which is exactly how an en-US "7:30 PM" slips in.
 * Formatting this small is not worth that risk, and it makes the rule testable.
 *
 * Weekday and month names stay English, since the interface is English. It is
 * the numeric conventions that are Swiss.
 */

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value
}

/** 24-hour time, "19:57". Never 7:57 PM. */
export function formatTime(value: string | Date): string {
  const date = toDate(value)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Swiss numeric date, "15.09.2026". */
export function formatDate(value: string | Date): string {
  const date = toDate(value)
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`
}

/** Swiss date and time together, "15.09.2026, 19:57". */
export function formatDateTime(value: string | Date): string {
  return `${formatDate(value)}, ${formatTime(value)}`
}

function daysApart(a: Date, b: Date): number {
  const startA = new Date(a).setHours(0, 0, 0, 0)
  const startB = new Date(b).setHours(0, 0, 0, 0)
  return Math.round((startA - startB) / 86_400_000)
}

/**
 * Short label for cards: "Today 18:30", "Tomorrow 07:00", "Sat 09:00",
 * "15.09.2026 09:00".
 *
 * Relative words only within a week — beyond that "in 23 days" is harder to act
 * on than a date.
 */
export function formatStartShort(startsAt: string | Date, now = new Date()): string {
  const date = toDate(startsAt)
  const days = daysApart(date, now)
  const time = formatTime(date)

  if (days === 0) return `Today ${time}`
  if (days === 1) return `Tomorrow ${time}`
  if (days === -1) return `Yesterday ${time}`
  if (days > 1 && days < 7) return `${WEEKDAY_SHORT[date.getDay()]} ${time}`

  return `${formatDate(date)} ${time}`
}

/** Full label for the detail page: "Tuesday, 15.09.2026, 19:57". */
export function formatStartFull(startsAt: string | Date): string {
  const date = toDate(startsAt)
  return `${WEEKDAY_LONG[date.getDay()]}, ${formatDate(date)}, ${formatTime(date)}`
}

/** Relative label for comments: "just now", "2h ago", then a Swiss date. */
export function formatRelative(timestamp: string | Date, now = new Date()): string {
  const date = toDate(timestamp)
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h ago`
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}d ago`

  return formatDate(date)
}

export function isArchived(startsAt: string | Date, now = new Date()): boolean {
  return toDate(startsAt).getTime() < now.getTime()
}

/** Value for an <input type="date">, which is always ISO regardless of display. */
export function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Value for an <input type="time">, which is always 24-hour regardless of display. */
export function toTimeInputValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Participant count for display.
 *
 * `max` is null when the organizer set no limit, in which case there is no
 * denominator to show — "12 joined", not "12/∞ joined".
 */
export function formatParticipants(count: number, max: number | null): string {
  return max === null ? `${count} joined` : `${count}/${max} joined`
}

/** An activity with no limit is never full. */
export function isFull(count: number, max: number | null): boolean {
  return max !== null && count >= max
}

/** Human label for the limit itself, used on detail and review screens. */
export function formatParticipantLimit(count: number, max: number | null): string {
  return max === null ? `${count} joined · no limit` : `${count} of ${max}`
}
