import Link from 'next/link'
import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { EmptyState } from '@/components/ui/states'
import { formatRelative } from '@/lib/format'
import { fill, getDictionary, type Dictionary } from '@/lib/i18n'
import { localeHref, type Locale } from '@/lib/i18n/config'
import { getNotifications, type Notification } from '@/lib/queries/notifications'
import { markNotificationsRead } from '@/lib/queries/notifications.server'
import { getCurrentUserId } from '@/lib/supabase/server'
import { Icon } from '@/components/ui/icon'

export async function generateMetadata({ params }: PageProps<'/[locale]/notifications'>) {
  const { locale } = await params
  return {
    title: getDictionary(locale as Locale).notifications.title,
    robots: 'noindex',
  }
}

/**
 * What happened while you were not looking.
 *
 * Opening the page is what marks them read: a separate "mark all as read"
 * button is a chore, and there is nothing here to action twice — every row
 * links to the thing it is about.
 */
export default async function NotificationsPage({
  params,
}: PageProps<'/[locale]/notifications'>) {
  const { locale } = await params
  const t = getDictionary(locale as Locale)
  const userId = await getCurrentUserId()

  if (!userId) {
    return (
      <>
        <AppHeader locale={locale as Locale} title={t.notifications.title} />
        <PageBody>
          <EmptyState
            icon={<Icon name="bell" />}
            title={t.notifications.signInTitle}
            description={t.notifications.signInBody}
          />
        </PageBody>
      </>
    )
  }

  // Read before marking, or every row would come back already read and the
  // page could never show which ones were new.
  const notifications = await getNotifications()
  await markNotificationsRead()

  return (
    <>
      <AppHeader locale={locale as Locale} title={t.notifications.title} />
      <PageBody>
        {notifications.length === 0 ? (
          <EmptyState
            icon={<Icon name="bell" />}
            title={t.notifications.emptyTitle}
            description={t.notifications.emptyBody}
          />
        ) : (
          <ul className="divide-border -mx-2 divide-y">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <Row notification={notification} locale={locale as Locale} t={t} />
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  )
}

function Row({
  notification,
  locale,
  t,
}: {
  notification: Notification
  locale: Locale
  t: Dictionary
}) {
  const actor = notification.actorName ?? t.account.deletedOwner
  const title = notification.activityTitle ?? t.notifications.removedActivity

  const text = fill(t.notifications.kinds[notification.kind], { name: actor, title })

  const body = (
    <div
      className={
        notification.readAt === null
          ? 'hover:bg-surface-muted block px-2 py-3 transition-colors'
          : 'hover:bg-surface-muted block px-2 py-3 opacity-60 transition-colors'
      }
    >
      <p className="text-fg text-sm">
        {notification.readAt === null ? (
          <span aria-hidden className="bg-brand mr-2 inline-block h-2 w-2 rounded-full" />
        ) : null}
        {text}
      </p>
      <p className="text-fg-subtle mt-0.5 text-xs">
        {formatRelative(notification.createdAt, locale)}
      </p>
    </div>
  )

  // An activity that has since been deleted leaves the row readable but
  // unclickable, rather than linking to a 404.
  return notification.activityId ? (
    <Link href={localeHref(locale, `/activities/${notification.activityId}`)}>
      {body}
    </Link>
  ) : (
    body
  )
}
