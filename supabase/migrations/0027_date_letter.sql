-- The date letter: one date idea a week by email, on Thursdays, to addresses that asked for it in
-- the box on the dates, plans, trips, long-distance, games and blog pages
-- (src/lib/lifecycle/date-letter.ts, src/components/date-letter/letter-box.tsx). Additive: one new
-- table; nothing the live site reads is touched. Until it exists the box is not drawn
-- (/api/date-letter answers { available: false }), asking answers "unavailable", and the job sends
-- nothing (it answers skipped: "no_table").
--
-- date_letter: one row per address. It names no account: a reader needs none.
--   email            the address, lower case.
--   locale           the language of the page it was typed on, and of the letters.
--   wording          the sentence they agreed to, as the server words it, in that language.
--   source_path      the page it signed up on: the path only, never a query or a fragment.
--   asked_at         when the box was last pressed for it.
--   confirm_sent_at  when the confirming email last went: at most one a day to an address.
--   confirmed_at     when the button in that email was pressed (or the box, signed in with this
--                    address). Nothing weekly is sent before it.
--   last_week        the week last dealt with, sent or skipped (weeks counted from Monday 5 January
--                    1970, as src/lib/games/weekly.ts counts them): the claim, once a week.
--   held_on          a day the letter waited, because another of our emails went to this person
--                    that day or its send failed: it is looked at again the day after.
--   stopped_at       they said stop. Honoured at once; the row is deleted 30 days later.
-- The job deletes an address never confirmed 30 days after it asked. "Never email this address",
-- from the confirming email, deletes the row and puts the address's hash on email_optouts (0010).
-- Deleting an account deletes the row at its address (src/lib/auth/delete-account.ts).
--
-- The server's alone: row-level security with no policy, and nothing for anon or authenticated.
--
-- Safe to run again.

set local lock_timeout = '5s';

create table if not exists public.date_letter (
  id              uuid primary key default gen_random_uuid(),
  email           text not null check (char_length(email) between 3 and 254 and email = lower(email)),
  locale          text not null default 'en' check (locale in ('en', 'es')),
  wording         text not null check (char_length(wording) between 1 and 300),
  source_path     text not null check (source_path ~ '^/[a-z0-9/-]{0,119}$'),
  asked_at        timestamptz not null default now(),
  confirm_sent_at timestamptz,
  confirmed_at    timestamptz,
  last_week       integer,
  held_on         date,
  stopped_at      timestamptz
);

create unique index if not exists date_letter_email_idx on public.date_letter (email);
create index if not exists date_letter_due_idx on public.date_letter (last_week) where confirmed_at is not null and stopped_at is null;
create index if not exists date_letter_pending_idx on public.date_letter (asked_at) where confirmed_at is null;
create index if not exists date_letter_stopped_idx on public.date_letter (stopped_at) where stopped_at is not null;

alter table public.date_letter enable row level security;
revoke all on public.date_letter from public, anon, authenticated;
