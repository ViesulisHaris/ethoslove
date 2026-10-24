-- Recipients who keep a gift, and real reactions on the site. Additive: two new tables, five new
-- columns on reactions (all with defaults), one function; nothing the live site reads is changed.
--
-- gift_keeps: a recipient who asked, on the small page off a gift's end screen, to be emailed that
-- gift's link, and maybe reminded before the sender's birthday or their anniversary
-- (src/lib/keep). Recipients have no account, so the address is confirmed by a link first (double
-- opt-in): the form can never send a stranger more than one confirmation a day, and an address on the
-- unsubscribe list (email_optouts, 0010) gets none. A row is pending until confirmed_at;
-- unsubscribing deletes it with its reminders. `consent` is the sentence they saw; `requested` holds
-- the reminders they asked for until the confirmation makes them real. One row per gift and address
-- (asking again updates it). The morning job deletes rows never confirmed after seven days, so a
-- stranger's address isn't kept. Deleting the gift deletes its keeps.
--
-- keep_reminders: the days a confirmed keeper asked to be reminded of, emailed nine days before like
-- the yearly reminders (0010), with one suggested template and nothing from any gift. `name` is the
-- first name the gift is signed with, or '' when the signature has none ("Tu amor"): the emails then
-- say "the sender".
--
-- Both are the server's alone: no policies, and nothing for anon or authenticated.
--
-- reactions: whether the recipient agreed (an unticked box) that Ethos may show the reaction, emoji
-- and words only and without names; the moment the sender said no; and the owner's approval. Only a
-- reaction with all three right is ever shown, and the site reads those with the service role
-- (src/lib/proof): no policy opens reactions to anyone else. `locale` is the language of the gift it
-- was written on, kept with the yes: a page shows only the reactions written in its own language.
--
-- proof_numbers(): how many gifts have been opened, and how many opens there have been, for the line
-- on the site. Counts only, read with the service role and cached by the site.
--
-- Safe to run again.

set local lock_timeout = '5s';

create table if not exists public.gift_keeps (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null references public.gifts (id) on delete cascade,
  email text not null check (char_length(email) between 3 and 254),
  email_sha256 text not null check (email_sha256 ~ '^[0-9a-f]{64}$'),
  locale text not null default 'en' check (locale in ('en', 'es')),
  consent text not null check (char_length(consent) between 1 and 1000),
  requested jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  -- When the confirmation email last went: at most one a day to an address for a gift.
  confirm_sent_at timestamptz,
  confirmed_at timestamptz
);
create unique index if not exists gift_keeps_once_idx on public.gift_keeps (gift_id, email_sha256);
create index if not exists gift_keeps_email_idx on public.gift_keeps (email_sha256);
create index if not exists gift_keeps_pending_idx on public.gift_keeps (created_at) where confirmed_at is null;

create table if not exists public.keep_reminders (
  id uuid primary key default gen_random_uuid(),
  keep_id uuid not null references public.gift_keeps (id) on delete cascade,
  name text not null check (char_length(name) <= 60),
  occasion text not null check (occasion in ('birthday', 'anniversary', 'valentines', 'other')),
  month smallint not null check (month between 1 and 12),
  day smallint not null check (day between 1 and 31),
  last_sent_year smallint,
  created_at timestamptz not null default now(),
  constraint keep_reminders_real_day check (day <= case when month = 2 then 29 when month in (4, 6, 9, 11) then 30 else 31 end)
);
create unique index if not exists keep_reminders_once_idx on public.keep_reminders (keep_id, occasion, month, day);
create index if not exists keep_reminders_date_idx on public.keep_reminders (month, day);

alter table public.gift_keeps enable row level security;
alter table public.keep_reminders enable row level security;
revoke all on public.gift_keeps, public.keep_reminders from anon, authenticated;

alter table public.reactions add column if not exists share_consent boolean not null default false;
alter table public.reactions add column if not exists share_consent_at timestamptz;
alter table public.reactions add column if not exists sender_withheld_at timestamptz;
alter table public.reactions add column if not exists approved_at timestamptz;
alter table public.reactions add column if not exists locale text check (locale in ('en', 'es'));
create index if not exists reactions_shown_idx on public.reactions (approved_at desc)
  where share_consent and approved_at is not null and sender_withheld_at is null;

create or replace function public.proof_numbers()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'opened', (select count(distinct v.gift_id) from public.gift_views v),
    'opens', (select count(*) from public.gift_views v)
  )
$$;
revoke all on function public.proof_numbers() from public, anon, authenticated;
grant execute on function public.proof_numbers() to service_role;
