import { describe, expect, it } from 'vitest'
import { athleteDisplayName } from './client'

describe('athleteDisplayName', () => {
  it('joins the two names Strava sends', () => {
    expect(athleteDisplayName({ id: 1, firstname: 'Rea', lastname: 'Hofer' })).toBe(
      'Rea Hofer',
    )
  })

  it('copes with only one of them', () => {
    expect(athleteDisplayName({ id: 1, firstname: 'Rea', lastname: null })).toBe('Rea')
    expect(athleteDisplayName({ id: 1, firstname: null, lastname: 'Hofer' })).toBe(
      'Hofer',
    )
  })

  it('offers nothing rather than something the profiles table would reject', () => {
    // display_name is constrained to 2-50 characters, so anything outside that
    // is not a name we can offer — returning it would fail at the insert.
    expect(athleteDisplayName({ id: 1, firstname: 'A', lastname: null })).toBeNull()
    expect(athleteDisplayName({ id: 1, firstname: 'x'.repeat(60) })).toBeNull()
    expect(athleteDisplayName({ id: 1 })).toBeNull()
    expect(athleteDisplayName(undefined)).toBeNull()
  })

  it('treats whitespace as absent', () => {
    expect(athleteDisplayName({ id: 1, firstname: '  ', lastname: '  ' })).toBeNull()
  })
})
