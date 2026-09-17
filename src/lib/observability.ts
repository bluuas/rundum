/**
 * Where errors go.
 *
 * Rundum has no error-tracking vendor: the deployment's own log search is the
 * tool, which means the logs have to be worth searching. A bare
 * `console.error(error)` prints a stack and nothing to filter on; this prints
 * one JSON line per failure with a stable `scope`, so "every failure in
 * createActivity this week" is a query rather than a read-through.
 *
 * Two things this deliberately does not do:
 *
 *   * It does not swallow. A failure that is reported is still returned to the
 *     caller and still shown to the user.
 *   * It does not reach the browser. Client-side errors never arrive in a
 *     server log, so under this arrangement they are invisible — that is the
 *     cost of not having a tracker, and it is recorded in LAUNCH.md rather
 *     than papered over with a home-made endpoint.
 */

type Context = Record<string, string | number | boolean | null | undefined>

export function reportError(scope: string, error: unknown, context: Context = {}): void {
  const detail =
    error instanceof Error
      ? { message: error.message, stack: error.stack }
      : // Supabase returns plain objects with `code`, `message`, `details`.
        { message: JSON.stringify(error) }

  console.error(
    JSON.stringify({
      level: 'error',
      scope,
      ...context,
      ...detail,
      at: new Date().toISOString(),
    }),
  )
}
