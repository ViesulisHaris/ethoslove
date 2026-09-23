# Launch: new prices, Ethos for Two, gift cards, creators and lifecycle emails

Everything below was built on 2026-09-23 in seven areas and then integrated. Nothing has been
deployed, no migration has been applied, and no live Stripe call or email has been made. This file
is the checklist to get it live: what changed, what to apply and set, in what order, and how to test
every money flow by hand in Stripe test mode.

## 1. What was built

**Commerce (server).** One catalogue, `src/lib/pricing/products.ts`, is the only place a price lives;
checkout charges it with Stripe `price_data`, VAT included, so the price shown is the price charged.

| Product | EUR | Notes |
| --- | --- | --- |
| One template | €9.99 | forever |
| Pick three | €14.99 | forever |
| Everything | €24.99 | every template, forever |
| Make it special | €7.49 | a free template (The Letter, Constellations) gets its paid extras (video, voice note, 20 photos, scheduling, a password, no footer), forever |
| Order bump | +€15.00 on a single, +€17.50 on Make it special | "Add every other template, forever", unticked; always takes the order to exactly €24.99; not shown when the buyer's upgrade is cheaper |
| Upgrade to Everything | €24.99 − what was paid, at least €4.99 | signed-in buyers who own singles, pick three or Make it special |
| Ethos for Two | €29 | a yearly pass paid once, 365 days, for the buyer and a partner; no auto-renewal |
| Game pack | €2.99 | or included in the pass |
| Gift card "Give Everything" | €24.99 | built but **off** until `GIFT_CARDS_ENABLED=true` (voucher VAT); `/redeem` works either way |

USD and GBP amounts are set too ($11.99 / $17.99 / $29.99 / $8.99; £8.99 / £12.99 / £21.99 / £6.49)
for later; only euros are shown and charged (`CHARGED_CURRENCIES`).

There are **no discounts and no codes**: every Ethos checkout sets `allow_promotion_codes: false`
(sessions and recovery), because the shared account's other businesses have live codes. A creator is
credited only through their personal link (`?ref=c-<code>`, matched to `creators.code`), earns 30% after
VAT and refunds, and never on their own purchases. Someone who received a paid premium gift sends one
back in the same template **free**, footer on (one free reply per gift, proven by a signed token in the
"send one back" link; `free_replies`). Every buyer ticks the withdrawal box on Stripe's page; the
sentence is stored on the purchase and repeated on the receipt. Checkouts expire after Stripe's default
24 hours; a buyer who ticked our "email me one link" box under the pay button (or Stripe's marketing
box, where Stripe shows it) gets one recovery email. Stripe's page is headed
"Ethos" with the site's icon. Refunds and disputes take back everything a purchase granted, for both
people on a pass. Code: `src/lib/commerce/*`, `src/lib/stripe/*`, `src/app/api/stripe/*`,
`/api/entitlements`, `/api/gift-cards/redeem`, `/api/for-two/join`, `/api/cron/passes`,
`scripts/add-creator.mjs`, `scripts/creator-payouts.mjs`.

**Commerce (pages).** The publish-sheet paywall (single, Make it special, Everything or the upgrade,
the unticked bump, pick three, the free reply), `/pricing` (three plans, pass, gift card when on sale,
FAQ), the success page (partner invite, gift card code), `/redeem`, `/for-two/join`, and the account
page (pass status and invite, upgrade button, game packs, gift cards bought, links to reminders and
redeem).

**Lifecycle emails.** Pass welcome and renewal reminder (14 days before), gift card email, checkout
recovery with one-click unsubscribe, "they opened it" with the next gift, and "Remind me next year"
(the share screen saves a birthday or anniversary; `/account/reminders`; a daily job emails nine
days before). Terms and privacy rewritten for all of it, in English and Spanish.

**Affiliate links.** Aviasales, Tiqets and Auto Europe through Travelpayouts deep links
(`src/lib/trips/partners.ts`): flight finder, trip tickets and car hire, the place sheet, plans,
meet in the middle, city pages and the share screen of a trip gift. Every one opens in a new tab with
`rel="sponsored"` and a commission line beside it. No script, no cookie on our side.

**Growth.** Home hero picks "gift first" for visitors from social refs; the watermark links to its
template; the end of a paid premium gift says "The first reply is free"; `/creators` explains the programme.

**Games.** Three packs of 40 cards (After a year, Miles apart, After dark 18+) in four games,
checked on the server before any card is sent; an end card on all seven games.

**City pages.** 31 cities at `/dates/<city>` in both languages, in the sitemap. None in Spain.

**Tutorial.** A skippable "How it works" tour in Dates, the editor, Games and Trips.

**Integration fixes made at the end** (so they are not a surprise in review): Spanish buyers return
from Stripe to `/es/…`; a gift card's receipt keeps the 14-day right to cancel; single, pick three and
Make it special receipts offer "Everything for the difference"; a renewal's welcome email doesn't ask
to send the invite again; the recovery email only says "gift" for a template; a gift card stays used
if its redeemer deletes their account; a purchase whose account was deleted is never handed to a new
account; the partner's pass unlocks go when the buyer deletes their account (a trigger on
`couple_passes`, needed because 0011 keeps purchases); creator payouts are worked out without VAT,
as `/creators` promises, and skip test-mode sales; the halfway city never names a city in Spain; the
data export includes passes, gift cards and reminders; footer links to `/creators` and `/redeem`.

## 2. The order to do it in

1. **Stripe, test mode first** (section 5): webhook events, Stripe Tax, the terms-of-service URL
   (without it there is no withdrawal tickbox).
2. **Migrations 0008 (if not already applied), 0009, 0010 and 0012** (section 3). All additive and
   safe with the live site's code. 0012 doesn't depend on 0011, so it can go in ahead of it; without
   it the free reply is refused ("already used") and the consent isn't recorded (loudly logged).
3. **Environment variables** (section 4) in Vercel.
4. **Run the test script** (section 7) against a dev server or a preview deployment on test keys.
5. **Deploy.** Signed-in checkout writes the 0009 columns, so 0009 must be applied before this code
   serves a single checkout.
6. **Migration 0011** at the switch-over. It is backward compatible with the live site's code, but
   the live site's privacy policy says purchases are deleted with an account, which stops being true;
   apply it when the new site (whose policy is already right) replaces the old one.
7. **Live mode**: repeat section 5 in live mode, switch the keys, buy one template with a real card,
   refund it, check the unlock goes.

## 3. Migrations (apply in order, never skip one)

`supabase db push`, or paste each file whole into the SQL editor. Each is safe to run twice and only
adds: no table, column or policy the live site reads is dropped or renamed.
`tests/unit/migrations.test.ts` checks that for every file from 0008 on.

| File | What it does |
| --- | --- |
| `0008_place_reviews.sql` | Only if not applied yet (`select to_regclass('public.place_reviews');` returns null): place reviews and the waitlist (the Dates map). 0011 changes these tables, so it must exist first. |
| `0009_commerce.sql` | `purchases` gains nullable `kind`, `creator_code`, `ref`, `discount_amount`. New tables `couple_passes` (one row per pass year; owner and partner can read), `gift_cards` (buyer can read), `creators` (service role only), all with RLS. Two triggers so a pass's lent unlocks (`*`, `pack:*`) never outlive it: when its `couple_passes` row is deleted (the buyer deleted their account) and when its purchase row is deleted. Indexes for refunds, revokes, the cron and account deletion. Creator percentages are checked (0–100, 0–90). |
| `0010_reminders.sql` | `reminders` (owner-only RLS, one row per person, occasion and day, at most 50 a person enforced in the database too) and `email_optouts` (a SHA-256 of an address, service role only). |
| `0011_privacy_fixes.sql` | Reviews stop being publicly readable through the API (they are served by the server without account ids). `purchases.user_id` becomes nullable with `on delete set null`, so a sale is kept for the accounts when its account is deleted. |
| `0012_consent.sql` | `purchases` gains nullable `terms_consent` (the withdrawal sentence the buyer ticked) and `terms_consent_at`. New tables, service role only, RLS on and no policies: `free_replies` (one free reply per paid premium gift answered, for good: deleting the reply keeps the row, `reply_gift_id` set null) and `gift_card_details` (a gift card's name and note between checkout and fulfilment, so they never go to Stripe; the passes cron deletes leftovers after 31 days). |

After 0009–0012 are applied, regenerate the types if you like (`npm run db:types`); the
hand-written `src/lib/supabase/types.ts` already matches.

## 4. Environment variables

New or changed, in Vercel for Production (and Preview for testing):

| Variable | Value |
| --- | --- |
| `STRIPE_AUTOMATIC_TAX` | `true` (after Stripe Tax is set up) |
| `STRIPE_WEBHOOK_SECRET` | the endpoint's signing secret (unchanged if the endpoint is reused) |
| `CRON_SECRET` | long random string; every `/api/cron/*` fails closed without it |
| `VIEWER_HASH_SECRET` | long random string that signs reminder-removal and unsubscribe links and seals the free-reply token in "send one back" links. It falls back to the service key, but then rotating that key voids every open reply link, so set it |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | recommended (free tier). Without them rate limits and "one recovery email per address a week" are per serverless instance only |
| `STRIPE_PRODUCT_EXTRAS`, `_PASS`, `_PACK`, `_GIFTCARD`, `_UPGRADE`, `_BUMP` | optional, reporting only (docs/STRIPE.md §2). The existing `STRIPE_PRODUCT_SINGLE/PICK3/EVERYTHING` keep working the same way |
| `STRIPE_PRICE_*` | no longer read; can be removed |
| `NEXT_PUBLIC_PRICE_CURRENCIES` | leave unset: euros only, which is what the terms say |
| `GIFT_CARDS_ENABLED` | leave unset until the accountant has settled VAT on vouchers; `true` shows the gift card on `/pricing` and lets checkout sell it. Unset, checkout refuses `giftcard` (`not_on_sale`) and `/redeem` still works for codes already issued |

Unchanged but required: Supabase URL and keys, `STRIPE_SECRET_KEY`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL`.

## 5. Stripe

Full detail in `docs/STRIPE.md`. The checklist:

- **Webhook events** on `https://<domain>/api/stripe/webhook`: `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`, **`checkout.session.expired` (add this one)**,
  `charge.refunded`, `charge.dispute.created`.
- **Only one endpoint** per mode should point at Ethos. The old site's code also fulfils template
  sessions and sends its own receipt; two endpoints mean two receipts.
- **Stripe Tax**: origin address, Latvian VAT registration, OSS registration; then
  `STRIPE_AUTOMATIC_TAX=true`. Prices are VAT-inclusive (`tax_behavior: inclusive`, `txcd_10000000`).
- **Promotion codes**: off on every Ethos checkout and recovery (`allow_promotion_codes: false`), so
  the shared account's live codes (LAUNCH40, WELCOME20…) can't be typed on an Ethos page. LOVE is
  switched off already.
- **Terms of service URL** (Settings → Business → Public details): required for the withdrawal
  tickbox (`consent_collection.terms_of_service`). Without it Stripe refuses the box; checkout then
  falls back to the notice above the pay button and logs `CHECKOUT WITHOUT THE WITHDRAWAL TICKBOX` on
  every sale, and those buyers keep their 14-day right to cancel. Check the logs after the first
  test checkout. The URL is the whole shared account's: Stripe can show it on the other businesses'
  checkouts and receipts too, so agree it with them first (docs/STRIPE.md §7). **One is already set**
  (the 23 Sept test session got the tickbox): check whose terms it points to, because Stripe may show
  it in the footer of Ethos's checkout page too.
- **Branding**: every session sets `branding_settings` (display name "Ethos", the site's icon from
  `https://tryethos.io/icons/icon-512.png`). Checked on 23 Sept by creating one test-mode session and
  expiring it at once: Stripe accepted the branding, the required terms tickbox (so the test account
  has a terms URL), no promotion codes on the session or its recovery, and the 24-hour expiry.
  Receipts and Apple Pay still show the account's name.
- **Marketing-consent box**: requested on every session; if the account can't show it, checkout
  carries on without it. **This account can't**: Stripe answers "`consent_collection.promotions` is
  not available in your country" (US merchants only), so no buyer can tick Stripe's box. (Before the
  fallback that refusal failed every checkout: Stripe names the parameter only in its message.)
  **Our own box replaces it**: one unticked, optional checkbox under the pay button in the publish
  sheet's paywall and on `/pricing` (Everything, the pick-three/one-template picker, the pass, the
  gift card): "If I don't finish paying, email me one link to come back to it." A tick is sent as
  `remindMe: true` and recorded in the session's metadata as `recovery_optin: "1"` (never present
  otherwise). On `checkout.session.expired` the recovery email goes out when the buyer ticked ours
  *or* Stripe's (`consent.promotions === "opt_in"`), an email is known, the address isn't on the
  unsubscribe list (`email_optouts`) and it has had none this week; it carries the one-click
  unsubscribe link. Game packs and the account page's upgrade button don't show the box (yet), so
  those checkouts get no recovery email. The privacy policy (§1 emails, §8 legal basis) says so.
- **No subscriptions**: nothing here creates one; keep it that way (other businesses' webhooks act on
  subscription events).

## 6. Crons (`vercel.json`, Vercel sends `Authorization: Bearer $CRON_SECRET`)

| Path | When (UTC) | What |
| --- | --- | --- |
| `/api/cron/passes` | 06:00 | renewal email 14 days before a pass year ends; ends years that ran out (for both people) and hands over to a renewal |
| `/api/cron/reminders` | 07:00 | "Remind me next year" emails, nine days before, catching up two missed days |
| `/api/cron/unlock` | 08:00 | scheduled gifts, storage retention (unchanged) |

Check the Vercel plan allows three daily crons. The reminder job sends at most ~90 emails a run
(500 ms apart, inside 60 s); Resend's free tier is 100 emails a day and 3,000 a month in total, receipts
included.

## 7. Manual test script (Stripe test mode)

### Setup

1. `.env.local` on **test** keys, plus `CRON_SECRET`, `RESEND_API_KEY` (to see emails) and
   `STRIPE_AUTOMATIC_TAX` unset (or `true` once test-mode Stripe Tax is set up).
2. In one terminal: `stripe listen --forward-to localhost:3000/api/stripe/webhook --events
   checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.expired,charge.refunded,charge.dispute.created`.
   Put the `whsec_…` it prints in `STRIPE_WEBHOOK_SECRET`. In another: `npm run dev`.
3. Throwaway accounts with inboxes you can read: **A** (buyer), **B** (partner), **C** (gift card
   recipient), and a few fresh ones where a step says so. The database is the shared production one:
   test purchases are real rows. Delete the accounts from their account pages when you're done (the
   payout script ignores test-mode sales).
4. Card `4242 4242 4242 4242`, any future date, any CVC. For every payment, check the Stripe page is
   headed "Ethos", shows the same amount the site showed, has **no promotion-code field**, and asks
   you to tick the withdrawal box (Pay stays disabled until you do; its "Terms" link opens
   `/legal/terms`); afterwards, the payment in the Dashboard carries the `ETHOS` statement descriptor
   suffix, and `select terms_consent, terms_consent_at from purchases order by created_at desc limit
   1;` shows the sentence you ticked. The receipt quotes it: "At checkout you ticked: “I ask Ethos…”".

### 7.1 One template (signed in)
1. As A, open `/templates/vinyl` → make it → fill in a name → **Publish**.
2. The sheet opens on **This template €9.99**; **Add every other template, forever** is **unticked**.
3. **Pay €9.99 and send** → Stripe shows €9.99 → pay.
4. Expect: "Taking you back to your gift…", and the gift publishes; receipt email "One template · €9.99", with
   "For you, Everything is now €15.00"; `/account` lists Vinyl and **Upgrade for €15.00**.

### 7.2 Order bump
1. As a fourth throwaway account (keep A with the single only, for 7.5), a premium template
   (`/templates/bouquet`) → Publish → tick **Add every other template, forever (+€15.00)** → the
   button says €24.99 → pay.
2. Expect: Stripe shows two lines (€9.99 + €15.00 = €24.99); `/account` shows Everything; the receipt
   says "One template + every other template". On a free template with extras the bump is +€17.50
   (€7.49 + €17.50 = €24.99). As A after 7.1 (upgrade €15.00), the bump isn't offered at all.

### 7.3 Make it special (free template)
1. With a fresh account (or signed out), `/create/the-letter` → turn on something paid (a video, a
   voice message, remove the footer) → Publish. A real song alone is free: it never opens the sheet.
2. The sheet opens on **Make it special €7.49** → pay.
3. Expect: the gift publishes with the extras; the account unlocks `the-letter` only. A premium
   template never offers Make it special (checkout answers `extras_free_only`).

### 7.4 Pick three and Everything (pricing page)
1. `/pricing` → **Pick three** → choose three → pay €14.99 → the three unlock.
2. With another account, `/pricing` → **Unlock everything** → €24.99 → `/account` shows Everything.

### 7.5 Upgrade for the difference
1. As A after 7.1 only: `/account` → **Upgrade for €15.00** (and `/pricing` shows €15.00 with €24.99
   struck through) → Stripe charges €15.00.
2. Expect: Everything on the account; the upgrade button is gone. Signed out, checkout for `upgrade`
   answers `sign_in_required`.

### 7.6 Ethos for Two
1. As A, `/pricing` → **Get Ethos for Two** → €29.00 → pay.
2. Expect: success page "Ethos for Two has started." with the invite link and the end date a year
   ahead; the pass welcome email with the same link; the receipt says "until <date>", not "forever".
3. In another browser as B, open the invite link → **Join the pass** → "You're in." Both accounts'
   `/account` show the pass; B can open a premium template and a game pack.
4. As a third account, the same link → "Someone has already joined this pass." As A → "That's your
   own pass".
5. Optional, the cron (before step 6, while A has one year only). In the SQL editor, on A's test
   pass only: `update public.couple_passes set starts_at = now() - interval '360 days', ends_at =
   now() + interval '5 days' where owner_user_id = '<A's id>';` then
   `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/passes` → `reminders.sent: 1`
   and the renewal email with its one-tap link. Then `update public.couple_passes set ends_at = now()
   - interval '1 minute' where owner_user_id = '<A's id>';` and run it again → `swept.ended: 1`; B loses
   every template and the packs, A keeps Everything (bought outright in 7.5) but loses the packs, and
   gifts already published stay live.
6. Renewal (skip step 5 first, or buy a fresh pass and have B join again): as A,
   `/pricing?renew=pass` → **Renew for another year** → pay → the end date moves a year on; the
   welcome email says the partner is already in.

### 7.7 Game pack
1. Signed in as a fresh account, `/games/deck` → pick the **After a year** pack → the sheet shows
   three sample cards → **Get it for €2.99** → pay.
2. Expect: back at `/games/deck?pack=deep`, the pack opens and deals. **After dark** asks the 18+
   question first. Owning Everything alone does not open packs.

### 7.8 Gift card (off by default)
0. With `GIFT_CARDS_ENABLED` unset: `/pricing` shows no gift card and no gift card question, and a
   hand-made `POST /api/stripe/checkout {"product":"giftcard"}` answers `not_on_sale`. `/redeem`
   still works. Set `GIFT_CARDS_ENABLED=true` for the rest of this section.
1. As A, `/pricing` → **A gift card** → **Add their name and a note** → **Buy a gift card** → €24.99.
   In the Dashboard, the session's metadata has no name and no note (they waited in
   `gift_card_details`, which is empty again after payment).
2. Expect: the success page shows the code with **Copy code**; the gift card email with the code and
   the redeem link; the receipt says the 14-day right to cancel lasts until the code is redeemed.
3. As C, open `/redeem?code=…` → sign in → **Redeem** → "Everything is yours." C's `/account` shows
   Everything; A's shows the card as **Redeemed**.
4. Again with the same code as anyone → "That code has already been redeemed."
5. Refund test: buy a second card, refund it in the Stripe Dashboard before redeeming → redeeming it
   says "That code no longer works."

### 7.9 Creator link
1. `node scripts/add-creator.mjs TESTCODE "Test creator" <an email you don't buy with>` (writes one
   row; delete it after: `delete from public.creators where code = 'TESTCODE';`).
2. Open `/?ref=c-testcode`, then (same tab, no reload) `/pricing` → **Unlock one** → Stripe shows the
   full €9.99, no code field anywhere; pay. The purchase has `creator_code = 'TESTCODE'`, `ref =
   'c-testcode'`, and the session's metadata the same.
3. `/?ref=c-nobody` → the sale is recorded with that ref and no creator code.
4. The creator buying through their own link (signed in with the email on their creators row) → no
   creator code on the purchase.
5. `node scripts/creator-payouts.mjs <this month>` on test keys lists the sale after VAT and refunds,
   and says it carries over (not over €20). With test-mode Stripe Tax off it flags the sale "CHECK BY
   HAND" instead: Stripe worked no VAT out, and the script never guesses it.

### 7.10 Free reply ("send one back")
1. As A (owning Vinyl from 7.1), publish a Vinyl gift **without the footer**, open its link signed out
   (or as B) → at the end, "The first reply is free" under **send one back**. The gift page mints the
   token when it renders the gift (`replyTokenForGift`), so the button opens the editor at once.
2. The editor opens at `/create/vinyl?ref=reply&reply=<token>` (no gift id anywhere in the URL). As B,
   Publish shows "<A's name> covered your reply…" and **Publish now**, no paywall → it goes live with the
   footer; `free_replies` has one row.
3. Before publishing, add a video → the paywall at the normal €9.99, with the line explaining why.
4. A second account opening the same "send one back" once the reply is live → the editor opens without
   a token, at the normal price; one opened with the link before it was sent → publishing says the
   free reply has already been sent, and the paywall shows the normal price. Deleting the free reply
   doesn't make the gift answerable for free again.
5. `/create/bouquet?reply=<that token>` by hand → normal price: the token is for Vinyl only. A gift
   with the footer on (a free template, or a free reply itself) doesn't say "free" at its end.
6. Publish another paid Vinyl gift **with a password**. Open it signed out: the lock screen, and the
   page source has no `replyToken`. Enter the password → at the end, **send one back** opens the
   editor with `&reply=`. Nobody holding the link without the password can spend the free reply.

### 7.11 Guest checkout
1. Signed out, `/pricing` → **Unlock everything** → pay with a new email address.
2. Expect: the success page signs you in; a welcome email and a receipt; the account has Everything.
3. Signed out again, a pass bought with an email that already has an account → the success page
   does not show the invite link (it goes to that address by email).

### 7.12 Refund and dispute
1. Refund the payment of 7.1 in the Dashboard → the webhook marks the purchase refunded, Vinyl leaves
   the account, and a live gift that needs it goes back to drafts.
2. Refund the pass of 7.6 → it ends at once for A and B.
3. Pay with `4000 0000 0000 0259` (charge then dispute) → the unlock goes when the dispute opens.

### 7.13 Abandoned checkout
0. On the current (non-US) account Stripe doesn't offer its marketing box; our own box under the pay
   button is what counts (§5).
1. In the publish sheet or on `/pricing`, **tick "If I don't finish paying, email me one link to come
   back to it"** under the pay button, start the checkout, give a real email on the Stripe page,
   close the tab. In the Dashboard the session's metadata has `recovery_optin: 1`; without the tick
   it has no such key.
2. Expire it: `stripe checkout sessions expire cs_test_…` (or wait the 24 hours).
3. Expect: one "Your gift is still waiting" email (a single template or Make it special, named) or
   "Your checkout is still saved" (anything else), with a working link back to checkout and
   **Unsubscribe**. Without the box ticked: no email. A second abandoned checkout the same week: no
   second email. **Unsubscribe** → no further recovery emails to that address, even when it ticks the
   box again.

### 7.14 Spanish
1. From `/es/pricing`, buy anything → Stripe's tickbox is in Spanish, its "Términos" link opens
   `/es/legal/terms`; paying returns to
   `/es/checkout/success`, cancelling returns to the Spanish page you came from.
2. The receipt follows the account's language.

### 7.15 Reminders
1. After publishing a gift, on the share screen **Remind me next year** → **Remind me** → "Saved…".
2. `/account/reminders` lists it; remove it there.
3. Save one whose day is nine days from today. The share screen skips this year's email for a date
   that close (the gift just made is for it), so on that test row only:
   `update public.reminders set last_sent_year = null where user_id = '<id>';` then
   `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/reminders` → the email, with
   a "remove this reminder" link that asks before removing.

## 8. Check in a browser (phones first, 360px wide, both languages)

- The real song (Apple's preview terms): on a free template pick **A real song** → it publishes free,
  footer on, no sheet. Open the gift: nothing plays on the way through; at the end, the "a song for
  you" card plays 30 seconds once on a tap (and again only on another tap), stops when tapped, when
  the tab is hidden, or when a video or the voice message starts, and a playing song pauses a video.
  **Listen on Apple Music** opens the track with no `at=` or `uo=` in the link; "Preview courtesy of
  Apple Music" sits under it. Keyboard: Tab reaches the play button and the link. Reduced motion: the
  card doesn't slide in and the equaliser and spinner stand still. In the editor's song search, every
  result has an Apple Music link beside its play button. Vinyl with a real song spins in silence. A gift published before this change
  with a real song behaves the same (no loop on open).

- The publish-sheet paywall for a premium template, for a free template with extras, for a reply,
  and for a buyer with an upgrade quote; the bump is unticked; nothing overflows.
- `/pricing`: the three plans, the pass card (full width while the gift card is off), no code field
  anywhere, the FAQ ("Can they send one back?", "Is there a discount code?", no gift card question
  while it's off); `?renew=pass` highlighting.
- `/checkout/success` after each product (single → back to the gift; pass → invite; gift card → code).
- `/redeem` and `/for-two/join`, signed in and out, with good, used and wrong codes.
- `/account`: pass, upgrade, packs, gift cards bought, reminders, redeem and "Withdraw from a
  purchase" links.
- `/games/deck` pack shelf and sheet (no creator-code field), the 18+ question, two phones with a pack.
- `/creators`, the footer links (Creator programme, Redeem a gift card, Withdraw from a purchase).
- `/legal/withdraw` and `/es/legal/withdraw`: **Email us to withdraw** opens the mail app addressed to
  support, subject "Withdrawal from a purchase" / "Desistimiento de una compra", with the short form
  in the body; its Terms link lands on section 9. `/legal/terms` s.9 quotes the tickbox exactly as
  Stripe's page shows it (compare with 7 Setup step 4); `/legal/privacy` section 1 lists every email
  and how to stop it.
- `/dates/london` and one more city, the Tiqets button and disclosure; `/trips/<id>` tickets and car
  hire; the flight finder's Aviasales button; meet in the middle with a halfway point in Spain (it
  says how far each travels, and names no city).
- The tour: first visit to `/dates`, `/create/<slug>`, `/games`, `/trips`; Skip, Escape, replay.
- Home with `?ref=tt-test` (gift hero) and without (dates hero).
- The end of a real gift: "The first reply is free" on a paid premium gift (no footer), not on a free
  template or a gift that has the footer; **send one back** opens the editor straight away, with
  `&reply=` on the link only for a paid premium gift whose free reply is unused.
- Emails in a real inbox, in both languages: receipt (single, pass, gift card), pass welcome,
  renewal, gift card, recovery, reminder.
- The e2e specs, run by someone against a dev server: `tests/e2e/{commerce-api,money,lifecycle,
  affiliate,growth,game-packs,cities,tour,trips}.spec.ts`.

## 9. For the owner to decide or check

- **Apple Music badge.** The song card's "Listen on Apple Music" is a drawn black pill, not Apple's
  badge artwork. Apple's guidelines ask for the official badge: download it (EN and ES) from Apple's
  marketing tools and swap it into `src/templates/_shared/SongPreview.tsx`. Applying to Apple Services
  Performance Partners (MONETIZATION M5.6) is also yours; its token must stay out of `/g/` pages (the
  gift rebuilds the track link without any query token).

- **Creator terms** on `/creators`, as decided: 30% of what the buyer paid, without VAT and after
  refunds (disputed sales earn nothing); payouts early each month once over €20, less carries over; 18 or
  over; "we may close your link"; a creator's own purchases never count. Credit needs the buyer to
  arrive through the link and pay in the same visit (the ref is kept in memory only, no cookie): a
  buyer who signs in by magic link in a new tab, or comes back later, isn't credited. Put the
  creator's **email** in `creators.contact` (third argument of `scripts/add-creator.mjs`, which now
  requires it and prints the creator's link): that's how their own purchases are recognised. The
  script no longer takes a discount; `creators.discount_pct` (0009) is unused and set to 0 for new rows.
- **The bump** now always makes the order exactly Everything's price (+€15.00 on a single, +€17.50 on
  Make it special), so it is the same deal as the Everything row beside it; it is hidden whenever the
  buyer's upgrade is cheaper, and checkout refuses it then too (`bump_not_available`), so a stale page
  can't charge more than the upgrade.
- **"One template" is premium only.** Checkout refuses a single for The Letter or Constellations
  (`single_premium_only`) and the pricing page's picker lists premium templates only: a free template's
  unlock is "Make it special" at €7.49, never the same unlock for €9.99. Pick three can still include one.
- **"Make it special" (€7.49) vs the upgrade floor (€4.99)**: a returning buyer whose upgrade is
  under €7.49 now sees the paywall open on "Everything for the difference" on a free template.
- **Pass holders can still buy a pack** they already have through the pass (they then keep it for
  good). The games never offer it; a stale page could.
- **Lawyer: is the pass "digital content" or a "digital service"** under EU consumer law? The
  withdrawal tickbox uses the same digital-content wording for it as for everything else ("I ask
  Ethos to unlock my purchase straight away… I lose my right to cancel", plus "It's one payment for
  one year and never renews by itself"). If the pass is a service (a year of access for two), the
  waiver works differently: the buyer asks for it to start within the 14 days and, on cancelling,
  pays for the days used (art. 14(3) and 16(a) of the Consumer Rights Directive), so a cancellation
  within 14 days would mean a partial refund, and the tickbox, Terms s.7 and the receipt would need
  their own pass wording. Worth a lawyer's five minutes before the first pass is sold.
- **The tickbox wording** is quoted in Terms s.9 (the right of withdrawal) straight from
  `consentSentence` in `src/lib/stripe/line-items.ts`, so the two can't drift, and
  `tests/unit/legal.test.ts` checks it. (The plan called it "s.7"; in the Terms as numbered, s.7 is
  Ethos for Two, s.8 gift cards and s.9 withdrawal.) Change the sentence in that one function.
- **Lawyer: the fallback notice.** When Stripe can't show the tickbox (no terms URL on the account),
  the buyer pays after the old "By paying, you ask for your purchase to be unlocked straight away and
  accept that… you lose the 14-day right to cancel" line above the Pay button (`withdrawalNotice` in
  `src/lib/stripe/line-items.ts`, kept as decided). Terms s.9, the receipt and the withdraw page treat
  that as no waiver: those buyers keep the 14-day right to cancel. Confirm that reading (it is the
  cautious one), whether the notice may keep saying the right is lost when the Terms say it isn't,
  and how exposed sales made that way, and all sales made before the tickbox existed, are to a
  withdrawal within 14 days. Setting the terms URL in Stripe makes the fallback unused.
- **Lawyer: the withdrawal function.** From 19 June 2026 EU traders who contract online must offer a
  withdrawal function (Consumer Rights Directive art. 11a, from Directive (EU) 2023/2673): a
  clearly labelled button, a short form, a "confirm withdrawal" step and an acknowledgement on a
  durable medium. `/legal/withdraw` today is a page with an email button (subject and form
  prefilled) and a promise to confirm by email. Ask whether that is enough, or whether it needs an
  on-site form with a confirm button and an automatic acknowledgement email.
- **Lawyer: early pass renewals.** A renewal bought before the running year ends starts only when it
  ends. The pass tickbox still says "unlock my purchase straight away", which isn't literally true
  for an early renewal; the Terms (s.7) and the withdraw page already keep the right to cancel until
  the new year starts. Ask whether the renewal needs its own tickbox sentence.
- **Terms change notice.** Terms s.17 promises account holders email notice at least 14 days before
  a material change takes effect. The new Terms (prices, free replies, no codes, creators, the
  tickbox, gift cards off) are material: send current account holders that email, and date the
  switch-over at least 14 days later, or ask the lawyer whether changes that only add rights for
  buyers can apply at once.
- A gift card's recipient name and note no longer go to Stripe: they wait in `gift_card_details` and
  move onto the card at fulfilment. Stripe metadata carries no gift ids, names or notes; it does carry
  our own purchase id and, for signed-in buyers, our account id (`user_id`), which fulfilment uses.
- Partial refunds take nothing back; refunding a single that was counted towards an upgrade leaves
  the upgrade.
- Read the 31 city notes and the "After dark" cards once, in both languages. Dubai's note says to go
  to the desert for stars while its "Look up" card lists a viewpoint in town.
- Tiqets searches from the map's place sheet can't be checked in advance; small museums may land on
  an empty search.
- `/` is now rendered per request (the hero depends on the ref). A rewrite in `src/proxy.ts` to a
  static gift-first page would make it static again.
- The live site (ethoslove) shows raw keys for the new product types on its account page, and its
  privacy policy says purchases are deleted with the account (untrue after 0011). Both go away when
  this site replaces it.
- The world-city search lists still contain Spanish cities on purpose, so people who live there can
  find their own city (the owner's call in "made in Riga, and nowhere else"). The site never suggests
  or names one by itself.
