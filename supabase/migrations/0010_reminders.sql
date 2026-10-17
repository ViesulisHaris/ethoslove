-- "Remind me next year": the date of a birthday, an anniversary or Valentine's Day, kept for the
-- person who made a gift, so a daily job can email them nine days before it comes round again.
-- Additive: two new tables; nothing the live site reads is touched.
--
-- reminders: one row per person, occasion and date. Only the owner reads or writes their rows;
-- the daily job reads everyone's through the service role. A date is a month and a day, no year,
-- because it comes back every year; 29 February is kept as it is and sent for on the 28th in other
-- years. last_sent_year is the year of the occasion last emailed about, so a run that happens twice,
-- or late, never sends twice for the same year.
--
-- email_optouts: addresses that asked for no more optional emails (the checkout reminder).
-- Service emails (receipts, sign-in) are not affected. It keeps a SHA-256 of the address, lower
-- case, rather than the address itself: enough to check before sending, nothing to leak. Written
-- and read by the server only.
--
-- Safe to run again.

set local lock_timeout = '5s';

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  recipient_name text not null check (char_length(recipient_name) between 1 and 60),
  occasion text not null check (occasion in ('birthday', 'anniversary', 'valentines', 'other')),
  month smallint not null check (month between 1 and 12),
  day smallint not null check (day between 1 and 31),
  locale text not null default 'en' check (locale in ('en', 'es')),
  template_slug text,
  last_sent_year smallint,
  created_at timestamptz not null default now(),
  -- A day the month really has (the 29th of February included), so no reminder waits for 31 April.
  constraint reminders_real_day check (day <= case when month = 2 then 29 when month in (4, 6, 9, 11) then 30 else 31 end)
);

-- Saving the same reminder twice (a double tap, a second gift for the same birthday) keeps one row.
create unique index if not exists reminders_once_idx on public.reminders (user_id, recipient_name, occasion, month, day);
-- What the daily job looks up.
create index if not exists reminders_date_idx on public.reminders (month, day);

alter table public.reminders enable row level security;

drop policy if exists "reminders: owner all" on public.reminders;
create policy "reminders: owner all" on public.reminders
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.reminders from anon;
grant select, insert, update, delete on public.reminders to authenticated;

-- The API stops at 50 reminders a person (MAX_REMINDERS in lib/lifecycle/reminders.ts), but the
-- table is also writable straight from the browser with the publishable key. Without the same cap
-- here, one account could insert thousands of rows for one day and fill the daily job's batch, so
-- everybody else's reminders for that day would go late or not at all.
create or replace function public.reminders_cap()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.reminders where user_id = new.user_id) >= 50 then
    raise exception 'too many reminders' using errcode = '23514';
  end if;
  return new;
end $$;

revoke all on function public.reminders_cap() from public, anon, authenticated;

create or replace trigger reminders_cap
  before insert on public.reminders
  for each row
  execute function public.reminders_cap();

create table if not exists public.email_optouts (
  email_sha256 text primary key check (email_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
alter table public.email_optouts enable row level security;
-- No policies on purpose: only the service role reads or writes it.
revoke all on public.email_optouts from anon, authenticated;
