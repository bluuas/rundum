import { StravaConnectedBadge } from '@/components/activity/badges'
import { LanguageSwitcher } from '@/components/profile/language-switcher'
import { DeleteAccount } from '@/components/profile/delete-account'
import { ProfileEditor } from '@/components/profile/profile-editor'
import {
  StravaConnection,
  StravaStatusNotice,
} from '@/components/profile/strava-connection'
import { SignOutButton } from '@/components/profile/sign-out-button'
import { StravaProfileConsent } from '@/components/profile/strava-profile-consent'
import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { BlockedAccounts } from '@/components/moderation/blocked-accounts'
import { StravaAttribution } from '@/components/strava-attribution'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { getPendingStravaProfile } from '@/lib/auth/strava-consent.server'
import { formatDate } from '@/lib/format'
import { fill, getDictionary } from '@/lib/i18n'
import { localeHref, type Locale } from '@/lib/i18n/config'
import { getBlockedAccounts, getProfileSummary } from '@/lib/queries/my-activities'
import { isStravaConfigured } from '@/lib/strava/config'
import { getCurrentUserId } from '@/lib/supabase/server'
import { getDeletionSummary } from '@/lib/account/delete-account.server'
import { Icon } from '@/components/ui/icon'

export async function generateMetadata({ params }: PageProps<'/[locale]/profile'>) {
  const { locale } = await params
  return { title: getDictionary(locale as Locale).profile.title }
}

export default async function ProfilePage({
  params,
  searchParams,
}: PageProps<'/[locale]/profile'>) {
  const { locale } = await params
  // The OAuth callback reports its outcome here rather than on an error page:
  // someone mid-sign-in wants to land somewhere they can try again from.
  const { strava } = await searchParams
  const stravaStatus = typeof strava === 'string' ? strava : null
  const t = getDictionary(locale as Locale)

  const stravaConfigured = isStravaConfigured()
  const userId = await getCurrentUserId()
  const [profile, blocked] = await Promise.all([
    userId ? getProfileSummary(userId) : Promise.resolve(null),
    userId ? getBlockedAccounts() : Promise.resolve([]),
  ])

  // Only present when Strava returned profile details the user has not yet
  // decided about. Until phase 7 populates the staging table, this is null.
  const stravaOffer = userId ? await getPendingStravaProfile() : null

  if (!profile) {
    return (
      <>
        <AppHeader locale={locale as Locale} title={t.profile.title} />
        <PageBody className="space-y-6">
          {stravaStatus ? <StravaStatusNotice status={stravaStatus} /> : null}
          <EmptyState
            icon={<Icon name="user-circle" />}
            title={t.profile.notSignedInTitle}
            description={t.profile.notSignedInBody}
          />
          <ButtonLink href={localeHref(locale as Locale, '/signin')}>
            {t.common.signIn}
          </ButtonLink>
          <LanguageSwitcher />
          <StravaAttribution className="text-center" />
        </PageBody>
      </>
    )
  }

  return (
    <>
      <AppHeader locale={locale as Locale} title={t.profile.title} />
      <PageBody className="space-y-6">
        {stravaStatus ? <StravaStatusNotice status={stravaStatus} /> : null}
        {stravaOffer ? <StravaProfileConsent offer={stravaOffer} /> : null}

        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="bg-brand-soft text-brand-soft-fg flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-semibold"
          >
            {profile.displayName.charAt(0)}
          </span>
          <div className="min-w-0">
            <h1 className="text-fg truncate text-xl font-bold tracking-tight">
              {profile.displayName}
            </h1>
            {profile.stravaConnected ? (
              <StravaConnectedBadge />
            ) : (
              <p className="text-fg-subtle text-[11px] font-medium">
                {t.strava.notConnected}
              </p>
            )}
            {profile.cityName ? (
              <p className="text-fg-muted mt-0.5 text-sm">{profile.cityName}</p>
            ) : null}
          </div>
        </div>

        {profile.bio ? (
          <p className="text-fg text-sm leading-relaxed">{profile.bio}</p>
        ) : null}

        <dl className="border-border bg-surface rounded-card grid grid-cols-2 border">
          <Stat label={t.profile.created} value={profile.activitiesCreated} />
          <Stat
            label={t.profile.joined}
            value={profile.activitiesJoined}
            className="border-border border-l"
          />
        </dl>

        <p className="text-fg-subtle text-xs">
          {fill(t.profile.memberSince, { date: formatDate(profile.createdAt) })}
        </p>

        {/*
          Stated plainly rather than buried in a settings page: the promise not
          to store an exact location is the reason someone can post a meeting
          point at all.
        */}
        <section className="border-border bg-surface-muted rounded-card space-y-1.5 border p-4">
          <h2 className="text-fg text-sm font-semibold">{t.profile.privacyHeading}</h2>
          <p className="text-fg-muted text-sm">{t.profile.privacyBody}</p>
        </section>

        <ProfileEditor displayName={profile.displayName} bio={profile.bio} />

        <StravaConnection
          connected={profile.stravaConnected}
          configured={stravaConfigured}
        />

        <BlockedAccounts accounts={blocked} />

        <LanguageSwitcher />

        <div className="space-y-2">
          <ButtonLink
            href={localeHref(locale as Locale, '/me')}
            variant="secondary"
            fullWidth
          >
            {t.profile.myActivities}
          </ButtonLink>
          <SignOutButton />
        </div>

        <DeleteAccount summary={await getDeletionSummary()} />

        <StravaAttribution />
      </PageBody>
    </>
  )
}

function Stat({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className?: string
}) {
  return (
    <div className={`px-4 py-3 text-center ${className ?? ''}`}>
      <dt className="text-fg-muted text-xs">{label}</dt>
      <dd className="text-fg text-2xl font-bold">{value}</dd>
    </div>
  )
}
