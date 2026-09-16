import { describe, expect, it } from 'vitest'
import {
  CITY_TIME_ZONE,
  daysBetween,
  instantAt,
  startOfDay,
  startOfDayPlus,
  wallClock,
} from './time'

/**
 * These run under TZ=America/New_York — see `vitest.config.mts`. That matters
 * more than usual here: every assertion below passes trivially if the runtime
 * is already in Switzerland, which is why nobody noticed that the app read the
 * runtime's clock.
 *
 * New York is also a better foil than UTC. It observes daylight saving on
 * *different dates* than Switzerland — in 2026 the US moves on 8 March and the
 * EU on 29 March — so for three weeks the gap between the two is five hours
 * rather than six, and any code that reached for a fixed offset is caught.
 */
describe('the city clock', () => {
  it('is Switzerland', () => {
    expect(CITY_TIME_ZONE).toBe('Europe/Zurich')
  })

  it('reads an instant as the city sees it, summer and winter', () => {
    // 17:57 UTC in September is 19:57 in Schwyz (CEST, +02:00).
    expect(wallClock(new Date('2026-09-15T17:57:00Z'))).toMatchObject({
      year: 2026,
      month: 9,
      day: 15,
      hour: 19,
      minute: 57,
      weekday: 2, // Tuesday
    })

    // The same clock reading in February is +01:00 (CET).
    expect(wallClock(new Date('2026-02-05T06:05:00Z'))).toMatchObject({
      month: 2,
      day: 5,
      hour: 7,
      minute: 5,
    })
  })

  it('puts a late evening on the right day', () => {
    // 22:30 UTC is past midnight in Schwyz, so it belongs to the next day —
    // and is still mid-evening in New York, which is the trap.
    expect(wallClock(new Date('2026-07-15T22:30:00Z'))).toMatchObject({
      day: 16,
      hour: 0,
      minute: 30,
    })
  })

  it('turns a wall time into the instant it names', () => {
    expect(instantAt(2026, 9, 15, 19, 57).toISOString()).toBe('2026-09-15T17:57:00.000Z')
    expect(instantAt(2026, 2, 5, 7, 5).toISOString()).toBe('2026-02-05T06:05:00.000Z')
  })

  it('round-trips every hour of a year', () => {
    for (let month = 1; month <= 12; month++) {
      for (const hour of [0, 6, 13, 23]) {
        const clock = wallClock(instantAt(2026, month, 15, hour, 30))
        expect([clock.month, clock.day, clock.hour, clock.minute]).toEqual([
          month,
          15,
          hour,
          30,
        ])
      }
    }
  })

  describe('daylight saving', () => {
    // Switzerland moves on the last Sunday of March and October.
    it('gets the hour either side of the spring change right', () => {
      // 01:30 CET, before the jump.
      expect(instantAt(2026, 3, 29, 1, 30).toISOString()).toBe(
        '2026-03-29T00:30:00.000Z',
      )
      // 03:30 CEST, after it. One clock hour later, but only 60 real minutes.
      expect(instantAt(2026, 3, 29, 3, 30).toISOString()).toBe(
        '2026-03-29T01:30:00.000Z',
      )
    })

    it('gets the hour either side of the autumn change right', () => {
      expect(instantAt(2026, 10, 25, 1, 30).toISOString()).toBe(
        '2026-10-24T23:30:00.000Z',
      )
      expect(instantAt(2026, 10, 25, 3, 30).toISOString()).toBe(
        '2026-10-25T02:30:00.000Z',
      )
    })

    it('counts a 23-hour day as one day', () => {
      // The clocks go forward overnight, so these are 23 hours apart.
      const before = new Date('2026-03-28T21:00:00Z')
      const after = new Date('2026-03-29T20:00:00Z')
      expect(after.getTime() - before.getTime()).toBe(23 * 3_600_000)
      expect(daysBetween(after, before)).toBe(1)
    })

    it('finds midnight on the day the clocks change', () => {
      const duringThatDay = new Date('2026-03-29T12:00:00Z')
      expect(startOfDay(duringThatDay).toISOString()).toBe('2026-03-28T23:00:00.000Z')
    })
  })

  describe('day boundaries', () => {
    const noon = new Date('2026-09-15T10:00:00Z') // 12:00 in Schwyz

    it('starts the day at the city midnight, not the runtime one', () => {
      // 00:00 in Schwyz is 22:00 the previous day UTC, and 18:00 in New York.
      expect(startOfDay(noon).toISOString()).toBe('2026-09-14T22:00:00.000Z')
    })

    it('steps whole calendar days', () => {
      expect(startOfDayPlus(noon, 1).toISOString()).toBe('2026-09-15T22:00:00.000Z')
      expect(startOfDayPlus(noon, -1).toISOString()).toBe('2026-09-13T22:00:00.000Z')
      // Across a month boundary, which naive arithmetic gets wrong.
      expect(startOfDayPlus(noon, 16).toISOString()).toBe('2026-09-30T22:00:00.000Z')
    })

    it('counts days by the city calendar', () => {
      const lateTonight = new Date('2026-09-15T21:30:00Z') // 23:30 in Schwyz
      const earlyTomorrow = new Date('2026-09-15T22:30:00Z') // 00:30, next day
      expect(daysBetween(earlyTomorrow, lateTonight)).toBe(1)
      // An hour apart, and in New York both are still the 15th.
      expect(earlyTomorrow.getTime() - lateTonight.getTime()).toBe(3_600_000)
    })
  })
})
