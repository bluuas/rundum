import { isAccountSwitchingEnabled } from '@/lib/auth/dev'
import { createClient } from '@/lib/supabase/server'
import { UserSwitcher, type DemoAccount } from './user-switcher'

/**
 * Server wrapper for the account switcher. Returns null unless development mock
 * auth or demo mode is on, so the client component and its account list never
 * reach a real deployment.
 */
export async function DevAuthBar() {
  if (!isAccountSwitchingEnabled()) return null

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, strava_connected')
    .order('display_name')

  // Only ids leave the server here; the login route resolves the address from
  // auth.users and verifies it is a demo account before signing in.
  const accounts: DemoAccount[] = (data ?? []).map((profile) => ({
    id: profile.id,
    displayName: profile.display_name,
    stravaConnected: profile.strava_connected,
  }))

  const currentName =
    accounts.find((account) => account.id === user?.id)?.displayName ?? null

  return (
    <UserSwitcher
      accounts={accounts}
      currentUserId={user?.id ?? null}
      currentName={currentName}
    />
  )
}
