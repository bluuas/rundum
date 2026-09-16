import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_PREFERENCE_COOKIE as LOCALE_COOKIE,
  isLocale,
  matchLocale,
} from '@/lib/i18n/config'

/**
 * Runs before every page request. Two jobs.
 *
 * 1. Locale routing. Every page lives under /de or /en; a path without a locale
 *    prefix is redirected to one, chosen from the visitor's saved preference,
 *    then their Accept-Language header, then the default.
 *
 * 2. Supabase session refresh. Server Components cannot write cookies, so
 *    without this a refreshed token would be discarded and users would be
 *    logged out when their access token expired.
 *
 * Neither is an authorization check. Every page and Server Action re-checks the
 * user itself, and RLS is the real boundary.
 *
 * (Next 16 renamed middleware.ts to proxy.ts; the behaviour is the same.)
 */
/**
 * Headers every response carries.
 *
 * Set here rather than in `next.config.ts` so the CSP can carry a per-request
 * nonce; the rest would work either way and are kept together for one place to
 * look. `frame-ancestors` in the CSP is what actually stops framing in a
 * modern browser — X-Frame-Options is there for the ones that predate it.
 */
function securityHeaders(nonce: string): Record<string, string> {
  const isDev = process.env.NODE_ENV === 'development'

  // The browser's Supabase client talks to the project directly, so its origin
  // has to be reachable. Derived rather than hard-coded: local, demo and
  // production are three different hosts.
  let supabaseOrigin = ''
  try {
    supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin
  } catch {
    supabaseOrigin = ''
  }

  const csp = [
    `default-src 'self'`,
    /*
      Next's own bootstrap scripts are inline. They pick up this nonce
      automatically — it reads the CSP off the request headers below — which is
      what lets script-src stay strict instead of falling back to
      'unsafe-inline'. `strict-dynamic` then covers the chunks those scripts
      load. Development additionally needs 'unsafe-eval', which React uses to
      rebuild server stack traces in the browser.
    */
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    /*
      Styles cannot be nonced here: Leaflet positions every tile with a `style`
      attribute, and there is no nonce for an attribute. The exposure is small —
      an injected style can deface a page, not exfiltrate a session — and the
      alternative is no map.
    */
    `style-src 'self' 'unsafe-inline'`,
    // OpenStreetMap tiles, and Strava's CDN for an avatar the user consented
    // to show. `data:` covers the inline SVG markers Leaflet builds.
    // Both forms: a `*.` wildcard requires a subdomain label, so it does not
    // cover the bare host the tile server actually serves from.
    `img-src 'self' blob: data: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://*.cloudfront.net`,
    `font-src 'self'`,
    [`connect-src 'self'`, supabaseOrigin, isDev ? 'ws:' : ''].filter(Boolean).join(' '),
    `object-src 'none'`,
    `base-uri 'self'`,
    // Server Actions post back to this origin and nowhere else.
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')

  return {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    // Send the full URL within Rundum, only the origin when leaving it: an
    // activity id is not something to hand to a tile server.
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    /*
      Geolocation stays available because the map offers "near me" — and is
      snapped to the 250 m grid before it ever leaves the browser. Everything
      else is off; nothing here takes a photo or a payment.
    */
    'Permissions-Policy': 'geolocation=(self), camera=(), microphone=(), payment=()',
    ...(isDev
      ? {}
      : {
          'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
        }),
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const nonce = crypto.randomUUID()
  const headers = securityHeaders(nonce)

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  )

  if (!hasLocale) {
    // A first segment that looks like a language tag but is not one we support
    // (/fr, /it) is a genuine 404, not a path to be prefixed. Redirecting it to
    // /de/fr would turn a clear "we do not have French" into a confusing URL.
    if (/^\/[a-z]{2}(\/|$)/.test(pathname)) {
      const notFound = NextResponse.rewrite(new URL('/not-found', request.url), {
        status: 404,
      })
      for (const [key, value] of Object.entries(headers)) notFound.headers.set(key, value)
      return notFound
    }

    const saved = request.cookies.get(LOCALE_COOKIE)?.value
    const locale = isLocale(saved)
      ? saved
      : matchLocale(request.headers.get('accept-language'))

    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
    const redirect = NextResponse.redirect(url)
    for (const [key, value] of Object.entries(headers)) redirect.headers.set(key, value)
    return redirect
  }

  // Next reads the nonce back off this request header and puts it on the
  // scripts it injects, so nothing has to thread it through the tree.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', headers['Content-Security-Policy'])

  const withHeaders = <T extends NextResponse>(response: T): T => {
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
    return response
  }

  let response = withHeaders(NextResponse.next({ request: { headers: requestHeaders } }))

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Before the project is configured, pass requests through untouched so the
  // app still renders instead of erroring on every route.
  if (!url || !anonKey) return response

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = withHeaders(
          NextResponse.next({ request: { headers: requestHeaders } }),
        )
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // Touching getUser() is what triggers the refresh. Do not remove.
  await supabase.auth.getUser()

  return response
}

export { LOCALE_COOKIE, DEFAULT_LOCALE }

export const config = {
  matcher: [
    /*
     * Everything except API routes, static assets and image files. API routes
     * are not localised, and static files never need a session.
     *
     * robots.txt and sitemap.xml have to be listed too. They live at the root
     * by definition, so prefixing them with a locale does not redirect a
     * crawler to the German copy — it redirects it to a 404.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
