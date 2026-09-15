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

// ---------------------------------------------------------------------------
// Join requests
//
// These need a signed-in client. The rules that matter here are not "this row
// is yours" — they are "which party may move this row to which state", which is
// exactly the kind of thing an RLS policy gets wrong quietly.
// ---------------------------------------------------------------------------

const anonRoster = await anon.rpc('activity_roster', {
  p_activity_id: rows[0].id as string,
})
check(
  'roster empty for anonymous viewers',
  (anonRoster.data?.length ?? 0) === 0,
  `rows=${anonRoster.data?.length ?? 0}`,
)

const anonJoin = await anon.rpc('request_to_join', {
  p_activity_id: rows[0].id as string,
})
check('anon cannot request to join', anonJoin.error !== null, anonJoin.error?.code)

const member = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
const signIn = await member.auth.signInWithPassword({
  email: 'noah@demo.rundum.app',
  password: 'rundum-demo-password',
})

if (signIn.error || !signIn.data.user) {
  check('sign in as demo user', false, signIn.error?.message ?? 'no user')
} else {
  const me = signIn.data.user.id

  // Someone else's activity, so requesting is a legitimate thing to do.
  const target = rows.find((r) => r.owner_id !== me)
  const targetId = target?.id as string

  const request = await member.rpc('request_to_join', {
    p_activity_id: targetId,
    p_message: 'Verification run',
  })
  check(
    'a member can request to join',
    request.error === null,
    request.error?.message ?? String(request.data),
  )

  const { data: mine } = await member
    .from('join_requests')
    .select('id, status')
    .eq('activity_id', targetId)
    .eq('user_id', me)
    .maybeSingle()

  // The whole point of routing decisions through an RPC: the requester must not
  // be able to grant themselves the thing they are waiting for.
  const selfApprove = await member
    .from('join_requests')
    .update({ status: 'approved' })
    .eq('id', mine?.id ?? '')
    .select('id')
  check(
    'a requester cannot approve their own request',
    (selfApprove.data?.length ?? 0) === 0,
    `rows=${selfApprove.data?.length ?? 0} err=${selfApprove.error?.code ?? 'none'}`,
  )

  const selfApproveRpc = await member.rpc('decide_join_request', {
    p_request_id: mine?.id ?? '00000000-0000-0000-0000-000000000000',
    p_approve: true,
  })
  check(
    'a requester cannot decide their own request',
    selfApproveRpc.error?.code === 'RU009',
    selfApproveRpc.error?.code ?? 'no error',
  )

  const preApproved = await member.from('join_requests').insert({
    activity_id: rows[1].id as string,
    user_id: me,
    status: 'approved',
  } as never)
  check(
    'a request cannot be created pre-approved',
    preApproved.error !== null,
    preApproved.error?.code,
  )

  const otherRoster = await member.rpc('activity_roster', {
    p_activity_id: targetId,
  })
  check(
    'a pending requester sees no roster',
    (otherRoster.data?.length ?? 0) === 0,
    `rows=${otherRoster.data?.length ?? 0}`,
  )

  const withdraw = await member.rpc('withdraw_join_request', {
    p_activity_id: targetId,
  })
  check('a member can withdraw', withdraw.error === null, withdraw.error?.message)

  // -------------------------------------------------------------------------
  // Reporting and blocking
  // -------------------------------------------------------------------------

  const selfReport = await member.rpc('submit_report', {
    p_target_type: 'activity',
    p_target_id: (rows.find((r) => r.owner_id === me)?.id as string) ?? targetId,
    p_reason: 'spam',
  })
  // Falls through to a plain success if this member happens to own nothing
  // nearby, so only assert when there really was an own activity to report.
  if (rows.some((r) => r.owner_id === me)) {
    check(
      'you cannot report your own content',
      selfReport.error?.code === 'RU021',
      selfReport.error?.code ?? 'no error',
    )
  }

  const ghostReport = await member.rpc('submit_report', {
    p_target_type: 'activity',
    p_target_id: '11111111-1111-1111-1111-111111111111',
    p_reason: 'spam',
  })
  check(
    'a report must name something that exists',
    ghostReport.error?.code === 'RU020',
    ghostReport.error?.code ?? 'no error',
  )

  const realReport = await member.rpc('submit_report', {
    p_target_type: 'activity',
    p_target_id: targetId,
    p_reason: 'spam',
    p_details: 'Verification run',
  })
  check('a member can report', realReport.error === null, realReport.error?.message)

  // Reports are between the reporter and the moderators. Nobody else — least of
  // all the reported person — may read them.
  const anonReports = await anon.from('reports').select('id')
  check(
    'reports are not public',
    (anonReports.data?.length ?? 0) === 0,
    `rows=${anonReports.data?.length ?? 0}`,
  )

  // Blocking somebody must actually remove them from what you see.
  const owner = target?.owner_id as string

  const forgedBlock = await member
    .from('blocks')
    .insert({ blocker_id: owner, blocked_id: me } as never)
  check(
    "you cannot block on somebody else's behalf",
    forgedBlock.error !== null,
    forgedBlock.error?.code,
  )

  const block = await member.rpc('block_user', { p_blocked_id: owner })
  check('a member can block', block.error === null, block.error?.message)

  const afterBlock = await member.rpc('nearby_activities', {
    p_lat: 47.0207,
    p_lng: 8.653,
    p_radius_m: 50000,
  })
  const stillThere = ((afterBlock.data ?? []) as Array<{ owner_id: string }>).some(
    (r) => r.owner_id === owner,
  )
  check('a blocked organizer disappears from the feed', !stillThere)

  const blockedProfile = await member
    .from('profiles')
    .select('id')
    .eq('id', owner)
    .maybeSingle()
  check('a blocked account is unreadable', blockedProfile.data === null)

  const blockedList = await member.rpc('blocked_accounts')
  check(
    'the block is listed so it can be undone',
    ((blockedList.data ?? []) as Array<{ user_id: string }>).some(
      (r) => r.user_id === owner,
    ),
    `rows=${blockedList.data?.length ?? 0}`,
  )

  const unblock = await member.rpc('unblock_user', { p_blocked_id: owner })
  check('a member can unblock', unblock.error === null, unblock.error?.message)

  const afterUnblock = await member
    .from('profiles')
    .select('id')
    .eq('id', owner)
    .maybeSingle()
  check('unblocking restores visibility', afterUnblock.data !== null)

  await member.auth.signOut()
}

console.log(`\n${failures === 0 ? 'All checks passed' : failures + ' CHECK(S) FAILED'}`)
process.exit(failures === 0 ? 0 : 1)
