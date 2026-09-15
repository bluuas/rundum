import Link from 'next/link'
import type { ReactNode } from 'react'
import { DevAuthBar } from '@/components/dev/dev-auth-bar'
import { localeHref, type Locale } from '@/lib/i18n/config'

/**
 * Sticky top bar. `title` replaces the wordmark on sub-pages so the user always
 * knows where they are without a breadcrumb.
 */
export function AppHeader({
  locale,
  title,
  action,
  back,
}: {
  locale: Locale
  title?: string
  action?: ReactNode
  back?: { href: string; label: string }
}) {
  return (
    <header className="border-border bg-bg/90 pt-safe sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[480px] items-center gap-2 px-4">
        {back ? (
          <Link
            href={localeHref(locale, back.href)}
            aria-label={back.label}
            className="text-fg-muted hover:bg-surface-muted -ml-2 flex h-11 w-11 items-center justify-center rounded-full"
          >
            <span aria-hidden>←</span>
          </Link>
        ) : null}

        {title ? (
          <h1 className="text-fg truncate text-base font-semibold">{title}</h1>
        ) : (
          <Link
            href={localeHref(locale, '/')}
            className="text-fg text-lg font-bold tracking-tight"
          >
            Rundum
          </Link>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Renders nothing unless mock auth is enabled. */}
          <DevAuthBar />
          {action}
        </div>
      </div>
    </header>
  )
}
