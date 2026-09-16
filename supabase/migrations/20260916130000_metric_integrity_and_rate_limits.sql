-- Three boundaries the client was on the wrong side of.
--
-- 1. The primary success metric was writable from a browser console.
-- 2. `profiles.is_admin` was readable by anonymous visitors.
-- 3. Nothing anywhere limited how fast a signed-in account could write.

-- 1 ---------------------------------------------------------------------
-- The number of activities created is what this product is judged on, and
-- `activity_events_insert` let any authenticated user insert as many
-- `activity_created` rows as they liked, carrying their own user_id. A policy
-- can say whose row it is; it cannot say that the row describes something
-- that actually happened.
--
-- So the database writes the event itself. An activity cannot now be created
-- without being counted, and cannot be counted without being created — which
-- is a stronger statement than the Server Action doing it faithfully, and it
-- also covers the seed and anything else that inserts directly.

drop policy if exists activity_events_insert on public.activity_events;

create or replace function public.record_activity_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.activity_events (event_type, activity_id, user_id, metadata)
  values ('activity_created', new.id, new.owner_id,
          jsonb_build_object('sport_key', new.sport_key));
  return new;
end;
$$;

comment on function public.record_activity_created() is
  'Records the primary metric. The only writer of activity_created events.';

drop trigger if exists activities_record_created on public.activities;

create trigger activities_record_created
  after insert on public.activities
  for each row
  execute function public.record_activity_created();

-- 2 ---------------------------------------------------------------------
-- RLS is row-level, so hiding one column means replacing the table-wide grant
-- with a column list. Everything here is already public except the flag that
-- says who can open /insights, which is nobody's business but ours.
--
-- Nothing selects `*` from profiles — if anything ever does, it will fail
-- loudly here rather than quietly leaking.

revoke select on public.profiles from anon, authenticated;

grant select (
  id,
  display_name,
  avatar_url,
  bio,
  city_id,
  strava_athlete_id,
  strava_connected,
  created_at,
  updated_at,
  strava_profile_consent_at
) on public.profiles to anon, authenticated;

-- `is_admin()` is security definer, so the admin check itself still works.

-- 3 ---------------------------------------------------------------------
-- Every Server Action is a public POST endpoint. One bored visitor could fill
-- the database, and there was nothing in the way.
--
-- A fixed-window counter in Postgres rather than a token bucket in memory:
-- the app runs serverless, so there is no memory to share between two
-- requests, and the database is the one thing every instance already agrees
-- on. Fixed windows allow a burst of up to 2x the limit across a boundary,
-- which for "how many activities may one person create in an hour" is a
-- distinction without a difference.

create table public.rate_limits (
  bucket text not null,
  subject text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, subject, window_start)
);

-- RLS on with no policies at all: only the security definer function below
-- reaches this table, exactly like strava_tokens.
alter table public.rate_limits enable row level security;

create index rate_limits_window_idx on public.rate_limits (window_start);

/*
  Counts one attempt and says whether it is allowed.

  The subject is always the caller's own user id, never an argument: this is
  callable over PostgREST like any other function, and a limiter you can
  opt out of by passing someone else's name is not a limiter. Signed-out
  callers share one bucket, which is fine because every action that uses this
  requires a session anyway — anonymous abuse belongs at the edge, not here.
*/
create or replace function public.consume_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_subject text := coalesce(auth.uid()::text, 'anonymous');
  v_window timestamptz := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  v_hits integer;
begin
  insert into public.rate_limits (bucket, subject, window_start, hits)
  values (p_bucket, v_subject, v_window, 1)
  on conflict (bucket, subject, window_start)
  do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;

  -- Occasional opportunistic cleanup, so old windows do not accumulate
  -- forever and nothing has to be scheduled to remove them.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end;
$$;

comment on function public.consume_rate_limit(text, integer, integer) is
  'Fixed-window rate limit keyed on auth.uid(). True when the attempt is allowed.';

revoke all on function public.consume_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_rate_limit(text, integer, integer)
  to authenticated;
