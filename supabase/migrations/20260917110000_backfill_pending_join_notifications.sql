-- Notifications for join requests that were already waiting.
--
-- The triggers in 20260917100000 only fire on rows written after they exist,
-- so any deployment that had people using it before the notifications table
-- landed starts with an empty list and a panel full of requests nobody was
-- told about. That is exactly how this was found: two requests sitting in an
-- organizer's panel, and no notification for either.
--
-- Deliberately narrow: only requests that are still `pending`. Those are the
-- ones still waiting on somebody to act. A notification about a decision
-- already taken, a comment from last week or an activity that was cancelled
-- and is now in the past is not information, it is backdated noise — and the
-- outcome of each of those is already visible where it belongs.
--
-- Idempotent, so it is a no-op on a database whose triggers already wrote the
-- row (every local and test database) and on a production database that has
-- never had a join request.

insert into public.notifications
  (user_id, kind, activity_id, actor_id, activity_title, actor_name, created_at)
select
  a.owner_id,
  'join_requested',
  jr.activity_id,
  jr.user_id,
  a.title,
  p.display_name,
  -- The moment it actually happened, not the moment of this migration: a
  -- request from Tuesday should not claim to have arrived at deploy time.
  jr.created_at
from public.join_requests jr
join public.activities a on a.id = jr.activity_id
left join public.profiles p on p.id = jr.user_id
where jr.status = 'pending'
  -- The same three rules public.notify applies, because a backfill that
  -- skipped them would deliver precisely what blocking exists to remove.
  and a.owner_id is not null
  and a.owner_id <> jr.user_id
  and not public.is_blocked_between(a.owner_id, jr.user_id)
  and not exists (
    select 1
      from public.notifications n
     where n.user_id = a.owner_id
       and n.kind = 'join_requested'
       and n.activity_id = jr.activity_id
       and n.actor_id = jr.user_id
  );
