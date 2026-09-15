'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  decideJoinRequest,
  type JoinErrorCode,
} from '@/app/[locale]/(app)/activities/actions'
import { StravaConnectedBadge } from '@/components/activity/badges'
import { Button } from '@/components/ui/button'
import { plural } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n/provider'
import type { RosterEntry } from '@/lib/supabase/rows'

/**
 * Who is coming, and — for the organizer — who is waiting.
 *
 * The database decides what this component is allowed to receive: the
 * activity_roster RPC returns pending requests only to the organizer, approved
 * participants only to the organizer and to other approved participants, and
 * nothing at all to everyone else. An empty list is therefore the normal render
 * for a passer-by, not an error, and needs no special case here.
 */
export function Roster({
  activityId,
  entries,
  isOwner,
  currentUserId,
  full,
}: {
  activityId: string
  entries: RosterEntry[]
  isOwner: boolean
  currentUserId: string | null
  /** Blocks approval while every place is taken. */
  full: boolean
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [pending, startTransition] = useTransition()
  const [decidingId, setDecidingId] = useState<string | null>(null)
  const [error, setError] = useState<JoinErrorCode | null>(null)

  const waiting = entries.filter((entry) => entry.status === 'pending')
  const going = entries.filter((entry) => entry.status === 'approved')

  function decide(requestId: string, approve: boolean) {
    setError(null)
    setDecidingId(requestId)
    startTransition(async () => {
      const result = await decideJoinRequest(requestId, activityId, approve)
      setDecidingId(null)
      if (!result.ok) {
        setError(result.code)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {isOwner ? (
        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-fg text-sm font-semibold">{t.join.requestsHeading}</h3>
            {waiting.length > 0 ? (
              <span className="text-fg-subtle text-xs">
                {plural(waiting.length, {
                  one: t.join.requestsCountOne,
                  other: t.join.requestsCountOther,
                })}
              </span>
            ) : null}
          </div>

          {waiting.length === 0 ? (
            <p className="text-fg-subtle text-sm">{t.join.noRequests}</p>
          ) : (
            <ul className="space-y-2">
              {waiting.map((entry) => (
                <li
                  key={entry.request_id}
                  className="border-border bg-surface rounded-card border p-3"
                >
                  <Person entry={entry} currentUserId={currentUserId} />

                  {entry.message ? (
                    <p className="text-fg-muted mt-2 text-sm whitespace-pre-wrap">
                      {entry.message}
                    </p>
                  ) : null}

                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="secondary"
                      disabled={pending}
                      onClick={() => decide(entry.request_id, false)}
                    >
                      {t.join.decline}
                    </Button>
                    <Button
                      fullWidth
                      // Approving into a full activity would fail in the
                      // database anyway; disabling says so before the tap.
                      disabled={pending || full}
                      onClick={() => decide(entry.request_id, true)}
                    >
                      {pending && decidingId === entry.request_id
                        ? t.common.working
                        : t.join.approve}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {full && waiting.length > 0 ? (
            <p className="text-fg-subtle text-xs">{t.join.fullNote}</p>
          ) : null}
        </section>
      ) : null}

      {going.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-fg text-sm font-semibold">{t.join.heading}</h3>
          <ul className="border-border bg-surface rounded-card divide-border divide-y border">
            {going.map((entry) => (
              <li key={entry.request_id} className="px-3 py-2.5">
                <Person entry={entry} currentUserId={currentUserId} />
              </li>
            ))}
          </ul>
        </section>
      ) : isOwner ? (
        <p className="text-fg-subtle text-sm">{t.join.noParticipants}</p>
      ) : null}

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {t.join.errors[error]}
        </p>
      ) : null}
    </div>
  )
}

function Person({
  entry,
  currentUserId,
}: {
  entry: RosterEntry
  currentUserId: string | null
}) {
  const { t } = useI18n()

  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="bg-brand-soft text-brand-soft-fg flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
      >
        {entry.display_name.charAt(0)}
      </span>
      <div className="min-w-0">
        <p className="text-fg truncate text-sm font-medium">
          {entry.display_name}
          {entry.user_id === currentUserId ? (
            <span className="text-fg-subtle ml-1.5 text-[11px] font-normal">
              ({t.join.you})
            </span>
          ) : null}
        </p>
        {entry.strava_connected ? <StravaConnectedBadge /> : null}
      </div>
    </div>
  )
}
