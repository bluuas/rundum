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

export type Sport = {
  key: SportKey
  label: string
  /** Emoji stands in for an icon set; swap for SVGs without touching callers. */
  icon: string
  supportsDistance: boolean
  supportsPace: boolean
  /** Tailwind classes for the sport badge, light and dark safe. */
  badgeClass: string
}

export const SPORTS: readonly Sport[] = [
  {
    key: 'run',
    label: 'Running',
    icon: '🏃',
    supportsDistance: true,
    supportsPace: true,
    badgeClass: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200',
  },
  {
    key: 'ride',
    label: 'Cycling',
    icon: '🚴',
    supportsDistance: true,
    supportsPace: true,
    badgeClass: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200',
  },
  {
    key: 'walk',
    label: 'Walking',
    icon: '🚶',
    supportsDistance: true,
    supportsPace: false,
    badgeClass: 'bg-lime-100 text-lime-900 dark:bg-lime-950 dark:text-lime-200',
  },
  {
    key: 'hike',
    label: 'Hiking',
    icon: '🥾',
    supportsDistance: true,
    supportsPace: false,
    badgeClass:
      'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  },
  {
    key: 'workout',
    label: 'Workout',
    icon: '🤸',
    supportsDistance: false,
    supportsPace: false,
    badgeClass: 'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200',
  },
  {
    key: 'weight_training',
    label: 'Weight Training',
    icon: '🏋️',
    supportsDistance: false,
    supportsPace: false,
    badgeClass: 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
  },
  {
    key: 'swim',
    label: 'Swimming',
    icon: '🏊',
    supportsDistance: true,
    supportsPace: true,
    badgeClass: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200',
  },
  {
    key: 'yoga',
    label: 'Yoga',
    icon: '🧘',
    supportsDistance: false,
    supportsPace: false,
    badgeClass: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200',
  },
  {
    key: 'tennis',
    label: 'Tennis',
    icon: '🎾',
    supportsDistance: false,
    supportsPace: false,
    badgeClass: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200',
  },
  {
    key: 'padel',
    label: 'Padel',
    icon: '🥎',
    supportsDistance: false,
    supportsPace: false,
    badgeClass: 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200',
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
      icon: '•',
      supportsDistance: false,
      supportsPace: false,
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
