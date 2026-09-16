'use server'

import { z } from 'zod'
import { revalidateLocalized } from '@/lib/revalidate'
import { withinRateLimit } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { reportInputSchema } from '@/lib/validation/report'

/**
 * Reporting and blocking.
 *
 * Both are database functions rather than plain inserts. A report needs its
 * target checked, since reports.target_id points at three different tables and
 * so cannot have a foreign key; and blocking has to withdraw the join requests
 * between the two people, or the blocked user keeps a place at an activity they
 * can no longer see. See 20260916100000_moderation.sql.
 *
 * Like the join actions, failures come back as a key the UI translates rather
 * than as the database's English exception text.
 */

export type ModerationErrorCode =
  'signedOut' | 'notFound' | 'ownContent' | 'self' | 'rateLimited' | 'unknown'

const SQLSTATE_TO_CODE: Record<string, ModerationErrorCode> = {
  RU001: 'signedOut',
  RU020: 'notFound',
  RU021: 'ownContent',
  RU023: 'self',
}

export type ModerationResult = { ok: true } | { ok: false; code: ModerationErrorCode }

function toError(error: { code?: string } | null): ModerationErrorCode {
  const mapped = error?.code ? SQLSTATE_TO_CODE[error.code] : undefined
  if (!mapped) console.error('unmapped moderation error', error)
  return mapped ?? 'unknown'
}

export async function submitReport(input: unknown): Promise<ModerationResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, code: 'signedOut' }

  const parsed = reportInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, code: 'unknown' }

  // A report is cheap to send and expensive to read. Ten a day is far past
  // anyone reporting things they actually saw.
  if (!(await withinRateLimit(supabase, 'report'))) {
    return { ok: false, code: 'rateLimited' }
  }

  const { error } = await supabase.rpc('submit_report', {
    p_target_type: parsed.data.targetType,
    p_target_id: parsed.data.targetId,
    p_reason: parsed.data.reason,
    p_details: parsed.data.details ?? undefined,
  })

  if (error) return { ok: false, code: toError(error) }

  // Nothing visible changes for the reporter, so nothing is revalidated. The
  // confirmation is local to the form.
  return { ok: true }
}

export async function blockUser(userId: string): Promise<ModerationResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, code: 'signedOut' }

  if (!z.uuid().safeParse(userId).success) return { ok: false, code: 'notFound' }

  if (!(await withinRateLimit(supabase, 'block'))) {
    return { ok: false, code: 'rateLimited' }
  }

  const { error } = await supabase.rpc('block_user', { p_blocked_id: userId })
  if (error) return { ok: false, code: toError(error) }

  // A block changes what the feed, /me and every activity page contain, so all
  // of them have to be rebuilt rather than served from cache.
  revalidateLocalized('/')
  revalidateLocalized('/me')
  revalidateLocalized('/profile')

  return { ok: true }
}

export async function unblockUser(userId: string): Promise<ModerationResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, code: 'signedOut' }

  if (!z.uuid().safeParse(userId).success) return { ok: false, code: 'notFound' }

  const { error } = await supabase.rpc('unblock_user', { p_blocked_id: userId })
  if (error) return { ok: false, code: toError(error) }

  revalidateLocalized('/')
  revalidateLocalized('/profile')

  return { ok: true }
}
