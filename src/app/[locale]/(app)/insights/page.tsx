import { notFound } from 'next/navigation'
import { AppHeader } from '@/components/shell/app-header'
import { PageBody } from '@/components/shell/page-body'
import { formatDate } from '@/lib/format'
import { getDictionary } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/config'
import { getMetrics, type DailyPoint } from '@/lib/queries/metrics'
import { isSportKey } from '@/lib/sports'

/**
 * How Rundum is doing, against the one thing it is for.
 *
 * Not linked from the navigation and 404s for everyone who is not an admin —
 * the same 404 a non-existent page gives, so the route does not advertise
 * itself. The gate is in the database: all three metrics functions refuse a
 * non-admin caller, so this page could not leak the numbers even if the check
 * here were removed.
 */
export async function generateMetadata({ params }: PageProps<'/[locale]/insights'>) {
  const { locale } = await params
  return { title: getDictionary(locale as Locale).insights.title, robots: 'noindex' }
}

export default async function InsightsPage({ params }: PageProps<'/[locale]/insights'>) {
  const { locale } = await params
  const t = getDictionary(locale as Locale)

  const metrics = await getMetrics()
  if (!metrics) notFound()

  const { summary, daily, bySport } = metrics
  const busiest = Math.max(...daily.map((point) => point.activitiesCreated), 1)

  return (
    <>
      <AppHeader
        locale={locale as Locale}
        title={t.insights.title}
        back={{ href: '/', label: t.states.backToDiscover }}
      />
      <PageBody className="space-y-6">
        {/* The primary metric, at the size of its importance. */}
        <section className="border-border bg-surface rounded-card border p-5 text-center">
          <p className="text-fg-muted text-sm font-medium">{t.insights.heroLabel}</p>
          <p className="text-fg mt-1 text-5xl font-bold tabular-nums">
            {summary.activitiesCreatedTotal}
          </p>
          <p className="text-fg-subtle mt-2 text-xs">{t.insights.heroNote}</p>

          <dl className="border-border mt-4 grid grid-cols-3 border-t pt-4">
            <Cell label={t.insights.last7} value={summary.activitiesCreated7d} />
            <Cell
              label={t.insights.last30}
              value={summary.activitiesCreated30d}
              className="border-border border-x"
            />
            <Cell label={t.insights.allTime} value={summary.activitiesCreatedTotal} />
          </dl>
        </section>

        <section className="space-y-2">
          <h2 className="text-fg text-base font-semibold">{t.insights.dailyHeading}</h2>
          {daily.every((point) => point.activitiesCreated === 0) ? (
            <p className="text-fg-muted text-sm">{t.insights.dailyEmpty}</p>
          ) : (
            <DailyChart daily={daily} busiest={busiest} />
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-fg text-base font-semibold">{t.insights.sportHeading}</h2>
          <dl className="border-border bg-surface rounded-card divide-border divide-y border text-sm">
            {bySport.map((row) => (
              <div
                key={row.sportKey}
                className="flex items-center justify-between px-4 py-2"
              >
                <dt className="text-fg-muted">
                  {isSportKey(row.sportKey) ? t.sports[row.sportKey] : row.sportKey}
                </dt>
                <dd className="text-fg font-medium tabular-nums">
                  {row.activitiesCreated}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="space-y-2">
          <h2 className="text-fg text-base font-semibold">{t.insights.healthHeading}</h2>
          <dl className="border-border bg-surface rounded-card grid grid-cols-2 gap-px border">
            <Cell label={t.insights.live} value={summary.activitiesLive} boxed />
            <Cell label={t.insights.upcoming} value={summary.activitiesUpcoming} boxed />
            <Cell label={t.insights.creators} value={summary.creatorsTotal} boxed />
            <Cell label={t.insights.creators7} value={summary.creators7d} boxed />
            <Cell
              label={t.insights.joinRequests}
              value={summary.joinRequestsTotal}
              boxed
            />
            <Cell
              label={t.insights.joinApproved}
              value={summary.joinRequestsApproved}
              boxed
            />
            <Cell label={t.insights.comments} value={summary.commentsTotal} boxed />
            <Cell label={t.insights.reportsOpen} value={summary.reportsOpen} boxed />
          </dl>
        </section>

        <p className="text-fg-subtle text-xs">{t.insights.footnote}</p>
      </PageBody>
    </>
  )
}

/**
 * Bars in CSS rather than a charting library.
 *
 * Fourteen numbers do not justify shipping a plotting dependency to a phone,
 * and a table with a visual scale stays readable to a screen reader, which a
 * canvas would not.
 */
function DailyChart({ daily, busiest }: { daily: DailyPoint[]; busiest: number }) {
  return (
    <div className="border-border bg-surface rounded-card border p-4">
      <ol className="flex h-32 items-end gap-1">
        {daily.map((point) => (
          <li key={point.day} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-fg-subtle text-[10px] tabular-nums">
              {point.activitiesCreated || ''}
            </span>
            <span
              className="bg-brand w-full rounded-sm"
              // A zero day still gets a hairline, so the bar row reads as a
              // timeline rather than as missing days.
              style={{
                height: `${Math.max((point.activitiesCreated / busiest) * 100, 2)}%`,
              }}
            />
          </li>
        ))}
      </ol>
      <div className="text-fg-subtle mt-2 flex justify-between text-[10px]">
        <span>{formatDate(daily[0]?.day ?? new Date())}</span>
        <span>{formatDate(daily[daily.length - 1]?.day ?? new Date())}</span>
      </div>
    </div>
  )
}

function Cell({
  label,
  value,
  className,
  boxed,
}: {
  label: string
  value: number
  className?: string
  boxed?: boolean
}) {
  return (
    <div
      className={`${boxed ? 'bg-surface px-4 py-3' : 'px-2'} text-center ${className ?? ''}`}
    >
      <dt className="text-fg-muted text-xs">{label}</dt>
      <dd className="text-fg mt-0.5 text-xl font-bold tabular-nums">{value}</dd>
    </div>
  )
}
