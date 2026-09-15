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
 */
describe('Swiss date and time conventions', () => {
  // 15 September 2026, 19:57 local time.
  const evening = new Date(2026, 8, 15, 19, 57)
  // 5 February 2026, 07:05 local — single digits, and an AM/PM trap.
  const morning = new Date(2026, 1, 5, 7, 5)

  it('formats time as 24-hour, zero-padded', () => {
    expect(formatTime(evening)).toBe('19:57')
    expect(formatTime(morning)).toBe('07:05')
  })

  it('never emits AM or PM', () => {
    for (let hour = 0; hour < 24; hour++) {
      const formatted = formatTime(new Date(2026, 0, 1, hour, 30))
      expect(formatted).not.toMatch(/[ap]\.?m\.?/i)
      expect(formatted).toMatch(/^\d{2}:\d{2}$/)
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
    const now = new Date(2026, 8, 15, 12, 0)

    it('uses relative words within a day, in the right language', () => {
      expect(formatStartShort(new Date(2026, 8, 15, 18, 30), 'en', now)).toBe(
        'Today 18:30',
      )
      expect(formatStartShort(new Date(2026, 8, 15, 18, 30), 'de', now)).toBe(
        'Heute 18:30',
      )
      expect(formatStartShort(new Date(2026, 8, 16, 7, 0), 'de', now)).toBe(
        'Morgen 07:00',
      )
    })

    it('uses a weekday within the week', () => {
      expect(formatStartShort(new Date(2026, 8, 19, 9, 0), 'en', now)).toBe('Sat 09:00')
      expect(formatStartShort(new Date(2026, 8, 19, 9, 0), 'de', now)).toBe('Sa 09:00')
    })

    it('falls back to a Swiss date beyond a week, identically in both languages', () => {
      expect(formatStartShort(new Date(2026, 9, 1, 9, 0), 'en', now)).toBe(
        '01.10.2026 09:00',
      )
      expect(formatStartShort(new Date(2026, 9, 1, 9, 0), 'de', now)).toBe(
        '01.10.2026 09:00',
      )
    })
  })

  it('translates relative comment timestamps', () => {
    const now = new Date(2026, 8, 15, 12, 0)
    expect(formatRelative(new Date(2026, 8, 15, 11, 59, 30), 'en', now)).toBe('just now')
    expect(formatRelative(new Date(2026, 8, 15, 11, 59, 30), 'de', now)).toBe(
      'gerade eben',
    )
    expect(formatRelative(new Date(2026, 8, 15, 10, 0), 'de', now)).toBe('vor 2 Std.')
    // Older than a week falls back to the Swiss date in both languages.
    expect(formatRelative(new Date(2026, 7, 1, 10, 0), 'de', now)).toBe('01.08.2026')
  })

  it('produces ISO values for native inputs, whatever the display locale', () => {
    // The input element's value is always ISO/24-hour; only its rendering
    // follows the browser locale.
    expect(toDateInputValue(evening)).toBe('2026-09-15')
    expect(toTimeInputValue(morning)).toBe('07:05')
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
