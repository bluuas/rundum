/**
 * Seeds demo users and activities around Schwyz.
 *
 * Uses the service-role key, so it must only ever run against a development
 * project. Idempotent: re-running updates the same demo accounts rather than
 * duplicating them.
 *
 *   npm run db:seed
 */
import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local', quiet: true })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Copy .env.example to .env.local and fill them in.',
  )
  process.exit(1)
}

if (SUPABASE_URL.includes('.supabase.co') && process.env.SEED_CONFIRM_REMOTE !== 'yes') {
  console.warn(`\nAbout to seed demo data into ${SUPABASE_URL}`)
  console.warn(
    'This is a hosted project. Re-run with SEED_CONFIRM_REMOTE=yes to proceed.\n',
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/** Shared password for demo accounts. Development only — never used in production. */
const DEMO_PASSWORD = 'rundum-demo-password'

type DemoUser = {
  email: string
  displayName: string
  stravaConnected: boolean
  bio: string
}

const DEMO_USERS: DemoUser[] = [
  {
    email: 'mara@demo.rundum.app',
    displayName: 'Mara K.',
    stravaConnected: true,
    bio: 'Trail runner. Happiest above 1500 m.',
  },
  {
    email: 'tobias@demo.rundum.app',
    displayName: 'Tobias R.',
    stravaConnected: true,
    bio: 'Road cyclist, coffee stops mandatory.',
  },
  {
    email: 'anouk@demo.rundum.app',
    displayName: 'Anouk B.',
    stravaConnected: false,
    bio: 'New in Schwyz, looking for a running group.',
  },
  {
    email: 'luca@demo.rundum.app',
    displayName: 'Luca F.',
    stravaConnected: true,
    bio: 'Padel most evenings. Always need a fourth.',
  },
  {
    email: 'sofia@demo.rundum.app',
    displayName: 'Sofia M.',
    stravaConnected: false,
    bio: 'Yoga teacher. Slow mornings by the lake.',
  },
  {
    email: 'jonas@demo.rundum.app',
    displayName: 'Jonas W.',
    stravaConnected: true,
    bio: 'Swimming, hiking, and anything in the Muotatal.',
  },
  {
    email: 'elif@demo.rundum.app',
    displayName: 'Elif D.',
    stravaConnected: true,
    bio: 'Weight training four times a week.',
  },
  {
    email: 'noah@demo.rundum.app',
    displayName: 'Noah S.',
    stravaConnected: false,
    bio: 'Walks the Lauerzersee loop most Sundays.',
  },
]

/** Meeting areas around Schwyz. Deliberately coarse; the DB snaps them anyway. */
const PLACES = {
  hauptplatz: { label: 'Hauptplatz Schwyz', lat: 47.0207, lng: 8.653 },
  ibach: { label: 'Ibach', lat: 47.0055, lng: 8.639 },
  seewen: { label: 'Seewen', lat: 47.0246, lng: 8.612 },
  brunnen: { label: 'Brunnen waterfront', lat: 46.9967, lng: 8.6047 },
  kuessnacht: { label: 'Küssnacht am Rigi', lat: 47.0856, lng: 8.4419 },
  lauerz: { label: 'Lauerzersee', lat: 47.027, lng: 8.568 },
  steinen: { label: 'Steinen', lat: 47.02, lng: 8.558 },
  muotathal: { label: 'Muotathal', lat: 46.979, lng: 8.766 },
  goldau: { label: 'Goldau', lat: 47.048, lng: 8.548 },
  arth: { label: 'Arth am See', lat: 47.062, lng: 8.522 },
  gersau: { label: 'Gersau', lat: 46.995, lng: 8.528 },
  rickenbach: { label: 'Rickenbach', lat: 47.027, lng: 8.672 },
  morschach: { label: 'Morschach', lat: 46.98, lng: 8.62 },
  sattel: { label: 'Sattel', lat: 47.077, lng: 8.636 },
} as const

type PlaceKey = keyof typeof PLACES

type DemoActivity = {
  owner: number
  sport: string
  title: string
  description: string
  place: PlaceKey
  /** Hours from now. Negative values are already archived. */
  inHours: number
  radiusKm: number
  distanceM?: number
  paceSecondsPerKm?: number
  level?: 'beginner' | 'intermediate' | 'advanced' | 'all_levels'
  maxParticipants: number
  status?: 'published' | 'cancelled' | 'hidden'
}

const DEMO_ACTIVITIES: DemoActivity[] = [
  {
    owner: 0,
    sport: 'run',
    title: 'Easy morning loop around Ibach',
    description:
      'Flat and conversational. We regroup at every corner, nobody gets dropped.',
    place: 'ibach',
    inHours: 14,
    radiusKm: 25,
    distanceM: 8000,
    paceSecondsPerKm: 330,
    level: 'beginner',
    maxParticipants: 12,
  },
  {
    owner: 0,
    sport: 'run',
    title: 'Hill repeats up to Rickenbach',
    description: 'Six by three minutes uphill, jog back down. Bring a jacket for after.',
    place: 'rickenbach',
    inHours: 38,
    radiusKm: 25,
    distanceM: 12000,
    paceSecondsPerKm: 285,
    level: 'advanced',
    maxParticipants: 8,
  },
  {
    owner: 2,
    sport: 'run',
    title: 'Sunday long run, Lauerzersee loop',
    description:
      'Full loop of the lake at an easy pace. About two hours including a stop.',
    place: 'lauerz',
    inHours: 96,
    radiusKm: 50,
    distanceM: 21000,
    paceSecondsPerKm: 345,
    level: 'intermediate',
    maxParticipants: 10,
  },
  {
    owner: 2,
    sport: 'run',
    title: 'After-work 5k, all paces',
    description: 'Short and social. We split into two groups if the spread is wide.',
    place: 'hauptplatz',
    inHours: 6,
    radiusKm: 15,
    distanceM: 5000,
    paceSecondsPerKm: 360,
    level: 'all_levels',
    maxParticipants: 20,
  },

  {
    owner: 1,
    sport: 'ride',
    title: 'Rigi climb from Goldau',
    description: 'Steady climb, no racing. Regroup at the top before the descent.',
    place: 'goldau',
    inHours: 30,
    radiusKm: 50,
    distanceM: 42000,
    paceSecondsPerKm: 180,
    level: 'intermediate',
    maxParticipants: 8,
  },
  {
    owner: 1,
    sport: 'ride',
    title: 'Lakeside spin to Gersau and back',
    description: 'Flat, about two hours, coffee in Gersau. Road bikes.',
    place: 'brunnen',
    inHours: 54,
    radiusKm: 30,
    distanceM: 55000,
    paceSecondsPerKm: 150,
    level: 'all_levels',
    maxParticipants: 10,
  },
  {
    owner: 6,
    sport: 'ride',
    title: 'Gravel through the Muotatal',
    description: 'Mixed surface, some loose sections. Tyres 38mm and up.',
    place: 'muotathal',
    inHours: 120,
    radiusKm: 50,
    distanceM: 48000,
    level: 'advanced',
    maxParticipants: 6,
  },

  {
    owner: 7,
    sport: 'walk',
    title: 'Sunday walk around the Lauerzersee',
    description: 'Two hours at a gentle pace. Dogs welcome, kids welcome.',
    place: 'lauerz',
    inHours: 90,
    radiusKm: 25,
    distanceM: 7000,
    level: 'all_levels',
    maxParticipants: 15,
  },
  {
    owner: 7,
    sport: 'walk',
    title: 'Evening stroll along the Brunnen waterfront',
    description: 'Short and flat, finishing at the gelateria.',
    place: 'brunnen',
    inHours: 10,
    radiusKm: 20,
    distanceM: 4000,
    level: 'beginner',
    maxParticipants: 12,
  },

  {
    owner: 5,
    sport: 'hike',
    title: 'Fronalpstock sunrise hike',
    description: 'Early start, head torch needed for the first hour. Down by cable car.',
    place: 'morschach',
    inHours: 46,
    radiusKm: 50,
    distanceM: 11000,
    level: 'advanced',
    maxParticipants: 8,
  },
  {
    owner: 5,
    sport: 'hike',
    title: 'Stoos ridge, easy half day',
    description: 'Well-marked ridge path with a long lunch stop. No exposure.',
    place: 'morschach',
    inHours: 160,
    radiusKm: 50,
    distanceM: 9000,
    level: 'intermediate',
    maxParticipants: 10,
  },
  {
    owner: 0,
    sport: 'hike',
    title: 'Sattel to Mostelberg family hike',
    description: 'Short, shaded, and a playground at the top.',
    place: 'sattel',
    inHours: 200,
    radiusKm: 30,
    distanceM: 6000,
    level: 'beginner',
    maxParticipants: 16,
  },

  {
    owner: 6,
    sport: 'workout',
    title: 'Outdoor circuit at the Hauptplatz',
    description: 'Bodyweight circuit, 40 on 20 off, six rounds. Bring a mat.',
    place: 'hauptplatz',
    inHours: 22,
    radiusKm: 15,
    level: 'all_levels',
    maxParticipants: 14,
  },
  {
    owner: 6,
    sport: 'workout',
    title: 'Stair intervals in Seewen',
    description: 'Thirty minutes of stairs. Harder than it sounds.',
    place: 'seewen',
    inHours: 70,
    radiusKm: 20,
    level: 'intermediate',
    maxParticipants: 10,
  },

  {
    owner: 6,
    sport: 'weight_training',
    title: 'Pull day, open to anyone',
    description: 'Happy to spot and to show the basics if you are starting out.',
    place: 'ibach',
    inHours: 26,
    radiusKm: 15,
    level: 'intermediate',
    maxParticipants: 4,
  },
  {
    owner: 6,
    sport: 'weight_training',
    title: 'Squat session, early evening',
    description: 'Working sets around 5x5. Bring your own belt.',
    place: 'ibach',
    inHours: 98,
    radiusKm: 15,
    level: 'advanced',
    maxParticipants: 3,
  },

  {
    owner: 5,
    sport: 'swim',
    title: 'Open water swim at Lauerzersee',
    description: 'About 1500 m along the shore. Bring a tow float.',
    place: 'lauerz',
    inHours: 34,
    radiusKm: 30,
    distanceM: 1500,
    paceSecondsPerKm: 1500,
    level: 'intermediate',
    maxParticipants: 8,
  },
  {
    owner: 5,
    sport: 'swim',
    title: 'Lake swim and breakfast in Arth',
    description: 'Short swim, long breakfast. The better ratio.',
    place: 'arth',
    inHours: 106,
    radiusKm: 30,
    distanceM: 800,
    level: 'beginner',
    maxParticipants: 10,
  },

  {
    owner: 4,
    sport: 'yoga',
    title: 'Sunrise yoga by the lake',
    description: 'Slow flow, 60 minutes, suitable for complete beginners. Mats provided.',
    place: 'brunnen',
    inHours: 18,
    radiusKm: 25,
    level: 'beginner',
    maxParticipants: 12,
  },
  {
    owner: 4,
    sport: 'yoga',
    title: 'Evening yin in Steinen',
    description: 'Long holds, quiet room, no experience needed.',
    place: 'steinen',
    inHours: 62,
    radiusKm: 20,
    level: 'all_levels',
    maxParticipants: 10,
  },
  {
    owner: 4,
    sport: 'yoga',
    title: 'Post-run mobility, 30 minutes',
    description: 'Hips and calves, straight after the Thursday group run.',
    place: 'hauptplatz',
    inHours: 42,
    radiusKm: 15,
    level: 'all_levels',
    maxParticipants: 15,
  },

  {
    owner: 3,
    sport: 'tennis',
    title: 'Doubles in Seewen, two spots left',
    description: 'Friendly doubles, mixed levels. Balls provided.',
    place: 'seewen',
    inHours: 28,
    radiusKm: 20,
    level: 'intermediate',
    maxParticipants: 4,
  },
  {
    owner: 3,
    sport: 'tennis',
    title: 'Saturday hitting session',
    description: 'Just rallying and drills, no matches. Good for rebuilding consistency.',
    place: 'kuessnacht',
    inHours: 78,
    radiusKm: 40,
    level: 'beginner',
    maxParticipants: 2,
  },

  {
    owner: 3,
    sport: 'padel',
    title: 'Padel, need a fourth',
    description: 'Two hours booked. Intermediate level, quick rotation.',
    place: 'kuessnacht',
    inHours: 12,
    radiusKm: 40,
    level: 'intermediate',
    maxParticipants: 4,
  },
  {
    owner: 3,
    sport: 'padel',
    title: 'Beginner padel evening',
    description:
      'Never played? Perfect. We go through the basics for the first half hour.',
    place: 'goldau',
    inHours: 50,
    radiusKm: 40,
    level: 'beginner',
    maxParticipants: 8,
  },
  {
    owner: 1,
    sport: 'padel',
    title: 'Sunday morning padel ladder',
    description: 'Rotating pairs, everyone plays everyone. Three hours.',
    place: 'kuessnacht',
    inHours: 140,
    radiusKm: 40,
    level: 'all_levels',
    maxParticipants: 8,
  },

  // Edge states, so the UI gets exercised beyond the happy path.
  {
    owner: 0,
    sport: 'run',
    title: 'Cancelled: track session in Ibach',
    description: 'Track is closed for maintenance. Rescheduling for next week.',
    place: 'ibach',
    inHours: 20,
    radiusKm: 25,
    distanceM: 10000,
    level: 'advanced',
    maxParticipants: 10,
    status: 'cancelled',
  },
  {
    owner: 1,
    sport: 'ride',
    title: 'Draft: club ride, route not final',
    description: 'Hidden while I work out the route.',
    place: 'steinen',
    inHours: 200,
    radiusKm: 50,
    distanceM: 70000,
    level: 'advanced',
    maxParticipants: 12,
    status: 'hidden',
  },
  {
    owner: 2,
    sport: 'run',
    title: 'Last week: easy 10k',
    description: 'This one has already happened and should be archived.',
    place: 'hauptplatz',
    inHours: -120,
    radiusKm: 25,
    distanceM: 10000,
    paceSecondsPerKm: 340,
    level: 'all_levels',
    maxParticipants: 10,
  },
  {
    owner: 4,
    sport: 'yoga',
    title: 'Yesterday: lunchtime flow',
    description: 'Archived, kept so the past view has something in it.',
    place: 'seewen',
    inHours: -26,
    radiusKm: 20,
    level: 'all_levels',
    maxParticipants: 12,
  },
]

async function main() {
  console.log('Seeding demo data…\n')

  const { data: city, error: cityError } = await supabase
    .from('cities')
    .select('id')
    .eq('slug', 'schwyz')
    .single()

  if (cityError || !city) {
    throw new Error(
      'City "schwyz" not found. Run `npm run db:push` first so the migrations create it.',
    )
  }

  // --- Users --------------------------------------------------------------
  const { data: existingList } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const existingByEmail = new Map(
    (existingList?.users ?? []).map((user) => [user.email ?? '', user.id]),
  )

  const userIds: string[] = []

  for (const demo of DEMO_USERS) {
    const existingId = existingByEmail.get(demo.email)

    if (existingId) {
      userIds.push(existingId)
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: demo.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          display_name: demo.displayName,
          strava_connected: demo.stravaConnected,
        },
      })
      if (error || !data.user) throw error ?? new Error(`Could not create ${demo.email}`)
      userIds.push(data.user.id)
    }

    // The handle_new_user trigger created the profile; fill in the rest.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        display_name: demo.displayName,
        bio: demo.bio,
        strava_connected: demo.stravaConnected,
        city_id: city.id,
      })
      .eq('id', userIds[userIds.length - 1])

    if (profileError) throw profileError
  }

  console.log(`  ${userIds.length} demo users ready`)

  // --- Activities ---------------------------------------------------------
  // Replace rather than append, so re-seeding does not pile up duplicates.
  const { error: clearError } = await supabase
    .from('activities')
    .delete()
    .in('owner_id', userIds)
  if (clearError) throw clearError

  const rows = DEMO_ACTIVITIES.map((activity) => {
    const place = PLACES[activity.place]
    return {
      owner_id: userIds[activity.owner],
      city_id: city.id,
      sport_key: activity.sport,
      title: activity.title,
      description: activity.description,
      starts_at: new Date(Date.now() + activity.inHours * 3_600_000).toISOString(),
      // The database trigger snaps this to the 250 m grid on insert.
      meeting_point: `SRID=4326;POINT(${place.lng} ${place.lat})`,
      location_label: place.label,
      visibility_radius_m: activity.radiusKm * 1000,
      distance_m: activity.distanceM ?? null,
      pace_seconds_per_km: activity.paceSecondsPerKm ?? null,
      level: activity.level ?? null,
      max_participants: activity.maxParticipants,
      status: activity.status ?? 'published',
    }
  })

  const { data: inserted, error: insertError } = await supabase
    .from('activities')
    .insert(rows)
    .select('id, owner_id, status')

  if (insertError) throw insertError
  console.log(`  ${inserted?.length ?? 0} activities created`)

  // --- Join requests and comments ----------------------------------------
  const joinable = (inserted ?? []).filter((row) => row.status === 'published')

  const joinRows = joinable.slice(0, 12).flatMap((activity, index) => {
    const candidates = userIds.filter((id) => id !== activity.owner_id)
    return [
      {
        activity_id: activity.id,
        user_id: candidates[index % candidates.length],
        status: 'approved' as const,
        message: 'Looking forward to it.',
      },
      {
        activity_id: activity.id,
        user_id: candidates[(index + 1) % candidates.length],
        status: index % 3 === 0 ? ('pending' as const) : ('approved' as const),
        message: 'Is the pace flexible?',
      },
    ]
  })

  const { error: joinError } = await supabase.from('join_requests').insert(joinRows)
  if (joinError) throw joinError
  console.log(`  ${joinRows.length} join requests created`)

  const commentBodies = [
    'Is this still going ahead if it rains?',
    'Count me in, I will be there ten minutes early.',
    'What is the plan if the group splits?',
    'Perfect timing, I have been looking for exactly this.',
    'Can I bring a friend along?',
  ]

  const commentRows = joinable.slice(0, 10).flatMap((activity, index) => {
    const candidates = userIds.filter((id) => id !== activity.owner_id)
    return [
      {
        activity_id: activity.id,
        author_id: candidates[index % candidates.length],
        body: commentBodies[index % commentBodies.length],
      },
      {
        activity_id: activity.id,
        author_id: activity.owner_id,
        body: 'Yes, we go ahead in any weather unless there is a storm warning.',
      },
    ]
  })

  const { error: commentError } = await supabase.from('comments').insert(commentRows)
  if (commentError) throw commentError
  console.log(`  ${commentRows.length} comments created`)

  console.log(`\nDone. Sign in as any demo user with the dev switcher, or with`)
  console.log(`  ${DEMO_USERS[0].email} / ${DEMO_PASSWORD}\n`)
}

main().catch((error) => {
  console.error('\nSeeding failed:', error.message ?? error)
  process.exit(1)
})
