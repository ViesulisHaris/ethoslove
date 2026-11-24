# Email from tryethos.io

Two kinds of email leave the product, and they need the domain set up once.

| Kind | Sent by | Examples |
| --- | --- | --- |
| Auth emails | Supabase (via your SMTP) | sign-in link + 6-digit code, confirm signup |
| Product emails | the app, via Resend | welcome, "your gift was opened", reactions, receipts, the monthly idea (off until `MONTHLY_IDEA_EMAILS` is set) |

Both go out as `Ethos <hello@tryethos.io>` once the steps below are done. Replies land on the
contact address, `support@secuora.xyz` (`BRAND.supportEmail`), which is also the one shown in
the footer and the legal pages.

## 1. Resend (10 minutes, free)

1. Create an account at resend.com, then **Domains → Add domain → `tryethos.io`**.
2. Resend shows three DNS records (two TXT for DKIM/SPF, one MX for bounces). Add them at
   **One.com → DNS settings for tryethos.io**, exactly as shown. Verification usually completes
   within a few minutes; click Verify in Resend.
3. **API keys → Create** with "Sending access". Put it in `.env.local` and in Vercel as
   `RESEND_API_KEY`, plus `EMAIL_FROM="Ethos <hello@tryethos.io>"`.

Product emails work from this point.

## 2. Supabase auth emails

Supabase's default sender (`noreply@mail.app.supabase.io`) is fine for testing but is
rate-limited to a few emails an hour and looks like Supabase, not Ethos.

**Option A, run the script (recommended).** Create a personal access token at
supabase.com/dashboard/account/tokens, then:

```bash
SUPABASE_ACCESS_TOKEN=sbp_… node scripts/supabase-apply-auth-email.mjs
```

It uploads the four branded templates in `supabase/templates/` (each includes the 6-digit
`{{ .Token }}` the sign-in page asks for) and, if `RESEND_API_KEY` is in `.env.local`, switches
Supabase to Resend's SMTP and raises the send limit.

**Option B, by hand.** Supabase → Authentication → Emails:

- *SMTP settings*: enable custom SMTP. Host `smtp.resend.com`, port `465`, user `resend`,
  password = the Resend API key, sender email `hello@tryethos.io`, sender name `Ethos`.
- *Templates*: paste each file from `supabase/templates/` into the matching template
  (Magic Link, Confirm signup, Reset password, Change email address) with the subjects from
  `supabase/templates/subjects.json`.
- *Rate limits*: raise "emails sent per hour" (custom SMTP defaults to 30).

## Why the first email said "Confirm your email address"

Signing in with an address Supabase has never seen creates the account, and Supabase sends the
**Confirm signup** template for that first email. Every later sign-in uses **Magic Link**. Both
templates above include the code and the button, so the experience is the same either way.
