import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { EmptyState } from '@/components/ui/states'

export default function NotFound() {
  return (
    <>
      <AppHeader />
      <PageBody>
        <EmptyState
          icon="🗺️"
          title="Page not found"
          description="That page does not exist, or the activity behind it was removed."
          action={{ label: 'Back to discover', href: '/' }}
        />
      </PageBody>
    </>
  )
}
