import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { EmptyState } from '@/components/ui/states'

export default function FeedPage() {
  return (
    <>
      <AppHeader />
      <PageBody>
        <EmptyState
          icon="🏃"
          title="Nothing here yet"
          description="The feed arrives in phase 3, once the database and seed data are in place."
          action={{ label: 'Create an activity', href: '/activities/new' }}
        />
      </PageBody>
    </>
  )
}
