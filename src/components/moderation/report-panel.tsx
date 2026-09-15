'use client'

import { useState, useTransition } from 'react'
import { submitReport, type ModerationErrorCode } from '@/lib/moderation/actions'
import { Button } from '@/components/ui/button'
import { Field, SelectInput, TextArea } from '@/components/ui/field'
import { useI18n } from '@/lib/i18n/provider'
import {
  REPORT_REASONS,
  type ReportReason,
  type ReportTarget,
} from '@/lib/validation/report'

/**
 * Reporting an activity, a comment or a person.
 *
 * Inline and collapsed rather than a modal: everything else in Rundum confirms
 * in place, and a dialog on a phone hides the thing being reported at exactly
 * the moment the reporter is trying to describe it.
 *
 * The confirmation says a person will look, and says nothing about what will
 * happen to the reported account — promising an outcome the moderator has not
 * decided is how a report system loses trust.
 */
export function ReportPanel({
  targetType,
  targetId,
  label,
  className,
}: {
  targetType: ReportTarget
  targetId: string
  /** What the trigger says, e.g. "Report this activity". */
  label: string
  className?: string
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()
  const [reason, setReason] = useState<ReportReason>('spam')
  const [details, setDetails] = useState('')
  const [error, setError] = useState<ModerationErrorCode | null>(null)

  if (done) {
    return (
      <div className="bg-success-soft text-success rounded-card px-4 py-3">
        <p className="text-sm font-semibold">{t.moderation.thanksTitle}</p>
        <p className="mt-0.5 text-sm opacity-90">{t.moderation.thanksBody}</p>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-fg-subtle hover:text-fg-muted min-h-11 text-xs underline ${className ?? ''}`}
      >
        {label}
      </button>
    )
  }

  function send() {
    setError(null)
    startTransition(async () => {
      const result = await submitReport({ targetType, targetId, reason, details })
      if (!result.ok) {
        setError(result.code)
        return
      }
      setOpen(false)
      setDone(true)
    })
  }

  return (
    <section className="border-border bg-surface rounded-card space-y-3 border p-4">
      <h3 className="text-fg text-sm font-semibold">{t.moderation.reportHeading}</h3>

      <Field label={t.moderation.reportHeading} htmlFor={`reason-${targetId}`}>
        <SelectInput
          id={`reason-${targetId}`}
          value={reason}
          onChange={(event) => setReason(event.target.value as ReportReason)}
        >
          {REPORT_REASONS.map((key) => (
            <option key={key} value={key}>
              {t.moderation.reasons[key]}
            </option>
          ))}
        </SelectInput>
      </Field>

      <Field label={t.moderation.detailsLabel} htmlFor={`details-${targetId}`}>
        <TextArea
          id={`details-${targetId}`}
          value={details}
          maxLength={1000}
          rows={3}
          placeholder={t.moderation.detailsPlaceholder}
          onChange={(event) => setDetails(event.target.value)}
        />
      </Field>

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {t.moderation.errors[error]}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
          {t.common.cancel}
        </Button>
        <Button fullWidth disabled={pending} onClick={send}>
          {pending ? t.moderation.sending : t.moderation.submit}
        </Button>
      </div>
    </section>
  )
}
