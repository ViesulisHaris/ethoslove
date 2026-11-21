-- Group cards: a gift other people add a note and a photo to before it is sent (src/lib/group).
-- Additive: two new tables, one storage bucket, two functions and a trigger; nothing the live site
-- reads is changed. Until it exists, the group routes answer "unavailable" and nothing else breaks;
-- the routes and the editor's panel are off anyway until GROUP_GIFTS_ENABLED is "true".
--
-- gift_groups: one per gift whose organiser asked for a link to invite people (POST /api/group).
--   gift_id        the organiser's draft; deleting the gift, or the account, deletes the group.
--   token_sha256   SHA-256 of the link's token. The token itself is never stored: the server makes
--                  it again from the group's id, token_version and its own secret, so this table
--                  alone opens no link. Resetting the link raises token_version.
--   from_name, for_name, prompt   what the page at the link says: who is asking, who it is for,
--                  and one line on what to write. Typed by the organiser for that page.
--   max_entries, note_max, takes_photos   the template's own limits, copied when the group is made.
--   closes_at      the link stops taking notes (30 days, which the organiser can extend);
--   closed_at      the organiser closed it; sent_at  the gift was published: no more notes.
--   report_ref     what a report about the page quotes: random, opens nothing.
--
-- gift_contributions: what one person added at the link, for the organiser to approve or remove.
--   status         pending, approved (item_key is then what the gift's own data calls it), rejected
--                  or removed (by the organiser), withdrawn (by whoever wrote it).
--   with_photo     whether the organiser added it with its photo, so a note put back into a gift
--                  that lost it comes back the way they chose.
--   photo_path     the file in the contributions bucket, "<group id>/<contribution id>.webp".
--   email          only if they asked to be sent the finished gift, with the sentence they agreed
--                  to (email_consent) and when; nothing is sent until the address has said yes
--                  (email_confirmed_at). It is deleted the moment that one email has gone.
--   agreed         the notice they accepted, word for word: 16 or over, and what happens to it.
--   withdraw_sha256  SHA-256 of the secret their browser keeps to take the note back. The secret
--                  alone finds the note, so it can be taken back after the link has been reset.
--   scrubbed_at    a note the organiser turned down, or its writer took back, loses its words,
--                  photo and address after a day; the row stays so the group's limits still count it.
-- The daily job deletes every contribution of a gift within 7 days of it being sent, and of a gift
-- never sent 14 days after the date its link was due to close (closes_at). What was approved lives
-- on in the gift itself.
--
-- gift_contributions_cap: at most max_entries waiting or approved, and 60 in all, per group. It
-- locks the group's row first, so two notes arriving together can't both take the last place.
--
-- group_photo_orphans(): files in the contributions bucket that no contribution points at and that
-- are over a day old (a group deleted with its gift), for the daily job to remove.
--
-- All of it is the server's alone: no policies, and nothing for anon or authenticated.
--
-- Safe to run again.

set local lock_timeout = '5s';

create table if not exists public.gift_groups (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid not null references public.gifts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  template_slug text not null check (template_slug ~ '^[a-z0-9-]{1,80}$'),
  locale text not null default 'en' check (locale in ('en', 'es')),
  from_name text not null check (char_length(from_name) between 1 and 40),
  for_name text not null check (char_length(for_name) between 1 and 40),
  prompt text check (char_length(prompt) <= 140),
  token_sha256 text not null check (token_sha256 ~ '^[0-9a-f]{64}$'),
  token_version smallint not null default 1 check (token_version between 1 and 999),
  report_ref text not null check (report_ref ~ '^[a-z0-9]{8}$'),
  max_entries smallint not null default 25 check (max_entries between 1 and 25),
  note_max smallint not null default 140 check (note_max between 20 and 280),
  takes_photos boolean not null default true,
  created_at timestamptz not null default now(),
  closes_at timestamptz not null default (now() + interval '30 days'),
  closed_at timestamptz,
  sent_at timestamptz,
  -- When the organiser was last told that notes are waiting: at most one such email a day.
  nudged_at timestamptz
);
-- One group per gift.
create unique index if not exists gift_groups_gift_idx on public.gift_groups (gift_id);
-- What the page at the link looks up.
create unique index if not exists gift_groups_token_idx on public.gift_groups (token_sha256);
-- Deleting an account, and its export.
create index if not exists gift_groups_user_idx on public.gift_groups (user_id);
-- What the daily job goes through.
create index if not exists gift_groups_sent_idx on public.gift_groups (sent_at) where sent_at is not null;
create index if not exists gift_groups_open_idx on public.gift_groups (closes_at) where sent_at is null;

create table if not exists public.gift_contributions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.gift_groups (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'removed', 'withdrawn')),
  name text check (char_length(name) between 1 and 24),
  note text check (char_length(note) between 1 and 280),
  photo_path text check (photo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'),
  photo_width smallint check (photo_width between 1 and 1600),
  photo_height smallint check (photo_height between 1 and 1600),
  item_key text check (item_key ~ '^[a-z0-9]{10}$'),
  with_photo boolean,
  email text check (char_length(email) between 3 and 254),
  email_sha256 text check (email_sha256 ~ '^[0-9a-f]{64}$'),
  email_consent text check (char_length(email_consent) between 1 and 600),
  email_consent_at timestamptz,
  confirm_sent_at timestamptz,
  email_confirmed_at timestamptz,
  emailed_at timestamptz,
  agreed text not null check (char_length(agreed) between 1 and 1000),
  withdraw_sha256 text check (withdraw_sha256 ~ '^[0-9a-f]{64}$'),
  report_ref text not null check (report_ref ~ '^[a-z0-9]{8}$'),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  scrubbed_at timestamptz,
  constraint gift_contributions_has_words check (scrubbed_at is not null or (name is not null and note is not null))
);
-- The organiser's list, oldest first; and the limits' counts.
create index if not exists gift_contributions_group_idx on public.gift_contributions (group_id, created_at);
-- One key per gift.
create unique index if not exists gift_contributions_key_idx on public.gift_contributions (group_id, item_key) where item_key is not null;
-- "Take my note back": the note is found by its secret's hash alone.
create index if not exists gift_contributions_withdraw_idx on public.gift_contributions (withdraw_sha256) where withdraw_sha256 is not null;
-- What the daily job scrubs.
create index if not exists gift_contributions_decided_idx on public.gift_contributions (decided_at) where scrubbed_at is null and status in ('rejected', 'removed', 'withdrawn');

alter table public.gift_groups enable row level security;
alter table public.gift_contributions enable row level security;
revoke all on public.gift_groups, public.gift_contributions from anon, authenticated;

create or replace function public.gift_contributions_cap()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_max smallint;
begin
  select max_entries into v_max from public.gift_groups where id = new.group_id for update;
  if (select count(*) from public.gift_contributions where group_id = new.group_id and status in ('pending', 'approved')) >= v_max
     or (select count(*) from public.gift_contributions where group_id = new.group_id) >= 60 then
    raise exception 'group is full' using errcode = '23514';
  end if;
  return new;
end $$;

-- Only the trigger runs it; keep it off the API.
revoke all on function public.gift_contributions_cap() from public, anon, authenticated;

create or replace trigger gift_contributions_cap
  before insert on public.gift_contributions
  for each row
  execute function public.gift_contributions_cap();

create or replace function public.group_photo_orphans(p_limit int default 500)
returns table (name text) language sql stable security definer set search_path = public, storage as $$
  select o.name
  from storage.objects o
  where o.bucket_id = 'contributions'
    and o.created_at < now() - interval '24 hours'
    and not exists (select 1 from public.gift_contributions c where c.photo_path = o.name)
  order by o.created_at
  limit greatest(1, least(p_limit, 2000));
$$;
revoke all on function public.group_photo_orphans(int) from public, anon, authenticated;
grant execute on function public.group_photo_orphans(int) to service_role;

-- Photos waiting for an organiser's yes. Private, written and read by the server only (no storage
-- policies): the server re-encodes every photo to WebP before it is stored.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contributions', 'contributions', false, 2097152, array['image/webp'])
on conflict (id) do nothing;
