-- Count the primary metric by Swiss days, not by the database's days.
--
-- `metrics_daily` bucketed with `now()::date` and `created_at >= d`, both of
-- which resolve a timestamptz using the session's TimeZone — UTC on a hosted
-- project. So an activity created at 00:30 in Schwyz was counted on the
-- previous day, and "today" on the chart ended two hours early in summer.
--
-- The same defect as `date.getHours()` in src/lib/format.ts, one layer down:
-- both read whatever clock the machine happens to keep rather than the clock
-- the city keeps. See src/lib/time.ts.

create or replace function public.metrics_daily(p_days integer default 14)
returns table (day date, activities_created bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  -- Becomes cities.timezone when Rundum has more than one city.
  v_zone constant text := 'Europe/Zurich';
  v_today constant date := (now() at time zone v_zone)::date;
  v_days constant integer := greatest(least(p_days, 90), 1);
begin
  if not public.is_admin() then
    raise exception 'Not permitted' using errcode = 'RU030';
  end if;

  return query
  select
    d::date,
    count(e.id)
  from generate_series(
    v_today - (v_days - 1),
    v_today,
    interval '1 day'
  ) as d
  left join public.activity_events e
    -- Compare calendar dates in the city's zone on both sides, rather than
    -- an instant against a date the server reads in its own zone.
    on e.event_type = 'activity_created'
   and (e.created_at at time zone v_zone)::date = d::date
  group by d
  order by d;
end;
$$;

comment on function public.metrics_daily(integer) is
  'Activities created per Swiss calendar day, empty days included as zero.';
