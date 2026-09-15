import type { MetadataRoute } from 'next'
import { isDemoModeEnabled } from '@/lib/auth/dev'

/**
 * A published demo is for the people who were given the link: seeded data,
 * shared accounts, and a warning banner on every screen. It must not be what a
 * search for Rundum turns up, so demo deployments disallow everything.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: isDemoModeEnabled()
      ? { userAgent: '*', disallow: '/' }
      : { userAgent: '*', allow: '/' },
  }
}
