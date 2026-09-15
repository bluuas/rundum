import { describe, expect, it } from 'vitest'
import { formatParticipantLimit, formatParticipants, isFull } from './format'

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
    // Over-subscribed rows can exist if a limit is lowered after approvals.
    expect(isFull(13, 12)).toBe(true)
  })
})
