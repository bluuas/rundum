-- Allows an activity to have no participant limit.
--
-- "Unlimited" is NULL, not a sentinel such as 0 or a very large number. A
-- sentinel would compare and sort as an ordinary integer and eventually surface
-- in the UI as "9999 spots left"; NULL cannot be mistaken for a count.
--
-- Existing rows all carry a number, so this widens the column without a
-- backfill.

alter table public.activities
  drop constraint activities_max_participants_check;

alter table public.activities
  alter column max_participants drop not null;

alter table public.activities
  add constraint activities_max_participants_check
  check (max_participants is null or max_participants between 1 and 100);

comment on column public.activities.max_participants is
  'NULL means no limit. Otherwise 1-100.';
