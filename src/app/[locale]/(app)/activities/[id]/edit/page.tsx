import { notFound, redirect } from 'next/navigation'
import { EditActivityForm } from '@/components/activity/edit-activity-form'
import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { isArchived } from '@/lib/format'
import { getDictionary } from '@/lib/i18n'
import { localeHref, type Locale } from '@/lib/i18n/config'
import { getActivityDetail } from '@/lib/queries/activity-detail'
import { getCurrentUserId } from '@/lib/supabase/server'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/activities/[id]/edit'>) {
  const { locale } = await params
  return { title: getDictionary(locale as Locale).edit.title }
}

export default async function EditActivityPage({
  params,
}: PageProps<'/[locale]/activities/[id]/edit'>) {
  const { id, locale } = await params
  const t = getDictionary(locale as Locale)

  const [activity, userId] = await Promise.all([
    getActivityDetail(id),
    getCurrentUserId(),
  ])

  if (!activity) notFound()

  // Same 404 for "not yours" as for "does not exist": confirming that someone
  // else's activity exists is a leak, however small.
  if (!userId || userId !== activity.ownerId) notFound()

  // A past activity cannot be edited — the schema requires a future start time,
  // so the form would be unsubmittable. Send them back rather than showing a
  // page that cannot succeed.
  if (isArchived(activity.startsAt)) {
    redirect(localeHref(locale as Locale, `/activities/${id}`))
  }

  return (
    <>
      <AppHeader
        locale={locale as Locale}
        title={t.edit.title}
        back={{ href: `/activities/${id}`, label: t.edit.backToActivity }}
      />
      <PageBody>
        <EditActivityForm activity={activity} />
      </PageBody>
    </>
  )
}
