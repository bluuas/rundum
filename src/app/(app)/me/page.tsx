import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { EmptyState } from '@/components/ui/states'

export const metadata = { title: 'My activities' }

export default function MyActivitiesPage() {
  return (
    <>
      <AppHeader title="My activities" />
      <PageBody>
        <EmptyState
          icon="📋"
          title="You have not created anything yet"
          description="Activities you organize and ones you have joined will show up here."
          action={{ label: 'Create your first activity', href: '/activities/new' }}
        />
      </PageBody>
    </>
  )
}
