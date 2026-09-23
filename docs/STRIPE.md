# Stripe setup

The Stripe account is shared with other businesses (Migla.io and others), which shapes three
rules the code follows:

- **No subscriptions, ever.** Other businesses' webhooks act on subscription events. Every Ethos
  product is a one-time payment (`mode: "payment"`); the yearly pass is paid once for 365 days.
- **Ethos only fulfils its own sessions.** A session is Ethos's when its metadata carries a
  `purchase_id` and one of the product ids in `src/lib/pricing/products.ts`.
- **Every charge says `ETHOS`** on the bank statement (statement descriptor suffix).

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
| Ethos for Two, one year for two         | `pass`       | €29.00 |
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
- Copy the **Signing secret** into `STRIPE_WEBHOOK_SECRET`.

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
  of that server instance); that buyer just gets no abandoned-checkout email. **On this account
  Stripe refuses it** ("`consent_collection.promotions` is not available in your country", test
  mode, 23 Sept: the box is for US merchants only), so as things stand nobody can tick it and no
  recovery email is ever sent.
- Promotion codes are off on every Ethos checkout, whatever codes the account holds.
- Every session is headed "Ethos" with the site's icon (`branding_settings`). If Stripe ever refuses
  it, checkout retries without it and logs it.

## 8. Going live

1. Leave Test mode. Make sure the account is activated (legal entity, bank account, identity).
2. Developers → API keys (live): copy `sk_live_…` and `pk_live_…`.
3. Developers → Webhooks (live mode): the endpoint and the five events above; copy its secret.
4. Vercel → Environment Variables: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `STRIPE_AUTOMATIC_TAX=true`, and any `STRIPE_PRODUCT_*` you use. Redeploy.
5. Buy one template with a real card, refund it in the Dashboard, and check the unlock disappears.

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
   buyer (`src/lib/commerce/plan.ts`), writes a pending `purchases` row for a signed-in buyer, and
   creates the Checkout Session (`src/lib/stripe/line-items.ts`): the lines at the planned amounts,
   the metadata fulfilment trusts (no gift ids, names or notes), the withdrawal tickbox, Stripe's
   default 24-hour expiry with a recovery link, no promotion codes, the "Ethos" header, the `ETHOS`
   suffix and, when `STRIPE_AUTOMATIC_TAX=true`, automatic tax (`src/lib/stripe/create-session.ts`
   steps down from the tickbox, the marketing box or the branding rather than fail a sale).
2. `POST /api/stripe/webhook`: verifies the signature, then fulfils (`src/lib/stripe/fulfil.ts`:
   unlock rows, the pass year, the gift card, and the withdrawal sentence the buyer ticked, stored on
   the purchase in `terms_consent` / `terms_consent_at` (migration 0012) and quoted on the receipt),
   revokes on refund or dispute
   (`src/lib/commerce/revoke.ts`), or emails the recovery link for an expired session to a buyer who
   ticked the marketing box (`src/lib/stripe/recovery.ts`).
3. Publishing checks the unlock rows on the server. Nothing client-side is trusted.
