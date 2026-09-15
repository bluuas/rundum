import { de } from './dictionaries/de'
import { en, type Dictionary } from './dictionaries/en'
import { DEFAULT_LOCALE, type Locale } from './config'

export type { Dictionary }

const DICTIONARIES: Record<Locale, Dictionary> = { de, en }

/**
 * The dictionary for a locale.
 *
 * Both dictionaries are plain modules rather than dynamic imports: together
 * they are a few kilobytes, and the indirection of async loading buys nothing
 * at this size while making every Server Component that needs a string async.
 */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE]
}

/**
 * Fills {placeholders} in a translated string.
 *
 * Dictionaries hold plain strings, not functions, because they cross the server
 * to client boundary as props and must stay serializable.
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  )
}

/**
 * Picks a singular or plural string and fills in the count.
 *
 * German and English share the same one/other split, so a two-form rule is
 * enough. A language with more forms would need Intl.PluralRules here.
 */
export function plural(
  count: number,
  forms: { one: string; other: string },
  values: Record<string, string | number> = {},
): string {
  return fill(count === 1 ? forms.one : forms.other, { count, ...values })
}
