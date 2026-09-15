'use client'

import { useState } from 'react'
import { Field, TextInput } from '@/components/ui/field'
import { formatStartFull, toDateInputValue } from '@/lib/format'
import { combineDateAndTime } from '@/lib/validation/activity'
import { useI18n } from '@/lib/i18n/provider'

/**
 * Date and time inputs, with a Swiss-format echo of what was chosen.
 *
 * Native <input type="date"> and <input type="time"> are the right controls on
 * a phone — real pickers, accessible, familiar. But their *display* format
 * follows the browser's own locale and cannot be overridden from the page, so a
 * browser set to en-US shows 09/15/2026 and a 12-hour clock no matter what we
 * do. The underlying value is always ISO and 24-hour, so only the display is
 * affected.
 *
 * Rather than replace them with a custom picker, we restate the chosen moment
 * underneath in Swiss format. The user always sees an unambiguous confirmation
 * of what they picked, whatever their browser rendered.
 */
export function WhenFields({
  date,
  time,
  onDateChange,
  onTimeChange,
  dateError,
  layout = 'stacked',
}: {
  date: string
  time: string
  onDateChange: (value: string) => void
  onTimeChange: (value: string) => void
  dateError?: string
  layout?: 'stacked' | 'side-by-side'
}) {
  const chosen = date && time ? combineDateAndTime(date, time) : null
  const valid = chosen !== null && !Number.isNaN(chosen.getTime())
  const { locale, t } = useI18n()

  // The clock is read in event handlers, never during render: rendering must be
  // pure, and a render-time Date.now() would also differ between the server
  // render and client hydration.
  const [inPast, setInPast] = useState(false)
  const [today] = useState(() => toDateInputValue(new Date()))

  function check(nextDate: string, nextTime: string) {
    const next = nextDate && nextTime ? combineDateAndTime(nextDate, nextTime) : null
    setInPast(
      next !== null && !Number.isNaN(next.getTime()) && next.getTime() <= Date.now(),
    )
  }

  const fields = (
    <>
      <Field label={t.create.fieldDate} htmlFor="date" error={dateError}>
        <TextInput
          id="date"
          type="date"
          value={date}
          min={today}
          onChange={(event) => {
            onDateChange(event.target.value)
            check(event.target.value, time)
          }}
        />
      </Field>
      <Field label={t.create.fieldTime} htmlFor="time" hint={t.create.timeHint}>
        <TextInput
          id="time"
          type="time"
          value={time}
          onChange={(event) => {
            onTimeChange(event.target.value)
            check(date, event.target.value)
          }}
        />
      </Field>
    </>
  )

  return (
    <div className="space-y-3">
      {layout === 'side-by-side' ? (
        <div className="grid grid-cols-2 gap-3">{fields}</div>
      ) : (
        <div className="space-y-4">{fields}</div>
      )}

      {valid ? (
        <p
          className={
            inPast
              ? 'text-danger bg-danger-soft rounded-card px-3 py-2 text-sm'
              : 'text-fg-muted bg-surface-muted rounded-card px-3 py-2 text-sm'
          }
          role={inPast ? 'alert' : undefined}
        >
          {inPast ? t.create.alreadyPassed : t.create.startsAt}
          <span className="text-fg font-medium">{formatStartFull(chosen, locale)}</span>
        </p>
      ) : null}
    </div>
  )
}
