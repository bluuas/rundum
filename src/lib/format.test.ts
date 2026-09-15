import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatParticipantLimit,
  formatParticipants,
  formatRelative,
  formatStartFull,
  formatStartShort,
  formatTime,
  isFull,
  toDateInputValue,
  toTimeInputValue,
} from './format'

/**
 * Swiss conventions are a product rule, not a preference, so they are pinned
 * down here: 24-hour time and DD.MM.YYYY, with no AM/PM and no month-first
 * ordering anywhere.
 */
describe('Swiss date and time conventions', () => {
  // 15 September 2026, 19:57 local time.
  const evening = new Date(2026, 8, 15, 19, 57)
  // 5 February 2026, 07:05 local — single digits, and a PM/AM trap.
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

  it('formats the full start label with an English weekday and a Swiss date', () => {
    expect(formatStartFull(evening)).toBe('Tuesday, 15.09.2026, 19:57')
  })

  describe('formatStartShort', () => {
    const now = new Date(2026, 8, 15, 12, 0)

    it('uses relative words within a day', () => {
      expect(formatStartShort(new Date(2026, 8, 15, 18, 30), now)).toBe('Today 18:30')
      expect(formatStartShort(new Date(2026, 8, 16, 7, 0), now)).toBe('Tomorrow 07:00')
      expect(formatStartShort(new Date(2026, 8, 14, 7, 0), now)).toBe('Yesterday 07:00')
    })

    it('uses a weekday within the week', () => {
      expect(formatStartShort(new Date(2026, 8, 19, 9, 0), now)).toBe('Sat 09:00')
    })

    it('falls back to a Swiss date beyond a week', () => {
      expect(formatStartShort(new Date(2026, 9, 1, 9, 0), now)).toBe('01.10.2026 09:00')
    })
  })

  it('falls back to a Swiss date for old comments', () => {
    const now = new Date(2026, 8, 15, 12, 0)
    expect(formatRelative(new Date(2026, 8, 15, 11, 59, 30), now)).toBe('just now')
    expect(formatRelative(new Date(2026, 8, 15, 10, 0), now)).toBe('2h ago')
    expect(formatRelative(new Date(2026, 7, 1, 10, 0), now)).toBe('01.08.2026')
  })

  it('produces ISO values for native inputs, whatever the display locale', () => {
    // The input element's value is always ISO/24-hour; only its rendering
    // follows the browser locale.
    expect(toDateInputValue(evening)).toBe('2026-09-15')
    expect(toTimeInputValue(morning)).toBe('07:05')
  })
})

describe('participant formatting', () => {
  it('shows a denominator when there is a limit', () => {
    expect(formatParticipants(3, 12)).toBe('3/12 joined')
    expect(formatParticipantLimit(3, 12)).toBe('3 of 12')
  })

  it('omits the denominator when there is no limit', () => {
    expect(formatParticipants(3, null)).toBe('3 joined')
    expect(formatParticipantLimit(3, null)).toBe('3 joined · no limit')
  })

  it('treats an unlimited activity as never full', () => {
    expect(isFull(0, null)).toBe(false)
    expect(isFull(9_999, null)).toBe(false)
  })

  it('is full at and beyond the limit', () => {
    expect(isFull(11, 12)).toBe(false)
    expect(isFull(12, 12)).toBe(true)
    expect(isFull(13, 12)).toBe(true)
  })
})
