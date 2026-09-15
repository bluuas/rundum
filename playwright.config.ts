import { defineConfig, devices } from '@playwright/test'

/**
 * Mobile-first, so the default project is a phone viewport. Rundum is designed
 * for 390px wide; testing at desktop width would miss the layout that most
 * users actually get.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 45_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  /*
   * Two servers: the app, and the local stand-in for Strava's OAuth endpoints.
   * The Strava suite skips itself when STRAVA_AUTH_BASE_URL is unset, so a
   * checkout without it still runs everything else.
   */
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run dev:strava',
      url: 'http://localhost:4400/oauth/authorize',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
})
