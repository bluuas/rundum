'use client'

import Link from 'next/link'
import { PageBody } from '@/components/shell/page-body'
import { ActivityListSkeleton } from '@/components/ui/states'
import { localeHref } from '@/lib/i18n/config'
import { useI18n } from '@/lib/i18n/provider'

/**
 * A loading.tsx receives no props — it is a Suspense fallback, not a route — so
 * the locale comes from context rather than params. The I18nProvider sits in
 * the locale layout, above this boundary, so it is already mounted.
 *
 * A plain header rather than <AppHeader />: this is a Client Component, and
 * AppHeader renders the async DevAuthBar, which only works on the server.
 */
export default function Loading() {
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
        <ActivityListSkeleton label={t.states.loadingActivities} />
      </PageBody>
    </>
  )
}
