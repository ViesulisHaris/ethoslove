-- Monthly anniversaries ("monthsaries"), for a buyer who asks for them: the day before each one, a
-- neutral check that it's still on; only a yes brings a reminder on the day, with one small idea
-- (src/lib/lifecycle/monthsaries.ts). Additive: one new table; nothing the live site reads is touched.
--
-- One row per account (one relationship, so one set of monthly emails at most); saving again
-- replaces it. `since` is the day the couple got together. Each month's falls on that day of the
-- month, or on the month's last day when it is shorter; `since_day` is that day, kept for the morning
-- job's lookup. checkin_for, confirmed_for and reminded_for are monthsaries (dates): the one the
-- check-in went out for, the one the buyer said yes to, and the one the reminder went out for. Each
-- is a claim, so a run that happens twice never sends twice.
--
-- Written by the server only (the API checks every value, and the claims are the job's): the owner
-- reads their own row, nobody else's, and the job reads everyone's through the service role. The
-- partner is only named here: nothing is ever sent to them. Deleting the account deletes the row.
--
-- Safe to run again.

set local lock_timeout = '5s';

create table if not exists public.monthsaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  partner_name text not null check (char_length(partner_name) between 1 and 60),
  since date not null check (since >= date '1950-01-01'),
  since_day smallint generated always as (extract(day from since)::smallint) stored,
  locale text not null default 'en' check (locale in ('en', 'es')),
  checkin_for date,
  confirmed_for date,
  reminded_for date,
  created_at timestamptz not null default now()
);

-- One per account.
create unique index if not exists monthsaries_one_per_account on public.monthsaries (user_id);
-- What the morning job looks up: the rows whose day lands on today or tomorrow.
create index if not exists monthsaries_day_idx on public.monthsaries (since_day);

alter table public.monthsaries enable row level security;

drop policy if exists "monthsaries: owner reads" on public.monthsaries;
create policy "monthsaries: owner reads" on public.monthsaries
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.monthsaries from anon, authenticated;
grant select on public.monthsaries to authenticated;
