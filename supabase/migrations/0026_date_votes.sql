-- "Was this a good date?" (BRIEF-dates2.md 3). One tap on a date a person has marked done on /plan:
-- a yes or a no, changeable, nothing typed. Kept per place or idea as two counters, and shown to
-- others only as "14 couples liked this", from five yes votes up.
--
-- Only adds: one new table and one function. Nothing the live site reads is touched, and the site
-- works exactly as before while this has not been applied: /api/dates/votes answers
-- { available: false } when the table or the function is missing, and the question is not asked.
--
-- date_votes: one row per place ("place:node/123") or idea ("idea:golden-hour-picnic"), the two
-- counters and when they last moved. No column for a person, an address, a device or a session: a
-- browser keeps its own answer, and a second tap sends the change (-1 on the old answer, +1 on the
-- new), never a second vote. The pattern of `target` is the code's own (src/lib/dates/votes.ts
-- TARGET; tests/unit/migrations-date-votes.test.ts holds the two together).
--
-- Row-level security is on with no policy: only the service role reads or writes, through the
-- rate-limited route. date_votes_apply adds one tap's changes (at most nine: eight stops and the
-- idea) and never takes a counter under zero.
--
-- Safe to run again.

set local lock_timeout = '5s';

create table if not exists public.date_votes (
  target text primary key check (target ~ '^(place:(node|way|relation)/[0-9]{1,15}|idea:[a-z0-9-]{1,40})$'),
  yes integer not null default 0 check (yes >= 0),
  no integer not null default 0 check (no >= 0),
  updated_at timestamptz not null default now()
);

alter table public.date_votes enable row level security;
revoke all on public.date_votes from public, anon, authenticated;

create or replace function public.date_votes_apply(p_targets text[], p_yes integer[], p_no integer[])
returns void language plpgsql security definer set search_path = public as $$
declare i integer;
begin
  if p_targets is null or array_length(p_targets, 1) is null or array_length(p_targets, 1) > 9
     or array_length(p_yes, 1) is distinct from array_length(p_targets, 1)
     or array_length(p_no, 1) is distinct from array_length(p_targets, 1) then
    raise exception 'bad vote' using errcode = '22023';
  end if;
  for i in 1 .. array_length(p_targets, 1) loop
    if p_yes[i] not between -1 and 1 or p_no[i] not between -1 and 1 then
      raise exception 'bad vote' using errcode = '22023';
    end if;
    insert into public.date_votes as v (target, yes, no)
    values (p_targets[i], greatest(p_yes[i], 0), greatest(p_no[i], 0))
    on conflict (target) do update
      set yes = greatest(v.yes + p_yes[i], 0), no = greatest(v.no + p_no[i], 0), updated_at = now();
  end loop;
end $$;

revoke all on function public.date_votes_apply(text[], integer[], integer[]) from public, anon, authenticated;
grant execute on function public.date_votes_apply(text[], integer[], integer[]) to service_role;
