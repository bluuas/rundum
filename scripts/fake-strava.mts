/**
 * A local stand-in for Strava's OAuth endpoints.
 *
 * Why this exists: Strava requires a paid subscription before you can create an
 * API application at all, and every new application starts in "single-player
 * mode", where only its own owner can authenticate until it has ten connected
 * athletes and passes review. So the sign-in path cannot be exercised with real
 * Strava before launch — not by the team, and not in CI.
 *
 * This server implements the three endpoints Rundum actually calls, with the
 * same request and response shapes:
 *
 *   GET  /oauth/authorize    the consent screen, redirects back with a code
 *   POST /oauth/token        code -> token, and refresh_token -> token
 *   POST /oauth/deauthorize  revokes a token
 *
 * Point STRAVA_AUTH_BASE_URL at it and the application code is unchanged: the
 * state check, the exchange, server-side token storage, profile staging, the
 * consent step and disconnect all run for real. Going live is an environment
 * change, not a code change.
 *
 *   npm run dev:strava
 *
 * It is deliberately not a faithful Strava emulator. It validates what Rundum
 * depends on and nothing else, because a fake that drifts into simulating
 * everything stops being a test fixture and becomes a second thing to maintain.
 */
import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'

const PORT = Number(process.env.FAKE_STRAVA_PORT ?? 4400)

/** Canned athletes, so a second account is one click away rather than a fixture. */
const ATHLETES = [
  { id: 900001, firstname: 'Rea', lastname: 'Hofer', profile: null },
  { id: 900002, firstname: 'Til', lastname: 'Brunner', profile: null },
]

type Grant = { athleteId: number; scope: string }

const codes = new Map<string, Grant>()
const accessTokens = new Map<string, Grant>()
const refreshTokens = new Map<string, Grant>()

function html(body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fake Strava — not Strava</title>
<style>
  body { font: 16px/1.5 system-ui, sans-serif; margin: 0; padding: 2rem 1.25rem;
         background: #fff7ed; color: #1c1917; }
  main { max-width: 26rem; margin: 0 auto; }
  .warn { background: #fef3c7; border: 1px solid #f59e0b; border-radius: .5rem;
          padding: .75rem 1rem; font-size: .875rem; margin-bottom: 1.5rem; }
  button { font: inherit; min-height: 2.75rem; padding: 0 1.25rem; width: 100%;
           border-radius: .5rem; border: 1px solid #d6d3d1; background: #fff;
           cursor: pointer; margin-top: .5rem; }
  button.primary { background: #1c1917; color: #fff; border-color: #1c1917; }
  label { display: block; margin-top: 1rem; font-size: .875rem; }
  select { font: inherit; width: 100%; min-height: 2.75rem; margin-top: .25rem;
           border-radius: .5rem; border: 1px solid #d6d3d1; padding: 0 .5rem; }
</style></head><body><main>${body}</main></body></html>`
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  // --- The consent screen ---------------------------------------------------
  if (req.method === 'GET' && url.pathname === '/oauth/authorize') {
    const redirectUri = url.searchParams.get('redirect_uri') ?? ''
    const state = url.searchParams.get('state') ?? ''
    const scope = url.searchParams.get('scope') ?? 'read'

    const options = ATHLETES.map(
      (a) => `<option value="${a.id}">${a.firstname} ${a.lastname} (${a.id})</option>`,
    ).join('')

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(
      html(`
      <div class="warn"><strong>This is not Strava.</strong> It is a local
      stand-in used to develop and test the sign-in flow. No real account is
      involved.</div>
      <h1>Authorize Rundum</h1>
      <p>Rundum is asking for the <code>${scope}</code> scope.</p>
      <form method="POST" action="/oauth/approve">
        <input type="hidden" name="redirect_uri" value="${redirectUri}">
        <input type="hidden" name="state" value="${state}">
        <input type="hidden" name="scope" value="${scope}">
        <label>Sign in as
          <select name="athlete_id">${options}</select>
        </label>
        <button class="primary" name="decision" value="authorize" type="submit">Authorize</button>
        <button name="decision" value="deny" type="submit">Cancel</button>
      </form>`),
    )
    return
  }

  // --- The consent decision -------------------------------------------------
  if (req.method === 'POST' && url.pathname === '/oauth/approve') {
    const form = new URLSearchParams(await readBody(req))
    const redirectUri = form.get('redirect_uri') ?? ''
    const state = form.get('state') ?? ''
    const target = new URL(redirectUri)
    target.searchParams.set('state', state)

    if (form.get('decision') !== 'authorize') {
      // Exactly what Strava sends when the user declines.
      target.searchParams.set('error', 'access_denied')
    } else {
      const code = randomBytes(16).toString('hex')
      codes.set(code, {
        athleteId: Number(form.get('athlete_id')),
        scope: form.get('scope') ?? 'read',
      })
      target.searchParams.set('code', code)
      target.searchParams.set('scope', form.get('scope') ?? 'read')
    }

    res.writeHead(302, { Location: target.toString() })
    res.end()
    return
  }

  // --- Token endpoint -------------------------------------------------------
  if (req.method === 'POST' && url.pathname === '/oauth/token') {
    const form = new URLSearchParams(await readBody(req))

    // The real endpoint rejects a bad secret, and so must this one — otherwise
    // a misconfigured deployment would pass locally and fail in production.
    if (!form.get('client_id') || !form.get('client_secret')) {
      return json(res, 400, { message: 'Bad Request', errors: ['client credentials'] })
    }

    let grant: Grant | undefined

    if (form.get('grant_type') === 'refresh_token') {
      const token = form.get('refresh_token') ?? ''
      grant = refreshTokens.get(token)
      refreshTokens.delete(token)
    } else {
      const code = form.get('code') ?? ''
      grant = codes.get(code)
      // Authorization codes are single use.
      codes.delete(code)
    }

    if (!grant) return json(res, 400, { message: 'Bad Request', errors: ['code'] })

    const athlete = ATHLETES.find((a) => a.id === grant.athleteId) ?? ATHLETES[0]
    const accessToken = randomBytes(16).toString('hex')
    const refreshToken = randomBytes(16).toString('hex')
    accessTokens.set(accessToken, grant)
    refreshTokens.set(refreshToken, grant)

    return json(res, 200, {
      token_type: 'Bearer',
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Math.floor(Date.now() / 1000) + 21_600,
      expires_in: 21_600,
      scope: grant.scope,
      athlete,
    })
  }

  // --- Deauthorization ------------------------------------------------------
  if (req.method === 'POST' && url.pathname === '/oauth/deauthorize') {
    const form = new URLSearchParams(await readBody(req))
    const token = form.get('access_token') ?? ''

    if (!accessTokens.has(token)) {
      return json(res, 401, { message: 'Authorization Error' })
    }

    accessTokens.delete(token)
    return json(res, 200, { access_token: token })
  }

  // Anything else is a route Rundum does not call — including the activity
  // endpoints, which it must never call.
  json(res, 404, { message: 'Resource Not Found' })
})

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => resolve(body))
  })
}

function json(res: import('node:http').ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

server.listen(PORT, () => {
  console.log(`Fake Strava listening on http://localhost:${PORT}`)
  console.log('Set these in .env.local to use it:\n')
  console.log(`  STRAVA_AUTH_BASE_URL=http://localhost:${PORT}`)
  console.log('  STRAVA_CLIENT_ID=fake-client-id')
  console.log('  STRAVA_CLIENT_SECRET=fake-client-secret')
  console.log('  STRAVA_REDIRECT_URI=http://localhost:3000/api/auth/strava/callback\n')
})
