/**
 * The demo cast.
 *
 * Its own module because more than the seed script needs it: `verify-rls`
 * signs in as one of these accounts, and hard-coding an address there is how
 * that check came to be signing in as `noah@demo.rundum.app` for a day after
 * the cast was renamed A-H.
 */

/** Shared password for demo accounts. Development and demo only. */
export const DEMO_PASSWORD = 'rundum-demo-password'

/**
 * The demo cast, A-H so they are easy to tell apart in screenshots and tests.
 *
 * `key` is the identity: activities below name their organizer by key, and the
 * admin flag is set here. Nothing depends on the order of this array, so it can
 * be re-sorted or renamed without silently handing someone else's activities —
 * or admin rights — to a different person.
 */
export const DEMO_USER_KEYS = [
  'anouk',
  'basil',
  'clara',
  'dominic',
  'esther',
  'fabian',
  'gabriel',
  'hanna',
] as const

export type DemoUserKey = (typeof DEMO_USER_KEYS)[number]

export type DemoUser = {
  key: DemoUserKey
  email: string
  displayName: string
  stravaConnected: boolean
  bio: string
  /** Can open /insights. Exactly one demo user has this. */
  isAdmin?: boolean
}

export const DEMO_USERS: DemoUser[] = [
  {
    key: 'anouk',
    email: 'anouk@demo.rundum.app',
    displayName: 'Anouk A.',
    stravaConnected: true,
    bio: 'Trail runner. Happiest above 1500 m.',
    isAdmin: true,
  },
  {
    key: 'basil',
    email: 'basil@demo.rundum.app',
    displayName: 'Basil B.',
    stravaConnected: true,
    bio: 'Road cyclist, coffee stops mandatory.',
  },
  {
    key: 'clara',
    email: 'clara@demo.rundum.app',
    displayName: 'Clara C.',
    stravaConnected: false,
    bio: 'New in Schwyz, looking for a running group.',
  },
  {
    key: 'dominic',
    email: 'dominic@demo.rundum.app',
    displayName: 'Dominic D.',
    stravaConnected: true,
    bio: 'Padel most evenings. Always need a fourth.',
  },
  {
    key: 'esther',
    email: 'esther@demo.rundum.app',
    displayName: 'Esther E.',
    stravaConnected: false,
    bio: 'Yoga teacher. Slow mornings by the lake.',
  },
  {
    key: 'fabian',
    email: 'fabian@demo.rundum.app',
    displayName: 'Fabian F.',
    stravaConnected: true,
    bio: 'Swimming, hiking, and anything in the Muotatal.',
  },
  {
    key: 'gabriel',
    email: 'gabriel@demo.rundum.app',
    displayName: 'Gabriel G.',
    stravaConnected: true,
    bio: 'Weight training four times a week.',
  },
  {
    key: 'hanna',
    email: 'hanna@demo.rundum.app',
    displayName: 'Hanna H.',
    stravaConnected: false,
    bio: 'Walks the Lauerzersee loop most Sundays.',
  },
]
