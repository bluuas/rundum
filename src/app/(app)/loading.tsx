import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { ActivityListSkeleton } from '@/components/ui/states'

export default function Loading() {
  return (
    <>
      <AppHeader />
      <PageBody>
        <ActivityListSkeleton />
      </PageBody>
    </>
  )
}
