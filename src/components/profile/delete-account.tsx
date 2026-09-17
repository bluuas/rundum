'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteAccount } from '@/lib/account/delete-account.server'
import type { DeletionSummary } from '@/lib/account/delete-account.server'
import { fill, plural } from '@/lib/i18n'
import { localeHref } from '@/lib/i18n/config'
import { useI18n } from '@/lib/i18n/provider'

/**
 * Leaving Rundum.
 *
 * Two steps, and the second one states the cost in numbers rather than in
 * warnings. "Your data will be removed" is a phrase; "3 upcoming activities
 * will be cancelled, and 7 people who joined them will be told" is a fact, and
 * it is the one that stops somebody deleting an account at the wrong moment.
 *
 * Deliberately last on the page and deliberately not a `danger` button until
 * it is the actual confirmation: nobody should be one mis-tap from this.
 */
export function DeleteAccount({ summary }: { summary: DeletionSummary | null }) {
  const { locale, t } = useI18n()
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!confirming) {
    return (
      <section className="space-y-2 pt-2">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-fg-muted hover:text-danger min-h-11 text-sm underline"
        >
          {t.account.deleteCta}
        </button>
      </section>
    )
  }

  const consequences = [
    summary && summary.upcomingActivities > 0
      ? fill(
          plural(summary.upcomingActivities, {
            one: t.account.willCancelOne,
            other: t.account.willCancelOther,
          }),
          { count: summary.upcomingActivities },
        )
      : null,
    summary && summary.affectedParticipants > 0
      ? fill(
          plural(summary.affectedParticipants, {
            one: t.account.willAffectOne,
            other: t.account.willAffectOther,
          }),
          { count: summary.affectedParticipants },
        )
      : null,
    summary && summary.commentsWritten > 0
      ? fill(
          plural(summary.commentsWritten, {
            one: t.account.willRemoveCommentOne,
            other: t.account.willRemoveCommentOther,
          }),
          { count: summary.commentsWritten },
        )
      : null,
  ].filter(Boolean) as string[]

  return (
    <section className="border-danger bg-danger-soft rounded-card space-y-3 border p-4">
      <h2 className="text-fg text-sm font-semibold">{t.account.deleteHeading}</h2>

      {consequences.length > 0 ? (
        <ul className="text-fg list-disc space-y-1 pl-5 text-sm">
          {consequences.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="text-fg text-sm">{t.account.nothingToCancel}</p>
      )}

      <p className="text-fg-muted text-sm">{t.account.deleteBody}</p>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          {t.account.keepAccount}
        </Button>
        <Button
          variant="danger"
          fullWidth
          disabled={pending}
          onClick={() => {
            setError(null)
            startTransition(async () => {
              const result = await deleteAccount()
              if (!result.ok) {
                setError(result.error)
                return
              }
              // A full navigation, not router.push: the session is gone and
              // every cached segment was rendered for somebody who no longer
              // exists.
              window.location.assign(localeHref(locale, '/'))
            })
          }}
        >
          {pending ? t.account.deleting : t.account.deleteConfirm}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </section>
  )
}
