import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // See the comment in the stub: the real package exists to throw outside
      // a server context, which would make its dependants untestable.
      'server-only': fileURLToPath(
        new URL('./test/stubs/server-only.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    /*
      Deliberately not Switzerland, and deliberately not UTC either.

      Every user-visible time is the city's wall clock, and the only way to
      show that is to run where the runtime's clock disagrees with it. A suite
      that runs in Europe/Zurich passes whether or not the code pins the zone —
      which is exactly how `date.getHours()` survived until it reached a server
      running UTC. New York is on the other side of both, and changes its
      offset on different dates than Switzerland does.
    */
    env: { TZ: 'America/New_York' },
  },
})
