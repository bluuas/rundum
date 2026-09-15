import { describe, expect, it } from 'vitest'
import { activityInputSchema } from './activity'

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
