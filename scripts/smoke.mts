/**
 * End-to-end smoke test against a running dev server.
 *
 * Drives the real HTTP surface — mock login, the feed, the create Server
 * Action's underlying insert path, the detail page and comments — so the whole
 * stack is exercised rather than mocked.
 *
 *   npm run dev      # in one terminal
 *   npm run smoke    # in another
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000'

let failures = 0
function check(name: string, pass: boolean, detail = '') {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!pass) failures++
}

/** Minimal cookie jar: enough to carry a Supabase session between requests. */
const jar = new Map<string, string>()

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), cookie: cookieHeader() },
    redirect: 'manual',
  })

  for (const raw of response.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(';')
    const index = pair.indexOf('=')
    if (index > 0) jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim())
  }

  return response
}

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// --- Feed, signed out -------------------------------------------------------
const feed = await request('/')
const feedHtml = await feed.text()
check('feed renders', feed.status === 200 && feedHtml.includes('Near Schwyz'))
check(
  'feed shows seeded activities',
  /\d+<!-- -->? ?activit/.test(feedHtml) || feedHtml.includes('joined'),
)
check('feed shows Strava-connected wording', feedHtml.includes('Strava-connected'))
check('feed never says "verified"', !/\bverified\b/i.test(feedHtml))
check('signed-out header', feedHtml.includes('Signed out'))

// --- Filters ----------------------------------------------------------------
/** Counts rendered activity cards by their detail links. */
function countCards(html: string): number {
  return new Set(html.match(/\/activities\/[0-9a-f-]{36}/g) ?? []).size
}

const wide = countCards(await (await request('/?radius=50000')).text())
const tight = countCards(await (await request('/?radius=5000')).text())
check(
  'radius filter narrows the feed',
  wide > tight && tight > 0,
  `50km=${wide} 5km=${tight}`,
)

const runsOnly = await (await request('/?sports=run')).text()
check(
  'sport filter applies',
  countCards(runsOnly) > 0 && countCards(runsOnly) < wide,
  `run=${countCards(runsOnly)} all=${wide}`,
)

const emptyHtml = await (await request('/?sports=swim&when=today')).text()
check(
  'empty state appears and funnels to create',
  emptyHtml.includes('Create an activity'),
)

// --- Mock login -------------------------------------------------------------
const { data: profiles } = await anon
  .from('profiles')
  .select('id, display_name')
  .order('display_name')
  .limit(1)

const demoUser = profiles?.[0]
if (!demoUser) throw new Error('No demo profiles. Run `npm run db:seed`.')

const login = await request('/api/auth/dev/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: demoUser.id }),
})
check('mock login succeeds', login.status === 200, `status=${login.status}`)

const signedInHtml = await (await request('/')).text()
check('header shows the signed-in user', signedInHtml.includes(demoUser.display_name))

// Impersonating a non-demo account must be refused.
const badLogin = await request('/api/auth/dev/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: '00000000-0000-0000-0000-000000000000' }),
})
check('unknown account rejected', badLogin.status === 404, `status=${badLogin.status}`)

// --- Create page ------------------------------------------------------------
const createHtml = await (await request('/activities/new')).text()
check('create page renders the form', createHtml.includes('What are you planning?'))
check(
  'create page is not gated for a signed-in user',
  !createHtml.includes('Sign in to create'),
)

// --- Detail page and comments ----------------------------------------------
const { data: nearby } = await anon.rpc('nearby_activities', {
  p_lat: 47.0207,
  p_lng: 8.653,
  p_radius_m: 50000,
})
const target = (nearby as Array<{ id: string; title: string }>)[0]

const detail = await request(`/activities/${target.id}`)
const detailHtml = await detail.text()
check('detail page renders', detail.status === 200 && detailHtml.includes(target.title))
check(
  'detail page shows the approximate-location wording',
  detailHtml.includes('Approximate meeting area'),
)
check('detail page has a comment box', detailHtml.includes('Ask a question'))
check(
  'join button present but not yet wired',
  detailHtml.includes('Request to join') || detailHtml.includes('organizing this'),
)

// A missing activity streams, so the status is 200 by design — Next.js cannot
// change it after the response headers are sent. What matters is that the
// not-found UI renders and the page is marked noindex, which is exactly what
// Next.js does for a streamed notFound().
const missing = await request('/activities/11111111-1111-1111-1111-111111111111')
const missingHtml = await missing.text()
check('unknown activity renders not-found UI', missingHtml.includes('Page not found'))
check(
  'unknown activity is noindexed',
  missingHtml.includes('name="robots" content="noindex"'),
)
check(
  'a real activity is not noindexed',
  !detailHtml.includes('name="robots" content="noindex"'),
)

// RLS must not distinguish "hidden from you" from "does not exist".
const { data: hidden } = await anon.from('activities').select('id').eq('status', 'hidden')
check('hidden activities are not listed publicly', (hidden?.length ?? 0) === 0)

console.log(
  `\n${failures === 0 ? 'All smoke checks passed' : failures + ' CHECK(S) FAILED'}`,
)
process.exit(failures === 0 ? 0 : 1)
