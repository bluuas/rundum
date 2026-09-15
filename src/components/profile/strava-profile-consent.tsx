'use client'

import { useState, useTransition } from 'react'
import {
  acceptStravaProfile,
  declineStravaProfile,
  type StravaProfileOffer,
} from '@/lib/auth/strava-consent.server'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/provider'

/**
 * Asks the user whether to use their Strava profile details on Rundum.
 *
 * This card is the consent step required by the Strava API Agreement: Strava
 * Data about a user may only be shown to that user, so a name or avatar from
 * Strava cannot simply be published to the feed. Showing it here, to its owner,
 * and copying it only on acceptance is what makes it the user's own Rundum
 * profile data rather than a republished mirror of Strava Data.
 *
 * The full reasoning lives in src/lib/auth/strava-consent.server.ts.
 */
export function StravaProfileConsent({ offer }: { offer: StravaProfileOffer }) {
  const [pending, startTransition] = useTransition()
  const { t } = useI18n()
  const [error, setError] = useState<string | null>(null)

  function decide(action: typeof acceptStravaProfile) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <section
      aria-labelledby="strava-consent-heading"
      className="border-border bg-surface rounded-card space-y-3 border p-4"
    >
      <h2 id="strava-consent-heading" className="text-fg text-sm font-semibold">
        {t.strava.consentHeading}
      </h2>

      <p className="text-fg-muted text-sm">{t.strava.consentBody}</p>

      <dl className="border-border bg-surface-muted rounded-card divide-border divide-y border text-sm">
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <dt className="text-fg-muted">{t.strava.consentName}</dt>
          <dd className="text-fg font-medium">
            {offer.displayName ?? t.strava.consentNotProvided}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <dt className="text-fg-muted">{t.strava.consentPicture}</dt>
          <dd className="text-fg font-medium">
            {offer.avatarUrl ? t.strava.consentProvided : t.strava.consentNotProvided}
          </dd>
        </div>
      </dl>

      <p className="text-fg-subtle text-xs">{t.strava.consentNote}</p>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => decide(declineStravaProfile)}
        >
          {t.strava.consentDecline}
        </Button>
        <Button fullWidth disabled={pending} onClick={() => decide(acceptStravaProfile)}>
          {pending ? t.common.saving : t.strava.consentAccept}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </section>
  )
}
