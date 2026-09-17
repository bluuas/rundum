-- In-app notifications.
--
-- Today nothing tells anybody anything. Somebody asks to join and the
-- organizer finds out if and when they next open the app and happen to look at
-- the right screen. This gives every such moment a row, and one place to read
-- them.
--
-- In-app only, deliberately for now: no email, no push. The honest limit is
-- that this reaches nobody who is not already opening Rundum — it makes the
-- telling visible rather than making it arrive. Anything time-critical (a
-- cancellation two hours before the run) still needs a channel that reaches a
-- phone. Recorded in LAUNCH.md.
--
-- Written by triggers rather than by Server Actions, for the same reason the
-- primary metric is: an action that forgets is a bug nobody sees, and the
-- database already knows the moment happened.

create table public.notifications (
  id bigint generated always as identity primary key,
  -- Who should see this.
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- What happened. A stable key, never translated text: the reader's language
  -- is decided when it is rendered, not when it is written.
  kind text not null check (kind in (
    'join_requested',
    'join_approved',
    'join_declined',
    'activity_cancelled',
    'comment_posted'
  )),
  activity_id uuid references public.activities (id) on delete cascade,
  -- The person who caused it, null once they delete their account.
  actor_id uuid references public.profiles (id) on delete set null,
  -- Denormalised so a notification still reads correctly after the activity is
  -- gone: "Lakeside spin was cancelled" needs the title, not a dangling id.
  activity_title text,
  actor_name text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index notifications_unread_idx
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

-- Yours and nobody else's. No insert policy: only the triggers below write.
create policy notifications_read_own on public.notifications
  for select using (user_id = auth.uid());

-- Marking as read is the one thing a client may change, and only on its own
-- rows. A policy cannot say "only this column", so the RPC below does.
create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Writing them
-- ---------------------------------------------------------------------------

/*
  One insert, with the blocking rule applied once here rather than in four
  triggers. Notifying somebody about a person they blocked would hand them
  exactly what blocking exists to remove.
*/
create or replace function public.notify(
  p_user_id uuid,
  p_kind text,
  p_activity_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Never notify somebody about themselves.
  if p_user_id is null or p_user_id = p_actor_id then
    return;
  end if;

  if p_actor_id is not null and public.is_blocked_between(p_user_id, p_actor_id) then
    return;
  end if;

  insert into public.notifications
    (user_id, kind, activity_id, actor_id, activity_title, actor_name)
  values (
    p_user_id,
    p_kind,
    p_activity_id,
    p_actor_id,
    (select title from public.activities where id = p_activity_id),
    (select display_name from public.profiles where id = p_actor_id)
  );
end;
$$;

-- Somebody asked to join something you organize.
create or replace function public.notify_join_requested()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.notify(
    (select owner_id from public.activities where id = new.activity_id),
    'join_requested',
    new.activity_id,
    new.user_id
  );
  return new;
end;
$$;

create trigger join_requests_notify_owner
  after insert on public.join_requests
  for each row execute function public.notify_join_requested();

-- The organizer decided.
create or replace function public.notify_join_decided()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status in ('approved', 'declined') then
    perform public.notify(
      new.user_id,
      case when new.status = 'approved' then 'join_approved' else 'join_declined' end,
      new.activity_id,
      (select owner_id from public.activities where id = new.activity_id)
    );
  end if;

  return new;
end;
$$;

create trigger join_requests_notify_requester
  after update on public.join_requests
  for each row execute function public.notify_join_decided();

/*
  An activity was cancelled, so everyone who had a place needs to know.

  The one notification here that is genuinely time-critical, and the one this
  channel serves worst: somebody who does not open the app still turns up.
*/
create or replace function public.notify_activity_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_participant record;
begin
  if new.status <> 'cancelled' or old.status = 'cancelled' then
    return new;
  end if;

  for v_participant in
    select user_id from public.join_requests
     where activity_id = new.id and status in ('approved', 'pending')
  loop
    perform public.notify(
      v_participant.user_id,
      'activity_cancelled',
      new.id,
      -- Null when the organizer cancelled by deleting their account, which is
      -- exactly when old.owner_id is the last record of who it was.
      coalesce(new.owner_id, old.owner_id)
    );
  end loop;

  return new;
end;
$$;

create trigger activities_notify_cancelled
  after update on public.activities
  for each row execute function public.notify_activity_cancelled();

-- Somebody commented on an activity you organize or have a place at.
create or replace function public.notify_comment_posted()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recipient record;
begin
  for v_recipient in
    select owner_id as user_id from public.activities where id = new.activity_id
    union
    select user_id from public.join_requests
     where activity_id = new.activity_id and status = 'approved'
  loop
    perform public.notify(
      v_recipient.user_id,
      'comment_posted',
      new.activity_id,
      new.author_id
    );
  end loop;

  return new;
end;
$$;

create trigger comments_notify_participants
  after insert on public.comments
  for each row execute function public.notify_comment_posted();

-- ---------------------------------------------------------------------------
-- Reading them
-- ---------------------------------------------------------------------------

create or replace function public.unread_notification_count()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer from public.notifications
   where user_id = auth.uid() and read_at is null;
$$;

-- Opening the list is what marks them read. A policy could allow the update
-- but not restrict it to the one column, and "mark read" must not become
-- "rewrite what happened".
create or replace function public.mark_notifications_read()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = 'RU001';
  end if;

  update public.notifications
     set read_at = now()
   where user_id = auth.uid() and read_at is null;
end;
$$;

-- The update policy exists for completeness; nothing should use it directly.
revoke update on public.notifications from anon, authenticated;

revoke all on function public.notify(uuid, text, uuid, uuid) from public;
revoke all on function public.mark_notifications_read() from public;
grant execute on function public.mark_notifications_read() to authenticated;
revoke all on function public.unread_notification_count() from public;
grant execute on function public.unread_notification_count() to authenticated;
