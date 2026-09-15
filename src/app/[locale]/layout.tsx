import { notFound } from 'next/navigation'
import { I18nProvider } from '@/lib/i18n/provider'
import { getDictionary } from '@/lib/i18n'
import { LOCALES, isLocale } from '@/lib/i18n/config'

/**
 * Locale segment.
 *
 * Every page lives under /de or /en. The locale is in the path rather than a
 * cookie so that a shared link carries its language, the back button works, and
 * each language is separately cacheable and crawlable.
 */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params

  // An unknown prefix is a real 404, not a silent fallback: /fr/activities
  // should not quietly serve German.
  if (!isLocale(locale)) notFound()

  return (
    <I18nProvider locale={locale} dictionary={getDictionary(locale)}>
      {children}
    </I18nProvider>
  )
}
