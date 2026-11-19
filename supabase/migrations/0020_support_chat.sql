-- The help chat on tryethos.io (docs/superpowers/specs/2026-11-19-support-chat-design.md): what was
-- asked and answered, kept 30 days so wrong answers can be found and the guide fixed, and the
-- counters that keep it cheap (per-visitor limits and the daily spending cap).
-- Additive: two new tables and two functions; nothing the live site reads is changed. The chat
-- route treats a database without these as "no chat yet" and shows the support address instead.
--
-- support_chats: one row per conversation, written by POST /api/support/chat.
--   api_messages   the conversation exactly as sent to and received from the model (replayed
--                  unchanged on the next message, so earlier turns can't be forged by a browser).
--   transcript     the same conversation as people read it: [{ "role": "visitor" | "bot", "text",
--                  "at" }]. What a visitor typed is kept as typed; nothing else names them.
--   page           the page's section, as in checkout_sources.landing ("/pricing", "/g"), never a
--                  query string.
--   handoff_email  only when the visitor asked for the team to reply, and gave this address.
-- No IP address, account or browser id is stored with a chat.
--
-- support_counters: windowed counters, keyed by what they count: a visitor's messages ("v:<hash of
-- the IP and a server secret>:10m"), the day's spend in millionths of a dollar ("spend:2026-11-19").
--
-- support_count(key, add, window): adds `add` to the counter in its current window (a window that
-- has passed starts again at 0) and returns the new total; add 0 to read it. One statement, so two
-- requests at once can't both slip under a limit.
--
-- forget_support_chats(days): deletes chats untouched for `days` days and counters whose window
-- ended over a day ago; the daily job calls it (src/app/api/cron/unlock).
--
-- All of it is the server's alone: no policies, and nothing for anon or authenticated.
--
-- Safe to run again.

set local lock_timeout = '5s';

create table if not exists public.support_chats (
  id                 uuid primary key,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  locale             text not null check (locale in ('en', 'es')),
  currency           text not null check (currency in ('eur', 'usd', 'gbp')),
  page               text check (page ~ '^(/[a-z0-9_/-]{0,119}|\(other\))$'),
  model              text not null check (model ~ '^[a-z0-9.-]{1,60}$'),
  api_messages       jsonb not null default '[]'::jsonb,
  transcript         jsonb not null default '[]'::jsonb,
  visitor_turns      int not null default 0 check (visitor_turns between 0 and 100),
  input_tokens       bigint not null default 0,
  output_tokens      bigint not null default 0,
  cache_read_tokens  bigint not null default 0,
  cache_write_tokens bigint not null default 0,
  cost_micros        bigint not null default 0,
  handoff_at         timestamptz,
  handoff_email      text check (handoff_email is null or (char_length(handoff_email) <= 254 and handoff_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'))
);
create index if not exists support_chats_updated_idx on public.support_chats (updated_at);
create index if not exists support_chats_handoff_idx on public.support_chats (handoff_at) where handoff_at is not null;

alter table public.support_chats enable row level security;
revoke all on public.support_chats from anon, authenticated;

create table if not exists public.support_counters (
  key          text primary key check (char_length(key) <= 120),
  window_start timestamptz not null default now(),
  window_secs  int not null check (window_secs between 1 and 172800),
  total        bigint not null default 0
);

alter table public.support_counters enable row level security;
revoke all on public.support_counters from anon, authenticated;

create or replace function public.support_count(p_key text, p_add bigint, p_window_seconds int)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_total bigint;
begin
  insert into public.support_counters as c (key, window_start, window_secs, total)
  values (p_key, now(), p_window_seconds, greatest(p_add, 0))
  on conflict (key) do update
    set total = case
          when c.window_start <= now() - make_interval(secs => c.window_secs) then greatest(p_add, 0)
          else c.total + greatest(p_add, 0)
        end,
        window_start = case
          when c.window_start <= now() - make_interval(secs => c.window_secs) then now()
          else c.window_start
        end,
        window_secs = p_window_seconds
  returning total into v_total;
  return v_total;
end $$;

revoke all on function public.support_count(text, bigint, int) from public, anon, authenticated;
grant execute on function public.support_count(text, bigint, int) to service_role;

create or replace function public.forget_support_chats(p_days int default 30)
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with gone as (
    delete from public.support_chats
    where updated_at < now() - make_interval(days => greatest(1, p_days))
    returning 1
  )
  select count(*) into v_count from gone;
  delete from public.support_counters
  where window_start < now() - make_interval(secs => window_secs) - interval '1 day';
  return v_count;
end $$;

revoke all on function public.forget_support_chats(int) from public, anon, authenticated;
grant execute on function public.forget_support_chats(int) to service_role;
