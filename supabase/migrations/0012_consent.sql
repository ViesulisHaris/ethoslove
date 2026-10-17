-- The EU withdrawal tickbox, and two small tables so Stripe metadata never carries a gift id, a
-- person's name or a note. Additive and backward compatible: the live site reads none of it.
--
-- 1. purchases.terms_consent / terms_consent_at. Checkout asks every buyer to tick that they want the
--    purchase unlocked straight away and lose the 14-day right to cancel (Stripe's terms-of-service
--    consent). Fulfilment stores the exact sentence they ticked and when, the record that the
--    consent was given (Consumer Rights Directive art. 16(m)). Null for anything bought before the
--    tickbox, or when Stripe could not show it (checkout then falls back to the notice above the
--    pay button): those purchases keep the right to cancel.
--
-- 2. free_replies. Someone who received a paid premium gift may send one back in the same template
--    for free, with the footer on. The link carries a signed token naming the gift answered; this
--    table is what makes one gift answerable for free once. One row per answered gift (the primary
--    key), naming the reply that used it. The answered gift has no foreign key: the reply keeps its
--    free status if the gift it answered is deleted later. Deleting the reply keeps the row (its
--    reply_gift_id goes null), so the gift stays answered: one token is one free reply, ever, not
--    one at a time. Written by the server only.
--
-- 3. gift_card_details. A gift card's recipient name and note, between checkout and fulfilment, so
--    they never go to Stripe (the account is shared). A guest has no purchase row yet, so this is
--    keyed by the purchase id checkout made, without a foreign key. Fulfilment copies it onto the
--    card and deletes it; the daily pass job deletes what an abandoned checkout left behind once its
--    recovery link (30 days) has run out. Written and read by the server only.
--
-- Safe to run again.

set local lock_timeout = '5s';

-- 1 ---------------------------------------------------------------------------------------------

alter table public.purchases add column if not exists terms_consent text;
alter table public.purchases add column if not exists terms_consent_at timestamptz;

-- 2 ---------------------------------------------------------------------------------------------

create table if not exists public.free_replies (
  original_gift_id uuid primary key,
  reply_gift_id    uuid unique references public.gifts (id) on delete set null,
  created_at       timestamptz not null default now()
);

alter table public.free_replies enable row level security;
-- No policies on purpose: only the service role reads or writes it (publishing, editing a live gift).
revoke all on public.free_replies from anon, authenticated;

-- 3 ---------------------------------------------------------------------------------------------

create table if not exists public.gift_card_details (
  purchase_id    uuid primary key,
  recipient_name text check (char_length(recipient_name) <= 60),
  note           text check (char_length(note) <= 300),
  created_at     timestamptz not null default now()
);

-- What the daily clean-up looks for.
create index if not exists gift_card_details_created_idx on public.gift_card_details (created_at);

alter table public.gift_card_details enable row level security;
-- No policies on purpose: only the service role reads or writes it (checkout, fulfilment, the cron).
revoke all on public.gift_card_details from anon, authenticated;
