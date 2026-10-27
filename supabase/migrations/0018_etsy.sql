-- Gifts bought on Etsy, recorded as ordinary purchases, the way 0013 records the App Store's. The
-- buyer pays on Etsy, makes the gift on our site, and types the Etsy order number when sending it;
-- the server reads that order from Etsy and hands over the template only when Etsy says it is paid
-- (src/lib/etsy). Additive, like 0009 and 0013: the live site reads none of it.
--
-- purchases.store         gains 'etsy'.
-- store_product_id        the Etsy listing id.
-- store_transaction_id    "<receipt id>/<transaction id>/<unit>": one row per item bought, so an
--                         order of one can be used once and an order of two, twice. The unique index
--                         from 0013 (store, store_transaction_id) is what makes using it again
--                         impossible.
-- store_environment       'production'.
--
-- etsy_connection: the shop's Etsy sign-in (OAuth), one row. Etsy hands out a new refresh token each
-- time the access token is renewed, so it can't live in an environment variable. Only the service
-- role reads it: row level security is on and there are no policies.
--
-- Safe to run again.

set local lock_timeout = '5s';

alter table public.purchases drop constraint if exists purchases_store_check;
alter table public.purchases add constraint purchases_store_check check (store in ('stripe', 'app_store', 'etsy'));

create table if not exists public.etsy_connection (
  id smallint primary key default 1 check (id = 1),
  shop_id bigint not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.etsy_connection enable row level security;
revoke all on public.etsy_connection from anon, authenticated;
