'use client'

import { useI18n } from '@/lib/i18n/provider'

/**
 * Strava attribution.
 *
 * The brand guidelines permit exactly two interoperability phrases: "Powered by
 * Strava" and "Compatible with Strava". Rundum uses the latter, because it does
 * not display Strava activity data — it only uses Strava as a sign-in provider.
 *
 * Deliberately plain text, not a logo. Strava logos must be their official,
 * unmodified EPS/SVG/PNG assets; approximating one in CSS or inline SVG would
 * breach "never modify, alter or animate Strava logos". When the official asset
 * is added to the repo (phase 7) this component can render it instead.
 *
 * The guidelines also require that the Strava name never appear larger or more
 * prominently than the application's own name, which is why this is small,
 * muted body text and "Rundum" is the page's wordmark.
 */
export function StravaAttribution({ className }: { className?: string }) {
  const { t } = useI18n()

  return (
    <p className={`text-fg-subtle text-xs ${className ?? ''}`}>{t.strava.attribution}</p>
  )
}
