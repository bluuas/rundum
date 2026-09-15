import { CreateActivityForm } from '@/components/activity/create-activity-form'
import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { getDictionary } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/config'
import { getCurrentUserId } from '@/lib/supabase/server'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/activities/new'>) {
  const { locale } = await params
  return { title: getDictionary(locale as Locale).create.title }
}

export default async function NewActivityPage({
  params,
}: PageProps<'/[locale]/activities/new'>) {
  const { locale } = await params
  const t = getDictionary(locale as Locale)
  const userId = await getCurrentUserId()

  return (
    <>
      <AppHeader
        locale={locale as Locale}
        title={t.create.title}
        back={{ href: '/', label: t.states.backToDiscover }}
      />
      <PageBody>
        <CreateActivityForm signedIn={userId !== null} />
      </PageBody>
    </>
  )
}
