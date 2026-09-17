-- Leaving Rundum.
--
-- GDPR Art. 17 and the revised DSG require erasure of the person's data. They
-- do not require destroying other people's records, and a cascade would do
-- exactly that: `activities.owner_id` cascaded from `profiles`, so deleting an
-- account silently removed every activity it had organized — including
-- upcoming ones other people had joined and were planning to turn up to.
--
-- So deletion detaches rather than destroys:
--
--   * Upcoming activities are cancelled first, which is the truth — the
--     organizer is gone — and reaches the people who had joined, because
--     cancelled activities stay readable exactly so a cancellation can.
--   * Past activities stay as they were. They happened.
--   * The person's comments become tombstones: the words are gone, the shape
--     of the conversation other people had is not.
--   * Everything that points at them loses the pointer. The UI renders a
--     missing organizer or author as "Deleted account".
--
-- The join requests they had made *do* go, and should: a place held by an
-- account that no longer exists is a place nobody can take.

-- 1. Detach instead of cascade -------------------------------------------

alter table public.activities
  alter column owner_id drop not null;

alter table public.activities
  drop constraint activities_owner_id_fkey,
  add constraint activities_owner_id_fkey
    foreign key (owner_id) references public.profiles (id) on delete set null;

alter table public.comments
  alter column author_id drop not null;

alter table public.comments
  drop constraint comments_author_id_fkey,
  add constraint comments_author_id_fkey
    foreign key (author_id) references public.profiles (id) on delete set null;

-- A report outlives its reporter. Moderation is about the reported thing, and
-- somebody leaving is not a reason to drop what they flagged on the way out.
alter table public.reports
  alter column reporter_id drop not null;

alter table public.reports
  drop constraint reports_reporter_id_fkey,
  add constraint reports_reporter_id_fkey
    foreign key (reporter_id) references public.profiles (id) on delete set null;

comment on column public.activities.owner_id is
  'Null when the organizer deleted their account. Rendered as "Deleted account".';
comment on column public.comments.author_id is
  'Null when the author deleted their account; the comment is a tombstone then.';

-- 2. What deleting will cost ----------------------------------------------

-- Shown on the confirmation screen. Somebody about to delete their account
-- should know they are about to cancel a run six people have joined, before
-- they do it rather than after.
create or replace function public.account_deletion_summary()
returns table (
  upcoming_activities bigint,
  affected_participants bigint,
  comments_written bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (select count(*) from public.activities a
      where a.owner_id = auth.uid()
        and a.status in ('published', 'hidden')
        and a.starts_at > now()),
    (select count(*) from public.join_requests j
      join public.activities a on a.id = j.activity_id
      where a.owner_id = auth.uid()
        and a.status in ('published', 'hidden')
        and a.starts_at > now()
        and j.status = 'approved'),
    (select count(*) from public.comments c
      where c.author_id = auth.uid() and c.deleted_at is null);
$$;

-- 3. Everything that must happen before the row goes ----------------------

/*
  Runs as the person leaving, in one transaction, before the auth user is
  deleted by the service role.

  Not left to the caller: a Server Action that cancelled activities and then
  failed to delete the account would leave somebody's activities cancelled and
  their account intact, which is the worst of both.
*/
create or replace function public.prepare_account_deletion()
returns setof uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not signed in' using errcode = 'RU001';
  end if;

  -- Cancelled rather than deleted: the people who joined need to see what
  -- happened to the thing in their calendar.
  --
  -- The ids come back so the caller can revalidate those pages. Without that,
  -- somebody who already had the activity open keeps being served the version
  -- where it is still happening and still has an organizer.
  return query
  update public.activities
     set status = 'cancelled', updated_at = now()
   where owner_id = v_user
     and status in ('published', 'hidden')
     and starts_at > now()
  returning id;

  -- Hidden and unstarted activities nobody can see are simply removed.
  update public.activities
     set status = 'deleted', updated_at = now()
   where owner_id = v_user
     and status = 'hidden'
     and starts_at <= now();

  update public.comments
     set deleted_at = now(), deleted_by = v_user
   where author_id = v_user
     and deleted_at is null;
end;
$$;

comment on function public.prepare_account_deletion() is
  'Cancels upcoming activities and tombstones comments. Called before the auth user is deleted.';

revoke all on function public.prepare_account_deletion() from public;
grant execute on function public.prepare_account_deletion() to authenticated;
revoke all on function public.account_deletion_summary() from public;
grant execute on function public.account_deletion_summary() to authenticated;
