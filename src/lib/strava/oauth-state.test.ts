import { describe, expect, it } from 'vitest'
import { createState, statesMatch } from './oauth-state'

describe('createState', () => {
  it('is long and unpredictable', () => {
    const a = createState()
    const b = createState()

    // 32 random bytes in base64url. Anything shorter would be worth guessing.
    expect(a.length).toBeGreaterThanOrEqual(43)
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})

describe('statesMatch', () => {
  it('accepts only an exact match', () => {
    expect(statesMatch('abc', 'abc')).toBe(true)
    expect(statesMatch('abc', 'abd')).toBe(false)
    expect(statesMatch('abc', 'abcd')).toBe(false)
  })

  it('rejects a missing value rather than treating it as a match', () => {
    // Without this, a callback carrying no state — which is what a forged one
    // looks like — would sail through against a missing cookie.
    expect(statesMatch(undefined, undefined)).toBe(false)
    expect(statesMatch('abc', undefined)).toBe(false)
    expect(statesMatch(undefined, 'abc')).toBe(false)
    expect(statesMatch('', '')).toBe(false)
  })
})
