'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  requestToJoin,
  withdrawJoinRequest,
  type JoinErrorCode,
} from '@/app/[locale]/(app)/activities/actions'
import { Button } from '@/components/ui/button'
import { TextArea } from '@/components/ui/field'
import { useI18n } from '@/lib/i18n/provider'
import type { JoinRequestStatus } from '@/lib/supabase/rows'

/**
 * The viewer's own relationship to an activity they do not organize.
 *
 * Five distinct states, each with its own affordance, rather than one button
 * that changes label: "you have asked and are waiting" and "you are in" call
 * for different words, and a declined request needs to stop asking to be
 * re-sent. The organizer never sees this component — they get Roster instead.
 */
export function JoinPanel({
  activityId,
  status,
  signedIn,
  open,
  full,
}: {
  activityId: string
  /** The viewer's existing request, or null if they have never asked. */
  status: JoinRequestStatus | null
  signedIn: boolean
  /** False once the activity is cancelled or has started. */
  open: boolean
  full: boolean
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [confirmingLeave, setConfirmingLeave] = useState(false)
  const [error, setError] = useState<JoinErrorCode | null>(null)

  function run(action: () => Promise<{ ok: boolean; code?: JoinErrorCode }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(result.code ?? 'unknown')
        return
      }
      setConfirmingLeave(false)
      router.refresh()
    })
  }

  if (!signedIn) {
    return <p className="text-fg-muted text-sm">{t.join.signInToJoin}</p>
  }

  if (!open) {
    return (
      <Button fullWidth size="lg" disabled>
        {t.detail.noLongerOpen}
      </Button>
    )
  }

  if (status === 'approved') {
    return (
      <div className="space-y-3">
        <Notice tone="success" title={t.join.approvedTitle} body={t.join.approvedBody} />
        {confirmingLeave ? (
          <Confirm
            question={t.join.confirmLeave}
            confirmLabel={t.join.confirmLeaveYes}
            dismissLabel={t.join.stay}
            pending={pending}
            onConfirm={() => run(() => withdrawJoinRequest(activityId))}
            onDismiss={() => setConfirmingLeave(false)}
          />
        ) : (
          <Button
            variant="ghost"
            fullWidth
            disabled={pending}
            onClick={() => setConfirmingLeave(true)}
          >
            {t.join.leave}
          </Button>
        )}
        <ErrorLine code={error} />
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="space-y-3">
        <Notice tone="waiting" title={t.join.pendingTitle} body={t.join.pendingBody} />
        <Button
          variant="secondary"
          fullWidth
          disabled={pending}
          onClick={() => run(() => withdrawJoinRequest(activityId))}
        >
          {pending ? t.common.working : t.join.withdraw}
        </Button>
        <ErrorLine code={error} />
      </div>
    )
  }

  // A declined request is final. Offering "ask again" here would make a decline
  // something the organizer has to keep repeating.
  if (status === 'declined') {
    return <Notice tone="muted" title={t.join.declinedTitle} body={t.join.declinedBody} />
  }

  if (full) {
    return (
      <Button fullWidth size="lg" disabled>
        {t.activity.full}
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <label htmlFor="join-message" className="text-fg-muted block text-sm">
        {t.join.messageLabel}{' '}
        <span className="text-fg-subtle">({t.common.optional})</span>
      </label>
      <TextArea
        id="join-message"
        value={message}
        maxLength={300}
        rows={2}
        placeholder={t.join.messagePlaceholder}
        onChange={(event) => setMessage(event.target.value)}
      />
      <Button
        fullWidth
        size="lg"
        disabled={pending}
        onClick={() => run(() => requestToJoin(activityId, message))}
      >
        {pending ? t.join.sending : t.detail.requestToJoin}
      </Button>
      <ErrorLine code={error} />
    </div>
  )
}

function Notice({
  tone,
  title,
  body,
}: {
  tone: 'success' | 'waiting' | 'muted'
  title: string
  body: string
}) {
  const tones = {
    success: 'bg-success-soft text-success',
    waiting: 'bg-warning-soft text-warning',
    muted: 'bg-surface-muted text-fg-muted',
  }

  return (
    <div className={`rounded-card px-4 py-3 ${tones[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-0.5 text-sm opacity-90">{body}</p>
    </div>
  )
}

function Confirm({
  question,
  confirmLabel,
  dismissLabel,
  pending,
  onConfirm,
  onDismiss,
}: {
  question: string
  confirmLabel: string
  dismissLabel: string
  pending: boolean
  onConfirm: () => void
  onDismiss: () => void
}) {
  return (
    <div className="border-border-strong bg-surface-muted rounded-card space-y-2 border p-3">
      <p className="text-fg text-sm">{question}</p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onDismiss} disabled={pending}>
          {dismissLabel}
        </Button>
        <Button variant="danger" fullWidth onClick={onConfirm} disabled={pending}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  )
}

/** Translates a failure code from the database into the reader's language. */
function ErrorLine({ code }: { code: JoinErrorCode | null }) {
  const { t } = useI18n()
  if (!code) return null

  return (
    <p role="alert" className="text-danger text-sm">
      {t.join.errors[code]}
    </p>
  )
}
