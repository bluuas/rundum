import { afterEach, describe, expect, it, vi } from 'vitest'
import { isMockAuthEnabled } from './dev'

/**
 * These assertions are the whole security argument for the dev login route,
 * so they are worth pinning down explicitly.
 */
describe('isMockAuthEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is on in development when the flag is set', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('ALLOW_MOCK_AUTH', 'true')
    expect(isMockAuthEnabled()).toBe(true)
  })

  it('is off in development without the flag', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('ALLOW_MOCK_AUTH', '')
    expect(isMockAuthEnabled()).toBe(false)
  })

  it('stays off in production even if the flag is set', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ALLOW_MOCK_AUTH', 'true')
    expect(isMockAuthEnabled()).toBe(false)
  })
})
