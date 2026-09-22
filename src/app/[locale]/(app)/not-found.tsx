'use client'

import Link from 'next/link'
import { PageBody } from '@/components/shell/page-body'
import { EmptyState } from '@/components/ui/states'
import { localeHref } from '@/lib/i18n/config'
import { useI18n } from '@/lib/i18n/provider'
import { Icon } from '@/components/ui/icon'

/**
 * Not-found for anything under a locale: an activity that was deleted, hidden,
 * or never existed.
 *
 * A notFound() boundary receives no route params, so the locale comes from
 * context. The I18nProvider lives in the locale layout, above this boundary, so
 * it is already mounted — which means a 404 inside /en reads in English and one
 * inside /de reads in German, rather than both falling back to the default.
 *
 * (The root src/app/not-found.tsx is the other case: a URL that matches no
 * route at all, where there is no locale to read.)
 *
 * A plain header rather than <AppHeader />: this is a Client Component, and
 * AppHeader renders the async DevAuthBar, which only works on the server.
 */
export default function NotFound() {
  const { locale, t } = useI18n()

  return (
    <>
      <header className="border-border bg-bg/90 pt-safe sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[480px] items-center px-4">
          <Link
            href={localeHref(locale, '/')}
            className="text-fg text-lg font-bold tracking-tight"
          >
            Rundum
          </Link>
        </div>
      </header>
      <PageBody>
        <EmptyState
          icon={<Icon name="map-trifold" />}
          title={t.states.notFoundTitle}
          description={t.states.notFoundBody}
          action={{ label: t.states.backToDiscover, href: localeHref(locale, '/') }}
        />
      </PageBody>
    </>
  )
}
