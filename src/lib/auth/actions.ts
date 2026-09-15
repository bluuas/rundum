'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  DEFAULT_LOCALE,
  LOCALE_PREFERENCE_COOKIE,
  isLocale,
  localeHref,
  type Locale,
} from '@/lib/i18n/config'
import { createClient } from '@/lib/supabase/server'

/**
 * Signs the current user out.
 *
 * A Server Action rather than the dev-only logout route, because this one ships
 * to production: it is how a Strava-connected user signs out too.
 */
export async function signOut(locale?: Locale) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')

  // Back to the feed in the language they were reading. Redirecting to '/'
  // would hand the choice to proxy.ts, which reads the preference cookie — so
  // signing out of an English page could land you in German.
  redirect(localeHref(isLocale(locale) ? locale : DEFAULT_LOCALE, '/'))
}

/**
 * Remembers the visitor's language choice.
 *
 * Server-side rather than `document.cookie`: writing to a browser global from a
 * component is exactly the kind of external mutation the React compiler warns
 * about, and a Server Action gets the cookie attributes right in one place.
 * proxy.ts reads this when someone arrives at a URL with no locale prefix.
 */
export async function setLocalePreference(locale: Locale) {
  if (!isLocale(locale)) return

  const store = await cookies()
  store.set(LOCALE_PREFERENCE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
}
