/**
 * Geo helpers — and the privacy chokepoint of the app.
 *
 * Rundum never stores or displays an exact personal location. Two rules are
 * enforced here, and every coordinate that reaches the database goes through
 * `snapToGrid` first:
 *
 *   1. Coordinates are snapped to a ~250 m grid, so a meeting point can never
 *      identify a building, let alone a home address.
 *   2. Distances shown to users are bucketed ("~3 km"), never exact, so that
 *      several readings cannot be trilaterated back to a precise point.
 */

export type LatLng = {
  lat: number
  lng: number
}

/** Grid cell size in metres. Coarse enough to hide an address, fine enough to be useful. */
export const LOCATION_GRID_M = 250

/** Metres per degree of latitude (near enough for a 250 m grid). */
const M_PER_DEG_LAT = 111_320

/** Launch city. Multi-city support lives in the `cities` table; this is the fallback. */
export const DEFAULT_CITY_CENTER: LatLng = { lat: 47.0207, lng: 8.653 }

/**
 * Schwyz is a small town, so a big-city 5 km default would show an empty feed.
 * 25 km reaches Brunnen, Ibach, Seewen, Küssnacht and the Lauerzersee.
 */
export const DEFAULT_RADIUS_M = 25_000

export const RADIUS_OPTIONS_M = [5_000, 10_000, 25_000, 50_000] as const

/**
 * Snaps a coordinate to the nearest ~250 m grid cell centre.
 *
 * Longitude degrees shrink with latitude, so the longitude step is scaled by
 * cos(lat) to keep cells roughly square. The scaling uses the *snapped*
 * latitude, which makes the function idempotent: snapping an already-snapped
 * point returns the same point.
 */
export function snapToGrid(point: LatLng, gridMeters = LOCATION_GRID_M): LatLng {
  const latStep = gridMeters / M_PER_DEG_LAT
  const snappedLat = Math.round(point.lat / latStep) * latStep

  // Guard the poles, where cos() collapses and the longitude step explodes.
  const cosLat = Math.max(Math.cos(toRadians(snappedLat)), 0.01)
  const lngStep = gridMeters / (M_PER_DEG_LAT * cosLat)
  const snappedLng = Math.round(point.lng / lngStep) * lngStep

  return {
    lat: roundTo(snappedLat, 6),
    lng: roundTo(normalizeLongitude(snappedLng), 6),
  }
}

/** Great-circle distance in metres. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const earthRadiusM = 6_371_000
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)

  return 2 * earthRadiusM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Bucketed distance label for the feed: deliberately imprecise.
 *
 * Under 1 km is collapsed entirely rather than reported, because at close range
 * an exact figure is the most revealing.
 */
export function formatDistanceBucket(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return ''
  if (meters < 1_000) return 'under 1 km'
  if (meters < 10_000) return `~${roundTo(meters / 1_000, 1).toLocaleString('en-CH')} km`
  return `~${Math.round(meters / 1_000)} km`
}

/** Radius label for filters and the visibility picker — exact, since the user chose it. */
export function formatRadius(meters: number): string {
  return meters < 1_000 ? `${meters} m` : `${Math.round(meters / 1_000)} km`
}

/** Route length as entered by the organizer, e.g. "10.5 km". Not a location. */
export function formatActivityDistance(meters: number | null | undefined): string | null {
  if (meters == null || !Number.isFinite(meters) || meters <= 0) return null
  const km = meters / 1_000
  const decimals = km < 10 ? 1 : 0
  return `${km.toFixed(decimals)} km`
}

/** Pace as "5:30 /km". */
export function formatPace(secondsPerKm: number | null | undefined): string | null {
  if (secondsPerKm == null || !Number.isFinite(secondsPerKm) || secondsPerKm <= 0) {
    return null
  }
  const total = Math.round(secondsPerKm)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`
}

/** Parses "5:30" into seconds per km. Returns null for anything malformed. */
export function parsePace(input: string): number | null {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(input.trim())
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  // +0 avoids a literal "-0" reaching the database or a snapshot test.
  return Math.round(value * factor) / factor + 0
}

/** Keeps longitude in [-180, 180) after snapping near the antimeridian. */
function normalizeLongitude(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180
}
