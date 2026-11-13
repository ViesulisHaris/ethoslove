-- Where each checkout's buyer first came from, so revenue can be split by landing page and by
-- channel (docs/marketing/REVENUE-BY-SOURCE.md) and the SEO work can follow the pages that sell.
-- Additive: one new table and one function; nothing the live site reads is changed. The site writes
-- here only after checkout has answered the buyer, so a database without this table loses the
-- record, never a checkout.
--
-- checkout_sources: one row per checkout started (POST /api/stripe/checkout), keyed by its purchase
-- id, which is purchases.id once paid. A guest's purchase row is only written at fulfilment, under
-- the same id, hence no foreign key. What the browser said, checked again by the server
-- (src/lib/attribution/source.ts):
--   landing        the first page of the visit, its path only (no query string, no "#"), each part a
--                  plain slug; a private page (a gift, checkout, the dashboard, sign-in, a shared plan
--                  or trip) by its section alone ("/g"); "(other)" for anything else.
--   referrer       the referring site's host name only ("google.com"), or an Android app's id.
--   utm_source / utm_medium / utm_campaign
--                  the landing link's tags, in lower case; anything shaped like an id is refused.
--   click          which platform's click id the link carried: the platform's name, never the id.
--   ref            the ?ref= link, the same one checkout already sends Stripe (purchases.ref).
--   channel        search | tiktok_brand | direct | other, worked out by the site when written.
--   source         a short name for where from: google, tiktok, instagram, chatgpt, a ref, a host.
--   remembered     true when the buyer allowed cookies, so their first visit of the last 30 days was
--                  kept in their browser (ethos-first-visit); false: the visit they paid in.
--   first_seen_at  when that first page was opened, by the browser's clock.
-- Nothing names a person, a gift or a browser.
--
-- forget_unpaid_checkout_sources(): deletes the rows of checkouts never paid once they are 30 days
-- old; the daily job calls it (src/app/api/cron/unlock). A paid one stays with its purchase.
--
-- Both are the server's alone: no policies, and nothing for anon or authenticated.
--
-- Safe to run again.

set local lock_timeout = '5s';

create table if not exists public.checkout_sources (
  purchase_id   uuid primary key,
  created_at    timestamptz not null default now(),
  landing       text check (landing ~ '^(/[a-z0-9_/-]{0,119}|\(other\))$'),
  referrer      text check (referrer ~ '^[a-z0-9.-]{1,100}$'),
  utm_source    text check (utm_source ~ '^[a-z0-9._-]{1,60}$'),
  utm_medium    text check (utm_medium ~ '^[a-z0-9._-]{1,60}$'),
  utm_campaign  text check (utm_campaign ~ '^[a-z0-9._-]{1,60}$'),
  click         text check (click in ('meta', 'tiktok', 'google', 'microsoft', 'pinterest')),
  ref           text check (ref ~ '^[a-z0-9-]{1,40}$'),
  channel       text not null check (channel in ('search', 'tiktok_brand', 'direct', 'other')),
  source        text not null check (source ~ '^[a-z0-9._()-]{1,100}$'),
  remembered    boolean not null default false,
  first_seen_at timestamptz
);
create index if not exists checkout_sources_created_idx on public.checkout_sources (created_at);

alter table public.checkout_sources enable row level security;
revoke all on public.checkout_sources from anon, authenticated;

create or replace function public.forget_unpaid_checkout_sources(p_days int default 30)
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  with gone as (
    delete from public.checkout_sources s
    where s.created_at < now() - make_interval(days => greatest(1, p_days))
      and not exists (select 1 from public.purchases p where p.id = s.purchase_id and p.status in ('paid', 'refunded'))
    returning 1
  )
  select count(*) into v_count from gone;
  return v_count;
end $$;

revoke all on function public.forget_unpaid_checkout_sources(int) from public, anon, authenticated;
grant execute on function public.forget_unpaid_checkout_sources(int) to service_role;
