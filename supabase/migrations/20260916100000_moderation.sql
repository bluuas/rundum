-- Phase 8: reporting and blocking.
--
-- The tables and their policies shipped in the initial migration. What was
-- missing is everything that makes them usable and consistent:
--
--   * a report needs its target checked — reports.target_id is a bare uuid with
--     no foreign key, because it points at three different tables, so nothing
--     stops a client inserting a report about an id that does not exist;
--   * blocking has consequences beyond the blocks row. If A blocks B while B is
--     approved on A's activity, RLS immediately hides that activity from B —
--     leaving B holding a place at something they can no longer see, and
--     counting against the limit. Blocking must free that place.
--   * the blocker cannot read the blocked user's profile (profiles_read
--     excludes anyone in a block relationship), so "who have I blocked?" cannot
--     be answered by a join and needs its own function.
--
-- Error codes continue the RU… series from the join-request migration.

-- ---------------------------------------------------------------------------
-- Reporting
-- ---------------------------------------------------------------------------

-- `reason` holds a stable key ('spam', 'harassment', …), not a sentence: the
-- UI translates it, and a moderator grouping reports wants to group by
-- something that does not vary with the reporter's language.
create or replace function public.submit_report(
  p_target_type public.report_target,
  p_target_id uuid,
  p_reason text,
  p_details text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_details text := nullif(btrim(p_details), '');
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = 'RU001';
  end if;

  -- Resolve the target and, at the same time, who is responsible for it, so
  -- self-reports can be rejected without a second lookup.
  if p_target_type = 'activity' then
    select a.owner_id into v_owner
    from public.activities a
    where a.id = p_target_id and a.status <> 'deleted';
  elsif p_target_type = 'comment' then
    select c.author_id into v_owner
    from public.comments c
    where c.id = p_target_id and c.deleted_at is null;
  else
    select p.id into v_owner from public.profiles p where p.id = p_target_id;
  end if;

  if v_owner is null then
    raise exception 'Report target not found' using errcode = 'RU020';
  end if;

  if v_owner = v_user then
    raise exception 'Cannot report your own content' using errcode = 'RU021';
  end if;

  insert into public.reports (reporter_id, target_type, target_id, reason, details)
  values (v_user, p_target_type, p_target_id, p_reason, v_details)
  -- Reporting the same thing twice is not an error worth a red message, but it
  -- must not create a second row either: one reporter, one report.
  on conflict (reporter_id, target_type, target_id) do nothing;

  insert into public.activity_events (event_type, user_id, metadata)
  values (
    'report_submitted',
    v_user,
    jsonb_build_object('target_type', p_target_type, 'reason', p_reason)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Blocking
-- ---------------------------------------------------------------------------

-- Blocking is symmetric in effect — is_blocked_between() hides each from the
-- other — so the consequences are applied in both directions too.
create or replace function public.block_user(p_blocked_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = 'RU001';
  end if;

  if p_blocked_id = v_user then
    raise exception 'Cannot block yourself' using errcode = 'RU023';
  end if;

  if not exists (select 1 from public.profiles where id = p_blocked_id) then
    raise exception 'No such account' using errcode = 'RU020';
  end if;

  insert into public.blocks (blocker_id, blocked_id)
  values (v_user, p_blocked_id)
  on conflict do nothing;

  -- Free any place either party holds at the other's activity. Without this,
  -- the blocked user keeps a seat at an activity RLS no longer lets them see.
  update public.join_requests jr
     set status = 'withdrawn', decided_at = now()
    from public.activities a
   where a.id = jr.activity_id
     and jr.status in ('pending', 'approved')
     and (
       (jr.user_id = p_blocked_id and a.owner_id = v_user)
       or (jr.user_id = v_user and a.owner_id = p_blocked_id)
     );

  insert into public.activity_events (event_type, user_id, metadata)
  values ('user_blocked', v_user, jsonb_build_object('blocked_id', p_blocked_id));
end;
$$;

-- Unblocking restores visibility, not the requests that blocking withdrew.
-- Putting somebody back into an activity they were removed from is a decision
-- for the two of them, not a side effect.
create or replace function public.unblock_user(p_blocked_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = 'RU001';
  end if;

  delete from public.blocks
   where blocker_id = v_user and blocked_id = p_blocked_id;
end;
$$;

-- Who the caller has blocked.
--
-- Needs to be security definer: profiles_read hides anyone in a block
-- relationship from the viewer, which is correct everywhere except here, where
-- the whole point is to show the user a list they can undo. Scoped to
-- blocker_id = auth.uid(), so it can only ever return the caller's own list.
create or replace function public.blocked_accounts()
returns table (
  user_id uuid,
  display_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select b.blocked_id, p.display_name, b.created_at
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

grant execute on function public.submit_report(public.report_target, uuid, text, text)
  to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.blocked_accounts() to authenticated;
