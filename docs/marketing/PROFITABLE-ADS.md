# Making the Meta ads pay: what has to change

Written 26 Oct 2026, day 2 of the USA test. Sources: Vercel Analytics (30 days to 26 Oct, and the ad
visitors since 25 Oct), Stripe (payments and payment-method settings), Ads Manager, and the live ad
landing page on a phone. Outside figures are labelled; most are vendor-reported, so they are a
direction, not a promise.

## The short answer

**Only Pop-up Card can be made profitable, and only with three fixes on its path plus a small add-on.**
Today a Pop-up Card buyer costs about $17 against the ~$11 a US sale leaves (0.65×). With the fixes
below it comes to about $8 against ~$13.50 (≈ 1.6×). The other three ads would still lose money after
the same fixes. Their templates convert too little, so no landing-page or checkout fix closes a 2–4×
gap.

## Correction to the earlier "1 in 10 click pay"

That figure mixes in the two **free** templates (The Letter, Constellations), whose makers can send for
free. They are 70% of everyone who reaches the pay sheet.

| 30 days to 26 Oct | Opened editor | Saw the pay sheet | Clicked pay | Pay sheet → pay |
|---|---|---|---|---|
| Free templates | 4,058 | 3,287 | 129 | 4% (the paid extras) |
| **Paid templates** | **2,569** | **1,720** | **338** | **20%** |
| Pop-up Card | 73 | 58 | 23 | **40%** |
| xoxo | 397 | 307 | 69 | 22% |
| Birthday Cinema | 166 | 94 | 20 | 21% |
| Bouquet | 768 | 514 | 87 | 17% |

About half of everyone who clicks pay finishes at Stripe (476 → 233).

## What the ad visitors did (25–26 Oct)

About 41 US visitors came from Facebook/Instagram to the four template pages: Pop-up Card 14, Birthday
Cinema 10, Bouquet 10, xoxo 7. Of them, 15 were on Android, 12 on iPhone and 6 on a computer.

- **10 opened an editor (24%).** Three in four left at the template page.
- About 4 reached the pay sheet, 1 clicked pay (Bouquet), and none paid.

These numbers are far too small to judge the ads, but they show where people stop.

## The three leaks on the ad path

### 1. The landing page doesn't look like the ad (template page → editor: 24%)

On a phone, the first screen of `/templates/popup-card` is a paragraph of text. There is no picture of
the gift until you scroll. The cookie banner covers the "Make this gift" button.

The ad just showed a cake rising out of a card. The page then asks them to read about it. Ad guides
agree that message match, meaning the page looking like the ad, is one of the strongest predictors of
conversion on Meta ([Firstpier](https://www.firstpier.com/glossary/landing-page),
[Flighted](https://www.flighted.co/blog/landing-page-vs-product-page-which-converts-better)).

**Fix:** for `?ref=ad-*` visitors, put on the first screen:
- the gift playing, the same moment as the ad;
- one line: "Make it free with their name and your photos. $11.99 once, only when you send it.";
- the button "Make this gift".

The description moves below. The banner sits under the button, not over it.
**Target: 24% → 40%.**

### 2. Checkout inside the Instagram/Facebook browser (pay click → paid: ~50%)

Ad visitors pay inside Instagram's or Facebook's own browser, not Safari or Chrome.
- **Apple Pay often doesn't appear there on iPhone.** This comes from merchant reports at Square and
  two payment providers ([Dodo Payments](https://dodopayments.featurebase.app/p/apple-pay-support-in-meta-facebook-instagram-in-app-browser),
  [Fundraise Up](https://fundraiseup.com/support/app-browsers),
  [Square community](https://community.squareup.com/t5/Community-Corner/No-Apple-Pay-on-checkout-links/m-p/217730/highlight/true)).
  Stripe publishes nothing on it, so it needs a real check. The owner opens our ad in Instagram on an
  iPhone, taps through to Stripe, and looks for the Apple Pay button.
- **PayPal is switched off** in our Stripe payment methods. On, today: cards, Apple Pay, Google Pay,
  Link, Klarna and Revolut Pay. A PayPal-sponsored report says 28% of Gen Z abandoned a cart in a month
  because their wallet wasn't accepted
  ([PYMNTS](https://pymnts.com/checkout-conversion/2026/gen-z-hands-merchants-a-checkout-ultimatum)).
  That is vendor data, but cheap to test. Stripe's payment-method settings have a built-in A/B
  experiment, so PayPal can be turned on for half of checkouts and measured.
  **Note:** the Stripe account is shared with the other businesses, so this setting is the owners'
  call.
- **Pay buttons on our own pay sheet.** Stripe's Express Checkout Element shows Apple Pay, Google Pay
  and Link right on our page, so the buyer skips the redirect. Stripe reports about a 10% lift from
  adding Apple Pay, and up to 2× when the wallet button appears early in the flow
  ([Stripe blog](https://stripe.com/blog/testing-the-conversion-impact-of-50-plus-global-payment-methods),
  [Stripe Sessions 2024](https://stripe.com/sessions/2024/a-look-under-stripes-hood-using-data-to-demystify-payments)).
  This is a real build: the purchase record, metadata, tax and the webhook all move with it.

**Target: 50% → 62%.**

### 3. The add-on is the wrong size (a buyer leaves ~$11)

Today's bump adds Everything for €15 on top of €9.99, which is 150% of the order. It was ticked 180
times in 30 days and paid once.
- **Benchmarks:** funnel tools report bump take rates of 15–35% when the bump is a fraction of the
  order, with mobile 30–50% lower
  ([SegMetrics](https://segmetrics.io/wp-content/uploads/Playbook-Sales-Funnel-Order-Bump.pdf),
  [Focus Digital](https://focus-digital.co/average-upsell-conversion-rate-2026-report/)).
- **Proposed bump:** one tick at **$4.99**: "Their next gift, ready when you need it". That's one more
  template to send any time, for the next birthday or anniversary.
- **Expected effect:** if 1 in 4 buyers takes it, a US buyer leaves about $13.50 instead of $11.

The success-page upgrade (live since 23 Oct) has no takers yet in Stripe. Judge it after two weeks.

## The maths for Pop-up Card

| | Today | After the three fixes and the bump |
|---|---|---|
| Cost per visitor (Ads Manager: $0.51 a click, 4 in 5 load) | $0.63 | $0.63 |
| Template page → editor | 24% | 40% |
| Editor → clicks pay (organic Pop-up Card) | 31% | 31% |
| Clicks pay → paid | 50% | 62% |
| **Visitor → buyer** | **3.7%** | **7.7%** |
| **Cost per buyer** | **$17** | **$8.20** |
| Left per buyer after Stripe | $11 | $13.50 |
| **Return** | **0.65×** | **≈ 1.6×** |

For the four ads mixed (cost per visitor $0.88, paid templates' 13% editor → pay), the same fixes take a
buyer from about $56 to about $27, against $13.50. That's still a loss.

Pop-up Card's 31% rests on only 73 editors in 30 days. If ad visitors pay half as often as organic ones,
Pop-up Card after the fixes lands near break-even, not 1.6×.

## Cheaper visitors

- **More ads like Pop-up Card, not other templates.**
  - Its click rate is 5.3%; Bouquet's is 1.2%.
  - When the kill rules fire, move the money to it. Then make three or four new openings for the same
    gift (another birthday angle, "turning 21", "long distance") and keep the end of the video.
  - The book's method: about 30 openings against a few bodies, and keep the best opening.
- **Retargeting**, already drafted.
  - Warm audiences usually buy 2–3× more often than cold ones and cost 40–70% less per buyer
    ([Foundry CRO](https://foundrycro.com/blog/retargeting-benchmarks-2026/),
    [Shno](https://www.shno.co/marketing-statistics/retargeting-statistics)).
  - Up to three quarters of those sales would have happened anyway. Keep a holdout.
  - It goes on once the audience passes 100.
- **TikTok Spark Ads on our own hits.**
  - The earlier plan (`ADS-PLAN.md`) priced TikTok views at €6–12 per thousand, against the €8–37 we
    pay on Meta now.
  - The demand starts on TikTok anyway: buyers see a post, then Google the brand.
  - The owner has to authorise each post.
- **Timing.** Meta costs rise 25–66% in Q4
  ([Madgicx](https://madgicx.com/blog/meta-ads-benchmarking)), while couples' gift intent peaks on
  1–14 Feb. Prove the numbers in November with small money, and spend hardest for Valentine's.

## Order of work

1. **Today, no code:**
   - the owner's iPhone check of Apple Pay inside Instagram;
   - the kill rules as planned (day 3–4), with the freed money going to Pop-up Card.
2. **This week, code (built and checked on a preview, nothing live until the owners say go):**
   - the ad landing screen (leak 1);
   - the $4.99 bump (leak 3).
3. **Owners' decision:** PayPal on as a Stripe A/B test (shared account).
4. **Next:**
   - the Express Checkout Element on the pay sheet;
   - three or four new Pop-up Card openings;
   - retargeting at 100+.
5. **Judge on Stripe sales with `ref=ad-meta-*`**, not Meta's count, against the 30-day funnel above.

## Benchmarks used

- Typical Meta e-commerce cost per purchase is $38–49 (medians, US-heavy samples:
  [Triple Whale](https://www.triplewhale.com/blog/facebook-ads-benchmarks.md),
  [TopGrowth](https://topgrowthmarketing.com/dtc-ecommerce-benchmarks/meta-ads-benchmarks/)).
- At about $11 per buyer, Ethos earns a quarter of what a typical store can pay for one. That is the
  book's signal to work on what a customer is worth, not only on the ads. Hence the bump, and judging
  Pop-up Card on its full order.
- Competitors sell one-off love-letter websites for $3–60 (Etsy, Gumroad). There is no subscription
  leader to copy in this niche.

## Update, 26 Oct: the ad landing page is built (local only, not live)

`/try/<slug>` (for example `/try/popup-card`) is a page only for ad links. It is hidden from search and
left out of the sitemap. The first screen shows the ad's own line and "This is the real gift. Tap it." over
the real gift, already running in a phone frame. At the bottom sits a docked bar: "Free to make · $11.99
once, when you send it" and the "Make yours" button. The cookie strip now docks above that button instead
of covering it.

Below the first screen:
- what the recipient will see;
- three steps;
- the money-back line;
- real reactions, shown only when three approved ones exist;
- what's included.

The normal template pages are unchanged.

**The same 100-person panel, comparing the old and new pages for all four ads.** The pages were shown as
X and Y, not as old and new, and half the groups saw them in the opposite order.

| | Old page (`/templates/…`) | New page (`/try/…`) |
|---|---|---|
| Would press the button to start | 17 yes · 100 maybe | **47 yes · 176 maybe** |
| Would make it and pay $11.99 | 6 yes | 8 yes |
| Preferred it | 17 | **68** (15 the same) |

The new page gets far more people into the editor. Paying barely moved, because price and trust decide
that. Every group asked for reviews, a company name, a refund line and payment logos. The money-back line
and real reactions are in. Company details and payment logos are not, because Apple Pay may not show inside
Instagram's browser.

**After the panel's notes:**
- the "tap it" line moved above the phone;
- the price line says "Free to make" first, so "free" no longer reads as bait;
- the bar is solid;
- the gift's description was added.

**Live since 26 Oct (634c940).** All four ads now link to `/try/<slug>`, with the same `ref` and `utm`
parameters. The change was published on 26 Oct, which sent the ads back into Meta review. Checked live: from
California the page shows $11.99, and every page loads in a phone browser. The retargeting drafts were
left unpublished.

Compare the ads' landing → editor rate from 27 Oct with 25–26 Oct, when 10 of about 41 US ad visitors (24%)
opened an editor.
