import { createClient } from '@/lib/supabase/server'

/**
 * The numbers behind the product's one stated goal.
 *
 * Rundum's primary success metric is the number of activities created, so that
 * is what the page leads with; everything else is context for whether that
 * number is going to keep moving.
 *
 * All three functions are security definer and refuse a caller who is not an
 * admin, so the aggregate can be read without granting anyone select on
 * activity_events — which is a record of who did what, not a statistic.
 */

export type MetricsSummary = {
  activitiesCreatedTotal: number
  activitiesCreated7d: number
  activitiesCreated30d: number
  activitiesLive: number
  activitiesUpcoming: number
  creatorsTotal: number
  creators7d: number
  joinRequestsTotal: number
  joinRequestsApproved: number
  commentsTotal: number
  reportsOpen: number
}

export type DailyPoint = { day: string; activitiesCreated: number }
export type SportCount = { sportKey: string; activitiesCreated: number }

export type Metrics = {
  summary: MetricsSummary
  daily: DailyPoint[]
  bySport: SportCount[]
}

/** True when the signed-in user may see the metrics at all. */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('is_admin')
  return data === true
}

/**
 * Everything the insights page shows, or null if the caller is not an admin.
 *
 * Null rather than an exception: the page renders a 404 for a non-admin, and
 * treating "not for you" as an error would put it in the logs as one.
 */
export async function getMetrics(): Promise<Metrics | null> {
  const supabase = await createClient()

  const [summary, daily, bySport] = await Promise.all([
    supabase.rpc('metrics_summary'),
    supabase.rpc('metrics_daily', { p_days: 14 }),
    supabase.rpc('metrics_by_sport'),
  ])

  const row = summary.data?.[0]
  if (summary.error || !row) return null

  return {
    summary: {
      activitiesCreatedTotal: Number(row.activities_created_total),
      activitiesCreated7d: Number(row.activities_created_7d),
      activitiesCreated30d: Number(row.activities_created_30d),
      activitiesLive: Number(row.activities_live),
      activitiesUpcoming: Number(row.activities_upcoming),
      creatorsTotal: Number(row.creators_total),
      creators7d: Number(row.creators_7d),
      joinRequestsTotal: Number(row.join_requests_total),
      joinRequestsApproved: Number(row.join_requests_approved),
      commentsTotal: Number(row.comments_total),
      reportsOpen: Number(row.reports_open),
    },
    daily: (daily.data ?? []).map((point) => ({
      day: point.day,
      activitiesCreated: Number(point.activities_created),
    })),
    bySport: (bySport.data ?? []).map((point) => ({
      sportKey: point.sport_key,
      activitiesCreated: Number(point.activities_created),
    })),
  }
}
