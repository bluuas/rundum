import { describe, expect, it } from 'vitest'
import { joinMessageSchema } from './join'

describe('joinMessageSchema', () => {
  it('keeps a real message', () => {
    expect(joinMessageSchema.parse('Is the pace easy?')).toBe('Is the pace easy?')
  })

  it('treats empty and whitespace-only as no message', () => {
    // The database renders null as "no message"; storing "   " would render an
    // empty bubble the organizer has to wonder about.
    expect(joinMessageSchema.parse('')).toBeNull()
    expect(joinMessageSchema.parse('   ')).toBeNull()
    expect(joinMessageSchema.parse(undefined)).toBeNull()
  })

  it('rejects a message longer than the column allows', () => {
    expect(joinMessageSchema.safeParse('x'.repeat(301)).success).toBe(false)
  })
})
