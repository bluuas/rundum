-- Records a user's explicit consent to publish Strava-sourced profile details.
--
-- Why this exists: the Strava API Agreement states that "Strava Data provided by
-- a specific user can only be displayed or disclosed in your Developer
-- Application to that user", and that Strava Data about other users "may not be
-- displayed or disclosed". Rundum's feed shows an organizer's name to everyone
-- who can see the activity, so a name copied straight from Strava and published
-- would breach that.
--
-- The resolution: Strava's profile fields are a one-time *seed*, offered to the
-- user and copied only when they explicitly accept. After that the values are
-- Rundum's own user-supplied profile data, which the user owns and can edit,
-- rather than a live mirror of Strava Data. We never re-read Strava to refresh
-- them.
--
-- strava_profile_consent_at is the audit trail for that choice: null means the
-- user has not consented and nothing was copied.

alter table public.profiles
  add column strava_profile_consent_at timestamptz;

comment on column public.profiles.strava_profile_consent_at is
  'When the user consented to copy their Strava name and avatar into their Rundum profile. Null means no Strava-sourced field has been published.';

-- Holds what Strava returned at sign-in, before the user has decided whether to
-- publish any of it. RLS gives no client role access, exactly like
-- strava_tokens: until consent, this is Strava Data that may only be shown to
-- the user it belongs to, and the server does that showing.
create table public.strava_profile_staging (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  fetched_at timestamptz not null default now()
);

alter table public.strava_profile_staging enable row level security;

comment on table public.strava_profile_staging is
  'Unconsented Strava profile data. RLS on with no policies: server-side only, like strava_tokens.';
