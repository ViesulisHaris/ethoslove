-- The iPhone app's In-App Purchases, recorded as ordinary purchases. Apple sells, RevenueCat checks
-- the receipt and tells us (POST /api/revenuecat/webhook, or the app's POST /api/app/purchases/sync),
-- and the purchase lands as the same `purchases` row and the same unlock rows a Stripe checkout of
-- the same product writes (src/lib/commerce/app-store.ts). Additive and nullable, like 0009: the
-- live site reads none of it, and a Stripe purchase leaves all four columns null.
--
-- store                 'stripe' | 'app_store'; null for every purchase made before this (Stripe).
-- store_product_id      the App Store product id (xyz.secuora.ethos.template, …).
-- store_transaction_id  Apple's transaction id: what makes recording one purchase twice impossible.
-- store_environment     'production' | 'sandbox'. Sandbox purchases grant too (App Review buys in the
--                       sandbox); this keeps them out of the accounts.
--
-- The unique index is deliberately not partial ("where store_transaction_id is not null"): INSERT …
-- ON CONFLICT (store, store_transaction_id), which is how the code records a purchase once, can only
-- use a partial index when the statement repeats its predicate, and PostgREST's on_conflict can't.
-- Nulls are distinct in a unique index, so every Stripe row (null transaction id) stays allowed.
--
-- Safe to run again.

set local lock_timeout = '5s';

alter table public.purchases add column if not exists store text check (store in ('stripe', 'app_store'));
alter table public.purchases add column if not exists store_product_id text;
alter table public.purchases add column if not exists store_transaction_id text;
alter table public.purchases add column if not exists store_environment text check (store_environment in ('production', 'sandbox'));

create unique index if not exists purchases_store_tx_idx on public.purchases (store, store_transaction_id);
