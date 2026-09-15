'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Dictionary } from './dictionaries/en'
import { localeHref, type Locale } from './config'

/**
 * Makes the locale and its dictionary available to Client Components.
 *
 * Server Components read `params.locale` directly and call `getDictionary`.
 * Client Components cannot, and threading a dictionary through every prop would
 * be noise, so the locale layout puts it in context once.
 *
 * The dictionary is serialized into the client bundle as a prop, which is why
 * it contains only strings and arrays — no functions.
 */
type I18nValue = {
  locale: Locale
  t: Dictionary
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale
  dictionary: Dictionary
  children: ReactNode
}) {
  return (
    <I18nContext.Provider value={{ locale, t: dictionary }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) {
    throw new Error('useI18n must be used inside I18nProvider')
  }
  return value
}

/** Prefixes an app path with the current locale. */
export function useLocaleHref(): (path: string) => string {
  const { locale } = useI18n()
  return (path: string) => localeHref(locale, path)
}
