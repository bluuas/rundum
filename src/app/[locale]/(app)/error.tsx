'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { PageBody } from '@/components/shell/page-body'
import { ErrorState } from '@/components/ui/states'
import { useI18n } from '@/lib/i18n/provider'
import { localeHref } from '@/lib/i18n/config'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { locale, t } = useI18n()

  useEffect(() => {
    // Replace with the real reporter once analytics lands (phase 9).
    console.error(error)
  }, [error])

  return (
    <>
      {/*
        A plain header rather than <AppHeader />: this is a Client Component,
        and AppHeader renders the async DevAuthBar, which only works on the
        server. The error boundary has no need for the dev switcher anyway.
      */}
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
        <ErrorState
          title={t.states.errorTitle}
          description={t.states.errorBody}
          retryLabel={t.common.tryAgain}
          onRetry={reset}
        />
      </PageBody>
    </>
  )
}
