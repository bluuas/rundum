'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { unblockUser } from '@/lib/moderation/actions'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { fill } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n/provider'
import type { BlockedAccount } from '@/lib/queries/my-activities'

/**
 * The list of people you have blocked, and the way back.
 *
 * A block that cannot be found again is a trap, so this is on the profile page
 * rather than hidden behind a settings screen — and the note says what
 * unblocking does and does not restore.
 */
export function BlockedAccounts({ accounts }: { accounts: BlockedAccount[] }) {
  const router = useRouter()
  const { t } = useI18n()
  const [pending, startTransition] = useTransition()

  return (
    <section className="border-border bg-surface rounded-card space-y-3 border p-4">
      <h2 className="text-fg text-sm font-semibold">{t.moderation.blockedHeading}</h2>

      {accounts.length === 0 ? (
        <p className="text-fg-muted text-sm">{t.moderation.blockedEmpty}</p>
      ) : (
        <>
          <ul className="divide-border divide-y">
            {accounts.map((account) => (
              <li
                key={account.userId}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-fg truncate text-sm font-medium">
                    {account.displayName}
                  </p>
                  <p className="text-fg-subtle text-xs">
                    {fill(t.moderation.blockedSince, {
                      date: formatDate(account.createdAt),
                    })}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await unblockUser(account.userId)
                      router.refresh()
                    })
                  }
                >
                  {t.moderation.unblock}
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-fg-subtle text-xs">{t.moderation.unblockNote}</p>
        </>
      )}
    </section>
  )
}
