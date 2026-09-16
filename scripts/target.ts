import { config } from 'dotenv'

/**
 * Which database a script is about to talk to.
 *
 * Three exist and they must not be confused:
 *
 *   local    a Docker stack — development, and every test
 *   demo     the hosted project behind the published demo
 *   unknown  anything else, which from here means production
 *
 * Demo accounts share a password that is printed in this repository, so
 * seeding the wrong database is not a small mistake. Scripts that write demo
 * data call `assertSeedable` and it refuses anything it does not recognise —
 * a guard that a stale `.env.local` cannot talk its way past.
 */

/**
 * The hosted project behind the published demo.
 *
 * Not a secret: it is the host in `NEXT_PUBLIC_SUPABASE_URL`, which ships in
 * the client bundle of every demo deployment.
 */
export const DEMO_PROJECT_REF = 'kxbkmzonmilkefpiatjh'

export type Target = 'local' | 'demo' | 'unknown'

/** Loads `.env.local`, or whatever `RUNDUM_ENV_FILE` names instead. */
export function loadEnv(): void {
  config({ path: process.env.RUNDUM_ENV_FILE ?? '.env.local', quiet: true })
}

export function classify(url: string): Target {
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    return 'unknown'
  }

  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return 'local'
  if (host === `${DEMO_PROJECT_REF}.supabase.co`) return 'demo'
  return 'unknown'
}

/**
 * Exits unless this database is one demo data may be written to.
 *
 * Local needs no confirmation — it is disposable by design. The demo is a real
 * deployment people may be looking at, so it still asks. Anything else is
 * refused outright rather than confirmed: there is no prompt that makes
 * seeding production the right answer.
 */
export function assertSeedable(url: string): Target {
  const target = classify(url)

  if (target === 'unknown') {
    console.error(
      `\nRefusing to seed ${url}\n` +
        'That is neither the local stack nor the demo project. Demo accounts\n' +
        'share a password published in this repository, so they must never\n' +
        'exist anywhere else.\n\n' +
        'Local:  npm run db:seed        (needs `npm run db:start`)\n' +
        'Demo:   npm run db:seed:demo   (needs .env.demo)\n',
    )
    process.exit(1)
  }

  if (target === 'demo' && process.env.SEED_CONFIRM_REMOTE !== 'yes') {
    console.warn(
      `\nAbout to seed the published demo at ${url}\n` +
        'This deletes every activity the demo accounts own, including anything\n' +
        'people trying the demo have made. Re-run with SEED_CONFIRM_REMOTE=yes.\n',
    )
    process.exit(1)
  }

  return target
}

/**
 * Exits unless this database is local.
 *
 * For anything that writes freely and cleans up afterwards — the test suites.
 * They must not be able to reach a deployment, however the environment is set.
 */
export function assertLocal(url: string, what: string): void {
  if (classify(url) === 'local') return

  console.error(
    `\n${what} can only run against the local stack, not ${url}\n` +
      'Start it with `npm run db:start`, and point .env.local at it.\n',
  )
  process.exit(1)
}
