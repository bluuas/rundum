-- Rundum initial schema.
--
-- Covers the full MVP surface, not just phases 1-5, so later phases add UI
-- rather than migrations. Two rules are structural, not conventional:
--
--   1. No table anywhere stores a user's home or exact location. Activity
--      meeting points are approximate areas, snapped to a ~250 m grid by the
--      application before insert (src/lib/geo.ts) and again by a trigger here.
--   2. strava_tokens has RLS enabled and deliberately no policies, so no client
--      role can read it under any circumstances. Only the service-role key,
--      which bypasses RLS, can touch it.

create extension if not exists postgis with schema extensions;

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.activity_status as enum ('published', 'cancelled', 'hidden', 'deleted');
create type public.activity_level as enum ('beginner', 'intermediate', 'advanced', 'all_levels');
create type public.join_request_status as enum ('pending', 'approved', 'declined', 'withdrawn');
create type public.report_target as enum ('activity', 'comment', 'user');
create type public.report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  country_code text not null check (char_length(country_code) = 2),
  center extensions.geography(Point, 4326) not null,
  -- Small towns need a wider default than a big city would.
  default_radius_m integer not null default 25000
    check (default_radius_m between 1000 and 200000),
  timezone text not null default 'Europe/Zurich',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.cities is
  'Launch city is Schwyz. Every activity carries a city_id so more cities need no migration.';

-- A lookup table rather than an enum: adding a sport must not require a migration.
create table public.sports (
  key text primary key,
  label text not null,
  sort_order integer not null,
  supports_distance boolean not null default false,
  supports_pace boolean not null default false,
  is_active boolean not null default true
);

comment on column public.sports.supports_distance is
  'Drives which optional fields the create-activity form shows.';

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 50),
  avatar_url text,
  bio text check (char_length(bio) <= 300),
  city_id uuid references public.cities (id) on delete set null,
  strava_athlete_id bigint unique,
  strava_connected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Intentionally has no home-location column. Rundum never stores where a user lives.';
comment on column public.profiles.strava_connected is
  'Surfaced in the UI as "Strava-connected". Never label this "verified".';

-- RLS enabled, zero policies: unreachable from anon and authenticated roles.
create table public.strava_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  updated_at timestamptz not null default now()
);

comment on table public.strava_tokens is
  'Server-side only. RLS is on with no policies, so only the service role can read or write it.';

-- ---------------------------------------------------------------------------
-- Activities
-- ---------------------------------------------------------------------------

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  city_id uuid not null references public.cities (id),
  sport_key text not null references public.sports (key),
  title text not null check (char_length(btrim(title)) between 3 and 80),
  description text check (char_length(description) <= 1000),
  starts_at timestamptz not null,
  -- Approximate meeting area, never an exact address. Snapped by trigger.
  meeting_point extensions.geography(Point, 4326) not null,
  location_label text not null check (char_length(btrim(location_label)) between 2 and 80),
  -- How far away this activity may be discovered from, chosen by the organizer.
  visibility_radius_m integer not null default 25000
    check (visibility_radius_m between 1000 and 200000),
  distance_m integer check (distance_m between 100 and 1000000),
  pace_seconds_per_km integer check (pace_seconds_per_km between 60 and 3600),
  level public.activity_level,
  max_participants integer not null default 10 check (max_participants between 1 and 100),
  status public.activity_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.activities.meeting_point is
  'Approximate area snapped to a ~250 m grid. Never an exact personal location.';
comment on column public.activities.status is
  'Rows are never hard-deleted; "deleted" is the soft-delete state.';

create index activities_meeting_point_idx on public.activities using gist (meeting_point);
create index activities_status_starts_at_idx on public.activities (status, starts_at);
create index activities_owner_idx on public.activities (owner_id);
create index activities_city_idx on public.activities (city_id);

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.join_request_status not null default 'pending',
  message text check (char_length(message) <= 300),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (activity_id, user_id)
);

create index join_requests_activity_idx on public.join_requests (activity_id, status);
create index join_requests_user_idx on public.join_requests (user_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null
);

comment on table public.comments is
  'Text only for the MVP. Deleted comments are kept as tombstones, never removed.';

create index comments_activity_idx on public.comments (activity_id, created_at);

-- ---------------------------------------------------------------------------
-- Safety
-- ---------------------------------------------------------------------------

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target not null,
  target_id uuid not null,
  reason text not null check (char_length(btrim(reason)) between 3 and 60),
  details text check (char_length(details) <= 1000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create index reports_status_idx on public.reports (status, created_at);

-- ---------------------------------------------------------------------------
-- Analytics
--
-- Append-only. The primary success metric is the count of 'activity_created'.
-- ---------------------------------------------------------------------------

create table public.activity_events (
  id bigint generated always as identity primary key,
  event_type text not null check (char_length(event_type) <= 40),
  activity_id uuid references public.activities (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_events_type_created_idx on public.activity_events (event_type, created_at);

-- ---------------------------------------------------------------------------
-- Functions and triggers
-- ---------------------------------------------------------------------------

-- Mirrors snapToGrid() in src/lib/geo.ts. The application snaps before insert;
-- this is the backstop, so a precise coordinate cannot be stored even by a
-- caller that bypasses the app. Uses floor(x + 0.5) rather than round() to
-- match JavaScript's Math.round at exact .5 boundaries.
create or replace function public.snap_point_to_grid(
  p_point extensions.geography,
  p_grid_m integer default 250
)
returns extensions.geography
language plpgsql
immutable
set search_path = public, extensions, pg_temp
as $$
declare
  m_per_deg_lat constant double precision := 111320;
  lat double precision := extensions.st_y(p_point::extensions.geometry);
  lng double precision := extensions.st_x(p_point::extensions.geometry);
  lat_step double precision := p_grid_m::double precision / m_per_deg_lat;
  snapped_lat double precision;
  cos_lat double precision;
  lng_step double precision;
  snapped_lng double precision;
begin
  snapped_lat := floor(lat / lat_step + 0.5) * lat_step;
  -- Longitude degrees shrink with latitude; scale so cells stay roughly square.
  -- Using the snapped latitude keeps the function idempotent.
  cos_lat := greatest(cos(radians(snapped_lat)), 0.01);
  lng_step := p_grid_m::double precision / (m_per_deg_lat * cos_lat);
  snapped_lng := floor(lng / lng_step + 0.5) * lng_step;

  return extensions.st_setsrid(
    extensions.st_makepoint(
      round(snapped_lng::numeric, 6)::double precision,
      round(snapped_lat::numeric, 6)::double precision
    ),
    4326
  )::extensions.geography;
end;
$$;

create or replace function public.enforce_location_grid()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  new.meeting_point := public.snap_point_to_grid(new.meeting_point, 250);
  return new;
end;
$$;

create trigger activities_snap_location
  before insert or update of meeting_point on public.activities
  for each row execute function public.enforce_location_grid();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger activities_touch_updated_at
  before update on public.activities
  for each row execute function public.touch_updated_at();

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Every auth user gets a profile, whether they arrived via Strava or mock login.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, strava_athlete_id, strava_connected)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, 'athlete'), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    (new.raw_user_meta_data ->> 'strava_athlete_id')::bigint,
    coalesce((new.raw_user_meta_data ->> 'strava_connected')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Blocking is symmetric: neither party sees the other's content.
create or replace function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_a and blocked_id = p_b)
       or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

-- Participant and comment counts must be public, but the underlying rows are
-- not, so these are security definer and expose only an aggregate.
create or replace function public.activity_participant_count(p_activity_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public.join_requests
  where activity_id = p_activity_id and status = 'approved';
$$;

create or replace function public.activity_comment_count(p_activity_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public.comments
  where activity_id = p_activity_id and deleted_at is null;
$$;

-- Soft-deletes a comment. Allowed for the comment's author (own comment) and
-- for the activity's owner (moderation). An RPC rather than an UPDATE policy so
-- that no other column can be edited along the way.
create or replace function public.delete_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_author uuid;
  v_activity_owner uuid;
begin
  if v_actor is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select c.author_id, a.owner_id
    into v_author, v_activity_owner
  from public.comments c
  join public.activities a on a.id = c.activity_id
  where c.id = p_comment_id and c.deleted_at is null;

  if not found then
    raise exception 'Comment not found' using errcode = 'P0002';
  end if;

  if v_actor <> v_author and v_actor <> v_activity_owner then
    raise exception 'Not allowed to delete this comment' using errcode = '42501';
  end if;

  update public.comments
     set deleted_at = now(), deleted_by = v_actor
   where id = p_comment_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.cities enable row level security;
alter table public.sports enable row level security;
alter table public.profiles enable row level security;
alter table public.strava_tokens enable row level security;
alter table public.activities enable row level security;
alter table public.join_requests enable row level security;
alter table public.comments enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.activity_events enable row level security;

-- Reference data is public and read-only to clients.
create policy cities_read on public.cities
  for select using (true);

create policy sports_read on public.sports
  for select using (true);

-- Profiles are public, minus anyone in a block relationship with the viewer.
create policy profiles_read on public.profiles
  for select using (not public.is_blocked_between(id, auth.uid()));

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- strava_tokens deliberately has NO policies. With RLS enabled and no policy,
-- every client role is denied. Only the service role, which bypasses RLS,
-- can reach it.

-- Published and cancelled activities are public (a cancellation has to reach
-- the people who were coming). Hidden and soft-deleted ones are owner-only.
create policy activities_read on public.activities
  for select using (
    (status in ('published', 'cancelled') and not public.is_blocked_between(owner_id, auth.uid()))
    or owner_id = auth.uid()
  );

create policy activities_insert_own on public.activities
  for insert with check (auth.uid() = owner_id);

create policy activities_update_own on public.activities
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- No delete policy: removal is a status change to 'deleted'.

-- A join request is private to the requester and the organizer.
create policy join_requests_read on public.join_requests
  for select using (
    auth.uid() = user_id
    or auth.uid() = (select owner_id from public.activities where id = activity_id)
  );

create policy join_requests_insert_own on public.join_requests
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.activities a
      where a.id = activity_id
        and a.status = 'published'
        and a.starts_at > now()
        and a.owner_id <> auth.uid()
        and not public.is_blocked_between(a.owner_id, auth.uid())
    )
  );

create policy join_requests_update on public.join_requests
  for update using (
    auth.uid() = user_id
    or auth.uid() = (select owner_id from public.activities where id = activity_id)
  ) with check (
    auth.uid() = user_id
    or auth.uid() = (select owner_id from public.activities where id = activity_id)
  );

-- Comments are public on any activity the viewer can see.
create policy comments_read on public.comments
  for select using (
    deleted_at is null
    and not public.is_blocked_between(author_id, auth.uid())
    and exists (select 1 from public.activities a where a.id = activity_id)
  );

create policy comments_insert_own on public.comments
  for insert with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.activities a
      where a.id = activity_id
        and a.status = 'published'
        and not public.is_blocked_between(a.owner_id, auth.uid())
    )
  );

-- No update policy: use the delete_comment() RPC, which restricts the change to
-- the tombstone columns.

create policy blocks_read_own on public.blocks
  for select using (auth.uid() = blocker_id);

create policy blocks_insert_own on public.blocks
  for insert with check (auth.uid() = blocker_id and blocker_id <> blocked_id);

create policy blocks_delete_own on public.blocks
  for delete using (auth.uid() = blocker_id);

create policy reports_read_own on public.reports
  for select using (auth.uid() = reporter_id);

create policy reports_insert_own on public.reports
  for insert with check (auth.uid() = reporter_id);

-- Events are write-only from the client; reading them is a service-role job.
create policy activity_events_insert on public.activity_events
  for insert to authenticated with check (user_id is null or user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Discovery
-- ---------------------------------------------------------------------------

-- Security INVOKER (the default) on purpose: row visibility, including blocks
-- and hidden activities, stays with the RLS policies above. This function only
-- does geography and filtering.
--
-- An activity appears when it is inside BOTH radii: the distance the searcher
-- asked for, and the distance the organizer chose to be discoverable within.
create or replace function public.nearby_activities(
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer default 25000,
  p_sports text[] default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_sort text default 'soonest',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  owner_id uuid,
  sport_key text,
  title text,
  description text,
  starts_at timestamptz,
  location_label text,
  approx_lat double precision,
  approx_lng double precision,
  distance_meters double precision,
  visibility_radius_m integer,
  activity_distance_m integer,
  pace_seconds_per_km integer,
  level public.activity_level,
  max_participants integer,
  status public.activity_status,
  participant_count integer,
  comment_count integer,
  owner_display_name text,
  owner_avatar_url text,
  owner_strava_connected boolean
)
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  with center as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as g
  )
  select
    a.id,
    a.owner_id,
    a.sport_key,
    a.title,
    a.description,
    a.starts_at,
    a.location_label,
    extensions.st_y(a.meeting_point::extensions.geometry) as approx_lat,
    extensions.st_x(a.meeting_point::extensions.geometry) as approx_lng,
    -- Rounded to 100 m. The stored point is already grid-snapped, so this adds
    -- no precision; it just keeps the API from implying any.
    round(extensions.st_distance(a.meeting_point, c.g) / 100) * 100 as distance_meters,
    a.visibility_radius_m,
    a.distance_m as activity_distance_m,
    a.pace_seconds_per_km,
    a.level,
    a.max_participants,
    a.status,
    public.activity_participant_count(a.id) as participant_count,
    public.activity_comment_count(a.id) as comment_count,
    p.display_name as owner_display_name,
    p.avatar_url as owner_avatar_url,
    p.strava_connected as owner_strava_connected
  from public.activities a
  join public.profiles p on p.id = a.owner_id
  cross join center c
  where a.status = 'published'
    -- Archived activities drop out of discovery automatically; no cron needed.
    and a.starts_at > coalesce(p_from, now())
    and (p_to is null or a.starts_at <= p_to)
    and (p_sports is null or a.sport_key = any (p_sports))
    and extensions.st_dwithin(a.meeting_point, c.g, p_radius_m)
    and extensions.st_dwithin(a.meeting_point, c.g, a.visibility_radius_m)
  order by
    case when p_sort = 'closest' then extensions.st_distance(a.meeting_point, c.g) end asc,
    a.starts_at asc
  limit least(coalesce(p_limit, 50), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.nearby_activities(
  double precision, double precision, integer, text[], timestamptz, timestamptz, text, integer, integer
) to anon, authenticated;
grant execute on function public.delete_comment(uuid) to authenticated;
grant execute on function public.activity_participant_count(uuid) to anon, authenticated;
grant execute on function public.activity_comment_count(uuid) to anon, authenticated;
