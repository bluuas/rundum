/**
 * Moves every activity's start time forward, so a demo left alone for a week
 * is not a list of things that already happened.
 *
 * The alternative is reseeding, which throws away everything people trying the
 * demo have made. This keeps their activities and moves them too.
 *
 * Shifts by *days in the city's calendar*, not by 24 hours a time. A run at
 * 18:30 in Schwyz has to still be at 18:30 afterwards, and adding
 * 7 x 86 400 000 ms across the last Sunday in October would make it 17:30.
 * Nothing else moves: `created_at` is a record of when something happened,
 * and history is not ours to rewrite.
 *
 *   npm run db:shift:demo              what it would do
 *   SHIFT_CONFIRM=yes npm run db:shift:demo     do it
 *   npm run db:shift -- --days 14      any number of days, locally
 */
import { createClient } from '@supabase/supabase-js'
import { instantAt, wallClock } from '../src/lib/time'
import { classify, loadEnv } from './target'

loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const target = classify(url)

if (target === 'unknown') {
  console.error(
    `\nRefusing to touch ${url}\n` +
      'That is neither the local stack nor the demo project.\n',
  )
  process.exit(1)
}

const daysArg = process.argv.indexOf('--days')
const days = daysArg === -1 ? 7 : Number(process.argv[daysArg + 1])

if (!Number.isInteger(days) || days === 0) {
  console.error('--days needs a whole number of days, and not zero.')
  process.exit(1)
}

const apply = process.env.SHIFT_CONFIRM === 'yes'

const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: activities, error } = await db
  .from('activities')
  .select('id, title, starts_at, status')
  .order('starts_at')

if (error) throw error
if (!activities?.length) {
  console.log('No activities to move.')
  process.exit(0)
}

/** The same wall clock, `days` days later. */
function shift(iso: string): string {
  const clock = wallClock(new Date(iso))
  return instantAt(
    clock.year,
    clock.month,
    clock.day + days,
    clock.hour,
    clock.minute,
  ).toISOString()
}

const now = Date.now()
const moves = activities.map((a) => ({ ...a, next: shift(a.starts_at) }))
const wasPast = moves.filter((m) => new Date(m.starts_at).getTime() < now).length
const willBePast = moves.filter((m) => new Date(m.next).getTime() < now).length

console.log(`\n${target} — ${url}`)
console.log(`${moves.length} activities, moving ${days} days later.`)
console.log(`  already started: ${wasPast} -> ${willBePast}`)
console.log(
  `  still to come:   ${moves.length - wasPast} -> ${moves.length - willBePast}`,
)
console.log(`  earliest: ${moves[0].starts_at} -> ${moves[0].next}`)
console.log(`  latest:   ${moves.at(-1)!.starts_at} -> ${moves.at(-1)!.next}`)

if (!apply) {
  console.log('\nNothing written. Re-run with SHIFT_CONFIRM=yes to move them.\n')
  process.exit(0)
}

let moved = 0
for (const move of moves) {
  const { error: updateError } = await db
    .from('activities')
    .update({ starts_at: move.next })
    .eq('id', move.id)

  if (updateError) {
    console.error(`  failed: ${move.title} — ${updateError.message}`)
    continue
  }
  moved += 1
}

console.log(`\nMoved ${moved} of ${moves.length} activities ${days} days later.\n`)
