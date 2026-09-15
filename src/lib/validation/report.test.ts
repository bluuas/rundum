import { describe, expect, it } from 'vitest'
import { reportInputSchema } from './report'

const base = {
  targetType: 'activity' as const,
  targetId: '3f1c2b8a-5d4e-4a7b-9c2f-1e8d6b3a0f57',
  reason: 'spam' as const,
}

describe('reportInputSchema', () => {
  it('accepts a report with no details', () => {
    const parsed = reportInputSchema.parse(base)
    expect(parsed.details).toBeNull()
  })

  it('turns a whitespace-only note into no note', () => {
    expect(reportInputSchema.parse({ ...base, details: '   ' }).details).toBeNull()
  })

  it('rejects a reason that is not one of the offered ones', () => {
    // The reason is stored as a key and grouped on, so free text would make the
    // categories meaningless.
    expect(reportInputSchema.safeParse({ ...base, reason: 'because' }).success).toBe(
      false,
    )
  })

  it('rejects a target that is not a uuid', () => {
    expect(reportInputSchema.safeParse({ ...base, targetId: 'activity-1' }).success).toBe(
      false,
    )
  })
})
