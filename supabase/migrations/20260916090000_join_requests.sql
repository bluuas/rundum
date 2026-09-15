-- Phase 6: join requests and organizer approval.
--
-- The tables shipped in the initial migration; this migration makes them safe
-- to write to. Two problems with the original policies are fixed here:
--
--   1. join_requests_update let *either* party update the row. Read literally,
--      that allowed a requester to set their own status to 'approved' — the
--      organizer's decision, made by the person awaiting it. The policy is
--      dropped and every state change now goes through an RPC that knows which
--      transitions each party may make.
--   2. join_requests_insert_own did not constrain `status`, so a direct insert
--      could arrive pre-approved. The replacement pins it to 'pending'.
--
-- Errors are raised with application-defined SQLSTATEs (RU001…RU011) rather
-- than generic ones. The app maps the code to a translated message; matching on
-- the English exception text would break the moment a string is reworded, and
-- would put English into a German page. The messages below are for the Postgres
-- log, not for users.
--
-- The pattern matches delete_comment(): where an operation has a rule more
-- specific than "this row belongs to you", the rule lives in a function rather
-- than a policy, so no column can be edited along the way.

drop policy if exists join_requests_update on public.join_requests;
drop policy if exists join_requests_insert_own on public.join_requests;

create policy join_requests_insert_own on public.join_requests
  for insert with check (
    auth.uid() = user_id
    -- A request may only ever be created pending. Approval is not self-served.
    and status = 'pending'
    and exists (
      select 1 from public.activities a
      where a.id = activity_id
        and a.status = 'published'
        and a.starts_at > now()
        and a.owner_id <> auth.uid()
        and not public.is_blocked_between(a.owner_id, auth.uid())
    )
  );

-- No update policy at all: withdraw_join_request() and decide_join_request()
-- are the only ways a status changes.

-- ---------------------------------------------------------------------------
-- Requesting
-- ---------------------------------------------------------------------------

-- Asks to join, or re-asks after withdrawing.
--
-- Returns the resulting status rather than void so the caller can distinguish
-- "created" from "you had already asked" without a second round trip.
--
-- A declined request cannot be re-sent. The organizer said no; letting the
-- request reappear would turn a decline into a thing you have to keep doing.
create or replace function public.request_to_join(
  p_activity_id uuid,
  p_message text default null
)
returns public.join_request_status
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_activity record;
  v_existing record;
  v_message text := nullif(btrim(p_message), '');
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = 'RU001';
  end if;

  select a.owner_id, a.status, a.starts_at
    into v_activity
  from public.activities a
  where a.id = p_activity_id;

  -- A blocked user gets the same "not found" as a stranger asking about an
  -- activity that never existed, so blocking does not announce itself.
  if not found or public.is_blocked_between(v_activity.owner_id, v_user) then
    raise exception 'Activity not found' using errcode = 'RU002';
  end if;

  if v_activity.owner_id = v_user then
    raise exception 'Own activity' using errcode = 'RU003';
  end if;

  if v_activity.status <> 'published' then
    raise exception 'Not open' using errcode = 'RU004';
  end if;

  if v_activity.starts_at <= now() then
    raise exception 'Already started' using errcode = 'RU005';
  end if;

  select jr.id, jr.status into v_existing
  from public.join_requests jr
  where jr.activity_id = p_activity_id and jr.user_id = v_user;

  if found then
    if v_existing.status in ('pending', 'approved') then
      -- Already asked, or already in. Idempotent rather than an error, because
      -- a double tap is not a mistake worth a message.
      return v_existing.status;
    end if;

    if v_existing.status = 'declined' then
      raise exception 'Previously declined' using errcode = 'RU006';
    end if;

    -- Withdrawn: reuse the row so the unique (activity_id, user_id) pair holds.
    update public.join_requests
       set status = 'pending',
           message = coalesce(v_message, message),
           created_at = now(),
           decided_at = null
     where id = v_existing.id;
  else
    insert into public.join_requests (activity_id, user_id, status, message)
    values (p_activity_id, v_user, 'pending', v_message);
  end if;

  insert into public.activity_events (event_type, activity_id, user_id)
  values ('join_requested', p_activity_id, v_user);

  return 'pending';
end;
$$;

-- Withdraws a pending request, or drops out of an activity already joined.
-- Both are the same action from the participant's side, and both free a seat.
create or replace function public.withdraw_join_request(p_activity_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = 'RU001';
  end if;

  update public.join_requests
     set status = 'withdrawn', decided_at = now()
   where activity_id = p_activity_id
     and user_id = v_user
     and status in ('pending', 'approved')
  returning id into v_id;

  if v_id is null then
    raise exception 'Nothing to withdraw' using errcode = 'RU010';
  end if;

  insert into public.activity_events (event_type, activity_id, user_id)
  values ('join_withdrawn', p_activity_id, v_user);
end;
$$;

-- ---------------------------------------------------------------------------
-- Deciding
-- ---------------------------------------------------------------------------

-- The organizer approves or declines one pending request.
--
-- Capacity is checked here, under a lock on the activity row, rather than in
-- the UI: two quick taps on two different requests would otherwise both read
-- "9 of 10" and both succeed, putting 11 people in a 10-person activity.
create or replace function public.decide_join_request(
  p_request_id uuid,
  p_approve boolean
)
returns public.join_request_status
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_request record;
  v_max integer;
  v_approved integer;
  v_next public.join_request_status;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = 'RU001';
  end if;

  select jr.id, jr.activity_id, jr.user_id, jr.status, a.owner_id
    into v_request
  from public.join_requests jr
  join public.activities a on a.id = jr.activity_id
  where jr.id = p_request_id;

  if not found then
    raise exception 'Request not found' using errcode = 'RU011';
  end if;

  if v_request.owner_id <> v_user then
    raise exception 'Not the organizer' using errcode = 'RU009';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Already decided' using errcode = 'RU008';
  end if;

  v_next := case when p_approve then 'approved' else 'declined' end;

  if p_approve then
    -- Serializes concurrent approvals on the same activity. Every approval
    -- takes this lock, so the count below cannot be read stale.
    select a.max_participants into v_max
    from public.activities a
    where a.id = v_request.activity_id
    for update;

    -- NULL max_participants means no limit, so there is nothing to check.
    if v_max is not null then
      select count(*) into v_approved
      from public.join_requests
      where activity_id = v_request.activity_id and status = 'approved';

      if v_approved >= v_max then
        raise exception 'Full' using errcode = 'RU007';
      end if;
    end if;
  end if;

  update public.join_requests
     set status = v_next, decided_at = now()
   where id = p_request_id;

  insert into public.activity_events (event_type, activity_id, user_id, metadata)
  values (
    case when p_approve then 'join_approved' else 'join_declined' end,
    v_request.activity_id,
    v_request.user_id,
    jsonb_build_object('decided_by', v_user)
  );

  return v_next;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reading the roster
-- ---------------------------------------------------------------------------

-- Who is coming, and who is waiting.
--
-- Deliberately not an RLS policy widening: the roster is not public. The
-- organizer sees pending and approved requests, including each message.
-- Someone already approved sees the other approved participants' names, so
-- they know who they are meeting — but not the pending ones, and not the
-- messages, which were written to the organizer. Everyone else sees nothing
-- here and only the aggregate count on the page.
--
-- That split is why this is a function: "you may read this row" depends on
-- another row in the same table, which a policy cannot express without
-- recursing.
create or replace function public.activity_roster(p_activity_id uuid)
returns table (
  request_id uuid,
  user_id uuid,
  display_name text,
  avatar_url text,
  strava_connected boolean,
  status public.join_request_status,
  message text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
begin
  if v_user is null then
    return;
  end if;

  select a.owner_id into v_owner from public.activities a where a.id = p_activity_id;
  if v_owner is null then
    return;
  end if;

  if v_owner = v_user then
    return query
      select jr.id, jr.user_id, p.display_name, p.avatar_url, p.strava_connected,
             jr.status, jr.message, jr.created_at
      from public.join_requests jr
      join public.profiles p on p.id = jr.user_id
      where jr.activity_id = p_activity_id
        and jr.status in ('pending', 'approved')
        and not public.is_blocked_between(jr.user_id, v_user)
      -- Pending first: the organizer opened this to act, not to browse.
      order by (jr.status = 'pending') desc, jr.created_at asc;
    return;
  end if;

  if not exists (
    select 1 from public.join_requests jr
    where jr.activity_id = p_activity_id
      and jr.user_id = v_user
      and jr.status = 'approved'
  ) then
    return;
  end if;

  return query
    select jr.id, jr.user_id, p.display_name, p.avatar_url, p.strava_connected,
           jr.status, null::text, jr.created_at
    from public.join_requests jr
    join public.profiles p on p.id = jr.user_id
    where jr.activity_id = p_activity_id
      and jr.status = 'approved'
      and not public.is_blocked_between(jr.user_id, v_user)
    order by jr.created_at asc;
end;
$$;

grant execute on function public.request_to_join(uuid, text) to authenticated;
grant execute on function public.withdraw_join_request(uuid) to authenticated;
grant execute on function public.decide_join_request(uuid, boolean) to authenticated;
grant execute on function public.activity_roster(uuid) to authenticated;
