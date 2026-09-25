# Stripe setup

The Stripe account is shared with other businesses (secuora.net, domainscan and others), whose
webhooks receive every event on it, Ethos's included. secuora's takes the metadata key
`supabase_user_id` (on any session, customer, subscription or invoice) and a subscription session's
`client_reference_id` as its own user id, ends any trialing subscription whose card it has seen, and
pays affiliate commission on subscription invoices with a promotion code. Every product is a one-time
payment except Ethos for Two, which is a subscription (monthly or yearly) once
`STRIPE_SUBSCRIPTIONS_ENABLED=true`, and until then the one-time yearly pass. So every Ethos object
follows these rules (docs/MEMBERSHIP.md 2.1, where each is tested):

| # | Rule |
| --- | --- |
| R1 | The metadata key `supabase_user_id` is never written, anywhere. Ethos's is `ethos_user_id` (one-time sessions keep `user_id`, as before). |
| R2 | A subscription session never sets `client_reference_id`: its purchase id is `metadata.purchase_id`. |
| R3 | Every Ethos session, customer, subscription (`subscription_data.metadata`) and invoice carries `metadata.app = "ethos"`. Customers and invoices are tagged after checkout (Checkout can't set them). |
| R4 | The webhook acts only on Ethos's objects: sessions with our `purchase_id` and product (and `app` on a subscription session), subscriptions and invoices with the `app` marker (on the object or in `parent.subscription_details.metadata`) or a subscription id already in `couple_passes`. Anything else is answered 200 without another read or a write. No `customer.*` events are handled. |
| R5 | The Customer Portal always opens on Ethos's own configuration (`STRIPE_PORTAL_CONFIGURATION`). The account's default configuration is never read, changed or relied on. |
| R6 | No coupons, promotion codes, discounts or trials, and no standing Prices: every price is inline `price_data`. The only catalogue object Ethos makes on purpose is the price-less "Ethos for Two" Product. |
| R7 | A subscription goes on a Stripe customer only when Ethos made it for that very user (`metadata.app` and `metadata.ethos_user_id` checked); no customer is ever looked up by email. |
| R8 | Never a trial (secuora's trial guard would end it and charge at once). |
| R9 | `metadata.kind` is never `ai_credits` (secuora's credit packs). |
| R10 | One-time sessions never set `customer`, `customer_creation` or `invoice_creation`. |
| R11 | Nothing depends on an account-wide setting (the retry schedule, what happens after the last retry, Stripe's own emails): every subscription status is handled and Ethos sends its own emails. |

And, as before:

- **Ethos only fulfils its own sessions.** A session is Ethos's when its metadata carries a
  `purchase_id` and one of the product ids in `src/lib/pricing/products.ts` (and, for a
  subscription, `app = "ethos"`).
- **Every one-time charge says `ETHOS`** on the bank statement (statement descriptor suffix). A
  subscription has no suffix to add; with `STRIPE_PRODUCT_FORTWO` set, its charges carry that
  Product's descriptor, `ETHOS FOR TWO` (section 9).

Do everything once in **Test mode**, run the test script in `docs/LAUNCH.md`, then repeat in live
mode. Nothing in the code changes between the two except the keys.

## 1. Prices live in the code, not in Stripe

Checkout charges the amount from the catalogue in `src/lib/pricing/products.ts` with Stripe
`price_data` (VAT included, `tax_behavior: "inclusive"`). The price on the page is the price
charged by construction, and no Stripe Price has to be kept in step with it. The old
`STRIPE_PRICE_*` variables are no longer read.

| Product                                 | Id           | EUR    |
| --------------------------------------- | ------------ | ------ |
| One template                            | `single`     | €9.99  |
| Pick three                              | `pick3`      | €14.99 |
| Everything                              | `everything` | €24.99 |
| Make it special (free templates only)   | `extras`     | €7.49  |
| Every other template, added at checkout | bump         | Everything minus the line it rides on: +€15.00 on a single, +€17.50 on Make it special |
| Ethos for Two, one year for two, paid once (while subscriptions are off) | `pass` | €29.99 |
| Ethos for Two, monthly subscription for two (while `STRIPE_SUBSCRIPTIONS_ENABLED=true`) | `membership`, plan `monthly` | €4.99 a month |
| Ethos for Two, yearly subscription for two (same) | `membership`, plan `yearly` | €29.99 a year |
| Game pack                               | `pack`       | €2.99  |
| Gift card "Give Everything"             | `giftcard`   | €24.99, only while `GIFT_CARDS_ENABLED=true` |
| Upgrade to Everything                   | `upgrade`    | €24.99 minus what was paid, at least €4.99 |

There are no discounts and no codes. Every Ethos session and its recovery set
`allow_promotion_codes: false`: the account is shared, and other businesses' codes (LAUNCH40,
WELCOME20…) are live on it. Creators are credited through their personal link (`?ref=c-<code>`) and
paid a commission by us; a reply to a paid premium gift is free without checkout.

## 2. Products (optional, for reporting only)

Without any configuration each line is created inline, named "Ethos: …", with the tax code
`txcd_10000000` (general electronically supplied services). That is enough to sell.

To file sales under existing Stripe Products instead (tidier reports), create them with
Product catalog → **Add product**, name prefixed **Ethos**, tax category **General –
Electronically Supplied Services**, and set any of these to the `prod_…` id:

```
STRIPE_PRODUCT_SINGLE=prod_…
STRIPE_PRODUCT_PICK3=prod_…
STRIPE_PRODUCT_EVERYTHING=prod_…
STRIPE_PRODUCT_EXTRAS=prod_…
STRIPE_PRODUCT_PASS=prod_…
STRIPE_PRODUCT_PACK=prod_…
STRIPE_PRODUCT_GIFTCARD=prod_…
STRIPE_PRODUCT_UPGRADE=prod_…
STRIPE_PRODUCT_BUMP=prod_…
STRIPE_PRODUCT_FORTWO=prod_…   # made by scripts/setup-billing-portal.mjs (section 9), not by hand
```

A price on those products is never used: the amount always comes from the catalogue.

Only **English** checkouts are filed under these Products, and Stripe's page shows an English buyer
the Product's own name and description, so write them for buyers and keep them true to `/pricing`
(pick three is "any three templates, free or premium", not "premium templates"). A Product can't be
translated, so a **Spanish** checkout's line is always made inline with the catalogue's Spanish name,
and carries the Product's id as `stripe_product` in its product metadata for the reports. Every
session also sets `locale` to the site's language, so Stripe's own words (Email, Pay, the card form)
match the page the buyer came from rather than their browser's language.

`node --env-file=.env.local scripts/check-prices.mjs` checks every price written in the site's
copy against the catalogue and, when a Stripe key is set, that each `STRIPE_PRODUCT_*` id names an
active product (read-only on both sides).

## 3. Keys → `.env.local`

Developers → API keys (test mode):

```
STRIPE_SECRET_KEY=sk_test_…             # server only, never NEXT_PUBLIC
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…           # section 6
STRIPE_AUTOMATIC_TAX=true               # section 5; true in production
STRIPE_PORTAL_CONFIGURATION=bpc_…       # section 9, printed by scripts/setup-billing-portal.mjs
STRIPE_SUBSCRIPTIONS_ENABLED=true       # Ethos for Two as a subscription; unset, the one-time pass
```

## 4. Statement descriptor (once per account)

Settings → Business → Public details → **Statement descriptor**. The code appends the suffix
`ETHOS` to the account's short descriptor (shown as `MIGLA* ETHOS`-style). The shortened
descriptor must be set and the total must stay under 22 characters, or Stripe rejects the
suffix at checkout.

## 5. Tax (on in production)

Settings → Tax:

1. Set the origin address, add the Latvian VAT registration and the **OSS (One-Stop Shop)**
   registration for EU sales.
2. Turn on Stripe Tax, and set `STRIPE_AUTOMATIC_TAX=true` in production.

Prices are VAT-inclusive, so Stripe carves the VAT out of €9.99 rather than adding it on top;
every buyer pays the price shown.

## 6. Webhook

Developers → Webhooks → **Add endpoint** (or edit the existing one):

- Endpoint URL: `https://<your-domain>/api/stripe/webhook`
- Events:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.expired` (new: the abandoned-checkout email)
  - `charge.refunded`
  - `charge.dispute.created`
  - Ethos for Two as a subscription (add them before `STRIPE_SUBSCRIPTIONS_ENABLED=true`):
    `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`,
    `invoice.payment_failed`, `invoice.payment_action_required`
- Copy the **Signing secret** into `STRIPE_WEBHOOK_SECRET`.

Every subscription and invoice event is re-read from Stripe before anything but its ownership is
read (`src/lib/stripe/events.ts`), so the endpoint's API version doesn't matter and neither does the
order events arrive in: one function sets a membership from the subscription as it is now
(`applySubscriptionState`, docs/MEMBERSHIP.md 2.5). Each paid invoice becomes a `purchases` row (the
first is the checkout's own purchase), a renewal Stripe can't collect keeps the membership running
for a week while Stripe retries and emails the owner once, and a membership that runs out emails
them once too.

Only one deployment should own this endpoint at a time: the old site's webhook also fulfils
`single`/`pick3`/`everything` sessions and sends its own receipt, so two live endpoints would mean
two receipts. Grants are safe to repeat, so nothing is unlocked twice either way.

The webhook answers 500 when a fulfilment might pass on a second try, so Stripe retries it for
days. Until the webhook exists, the success page fulfils the purchase itself by re-reading the
session from Stripe, so local testing works without the Stripe CLI. In production the webhook is
still required: it handles refunds, disputes, expired checkouts and payments that finish after
the buyer closed the tab.

## 7. Checkout settings worth switching on

- Settings → Checkout & Payment Links: Apple Pay, Google Pay and Link.
- Settings → Payment methods: cards plus iDEAL, Bancontact and SEPA for EUR buyers.
- Settings → Customer emails: "Successful payments" on. Stripe sends its receipt; the app sends
  its own confirmation.
- Settings → Business → Public details → **Terms of service URL**: `https://tryethos.io/legal/terms`.
  Every session asks the buyer to tick the withdrawal box (`consent_collection.terms_of_service:
  "required"`, worded by `custom_text.terms_of_service_acceptance`), and Stripe refuses that box on an
  account without a terms URL. Checkout then retries the same session with the old notice above the
  pay button and logs `CHECKOUT WITHOUT THE WITHDRAWAL TICKBOX`: the sale goes through, but that buyer
  keeps the 14-day right to cancel. **The account is shared**: that URL is the whole account's, and
  Stripe can show it on the other businesses' checkout pages and receipts too (a footer link). Agree
  it with them first, or keep the fallback until Ethos has an account of its own (MONETIZATION M14).
  **Some terms URL is already set**: the test-mode check on 23 Sept got the required tickbox, which
  Stripe only allows with one. Find out whose terms it is (Settings → Business → Public details): the
  tickbox label is ours and links to `/legal/terms` either way, but Stripe may also show the account's
  URL in the checkout page's footer, so an Ethos buyer could see another business's terms there.
- Checkout's marketing-consent box (`consent_collection.promotions`) is requested on every
  session. If the account can't show it, checkout retries without it (and stops asking for the life
  of that server instance). **On this account Stripe refuses it** ("`consent_collection.promotions`
  is not available in your country", test mode, 23 Sept: the box is for US merchants only), so nobody
  can tick Stripe's box.
- So **no abandoned-checkout email goes out** here. `checkout.session.expired` sends one only when
  `consent.promotions === "opt_in"`, an email is known, the address isn't in `email_optouts`, nothing
  was paid since and the address had none this week (`src/lib/stripe/recovery.ts`). Our own opt-in
  box under the pay button was tried and removed (23 Sept): no checkout asks that there.
- Promotion codes are off on every Ethos checkout, whatever codes the account holds.
- Every session is headed "Ethos" with the site's icon (`branding_settings`). If Stripe ever refuses
  it, checkout retries without it and logs it.

## 8. Refunds and withdrawals (Ethos for Two)

A refund of a one-time product takes back what it unlocked, as before. For Ethos for Two:

- **A dispute** on any of its payments ends the membership now, for both people, and the webhook
  cancels the subscription at Stripe at once.
- **A full refund** of the payment for the period it is in (the latest one; for a pass, its own
  year) ends it the same way; refunding an older period changes nothing else.
- **A withdrawal within 14 days** (the buyer asked for it to start straight away, so they pay for
  the days used): for a subscription, Dashboard → the subscription → **Cancel subscription →
  Immediately → Refund last payment: prorated**; for a pass, refund the prorated amount (price × days
  left / 365) with the reason **Requested by customer**. The webhook ends it for both, keeps the
  payment as paid, and puts no gift back to draft (the days used were paid for). A buyer who paid
  without the tickbox (the fallback notice) is refunded in full.
- Any other partial refund is a goodwill gesture and changes nothing.

None of these sends the "Ethos for Two has ended" email: nobody who asked for their money back is
told to come back.

## 9. The Customer Portal and the "Ethos for Two" Product

`node scripts/setup-billing-portal.mjs` (test mode first; a live key needs `--live`) makes or updates,
idempotently, the two Stripe objects subscriptions need, found by their own metadata and never
anything else:

1. **Ethos's portal configuration**: cancel at the end of the period (no survey), update the card,
   invoices, billing name and address; no plan switching (monthly → yearly happens on our account
   page, with an inline price; yearly → monthly at the renewal, by the daily job). The account's
   default configuration is left alone.
2. **The "Ethos for Two" Product**, with no Price, the digital-services tax code and the statement
   descriptor `ETHOS FOR TWO`.

It prints `STRIPE_PORTAL_CONFIGURATION` and `STRIPE_PRODUCT_FORTWO`: put them in `.env.local` and
Vercel Preview (test), then in Vercel Production (live). Without the first, `POST /api/stripe/portal`
answers 503 rather than open another business's portal.

## 10. Going live

1. Leave Test mode. Make sure the account is activated (legal entity, bank account, identity).
2. Developers → API keys (live): copy `sk_live_…` and `pk_live_…`.
3. Developers → Webhooks (live mode): the endpoint and the events above; copy its secret.
4. Vercel → Environment Variables: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `STRIPE_AUTOMATIC_TAX=true`, and any `STRIPE_PRODUCT_*` you use. Redeploy.
5. Buy one template with a real card, refund it in the Dashboard, and check the unlock disappears.
6. Ethos for Two as a subscription, once docs/MEMBERSHIP.md section 7 is done (migrations 0014 and
   0015, the test-mode run, the owners of the other businesses told): `node
   scripts/setup-billing-portal.mjs --live`, the two variables it prints, the five subscription
   events on the live endpoint, then `STRIPE_SUBSCRIPTIONS_ENABLED=true` and redeploy. Until then
   the site sells the €29.99 one-time year.

Keep the test keys in `.env.local`, so local development keeps using the sandbox.

## Guest checkout

Buyers don't need an account before paying (only the upgrade does: its price depends on what they
paid before). A guest session carries `metadata.guest = "1"`; after payment, fulfilment (webhook or
success page, whichever runs first) finds or creates the user from the email Stripe collected,
records the paid purchase and hands over what it bought. A pass invite or a gift card code is shown
on the success page only to the signed-in buyer, or to a guest whose account that checkout created
(while the page may still sign them in); otherwise it goes by email only.

## What the code does with all of it

1. `POST /api/stripe/checkout` (contract C1): checks the request against the catalogue and the
   buyer (`src/lib/commerce/plan.ts`: Ethos for Two, `{ product: "membership", plan }`, is a
   subscription or the one-time year depending on `STRIPE_SUBSCRIPTIONS_ENABLED`, and never a second
   one: `already_member`, `payment_issue`), writes a pending `purchases` row for a signed-in buyer, and
   creates the Checkout Session (`src/lib/stripe/line-items.ts`; a subscription's is
   `membershipSessionParams`, under the rules above): the lines at the planned amounts,
   the metadata fulfilment trusts (no gift ids, names or notes), the withdrawal tickbox, Stripe's
   default 24-hour expiry with a recovery link, no promotion codes, the "Ethos" header, the `ETHOS`
   suffix and, when `STRIPE_AUTOMATIC_TAX=true`, automatic tax (`src/lib/stripe/create-session.ts`
   steps down from the tickbox, the marketing box or the branding rather than fail a sale).
2. `POST /api/stripe/webhook`: verifies the signature, then (`src/lib/stripe/events.ts`) fulfils
   (`src/lib/stripe/fulfil.ts`: unlock rows, the pass year, the membership, the gift card, and the
   withdrawal sentence the buyer ticked, stored on the purchase in `terms_consent` /
   `terms_consent_at` (migration 0012) and quoted on the receipt or the membership's welcome), keeps
   a subscription's membership in step with Stripe (`src/lib/commerce/memberships.ts`), revokes on
   refund or dispute (`src/lib/commerce/revoke.ts`), or emails the recovery link for an expired
   session to a buyer who ticked Stripe's marketing box (`src/lib/stripe/recovery.ts`).
3. `POST /api/membership` (cancel, resume, switch plans, leave, remove a partner) and
   `POST /api/stripe/portal` (card, invoices, cancelling in Stripe's portal) manage a membership; the
   daily `/api/cron/passes` re-reads subscriptions whose period has passed, makes the yearly →
   monthly switches owners asked for, and emails a week before each yearly renewal.
4. Publishing checks the unlock rows on the server. Nothing client-side is trusted.
