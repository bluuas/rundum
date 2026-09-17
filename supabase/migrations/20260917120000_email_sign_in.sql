-- Signing in without Strava.
--
-- Strava keeps every new application in "single-player mode" until ten athletes
-- have connected and it has passed review, and ten athletes cannot connect if
-- they cannot sign in. So Strava cannot be the front door; it has to be a
-- link-later on an account made some other way. That other way is an emailed
-- magic link, which Supabase Auth already issues — none of that needs a
-- migration.
--
-- What does need one is the name. `handle_new_user` fell back to the local part
-- of the email address, which was harmless while every account arrived through
-- Strava with a synthetic address, and is not harmless now: it would publish a
-- piece of somebody's real email address as the name on every activity and
-- comment they ever post, without asking, as the default.

-- ---------------------------------------------------------------------------
-- 1. A name nobody picked, marked as such
-- ---------------------------------------------------------------------------

-- Default true, so every account that already exists counts as having chosen
-- one: the seeded accounts were named by the seed, and a Strava account was
-- given a placeholder and then offered the consent card. Only the new email
-- path below sets it false.
alter table public.profiles
  add column display_name_chosen boolean not null default true;

comment on column public.profiles.display_name_chosen is
  'False while the name is a generated placeholder nobody has confirmed.';

/*
  A generated name rather than the email's local part.

  `manuel@example.com` becoming "manuel" on every activity looks convenient and
  is a disclosure: it is a fragment of a private address, published by default,
  chosen by nobody. The same reasoning already governs the Strava path, which
  stages the athlete's real name and publishes nothing until asked — so this
  uses the same shape of placeholder it does.

  Derived from the id rather than random() so a retry cannot produce a second
  different name for the same account.
*/
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_offered text;
begin
  v_offered := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '')
  );

  insert into public.profiles (
    id, display_name, avatar_url, strava_athlete_id, strava_connected,
    display_name_chosen
  )
  values (
    new.id,
    coalesce(v_offered, 'Athlete ' || substr(md5(new.id::text), 1, 4)),
    new.raw_user_meta_data ->> 'avatar_url',
    (new.raw_user_meta_data ->> 'strava_athlete_id')::bigint,
    coalesce((new.raw_user_meta_data ->> 'strava_connected')::boolean, false),
    v_offered is not null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

/*
  Choosing a name is the act of changing it, so the flag is maintained by the
  database rather than by whichever code path happened to do the update.

  The profile editor, the Strava consent card and the welcome step all set the
  same column through three different code paths; a trigger is the only version
  of "chosen" that all three cannot forget. The column is also deliberately
  outside the grants on `profiles`, so no client can set it directly and claim
  to have picked a name it never picked.
*/
create or replace function public.mark_display_name_chosen()
returns trigger
language plpgsql
as $$
begin
  if new.display_name is distinct from old.display_name then
    new.display_name_chosen := true;
  end if;
  return new;
end;
$$;

create trigger profiles_mark_display_name_chosen
  before update on public.profiles
  for each row execute function public.mark_display_name_chosen();

/*
  Does the signed-in user still need to pick a name?

  An RPC rather than a column the client can read: the flag is nobody's
  business but its owner's, and adding it to the `select` grant on `profiles`
  would publish "this person has not set up their profile yet" to every
  visitor. Note the grant list is a column list precisely so that a new column
  is private until somebody decides otherwise — this one stays private.
*/
create or replace function public.needs_display_name()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and not display_name_chosen
  );
$$;

revoke all on function public.needs_display_name() from public;
grant execute on function public.needs_display_name() to authenticated;
