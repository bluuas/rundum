'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/provider'

export type DemoAccount = {
  id: string
  displayName: string
  stravaConnected: boolean
}

/**
 * Development-only account switcher. Rendered by DevAuthBar, which only mounts
 * it when mock auth is enabled.
 */
export function UserSwitcher({
  accounts,
  currentUserId,
  currentName,
}: {
  accounts: DemoAccount[]
  currentUserId: string | null
  currentName: string | null
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  async function post(path: string, body?: unknown) {
    setError(null)
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string
      } | null
      setError(payload?.error ?? 'Sign-in failed')
      return
    }

    setOpen(false)
    startTransition(() => router.refresh())
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="border-border-strong text-fg-muted hover:bg-surface-muted flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium"
      >
        <span className="bg-warning inline-block h-1.5 w-1.5 rounded-full" aria-hidden />
        {currentName ?? t.dev.signedOut}
      </button>

      {open ? (
        <div
          role="menu"
          className="border-border bg-surface absolute right-0 z-50 mt-2 w-64 rounded-xl border p-1 shadow-lg"
        >
          <p className="text-fg-subtle px-3 py-2 text-[11px] tracking-wide uppercase">
            {t.dev.heading}
          </p>

          {accounts.length === 0 ? (
            <p className="text-fg-muted px-3 pb-3 text-xs">{t.dev.noAccounts}</p>
          ) : null}

          {accounts.map((account) => (
            <button
              key={account.id}
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => post('/api/auth/dev/login', { userId: account.id })}
              className={cn(
                'hover:bg-surface-muted flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm',
                account.id === currentUserId && 'text-brand font-semibold',
              )}
            >
              <span className="truncate">{account.displayName}</span>
              {account.stravaConnected ? (
                <span className="text-fg-subtle shrink-0 text-[10px]">
                  {t.strava.connected}
                </span>
              ) : null}
            </button>
          ))}

          {currentUserId ? (
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => post('/api/auth/dev/logout')}
              className="text-fg-muted hover:bg-surface-muted mt-1 flex min-h-11 w-full items-center rounded-lg px-3 text-sm"
            >
              {t.common.signOut}
            </button>
          ) : null}

          {error ? (
            <p role="alert" className="text-danger px-3 py-2 text-xs">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
