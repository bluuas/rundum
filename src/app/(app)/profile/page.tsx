import { StravaConnectedBadge } from '@/components/activity/badges'
import { SignOutButton } from '@/components/profile/sign-out-button'
import { StravaAttribution } from '@/components/strava-attribution'
import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { formatDate } from '@/lib/format'
import { getProfileSummary } from '@/lib/queries/my-activities'
import { getCurrentUserId } from '@/lib/supabase/server'

export const metadata = { title: 'Profile' }

export default async function ProfilePage() {
  const userId = await getCurrentUserId()
  const profile = userId ? await getProfileSummary(userId) : null

  if (!profile) {
    return (
      <>
        <AppHeader title="Profile" />
        <PageBody>
          <EmptyState
            icon="👤"
            title="Not signed in"
            description="Strava sign-in is coming. Until then, use the account switcher in the header."
          />
          <StravaAttribution className="mt-6 text-center" />
        </PageBody>
      </>
    )
  }

  return (
    <>
      <AppHeader title="Profile" />
      <PageBody className="space-y-6">
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
                Not connected to Strava
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
          <Stat label="Created" value={profile.activitiesCreated} />
          <Stat
            label="Joined"
            value={profile.activitiesJoined}
            className="border-border border-l"
          />
        </dl>

        <p className="text-fg-subtle text-xs">
          Member since {formatDate(profile.createdAt)}
        </p>

        {/*
          Stated plainly rather than buried in a settings page: the promise not
          to store an exact location is the reason someone can post a meeting
          point at all.
        */}
        <section className="border-border bg-surface-muted rounded-card space-y-1.5 border p-4">
          <h2 className="text-fg text-sm font-semibold">Your location privacy</h2>
          <p className="text-fg-muted text-sm">
            Rundum never stores your home or exact location. Meeting points you set are
            rounded to a roughly 250 m area before they are saved, and other people only
            ever see an approximate distance.
          </p>
        </section>

        <div className="space-y-2">
          <ButtonLink href="/me" variant="secondary" fullWidth>
            My activities
          </ButtonLink>
          <SignOutButton />
        </div>

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
