import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { EmptyState } from '@/components/ui/states'

export const metadata = { title: 'Create an activity' }

export default function NewActivityPage() {
  return (
    <>
      <AppHeader
        title="Create an activity"
        back={{ href: '/', label: 'Back to discover' }}
      />
      <PageBody>
        <EmptyState
          icon="✏️"
          title="Create flow coming in phase 4"
          description="Sport, when, where, details and review — five steps, one screen at a time."
        />
      </PageBody>
    </>
  )
}
