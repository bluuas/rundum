import Link from 'next/link'
import { getDictionary } from '@/lib/i18n'
import { localeHref, type Locale } from '@/lib/i18n/config'
import { getUnreadNotificationCount } from '@/lib/queries/notifications'
import { getCurrentUserId } from '@/lib/supabase/server'

/**
 * The only thing in the header that says something happened.
 *
 * Absent rather than empty for a signed-out visitor: a bell that can never
 * have anything in it is furniture. The count is capped in display at 9+ so a
 * busy organizer does not stretch the header.
 */
export async function NotificationBell({ locale }: { locale: Locale }) {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const t = getDictionary(locale)
  const unread = await getUnreadNotificationCount()

  return (
    <Link
      href={localeHref(locale, '/notifications')}
      aria-label={t.notifications.open}
      className="text-fg-muted hover:bg-surface-muted relative flex h-11 w-11 items-center justify-center rounded-full"
    >
      <span aria-hidden className="text-lg">
        🔔
      </span>
      {unread > 0 ? (
        <span className="bg-brand text-brand-fg absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
          {unread > 9 ? '9+' : unread}
        </span>
      ) : null}
      <span className="sr-only">{unread > 0 ? `, ${unread}` : ''}</span>
    </Link>
  )
}
