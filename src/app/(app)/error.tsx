'use client'

import { useEffect } from 'react'
import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { ErrorState } from '@/components/ui/states'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Replace with the real reporter once analytics lands (phase 9).
    console.error(error)
  }, [error])

  return (
    <>
      <AppHeader />
      <PageBody>
        <ErrorState onRetry={reset} />
      </PageBody>
    </>
  )
}
