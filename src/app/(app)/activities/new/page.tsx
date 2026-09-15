import { CreateActivityForm } from '@/components/activity/create-activity-form'
import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { getCurrentUserId } from '@/lib/supabase/server'

export const metadata = { title: 'Create an activity' }

export default async function NewActivityPage() {
  const userId = await getCurrentUserId()

  return (
    <>
      <AppHeader
        title="Create an activity"
        back={{ href: '/', label: 'Back to discover' }}
      />
      <PageBody>
        <CreateActivityForm signedIn={userId !== null} />
      </PageBody>
    </>
  )
}
