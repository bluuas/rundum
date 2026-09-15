-- Phase 9: measuring the thing the product is for.
--
-- The primary success metric is the number of activities created. Everything
-- here is built around making that number, and the funnel leading to it,
-- readable without exporting the database.
--
-- activity_events has an insert policy and no select policy, so no client role
-- can read it — which is right, since it is a record of who did what. The
-- functions below are security definer and refuse anyone who is not an admin,
-- so the aggregate is reachable without opening the rows.

alter table public.profiles
  add column is_admin boolean not null default false;

comment on column public.profiles.is_admin is
  'Grants access to the metrics functions only. Not a moderation or data-access role.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Headline numbers.
--
-- Counted from `activities` rather than from `activity_events` wherever the
-- answer is "how many exist now", and from events where it is "how many
-- happened" — a cancelled activity was still created, and the metric is about
-- whether people are using Rundum to plan, not about what survived.
create or replace function public.metrics_summary()
returns table (
  activities_created_total bigint,
  activities_created_7d bigint,
  activities_created_30d bigint,
  activities_live bigint,
  activities_upcoming bigint,
  creators_total bigint,
  creators_7d bigint,
  join_requests_total bigint,
  join_requests_approved bigint,
  comments_total bigint,
  reports_open bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Not permitted' using errcode = 'RU030';
  end if;

  return query
  select
    (select count(*) from public.activity_events where event_type = 'activity_created'),
    (select count(*) from public.activity_events
      where event_type = 'activity_created' and created_at >= now() - interval '7 days'),
    (select count(*) from public.activity_events
      where event_type = 'activity_created' and created_at >= now() - interval '30 days'),
    (select count(*) from public.activities where status = 'published'),
    (select count(*) from public.activities
      where status = 'published' and starts_at > now()),
    (select count(distinct user_id) from public.activity_events
      where event_type = 'activity_created'),
    (select count(distinct user_id) from public.activity_events
      where event_type = 'activity_created' and created_at >= now() - interval '7 days'),
    (select count(*) from public.join_requests),
    (select count(*) from public.join_requests where status = 'approved'),
    (select count(*) from public.comments where deleted_at is null),
    (select count(*) from public.reports where status = 'open');
end;
$$;

-- Activities created per day, with empty days present as zero rather than
-- missing: a gap in a chart reads as "no data", and the difference between
-- nobody creating anything and nothing being recorded is the whole point.
create or replace function public.metrics_daily(p_days integer default 14)
returns table (day date, activities_created bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Not permitted' using errcode = 'RU030';
  end if;

  return query
  select
    d::date,
    count(e.id)
  from generate_series(
    (now() - make_interval(days => greatest(least(p_days, 90), 1) - 1))::date,
    now()::date,
    interval '1 day'
  ) as d
  left join public.activity_events e
    on e.event_type = 'activity_created'
   and e.created_at >= d
   and e.created_at < d + interval '1 day'
  group by d
  order by d;
end;
$$;

-- Which sports people actually plan. Drives what the create form should put
-- first, and whether a sport is worth keeping.
create or replace function public.metrics_by_sport()
returns table (sport_key text, activities_created bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Not permitted' using errcode = 'RU030';
  end if;

  return query
  select s.key, count(a.id)
  from public.sports s
  left join public.activities a
    on a.sport_key = s.key and a.status <> 'deleted'
  group by s.key
  order by count(a.id) desc, s.key;
end;
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.metrics_summary() to authenticated;
grant execute on function public.metrics_daily(integer) to authenticated;
grant execute on function public.metrics_by_sport() to authenticated;
