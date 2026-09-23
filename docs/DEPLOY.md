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
| `NEXT_PUBLIC_PRICE_CURRENCIES` | leave unset (euros only): the terms say we charge in euros |

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
