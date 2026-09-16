/**
 * Seeds demo users and activities around Schwyz.
 *
 * Uses the service-role key, and creates accounts whose password is printed
 * below, so `assertSeedable` decides what it is allowed to talk to: the local
 * stack, or the published demo after an explicit confirmation. Nothing else.
 * Idempotent: re-running updates the same demo accounts rather than
 * duplicating them.
 *
 *   npm run db:seed        # local
 *   npm run db:seed:demo   # the published demo
 */
import { createClient } from '@supabase/supabase-js'
import { DEMO_PASSWORD, DEMO_USERS, DEMO_USER_KEYS, type DemoUserKey } from './demo-cast'
import { assertSeedable, loadEnv } from './target'

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Copy .env.example to .env.local and fill them in.',
  )
  process.exit(1)
}

const target = assertSeedable(SUPABASE_URL)

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

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
  owner: DemoUserKey
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
  /** null means no limit. */
  maxParticipants: number | null
  status?: 'published' | 'cancelled' | 'hidden'
}

const DEMO_ACTIVITIES: DemoActivity[] = [
  {
    owner: 'anouk',
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
    owner: 'anouk',
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
    owner: 'clara',
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
    owner: 'clara',
    sport: 'run',
    title: 'After-work 5k, all paces',
    description: 'Short and social. We split into two groups if the spread is wide.',
    place: 'hauptplatz',
    inHours: 6,
    radiusKm: 15,
    distanceM: 5000,
    paceSecondsPerKm: 360,
    level: 'all_levels',
    maxParticipants: null,
  },

  {
    owner: 'basil',
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
    owner: 'basil',
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
    owner: 'gabriel',
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
    owner: 'hanna',
    sport: 'walk',
    title: 'Sunday walk around the Lauerzersee',
    description: 'Two hours at a gentle pace. Dogs welcome, kids welcome.',
    place: 'lauerz',
    inHours: 90,
    radiusKm: 25,
    distanceM: 7000,
    level: 'all_levels',
    maxParticipants: null,
  },
  {
    owner: 'hanna',
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
    owner: 'fabian',
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
    owner: 'fabian',
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
    owner: 'anouk',
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
    owner: 'gabriel',
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
    owner: 'gabriel',
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
    owner: 'gabriel',
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
    owner: 'gabriel',
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
    owner: 'fabian',
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
    owner: 'fabian',
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
    owner: 'esther',
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
    owner: 'esther',
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
    owner: 'esther',
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
    owner: 'dominic',
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
    owner: 'dominic',
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
    owner: 'dominic',
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
    owner: 'dominic',
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
    owner: 'basil',
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
    owner: 'anouk',
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
    owner: 'basil',
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
    owner: 'clara',
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
    owner: 'esther',
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

  // The key list and the cast must line up; a typo would otherwise surface as
  // an activity with no organizer.
  for (const key of DEMO_USER_KEYS) {
    if (!DEMO_USERS.some((demo) => demo.key === key)) {
      throw new Error(`No demo user for key "${key}"`)
    }
  }

  // A rename leaves the previous cast behind: same demo domain, no longer in
  // DEMO_USERS. They would keep their activities and keep showing up in the
  // feed next to their replacements, so they go. Scoped to the demo domain so
  // a real account on the same project is never touched.
  const demoEmails = new Set(DEMO_USERS.map((demo) => demo.email))
  const stale = (existingList?.users ?? []).filter(
    (user) => user.email?.endsWith('@demo.rundum.app') && !demoEmails.has(user.email),
  )
  for (const user of stale) {
    // profiles cascades from auth.users, and activities cascade from profiles.
    const { error } = await supabase.auth.admin.deleteUser(user.id)
    if (error) throw error
    console.log(`  removed stale demo account ${user.email}`)
  }

  const userIds: string[] = []
  const userIdByKey = new Map<DemoUserKey, string>()

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

    userIdByKey.set(demo.key, userIds[userIds.length - 1])

    // The handle_new_user trigger created the profile; fill in the rest.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        display_name: demo.displayName,
        bio: demo.bio,
        strava_connected: demo.stravaConnected,
        city_id: city.id,
        // One demo account can open /insights. Without one, the metrics page
        // would be unreachable in a fresh checkout and so never looked at.
        is_admin: demo.isAdmin === true,
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
      owner_id: userIdByKey.get(activity.owner)!,
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

  // Every join state appears somewhere in the seed, so each branch of the join
  // UI — waiting, in, declined — can be seen without first creating it by hand.
  const joinRows = joinable.slice(0, 12).flatMap((activity, index) => {
    const candidates = userIds.filter((id) => id !== activity.owner_id)
    const rows: Array<{
      activity_id: string
      user_id: string
      status: 'pending' | 'approved' | 'declined'
      message: string
      decided_at: string | null
    }> = [
      {
        activity_id: activity.id,
        user_id: candidates[index % candidates.length],
        status: 'approved',
        message: 'Looking forward to it.',
        decided_at: new Date().toISOString(),
      },
      {
        activity_id: activity.id,
        user_id: candidates[(index + 1) % candidates.length],
        status: index % 3 === 0 ? 'pending' : 'approved',
        message: 'Is the pace flexible?',
        decided_at: index % 3 === 0 ? null : new Date().toISOString(),
      },
    ]

    if (index % 4 === 0 && candidates.length > 2) {
      rows.push({
        activity_id: activity.id,
        user_id: candidates[(index + 2) % candidates.length],
        status: 'declined',
        message: 'Can I join even though I am much slower?',
        decided_at: new Date().toISOString(),
      })
    }

    return rows
  })

  const { error: joinError } = await supabase.from('join_requests').insert(joinRows)
  if (joinError) throw joinError
  console.log(`  ${joinRows.length} join requests created`)

  // --- Analytics events ---------------------------------------------------
  // The seed inserts activities directly rather than through the Server Action,
  // so the activity_created events that action would have written do not exist.
  // Without them /insights reads zero against thirty visible activities, which
  // looks like a broken metric rather than an unseeded one.
  //
  // Backdated across two weeks so the daily chart has a shape.
  await supabase
    .from('activity_events')
    .delete()
    .eq('event_type', 'activity_created')
    .in('user_id', userIds)

  const eventRows = (inserted ?? []).map((activity, index) => ({
    event_type: 'activity_created',
    activity_id: activity.id,
    user_id: activity.owner_id,
    created_at: new Date(
      Date.now() - ((index * 11) % 14) * 86_400_000 - (index % 7) * 3_600_000,
    ).toISOString(),
    metadata: {},
  }))

  const { error: eventError } = await supabase.from('activity_events').insert(eventRows)
  if (eventError) throw eventError
  console.log(`  ${eventRows.length} analytics events created`)

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

  console.log(
    `\nDone (${target}). Sign in as any demo user with the dev switcher, or with`,
  )
  const admin = DEMO_USERS.find((demo) => demo.isAdmin) ?? DEMO_USERS[0]
  console.log(`  ${admin.email} / ${DEMO_PASSWORD}\n`)
}

main().catch((error) => {
  console.error('\nSeeding failed:', error.message ?? error)
  process.exit(1)
})
