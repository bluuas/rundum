/**
 * Locale configuration.
 *
 * Locale lives in the URL (`/de/...`, `/en/...`) rather than a cookie or a
 * header, so a link someone shares carries its language with it, the back
 * button works, and each language can be crawled and cached separately.
 *
 * German is the default: Schwyz is German-speaking, and the launch audience
 * reads German first.
 */

export const LOCALES = ['de', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'de'

export const LOCALE_LABELS: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** Prefixes an app path with the locale. `path` is always the unprefixed form. */
export function localeHref(locale: Locale, path: string): string {
  const clean = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`
  return `/${locale}${clean}`
}

/** Strips the locale prefix, so a path can be re-prefixed with another locale. */
export function stripLocale(pathname: string): string {
  const match = /^\/([a-z]{2})(?=\/|$)/.exec(pathname)
  if (match && isLocale(match[1])) {
    return pathname.slice(match[1].length + 1) || '/'
  }
  return pathname
}

/**
 * Picks the best locale from an Accept-Language header.
 *
 * Deliberately simple: match the first supported language tag by quality order.
 * Anything unrecognised falls back to the default rather than guessing.
 */
export function matchLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE

  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=')
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)

  for (const { tag } of ranked) {
    const base = tag.split('-')[0]
    if (isLocale(base)) return base
  }

  return DEFAULT_LOCALE
}
