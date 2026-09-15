import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CITY_CENTER,
  LOCATION_GRID_M,
  formatActivityDistance,
  formatDistanceBucket,
  formatPace,
  formatRadius,
  haversineMeters,
  parsePace,
  snapToGrid,
} from './geo'

describe('snapToGrid', () => {
  it('collapses every point within a cell onto that cell, discarding the detail', () => {
    // A snapped point is a cell centre, so small offsets around it stay inside
    // the same cell. This is the privacy property: exact position within a cell
    // is unrecoverable. (Points either side of a cell *boundary* still differ —
    // a grid bounds the error, it does not merge all neighbours.)
    const cell = snapToGrid(DEFAULT_CITY_CENTER)

    for (const [dLat, dLng] of [
      [0.0005, 0.0007],
      [-0.0005, -0.0007],
      [0.0009, -0.0003],
    ]) {
      expect(snapToGrid({ lat: cell.lat + dLat, lng: cell.lng + dLng })).toEqual(cell)
    }
  })

  it('keeps points further than a grid cell apart distinguishable', () => {
    const a = snapToGrid(DEFAULT_CITY_CENTER)
    const b = snapToGrid({
      lat: DEFAULT_CITY_CENTER.lat + 0.02,
      lng: DEFAULT_CITY_CENTER.lng,
    })

    expect(b).not.toEqual(a)
  })

  it('is idempotent, so re-saving an activity never drifts the location', () => {
    const once = snapToGrid({ lat: 47.01873, lng: 8.66119 })
    const twice = snapToGrid(once)

    expect(twice).toEqual(once)
  })

  it('never moves a point further than one grid cell', () => {
    const original = { lat: 47.01873, lng: 8.66119 }
    const snapped = snapToGrid(original)

    expect(haversineMeters(original, snapped)).toBeLessThan(LOCATION_GRID_M)
  })

  it('does not leak precision beyond the grid resolution', () => {
    const snapped = snapToGrid({ lat: 47.0207123456, lng: 8.6530123456 })

    expect(snapped.lat.toString()).toMatch(/^-?\d+(\.\d{1,6})?$/)
    expect(snapped.lng.toString()).toMatch(/^-?\d+(\.\d{1,6})?$/)
  })
})

describe('haversineMeters', () => {
  it('is zero for identical points', () => {
    expect(haversineMeters(DEFAULT_CITY_CENTER, DEFAULT_CITY_CENTER)).toBe(0)
  })

  it('matches a known distance — Schwyz to Brunnen is roughly 4 km', () => {
    const brunnen = { lat: 46.9967, lng: 8.6047 }
    const meters = haversineMeters(DEFAULT_CITY_CENTER, brunnen)

    expect(meters).toBeGreaterThan(3_500)
    expect(meters).toBeLessThan(4_800)
  })
})

describe('formatDistanceBucket', () => {
  it('refuses to be precise at close range', () => {
    expect(formatDistanceBucket(120, 'en')).toBe('under 1 km')
    expect(formatDistanceBucket(999, 'en')).toBe('under 1 km')
  })

  it('translates the close-range label but not the numbers', () => {
    expect(formatDistanceBucket(120, 'de')).toBe('unter 1 km')
    // Numeric buckets are identical in every language.
    expect(formatDistanceBucket(2_540, 'de')).toBe('~2.5 km')
    expect(formatDistanceBucket(14_400, 'de')).toBe('~14 km')
  })

  it('rounds to 100 m between 1 and 10 km', () => {
    expect(formatDistanceBucket(2_540)).toBe('~2.5 km')
  })

  it('rounds to whole kilometres above 10 km', () => {
    expect(formatDistanceBucket(14_400)).toBe('~14 km')
  })

  it('returns an empty label rather than NaN for bad input', () => {
    expect(formatDistanceBucket(Number.NaN)).toBe('')
    expect(formatDistanceBucket(-1)).toBe('')
  })
})

describe('formatRadius', () => {
  it('formats metres and kilometres', () => {
    expect(formatRadius(500)).toBe('500 m')
    expect(formatRadius(25_000)).toBe('25 km')
  })
})

describe('formatActivityDistance', () => {
  it('shows one decimal below 10 km and none above', () => {
    expect(formatActivityDistance(5_000)).toBe('5.0 km')
    expect(formatActivityDistance(21_097)).toBe('21 km')
  })

  it('returns null when the organizer left it blank', () => {
    expect(formatActivityDistance(null)).toBeNull()
    expect(formatActivityDistance(0)).toBeNull()
  })
})

describe('pace', () => {
  it('formats seconds per km', () => {
    expect(formatPace(330)).toBe('5:30 /km')
    expect(formatPace(305)).toBe('5:05 /km')
  })

  it('round-trips through parsePace', () => {
    expect(parsePace('5:30')).toBe(330)
    expect(formatPace(parsePace('4:05'))).toBe('4:05 /km')
  })

  it('rejects malformed input', () => {
    expect(parsePace('5:99')).toBeNull()
    expect(parsePace('abc')).toBeNull()
    expect(parsePace('530')).toBeNull()
  })
})
