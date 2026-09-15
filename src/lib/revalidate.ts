import { revalidatePath } from 'next/cache'
import { LOCALES } from '@/lib/i18n/config'

/**
 * Revalidates a path in every language.
 *
 * Every page lives under a locale segment, so `revalidatePath('/profile')`
 * matches no route at all — the real paths are `/de/profile` and `/en/profile`.
 * Calls written the unprefixed way fail silently: nothing errors, nothing is
 * invalidated, and the page looks correct anyway as long as the component
 * happens to call `router.refresh()`. This helper is the only way actions
 * should revalidate.
 *
 * `path` is always the unprefixed form, matching `localeHref`.
 */
export function revalidateLocalized(path: string): void {
  const clean = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`
  for (const locale of LOCALES) revalidatePath(`/${locale}${clean}`)
}
