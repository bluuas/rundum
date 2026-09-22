'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/ui/icon'
import type { IconName } from '@/lib/icons'
import { useI18n } from '@/lib/i18n/provider'
import { localeHref, stripLocale } from '@/lib/i18n/config'
import { cn } from '@/lib/utils'

const TABS = [
  { path: '/', key: 'discover', icon: 'compass' },
  { path: '/activities/new', key: 'create', icon: 'plus-circle' },
  { path: '/me', key: 'mine', icon: 'list-checks' },
  { path: '/profile', key: 'profile', icon: 'user-circle' },
] as const satisfies readonly { path: string; key: string; icon: IconName }[]

function isActive(pathname: string, path: string) {
  // Compare without the locale prefix, so /de/me and /en/me both match "/me".
  const current = stripLocale(pathname)
  return path === '/' ? current === '/' : current.startsWith(path)
}

export function BottomNav() {
  const pathname = usePathname()
  const { locale, t } = useI18n()

  return (
    <nav
      aria-label={t.nav.label}
      className="border-border bg-surface/95 pb-safe fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur"
    >
      <ul className="mx-auto flex max-w-[480px] items-stretch">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.path)
          return (
            <li key={tab.path} className="flex-1">
              <Link
                href={localeHref(locale, tab.path)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                  active ? 'text-brand' : 'text-fg-subtle hover:text-fg-muted',
                )}
              >
                <Icon name={tab.icon} className="text-xl" />
                {t.nav[tab.key]}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
