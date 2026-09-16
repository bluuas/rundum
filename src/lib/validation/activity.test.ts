import { describe, expect, it } from 'vitest'
import { activityInputSchema, combineDateAndTime } from './activity'

const base = {
  sportKey: 'run' as const,
  title: 'Morning loop',
  startsAt: new Date(Date.now() + 86_400_000),
  lat: 47.0207,
  lng: 8.653,
  locationLabel: 'Hauptplatz Schwyz',
  visibilityRadiusM: 25_000,
  maxParticipants: 10,
}

describe('activityInputSchema', () => {
  it('accepts a valid activity', () => {
    expect(activityInputSchema.safeParse(base).success).toBe(true)
  })

  it('accepts no participant limit', () => {
    const result = activityInputSchema.safeParse({ ...base, maxParticipants: null })
    expect(result.success).toBe(true)
    expect(result.success && result.data.maxParticipants).toBeNull()
  })

  it('rejects zero or negative limits, which are not the same as no limit', () => {
    expect(activityInputSchema.safeParse({ ...base, maxParticipants: 0 }).success).toBe(
      false,
    )
    expect(activityInputSchema.safeParse({ ...base, maxParticipants: -1 }).success).toBe(
      false,
    )
  })

  it('rejects a start time in the past', () => {
    const past = { ...base, startsAt: new Date(Date.now() - 1_000) }
    expect(activityInputSchema.safeParse(past).success).toBe(false)
  })

  it('rejects a distance on a sport that has none', () => {
    const yoga = { ...base, sportKey: 'yoga' as const, distanceM: 5_000 }
    expect(activityInputSchema.safeParse(yoga).success).toBe(false)
  })

  it('rejects a pace on a sport that has none', () => {
    const tennis = { ...base, sportKey: 'tennis' as const, paceSecondsPerKm: 300 }
    expect(activityInputSchema.safeParse(tennis).success).toBe(false)
  })

  it('allows distance and pace on running', () => {
    const run = { ...base, distanceM: 10_000, paceSecondsPerKm: 330 }
    expect(activityInputSchema.safeParse(run).success).toBe(true)
  })
})

/**
 * The write half of the timezone rule. Reading an instant back in the city's
 * zone is no use if it was stored in the organizer's — and this is the harder
 * half to notice, because it looks right to the person who entered it.
 */
describe('combineDateAndTime', () => {
  it('reads the form as the city clock, not the browser clock', () => {
    // 18:30 in Schwyz in July is 16:30 UTC. Under TZ=America/New_York, the old
    // `new Date('2026-07-15T18:30')` would have produced 22:30 UTC.
    expect(combineDateAndTime('2026-07-15', '18:30').toISOString()).toBe(
      '2026-07-15T16:30:00.000Z',
    )
  })

  it('follows the city into and out of summer time', () => {
    expect(combineDateAndTime('2026-01-15', '18:30').toISOString()).toBe(
      '2026-01-15T17:30:00.000Z',
    )
    expect(combineDateAndTime('2026-07-15', '18:30').toISOString()).toBe(
      '2026-07-15T16:30:00.000Z',
    )
  })

  it('is an invalid date when the fields are incomplete', () => {
    expect(Number.isNaN(combineDateAndTime('', '18:30').getTime())).toBe(true)
    expect(Number.isNaN(combineDateAndTime('2026-07-15', '').getTime())).toBe(true)
  })
})
