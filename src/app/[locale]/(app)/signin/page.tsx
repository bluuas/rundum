import { redirect } from 'next/navigation'
import { EmailSignInForm } from '@/components/auth/email-sign-in-form'
import { StravaConnection } from '@/components/profile/strava-connection'
import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { StravaAttribution } from '@/components/strava-attribution'
import { getDictionary } from '@/lib/i18n'
import { localeHref, type Locale } from '@/lib/i18n/config'
import { isStravaConfigured } from '@/lib/strava/config'
import { getCurrentUserId } from '@/lib/supabase/server'

export async function generateMetadata({ params }: PageProps<'/[locale]/signin'>) {
  const { locale } = await params
  return { title: getDictionary(locale as Locale).auth.signInTitle }
}

/** What the callback route reports when a link did not work out. */
function reasonToMessage(t: ReturnType<typeof getDictionary>, reason: string | null) {
  switch (reason) {
    case 'expired':
      return t.auth.errorExpired
    case 'denied':
      return t.auth.errorDenied
    case 'missing':
      return t.auth.errorMissing
    case 'exchange':
      return t.auth.errorExchange
    default:
      return null
  }
}

export default async function SignInPage({
  params,
  searchParams,
}: PageProps<'/[locale]/signin'>) {
  const { locale } = await params
  const { error } = await searchParams
  const t = getDictionary(locale as Locale)

  // Nothing to do here with a session already in hand.
  if (await getCurrentUserId()) redirect(localeHref(locale as Locale, '/profile'))

  const message = reasonToMessage(t, typeof error === 'string' ? error : null)

  return (
    <>
      <AppHeader locale={locale as Locale} title={t.auth.signInTitle} />
      <PageBody className="space-y-6">
        {message ? (
          <p
            role="alert"
            className="bg-warning-soft text-warning rounded-card px-4 py-3 text-sm"
          >
            {message}
          </p>
        ) : null}

        <EmailSignInForm />

        {/*
          Strava second, and framed as linking rather than as a way in: a new
          Strava application can only authenticate its own owner, so offering
          it as the front door would strand everybody else at it.
        */}
        <StravaConnection connected={false} configured={isStravaConfigured()} />
        <StravaAttribution className="text-center" />
      </PageBody>
    </>
  )
}
