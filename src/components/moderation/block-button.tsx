'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { blockUser, type ModerationErrorCode } from '@/lib/moderation/actions'
import { Button } from '@/components/ui/button'
import { fill } from '@/lib/i18n'
import { localeHref } from '@/lib/i18n/config'
import { useI18n } from '@/lib/i18n/provider'

/**
 * Blocking somebody, from wherever you ran into them.
 *
 * The confirmation states both consequences plainly — you stop seeing each
 * other, and any place either of you holds at the other's activity is freed —
 * because the second one is not obvious and is not undone by unblocking.
 *
 * After blocking, the current page is very likely no longer readable: RLS hides
 * the blocked user's activities from the blocker. So this navigates away rather
 * than refreshing into a 404.
 */
export function BlockButton({
  userId,
  displayName,
}: {
  userId: string
  displayName: string
}) {
  const router = useRouter()
  const { locale, t } = useI18n()
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<ModerationErrorCode | null>(null)

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-fg-subtle hover:text-danger min-h-11 text-xs underline"
      >
        {fill(t.moderation.block, { name: displayName })}
      </button>
    )
  }

  return (
    <div className="border-border-strong bg-surface-muted rounded-card space-y-2 border p-3">
      <p className="text-fg text-sm">
        {fill(t.moderation.blockConfirm, { name: displayName })}
      </p>

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {t.moderation.errors[error]}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          {t.common.cancel}
        </Button>
        <Button
          variant="danger"
          fullWidth
          disabled={pending}
          onClick={() => {
            setError(null)
            startTransition(async () => {
              const result = await blockUser(userId)
              if (!result.ok) {
                setError(result.code)
                return
              }
              router.push(localeHref(locale, '/'))
            })
          }}
        >
          {pending ? t.common.working : t.moderation.blockYes}
        </Button>
      </div>
    </div>
  )
}
