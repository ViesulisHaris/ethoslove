# Deploying to Vercel

The repo is connected to Vercel; every push to `main` deploys. What the deployment still
needs from you is configuration, not code.

## 1. Environment variables (Vercel → Project → Settings → Environment Variables)

Fastest route: keep a gitignored `.env.vercel` with the real values (the repo ignores it) and
use **Import .env** on that page; tick Production and Preview. Otherwise copy these from
`.env.local`, for **Production** and **Preview**:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>`. Optional on Vercel: the code falls back to the project's production domain |
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase → Project settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same page |
| `SUPABASE_SERVICE_ROLE_KEY` | same page, server only |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys (test key first, live key when you go live). Products must be in the same mode as the key: `node scripts/stripe-create-test-products.mjs` creates the test-mode set |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | same page |
| `STRIPE_PRODUCT_*` | optional: `prod_…` ids that checkout files its lines under, for reporting. The amount always comes from `src/lib/pricing/products.ts` (docs/STRIPE.md) |
| `STRIPE_AUTOMATIC_TAX` | `true` in production (Stripe Tax must be set up first) |
| `STRIPE_WEBHOOK_SECRET` | after step 3 |
| `RESEND_API_KEY` | Resend → API keys (emails are skipped and logged until this exists) |
| `CRON_SECRET` | any long random string; protects every `/api/cron/*` route |
| `VIEWER_HASH_SECRET` | long random string that signs email links (reminder removal, unsubscribe) and seals the free-reply token in a gift's "send one back" link. The service key is used when it's unset, but then rotating that key voids every open reply link, so set it |
| `GIFT_CARDS_ENABLED` | leave unset: gift cards stay off sale until VAT on vouchers is settled. `true` shows the card on `/pricing` and lets checkout sell it; `/redeem` works either way |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | recommended (free tier): rate limits and "one recovery email per address a week" only hold across serverless instances with it |
| `NEXT_PUBLIC_PRICE_CURRENCIES` | unset: euros for everyone, as today. `eur,usd,gbp` (the owners' call, docs/marketing/LOCAL-PRICES.md): dollars in the US, pounds in the UK, euros everywhere else; each page is built once per currency and the terms say so. Inlined at build, so a change needs a redeploy |
| `REVENUECAT_SECRET_API_KEY` | the iPhone app's In-App Purchases: RevenueCat → Project → API keys → a **v1 secret** key (`sk_…`), server only. Lets `POST /api/app/purchases/sync` ask RevenueCat what a user bought (restores, a webhook that hasn't arrived). Unset: sync with `pull` answers 503 `not_configured`, and a credit only applies once the webhook has recorded it |
| `REVENUECAT_WEBHOOK_AUTH` | the exact Authorization value set on RevenueCat's webhook (step 7), e.g. `Bearer <long random string>`. Unset: the webhook answers 503 |

Google sign-in is always shown in the UI when Supabase is configured (magic link stays
available too). Apple is not offered for now.

Redeploy after adding them (Deployments → ⋯ → Redeploy).

## 2. Supabase URLs for the deployed domain

Authentication → URL configuration:

- Site URL: `https://<your-domain>`
- Redirect URLs (include wildcards so `?next=` fallbacks and local/prod both work):
  - `https://<your-domain>/auth/callback`
  - `https://<your-domain>/auth/confirm`
  - `https://<your-domain>/**`
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/**`
  (keep the localhost ones for development)

## 3. Stripe webhook

Developers → Webhooks → Add endpoint → `https://<your-domain>/api/stripe/webhook` with the
events `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.expired`, `charge.refunded` and `charge.dispute.created`. Paste the signing
secret into `STRIPE_WEBHOOK_SECRET` and redeploy. Full detail in `docs/STRIPE.md`; the launch
checklist is `docs/LAUNCH.md`.

Also set Settings → Business → Public details → **Terms of service URL** (docs/STRIPE.md §7).
Checkout asks every buyer to tick the withdrawal box, and Stripe refuses that box on an account
without the URL: checkout then falls back to a notice above the pay button (logged as `CHECKOUT
WITHOUT THE WITHDRAWAL TICKBOX`), and those buyers keep their 14-day right to cancel.

## 4. Cron

`vercel.json` schedules three daily jobs: `/api/cron/passes` (`0 6 * * *`: Ethos for Two renewal
emails and ended passes), `/api/cron/reminders` (`0 7 * * *`: "remind me next year") and
`/api/cron/unlock` (`0 8 * * *`). Once a day is the most the **Hobby** plan allows; a more frequent schedule makes every deployment fail instantly with a
link to Vercel's cron pricing page. Scheduled gifts don't depend on it: the recipient page
flips a gift to live (and emails you) the first time it is opened after its unlock time. On
Pro you can change the schedule to `*/5 * * * *`. Vercel sends `Authorization: Bearer
$CRON_SECRET` automatically once the variable exists.

## 5. Smoke test on the live URL

1. Sign in with a magic link (real inbox).
2. Create a gift from a free template, publish, open the link in a private window.
3. Pricing → Everything → pay with `4242 4242 4242 4242` (test keys) → publish a premium template.
4. Check the dashboard shows the open and any reaction you leave.

## 6. Going live with real payments

See `docs/STRIPE.md` → "Going live": the live keys, the live webhook secret, any live
`STRIPE_PRODUCT_*` ids, and a redeploy. Nothing in the code changes.

## 7. The iPhone app (App Store purchases, universal links)

The app is a separate project (`~/Developer/Ethos`); its contract with this site is that repo's
`docs/ARCHITECTURE.md`. What the site needs for it:

1. **Migration `supabase/migrations/0013_app_store.sql`**: four nullable columns on `purchases`
   (`store`, `store_product_id`, `store_transaction_id`, `store_environment`) and a unique index on
   `(store, store_transaction_id)`. Additive and safe to run twice, like 0009. Run it before the
   RevenueCat webhook is switched on: recording an App Store purchase needs the columns.
2. **RevenueCat**: products `xyz.secuora.ethos.template`, `.special`, `.everything`, `.fortwo`,
   `.pack.deep`, `.pack.distance`, `.pack.spicy` (`src/lib/commerce/app-store-products.ts` maps each
   to the website product it stands for). Restore behaviour **Keep with original App User ID**, so a
   restore under another account never moves a purchase (the site never moves one either). Webhook
   URL `https://<your-domain>/api/revenuecat/webhook`, with the Authorization header value you put in
   `REVENUECAT_WEBHOOK_AUTH`. Our database stays the truth for what someone owns; RevenueCat's own
   entitlements aren't read.
3. **Universal links**: `https://<your-domain>/.well-known/apple-app-site-association` is served from
   `public/.well-known/` as JSON (`next.config.ts`). It names the app as `6STLVMDPXB.xyz.secuora.ethos`
   and claims `/plan`, `/for-two/join`, `/trips/*` and `/templates/*` (and their `/es` twins), never
   `/g/*`. The App ID needs the Associated Domains capability with `applinks:<your-domain>`.

### Release blockers for the app

- **Sign in with Apple token revocation on account deletion.** Apple requires an app that offers
  Sign in with Apple to revoke the user's Apple tokens when they delete their account.
  `POST /api/app/account/delete` deletes everything on our side (`src/lib/auth/delete-account.ts`),
  but revoking with Apple (`https://appleid.apple.com/auth/revoke`) needs the Sign in with Apple
  private key (a `.p8` for the Services ID / the app's bundle id), which the site doesn't have yet.
  Add it, revoke in that route, and only then ship the app with Sign in with Apple.
