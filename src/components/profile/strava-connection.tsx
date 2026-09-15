'use client'

import { useState, useTransition } from 'react'
import { disconnectStrava } from '@/lib/auth/strava-connection.server'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/provider'

/**
 * Connect to, or disconnect from, Strava.
 *
 * The button is plain text, not a logo. The brand guidelines require the
 * official unmodified "Connect with Strava" asset and forbid approximating a
 * Strava logo in CSS or SVG; that asset is not in this repo, so text it is.
 * When it is added, this is the one place that changes. The wording itself —
 * "Connect with Strava" — is the phrasing the guidelines prescribe.
 */
export function StravaConnection({
  connected,
  configured,
}: {
  connected: boolean
  /** False when the deployment has no Strava credentials. */
  configured: boolean
}) {
  const { locale, t } = useI18n()
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!configured) {
    return (
      <section className="border-border bg-surface-muted rounded-card space-y-1.5 border p-4">
        <h2 className="text-fg text-sm font-semibold">{t.strava.connectionHeading}</h2>
        <p className="text-fg-muted text-sm">{t.strava.notConfigured}</p>
      </section>
    )
  }

  if (!connected) {
    return (
      <section className="border-border bg-surface rounded-card space-y-3 border p-4">
        <h2 className="text-fg text-sm font-semibold">{t.strava.connectionHeading}</h2>
        <p className="text-fg-muted text-sm">{t.strava.connectBody}</p>
        {/*
          A plain link, not a fetch: OAuth is a full-page redirect, and the
          route sets an httpOnly state cookie the page must not be able to read.
        */}
        <a
          href={`/api/auth/strava/start?locale=${locale}`}
          className="bg-brand text-brand-fg rounded-card hover:bg-brand-hover flex min-h-12 w-full items-center justify-center px-5 text-base font-medium"
        >
          {t.strava.connect}
        </a>
      </section>
    )
  }

  return (
    <section className="border-border bg-surface rounded-card space-y-3 border p-4">
      <h2 className="text-fg text-sm font-semibold">{t.strava.connectionHeading}</h2>
      <p className="text-fg-muted text-sm">{t.strava.connectedSince}</p>

      {confirming ? (
        <div className="border-border-strong bg-surface-muted rounded-card space-y-2 border p-3">
          <p className="text-fg text-sm">{t.strava.disconnectConfirm}</p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              {t.strava.keepConnected}
            </Button>
            <Button
              variant="danger"
              fullWidth
              disabled={pending}
              onClick={() => {
                setError(null)
                startTransition(async () => {
                  const result = await disconnectStrava()
                  if (!result.ok) setError(result.error)
                  else setConfirming(false)
                })
              }}
            >
              {pending ? t.strava.disconnecting : t.strava.disconnectYes}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          fullWidth
          disabled={pending}
          onClick={() => setConfirming(true)}
        >
          {t.strava.disconnect}
        </Button>
      )}

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </section>
  )
}

/**
 * The outcome of a sign-in attempt, passed back as ?strava=… .
 *
 * Rendered from a whitelist of known keys so an arbitrary query value cannot
 * put text of someone else's choosing on the page.
 */
export function StravaStatusNotice({ status }: { status: string }) {
  const { t } = useI18n()
  const known = t.strava.status as Record<string, string | undefined>
  const message = known[status]

  if (!message) return null

  const ok = status === 'connected'

  return (
    <p
      role="status"
      className={`rounded-card px-4 py-3 text-sm ${
        ok ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
      }`}
    >
      {message}
    </p>
  )
}
