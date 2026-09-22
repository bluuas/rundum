/**
 * Sport metadata for the MVP's ten sports.
 *
 * The database holds the same list in a `sports` lookup table (not an enum) so
 * sports can be added without a migration. This file is the client-side mirror:
 * labels, icons and which optional fields the create form should offer.
 *
 * `supportsDistance` / `supportsPace` drive conditional form fields — a yoga
 * session has no pace, a padel match has no distance.
 */

import type { IconName } from '@/lib/icons'

export const SPORT_KEYS = [
  'run',
  'ride',
  'walk',
  'hike',
  'workout',
  'weight_training',
  'swim',
  'yoga',
  'tennis',
  'padel',
] as const

export type SportKey = (typeof SPORT_KEYS)[number]

/**
 * How a sport talks about speed.
 *
 * The database stores one canonical number — seconds per kilometre — and this
 * decides how it is written and read back. Runners say "5:30 /km", cyclists
 * say "28 km/h", swimmers say "2:00 /100m", and each of those is nonsense to
 * the other two: a cyclist told their ride is "2:30 /km" has to do arithmetic
 * to find out whether that is fast.
 *
 * Presentation rather than storage, deliberately. One column means the filters
 * and the ordering keep working across sports, and adding a unit is a line
 * here instead of a migration.
 */
export type PaceUnit = 'min_per_km' | 'km_per_h' | 'min_per_100m'

export type Sport = {
  key: SportKey
  label: string
  /** Names an entry in `ICON_PATHS`; render it with `<Icon name={...} />`. */
  icon: IconName
  supportsDistance: boolean
  supportsPace: boolean
  /** Only meaningful when `supportsPace`. */
  paceUnit: PaceUnit
  /** Tailwind classes for the sport badge, light and dark safe. */
  badgeClass: string
}

/**
 * One neutral pill for every sport.
 *
 * Rundum used to give each sport its own hue. Against a monochrome palette ten
 * hues were the loudest thing on the screen and read as decoration rather than
 * as information, so the emoji and the name carry the sport instead. The token
 * stays per-sport rather than being inlined, so a single sport could be given
 * its own treatment later without touching every call site.
 */
const NEUTRAL_BADGE = 'bg-surface-muted text-fg-muted'

export const SPORTS: readonly Sport[] = [
  {
    key: 'run',
    label: 'Running',
    icon: 'person-simple-run',
    supportsDistance: true,
    supportsPace: true,
    paceUnit: 'min_per_km',
    badgeClass: NEUTRAL_BADGE,
  },
  {
    key: 'ride',
    label: 'Cycling',
    icon: 'person-simple-bike',
    supportsDistance: true,
    supportsPace: true,
    paceUnit: 'km_per_h',
    badgeClass: NEUTRAL_BADGE,
  },
  {
    key: 'walk',
    label: 'Walking',
    icon: 'person-simple-walk',
    supportsDistance: true,
    supportsPace: false,
    paceUnit: 'min_per_km',
    badgeClass: NEUTRAL_BADGE,
  },
  {
    key: 'hike',
    label: 'Hiking',
    icon: 'person-simple-hike',
    supportsDistance: true,
    supportsPace: false,
    paceUnit: 'min_per_km',
    badgeClass: NEUTRAL_BADGE,
  },
  {
    key: 'workout',
    label: 'Workout',
    icon: 'person-arms-spread',
    supportsDistance: false,
    supportsPace: false,
    paceUnit: 'min_per_km',
    badgeClass: NEUTRAL_BADGE,
  },
  {
    key: 'weight_training',
    label: 'Weight Training',
    icon: 'barbell',
    supportsDistance: false,
    supportsPace: false,
    paceUnit: 'min_per_km',
    badgeClass: NEUTRAL_BADGE,
  },
  {
    key: 'swim',
    label: 'Swimming',
    icon: 'person-simple-swim',
    supportsDistance: true,
    supportsPace: true,
    paceUnit: 'min_per_100m',
    badgeClass: NEUTRAL_BADGE,
  },
  {
    key: 'yoga',
    label: 'Yoga',
    icon: 'person-simple-tai-chi',
    supportsDistance: false,
    supportsPace: false,
    paceUnit: 'min_per_km',
    badgeClass: NEUTRAL_BADGE,
  },
  {
    key: 'tennis',
    label: 'Tennis',
    icon: 'tennis-ball',
    supportsDistance: false,
    supportsPace: false,
    paceUnit: 'min_per_km',
    badgeClass: NEUTRAL_BADGE,
  },
  {
    key: 'padel',
    label: 'Padel',
    icon: 'racquet',
    supportsDistance: false,
    supportsPace: false,
    paceUnit: 'min_per_km',
    badgeClass: NEUTRAL_BADGE,
  },
]

const SPORT_BY_KEY = new Map(SPORTS.map((sport) => [sport.key, sport]))

export function isSportKey(value: unknown): value is SportKey {
  return typeof value === 'string' && SPORT_BY_KEY.has(value as SportKey)
}

/** Returns the sport, or a neutral fallback so unknown keys never crash a page. */
export function getSport(key: string): Sport {
  return (
    SPORT_BY_KEY.get(key as SportKey) ?? {
      key: key as SportKey,
      label: key,
      icon: 'circle',
      supportsDistance: false,
      supportsPace: false,
      paceUnit: 'min_per_km',
      badgeClass: 'bg-surface-muted text-fg-muted',
    }
  )
}

/** Experience level, shared by every sport. */
export const LEVELS = ['beginner', 'intermediate', 'advanced', 'all_levels'] as const
export type Level = (typeof LEVELS)[number]

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  all_levels: 'All levels',
}
