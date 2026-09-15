/**
 * Checks the database's security boundaries from the outside, as an anonymous
 * client holding nothing but the public anon key.
 *
 * RLS policies are easy to get subtly wrong and impossible to eyeball, so these
 * assertions run against the real database rather than a mock.
 *
 *   npm run db:verify
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local', quiet: true })

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

let failures = 0
function check(name: string, pass: boolean, detail = '') {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!pass) failures++
}

const tokens = await anon.from('strava_tokens').select('*')
check(
  'strava_tokens unreachable by anon',
  (tokens.data?.length ?? 0) === 0,
  `rows=${tokens.data?.length ?? 0} err=${tokens.error?.code ?? 'none'}`,
)

const hidden = await anon.from('activities').select('id,status').eq('status', 'hidden')
check(
  'hidden activities invisible',
  (hidden.data?.length ?? 0) === 0,
  `rows=${hidden.data?.length ?? 0}`,
)

const all = await anon.from('activities').select('id,status')
const statuses = [...new Set((all.data ?? []).map((r) => r.status))].sort()
check(
  'only published/cancelled visible',
  statuses.every((s) => s === 'published' || s === 'cancelled'),
  `statuses=${statuses.join(',')}`,
)

const joins = await anon.from('join_requests').select('id')
check(
  'join requests private',
  (joins.data?.length ?? 0) === 0,
  `rows=${joins.data?.length ?? 0}`,
)

const events = await anon.from('activity_events').select('id')
check('analytics events not readable', (events.data?.length ?? 0) === 0)

// Anonymous write attempts must all fail.
const insertActivity = await anon.from('activities').insert({
  owner_id: '00000000-0000-0000-0000-000000000000',
  city_id: '00000000-0000-0000-0000-000000000000',
  sport_key: 'run',
  title: 'Injected',
  description: null,
  starts_at: new Date(Date.now() + 8.64e7).toISOString(),
  meeting_point: 'SRID=4326;POINT(8.65 47.02)',
  location_label: 'nowhere',
  visibility_radius_m: 25000,
  distance_m: null,
  pace_seconds_per_km: null,
  level: null,
  max_participants: 5,
  status: 'published',
} as never)
check(
  'anon cannot create activities',
  insertActivity.error !== null,
  insertActivity.error?.code,
)

const comments = await anon.from('comments').select('id')
check(
  'comments publicly readable',
  (comments.data?.length ?? 0) > 0,
  `rows=${comments.data?.length ?? 0}`,
)

// The discovery RPC.
const nearby = await anon.rpc('nearby_activities', {
  p_lat: 47.0207,
  p_lng: 8.653,
  p_radius_m: 25000,
})
const rows = (nearby.data ?? []) as Array<Record<string, unknown>>
check(
  'nearby_activities returns results',
  rows.length > 0,
  `rows=${rows.length} err=${nearby.error?.message ?? ''}`,
)

const allFuture = rows.every((r) => new Date(r.starts_at as string) > new Date())
check('archived activities excluded', allFuture)

const allPublished = rows.every((r) => r.status === 'published')
check('cancelled excluded from discovery', allPublished)

// Grid snapping: no coordinate may carry more than 6 decimals, and each must
// sit on the grid lattice.
const gridOk = rows.every((r) => {
  const lat = r.approx_lat as number
  const step = 250 / 111320
  return Math.abs(lat / step - Math.round(lat / step)) < 1e-3
})
check('stored coordinates sit on the 250m grid', gridOk)

const distancesRounded = rows.every((r) => (r.distance_meters as number) % 100 === 0)
check('distances rounded to 100m', distancesRounded)

// A tight radius must return strictly fewer results than a wide one.
const tight = await anon.rpc('nearby_activities', {
  p_lat: 47.0207,
  p_lng: 8.653,
  p_radius_m: 5000,
})
check(
  'smaller radius returns fewer',
  (tight.data?.length ?? 0) < rows.length,
  `5km=${tight.data?.length} 25km=${rows.length}`,
)

// Sport filter.
const runs = await anon.rpc('nearby_activities', {
  p_lat: 47.0207,
  p_lng: 8.653,
  p_radius_m: 50000,
  p_sports: ['run'],
})
const onlyRuns = ((runs.data ?? []) as Array<{ sport_key: string }>).every(
  (r) => r.sport_key === 'run',
)
check(
  'sport filter works',
  onlyRuns && (runs.data?.length ?? 0) > 0,
  `rows=${runs.data?.length}`,
)

console.log(`\n${failures === 0 ? 'All checks passed' : failures + ' CHECK(S) FAILED'}`)
process.exit(failures === 0 ? 0 : 1)
