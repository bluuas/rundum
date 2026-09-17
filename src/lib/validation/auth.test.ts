import { describe, expect, it } from 'vitest'
import { emailSignInSchema } from './auth'

describe('emailSignInSchema', () => {
  it('accepts an ordinary address', () => {
    expect(emailSignInSchema.parse({ email: 'anouk@example.ch' }).email).toBe(
      'anouk@example.ch',
    )
  })

  it('normalises case and surrounding space', () => {
    // Supabase matches addresses case-insensitively, so two spellings are one
    // account. Anything that counts or logs them should agree.
    expect(emailSignInSchema.parse({ email: '  Anouk@Example.CH ' }).email).toBe(
      'anouk@example.ch',
    )
  })

  it('rejects an empty field with a message about the field, not the format', () => {
    const result = emailSignInSchema.safeParse({ email: '   ' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Enter your email address')
  })

  it.each(['anouk', 'anouk@', '@example.ch', 'anouk example@ch'])(
    'rejects %j',
    (email) => {
      expect(emailSignInSchema.safeParse({ email }).success).toBe(false)
    },
  )

  it('rejects an address longer than an address can be', () => {
    // 254 is the SMTP maximum. Longer is not a typo, it is somebody probing.
    const long = `${'a'.repeat(250)}@example.ch`
    expect(emailSignInSchema.safeParse({ email: long }).success).toBe(false)
  })
})
