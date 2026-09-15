import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * The mobile content column. `pb-24` clears the fixed bottom nav (56px plus the
 * iOS safe-area inset), so no page has to remember to leave room for it.
 */
export function PageBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <main className={cn('mx-auto w-full max-w-[480px] px-4 pt-4 pb-24', className)}>
      {children}
    </main>
  )
}
