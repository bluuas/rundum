-- Reference data: the launch city and the ten MVP sports.
--
-- These live in a migration rather than supabase/seed.sql because seed.sql only
-- runs on a local `db reset`; a hosted project gets its rows from migrations.
-- Both inserts are idempotent so re-running is safe.

insert into public.cities (slug, name, country_code, center, default_radius_m, timezone)
values (
  'schwyz',
  'Schwyz',
  'CH',
  extensions.st_setsrid(extensions.st_makepoint(8.6530, 47.0207), 4326)::extensions.geography,
  -- Schwyz has ~15k inhabitants, so a big-city 5 km default would show an empty
  -- feed. 25 km reaches Brunnen, Ibach, Seewen, Küssnacht and the Lauerzersee.
  25000,
  'Europe/Zurich'
)
on conflict (slug) do update
  set name = excluded.name,
      center = excluded.center,
      default_radius_m = excluded.default_radius_m;

insert into public.sports (key, label, sort_order, supports_distance, supports_pace) values
  ('run',             'Running',         1, true,  true),
  ('ride',            'Cycling',         2, true,  true),
  ('walk',            'Walking',         3, true,  false),
  ('hike',            'Hiking',          4, true,  false),
  ('workout',         'Workout',         5, false, false),
  ('weight_training', 'Weight Training', 6, false, false),
  ('swim',            'Swimming',        7, true,  true),
  ('yoga',            'Yoga',            8, false, false),
  ('tennis',          'Tennis',          9, false, false),
  ('padel',           'Padel',          10, false, false)
on conflict (key) do update
  set label = excluded.label,
      sort_order = excluded.sort_order,
      supports_distance = excluded.supports_distance,
      supports_pace = excluded.supports_pace;
