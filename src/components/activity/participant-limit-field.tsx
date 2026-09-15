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
  /**
   * Lowest limit still allowed, i.e. how many people are already approved.
   * Enforced again in the Server Action; this stops the organizer from typing
   * a number that would be rejected rather than explaining it afterwards.
   */
  minimum = 1,
}: {
  /** null means no limit. */
  value: number | null
  onChange: (value: number | null) => void
  hint?: string
  error?: string
  minimum?: number
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
            min={String(minimum)}
            max="100"
            value={String(value)}
            onChange={(event) => {
              const next = Number(event.target.value)
              onChange(Number.isFinite(next) ? Math.max(next, minimum) : minimum)
            }}
          />
        ) : null}

        <label className="text-fg flex min-h-11 items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={unlimited}
            onChange={(event) =>
              onChange(event.target.checked ? null : Math.max(10, minimum))
            }
            className="accent-brand h-5 w-5"
          />
          {t.create.noLimitOption}
        </label>
      </div>
    </Field>
  )
}
