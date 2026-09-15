'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/', label: 'Discover', icon: '🧭' },
  { href: '/activities/new', label: 'Create', icon: '➕' },
  { href: '/me', label: 'Mine', icon: '📋' },
  { href: '/profile', label: 'Profile', icon: '👤' },
] as const

function isActive(pathname: string, href: string) {
  // "/" would otherwise match every route.
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main"
      className="border-border bg-surface/95 pb-safe fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur"
    >
      <ul className="mx-auto flex max-w-[480px] items-stretch">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href)
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                  active ? 'text-brand' : 'text-fg-subtle hover:text-fg-muted',
                )}
              >
                <span aria-hidden className="text-lg leading-none">
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
