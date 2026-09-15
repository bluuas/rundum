'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { setActivityStatus, type OrganizerStatus } from '@/app/(app)/activities/actions'
import { Button } from '@/components/ui/button'
import type { ActivityStatus } from '@/lib/supabase/rows'

type Confirmable = 'cancelled' | 'deleted'

/**
 * Organizer actions on their own activity.
 *
 * Destructive changes use a two-step inline confirm rather than window.confirm:
 * a native dialog is easy to dismiss by reflex, and on mobile it appears
 * detached from the thing it is about.
 */
export function OrganizerControls({
  activityId,
  status,
  archived,
}: {
  activityId: string
  status: ActivityStatus
  archived: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState<Confirmable | null>(null)
  const [error, setError] = useState<string | null>(null)

  function apply(next: OrganizerStatus) {
    setError(null)
    setConfirming(null)

    startTransition(async () => {
      const result = await setActivityStatus(activityId, next)
      if (!result.ok) {
        setError(result.error)
        return
      }
      // A deleted activity is no longer readable, so stay off its page.
      if (next === 'deleted') router.push('/me')
      else router.refresh()
    })
  }

  return (
    <section className="border-border bg-surface rounded-card space-y-3 border p-4">
      <h2 className="text-fg text-base font-semibold">Organizer tools</h2>

      {!archived ? (
        <Link
          href={`/activities/${activityId}/edit`}
          className="border-border-strong text-fg hover:bg-surface-muted rounded-card flex min-h-11 w-full items-center justify-center border text-sm font-medium"
        >
          Edit details
        </Link>
      ) : null}

      {status === 'published' && !archived ? (
        <>
          <Button
            variant="secondary"
            fullWidth
            disabled={pending}
            onClick={() => apply('hidden')}
          >
            Hide from discovery
          </Button>
          <p className="text-fg-subtle text-xs">
            Hiding keeps the activity and its comments, but takes it out of the feed while
            you rework it.
          </p>
        </>
      ) : null}

      {status === 'hidden' ? (
        <>
          <Button fullWidth disabled={pending} onClick={() => apply('published')}>
            Publish again
          </Button>
          <p className="text-fg-subtle text-xs">
            This activity is hidden. Only you can see it.
          </p>
        </>
      ) : null}

      {status !== 'cancelled' && !archived ? (
        confirming === 'cancelled' ? (
          <ConfirmRow
            question="Cancel this activity? Everyone who joined will see it as cancelled."
            confirmLabel="Yes, cancel it"
            pending={pending}
            onConfirm={() => apply('cancelled')}
            onDismiss={() => setConfirming(null)}
          />
        ) : (
          <Button
            variant="secondary"
            fullWidth
            disabled={pending}
            onClick={() => setConfirming('cancelled')}
          >
            Cancel activity
          </Button>
        )
      ) : null}

      {status === 'cancelled' && !archived ? (
        <Button fullWidth disabled={pending} onClick={() => apply('published')}>
          Reinstate activity
        </Button>
      ) : null}

      {confirming === 'deleted' ? (
        <ConfirmRow
          question="Delete this activity? It disappears for everyone, including its comments."
          confirmLabel="Yes, delete it"
          pending={pending}
          danger
          onConfirm={() => apply('deleted')}
          onDismiss={() => setConfirming(null)}
        />
      ) : (
        <Button
          variant="ghost"
          fullWidth
          disabled={pending}
          onClick={() => setConfirming('deleted')}
          className="text-danger"
        >
          Delete activity
        </Button>
      )}

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </section>
  )
}

function ConfirmRow({
  question,
  confirmLabel,
  pending,
  danger,
  onConfirm,
  onDismiss,
}: {
  question: string
  confirmLabel: string
  pending: boolean
  danger?: boolean
  onConfirm: () => void
  onDismiss: () => void
}) {
  return (
    <div className="border-border-strong bg-surface-muted rounded-card space-y-2 border p-3">
      <p className="text-fg text-sm">{question}</p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onDismiss} disabled={pending}>
          Keep it
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          fullWidth
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </div>
  )
}
