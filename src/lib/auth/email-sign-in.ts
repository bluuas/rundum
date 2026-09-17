'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n/config'
import { reportError } from '@/lib/observability'
import { createClient } from '@/lib/supabase/server'
import { emailSignInSchema } from '@/lib/validation/auth'

/**
 * Sending somebody a link that signs them in.
 *
 * Strava cannot be the only way in — a new Strava application is restricted to
 * its own owner until ten athletes have connected, and they cannot connect if
 * they cannot get an account. This is that other way in, and it is deliberately
 * the whole of it: no password to store, forget, reset, leak or check against a
 * breach list.
 *
 * Signing in and signing up are the same request. Supabase creates the account
 * if the address is new, which is not only fewer screens but the reason this
 * cannot be used to find out who has an account: every address gets the same
 * answer, and the difference between the two is only ever visible in the inbox
 * of whoever owns it.
 */

export type EmailSignInResult =
  { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

/**
 * Where the link comes back to.
 *
 * `NEXT_PUBLIC_SITE_URL` when the deployment sets one, otherwise the host this
 * request arrived on, which is what makes preview deployments and `localhost`
 * work without configuration. The host header is attacker-controlled, so this
 * is not trusted on its own: Supabase refuses to redirect anywhere outside the
 * project's allow-list, which is the check that actually holds.
 */
async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) return configured.replace(/\/$/, '')

  const list = await headers()
  const host = list.get('x-forwarded-host') ?? list.get('host') ?? 'localhost:3000'
  const proto =
    list.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export async function sendSignInLink(
  input: unknown,
  locale?: string,
): Promise<EmailSignInResult> {
  const parsed = emailSignInSchema.safeParse(input)
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error)
    return {
      ok: false,
      error: 'Please check the address',
      fieldErrors: flat.fieldErrors as Record<string, string[]>,
    }
  }

  const language: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE
  const origin = await siteOrigin()

  const supabase = await createClient()

  /*
   * This is a Server Action, so it can write cookies — which matters, because
   * the PKCE verifier Supabase stores here is what the callback needs to
   * exchange the code. A version of this that ran in a Server Component would
   * appear to work and then fail at the last step.
   */
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/api/auth/callback?locale=${language}`,
    },
  })

  if (error) {
    /*
     * Supabase meters this itself: a per-hour ceiling on mail sent and a
     * per-IP ceiling on sign-in attempts, both in `supabase/config.toml` for
     * local and in the dashboard for a real deployment. That is the limiter,
     * because `withinRateLimit` keys on `auth.uid()` and there is nobody
     * signed in here yet.
     *
     * Reported but not detailed to the caller: "wait a minute" and "that
     * address bounced" are both things an enumeration attempt would like to
     * learn.
     */
    reportError('sendSignInLink', error, { status: error.status ?? null })
    return { ok: false, error: 'Could not send the link. Please try again shortly.' }
  }

  return { ok: true }
}
