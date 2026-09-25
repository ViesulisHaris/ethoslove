-- Ethos for Two as a membership: a one-time year (the pass, 0009), a Stripe subscription or an App
-- Store subscription, all rows of one table. couple_passes IS the membership table from here on: a
-- membership is a pass whose end moves. Access stays `starts_at <= now < ends_at`, so everything
-- 0009 built on it (the lent "*" / "pack:*" unlock rows, the invite and the partner, the owner-or-
-- partner read policy, the cron's sweep, the triggers that take the partner's rows when a pass goes)
-- works for subscriptions unchanged. The name stays: renaming isn't additive. docs/MEMBERSHIP.md 1.
--
-- A subscription is ONE row for its whole life: renewals move current_period_end and ends_at, they
-- never add rows. Its ends_at is "when access ends if nothing else happens": the period end plus a
-- week's grace while it renews (a late renewal, a card being retried), the period end once it is
-- cancelling, and the moment it ended once it has. Passes keep one row per year bought.
--
-- couple_passes, new columns:
-- provider                       'stripe_pass' (every existing row: the one-time year), 'app_store_pass'
--                                (the App Store's non-renewing year, told apart by its purchase below),
--                                'stripe_subscription', 'app_store' (auto-renewable).
-- plan                           'monthly' | 'yearly'; a pass is 'yearly'.
-- status                         'incomplete' (a first payment still being confirmed), 'active',
--                                'past_due' (a renewal being retried, still running in its grace),
--                                'ended'. What grants access is still starts_at/ends_at.
-- stripe_customer_id             the Stripe customer Ethos made for the owner (never one it didn't).
-- stripe_subscription_id         sub_…; unique, so fulfilment and the webhook can't make two rows.
-- store_original_transaction_id  Apple's original transaction id of an App Store subscription; unique.
-- current_period_end             what has been paid for; null for a pass (its ends_at is that).
-- cancel_at_period_end           renewal switched off: it runs to current_period_end, then ends.
-- pending_plan                   'monthly' while a yearly → monthly switch waits for the renewal.
-- provider_event_at              when the row last took its state from Stripe or Apple, so an older
--                                App Store event arriving late can't undo a newer one.
-- renewal_reminded_for           the period end the yearly renewal reminder went out for (a claim).
-- payment_failed_invoice         the last invoice the "payment failed" email was sent for (a claim).
-- ended_notified_at              when the "has ended" email went (a claim); set without sending after
--                                a refund, a dispute or a withdrawal.
--
-- The partner can read the owner's row (0009's policy), now including these opaque Stripe and Apple
-- ids: useless without our secret keys, and no route takes them from a client. No amounts, card data
-- or emails are on the row.
--
-- purchases: every paid invoice of a subscription is a row (the first is the checkout's own purchase),
-- keyed by stripe_invoice_id (unique), and membership_id says which membership it paid for. product
-- and kind take the new value 'membership'. Both columns are nullable: the live site's inserts, which
-- know nothing of them, keep working.
--
-- Safe to run again.

set local lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- couple_passes: the membership table
-- ---------------------------------------------------------------------------
alter table public.couple_passes add column if not exists provider text not null default 'stripe_pass'
  check (provider in ('stripe_pass', 'stripe_subscription', 'app_store', 'app_store_pass'));
alter table public.couple_passes add column if not exists plan text not null default 'yearly'
  check (plan in ('monthly', 'yearly'));
alter table public.couple_passes add column if not exists status text not null default 'active'
  check (status in ('incomplete', 'active', 'past_due', 'ended'));
alter table public.couple_passes add column if not exists stripe_customer_id text;
alter table public.couple_passes add column if not exists stripe_subscription_id text;
alter table public.couple_passes add column if not exists store_original_transaction_id text;
alter table public.couple_passes add column if not exists current_period_end timestamptz;
alter table public.couple_passes add column if not exists cancel_at_period_end boolean not null default false;
alter table public.couple_passes add column if not exists pending_plan text check (pending_plan in ('monthly', 'yearly'));
alter table public.couple_passes add column if not exists provider_event_at timestamptz;
alter table public.couple_passes add column if not exists renewal_reminded_for timestamptz;
alter table public.couple_passes add column if not exists payment_failed_invoice text;
alter table public.couple_passes add column if not exists ended_notified_at timestamptz;

-- Not partial: PostgREST's on_conflict can only target a whole unique index (0013's note). Nulls are
-- distinct, so every pass (no subscription, no Apple id) stays allowed.
create unique index if not exists couple_passes_subscription_idx on public.couple_passes (stripe_subscription_id);
create unique index if not exists couple_passes_store_original_idx on public.couple_passes (store_original_transaction_id);
-- Checkout reuses the owner's own Ethos customer; the cron finds subscriptions whose period has passed.
create index if not exists couple_passes_customer_idx on public.couple_passes (owner_user_id, stripe_customer_id) where stripe_customer_id is not null;
create index if not exists couple_passes_period_idx on public.couple_passes (current_period_end) where current_period_end is not null;

-- Every existing row is a pass; the App Store's non-renewing year is told apart by its purchase.
update public.couple_passes cp set provider = 'app_store_pass'
  from public.purchases p
  where p.id = cp.purchase_id and p.store = 'app_store' and cp.provider = 'stripe_pass';

-- ---------------------------------------------------------------------------
-- purchases: one row per paid invoice, linked to its membership
-- ---------------------------------------------------------------------------
alter table public.purchases add column if not exists stripe_invoice_id text;
alter table public.purchases add column if not exists membership_id uuid references public.couple_passes (id) on delete set null;
-- One row per invoice however many times invoice.paid arrives. Not partial, for the same reason.
create unique index if not exists purchases_invoice_idx on public.purchases (stripe_invoice_id);
create index if not exists purchases_membership_idx on public.purchases (membership_id) where membership_id is not null;

-- A membership's lent rows point at its first purchase, as a pass's do (0009): the same trigger
-- function takes them (the partner's included) when that purchase is deleted by hand, before
-- template_unlocks.purchase_id would be set to null and leave them for good.
create or replace trigger purchases_membership_deleted
  before delete on public.purchases
  for each row when (old.product = 'membership')
  execute function public.pass_purchase_deleted();

-- No policy changes: 0009's "owner or partner read" and its grants cover the new columns, and every
-- write still goes through the server.
