'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { setLocalePreference } from '@/lib/auth/actions'
import { useI18n } from '@/lib/i18n/provider'
import {
  LOCALES,
  LOCALE_LABELS,
  localeHref,
  stripLocale,
  type Locale,
} from '@/lib/i18n/config'
import { cn } from '@/lib/utils'

/**
 * Switches language while staying on the same page.
 *
 * Because the locale lives in the path, switching is a navigation to the same
 * route under the other prefix — the user keeps their place, their filters and
 * their scroll position in the feed. The choice is also written to a cookie so
 * that a later visit to a bare URL lands in the same language; proxy.ts reads
 * it before falling back to Accept-Language.
 */
export function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale, t } = useI18n()
  const [pending, startTransition] = useTransition()

  function switchTo(next: Locale) {
    if (next === locale) return

    const query = searchParams.toString()
    const target = localeHref(next, stripLocale(pathname)) + (query ? `?${query}` : '')

    startTransition(async () => {
      // Recorded server-side so proxy.ts can read it on a later bare-URL visit.
      await setLocalePreference(next)
      router.replace(target)
    })
  }

  return (
    <section className="space-y-2">
      <h2 className="text-fg text-sm font-medium">{t.profile.language}</h2>
      <div
        role="group"
        aria-label={t.profile.language}
        className="border-border-strong rounded-card flex overflow-hidden border"
      >
        {LOCALES.map((option) => (
          <button
            key={option}
            type="button"
            disabled={pending}
            aria-pressed={option === locale}
            onClick={() => switchTo(option)}
            className={cn(
              'min-h-11 flex-1 text-sm font-medium transition-colors',
              option === locale
                ? 'bg-brand text-brand-fg'
                : 'text-fg-muted hover:bg-surface-muted',
            )}
          >
            {LOCALE_LABELS[option]}
          </button>
        ))}
      </div>
    </section>
  )
}
