-- The monthly idea: one email a month, for a year after someone last sent a gift, with one template
-- suggested for the season and, in the first one only, a one-time personal price
-- (src/lib/lifecycle/monthly-idea.ts). Additive: one new table; nothing the live site reads is
-- touched. Until it exists, sending a gift works as before and shows no notice, and the job sends nothing.
--
-- One row per account (one address, so one email a month at most). A newer gift moves `since` to its
-- own day. It names no gift and nobody a gift was for:
--   since          the day the account last sent a gift (UTC); since_day is kept for the job's lookup.
--   template_slug  that gift's template, only so the idea suggested is a different one.
--   basis          how they came in: notice (told when sending, with the off switch), box (the offers
--                  box, where its sentence names this email) or terms (the free version's Terms box).
--   wording        the sentence they were shown or ticked, in the language it was shown in.
--   handled_for    the monthly date last dealt with, sent or skipped: the claim.
--   last_sent_on   the day an email last went: what other optional emails check their 14 days against.
--   price_sent_at, price_used_at   the one personal price: when it was offered, when it was bought with.
--   off_at         they said stop. Kept, so sending another gift doesn't start them again.
--   created_at     when the row was made: for a terms row, when the box was ticked.
--
-- Written by the server only; the owner reads their own row. Deleting the account deletes it.
--
-- Safe to run again.

set local lock_timeout = '5s';

create table if not exists public.monthly_ideas (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  since         date not null,
  since_day     smallint generated always as (extract(day from since)::smallint) stored,
  template_slug text,
  locale        text not null default 'en' check (locale in ('en', 'es')),
  basis         text not null check (basis in ('notice', 'box', 'terms')),
  wording       text not null check (char_length(wording) between 1 and 300),
  handled_for   date,
  last_sent_on  date,
  price_sent_at timestamptz,
  price_used_at timestamptz,
  off_at        timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists monthly_ideas_day_idx on public.monthly_ideas (since_day) where off_at is null;

alter table public.monthly_ideas enable row level security;

drop policy if exists "monthly_ideas: owner reads" on public.monthly_ideas;
create policy "monthly_ideas: owner reads" on public.monthly_ideas
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.monthly_ideas from anon, authenticated;
grant select on public.monthly_ideas to authenticated;
