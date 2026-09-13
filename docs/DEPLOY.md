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
| `STRIPE_PRODUCT_SINGLE` / `STRIPE_PRODUCT_PICK3` / `STRIPE_PRODUCT_EVERYTHING` | the three `prod_…` IDs |
| `STRIPE_WEBHOOK_SECRET` | after step 3 |
| `RESEND_API_KEY` | Resend → API keys (emails are skipped and logged until this exists) |
| `CRON_SECRET` | any long random string; protects `/api/cron/unlock` |

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
`checkout.session.async_payment_failed`, `charge.refunded`. Paste the signing secret into
`STRIPE_WEBHOOK_SECRET` and redeploy. Full detail in `docs/STRIPE.md`.

## 4. Cron

`vercel.json` schedules `/api/cron/unlock` once a day (`0 8 * * *`). That is the most the
**Hobby** plan allows; a more frequent schedule makes every deployment fail instantly with a
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

See `docs/STRIPE.md` → "Going live": six Vercel variables change (live keys, live product IDs,
live webhook secret) and a redeploy. Nothing in the code changes.
