-- Commerce for the new prices: the yearly pass for two ("Ethos for Two"), gift cards, creator codes,
-- and, on each purchase, what kind of sale it was and who brought it. Additive only: the live site
-- reads purchases and template_unlocks, so nothing it reads is renamed, retyped or dropped, and every
-- new purchases column is nullable.
--
-- couple_passes: one row per pass PURCHASE, each a year long. Renewing adds a row that starts where
-- the running one ends, so a refund takes back exactly the year it paid for and fulfilment can never
-- add the same year twice (one row per purchase_id). The unlock rows a pass grants ("*" and "pack:*",
-- to the owner and the partner who joined) point at the purchase of the row that is running; the
-- daily cron (/api/cron/passes) removes them when it ends.
--
-- gift_cards: "Give Everything" codes. Redeemed through the server with the service role only; the
-- redeemer's "*" unlock points at the card's purchase, so refunding the card takes it back.
--
-- creators: the creator programme's codes. Read and written by the service role only.
--
-- Safe to run again.

set local lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- purchases: what was sold and who brought it
-- ---------------------------------------------------------------------------
alter table public.purchases add column if not exists creator_code text;
alter table public.purchases add column if not exists ref text;
alter table public.purchases add column if not exists discount_amount integer;
-- 'single' | 'pick3' | 'everything' | 'extras' | 'pass' | 'pack' | 'giftcard' | 'upgrade' | 'bump'
-- ('bump' = a single or extras purchase with every other template added at checkout).
alter table public.purchases add column if not exists kind text;

create index if not exists purchases_creator_idx on public.purchases (creator_code, created_at) where creator_code is not null;
-- Refunds and disputes find their purchase by payment intent.
create index if not exists purchases_payment_intent_idx on public.purchases (stripe_payment_intent_id) where stripe_payment_intent_id is not null;
-- Revoking a purchase deletes the unlocks that point at it.
create index if not exists template_unlocks_purchase_idx on public.template_unlocks (purchase_id) where purchase_id is not null;

-- ---------------------------------------------------------------------------
-- couple_passes
-- ---------------------------------------------------------------------------
create table if not exists public.couple_passes (
  id                  uuid primary key default gen_random_uuid(),
  purchase_id         uuid not null references public.purchases (id) on delete cascade,
  owner_user_id       uuid not null references public.profiles (id) on delete cascade,
  partner_user_id     uuid references public.profiles (id) on delete set null,
  invite_code         text not null unique,
  starts_at           timestamptz not null default now(),
  ends_at             timestamptz not null,
  renewal_reminded_at timestamptz,
  created_at          timestamptz not null default now(),
  -- A refunded year that hadn't started yet is closed to zero length rather than deleted.
  check (ends_at >= starts_at)
);

create unique index if not exists couple_passes_purchase_idx on public.couple_passes (purchase_id);
create index if not exists couple_passes_owner_idx on public.couple_passes (owner_user_id, ends_at desc);
create index if not exists couple_passes_partner_idx on public.couple_passes (partner_user_id, ends_at desc) where partner_user_id is not null;
create index if not exists couple_passes_ends_idx on public.couple_passes (ends_at);

-- A pass's unlock rows are lent, not owned: the partner's "*" and "pack:*" must never outlive the pass
-- they came from, or they would become Everything and every pack for good with nothing left for the
-- cron to find. The terms say the pass ends for both. Two ways a pass can disappear, one trigger each:
--
-- 1. Its couple_passes row is deleted. This is what happens when the buyer deletes their account:
--    owner_user_id cascades, while (from 0011 on) the purchase itself stays for the accounts and only
--    loses its user_id. The partner's rows point at that purchase and are taken with the pass row.
-- 2. Its purchase row is deleted (by hand, or by an account deletion before 0011 is applied).
--    template_unlocks.purchase_id would only be set to null; BEFORE runs ahead of that set-null.
--
-- Other products keep the old behaviour: a redeemed gift card's "*" stays with whoever redeemed it.
create or replace function public.pass_row_deleted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.template_unlocks
  where purchase_id = old.purchase_id and template_slug in ('*', 'pack:*');
  return old;
end $$;

-- Only the trigger runs it; keep it off the API.
revoke all on function public.pass_row_deleted() from public, anon, authenticated;

create or replace function public.pass_purchase_deleted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.template_unlocks where purchase_id = old.id;
  return old;
end $$;

-- Only the trigger runs it; keep it off the API.
revoke all on function public.pass_purchase_deleted() from public, anon, authenticated;

create or replace trigger purchases_pass_deleted
  before delete on public.purchases
  for each row when (old.product = 'pass')
  execute function public.pass_purchase_deleted();

create or replace trigger couple_passes_deleted
  after delete on public.couple_passes
  for each row
  execute function public.pass_row_deleted();

alter table public.couple_passes enable row level security;

drop policy if exists "couple_passes: owner or partner read" on public.couple_passes;
create policy "couple_passes: owner or partner read" on public.couple_passes
  for select to authenticated
  using ((select auth.uid()) = owner_user_id or (select auth.uid()) = partner_user_id);

-- Every write goes through the server (fulfilment, the join endpoint, the cron).
revoke all on public.couple_passes from anon;
revoke insert, update, delete on public.couple_passes from authenticated;
grant select on public.couple_passes to authenticated;

-- ---------------------------------------------------------------------------
-- gift_cards
-- ---------------------------------------------------------------------------
create table if not exists public.gift_cards (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  purchase_id    uuid references public.purchases (id) on delete set null,
  buyer_user_id  uuid references public.profiles (id) on delete set null,
  recipient_name text check (char_length(recipient_name) <= 60),
  note           text check (char_length(note) <= 300),
  redeemed_by    uuid references public.profiles (id) on delete set null,
  redeemed_at    timestamptz,
  expires_at     timestamptz,
  created_at     timestamptz not null default now()
);

-- One card per purchase, so fulfilling the same checkout twice can't mint a second code.
create unique index if not exists gift_cards_purchase_idx on public.gift_cards (purchase_id);
create index if not exists gift_cards_buyer_idx on public.gift_cards (buyer_user_id) where buyer_user_id is not null;
-- Deleting an account sets redeemed_by to null on its cards: without this that is a scan of every card.
create index if not exists gift_cards_redeemed_idx on public.gift_cards (redeemed_by) where redeemed_by is not null;

alter table public.gift_cards enable row level security;

-- The buyer can see the cards they bought. Nobody else reads this table except the server: a code
-- is redeemed through /api/gift-cards/redeem, never looked up from the browser.
drop policy if exists "gift_cards: buyer read" on public.gift_cards;
create policy "gift_cards: buyer read" on public.gift_cards
  for select to authenticated
  using ((select auth.uid()) = buyer_user_id);

revoke all on public.gift_cards from anon;
revoke insert, update, delete on public.gift_cards from authenticated;
grant select on public.gift_cards to authenticated;

-- ---------------------------------------------------------------------------
-- creators
-- ---------------------------------------------------------------------------
create table if not exists public.creators (
  code           text primary key check (code ~ '^[A-Z0-9]{3,20}$'),
  name           text not null,
  contact        text,
  -- Rows are typed by hand (scripts/add-creator.mjs): a slip must not become a 300% commission.
  commission_pct smallint not null default 30 check (commission_pct between 0 and 100),
  discount_pct   smallint not null default 10 check (discount_pct between 0 and 90),
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

alter table public.creators enable row level security;
-- No policies on purpose: only the service role reads or writes it (checkout, the payout report).
revoke all on public.creators from anon, authenticated;
