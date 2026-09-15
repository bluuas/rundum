import type { NextConfig } from 'next'

/**
 * Origins, other than localhost, that may talk to the **dev** server.
 *
 * Next blocks cross-origin requests to dev-only assets and endpoints, so
 * opening the app from another device — a phone on the same wifi, reaching it
 * by LAN address — fails without listing that address here.
 *
 * Driven by an environment variable rather than hard-coded, because the right
 * value is whatever subnet the machine happens to be on, and because the
 * default should stay tight: with nothing set, only localhost is allowed, which
 * is what you want on a laptop in a café. Comma-separated hostnames, no scheme
 * and no port, e.g.
 *
 *   DEV_ALLOWED_ORIGINS=192.168.31.*
 *
 * A `*` stands for exactly one label of the hostname. This affects `next dev`
 * only and has no effect on a production build.
 */
const devAllowedOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const nextConfig: NextConfig = {
  ...(devAllowedOrigins.length > 0 ? { allowedDevOrigins: devAllowedOrigins } : {}),
}

export default nextConfig
