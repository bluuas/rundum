import { describe, expect, it } from 'vitest'
import { resolveDateRange } from './filters'

/**
 * "Today" means today in Schwyz, for everyone. A viewer whose own clock has
 * already rolled over is still asking about the day the activities are on.
 *
 * These run under TZ=America/New_York, where the day rolls over six hours
 * later — so any boundary computed from the runtime's midnight lands on the
 * wrong side of these assertions.
 */
describe('resolveDateRange', () => {
  // 15 September 2026, 23:30 in Schwyz. In New York it is still 17:30 the
  // same evening; in UTC, 21:30.
  const lateInSchwyz = new Date('2026-09-15T23:30:00+02:00')

  it('ends "today" at the city midnight', () => {
    const { from, to } = resolveDateRange('today', lateInSchwyz)
    expect(from).toBeNull()
    // Half an hour away, not six and a half.
    expect(to?.toISOString()).toBe('2026-09-15T22:00:00.000Z')
  })

  it('moves "tomorrow" with the city, not the viewer', () => {
    const { from, to } = resolveDateRange('tomorrow', lateInSchwyz)
    expect(from?.toISOString()).toBe('2026-09-15T22:00:00.000Z')
    expect(to?.toISOString()).toBe('2026-09-16T22:00:00.000Z')
  })

  it('covers seven city days for "week"', () => {
    const { from, to } = resolveDateRange('week', lateInSchwyz)
    expect(from).toBeNull()
    expect(to?.toISOString()).toBe('2026-09-21T22:00:00.000Z')
  })

  it('finds the coming weekend from a weekday', () => {
    // Tuesday 15 September; the weekend is Saturday 19th to Monday 21st.
    const { from, to } = resolveDateRange('weekend', lateInSchwyz)
    expect(from?.toISOString()).toBe('2026-09-18T22:00:00.000Z')
    expect(to?.toISOString()).toBe('2026-09-20T22:00:00.000Z')
  })

  it('keeps the current weekend during it', () => {
    // Sunday 20 September, 10:00 in Schwyz.
    const sunday = new Date('2026-09-20T10:00:00+02:00')
    const { from, to } = resolveDateRange('weekend', sunday)
    expect(from?.toISOString()).toBe('2026-09-18T22:00:00.000Z')
    expect(to?.toISOString()).toBe('2026-09-20T22:00:00.000Z')
  })

  it('bounds nothing for "anytime"', () => {
    expect(resolveDateRange('anytime', lateInSchwyz)).toEqual({ from: null, to: null })
  })
})
