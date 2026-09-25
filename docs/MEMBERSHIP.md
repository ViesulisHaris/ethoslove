# Ethos for Two, as a membership

The spec three builders follow to turn "Ethos for Two" from a one-time €29 pass into an auto-renewing
membership (€4.99 a month or €29.99 a year, one payment for a couple), add saved dates and trips,
and redesign `/pricing` around it. Written 24 Sept 2026 from the code on `feat/membership` (483f175).
It is the contract between the builders: where it names a type, a route shape, a prop or a message
key, build exactly that; where it leaves something open, the builder who owns the file decides.

**Read first:** `docs/LAUNCH.md` (what shipped on 23 Sept), `docs/STRIPE.md`, and for the shared
account, secuora's webhook (`/Users/adrians/Documents/mail/verotradesvip/src/app/api/stripe/webhook/
route.ts`, `src/lib/affiliate/attribution.ts`, `src/lib/stripe/trial-guard.ts`, read-only).

## Contents

0. What changes, in one page
1. Data (couple_passes as the membership table, saved_dates, migrations 0014 and 0015)
2. Billing (the shared Stripe account, checkout, fulfilment, webhook, portal, cron, the switch, RevenueCat)
3. Saved dates and limits
4. UI (pricing, account, success, home, navigation)
5. Emails and legal
6. The work split, the contracts and the test plan
7. For the owner: switching it on
8. Not in this build

---

## 0. What changes, in one page

**Owner's decisions (final).** Ethos for Two is a real auto-renewing subscription: €4.99/month or
€29.99/year (USD $5.99/$34.99, GBP £4.49/£25.99 kept for later; only euros are charged, as today),
covering the buyer and one partner who joins with an invite link. Members get unlimited saved dates
and trips, shared with and editable by the partner; every gift template and game pack while it runs
(the pass's lent `"*"` and `"pack:*"` rows); a reminder before each saved date; a whole date opened
in Apple or Google Maps; an email a week before a yearly renewal. Cancelling keeps access to the end
of the paid period. Free accounts save up to 3 dates/trips. Planning and sharing one date with no
account stays free exactly as today (the local plan, the `#p=` link).

`STRIPE_SUBSCRIPTIONS_ENABLED === "true"` turns real subscriptions on. Off (the default until the
owner has checked section 7), Ethos for Two is sold as today's one-time pass, now **€29.99** for 365
days, and the monthly option is hidden. Both paths grant the same membership. The iPhone app sells
the same membership as App Store subscriptions through RevenueCat
(`xyz.secuora.ethos.fortwo.monthly`, `xyz.secuora.ethos.fortwo.yearly`).

**What stays exactly as it is:** the Dates map, `/plan` with no account, the `#p=` share link, every
one-time product and its checkout, refunds of one-time products, gift cards, creators, reminders
("Remind me next year"), the App Store's one-time products.

**Glossary.** *Membership*: one `couple_passes` row (a pass year, a Stripe subscription, or an App
Store subscription). *Owner*: who pays. *Partner*: the one other person who joined with the invite.
*Running*: `starts_at <= now < ends_at` (unchanged from the pass; it is what grants access).
*Period end*: what was paid for (`current_period_end`; for a pass, its `ends_at`). *Grace*: the days
a renewing membership keeps running past its period end while a renewal is collected (7).

---

## 1. Data

### 1.1 Why `couple_passes` is the membership table (no new table)

A membership is a pass whose end moves: everything the pass already does is what a subscription
needs, and none of it has to be written twice.

- **Access is already `starts_at <= now < ends_at`** on this table (`isRunning`, `summarisePass`,
  `regrantRunningPasses`, `sweepEndedPasses`, `joinPass`). A subscription row keeps `ends_at` equal
  to "when access ends if nothing else happens" (section 2.5), so all of that keeps working untouched.
- **Lent unlock rows** (`"*"`, `"pack:*"`) point at the row's `purchase_id`; `splitUnlocks`,
  `passPurchaseIds`, `grantForever`'s take-over and the two 0009 triggers (the partner's rows go
  when the owner's row or purchase is deleted) apply to memberships for free.
- **The invite, the partner, RLS (owner or partner may read), the data export and account deletion**
  are all already built on it.
- "Both paths grant the same membership" is then true by construction: the fallback pass and the
  subscription are rows of one table, told apart by `provider`.
- A second table would mean two sources of truth for "is this couple a member", every reader
  (entitlements, games, join, cron, saved-dates RLS) checking both, and a data migration of live rows.

The name stays `couple_passes` (the live site never reads it, but renaming is not additive).
Its header comment in 0014 says it is the membership table.

The cost, accepted: the partner can read the owner's row, now including opaque Stripe/Apple ids
(`cus_…`, `sub_…`, Apple's original transaction id). They are useless without our secret keys and
no route takes them from a client. No amounts, card data or emails are on the row.

### 1.2 `couple_passes`, per provider

| Column (new in 0014 unless noted) | `stripe_pass` (Stripe, one-time year) | `app_store_pass` (App Store non-renewing year) | `stripe_subscription` | `app_store` (auto-renewable) |
| --- | --- | --- | --- | --- |
| `purchase_id` (0009) | the pass purchase | the App Store purchase | the checkout's purchase (first invoice) | the first transaction's purchase |
| `provider` | `stripe_pass` (default; every existing row) | backfilled from `purchases.store` | set at fulfilment | set on the first event |
| `plan` | `yearly` | `yearly` | from the price's interval | from the product id |
| `status` | `active`; `ended` after a refund | same | `incomplete`, `active`, `past_due`, `ended` (2.5) | `active`, `past_due`, `ended` |
| `starts_at` (0009) | purchase, or the end of the year it renews | same | subscription start | first purchase |
| `ends_at` (0009) | start + 365 days | same | derived, see 2.5 | derived, see 2.11 |
| `current_period_end` | null (use `ends_at`) | null | Stripe's (item's) `current_period_end` | `expiration_at_ms` |
| `cancel_at_period_end` | false | false | `cancel_at_period_end` or `cancel_at` set | true after an unsubscribe |
| `stripe_customer_id` | null | null | the Ethos customer | null |
| `stripe_subscription_id` (unique) | null | null | `sub_…` | null |
| `store_original_transaction_id` (unique) | null | null | null | Apple's original transaction id |
| `pending_plan` | null | null | `monthly` while a yearly→monthly switch waits | null |
| `provider_event_at` | null | null | when the row last took Stripe's state | `event_timestamp_ms` of the last state event applied |
| `renewal_reminded_at` (0009) | the 14-day pass email | same | unused | unused |
| `renewal_reminded_for` | null | null | the period end the yearly reminder went out for | null |
| `payment_failed_invoice` | null | null | last invoice the "payment failed" email was sent for | null |
| `ended_notified_at` | null | null | when the "has ended" email went | same |
| `invite_code`, `partner_user_id` (0009) | as today | as today | as today, one row per subscription | as today |

One subscription is **one row for its whole life**: renewals move `current_period_end`/`ends_at`;
they never add rows. Passes keep one row per year bought (today's behaviour).

### 1.3 `purchases`

New nullable columns: `stripe_invoice_id text` (unique, one row per paid invoice) and
`membership_id uuid → couple_passes(id) on delete set null`. `product` and `kind` take the new
value `'membership'`. Every **paid invoice** of a subscription is a `purchases` row (for the
accounts and the account page): the first is the checkout's purchase (its `stripe_invoice_id` and
`stripe_payment_intent_id` are filled in at fulfilment, since a subscription session has no
payment intent of its own); each later one (renewal, the proration of a switch) is inserted by
`invoice.paid`. €0 invoices are not recorded. App Store renewals are rows too (one per
transaction id, as today's App Store purchases). `store` stays null for Stripe rows, as today.

### 1.4 Unlock rows: grant, extend, revoke

| Moment | Owner | Partner |
| --- | --- | --- |
| Row becomes running (paid checkout, `invoice.paid` revives it, App Store purchase/renewal) | `grantPassUnlocks(row)`: `"*"` and `"pack:*"` → `row.purchase_id`, `ignoreDuplicates` (an Everything owner keeps their own row) | same, if joined |
| Renewal | nothing to write: the rows already point at the row's `purchase_id`; only `ends_at` moves | same |
| Partner joins (`joinPass`) | — | granted from the running row |
| Partner leaves / is removed (new) | — | `partner_user_id = null` on the owner's running and ahead rows; delete the partner's rows whose `purchase_id` is one of those rows'; `regrantRunningPasses([partner])` |
| Ends (cancelled at period end, retries exhausted, App Store expiration, swept by the cron) | `revokeUnlocksOf(row.purchase_id)` then `regrantRunningPasses(affected)`; gifts stay live | same |
| Full refund of the latest paid period, a dispute, a withdrawal (2.6) | as "ends", then `relockGifts` for full refunds and disputes only (money back) | same |
| Owner deletes their account | row cascades; 0009's `couple_passes_deleted` trigger takes the partner's lent rows | automatic |
| A membership purchase row is deleted by hand | new trigger `purchases_membership_deleted` (same function as the pass one) | automatic |

`regrantRunningPasses` already hands rows back from any other running membership (a pass bought
ahead, a partner's own). Nothing here ever deletes a row a user bought outright.

### 1.5 `saved_dates`

One row per saved date or trip, owned by one account. Members share theirs with their partner
(read and edit), through RLS on reads and the service-role API on writes. Nothing is ever deleted
by us: only its owner (or deleting the account) removes a row.

| Column | Meaning |
| --- | --- |
| `id uuid pk` | |
| `owner_user_id uuid → profiles on delete cascade` | who saved it |
| `kind text` `'date' \| 'trip'` | |
| `title text` ≤ 80 | shown on the card; the client sends a default (the idea's title, the town, or "A date") |
| `city text` ≤ 80, null | date: `plan.where`; trip: the town it lands in |
| `day date`, null | date: `plan.date`; trip: `data.depart` |
| `data jsonb` | date: the `Plan` exactly as `readPlan` returns it (`src/lib/dates/plan.ts`, `v: 1`); trip: `{ v: 1, tripId, depart?, note? }` |
| `stops_count smallint` | derived by the server |
| `remind boolean default true` | the day-before reminder (members only get it) |
| `reminded_for date`, null | the day the reminder last went out for (claim) |
| `version integer default 1` | optimistic concurrency (PATCH `baseVersion`) |
| `last_edited_by uuid → profiles on delete set null` | shown as "edited by {name}" |
| `created_at`, `updated_at timestamptz` | `updated_at` also orders "the 3 most recent" (3.1) |

### 1.6 `supabase/migrations/0014_membership.sql` (builder A)

Additive, safe to run twice, backward compatible with the live site (which never reads
`couple_passes` and only ever inserts `purchases` columns it knows). Header comment in the style of
0009/0013: why each column exists, that `couple_passes` is now the membership table, what the
backfill does. Outline (write it out exactly like this; comments are yours):

```sql
set local lock_timeout = '5s';

-- couple_passes: the membership table
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

-- Not partial: PostgREST's on_conflict can only target a whole unique index (0013's note). Nulls are distinct.
create unique index if not exists couple_passes_subscription_idx on public.couple_passes (stripe_subscription_id);
create unique index if not exists couple_passes_store_original_idx on public.couple_passes (store_original_transaction_id);
create index if not exists couple_passes_customer_idx on public.couple_passes (owner_user_id, stripe_customer_id) where stripe_customer_id is not null;
create index if not exists couple_passes_period_idx on public.couple_passes (current_period_end) where current_period_end is not null;

-- Every existing row is a pass; the App Store's non-renewing year is told apart by its purchase.
update public.couple_passes cp set provider = 'app_store_pass'
  from public.purchases p
  where p.id = cp.purchase_id and p.store = 'app_store' and cp.provider = 'stripe_pass';

-- purchases: one row per paid invoice, linked to its membership
alter table public.purchases add column if not exists stripe_invoice_id text;
alter table public.purchases add column if not exists membership_id uuid references public.couple_passes (id) on delete set null;
create unique index if not exists purchases_invoice_idx on public.purchases (stripe_invoice_id);
create index if not exists purchases_membership_idx on public.purchases (membership_id) where membership_id is not null;

-- A membership's lent rows point at its first purchase, as a pass's do (0009): same trigger function.
create or replace trigger purchases_membership_deleted
  before delete on public.purchases
  for each row when (old.product = 'membership')
  execute function public.pass_purchase_deleted();
```

No policy changes: 0009's "owner or partner read" and its grants cover the new columns.

### 1.7 `supabase/migrations/0015_saved_dates.sql` (builder B)

Needs only 0009 (it reads `couple_passes.starts_at/ends_at/owner/partner`), so it can be applied
with 0014 or on its own. Outline:

```sql
set local lock_timeout = '5s';

-- The other person in the user's running membership, or null. A signed-in caller can only ask about
-- themselves (anyone else reads as null); the service role (auth.uid() is null) can ask about anyone.
create or replace function public.couple_partner(p_user uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select case when cp.owner_user_id = p_user then cp.partner_user_id else cp.owner_user_id end
  from public.couple_passes cp
  where p_user = coalesce((select auth.uid()), p_user)
    and cp.partner_user_id is not null
    and (cp.owner_user_id = p_user or cp.partner_user_id = p_user)
    and cp.starts_at <= now() and cp.ends_at > now()
  order by (cp.owner_user_id = p_user) desc, cp.ends_at desc
  limit 1
$$;
revoke all on function public.couple_partner(uuid) from public, anon;
grant execute on function public.couple_partner(uuid) to authenticated, service_role;

-- Whether the user holds a running membership, as owner or partner. Same guard.
create or replace function public.is_member(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.couple_passes cp
    where p_user = coalesce((select auth.uid()), p_user)
      and (cp.owner_user_id = p_user or cp.partner_user_id = p_user)
      and cp.starts_at <= now() and cp.ends_at > now()
  )
$$;
revoke all on function public.is_member(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated, service_role;

create table if not exists public.saved_dates (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('date', 'trip')),
  title text not null default '' check (char_length(title) <= 80),
  city text check (char_length(city) <= 80),
  day date,
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 16384),
  stops_count smallint not null default 0 check (stops_count between 0 and 99),
  remind boolean not null default true,
  reminded_for date,
  version integer not null default 1 check (version >= 1),
  last_edited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_dates_owner_idx on public.saved_dates (owner_user_id, updated_at desc);
create index if not exists saved_dates_day_idx on public.saved_dates (day) where remind and day is not null;
-- "Save trip" is a toggle: one row per trip per account (the API answers with the existing row on 23505).
create unique index if not exists saved_dates_trip_idx on public.saved_dates (owner_user_id, (data ->> 'tripId')) where kind = 'trip';

alter table public.saved_dates enable row level security;

drop policy if exists "saved_dates: owner or partner read" on public.saved_dates;
create policy "saved_dates: owner or partner read" on public.saved_dates
  for select to authenticated
  using ((select auth.uid()) = owner_user_id or owner_user_id = (select public.couple_partner((select auth.uid()))));

-- Every write goes through /api/saved-dates with the service role: the free limit depends on membership.
revoke all on public.saved_dates from anon;
revoke insert, update, delete on public.saved_dates from authenticated;
grant select on public.saved_dates to authenticated;

-- A backstop, not the free limit: no account keeps more than 500 (the reminders_cap pattern, 0010).
create or replace function public.saved_dates_cap()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.saved_dates where owner_user_id = new.owner_user_id) >= 500 then
    raise exception 'too many saved dates' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.saved_dates_cap() from public, anon, authenticated;
create or replace trigger saved_dates_cap
  before insert on public.saved_dates
  for each row execute function public.saved_dates_cap();
```

`couple_partner` is wrapped in `(select …)` in the policy so Postgres evaluates it once per query,
not per row. `tests/unit/migrations.test.ts` already checks every file from 0008 on (run twice,
additive, RLS on, trigger functions off the API); each builder adds its own file-specific test
(`tests/unit/migrations-membership.test.ts`, `tests/unit/migrations-saved-dates.test.ts`), never
editing the shared one.

### 1.8 `src/lib/supabase/types.ts` (builder A, first thing, for everybody)

- `couple_passes` Row/Insert/Update gain the 0014 columns (`provider: MembershipProvider`,
  `plan: MembershipPlan`, `status: MembershipStatus`, the rest nullable as in SQL).
- `purchases` Row/Insert/Update gain `stripe_invoice_id: string | null`, `membership_id: string | null`.
- New table `saved_dates`: Row `{ id; owner_user_id; kind: "date" | "trip"; title; city: string | null;
  day: string | null; data: Json; stops_count: number; remind: boolean; reminded_for: string | null;
  version: number; last_edited_by: string | null; created_at; updated_at }`; Insert (id, title, city,
  day, stops_count, remind, reminded_for, version, last_edited_by, timestamps optional); Update (all
  but id and owner_user_id optional).
- Functions: `couple_partner: { Args: { p_user: string }; Returns: string | null }`,
  `is_member: { Args: { p_user: string }; Returns: boolean }`.
- The fake db (`tests/unit/helpers/fake-db.ts`, builder A) gains the unique keys
  (`couple_passes.stripe_subscription_id`, `couple_passes.store_original_transaction_id`,
  `purchases.stripe_invoice_id`) and defaults (`provider: "stripe_pass"`, `plan: "yearly"`,
  `status: "active"`, `cancel_at_period_end: false`, the rest null).

---

## 2. Billing

### 2.1 The shared Stripe account: rules every Ethos object follows

The account also bills secuora.net and domainscan; their webhooks receive every event. Read
secuora's handler once: on `checkout.session.completed` it takes `metadata.supabase_user_id ??
client_reference_id` as its own user id and upserts `plan_entitlements` for the session's customer;
on `customer.subscription.*` and `invoice.paid` it looks users up by `stripe_customer_id` and by
`supabase_user_id` in customer, subscription and invoice metadata; its trial guard ends any
**trialing** subscription whose card it has seen before; its affiliate code pays commission on any
subscription invoice that carries a promotion code. Hence:

| # | Rule | Where it is enforced | Test |
| --- | --- | --- | --- |
| R1 | Never write the metadata key `supabase_user_id` anywhere. Ethos's key is `ethos_user_id` (new objects); one-time sessions keep `user_id` as today. | line-items, subscriptions, fulfil | a source scan finds no `supabase_user_id` in `src/` or `scripts/`; params never contain it |
| R2 | A `mode: "subscription"` session never sets `client_reference_id` (the purchase id is `metadata.purchase_id`). | `membershipSessionParams` | params have no `client_reference_id` |
| R3 | Every Ethos session (both modes), customer, subscription (`subscription_data.metadata`) and invoice carries `metadata.app = "ethos"`. Customers and invoices are tagged after the fact (Checkout can't set a new customer's metadata; Stripe makes the invoices). | line-items, fulfil, `invoice.*` handlers | params, and every `metadata` the code writes, carry `app: "ethos"` |
| R4 | The webhook acts only on Ethos objects: sessions with our `purchase_id` and product (plus `app = "ethos"` in subscription mode); subscriptions and invoices with the marker (on the object or in `parent.subscription_details.metadata`) **or** a subscription id already in `couple_passes`. Anything else: 200, nothing read further, nothing written. We handle no `customer.created/updated/deleted` events at all. | `src/lib/stripe/events.ts` | foreign session/subscription/invoice events write nothing |
| R5 | The Customer Portal always passes `configuration: STRIPE_PORTAL_CONFIGURATION`. The account's default configuration is never read, changed or relied on; without the variable the portal route answers 503. | `/api/stripe/portal` | route refuses without the env |
| R6 | No coupons, promotion codes, discounts or trials, and no standing Prices: prices are inline `price_data` (Stripe archives each at once), `allow_promotion_codes: false` everywhere. The only catalogue object Ethos creates on purpose is the price-less "Ethos for Two" Product (the setup script); with it set, a subscription line doesn't make a Product of its own either. Nothing without a price can appear in another business's checkout. | line-items, setup script | params have no `discounts`, `trial_*`, `allow_promotion_codes: true` |
| R7 | Never attach a subscription to a Stripe customer Ethos didn't create: no lookup by email, ever. A stored `stripe_customer_id` (from the user's own `couple_passes` rows) is reused only after retrieving it and checking `!deleted && metadata.app === "ethos" && metadata.ethos_user_id === userId`; otherwise Checkout makes a new one (`customer_email`). A shared customer would let secuora's handler rewrite one of its users' plans from our events. | `ethosCustomerFor` | reuse only with matching metadata |
| R8 | Never create a trial (`trial_period_days`, `trial_end`): secuora's trial guard would end it and charge at once. | line-items, switch code | no trial params anywhere |
| R9 | Never use `metadata.kind = "ai_credits"` (secuora's one-time credit packs). Ethos kinds are product names. | line-items | — |
| R10 | One-time sessions never set `customer`, `customer_creation` or `invoice_creation`: their `client_reference_id` is only harmless because they have no customer. | `sessionParams` | params have none of them |
| R11 | Depend on no account-wide setting (retry schedule, what happens after the last retry, Stripe's own customer emails, the default portal): handle every subscription status, send our own emails. | sync, cron | status mapping covers all eight statuses |

Known and harmless on secuora's side (tell its owner, section 7): for every Ethos **subscription**
checkout its handler logs "Could not resolve user for customer" and writes a `withdrawal_waivers`
row with `user_id` null (from our tickbox). It grants and changes nothing as long as R1, R2 and R7
hold. domainscan's code wasn't available to read; the same rules protect a handler that works like
secuora's, and section 7 asks the owner to confirm.

**Webhook payload shapes.** The SDK (22.6.1) speaks API `2026-08-26.dahlia`: `current_period_end`
is on the subscription **item**, an invoice's subscription is `invoice.parent.subscription_details.
subscription`, a charge has no `invoice`, an invoice's payment intents are in `invoice.payments`.
The Ethos endpoint may be pinned to an older version, so every subscription/invoice handler
**re-fetches** the object with the SDK before reading anything but the ownership check, and the
ownership check reads both shapes (`invoice.parent?.subscription_details?.subscription ??
invoice.subscription`).

### 2.2 The catalogue (`src/lib/pricing/products.ts`, builder A)

```ts
export type ProductId = "single" | "pick3" | "everything" | "extras" | "pass" | "membership" | "pack" | "giftcard" | "upgrade";
export type MembershipPlan = "monthly" | "yearly";

/** Ethos for Two as a subscription: one payment covers the couple. Minor units, VAT included. */
export const MEMBERSHIP_PLANS: Record<MembershipPlan, { interval: "month" | "year"; amounts: Record<Currency, number> }> = {
  monthly: { interval: "month", amounts: { eur: 499, usd: 599, gbp: 449 } },
  yearly: { interval: "year", amounts: { eur: 2999, usd: 3499, gbp: 2599 } },
};
export const membershipAmount = (plan: MembershipPlan, currency: Currency) => MEMBERSHIP_PLANS[plan].amounts[currency];
/** The yearly price per month, to the cent: what "€2.50 a month" shows. */
export const yearlyPerMonth = (currency: Currency) => Math.round(MEMBERSHIP_PLANS.yearly.amounts[currency] / 12);
/** How much less a yearly year costs than twelve months, whole percent (50 in euros). */
export const yearlySavingPct = (currency: Currency) =>
  Math.round((1 - MEMBERSHIP_PLANS.yearly.amounts[currency] / (12 * MEMBERSHIP_PLANS.monthly.amounts[currency])) * 100);
export const isMembershipPlan = (v: unknown): v is MembershipPlan => v === "monthly" || v === "yearly";
/** Free accounts keep this many saved dates and trips; members, any number. */
export const FREE_SAVED_DATES = 3;
/** Server-side only, like giftCardsOnSale: the browser reads false, so pages pass it down as a prop. */
export function subscriptionsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.STRIPE_SUBSCRIPTIONS_ENABLED === "true";
}
```

- `PRODUCTS.pass.amounts` becomes `MEMBERSHIP_PLANS.yearly.amounts` (€29.99, the fallback).
- `PRODUCTS.membership = { id: "membership", picks: 0, amounts: MEMBERSHIP_PLANS.yearly.amounts,
  highlight: false, envProductKey: "STRIPE_PRODUCT_FORTWO", name: { en: "Ethos for Two", es: "Ethos
  for Two" } }` (`amounts` is the yearly figure for code that reads any product generically; the
  per-plan amount always comes from `membershipAmount`).
- `unlocksFor("membership")` → `[EVERY_TEMPLATE, EVERY_PACK]`, like the pass.
- The header comment's "Every product is a ONE-TIME payment… Ethos never creates one" is rewritten:
  one product is a subscription, under the rules in docs/MEMBERSHIP.md 2.1.
- `scripts/check-prices.mjs` accepts `MEMBERSHIP_PLANS` amounts and `yearlyPerMonth` in every
  currency (the copy may say "€2.50 a month").
- The app catalogue (`catalogProducts`) gives each product its own price: `plan ? membershipAmount(plan, "eur") : …`, and includes `plan`.

### 2.3 Checkout

**Request** (`POST /api/stripe/checkout`, contract C1, extended): the zod input gains
`plan: z.enum(["monthly", "yearly"]).optional()`. Clients buy the membership with
`{ product: "membership", plan, currency?, locale, returnTo?, ref? }` and nothing else; the server
decides whether that is a subscription or the one-time pass. `{ product: "pass" }` stays accepted
(old pages) while subscriptions are off.

**Planning** (`planCheckout`, pure, `src/lib/commerce/plan.ts`). `CheckoutContext` gains
`subscriptions: boolean` and `membership: { running: boolean; isOwner: boolean; provider:
MembershipProvider; status: MembershipStatus } | null` (the buyer's own, looked up by the route with
`membershipContextOf(db, userId, now)`: the running one, else their latest subscription Stripe is
still collecting (`past_due`/`incomplete`), else null; always null for a guest). `CheckoutPlan` gains `plan:
MembershipPlan | null` and `billing: "one_time" | "subscription"`; `PlanLine.key` may be
`"membership"`. In order:

1. `product === "membership"` without a plan → `invalid_input` (400).
2. Subscriptions off: `plan === "monthly"` → `not_on_sale` (400); `plan === "yearly"` becomes the
   pass (`product: "pass"`, `kind: "pass"`, `billing: "one_time"`, `PRODUCTS.pass` amount).
3. Subscriptions on: `product === "pass"` → `not_on_sale` (400).
4. A buyer whose own subscription is `past_due` or `incomplete` (not running, not ended) →
   `payment_issue` (409): a second subscription while Stripe still collects the first would charge
   twice. The UI sends them to the account page.
5. A running membership: a pass **owner** buying the pass is a renewal (today's behaviour, a year
   added from its end); anything else → `already_member` (409). That includes a pass owner asking
   for a subscription while the pass runs (carrying a pass over into a subscription is section 8).
6. Otherwise: `{ product: "membership", kind: "membership", plan, billing: "subscription", lines:
   [{ key: "membership", amount: membershipAmount(plan, currency) }] }`. `unlocks` is `[]` (the
   membership has its own grant, like the pass).

Creators are credited as for any sale: the checkout's purchase carries `creator_code`; renewals
don't, so a creator earns on the first payment only. `scripts/creator-payouts.mjs` must count a
`membership` purchase like any other (check it filters no product out).

**The purchase row.** Signed in: the route inserts the pending row as today with `product` and
`kind` `"membership"` (or `"pass"`), `amount` = the first charge. Guest: written at fulfilment.

**Customer (subscription only).** `ethosCustomerFor(db, stripe, userId)`: the most recent
`stripe_customer_id` on the user's own `couple_passes` rows, retrieved and checked (R7); reused
as `customer`, else `customer_email: user.email` (signed in) or nothing (guest: Checkout asks).

**Session parameters** (`membershipSessionParams(plan, options & { customerId })` in
`src/lib/stripe/line-items.ts`):

```ts
{
  mode: "subscription",
  locale: options.locale,
  line_items: [{
    quantity: 1,
    price_data: {
      currency, unit_amount: membershipAmount(plan, currency), tax_behavior: "inclusive",
      recurring: { interval: plan === "monthly" ? "month" : "year" },
      // The name is the same in both languages, so the configured Product serves Spanish buyers too.
      ...(STRIPE_PRODUCT_FORTWO ? { product: STRIPE_PRODUCT_FORTWO }
        : { product_data: { name: "Ethos for Two", tax_code: TAX_CODE, description: LINE_DESCRIPTION[plan][locale], metadata: { app: "ethos" } } }),
    },
  }],
  ...(customerId ? { customer: customerId } : { customer_email: email ?? undefined }),
  // no client_reference_id (R2)
  metadata: { app: "ethos", purchase_id, ethos_user_id: userId ?? "", guest: userId ? "0" : "1", locale,
              product: "membership", plan, kind: "membership", withdrawal_notice: "tickbox", creator_code?, ref? },
  subscription_data: { metadata: { app: "ethos", purchase_id, ethos_user_id: userId ?? "" } },
  allow_promotion_codes: false,
  consent_collection: { promotions: "auto", terms_of_service: "required" },
  custom_text: {
    terms_of_service_acceptance: { message: consentText("membership", locale, origin, { plan, currency }) },
    submit: { message: renewalNotice(plan, currency, locale) },
  },
  branding_settings: CHECKOUT_BRANDING,
  automatic_tax: automaticTax ? { enabled: true } : undefined,
  success_url: `${origin}${prefix}/checkout/success?session_id={CHECKOUT_SESSION_ID}&return=${encodeURIComponent(back)}`,
  cancel_url: `${origin}${cancel}`,
  // no payment_intent_data (payment mode only), no after_expiration (no recovery for subscriptions),
  // no trial (R8), no discounts (R6)
}
```

`LINE_DESCRIPTION`: monthly EN "Monthly membership for two", ES "Suscripción mensual para dos";
yearly EN "Yearly membership for two", ES "Suscripción anual para dos". `createCheckoutSession`
keeps stepping down (promotions box, tickbox, branding); its tickbox fallback puts
`withdrawalNotice("membership", …)` above the button, which for a membership contains both the
renewal sentence and the withdrawal sentence (below). One-time sessions gain `metadata.app =
"ethos"` and nothing else changes for them.

**The tickbox (exact, EN and ES).** `consentSentence(product, locale, options?: { plan?:
MembershipPlan; currency?: Currency })`, prices formatted with `formatAmount(…, currency ?? "eur",
locale)`. Ethos for Two is a digital **service** (the owner's decision), so the buyer asks for it to
start and keeps the right to withdraw, paying only for the days used (Consumer Rights Directive
arts. 7(3), 8(8), 14(3)). The pass (the fallback) uses the service wording too, replacing today's
digital-content waiver for it.

| | English | Spanish |
| --- | --- | --- |
| membership, monthly | I ask Ethos to start my Ethos for Two membership straight away. It renews every month at €4.99 until I cancel, which I can do at any time from my account. I understand that I can still withdraw within 14 days, and that I would then pay only for the days I've used. | Pido a Ethos que active mi suscripción a Ethos for Two de inmediato. Se renueva cada mes por 4,99 € hasta que la cancele, algo que puedo hacer cuando quiera desde mi cuenta. Entiendo que aún puedo desistir en un plazo de 14 días y que, en ese caso, solo pagaría la parte correspondiente a los días ya disfrutados. |
| membership, yearly | … It renews every year at €29.99 until I cancel, which I can do at any time from my account. I understand… | … Se renueva cada año por 29,99 € hasta que la cancele, algo que puedo hacer cuando quiera desde mi cuenta. Entiendo… |
| pass (fallback) | I ask Ethos to start my Ethos for Two year straight away. It's one payment for one year and doesn't renew by itself. I understand that I can still withdraw within 14 days, and that I would then pay only for the days I've used. | Pido a Ethos que active mi año de Ethos for Two de inmediato. Es un pago único por un año y no se renueva solo. Entiendo que aún puedo desistir en un plazo de 14 días y que, en ese caso, solo pagaría la parte correspondiente a los días ya disfrutados. |

(The yearly rows are the monthly rows with the middle sentence swapped; write them out in full.)
Fulfilment stores the exact sentence on the purchase (`terms_consent`), the welcome email repeats
it, Terms s.9 quotes it through this function.

**Above the Subscribe button** (`renewalNotice`, also exact):

| | English | Spanish |
| --- | --- | --- |
| monthly | €4.99 a month for both of you, charged today and then every month until you cancel. Cancel any time from your account: you keep Ethos for Two until the end of the month you've paid for. | 4,99 € al mes para los dos: se cobra hoy y después cada mes hasta que canceles. Puedes cancelar cuando quieras desde tu cuenta y conservas Ethos for Two hasta el final del mes pagado. |
| yearly | €29.99 a year for both of you, charged today and then every year until you cancel. We'll email you a week before each renewal. Cancel any time from your account: you keep Ethos for Two until the end of the year you've paid for. | 29,99 € al año para los dos: se cobra hoy y después cada año hasta que canceles. Te escribiremos una semana antes de cada renovación. Puedes cancelar cuando quieras desde tu cuenta y conservas Ethos for Two hasta el final del año pagado. |

The fallback notice (no tickbox possible) is: EN "By subscribing, you ask for Ethos for Two to
start straight away. {renewal notice} You can withdraw within 14 days. Terms: {url}" (ES likewise);
a buyer who ticked nothing and withdraws within 14 days is refunded in full (art. 14(4)(a)(i)).
`withdrawalNotice("pass", …)` loses "you lose the 14-day right to cancel" the same way: EN "By
paying, you ask for your year of Ethos for Two to start straight away. It's one payment for one
year and doesn't renew by itself. You can withdraw within 14 days. Terms: {url}".

### 2.4 Fulfilment of a subscription checkout (`src/lib/stripe/fulfil.ts`)

`fulfilCheckoutSession(session)` branches on `session.mode === "subscription"` →
`fulfilMembershipSession(session)`; the webhook and the success page both call it, whichever runs
first, exactly as today. Steps:

1. Ours? `metadata.app === "ethos"`, a `purchase_id`, `product === "membership"`, a plan → else
   `{ ok: false, reason: "not_ours" }` (the webhook treats it like another business's session).
2. `payment_status` must be `paid` or `no_payment_required`; `unpaid` → `{ ok: false, reason:
   "unpaid" }` (a delayed method; `checkout.session.async_payment_succeeded` or the subscription
   becoming `active` finishes it).
3. The buyer: signed in (`claimSignedIn`, reading `sessionUserId(session)` = `metadata.ethos_user_id
   || metadata.user_id`) or guest (`claimGuest`, account made from the email; `chargedAmount`'s
   fallback is `membershipAmount(plan, "eur")`). `sessionUserId` is exported: the success page uses
   it instead of reading `metadata.user_id`.
4. Retrieve the subscription with `expand: ["latest_invoice.payments"]`; normalise it (2.5).
5. Tag, best-effort (a failure is logged, never fatal): the customer gets `{ app: "ethos",
   ethos_user_id }` unless it has it; a guest's subscription gets `ethos_user_id`; the first invoice
   gets `{ app: "ethos", ethos_user_id, purchase_id }`.
6. `startSubscriptionMembership(db, { purchaseId, ownerId, customerId, subscription, now })`:
   upsert on `stripe_subscription_id` (`ignoreDuplicates`) with `provider: "stripe_subscription"`,
   plan, status, period end, a fresh `invite_code` (redraw on a 23505 like `startPass`), then
   `applySubscriptionState` (2.5). No partner is carried over (a resubscriber invites again).
7. The purchase row: paid (the claim), `amount`/`currency` from the session, `stripe_session_id`,
   `stripe_invoice_id` and `stripe_payment_intent_id` from the latest invoice, `membership_id`,
   `terms_consent` (`agreedConsent` with the membership sentence).
8. Only the call that claimed sends: the membership welcome (5.1, with the invite unless the
   partner is in, and the consent sentence), and for a checkout-made account the account welcome as
   today. No `notifyReceipt` for a membership (it says "one-time payment"); the welcome is the
   confirmation on a durable medium.
9. Returns `Fulfilment` with `passInviteUrl` (same field, same visibility rule as the pass: the
   signed-in buyer, or the guest whose account this checkout made).

The purchase row exists before the membership row (its `purchase_id` is a foreign key), and
`membership_id` is written onto the purchase once the row exists. `foreverRowsFor` returns `[]` for
`membership`, as for `pass`: nothing a membership grants is kept for good.

A guest who pays with the email of an account that already has a running membership still gets
what they paid for (a second row); fulfilment logs `[membership] second running membership` for the
owner to refund. The pass fallback is today's pass flow unchanged, except the price, the consent
wording and the receipt's consent line (5.1).

### 2.5 The subscription's state: one function decides

`applySubscriptionState(db, row, sub, now)` (in `src/lib/commerce/memberships.ts`, pure over
`Db`; the Stripe retrieval lives in `src/lib/stripe/subscriptions.ts`). Every Stripe event about a
subscription ends here, with the subscription **as retrieved now**, so event order never matters.

| Stripe `sub.status` | `status` | `ends_at` |
| --- | --- | --- |
| `active`, `trialing` (never ours, R8) | `active` | renewing: `current_period_end + GRACE`; cancelling: `min(current_period_end, cancel_at ?? ∞)` |
| `past_due` | `past_due` | `current_period_end + GRACE` |
| `incomplete` | `incomplete` | `starts_at` (zero length: not running) |
| `canceled`, `unpaid`, `incomplete_expired`, `paused` | `ended` | `max(starts_at, min(ends_at, ended_at ?? now))` |

`GRACE = 7 days` (`MEMBERSHIP_GRACE_MS`): a renewal whose `invoice.paid` is late, or a card being
retried, never cuts a couple off at midnight. Also written: `plan` from the item's
`price.recurring.interval`, `current_period_end` from `sub.items.data[0].current_period_end`,
`cancel_at_period_end = sub.cancel_at_period_end || sub.cancel_at !== null`, `provider_event_at`.
Then entitlements: running now → `grantPassUnlocks`; was running and isn't → revoke and regrant
(1.4). Newly `ended` → the "has ended" email once, by whoever claims `ended_notified_at` (update
where it is null). The refund, dispute and withdrawal path (2.6) sets `ended_notified_at` itself
without sending, so the `customer.subscription.deleted` that follows its cancellation sends nothing:
nobody who asked for their money back is told to come back.

### 2.6 The webhook (`src/app/api/stripe/webhook/route.ts` → `src/lib/stripe/events.ts`)

The route verifies the signature and calls `handleStripeEvent(event, deps)`; `deps` carries `db`,
`stripe`, `now` and the email senders so the whole routing is unit-tested with fakes.
`maxDuration` 30. New events to add on the endpoint: `customer.subscription.updated`,
`customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`,
`invoice.payment_action_required`.

| Event | Ours when | What happens | Idempotent by |
| --- | --- | --- | --- |
| `checkout.session.completed`, `…async_payment_succeeded` | payment mode: as today; subscription mode: `metadata.app === "ethos"` | today's fulfilment, or 2.4 | the purchase claim, upserts keyed by purchase/subscription |
| `checkout.session.expired` | as today | recovery email; `recoveryTarget` ignores subscription sessions | as today |
| `customer.subscription.updated`, `.deleted` | marker or known id | retrieve → `applySubscriptionState`; no row yet → 200 (fulfilment will make it) | state-based |
| `invoice.paid` | marker on invoice or its subscription snapshot, or known subscription | retrieve invoice (`expand: ["payments"]`); `amount_paid > 0`: `billing_reason === "subscription_create"` → fill `stripe_invoice_id`/payment intent on the checkout's purchase if empty; any other reason → insert a `membership` purchase (owner, amount, currency, `stripe_invoice_id`, payment intent, `membership_id`, `created_at` = paid time); tag the invoice; then retrieve the subscription → `applySubscriptionState` | `stripe_invoice_id` unique |
| `invoice.payment_failed`, `invoice.payment_action_required` | same | retrieve → `applySubscriptionState`; then, for a renewal only (`billing_reason` not `subscription_create`: a first payment that fails is Checkout's to show, and there is no membership yet) and a row that exists, while the invoice as retrieved now is still `open` and the row is `past_due` (the event can come late or again: a renewal paid since, voided, or a membership that has ended gets nothing), claim `payment_failed_invoice = invoice.id` and email the owner (5.1: update your card, or confirm the payment with `hosted_invoice_url`) | the claim |
| `charge.refunded`, `charge.dispute.created` | a purchase with that payment intent | as today, plus membership handling below | as today |
| anything else | — | 200 | — |

A failure that might pass on a retry answers 500 for **our** events only (Stripe retries);
foreign events are always 200. That includes the read that finds the row (`rowBySubscription`,
which throws on a database error): for a subscription or invoice with our marker the event is ours
and the answer is 500, never a 200 that drops a renewal for good; for one without the marker the
row is only the fallback for a marker somebody removed, so a failed read answers 200 as foreign and
logs a warning.

**Refunds, disputes and the 14-day withdrawal** (in `revokePurchase`, with a `cancelSubscription`
callback so `src/lib/commerce` stays Stripe-free):

- **Dispute** on any membership or pass payment: the membership ends now for both (status `ended`,
  `ends_at = now`, revoke, relock gifts), and a Stripe subscription is cancelled at once
  (`subscriptions.cancel(id, { prorate: false, invoice_now: false })`).
- **Full refund**: the purchase is marked refunded; if it paid for the membership's latest period
  (the latest paid `membership` purchase of that row, or the pass's own year), the membership ends
  now as above; refunding an older period changes nothing else.
- **Partial refund with reason `requested_by_customer`** on a membership or pass payment is a
  withdrawal: the membership ends now and a subscription is cancelled, with no gift relock (the
  days used were paid for). The purchase stays `paid`. The reason is read with
  `stripe.refunds.list({ charge, limit: 1 })`. A pass is ended with `shortenRefundedPass` (years
  bought ahead move up, as for a full refund).
- Any other partial refund changes nothing (a goodwill gesture).
- Every one of these sets `ended_notified_at` without sending (2.5), and writes `status = 'ended'`.
  The membership's lent rows are found by the **row's** `purchase_id`, not the refunded purchase's
  (a renewal's purchase has no unlock rows of its own).

The owner's procedure for a withdrawal (docs/STRIPE.md and the Terms say the same):
subscription: Dashboard → the subscription → **Cancel subscription → Immediately → Refund last
payment: prorated**; the webhook ends it for both. Pass: refund the prorated amount (price × days
left / 365) with reason **Requested by customer**; the webhook ends it for both.

### 2.7 Managing a membership: `/api/membership` and `/api/stripe/portal` (builder A)

`POST /api/membership` (cookie or Bearer through `getCurrentUser`; 20 a minute per user). The body
is `{ action }`, checked against an explicit allowlist (zod enum):

| Action | Who, when | What it does |
| --- | --- | --- |
| `cancel` | owner, `stripe_subscription`, `active` or `past_due` | active: `cancel_at_period_end: true`, clears `pending_plan`; `past_due`: cancel **now** and void its open invoice (the dialog says so) |
| `resume` | owner, cancelling, not ended | `cancel_at_period_end: false` |
| `preview_yearly` | owner, monthly, active | `invoices.createPreview` for the switch below, with the same `billing_cycle_anchor: "now"` (and no `proration_date`, which Stripe refuses beside it) → `{ amountDue, currency, periodEnd }` |
| `switch_to_yearly` | same | the item's price becomes yearly `price_data` on the item's own product, `billing_cycle_anchor: "now"`, `proration_behavior: "always_invoice"`, `payment_behavior: "pending_if_incomplete"` (a separate call first if it has to un-cancel) |
| `switch_to_monthly` | owner, yearly, active, not cancelling | sets `pending_plan = "monthly"`: the cron switches it a couple of days before renewal (2.9) |
| `keep_plan` | owner with `pending_plan` | clears it |
| `leave` | partner of a running membership | 1.4 "partner leaves" |
| `remove_partner` | owner with a partner | same for the partner, and a new `invite_code` on the running and ahead rows (the old link stops working) |

Responses: `200 { ok: true, membership: MembershipSummary | null }` (after the change; `leave` →
null); `preview_yearly`: `200 { ok: true, preview: { amountDue: number; currency: Currency;
periodEnd: string } }`; `switch_to_yearly` may answer `402 { error: "payment_failed" }` (nothing
changed) or `402 { error: "requires_action", url }` (the invoice's `hosted_invoice_url`, to confirm
with the bank). Errors: `401 unauthenticated`, `400 invalid_input`, `404 not_member`,
`403 not_owner`, `403 not_partner`, `409 { error: "not_available", reason: "app_store" | "pass" |
"cancelling" | "past_due" | "not_monthly" | "not_yearly" }` (or with no `reason` when none fits,
such as a membership that ended a moment ago), `429 rate_limited`, `500 failed` (the database
couldn't be read or written, including a change that succeeded but couldn't be read back), `502
stripe_failed` (Stripe itself), `503 not_configured`. After every change the route applies the
retrieved state (2.5) so the answer is already true.

Monthly → yearly is ours, not the portal's, on purpose: the portal can only switch between Prices
listed in its configuration, inline prices are archived (`active=false`) and can't be listed, and
standing Prices would break R6 and give the price a second home. Every switch passes
`billing_cycle_anchor: "now"`, so the new plan's period starts at the switch: Checkout's
subscriptions are in flexible billing mode, which keeps the old anchor through a change of interval,
and a monthly member who subscribed on 17 July and switched on 17 September would otherwise pay for
a "year" ending on 17 July, ten months later (verified on a test clock). Yearly → monthly waits for
the renewal so the year that was paid for is used rather than turned into credit; the cron switches
a couple of days early and `always_invoice` credits those unused days, so nobody pays twice.

`POST /api/stripe/portal` `{ flow?: "manage" | "update_card" | "cancel" }` (default `manage`):
owner of a `stripe_subscription` row (running or not: invoices stay reachable), customer checked
as in R7, `configuration: STRIPE_PORTAL_CONFIGURATION` (unset → 503 `portal_not_configured`),
`locale`, `return_url` = the account page (`/account#for-two`, Spanish under `/es`). Flows:
`update_card` → `flow_data: { type: "payment_method_update" }`; `cancel` →
`{ type: "subscription_cancel", subscription_cancel: { subscription }, after_completion: { type:
"redirect", redirect: { return_url } } }`. → `{ url }`, or `401/403/404/409 not_available/429/502`.

`scripts/setup-billing-portal.mjs` (builder A writes it; the owner runs it, test mode first):
reads `.env.local`; refuses a live key unless `--live`; idempotent (finds its own objects by
`metadata.app === "ethos"`, never touches anything without the marker, never sets a default). Stripe
makes the first portal configuration an account gets its **default**, which every session opened
without `configuration` (another business's too) then uses, so the script refuses to create Ethos's
on an account that has no default yet: save the account's own default first (Dashboard → Settings →
Billing → Customer portal → Save). A configuration of ours that is the default already (test mode's
first one became it) is never used as Ethos's again: the script names it, leaves it alone for the
owner to turn into the account's own default in the Dashboard, and makes a new one beside it
(`scripts/lib/portal-configuration.mjs`). It creates or updates:

1. The **portal configuration**: `name: "Ethos for Two"`, `metadata: { app: "ethos" }`,
   `business_profile: { headline: "Ethos for Two", privacy_policy_url, terms_of_service_url }`
   (Ethos's own, `https://tryethos.io/legal/…`), `default_return_url` the account page, features:
   `subscription_cancel { enabled: true, mode: "at_period_end", proration_behavior: "none" }` (no
   cancellation-reason survey: leaving is as easy as joining), `payment_method_update { enabled:
   true }`, `invoice_history { enabled: true }`, `customer_update { enabled: true,
   allowed_updates: ["address", "name"] }`, `subscription_update { enabled: false }` (switching is
   ours, above).
2. The **"Ethos for Two" Product**, with no price (R6): `tax_code: "txcd_10000000"`,
   `statement_descriptor: "ETHOS FOR TWO"` (Stripe uses a subscription product's descriptor on its
   charges; `payment_intent_data`'s suffix doesn't exist in subscription mode), `metadata: { app:
   "ethos" }`.

It prints `STRIPE_PORTAL_CONFIGURATION=bpc_…` and `STRIPE_PRODUCT_FORTWO=prod_…`.

### 2.8 Entitlements (`GET /api/entitlements`, contract C3, extended)

```ts
Entitlements = { signedIn; templates; packs; pass: PassSummary | null; membership: MembershipSummary | null; upgrade }
```

`membership` is the user's running membership (owner rows first, then partner rows, then the
latest end), or, when none runs, the owner's latest `stripe_subscription` row in `past_due` or
`incomplete` (so the account and pricing pages can say "payment failed"). `pass` stays for the
iPhone app's current build: `{ endsAt: membership.endsAt ?? membership.periodEnd, isOwner,
partnerJoined, inviteUrl? }` whenever a membership runs, else null. The route reads the partner's
name with the service role (profiles are own-row only). `POST /api/app/purchases/sync` returns the
same shape through `readEntitlements`.

### 2.9 The daily job (`/api/cron/passes`, 06:00 UTC)

In this order, each capped per run:

1. **Reconcile**: `stripe_subscription` rows in `active`/`past_due`/`incomplete` whose
   `current_period_end` has passed → retrieve → `applySubscriptionState` (a missed webhook never
   costs access: grace gives seven runs). `app_store` rows the same way through RevenueCat's REST
   subscriber (`subscriptions[productId].expires_date`, `unsubscribe_detected_at`, `refunded_at`)
   when `REVENUECAT_SECRET_API_KEY` is set (lowest priority of builder A's list).
2. **Pending monthly switches**: `pending_plan = 'monthly'`, active, not cancelling, period end
   within 72 hours → switch the item to monthly `price_data`, `billing_cycle_anchor: "now"`,
   `proration_behavior: "always_invoice"` → apply state → clear `pending_plan`. Safety net: an `invoice.paid` for a
   yearly `subscription_cycle` while `pending_plan` is still set switches straight away (the unused
   year becomes the customer's credit, spent on the monthly invoices).
3. **Yearly renewal reminder**: `stripe_subscription`, yearly, active, not cancelling,
   `current_period_end` within 7 days, `renewal_reminded_for` ≠ it → claim, email the owner (5.1),
   release the claim if sending fails. Monthly plans get none; App Store renewals are Apple's.
4. **Pass renewal email** (14 days, `remindRenewals`): now only for `stripe_pass`/`app_store_pass`
   rows. While subscriptions are on, its copy points to monthly or yearly from the end date (5.1).
5. **Sweep** (`sweepEndedPasses`, unchanged): any row whose `ends_at` passed loses its lent rows;
   anyone with another running membership gets them back.
6. Gift card details cleanup (unchanged).

### 2.10 The switch, and the one-time pass

| | `STRIPE_SUBSCRIPTIONS_ENABLED` unset (launch default) | `"true"` |
| --- | --- | --- |
| `/pricing` hero | yearly only: €29.99, "paid once, doesn't renew" | Monthly/Yearly toggle |
| `{ product: "membership", plan: "yearly" }` | the pass (one-time, 365 days, renewal email) | a yearly subscription |
| `{ product: "membership", plan: "monthly" }` | `not_on_sale` | a monthly subscription |
| `{ product: "pass" }` | the pass (old pages) | `not_on_sale` |
| Existing passes | run their year, renew as passes | run their year; the 14-day email offers monthly or yearly from the end date |
| Existing subscriptions (if switched off again) | keep renewing and keep working: the switch only governs new sales | — |

The switch is read on the server only; server components pass `subscriptionsEnabled()` to client
components as a prop (the static `/plan` and `/trips` pages read it at build time, which is fine:
changing a Vercel variable needs a redeploy anyway).

### 2.11 App Store subscriptions (RevenueCat)

`APP_STORE_PRODUCTS` gains `{ id: "xyz.secuora.ethos.fortwo.monthly", type: "autoRenewable",
product: "membership", plan: "monthly" }` and the `.yearly` twin (`AppStoreProductType` gains
`"autoRenewable"`, `AppStoreProduct` gains `plan?`). The non-renewing `xyz.secuora.ethos.fortwo`
stays (a pass; its rows are `app_store_pass`). `handleRevenueCatEvent` sends any event whose
`product_id` (or `new_product_id`) is auto-renewable to `handleAppStoreSubscriptionEvent(db, event,
now)`; everything else is today's code. The row is keyed by `original_transaction_id`; each
purchase/renewal transaction is a `purchases` row (keyed by `(store, store_transaction_id)` as
today, `product`/`kind` `membership`, `membership_id`). Anonymous or deleted users: ignored (200).

| Event | Effect (state changes only if `event_timestamp_ms ≥ provider_event_at`, except where noted) |
| --- | --- |
| `INITIAL_PURCHASE`, `RENEWAL` | record the transaction; create the row if missing (owner = `app_user_id`, plan from `product_id`, `starts_at` = `purchased_at_ms`); `status active`, `cancel_at_period_end false`, `current_period_end = max(current, expiration_at_ms)` (always, order-free); grant |
| `UNCANCELLATION` | `cancel_at_period_end false` |
| `CANCELLATION` with `cancel_reason = "CUSTOMER_SUPPORT"` | Apple's refund: the transaction's purchase refunded (a tombstone if unknown, as today); membership ends now; relock gifts |
| `CANCELLATION`, any other reason | `cancel_at_period_end true` (access to the period end) |
| `BILLING_ISSUE` | `status past_due`; `ends_at = grace_period_expiration_at_ms ?? current_period_end + GRACE` |
| `EXPIRATION` | only if `expiration_at_ms ≥ current_period_end − 1 min` (it's about the latest period; an older one arriving late is ignored): `status ended`, `ends_at = min(ends_at, now)`, revoke; "has ended" email once |
| `SUBSCRIPTION_EXTENDED` | `current_period_end = max(current, expiration_at_ms)` |
| `PRODUCT_CHANGE` | nothing (Apple applies a monthly↔yearly change at the next renewal, which arrives as `RENEWAL` with the new `product_id`); logged |
| `TRANSFER`, `TEST`, others | as today |

`ends_at` follows 2.5 (`+ GRACE` while it renews). App Store members manage billing in iOS: the
account page and `/api/membership` say so (`not_available`, reason `app_store`); `leave` and
`remove_partner` work for them.

### 2.12 Deleting an account

`deleteAccountData` (shared by the account page and `/api/app/account/delete`) first cancels, at
once, every `stripe_subscription` the user owns that isn't ended (`subscriptions.cancel`, no
refund of the time left), and stops with `subscription_cancel_failed` if Stripe can't be reached:
an account must never be deleted while its card keeps being charged. App Store subscriptions can't
be cancelled by us; the danger zone tells the user to cancel it in iOS first. The Stripe customer
is kept (invoices, disputes; privacy policy s.11).

---

## 3. Saved dates and limits

### 3.1 The rules

- **Free**: up to `FREE_SAVED_DATES` (3) rows, dates and trips together. The 4th save answers
  `403 { error: "limit_reached", limit: 3, used }`. Planning and the `#p=` link need no account and
  no save, as today.
- **Members** (`is_member`): unlimited. Their partner's rows are readable (RLS) and editable (API);
  their own are readable and editable by the partner. Only the owner of a row deletes it.
- **When a membership ends**: nothing is deleted. Sharing stops (RLS follows `couple_partner`).
  Each person's own rows stay readable; the **3 most recently updated** stay editable, the rest are
  read-only (`PATCH` → `403 read_only`) until they delete some or become members again. Deleting is
  always allowed. Reminders stop (members only).
- A partner who leaves, or is removed, keeps the rows they own.

### 3.2 The API (builder B; cookie or Bearer through `getCurrentUser`)

Reads go through the user's own client (`getSupabaseServerClient`: RLS decides), writes through the
service role after the checks below. Membership and partner come from `is_member` / `couple_partner`
(`db.rpc`), wrapped in `src/lib/saved-dates/couple.ts` and injected, so the logic is unit-tested
without a database.

| Route | Body / query | Answer |
| --- | --- | --- |
| `GET /api/saved-dates` | `?kind=date\|trip` optional | `200 SavedDatesList` |
| `POST /api/saved-dates` | `{ kind: "date", data: Plan, title? }` or `{ kind: "trip", data: { v: 1, tripId, depart?, note? }, title? }` | `201 { savedDate: SavedDate }`; a trip already saved: `200 { savedDate, existing: true }`; `400 invalid_input \| empty_plan \| unknown_trip`; `401`; `403 { error: "limit_reached", limit, used }`; `429` |
| `GET /api/saved-dates/[id]` | — | `200 { savedDate: SavedDate }`; `404 not_found` (also for rows the user can't see) |
| `PATCH /api/saved-dates/[id]` | `{ baseVersion?: number, data?, title?, remind? }`: `baseVersion` is required when `data` or `title` changes; a `remind`-only change needs none and leaves `version` alone (toggling a reminder never conflicts with an edit) | `200 { savedDate }`; `409 { error: "conflict", savedDate }` (someone saved first); `403 read_only`; `404`; `400` |
| `DELETE /api/saved-dates/[id]` | — | `200 { ok: true }`; `403 not_owner`; `404` |
| `GET` / `POST /api/saved-dates/remind-off?t=<signed token>` | — | the email's "turn off reminders for this date": no sign-in, the signed link is the permission; GET asks, POST turns them off (`src/lib/email/link-page.ts`, exactly as `/api/reminders/remove` does); a new `TokenPurpose` `"saved-date-reminder-off"` in `src/lib/lifecycle/links.ts` |

Validation: a date's `data` must be a `readPlan` plan with at least one stop (else `empty_plan`); a
trip's `tripId` must be `getTrip`'s (else `unknown_trip`); `depart` a `YYYY-MM-DD`, `note` ≤ 280;
`title` trimmed ≤ 80. The server derives `city`, `day` and `stops_count`. The free limit is
checked before inserting and again after (a double tap can't make a 4th: the loser is deleted and
answered `limit_reached`). `PATCH` writes with `.eq("version", baseVersion)` and `version:
baseVersion + 1`, `last_edited_by`, `updated_at`; no row back → `409` with the current one. Rate
limits: `POST` 30/hour, `PATCH` 600/hour, `GET` 120/minute, per user.

```ts
// src/lib/saved-dates/types.ts (builder B, first thing)
export type SavedKind = "date" | "trip";
export type SavedTripData = { v: 1; tripId: string; depart?: string; note?: string };
export type SavedPerson = { name: string | null; initial: string };
export type SavedDateSummary = {
  id: string; kind: SavedKind; title: string; city: string | null; day: string | null;
  stopsCount: number;
  /** A date's photo comes from its first named stop (the dates photo store); a trip's from its preset. */
  cover: { name: string; lat: number; lng: number; kind: PlaceKind } | null;
  ideaId: string | null; tripId: string | null;
  mine: boolean; owner: SavedPerson; lastEditedBy: SavedPerson | null;
  editable: boolean; remind: boolean; version: number; createdAt: string; updatedAt: string;
};
export type SavedDate = SavedDateSummary & { data: Plan | SavedTripData };
export type SavedDatesList = {
  items: SavedDateSummary[];               // own and the partner's, newest change first
  quota: { used: number; limit: number | null };   // limit null for members
  member: boolean;
  partner: SavedPerson | null;             // the other person, while sharing
};
export type SavedDatesError = "unauthenticated" | "invalid_input" | "empty_plan" | "unknown_trip" | "limit_reached"
  | "read_only" | "not_found" | "not_owner" | "conflict" | "rate_limited" | "not_configured";
```

`initial` is the first letter of the profile's name, else of the email; the email itself is never
returned.

### 3.3 The plan editor, linked to a saved date (builder B)

The working plan stays where it is (`ethos.dates.plan.v1`, `usePlan`, unchanged format). A saved
date is opened **into** it and linked: `localStorage["ethos.dates.saved.v1"] = { id, version,
synced, mine, ownerName }`, where `synced` is the plan JSON as last saved.

- **Open** (`/plan#s=<id>`: a hash, like `#p=`, so `/plan` stays static): fetch it; if the working
  plan has stops, isn't linked to this id and differs, confirm first ("This replaces the plan you
  were making on this device. It isn't saved."); write it into the working plan, link it, drop the
  hash (`replaceState`, as "Keep this plan" does). A read-only row opens in the non-editable view
  (like a received plan) with a banner, and isn't linked.
- **Autosave** (`useSavedPlanSync`, mounted in `PlanView` and in `DatesExplorer`, since stops are
  added from the map): signed in and linked, when the plan differs from `synced` → debounce 1.2 s →
  `PATCH` with `baseVersion`. `409` → take the server's copy into the working plan and toast
  "{name} changed this date: you're seeing the latest"; `403 read_only` → unlink, show the
  banner; `404` → unlink, toast; offline → "not saved yet", retry on the next change or on focus.
  On focus/visibility it re-reads the row and takes a newer version when nothing local is pending.
- **Unlink** wherever the working plan is replaced wholesale: "Clear the plan" (which, linked,
  becomes "Close this date", saying it stays in My dates), keeping a received plan, opening another
  saved date, and the map's "a place in another city starts a new plan" path.
- **Save** ("Save to my dates" in the plan's aside, own editable plan with stops): signed in →
  `POST` with a default title (the idea's title, else `where`, else "A date"), then linked; the
  aside then shows "Saved to my dates · {Saving… | All changes saved | Not saved yet}", a link to
  My dates and, for members with a day set, "Remind us the day before". Free and at the limit → the
  upsell sheet (`reason: "limit"`). Guest → the sign-in dialog: `AuthForm` (`mode="login"`,
  `next="/plan"`), with `sessionStorage["ethos.saveAfterSignIn"] = "plan"` so the plan saves itself
  once signed in; the plan is in `localStorage` and survives the round trip.
- `plan.send.private` becomes honest: "The plan is kept in this browser and travels inside the link
  itself. It's stored on our servers only if you save it to your account." (Spanish likewise.)

### 3.4 Everything else B builds

- **Save trip** on `/trips/[id]` (`SaveTripButton`, in the hero beside the facts): a toggle, "Save
  trip" / "Saved ✓ · Remove", same sign-in, limit and sheet rules (`next="/trips/<id>"`).
- **My dates** at `/my-dates` (in the `(app)` group, so the layout's sign-in redirect and the app
  shell apply; add `/my-dates` to `needsServerSession` in `src/proxy.ts`, which refreshes the
  session for the other `(app)` routes). Server-rendered first page from the `GET` logic, then client.
  Layout: a header ("My dates", "Dates and trips you've saved{, shared with {name}}", for free
  accounts "{used} of {limit} free saves" with a link to `/pricing#for-two`), then Airbnb-style
  cards, 1 column at 360px, 2 from `sm`, 3 from `lg`: a 4:3 photo (a date: its first named stop's
  photo through `requestPhoto`/`photoFor` in `src/components/dates/photo-store.ts`, else the idea's
  image, else the stop kind's art; a trip: `tripImageSm(trip.image)`), rounded 24px; over it a
  "Date"/"Trip" chip top-left and, on the partner's rows, their initial in a 28px avatar top-right
  ("From {name}"); under it the title (one line), "{city} · {day}" and "{n} stops" / "{n} days", a
  lock and "Read-only" when not editable, and a 44px "⋯" menu (Open, Rename, Remind us the day
  before (members), Delete with a confirm). A date opens `/plan#s=<id>`, a trip `/trips/<tripId>`.
  Empty state: the `envelope-ps` cutout, "No saved dates yet", "Plan a date on the map and save it
  here, or save a trip you like.", buttons to `/dates` and `/trips`. `robots: noindex`.
- **Navigation**: "My dates" (`common.myDates`) in the app shell's sidebar between "My gifts" and
  "Account", in the marketing menu sheet for signed-in visitors, and in the desktop header's
  `AuthStatus` from `xl` only (the bar already overflows at 1024px in Spanish). Check 360, 1024 and
  1280 in both languages.
- **The upsell sheet** (`SavedDatesUpsell`, a bottom sheet on phones, a dialog from `sm`): props
  `{ open; onOpenChange; reason: "limit" | "read_only" | "maps" | "reminders"; monthly: boolean;
  currency: Currency }`. A small card in the dusk colours (4.1) with the reason's title and body,
  both prices (`membershipAmount`; the monthly one only when `monthly`), a primary link to
  `/pricing?from=saved-dates#for-two` and a secondary one ("Manage my dates" → `/my-dates` for
  `limit`/`read_only`, else "Not now"). It sells nothing itself: no checkout from the sheet.
- **Open the whole date in Maps** (members; free visitors see it with a lock that opens the sheet
  with `reason: "maps"`): on the plan, own or received, with 2+ stops, a menu with Google Maps and
  Apple Maps. Pure `mapsRouteUrl(stops, "google" | "apple")` in `src/lib/dates/maps-route.ts`:
  Google `https://www.google.com/maps/dir/?api=1&origin=…&destination=…&waypoints=a|b&travelmode=walking`
  (walking only when every leg is within `WALK_KM`); Apple: check Apple's current Map Links
  documentation for multi-stop directions and use its waypoint form if it has one, else directions
  from the first stop to the last with the others as `+to:` destinations; test the URLs. The
  per-stop "Directions" stays free.
- **Reminders the day before** (members): a second phase in `/api/cron/reminders` (07:00 UTC),
  after "Remind me next year", within its time budget: rows with `remind`, `day` = tomorrow (UTC),
  `reminded_for` ≠ `day`, whose owner `is_member` → claim `reminded_for` → email the owner and the
  partner (each in their own language; 5.1) → release the claim if every send failed.
- The data export (`/api/account/export`) adds `savedDates` (own rows).
- Analytics (`src/lib/analytics/track.ts`): `saved_date_saved { kind, member }`,
  `saved_date_upsell { reason }`, `maps_opened { provider }`: no ids, no content.
- `docs/DATES.md`: a "Saved dates" section.

---

## 4. UI (builder C unless marked)

### 4.1 `/pricing`, redesigned: Ethos for Two is the main offer

The owner: "make the pricing page different, this is the main, make it a different colour, add the
assets, a better pricing tab". Order, top to bottom: the membership hero, the comparison, "Or buy a
single gift", the FAQ. The old `PageHeader` goes (the hero is the page's `h1`); `PassCard` and
`PricingOffers` are replaced; `FreeForever` becomes the comparison.

**A colour world of its own: "dusk".** The rest of the site is paper, rose and wine (`forest`); the
membership is the sky after the date: deep indigo with a peach horizon and gold starlight. It
matches the site's own planetarium photograph (`/dates/ideas/stars-and-planets.webp`) and the gold
felt star in the scraps. Tokens (in `src/app/globals.css`, next to the wine block; components use
the names, never a hex):

```css
:root {
  --brand-dusk: #171a3f;          /* the section */
  --brand-dusk-deep: #0e1030;     /* top of the sky */
  --brand-dusk-raised: #242a5e;   /* cards on it */
  --brand-moonlight: #e4e7ff;     /* secondary text on dusk (≈14:1) */
  --brand-horizon: #f4a58f;       /* the glow at the bottom edge (≈8.7:1 on dusk) */
  --brand-starlight: #f5cf6b;     /* the membership's buttons and accents (≈11:1 on dusk) */
  --brand-starlight-deep: #e3b54c;
}
```

plus `--color-dusk`, `--color-dusk-deep`, `--color-dusk-raised`, `--color-moonlight`,
`--color-horizon`, `--color-starlight`, `--color-starlight-deep` in `@theme inline`, a `bg-dusk-sky`
utility (indigo from the top, a soft horizon glow rising from the bottom edge) and a `btn-star`
utility (starlight fill, dusk text, the same press and hover motion as `btn-rose`). Text on dusk is
`cream`; secondary `moonlight`/80. Rose stays the rest of the site's call to action; gold is the
membership's, wherever it appears (pricing, the account section, the success page, the upsell
sheet, the emails' button stays the email layout's).

**The hero** (`MembershipHero`, `id="for-two"`, full-bleed `bg-dusk-sky`, starts under the floating
header like the trip pages do; `scroll-mt` for the anchor):

- Left column (all widths first): eyebrow "Ethos for Two" in starlight; `h1` EN "Every date you
  plan, kept for both of you." / ES "Cada cita que planeáis, guardada para los dos."; sub EN "One
  membership for the two of you: save every date and trip, plan them together on both your phones,
  and unlock every gift template and game pack." / ES "Una sola suscripción para los dos: guardad
  todas vuestras citas y viajes, planeadlos juntos desde vuestros dos móviles y desbloquead todas
  las plantillas de regalo y los packs de juegos."
- **The toggle** (the owner's "€4.99/month" · "€29.99/year — €2.50/month, save 50%"): a segmented
  control, `role="radiogroup"` of two `role="radio"` segments (arrow keys move, at least 56px tall,
  full width on phones), each two lines: "Monthly" over "€4.99 a month", "Yearly" over "€29.99 a
  year" (ES "Mensual" / "4,99 € al mes", "Anual" / "29,99 € al año"), yearly carrying a small
  starlight badge "Save {pct}%" (ES "Ahorra un {pct} %", from `yearlySavingPct`). Yearly is
  selected unless `?plan=monthly`; both segments are the same size and weight.
- **The price**, animated between plans (a short crossfade, none with reduced motion): yearly
  "€29.99 a year" and under it "That's €2.50 a month · save 50% on monthly" (`yearlyPerMonth`,
  `yearlySavingPct`); monthly "€4.99 a month" and "Billed monthly · cancel any time". "For both of
  you" beside the price. Every figure comes from the catalogue through `formatAmount` (check-prices).
- **The button** (`btn-star`, full width on phones): "Get Ethos for Two"; it calls
  `startCheckout({ product: "membership", plan, currency, locale, returnTo: "/account" })` and
  `track("pay_clicked", { product: "membership", plan, source: "pricing" })`. Under it, the exact
  terms, never hidden: monthly EN "{price} today, then every month until you cancel. Cancel any
  time from your account." / ES "{price} hoy y después cada mes hasta que canceles. Cancela cuando
  quieras desde tu cuenta."; yearly EN "{price} today, then every year until you cancel. We'll
  remind you a week before each renewal." / ES "{price} hoy y después cada año hasta que canceles.
  Te avisamos una semana antes de cada renovación."
- **What's in it**, six lines with starlight icons: unlimited saved dates and trips; planned
  together, shared and editable on both your phones; every gift template, with every extra; every
  game pack, for one sofa or two phones; a reminder the day before each date; open a whole date in
  Apple or Google Maps.
- **Right column** (below the button on phones, scaled down): a collage of the site's real assets,
  never an illustration: a `PhoneFrame` (≈240px) showing a mock of My dates (three cards with real
  images, e.g. `/dates/ideas/golden-hour-picnic.webp`, `/dates/ideas/museum-then-wine.webp`,
  `/trips/lisbon-slow-weekend-sm.webp`, and two initials as partner avatars); a tilted polaroid of
  `/dates/ideas/stars-and-planets.webp` captioned in `font-hand` ("Saturday, 8 pm"); a template
  poster (`/templates/constellations/poster.jpg`) as "every template"; three game-pack card backs
  (the pack shelf's gold, ocean and wine); and scraps: `star-felt` (three, small, gold on the
  indigo), `tag-tofrom` near the phone, `paper-couple` on the horizon line. Add those three to
  `CUTOUTS` in `src/components/marketing/home/cutouts.tsx` with their pixel sizes (176×178,
  536×280, 348×400). Decorative images are `alt=""`/`aria-hidden`; the mock's text is real text,
  in the page's language, and names no city in Spain (Lisbon, Paris, Rome, Copenhagen…).
- **Signed-in states** (from `useEntitlements()`, which gains `membership`): an owner sees, instead
  of the button, a starlight-edged card "You have Ethos for Two" + "{Monthly | Yearly} · renews on
  {date}" / "Ends on {date}" / "Your year runs until {date}" / "Through the App Store" / "Payment
  failed: update your card" and "Manage" → `/account#for-two`; a partner "You're in on your
  partner's Ethos for Two". A pass owner while subscriptions are off, in its last 30 days or with
  `?renew=pass`: "Renew for another year" (the same request; a year from its end).
- **The fallback look** (subscriptions off): no toggle; "€29.99 for a year" "for both of you";
  "Paid once · it doesn't renew by itself"; button "Get a year of Ethos for Two"; under it "One
  payment for 365 days. We'll email you two weeks before it ends." The rest of the hero is the same.
- `?from=` (`saved-dates`, `packs`, `account`) scrolls to the hero; `?plan=` preselects; `?renew=pass`
  keeps working (old emails).
- The dev server at :3300 is shared and runs with the switch off, so the page alone also reads
  `?subscriptions=on|off` **when `process.env.NODE_ENV === "development"`** (inlined at build, so
  it is dead code in production) to show either state for screenshots and e2e. Nothing else reads
  it; checkout still follows the real switch.

**The comparison** (`MembershipCompare`, on paper): EN "What's free, and what For Two adds" / ES
"Lo que es gratis y lo que añade For Two"; sub EN "Finding a date, planning it and sending it stays
free for everyone, with no account." Two columns, "Free" and "Ethos for Two" (that column tinted
dusk, gold checks), sticky column heads on phones, a real `<table>` with row headers:

| Row | Free | Ethos for Two |
| --- | --- | --- |
| Date ideas on a map, with the forecast and the sunset | ✓ | ✓ |
| Plan a date and send it as a link | ✓ | ✓ |
| Saved dates and trips | `FREE_SAVED_DATES` | Unlimited |
| Shared with your partner, editable on both phones | — | ✓ |
| A reminder the day before a date | — | ✓ |
| Open a whole date in Apple or Google Maps | — | ✓ |
| Gift templates | the free ones, named from the manifests | All {n}, with every extra |
| Game packs | the free decks | Every pack |
| Long-distance tools and the games | ✓ | ✓ |
| Price | Free, for good | {monthly} a month or {yearly} a year, for two (fallback: {yearly} for a year, paid once) |

**"Or buy a single gift"** (`SingleGifts`): EN "Or buy a single gift" / ES "O compra un regalo
suelto"; sub EN "Pay once and it's yours for good. No subscription." The three `PricingCards`
(restyled lighter: this section is secondary; the Everything card keeps its "Best value" but not
the wine block, which would compete with the hero), plus a "Make it special" card (€7.49, for The
Letter and Constellations: video, voice messages, 20 photos, scheduling, a password and no footer;
"Open The Letter" → `/create/the-letter`: it's sold in the editor), plus the gift card while it's
on sale. The upgrade-for-the-difference logic is unchanged. `/gifts` also renders `PricingCards`:
check it still looks right there.

**The FAQ** (`pricing.faq`, filtered like the gift card question with an `id` per switch state):
rewrite "Is this a subscription?" and "What is Ethos for Two?" for both states; add "How do I
cancel?", "What happens to our saved dates if we stop?", "Can my partner use it on their phone?",
"Can we switch between monthly and yearly?", "Can I change my mind after subscribing?" (14 days,
the days used are paid for); update "Refunds?" and "What are game packs?"; keep the rest.

Mobile first: 360px, 16px gutters, no sideways scroll in Spanish, 44px targets, the toggle and
button reachable with a thumb. Screenshot 360, 768 and 1280, both languages, both switch states,
signed out.

### 4.2 The account page: the membership section

`src/app/[locale]/(app)/account/page.tsx` loads `readMembership(db, userId, { locale, now, names })`
and renders `MembershipPanel` (`src/components/membership/membership-panel.tsx`, client) where the
pass section was, `id="for-two"`, on `bg-dusk` with a starlight accent:

- **Status**: "Monthly · €4.99 a month · renews on {date}" / "Yearly · …" / "Ends on {date}: you
  keep everything until then" + **Resume** / "Switches to monthly around {date}" + **Keep yearly**
  / "Your year runs until {date}" (pass; within 30 days: renew while subscriptions are off, else
  "carry on monthly or yearly from {date}" → `/pricing`) / "Through the App Store · renews on
  {date}. Manage it in your iPhone's Settings → your name → Subscriptions." / partner: "You're in on
  {name}'s Ethos for Two" + **Leave**.
- **Payment failed** (owner, `past_due`): a warning block "We couldn't take your last payment.
  Update your card by {endsAt} to keep Ethos for Two." + **Update card** (portal `update_card`);
  not running any more: "Ethos for Two is paused until the payment goes through."
- **Partner** (owner): joined → "{name} has joined" + **Remove**; not joined → the existing
  `InviteLink` ("Send this link to your partner").
- **Actions** (owner, `stripe_subscription`): **Manage billing** (portal `manage`: card, invoices,
  billing address); **Switch to yearly · save {pct}%** (monthly; the dialog shows the
  `preview_yearly` amount); **Switch to monthly** (yearly); **Cancel membership**.
- **Dialogs** (Radix, focus-trapped, the confirm button says exactly what happens):
  - Cancel: EN "Cancel Ethos for Two?" / "You both keep everything until {date}. After that nothing
    more is charged, your saved dates stay in your account, and gifts you've published stay
    online." / **Cancel membership** · **Keep it**. ES "¿Cancelar Ethos for Two?" / "Los dos lo
    conserváis todo hasta el {date}. Después no se cobra nada más, vuestras citas guardadas siguen
    en vuestra cuenta y los regalos publicados siguen en línea." / **Cancelar la suscripción** ·
    **Mantenerla**. (`past_due`: "It ends now, and the unpaid renewal isn't charged.")
  - Switch to yearly: EN "Switch to yearly?" / "You'll pay {amount} today: {yearly} for a year,
    minus {credit} for the rest of this month. It then renews every year on {date} until you
    cancel." (`credit` = yearly − `amountDue`, which is the unused part of the month only because
    the switch restarts the period: 2.7, `billing_cycle_anchor: "now"`.)
  - Switch to monthly: EN "Switch to monthly?" / "From around {date} you'll pay {monthly} a month
    instead of {yearly} a year, until you cancel. We switch a couple of days before your year ends
    and take off what's left of it, so nothing is lost."
  - Leave: EN "Leave {name}'s Ethos for Two?" / "You'll stop sharing saved dates with them, and the
    templates and packs it unlocks go from your account. Your own saved dates stay yours."
  - Remove: EN "Remove {name}?" / "They'll stop seeing your saved dates and lose what Ethos for Two
    unlocks. Your invite link changes, so you can invite someone else."
  - `requires_action` opens the returned URL; `payment_failed` says nothing changed and offers
    **Update card**.
- **Not a member**: "Unlimited saved dates, every template and game pack, for both of you.
  {monthly} a month or {yearly} a year." (fallback: "{yearly} for a year, paid once") + "See Ethos
  for Two" → `/pricing#for-two`.
- Purchases list: `money.product.membership` = "Ethos for Two"; each paid invoice is a line.
- In the iPhone app's web view (`data-app-hide`): prices and every billing button are hidden; a
  Stripe member sees "Manage your membership at tryethos.io/account" as plain text, no link.
- The danger zone (`src/components/dashboard/danger-zone.tsx`): "Deleting your account also cancels
  your Ethos for Two subscription at once; the time left isn't refunded. If you subscribed in the
  iPhone app, cancel it in your iPhone's Settings first." (ES likewise.)

### 4.3 The success page

`purchaseOutcome` gains `"membership"`. For it: EN title "Ethos for Two is on." detail "{Monthly |
Yearly}: renews on {date}. Send your partner the link below and it's on their phone too." (the
invite under the usual `mayReveal` rule; otherwise "We've emailed you the link for your partner").
A subscription still `incomplete` (a bank confirming): "Your payment is being processed. Ethos for
Two starts as soon as it's confirmed, and we'll email you." Buttons: **Plan your first date** →
`/dates` and **Go to your account**. A starlight check instead of the moss one. The pass keeps its
copy at the new price. The page reads the row by `purchase_id` (period end, plan, partner) with the
service role as it does for the pass, and checks the buyer with A's `sessionUserId`.

### 4.4 Everything else C touches

- Home hero fact (`platform.hero.facts.private`): a "Yours", b EN "plans stay on your phone unless
  you save them" / ES "los planes se quedan en tu móvil salvo que los guardes".
- `/for-two/join` and `JoinForm`: subtitle EN "Their Ethos for Two covers both of you: saved dates
  and trips shared on both your phones, every gift template and every game pack, for as long as it
  runs. It costs you nothing."; a features line for shared dates; "done" says "until {date}" only
  when `renews` is false, else "for as long as it runs"; the new error `has_own`, whose 409 also
  carries `role` ("owner" | "partner") and `endsAt`, because cancelling keeps a membership to its
  period end and "cancel yours first" never let anyone in: their own that renews ("…Ask your partner
  to join yours instead: your invite link is on your account page. If you cancel yours, you can join
  theirs once it ends."), their own that ends ("Your own Ethos for Two runs until {date}…, or join
  theirs once yours ends."), or another couple's ("…Leave it from your account page first, then
  open this link again."), each with a link to the account page.
- `src/components/games/pack-shelf.tsx`: the "every pack" link → `/pricing?from=packs#for-two`.
- `src/app/llms.txt/route.ts`: Ethos for Two as a membership (prices from the catalogue), and the
  Dates line: plans stay in the browser unless saved to an account.
- `src/components/pricing/offers.ts`: `CheckoutRequest.plan`; `checkoutErrorKey` maps
  `already_member` → `alreadyMember` ("You already have Ethos for Two: it's on your account
  page."), `payment_issue` → `paymentIssue` ("Your last payment didn't go through: update your card
  on your account page first."), `not_on_sale` → `notOnSale` ("That isn't on sale right now.
  Reload the page."); `joinErrorKey` maps `has_own` → `hasOwn`; `pricingFaq` filters by switch
  state.
- `src/components/pricing/entitlements.ts`: `parseMembership` (lenient, like `parsePass`).
- `src/i18n/client-namespaces.ts` (C owns it, and applies B's lines too): pricing layout +
  `membership`; checkout layout + `membership`; `(app)/layout` + `membership`, `savedDates`;
  `(marketing)/plan/layout` + `savedDates`, `auth`; `(marketing)/trips/layout` + `savedDates`,
  `auth`; `(marketing)/dates/layout` + `savedDates`. Add each path only once it exists in
  `messages/en.json` (the unit test fails on a path the catalogue lacks).

---

## 5. Emails and legal

### 5.1 Emails

All in the existing `EmailLayout`, both languages inline as the other lifecycle emails are, dates
through `emailDate`, amounts through `formatAmount`. Builder A: `src/emails/membership.tsx` and
senders in `src/lib/email/notify.ts`; builder B: `src/emails/saved-dates.tsx` and
`src/lib/email/saved-dates.ts` (on `sendEmail`).

| Email | When | To | Subject EN / ES |
| --- | --- | --- | --- |
| Membership welcome (the contract confirmation) | first payment of a subscription, by the call that claimed it | owner | "Welcome to Ethos for Two" / "Bienvenidos a Ethos for Two" |
| Yearly renewal reminder | 7 days before a yearly renewal (cron) | owner | "Ethos for Two renews on {date}" / "Ethos for Two se renueva el {date}" |
| Payment failed / confirm payment | `invoice.payment_failed` / `…_action_required`, once per invoice | owner | "Your Ethos for Two payment didn't go through" / "No hemos podido cobrar tu Ethos for Two" |
| Membership ended | Stripe or Apple ends a subscription (cancelled at period end, retries exhausted, expiration), once; never after a refund, dispute or withdrawal | owner | "Ethos for Two has ended" / "Ethos for Two ha terminado" |
| Date reminder (B) | the day before a saved date, members | owner and partner | "Tomorrow: {title}" / "Mañana: {title}" |
| Pass welcome, pass renewal (existing) | as today | owner | unchanged; the renewal's body, while subscriptions are on: "…to carry on after that, choose monthly or yearly from {date}" |

Body copy (EN; write the Spanish to match, in the site's voice):

- **Welcome**: heading "Ethos for Two is on." · "Unlimited saved dates and trips, shared between
  you; every gift template and every game pack; a reminder the day before each saved date. For you
  and one other person." · (partner not in) "Send this link to your partner. When they open it and
  sign in, it's theirs too:" + the link · plan line, monthly "Your plan: €4.99 a month, renewing on
  {date} and every month after that until you cancel." / yearly "Your plan: €29.99 a year, renewing
  on {date} and every year after that until you cancel. We'll email you a week before each
  renewal." · "Cancel any time from your account page: you keep everything until the end of the
  period you've paid for." · quiet: "At checkout you ticked: “{consent}” To withdraw within 14 days,
  reply to this email or use “Withdraw from a purchase” on our site: we refund what you paid, less
  the days you've used." (no tickbox: "You paid without ticking the box, so if you withdraw within
  14 days we refund you in full.") · button "Plan a date" → `/dates`.
- **Renewal reminder**: heading "Your year renews on {date}." · "On {date} we'll charge {amount}
  for another year of Ethos for Two, for both of you. There's nothing to do if you want to keep it."
  · (pending monthly) "On {date} it switches to monthly, as you asked: {monthly} a month until you
  cancel." · "If you'd rather not renew, cancel before then from your account: you keep everything
  until {date}, and nothing more is charged." · button "Manage Ethos for Two" → account.
- **Payment failed**: heading "We couldn't take your payment." · "Your card didn't go through for
  {amount}. Ethos for Two stays on for both of you until {date} while we try again; update your
  card before then to keep it." · button "Update my card" → `/account#for-two`. Action-required
  variant: "Your bank wants you to confirm the payment of {amount}. It takes a moment:" · button
  "Confirm the payment" → the invoice's `hosted_invoice_url`.
- **Ended**: heading "Ethos for Two has ended." · "Your saved dates and trips are still in your
  account, and gifts you've published stay online. The free plan edits your three most recent saved
  dates; the others stay readable until you delete some or come back." · button "Get Ethos for Two
  again" → `/pricing#for-two`.
- **Date reminder** (B): heading "{title} is tomorrow." · the stops in order ("19:00 · Name") and
  the note · button "Open the plan" → `/plan#s=<id>` · quiet: "You get this because reminders are
  on for this date. Turn them off: {link}".
- The pass receipt's consent line (`consentLine` for a pass) follows the service wording: "At
  checkout you ticked: “{consent}” You can still withdraw within 14 days of buying: reply to this
  email, and we'll refund what's left after the days you've used." (no tickbox: refunded in full).

### 5.2 Terms (`src/content/legal.ts`, builder C; English and Spanish; `LEGAL_UPDATED` to the day)

- **s.1 / intro**: saved dates are part of the Service.
- **s.6 What we sell**: drop "We don't sell subscriptions"; Ethos for Two is a subscription (or,
  while it's sold that way, a one-year pass), prices from the catalogue; creators earn on a
  membership's first payment only.
- **s.7 Ethos for Two**, rewritten: monthly or yearly, one payment for two; what it includes (the
  owner's list); it renews automatically at the end of each period at the price shown when you
  subscribed, until cancelled; we email a week before a yearly renewal; cancel any time from the
  account page (or the Stripe billing page it opens), and it runs to the end of the period paid
  for, with no refund for the rest of that period except under s.9/s.10; a failed payment is
  retried and the membership keeps running for up to 7 days; switching monthly→yearly takes effect
  at once with the unused part credited, yearly→monthly at renewal; **partner access**: one other
  account joins with the invite link; while you share, each of you can see and edit the other's
  saved dates and trips and sees the other's name; the partner can leave and the member can remove
  them at any time (the link then changes); if the member's account is deleted it ends for both;
  **price changes**: a new price applies to an existing membership only from a renewal at least 30
  days after we email you about it, and you can cancel before then; the one-year pass paragraph
  (paid once, 365 days, no renewal, the 14-day email) kept for the fallback; memberships bought in
  the iPhone app are sold and billed by Apple under its terms, and are cancelled in iOS.
- **s.9 Withdrawal**: Ethos for Two (monthly, yearly or the pass) is a digital service: you can
  withdraw within 14 days of subscribing or buying, without a reason; because you asked for it to
  start straight away (quote the three sentences through `consentSentence`), we refund what you paid
  minus an amount proportional to the days it ran until you told us; if you paid without ticking the
  box, in full. Cancelling (stopping renewals, s.7) is not withdrawing. The other products keep
  their wording. `tests/unit/legal.test.ts` checks every quoted sentence, the membership ones
  included.
- **s.10**: a full refund or a chargeback of the latest period ends the membership for both; a
  withdrawal ends it at once.
- **s.11 Dates, plans and trips**: saving is optional; free accounts keep 3 saved dates and trips,
  members any number; after a membership ends the 3 most recently changed stay editable and the
  rest read-only; we never delete a saved date unless you do or you delete your account; reminders
  the day before for members, off per date.
- **s.15**: deleting an account cancels a web subscription at once (time left not refunded); App
  Store subscriptions must be cancelled in iOS.

### 5.3 Privacy (same file)

- **s.1**: Stripe now also holds a customer record for members (name, email, billing address or
  country, the card through Stripe) and the subscription's status and invoices; we keep its
  identifiers, the plan, the period dates and whether it renews; emails: the membership welcome,
  the yearly renewal reminder, payment problems, the "has ended" email (service emails, part of the
  contract), and the day-before date reminder (off per date, or with its link).
- **s.3**: a plan stays in the browser unless you save it; a saved date or trip (its day, places
  with their names and positions, times, notes, the names you typed) is stored with your account
  until you delete it or your account; while you share a membership your partner can read and
  change your saved dates and sees your name; they stop when sharing ends.
- **s.7**: the analytics list adds "saving a date or a trip" and "opening a date in Maps".
- **s.9**: RevenueCat (processor, App Store purchases), Apple (independent controller for App Store
  billing).
- **s.11**: saved dates until deleted or account deletion; membership and invoice records as
  purchases (the accounts); the Stripe customer record kept for the same period, then deleted.

---

## 6. The work split, the contracts, the test plan

### 6.0 Order

Each builder first writes its contract files (minutes, not hours), so the others can import them:
**A**: `src/lib/pricing/products.ts` additions (2.2), `src/lib/membership/types.ts` (6.4),
`src/lib/supabase/types.ts` (1.8), the fake db; **B**: `src/lib/saved-dates/types.ts` (3.2), the
`savedDates` and `common.myDates` keys; **C**: the dusk tokens (4.1), the `membership` keys. Then
all three in parallel. Until a contract file lands, code against this document; a type error that
only the other builder's file fixes is expected and disappears at integration.

Shared files, edited with care: `messages/en.json` and `messages/es.json` (Edit tool only, re-read
first, only your namespaces: A none, B `savedDates` + `common.myDates` + `plan.send.private`, C
`membership`, `pricing`, `forTwo`, `money`, `platform.hero.facts`, `checkout`, `account`). No other
file is touched by two builders.

### 6.1 Builder A: billing and data (server)

Creates: `supabase/migrations/0014_membership.sql`; `src/lib/membership/types.ts`;
`src/lib/commerce/memberships.ts` (start, `applySubscriptionState`, summarise, `readMembership`,
`membershipContextOf`, the actions, leave/remove, pending switches, renewal reminders, App Store
subscription state); `src/lib/stripe/subscriptions.ts` (retrieve/normalise, ownership checks,
`ethosCustomerFor`, tagging, cancel, switch, preview, portal); `src/lib/stripe/events.ts`;
`src/app/api/stripe/portal/route.ts`; `src/app/api/membership/route.ts`;
`src/emails/membership.tsx`; `scripts/setup-billing-portal.mjs`; tests
`tests/unit/{stripe-shared-account,memberships,stripe-subscription-events,app-store-subscriptions,
migrations-membership}.test.ts`, `tests/unit/helpers/fake-stripe.ts`.

Edits: `src/lib/pricing/products.ts`; `src/lib/supabase/types.ts`; `src/lib/env.ts`
(`STRIPE_PORTAL_CONFIGURATION`); `src/lib/commerce/{passes,entitlements,plan,revoke,unlocks,db,
app-store,app-store-products}.ts`; `src/lib/stripe/{line-items,create-session,fulfil,recovery,
server}.ts`; `src/app/api/stripe/{checkout,webhook}/route.ts`; `src/app/api/for-two/join/route.ts`
(`{ ok, endsAt: string | null, renews }`, error `has_own` 409); `src/app/api/entitlements/route.ts`;
`src/app/api/cron/passes/route.ts`; `src/lib/auth/delete-account.ts`; `src/lib/email/notify.ts`;
`src/emails/{templates,lifecycle}.tsx`; `scripts/{check-prices,creator-payouts}.mjs`;
`tests/unit/helpers/fake-db.ts` and every existing test this breaks (`stripe-session`,
`stripe-fulfil`, `commerce-plan`, `commerce-passes`, `commerce-revoke`, `app-store`, `emails`,
`lifecycle-emails`, `app-catalog`, `app-purchases-routes`); `docs/STRIPE.md` (the rules R1–R11
replace "No subscriptions, ever", the new events, the portal, the script, the withdrawal procedure).

Priority if time runs short (last first to drop): App Store reconcile in the cron → invoice
tagging → the RevenueCat subscription events → everything else is required.

### 6.2 Builder B: saved dates

Creates: `supabase/migrations/0015_saved_dates.sql`; `src/lib/saved-dates/{types,validate,server,
couple,client,link,sync}.ts`; `src/lib/dates/maps-route.ts`;
`src/app/api/saved-dates/route.ts`, `src/app/api/saved-dates/[id]/route.ts`,
`src/app/api/saved-dates/remind-off/route.ts`; `src/app/[locale]/(app)/my-dates/page.tsx`;
`src/components/saved-dates/{my-dates-grid,saved-date-card,save-plan-panel,save-trip-button,
upsell-sheet,sign-in-dialog,maps-menu,remind-toggle}.tsx`; `src/emails/saved-dates.tsx`;
`src/lib/email/saved-dates.ts`; tests `tests/unit/{saved-dates,saved-dates-sync,maps-route,
migrations-saved-dates}.test.ts`, `tests/e2e/saved-dates.spec.ts`.

Edits: `src/components/dates/{plan-view,use-plan,dates-explorer}.tsx|ts`;
`src/app/[locale]/(marketing)/plan/page.tsx`; `src/app/[locale]/(marketing)/trips/[id]/page.tsx`;
`src/components/app/{app-shell,user-menu}.tsx`; `src/components/marketing/{auth-status,
menu-sheet}.tsx`; `src/proxy.ts`; `src/app/api/account/export/route.ts`;
`src/app/api/cron/reminders/route.ts`; `src/lib/lifecycle/links.ts`; `src/lib/analytics/track.ts`;
`docs/DATES.md`.

### 6.3 Builder C: pricing, account, success, legal, copy

Creates: `src/components/pricing/{membership-hero,membership-compare,single-gifts,
plan-toggle}.tsx`; `src/components/membership/{membership-panel,membership-dialogs}.tsx`;
`tests/e2e/pricing-membership.spec.ts`.

Edits: `src/app/globals.css`; `src/app/[locale]/(marketing)/pricing/page.tsx`;
`src/components/pricing/{pricing-offers,for-two,pricing-cards,offers,entitlements,checkout,
join-form,gift-card-offer}.ts|tsx`; `src/app/[locale]/(app)/account/page.tsx`;
`src/components/dashboard/danger-zone.tsx`; `src/app/[locale]/(marketing)/checkout/success/
{page,after-payment}.tsx`; `src/app/[locale]/(marketing)/for-two/join/page.tsx`;
`src/components/marketing/home/cutouts.tsx`; `src/components/games/pack-shelf.tsx`;
`src/app/llms.txt/route.ts`; `src/content/legal.ts`; `src/i18n/client-namespaces.ts`; tests
`tests/unit/{legal,money-offers,pricing}.test.ts`, `tests/e2e/money.spec.ts`; `docs/LAUNCH.md`
(what was built, migrations 0014/0015, the new variables, the webhook events, test script and
browser checks for the membership and saved dates); a note at the top of `docs/MONETIZATION.md`
(24 Sept: Ethos for Two became a subscription, docs/MEMBERSHIP.md).

### 6.4 The contracts

**Shared types** (`src/lib/membership/types.ts`, builder A):

```ts
import type { Currency, MembershipPlan } from "@/lib/pricing/products";
export type { MembershipPlan };
export type MembershipProvider = "stripe_pass" | "stripe_subscription" | "app_store" | "app_store_pass";
export type MembershipStatus = "incomplete" | "active" | "past_due" | "ended";
export type MembershipSummary = {
  provider: MembershipProvider;
  plan: MembershipPlan;                 // a pass is "yearly"
  status: Exclude<MembershipStatus, "ended">;
  running: boolean;                     // gives access right now
  isOwner: boolean;
  partnerJoined: boolean;
  partner: { name: string | null; initial: string } | null;   // the other person, once joined
  inviteUrl?: string;                   // owner only, while the place is empty
  periodEnd: string;                    // ISO: paid until (a pass: its end, renewals bought ahead counted)
  renews: boolean;                      // an active subscription with renewal on
  endsAt: string | null;                // ISO when access ends if nothing changes; null while it renews
  pendingPlan: MembershipPlan | null;
  manage: "stripe" | "app_store" | "pass" | null;   // null for the partner
  canSwitchToYearly: boolean;
  canSwitchToMonthly: boolean;
};
export type MembershipAction = "cancel" | "resume" | "preview_yearly" | "switch_to_yearly" | "switch_to_monthly" | "keep_plan" | "leave" | "remove_partner";
export type MembershipActionError = "unauthenticated" | "invalid_input" | "not_member" | "not_owner" | "not_partner"
  | "not_available" | "payment_failed" | "requires_action" | "rate_limited" | "stripe_failed" | "not_configured";
export type MembershipActionResponse =
  | { ok: true; membership: MembershipSummary | null }
  | { ok: true; preview: { amountDue: number; currency: Currency; periodEnd: string } }
  | { error: MembershipActionError; reason?: string; url?: string };
export type PortalFlow = "manage" | "update_card" | "cancel";
```

**Server functions others import** (builder A): `readMembership(db, userId, { locale, now, names?:
Db }): Promise<MembershipSummary | null>` (`src/lib/commerce/memberships.ts`); `sessionUserId(
session): string | null`, `readSession(session): Sold | null` with `Sold.plan: MembershipPlan |
null` (`src/lib/stripe/fulfil.ts`); `consentSentence(product, locale, options?: { plan?; currency?
})` (`src/lib/stripe/line-items.ts`); the catalogue exports of 2.2.

**Routes**: `POST /api/stripe/checkout` (2.3; errors `not_on_sale` 400, `already_member` 409,
`payment_issue` 409), `POST /api/membership` (2.7), `POST /api/stripe/portal` (2.7), `POST
/api/for-two/join` (`{ ok: true, endsAt: string | null, renews: boolean }`, `has_own` 409),
`GET /api/entitlements` (2.8), `/api/saved-dates*` (3.2).

**Component props**: `MembershipHero({ currency, paymentsEnabled, subscriptions, initialPlan,
highlight })`; `MembershipCompare({ currency, subscriptions, freeTemplates: string[],
templateCount })`; `SingleGifts({ currency, manifests, paymentsEnabled, giftCards, preselect,
openPick3, returnTo })`; `MembershipPanel({ membership: MembershipSummary | null, currency,
subscriptions })` (C). `SavedDatesUpsell({ open, onOpenChange, reason, monthly, currency })`,
`SaveTripButton({ tripId, title: string, monthly, currency })`, `MyDatesGrid({ initial:
SavedDatesList, monthly, currency })` (B).

**URLs between builders**: `/pricing?from=saved-dates|packs|account&plan=monthly|yearly#for-two`
(C reads it; B and C link to it); `/account#for-two` (C's section; A's emails and the portal return
there); `/my-dates` (B's page; B's nav and upsell sheet link it); `/plan#s=<id>` (B's; B's cards and
reminder email link it).

**Messages** (each builder only its own namespaces):

```
membership: {                       // C
  hero: { eyebrow, title, sub, monthly, yearly, save, perMonth, perYear, forBoth, yearlyNote, monthlyNote,
          cta, termsMonthly, termsYearly, passPrice, passNote, passCta, passTerms, renewCta },
  features: { saved, shared, templates, packs, reminders, maps },
  member: { title, monthlyRenews, yearlyRenews, ends, passRuns, appStore, paymentFailed, partnerIn, manage },
  compare: { title, sub, free, forTwo, rows: { ideas, plan, saved, shared, reminders, maps, templates, packs, ldr, price },
             values: { unlimited, freeTemplates, allTemplates, freeDecks, everyPack, freeForGood, priceSub, pricePass } },
  single: { title, sub, special: { name, blurb, cta } },
  account: { …status lines, actions, dialogs of 4.2… },
  success: { title, detail, emailed, processing, planFirst, toAccount }
}
savedDates: {                       // B
  page: { title, sub, subShared, quota, upgrade, empty: { title, sub, dates, trips } },
  card: { date, trip, stops, days, from, readOnly, menu: { open, rename, remind, delete, deleteConfirm } },
  save: { cta, saving, saved, synced, offline, open, close, closeConfirm, remind, defaultTitle,
          signIn: { title, sub }, trip: { cta, saved, remove } },
  upsell: { limit: { title, body }, read_only: { title, body }, maps: { title, body }, reminders: { title, body },
            cta, manage, notNow, perMonth, perYear },
  sync: { conflict, readOnly, gone },
  maps: { cta, google, apple },
  remindOff: { title, body, confirm, done },   // the signed link's page (server-rendered)
  email: { … the date reminder, if B keeps its copy in messages rather than inline … },
  errors: { … SavedDatesError … }
}
common.myDates                       // B
```

C also adds `money.product.membership`, `money.checkoutErrors.alreadyMember|paymentIssue|notOnSale`,
`money.join.errors.hasOwn`, and rewrites `pricing.*`, `forTwo.*`, `money.pass.*`,
`money.account.*` (pass lines), `money.success.*`, `platform.hero.facts.private`.

### 6.5 For the iPhone app (built separately; nothing here edits it)

What the app can rely on once this ships, for its own docs: `GET /api/entitlements` (and `POST
/api/app/purchases/sync`) carry `membership: MembershipSummary | null` beside the old `pass`, which
stays filled for any running membership; the saved-dates routes (3.2) and `POST /api/membership`
(2.7) take `Authorization: Bearer <supabase access token>` like every other route; App Store members
get `manage: "app_store"` and `not_available` (`reason: "app_store"`) for billing actions, while
`leave` and `remove_partner` work; the products are `xyz.secuora.ethos.fortwo.monthly` and
`.yearly` (auto-renewable, one subscription group), and the app must not sell them to anyone whose
`membership` is running (the web refuses `already_member` the same way). The one-time
`xyz.secuora.ethos.fortwo` keeps working as a year.

### 6.6 Tests

Unit (vitest, `npm test`; all must pass with `npm run typecheck` and `npm run lint`):

- **A, shared account (R1–R3, R6–R10), explicitly**: a scan of `src/` and `scripts/` finds no
  `supabase_user_id`; `membershipSessionParams` has `mode: "subscription"`, no
  `client_reference_id`, `metadata.app` and `subscription_data.metadata.app` = `"ethos"`,
  `ethos_user_id` and never `user_id`/`supabase_user_id`, no `discounts`/`trial_period_days`/
  `trial_end`, `allow_promotion_codes: false`, the catalogue amount and interval per plan and
  currency, `customer` only for a customer whose metadata matches, `customer_email` otherwise; one-
  time `sessionParams` carry `metadata.app` and no `customer`/`customer_creation`/`invoice_creation`;
  every `metadata` the code writes to Stripe (tagging a customer, a guest's subscription, an
  invoice) includes `app: "ethos"` and never `supabase_user_id`. **The webhook ignores foreign
  events**: another business's
  `customer.subscription.updated`/`.deleted`, `invoice.paid`, `invoice.payment_failed` (no marker,
  unknown id) and its subscription-mode `checkout.session.completed` (with `supabase_user_id` and a
  `client_reference_id`) write nothing, send nothing, call no Stripe write and answer 200.
- **A, memberships**: planning (switch on/off, `already_member`, `payment_issue`, `not_on_sale`,
  pass renewal); fulfilment of a subscription (signed in, guest, twice = once, emails once, invoice
  and payment intent on the purchase, tags); `applySubscriptionState` for all eight Stripe statuses,
  cancelling, `cancel_at`, grace, grant/revoke on each transition, the "ended" email once;
  `invoice.paid` rows (idempotent, €0 skipped, first invoice fills the checkout's row); failed
  payment claim; refunds (latest vs older period, dispute, partial with and without
  `requested_by_customer`, pass); actions (each allowed and refused case, `pending_if_incomplete`
  outcomes, un-cancel before switching); leave/remove (unlock rows, new invite code, `has_own`);
  cron (pending switch window, the yearly reminder claim, reconcile, pass email only for passes);
  summaries and `pass` back-compat; account deletion stops on a Stripe failure; App Store event
  sequences (purchase → renewal → unsubscribe → expiration; billing issue; Apple refund; a late
  `EXPIRATION` after a `RENEWAL` ignored; older `CANCELLATION` after `UNCANCELLATION` ignored);
  0014's SQL.
- **B**: validation (plans through `readPlan`, trips through `getTrip`), the free limit (3, the
  4th refused, the race loser deleted), members unlimited, partner edit, owner-only delete,
  read-only after the end (the 3 most recent editable), version conflict, summary covers and
  titles, the link/sync reducer (dirty detection, conflict, unlink), `mapsRouteUrl`, reminder
  selection and claim, 0015's SQL (RLS on, the policy's `(select public.couple_partner(…))`, both
  functions guarded by `coalesce((select auth.uid()), p_user)` and revoked from anon, cap trigger).
- **C**: `purchaseOutcome("membership")`, the new error keys, the FAQ filter per switch state,
  price helpers on the page (per month, saving %), legal quotes (the three membership sentences in
  both languages), no Spain or Madrid in the new copy, message parity, client namespaces.

End to end (Playwright against the running dev server: `PORT=3300 npx playwright test <spec>`;
never sign up or sign in: the dev server uses the production database): `/pricing` in both
languages and both switch states through `?subscriptions=on|off` (the hero, the toggle changes
price and terms, the request body is
`{ product: "membership", plan }` with no amount, no code field, the comparison, the single gifts,
the FAQ); `POST /api/saved-dates` and `/api/membership` answer 401 signed out; `/plan` shows "Save
to my dates" and opens the sign-in dialog signed out; `/trips/<id>` shows "Save trip"; `/my-dates`
redirects to sign-in. Screens at 360/768/1280, saved under
`/private/tmp/claude-501/-Users-adrians-Documents-mail/84f3e05c-3adc-41ad-b9a0-3c0d3212e912/scratchpad/membership/<you>/`.

Manual (the owner, Stripe test mode, docs/LAUNCH.md §7 gains these): subscribe monthly signed in
and yearly as a guest (the page shows "per month"/"per year", the tickbox and the text above the
button, no code field; the welcome email; the account section); the partner joins, both edit one
saved date on two phones; cancel and resume from the account; switch to yearly (the preview amount
equals Stripe's invoice); the portal (card, invoices, cancel) comes back to the account; cancel
immediately with a prorated refund in the Dashboard (ends for both); refund in full (ends); a
dispute (`4000 0000 0000 0259`, ends and cancels). Renewals and failed renewals are covered by the
unit tests; watch the first real ones in the logs.

---

## 7. For the owner: switching it on

1. **Migrations** 0014 and 0015 (SQL editor or `supabase db push`; each safe to run twice, additive).
   Both before deploying this code: saved dates need 0015, every membership write needs 0014.
2. **Stripe, test mode**: `node scripts/setup-billing-portal.mjs` → put the printed
   `STRIPE_PORTAL_CONFIGURATION` and `STRIPE_PRODUCT_FORTWO` in `.env.local` (and Vercel Preview).
   Add the five new events to the Ethos webhook endpoint (2.6). Run section 6.6's manual test.
3. **Check the account-wide settings, which the other businesses share** (nothing in the code
   changes them): Settings → Billing → Subscriptions and emails (whether Stripe itself emails
   customers about renewals, failed payments and receipts: if on, Ethos members get those too, with
   the account's name); Revenue recovery (the retry schedule and what happens after the last retry:
   any choice works); the default Customer portal (left alone). Receipts, the Apple Pay sheet and
   the Customer Portal's header show the account's public name, not "Ethos" (MONETIZATION M14).
4. **Tell the secuora and domainscan owner**: Ethos now creates subscriptions, all tagged
   `metadata.app = "ethos"`, never with `supabase_user_id` or a subscription `client_reference_id`;
   their handlers must keep ignoring them. secuora will log "Could not resolve user for customer"
   and write a `withdrawal_waivers` row with a null user for each Ethos subscription checkout.
   Ask domainscan's to confirm it acts only on its own customers or markers.
5. **Live**: `node scripts/setup-billing-portal.mjs --live` with the live key → the two variables
   in Vercel Production; the five events on the live endpoint; then `STRIPE_SUBSCRIPTIONS_ENABLED=
   true` and redeploy. Until then the site sells the €29.99 pass.
6. **App Store** (when the app ships): a subscription group "Ethos for Two" with the monthly and
   yearly products at the same level; the products in RevenueCat; webhook events on (all types).
7. **Lawyer**: (a) the pro-rata withdrawal wording and doing the refund by hand; (b) whether a
   monthly→yearly switch starts a new 14-day period; (c) yearly auto-renewal for consumers in
   countries that limit it (in Germany, since 2022, a contract past its first term may only renew
   for an indefinite period with one month's notice); (d) the 7-day renewal reminder; (e) showing a
   member's name and saved dates to their partner.

## 8. Not in this build

- Carrying a running pass over into a subscription (a subscription whose first charge is the
  pass's end, `billing_cycle_anchor`). Until then a pass holder subscribes once the year ends.
- Moving existing subscriptions to a new price (a script, after the 30-day notice the Terms promise).
  A catalogue change applies to new subscriptions only; existing ones keep their inline price.
- Limits on how often a partner can be changed.
- Real Stripe Prices and the portal's own plan switching: worth revisiting with an Ethos-only Stripe
  account (MONETIZATION M14), where R6 no longer applies.
- Offline editing of saved dates beyond "not saved yet, retries".
