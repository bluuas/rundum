'use client'

import { Field, TextInput } from '@/components/ui/field'

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

  return (
    <Field label="Maximum participants" htmlFor="max" hint={hint} error={error}>
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
          No limit — anyone can join
        </label>
      </div>
    </Field>
  )
}
