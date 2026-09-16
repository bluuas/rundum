/**
 * The city's clock.
 *
 * An activity at 18:30 in Schwyz is at 18:30 for everyone: for the organizer,
 * for somebody browsing from Berlin, and for the server that renders the page —
 * which on Vercel runs in UTC. So every wall-clock value in this app is read
 * and written in the city's zone, never in the runtime's.
 *
 * Getting this wrong is quiet rather than loud. `date.getHours()` returns the
 * right answer on a laptop in Zurich and the wrong one everywhere else, and
 * tests that build their fixtures with `new Date(y, m, d, h, m)` are wrong in
 * the same direction, so they agree. That is why the suite runs under
 * `TZ=America/New_York` — see `vitest.config.mts`.
 */

/**
 * Launch city. Becomes `cities.timezone` when there is more than one city;
 * the column already exists and is already populated.
 */
export const CITY_TIME_ZONE = 'Europe/Zurich'

export type WallClock = {
  year: number
  /** 1-12, not the 0-11 that `Date` uses. */
  month: number
  day: number
  hour: number
  minute: number
  /** 0 = Sunday, matching `Date#getDay`. */
  weekday: number
}

/*
  Intl is used here and nowhere else.

  The rule against it elsewhere is about letting it choose a *format*, which
  varies with the runtime's ICU data and is how an en-US "7:30 PM" gets in.
  This reads numeric parts and assembles nothing, and offset arithmetic is the
  one thing that genuinely needs the timezone database rather than a rule of
  thumb about Swiss summers.

  `hourCycle: 'h23'` rather than `hour12: false`: some ICU versions render
  midnight as hour 24 under the latter.
*/
const parts = new Intl.DateTimeFormat('en-US', {
  timeZone: CITY_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/** What the city's clock reads at this instant. */
export function wallClock(instant: Date): WallClock {
  const found: Record<string, number> = {}
  for (const part of parts.formatToParts(instant)) {
    if (part.type !== 'literal') found[part.type] = Number(part.value)
  }

  const { year, month, day, hour, minute } = found

  return {
    year,
    month,
    day,
    hour,
    minute,
    // Derived from the calendar date rather than read from Intl, so the
    // weekday cannot disagree with the day it belongs to.
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  }
}

/** How far ahead of UTC the city's clock is at this instant, in milliseconds. */
function offsetAt(instant: Date): number {
  const clock = wallClock(instant)
  const asIfUTC = Date.UTC(
    clock.year,
    clock.month - 1,
    clock.day,
    clock.hour,
    clock.minute,
    instant.getUTCSeconds(),
    instant.getUTCMilliseconds(),
  )
  return asIfUTC - instant.getTime()
}

/**
 * The instant at which the city's clock reads this wall time.
 *
 * Two passes: the first guesses using the offset at the same numbers read as
 * UTC, the second corrects it using the offset actually in force then, which
 * is what makes the hours either side of a DST change come out right.
 *
 * The two clock readings that are not instants — 02:30 on the night the clocks
 * go forward, which never happens, and 02:30 on the night they go back, which
 * happens twice — resolve to something an hour out and to the first of the two
 * respectively. Neither is worth more code: nobody schedules a run for then.
 */
export function instantAt(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  const corrected = guess - offsetAt(new Date(guess - offsetAt(new Date(guess))))
  return new Date(corrected)
}

/** Midnight in the city, at the start of the day containing this instant. */
export function startOfDay(instant: Date): Date {
  const clock = wallClock(instant)
  return instantAt(clock.year, clock.month, clock.day, 0, 0)
}

/** Midnight in the city, `days` after the day containing this instant. */
export function startOfDayPlus(instant: Date, days: number): Date {
  const clock = wallClock(instant)
  // Day arithmetic via UTC, where every day is 24 hours, then converted back —
  // adding 86_400_000 ms to an instant is wrong across a DST change.
  const shifted = new Date(Date.UTC(clock.year, clock.month - 1, clock.day + days))
  return instantAt(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
    0,
    0,
  )
}

/** Whole days between the city-days containing two instants. */
export function daysBetween(a: Date, b: Date): number {
  const dayA = wallClock(a)
  const dayB = wallClock(b)
  const utcA = Date.UTC(dayA.year, dayA.month - 1, dayA.day)
  const utcB = Date.UTC(dayB.year, dayB.month - 1, dayB.day)
  return Math.round((utcA - utcB) / 86_400_000)
}
