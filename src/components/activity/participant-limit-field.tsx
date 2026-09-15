'use client'

import { Field, TextInput } from '@/components/ui/field'
import { useI18n } from '@/lib/i18n/provider'

/**
 * Participant limit, with an explicit "no limit" option.
 *
 * The toggle drives a null value rather than a sentinel number, and the number
 * input is hidden rather than disabled when unlimited is chosen — a greyed-out
 * field invites people to wonder what it would have said.
 */
export function ParticipantLimitField({
  value,
  onChange,
  hint,
  error,
}: {
  /** null means no limit. */
  value: number | null
  onChange: (value: number | null) => void
  hint?: string
  error?: string
}) {
  const unlimited = value === null
  const { t } = useI18n()

  return (
    <Field label={t.create.fieldMax} htmlFor="max" hint={hint} error={error}>
      <div className="space-y-2">
        {!unlimited ? (
          <TextInput
            id="max"
            type="number"
            inputMode="numeric"
            min="1"
            max="100"
            value={String(value)}
            onChange={(event) => {
              const next = Number(event.target.value)
              onChange(Number.isFinite(next) ? next : 1)
            }}
          />
        ) : null}

        <label className="text-fg flex min-h-11 items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={unlimited}
            onChange={(event) => onChange(event.target.checked ? null : 10)}
            className="accent-brand h-5 w-5"
          />
          {t.create.noLimitOption}
        </label>
      </div>
    </Field>
  )
}
