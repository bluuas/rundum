import { reportError } from '@/lib/observability'
import { createClient } from '@/lib/supabase/server'

export type NotificationKind =
  | 'join_requested'
  | 'join_approved'
  | 'join_declined'
  | 'activity_cancelled'
  | 'comment_posted'

export type Notification = {
  id: number
  kind: NotificationKind
  activityId: string | null
  /** Denormalised, so this still reads correctly after the activity is gone. */
  activityTitle: string | null
  /** Null when the person who caused it has since deleted their account. */
  actorName: string | null
  createdAt: string
  readAt: string | null
}

/**
 * The viewer's notifications, newest first.
 *
 * RLS restricts these to `user_id = auth.uid()`, so there is no filter here to
 * forget: a query for somebody else's notifications returns nothing.
 */
export async function getNotifications(limit = 50): Promise<Notification[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('notifications')
    .select('id, kind, activity_id, activity_title, actor_name, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    reportError('getNotifications', error)
    return []
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as NotificationKind,
    activityId: row.activity_id,
    activityTitle: row.activity_title,
    actorName: row.actor_name,
    createdAt: row.created_at,
    readAt: row.read_at,
  }))
}

/** Drives the badge in the header. Zero for a signed-out visitor. */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('unread_notification_count')

  if (error) {
    reportError('unreadNotificationCount', error)
    return 0
  }

  return data ?? 0
}
