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
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  )

  if (!hasLocale) {
    // A first segment that looks like a language tag but is not one we support
    // (/fr, /it) is a genuine 404, not a path to be prefixed. Redirecting it to
    // /de/fr would turn a clear "we do not have French" into a confusing URL.
    if (/^\/[a-z]{2}(\/|$)/.test(pathname)) {
      return NextResponse.rewrite(new URL('/not-found', request.url), { status: 404 })
    }

    const saved = request.cookies.get(LOCALE_COOKIE)?.value
    const locale = isLocale(saved)
      ? saved
      : matchLocale(request.headers.get('accept-language'))

    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
    return NextResponse.redirect(url)
  }

  let response = NextResponse.next({ request })

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
        response = NextResponse.next({ request })
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
