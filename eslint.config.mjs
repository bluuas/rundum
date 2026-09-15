import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    // The service-role client bypasses RLS. Keep it out of anything that could
    // end up in a browser bundle; only seed scripts and explicitly server-only
    // modules may reach for it, and those are exempted below.
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/lib/supabase/admin', '@/lib/supabase/admin'],
              message:
                'The service-role client must not be imported here. Use @/lib/supabase/server for request-scoped access, and only import admin from a *.server.ts module or a script under scripts/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['scripts/**', 'src/**/*.server.ts', 'src/app/api/**'],
    rules: { 'no-restricted-imports': 'off' },
  },

  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'supabase/.temp/**']),
])

export default eslintConfig
