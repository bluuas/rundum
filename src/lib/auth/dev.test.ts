import { afterEach, describe, expect, it, vi } from 'vitest'
import { isAccountSwitchingEnabled, isDemoModeEnabled, isMockAuthEnabled } from './dev'

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

/**
 * Demo mode is the one switch that opens account switching on a deployed
 * build, so what it does and does not imply is worth pinning down too.
 */
describe('isDemoModeEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is on in production when the flag is set — that is the point', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DEMO_MODE', 'true')
    expect(isDemoModeEnabled()).toBe(true)
  })

  it('is off unless the flag says exactly true', () => {
    vi.stubEnv('DEMO_MODE', '1')
    expect(isDemoModeEnabled()).toBe(false)
    vi.stubEnv('DEMO_MODE', '')
    expect(isDemoModeEnabled()).toBe(false)
  })

  it('is not turned on by the development flag', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('ALLOW_MOCK_AUTH', 'true')
    vi.stubEnv('DEMO_MODE', '')
    expect(isMockAuthEnabled()).toBe(true)
    expect(isDemoModeEnabled()).toBe(false)
  })
})

describe('isAccountSwitchingEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is off on a plain production deployment', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ALLOW_MOCK_AUTH', 'true')
    vi.stubEnv('DEMO_MODE', '')
    expect(isAccountSwitchingEnabled()).toBe(false)
  })

  it('is on for either mode', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('ALLOW_MOCK_AUTH', 'true')
    vi.stubEnv('DEMO_MODE', '')
    expect(isAccountSwitchingEnabled()).toBe(true)

    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ALLOW_MOCK_AUTH', '')
    vi.stubEnv('DEMO_MODE', 'true')
    expect(isAccountSwitchingEnabled()).toBe(true)
  })
})
