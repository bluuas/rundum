'use server'

import { reportError } from '@/lib/observability'
import { createClient } from '@/lib/supabase/server'

/**
 * Marks everything read.
 *
 * Its own `'use server'` module rather than a plain function, because it is a
 * write called from a Server Component render. A failure is logged and
 * swallowed: not marking a notification read is not worth failing a page over.
 */
export async function markNotificationsRead(): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('mark_notifications_read')
  if (error) reportError('markNotificationsRead', error)
}
