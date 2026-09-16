import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatRelative,
  formatStartFull,
  formatStartShort,
  formatTime,
  isFull,
  toDateInputValue,
  toTimeInputValue,
} from './format'
import { LOCALES } from './i18n/config'

/**
 * Swiss conventions are a product rule, not a preference, so they are pinned
 * down here: 24-hour time and DD.MM.YYYY, with no AM/PM and no month-first
 * ordering — and that must hold in every language, since only the words are
 * translated, never the numbers.
 *
 * Every fixture is an instant with an explicit offset, never
 * `new Date(y, m, d, …)`, which reads as the runtime's local time. This suite
 * runs under TZ=America/New_York, so a fixture built the local way would
 * describe a different moment than it appears to and then agree with code that
 * made the same mistake. Suffix `+02:00` is Swiss summer time, `+01:00` winter.
 */
describe('Swiss date and time conventions', () => {
  // 15 September 2026, 19:57 in Schwyz — 13:57 in New York, 17:57 UTC.
  const evening = new Date('2026-09-15T19:57:00+02:00')
  // 5 February 2026, 07:05 in Schwyz — single digits, an AM/PM trap, and
  // 01:05 the same morning in New York.
  const morning = new Date('2026-02-05T07:05:00+01:00')

  it('formats time as 24-hour, zero-padded', () => {
    expect(formatTime(evening)).toBe('19:57')
    expect(formatTime(morning)).toBe('07:05')
  })

  it('never emits AM or PM, at any hour of the day', () => {
    for (let hour = 0; hour < 24; hour++) {
      const at = new Date(`2026-01-01T${String(hour).padStart(2, '0')}:30:00+01:00`)
      const formatted = formatTime(at)
      expect(formatted).not.toMatch(/[ap]\.?m\.?/i)
      expect(formatted).toMatch(/^\d{2}:\d{2}$/)
      // And it is that hour on the city's clock, not the runtime's.
      expect(formatted).toBe(`${String(hour).padStart(2, '0')}:30`)
    }
  })

  it('formats dates as DD.MM.YYYY, never month-first', () => {
    expect(formatDate(evening)).toBe('15.09.2026')
    expect(formatDate(morning)).toBe('05.02.2026')
  })

  it('combines date and time in Swiss order', () => {
    expect(formatDateTime(evening)).toBe('15.09.2026, 19:57')
  })

  it('keeps the numeric format identical in every locale', () => {
    for (const locale of LOCALES) {
      expect(formatStartFull(evening, locale)).toContain('15.09.2026')
      expect(formatStartFull(evening, locale)).toContain('19:57')
      expect(formatStartFull(evening, locale)).not.toMatch(/[ap]\.?m\.?/i)
      expect(formatStartFull(evening, locale)).not.toMatch(/\d\/\d/)
    }
  })

  it('translates the words around those numbers', () => {
    expect(formatStartFull(evening, 'en')).toBe('Tuesday, 15.09.2026, 19:57')
    expect(formatStartFull(evening, 'de')).toBe('Dienstag, 15.09.2026, 19:57')
  })

  describe('formatStartShort', () => {
    const now = new Date('2026-09-15T12:00:00+02:00')

    it('uses relative words within a day, in the right language', () => {
      expect(formatStartShort(new Date('2026-09-15T18:30:00+02:00'), 'en', now)).toBe(
        'Today 18:30',
      )
      expect(formatStartShort(new Date('2026-09-15T18:30:00+02:00'), 'de', now)).toBe(
        'Heute 18:30',
      )
      expect(formatStartShort(new Date('2026-09-16T07:00:00+02:00'), 'de', now)).toBe(
        'Morgen 07:00',
      )
    })

    it('uses a weekday within the week', () => {
      expect(formatStartShort(new Date('2026-09-19T09:00:00+02:00'), 'en', now)).toBe(
        'Sat 09:00',
      )
      expect(formatStartShort(new Date('2026-09-19T09:00:00+02:00'), 'de', now)).toBe(
        'Sa 09:00',
      )
    })

    it('falls back to a Swiss date beyond a week, identically in both languages', () => {
      expect(formatStartShort(new Date('2026-10-01T09:00:00+02:00'), 'en', now)).toBe(
        '01.10.2026 09:00',
      )
      expect(formatStartShort(new Date('2026-10-01T09:00:00+02:00'), 'de', now)).toBe(
        '01.10.2026 09:00',
      )
    })
  })

  it('translates relative comment timestamps', () => {
    const now = new Date('2026-09-15T12:00:00+02:00')
    expect(formatRelative(new Date('2026-09-15T11:59:30+02:00'), 'en', now)).toBe(
      'just now',
    )
    expect(formatRelative(new Date('2026-09-15T11:59:30+02:00'), 'de', now)).toBe(
      'gerade eben',
    )
    expect(formatRelative(new Date('2026-09-15T10:00:00+02:00'), 'de', now)).toBe(
      'vor 2 Std.',
    )
    // Older than a week falls back to the Swiss date in both languages.
    expect(formatRelative(new Date('2026-08-01T10:00:00+02:00'), 'de', now)).toBe(
      '01.08.2026',
    )
  })

  it('produces ISO values for native inputs, whatever the display locale', () => {
    // The input element's value is always ISO/24-hour; only its rendering
    // follows the browser locale.
    expect(toDateInputValue(evening)).toBe('2026-09-15')
    expect(toTimeInputValue(morning)).toBe('07:05')
  })

  /*
    The defect this suite was moved into a foreign timezone to catch.

    An activity at 18:30 in Schwyz renders as 18:30 to everyone: to the
    organizer, to somebody browsing from New York, and to the server rendering
    the page, which on Vercel runs in UTC.
  */
  it('shows the city clock, not the runtime clock', () => {
    // 22:30 in Schwyz is 16:30 the same day in New York and 20:30 UTC. Read
    // as local time it would be a different hour, and a different date.
    const lateEvening = new Date('2026-07-15T22:30:00+02:00')
    expect(formatTime(lateEvening)).toBe('22:30')
    expect(formatDate(lateEvening)).toBe('15.07.2026')

    // 00:30 in Schwyz is still the previous evening in New York, so a runtime
    // clock would put this on the day before.
    const afterMidnight = new Date('2026-07-16T00:30:00+02:00')
    expect(formatDate(afterMidnight)).toBe('16.07.2026')
    expect(formatStartFull(afterMidnight, 'en')).toBe('Thursday, 16.07.2026, 00:30')
  })
})

describe('isFull', () => {
  it('treats an unlimited activity as never full', () => {
    expect(isFull(0, null)).toBe(false)
    expect(isFull(9_999, null)).toBe(false)
  })

  it('is full at and beyond the limit', () => {
    expect(isFull(11, 12)).toBe(false)
    expect(isFull(12, 12)).toBe(true)
    // Over-subscribed rows can exist if a limit is lowered after approvals.
    expect(isFull(13, 12)).toBe(true)
  })
})
