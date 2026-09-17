import { redirect } from 'next/navigation'
import { ChooseDisplayName } from '@/components/auth/choose-display-name'
import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { getDictionary } from '@/lib/i18n'
import { localeHref, type Locale } from '@/lib/i18n/config'
import { createClient, getCurrentUserId } from '@/lib/supabase/server'

export async function generateMetadata({ params }: PageProps<'/[locale]/welcome'>) {
  const { locale } = await params
  return { title: getDictionary(locale as Locale).auth.welcomeTitle }
}

/**
 * The one step between a new account and using Rundum.
 *
 * A brand-new account carries a generated placeholder, because the alternative
 * — publishing the local part of somebody's email address as their name —
 * discloses something private by default. So the name has to be asked for, and
 * this is where.
 *
 * It is a step, not a gate. "Decide later" leaves with the placeholder intact,
 * and nothing downstream refuses to work without a name: the primary metric is
 * activities created, and a wall in front of somebody who has just arrived is
 * a strange place to spend that.
 */
export default async function WelcomePage({ params }: PageProps<'/[locale]/welcome'>) {
  const { locale } = await params
  const t = getDictionary(locale as Locale)

  if (!(await getCurrentUserId())) redirect(localeHref(locale as Locale, '/signin'))

  // Already named — by the profile editor, the Strava consent card, or a
  // second visit to this page. Nothing to ask.
  const supabase = await createClient()
  const { data: needsName } = await supabase.rpc('needs_display_name')
  if (!needsName) redirect(localeHref(locale as Locale, '/'))

  return (
    <>
      <AppHeader locale={locale as Locale} title={t.auth.welcomeTitle} />
      <PageBody className="space-y-6">
        <ChooseDisplayName />
      </PageBody>
    </>
  )
}
