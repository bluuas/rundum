import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { EmptyState } from '@/components/ui/states'

export const metadata = { title: 'Profile' }

export default function ProfilePage() {
  return (
    <>
      <AppHeader title="Profile" />
      <PageBody>
        <EmptyState
          icon="👤"
          title="Not signed in"
          description="Mock sign-in arrives in phase 2; Strava sign-in in phase 7."
        />
      </PageBody>
    </>
  )
}
