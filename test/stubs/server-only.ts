/**
 * Stub for the `server-only` package under Vitest.
 *
 * The real module throws when imported outside a React Server Component, which
 * is exactly what it is for — but it also means a unit test cannot import any
 * module that guards itself with it. Aliasing it to nothing lets the pure
 * helpers in those modules be tested without weakening the guard in the app,
 * where the real package is still what gets bundled.
 */
export {}
