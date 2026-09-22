import Link from 'next/link'
import { getDictionary } from '@/lib/i18n'
import { DEFAULT_LOCALE, localeHref } from '@/lib/i18n/config'
import './globals.css'
import { Icon } from '@/components/ui/icon'

/**
 * Root 404, for URLs that match no route at all — including an unsupported
 * language prefix like /fr.
 *
 * Rendered in the default locale, since a path that matches nothing carries no
 * usable language signal. Deliberately standalone rather than reusing the app
 * shell: the shell's bottom nav needs a locale, and this page exists precisely
 * because we do not have one.
 */
export default function RootNotFound() {
  const t = getDictionary(DEFAULT_LOCALE)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center px-6 text-center">
      <div className="text-4xl" aria-hidden>
        <Icon name="map-trifold" />
      </div>
      <h1 className="text-fg mt-4 text-xl font-bold tracking-tight">
        {t.states.notFoundTitle}
      </h1>
      <p className="text-fg-muted mt-2 text-sm">{t.states.notFoundBody}</p>
      <Link
        href={localeHref(DEFAULT_LOCALE, '/')}
        className="bg-brand text-brand-fg rounded-card mt-6 inline-flex min-h-11 items-center px-5 text-sm font-medium"
      >
        {t.states.backToDiscover}
      </Link>
    </main>
  )
}
