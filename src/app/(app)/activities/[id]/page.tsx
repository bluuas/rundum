import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { EmptyState } from '@/components/ui/states'

export default async function ActivityDetailPage({
  params,
}: PageProps<'/activities/[id]'>) {
  const { id } = await params

  return (
    <>
      <AppHeader title="Activity" back={{ href: '/', label: 'Back to discover' }} />
      <PageBody>
        <EmptyState
          icon="📍"
          title="Details coming in phase 5"
          description={`Activity ${id} will show its organizer, approximate location and comments here.`}
        />
      </PageBody>
    </>
  )
}
