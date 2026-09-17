import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  LOCALE_PREFERENCE_COOKIE,
  isLocale,
  localeHref,
  matchLocale,
  type Locale,
} from '@/lib/i18n/config'
import { reportError } from '@/lib/observability'
import { createClient } from '@/lib/supabase/server'

/**
 * Where an emailed sign-in link lands.
 *
 * Supabase verifies the token itself and forwards here with a one-time `code`;
 * exchanging it for cookies is the only thing left to do. The exchange needs
 * the PKCE verifier that `sendSignInLink` put in a cookie, which is why the
 * link has to be opened in the browser that asked for it — a link forwarded to
 * somebody else is not a session.
 *
 * Failures land on the sign-in page with a reason rather than on an error
 * page: whoever is here is mid-sign-in and wants somewhere to try again from.
 */

function failure(locale: Locale, reason: string, request: Request) {
  const url = new URL(localeHref(locale, '/signin'), request.url)
  url.searchParams.set('error', reason)
  return NextResponse.redirect(url)
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams

  // The language they asked for the link in, then one saved earlier, then the
  // browser's. An expired link should not also change the language.
  const asked = params.get('locale')
  const preferred = (await cookies()).get(LOCALE_PREFERENCE_COOKIE)?.value
  const locale: Locale = isLocale(asked)
    ? asked
    : isLocale(preferred)
      ? preferred
      : matchLocale(request.headers.get('accept-language'))

  // Supabase reports a refused or expired link this way rather than by omitting
  // the code, and `error_code` distinguishes "too late" from "broken".
  if (params.get('error')) {
    const expired = params.get('error_code') === 'otp_expired'
    return failure(locale, expired ? 'expired' : 'denied', request)
  }

  const code = params.get('code')
  if (!code) return failure(locale, 'missing', request)

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    reportError('authCallback', error, { status: error.status ?? null })
    // By far the most common cause is a link opened in a different browser
    // from the one that requested it, where the verifier cookie does not
    // exist. That is not a fault worth an error page either.
    return failure(locale, 'exchange', request)
  }

  /*
   * A brand-new account has a generated placeholder for a name. Sending them
   * to pick one before anything else is the difference between an activity
   * organized by "Anouk" and one organized by "Athlete 4f2a" — and it is the
   * first thing they can do that other people will see.
   */
  const { data: needsName } = await supabase.rpc('needs_display_name')

  const destination = needsName ? '/welcome' : '/'
  return NextResponse.redirect(new URL(localeHref(locale, destination), request.url))
}
