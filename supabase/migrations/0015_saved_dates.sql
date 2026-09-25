-- Saved dates and trips (docs/MEMBERSHIP.md 1.5, 1.7 and 3). Until now a plan lived only in the
-- browser and in the link that shares it; an account can now keep some. Additive: one new table and
-- five functions; nothing the live site reads is touched. It needs only 0009 (it reads
-- couple_passes' owner, partner, starts_at and ends_at), so it can go in with 0014 or on its own.
--
-- saved_dates: one row per saved date or trip, owned by one account. `data` is the plan exactly as
-- src/lib/dates/plan.ts reads it (a date), or { v: 1, tripId, depart?, note? } (a trip). The server
-- derives `city`, `day` and `stops_count` from it. `version` is the optimistic lock two phones
-- editing one date check against (PATCH baseVersion); `updated_at` orders "the three most recently
-- changed", which stay editable once a membership has ended. Free accounts keep three rows, members
-- any number: that depends on membership, so it is checked by /api/saved-dates, which makes every
-- write with the service role. Signed-in users only read.
--
-- Time: `created_at` and `updated_at` are the database's, never an app server's. Two saves at once
-- are ranked by `created_at` to decide which one was past the free limit, and two servers' clocks
-- can disagree by more than the moments between two taps; saved_dates_touch stamps each new version.
--
-- Reminders: saved_dates_due() is the reminder cron's one query: members' rows only, so a morning
-- with many free accounts' dates can't fill the batch and leave members without their reminder.
--
-- Sharing: while a membership with a partner runs, each of the two can read the other's rows (the
-- policy below) and edit them (the API). couple_partner() is security definer because a partner
-- can't read the owner's couple_passes rows the other way round, and RLS on saved_dates must see
-- both. It answers only about the caller: a signed-in user asking about anyone else gets null, so
-- the function can't be used to find out who is whose partner. The service role (no auth.uid())
-- may ask about anyone. The same goes for is_member().
--
-- Nothing here deletes a saved date: only its owner does, or deleting the account (the cascade).
--
-- Safe to run again.

set local lock_timeout = '5s';

-- The other person in the user's running membership, or null.
create or replace function public.couple_partner(p_user uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select case when cp.owner_user_id = p_user then cp.partner_user_id else cp.owner_user_id end
  from public.couple_passes cp
  where p_user = coalesce((select auth.uid()), p_user)
    and cp.partner_user_id is not null
    and (cp.owner_user_id = p_user or cp.partner_user_id = p_user)
    and cp.starts_at <= now() and cp.ends_at > now()
  order by (cp.owner_user_id = p_user) desc, cp.ends_at desc
  limit 1
$$;
revoke all on function public.couple_partner(uuid) from public, anon;
grant execute on function public.couple_partner(uuid) to authenticated, service_role;

-- Whether the user holds a running membership, as owner or partner. The same guard.
create or replace function public.is_member(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.couple_passes cp
    where p_user = coalesce((select auth.uid()), p_user)
      and (cp.owner_user_id = p_user or cp.partner_user_id = p_user)
      and cp.starts_at <= now() and cp.ends_at > now()
  )
$$;
revoke all on function public.is_member(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated, service_role;

create table if not exists public.saved_dates (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('date', 'trip')),
  title text not null default '' check (char_length(title) <= 80),
  city text check (char_length(city) <= 80),
  day date,
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 16384),
  stops_count smallint not null default 0 check (stops_count between 0 and 99),
  remind boolean not null default true,
  -- The day the day-before reminder last went out for: the cron claims it before sending.
  reminded_for date,
  version integer not null default 1 check (version >= 1),
  last_edited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- My dates, newest change first; and the free limit's count.
create index if not exists saved_dates_owner_idx on public.saved_dates (owner_user_id, updated_at desc);
-- What the reminder cron looks up each morning.
create index if not exists saved_dates_day_idx on public.saved_dates (day) where remind and day is not null;
-- "Save trip" is a toggle: one row per trip per account (the API answers with the existing row on 23505).
create unique index if not exists saved_dates_trip_idx on public.saved_dates (owner_user_id, (data ->> 'tripId')) where kind = 'trip';
-- Deleting an account sets last_edited_by to null on its partner's rows: without this that is a scan.
create index if not exists saved_dates_editor_idx on public.saved_dates (last_edited_by) where last_edited_by is not null;

alter table public.saved_dates enable row level security;

-- couple_partner() is wrapped in a select so Postgres runs it once per query, not once per row.
drop policy if exists "saved_dates: owner or partner read" on public.saved_dates;
create policy "saved_dates: owner or partner read" on public.saved_dates
  for select to authenticated
  using ((select auth.uid()) = owner_user_id or owner_user_id = (select public.couple_partner((select auth.uid()))));

-- Every write goes through /api/saved-dates with the service role: the free limit depends on membership.
revoke all on public.saved_dates from anon;
revoke insert, update, delete on public.saved_dates from authenticated;
grant select on public.saved_dates to authenticated;

-- A new version of a date (an edit, not a reminder switched or claimed) is stamped with the
-- database's own time, as an insert is by the column's default: "the three most recently changed"
-- are ranked by one clock.
create or replace function public.saved_dates_touch()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.version is distinct from old.version then
    new.updated_at := now();
  end if;
  return new;
end $$;

-- Only the trigger runs it; keep it off the API.
revoke all on function public.saved_dates_touch() from public, anon, authenticated;

create or replace trigger saved_dates_touch
  before update on public.saved_dates
  for each row
  execute function public.saved_dates_touch();

-- The reminder cron's rows for p_day (docs/MEMBERSHIP.md 3.4): reminders on, not yet claimed for
-- that day, and only where the owner holds a running membership (as owner or partner), the same
-- test as is_member(). Oldest first, and never more than 500 at once. The service role's only.
create or replace function public.saved_dates_due(p_day date, p_limit integer)
returns setof public.saved_dates language sql stable set search_path = public as $$
  select sd.* from public.saved_dates sd
  where sd.remind
    and sd.day = p_day
    and (sd.reminded_for is null or sd.reminded_for <> p_day)
    and exists (
      select 1 from public.couple_passes cp
      where (cp.owner_user_id = sd.owner_user_id or cp.partner_user_id = sd.owner_user_id)
        and cp.starts_at <= now() and cp.ends_at > now()
    )
  order by sd.created_at, sd.id
  limit greatest(least(p_limit, 500), 0)
$$;
revoke all on function public.saved_dates_due(date, integer) from public, anon, authenticated;
grant execute on function public.saved_dates_due(date, integer) to service_role;

-- A backstop, not the free limit: no account keeps more than 500 (the reminders_cap pattern, 0010).
create or replace function public.saved_dates_cap()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.saved_dates where owner_user_id = new.owner_user_id) >= 500 then
    raise exception 'too many saved dates' using errcode = '23514';
  end if;
  return new;
end $$;

-- Only the trigger runs it; keep it off the API.
revoke all on function public.saved_dates_cap() from public, anon, authenticated;

create or replace trigger saved_dates_cap
  before insert on public.saved_dates
  for each row
  execute function public.saved_dates_cap();
