/**
 * Date and time formatting for the feed and detail views.
 *
 * Deliberately not date-fns's formatDistanceToNow: "in 14 hours" is worse than
 * "Tomorrow 07:00" for deciding whether you can make it.
 */

const TIME = new Intl.DateTimeFormat('en-CH', { hour: '2-digit', minute: '2-digit' })
const WEEKDAY_TIME = new Intl.DateTimeFormat('en-CH', {
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const FULL = new Intl.DateTimeFormat('en-CH', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

function daysApart(a: Date, b: Date): number {
  const startA = new Date(a).setHours(0, 0, 0, 0)
  const startB = new Date(b).setHours(0, 0, 0, 0)
  return Math.round((startA - startB) / 86_400_000)
}

/** Short label for cards: "Today 18:30", "Tomorrow 07:00", "Sat 09:00". */
export function formatStartShort(startsAt: string | Date, now = new Date()): string {
  const date = typeof startsAt === 'string' ? new Date(startsAt) : startsAt
  const days = daysApart(date, now)

  if (days === 0) return `Today ${TIME.format(date)}`
  if (days === 1) return `Tomorrow ${TIME.format(date)}`
  if (days === -1) return `Yesterday ${TIME.format(date)}`
  if (days > 1 && days < 7) return WEEKDAY_TIME.format(date)

  return new Intl.DateTimeFormat('en-CH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** Full label for the detail page. */
export function formatStartFull(startsAt: string | Date): string {
  return FULL.format(typeof startsAt === 'string' ? new Date(startsAt) : startsAt)
}

/** Relative label for comments: "just now", "2h ago", "12 Sept". */
export function formatRelative(timestamp: string | Date, now = new Date()): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h ago`
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}d ago`

  return new Intl.DateTimeFormat('en-CH', { day: 'numeric', month: 'short' }).format(date)
}

export function isArchived(startsAt: string | Date, now = new Date()): boolean {
  const date = typeof startsAt === 'string' ? new Date(startsAt) : startsAt
  return date.getTime() < now.getTime()
}
