-- Exposes an activity's approximate coordinates as plain numbers.
--
-- meeting_point is a PostGIS geography, which PostgREST serialises as opaque
-- WKB hex. The feed gets its coordinates from nearby_activities; the detail
-- page needs the same for a single row.
--
-- Security INVOKER (the default), so the activities RLS policy decides whether
-- the caller sees anything at all. The returned point is already snapped to the
-- 250 m grid, so it carries no more precision than the feed does.
create or replace function public.activity_coordinates(p_activity_id uuid)
returns table (lat double precision, lng double precision)
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select
    extensions.st_y(a.meeting_point::extensions.geometry) as lat,
    extensions.st_x(a.meeting_point::extensions.geometry) as lng
  from public.activities a
  where a.id = p_activity_id;
$$;

grant execute on function public.activity_coordinates(uuid) to anon, authenticated;
