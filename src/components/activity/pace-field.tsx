'use client'

import { Field, TextInput } from '@/components/ui/field'
import { useI18n } from '@/lib/i18n/provider'
import type { PaceUnit } from '@/lib/sports'

/**
 * The one field whose unit depends on the sport.
 *
 * A cyclist reads "2:30 /km" and has to divide to find out whether that is a
 * fast ride; a swimmer reads "25:00 /km" and sees nothing they recognise. So
 * the label, the hint and the example all follow the sport, while the value
 * that reaches the database stays seconds per kilometre.
 *
 * Shared by the create and edit forms rather than written twice, because the
 * two drifting apart is how a cyclist ends up typing minutes into a field that
 * reads kilometres per hour.
 */
export function PaceField({
  unit,
  value,
  onChange,
  error,
}: {
  unit: PaceUnit
  value: string
  onChange: (value: string) => void
  error?: string
}) {
  const { t } = useI18n()

  const speed = unit === 'km_per_h'
  const label = speed ? t.create.fieldSpeed : t.create.fieldPace
  const hint = speed
    ? t.create.speedHint
    : unit === 'min_per_100m'
      ? t.create.pace100mHint
      : t.create.paceHint
  const placeholder = speed ? '28' : unit === 'min_per_100m' ? '2:00' : '5:30'

  return (
    <Field label={label} htmlFor="pace" optional hint={hint} error={error}>
      <TextInput
        id="pace"
        value={value}
        placeholder={placeholder}
        // A speed is a number and a pace is a clock, so only one of them wants
        // the numeric keypad on a phone.
        inputMode={speed ? 'decimal' : 'text'}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  )
}
