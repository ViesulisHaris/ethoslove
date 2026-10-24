# Paid ads: which campaigns, and exactly what to set up

Written 24 Oct 2026. It builds on `ADS-PLAN.md` (the funnel data, pulled live on 24 Oct) and on the
ad pixels in this branch. Benchmarks are vendor figures, marked **(est.)**, and get replaced by our own
numbers after the first week.

## The verdict

Only two kinds of campaign can return 1.5× at our order size. Start both as soon as the pixels are live:

1. **Retargeting on Meta (Instagram + Facebook):** people who opened a premium template or saw the
   price in the last 14 days and didn't buy, shown the exact template they opened. It's small, cheap and
   the most likely to profit. It also can't run until the pixel has collected an audience, so the pixel
   should go live as soon as possible.
2. **A 7-day TikTok Spark Ads test:** proven organic posts, each linking to a template that converts
   well. Most ads will lose; the rules below keep losses small and put money only behind winners.

Everything else is a no for now (table below). TikTok retargeting comes later: TikTok needs 1,000 matched
people in an audience first.

## Why: the numbers

A paid order leaves about **€8.74 gross profit** (€9.60 average order × 0.91 after Stripe fees and UK
VAT). For 1.5×, the share of landing visitors who buy has to be at least
**1.5 × cost per landing visitor ÷ €8.74**.

| Campaign | Cost per landing visitor (est.) | Share who must buy for 1.5× | Verdict |
|---|---|---|---|
| **Meta retargeting**, premium-editor and paywall visitors | €0.045–0.105 per person per week (CPM €15–35, 3 views a week) | 0.8–1.8% of the audience a week, because of the ad | **Start first** |
| **TikTok Spark Ads**, proven post, CTR 3% | €0.25 | 4.3% | **Test**, top templates only |
| TikTok Spark Ads, median CTR 1.6% | €0.47 | 8.0% | only popup-card clears it |
| TikTok normal in-feed ads (CTR 0.84%) | €0.89 | 15% | no |
| Meta cold prospecting | ≈ €1.04 | 18% | no |
| Pinterest (CPC €0.45–1.30) | ≥ €0.56 | ≥ 10% | no |
| Reddit (mid-sized subreddits) | ≈ €0.63 | 11% | no |
| Snapchat (CPC ≈ €0.78) | ≈ €0.97 | 17% | no |
| Google Search | see ADS-PLAN.md: too little volume at €0.15–2.24 a click | | no |

What buyers we already have convert at, from editor visit to paid (30 days, ADS-PLAN.md):

| Template | Converts | Spark ad return at €0.25 a visitor | at €0.47 |
|---|---|---|---|
| popup-card | 12.3% | **3.0×** | **1.6×** |
| kawaii | 8.5% (small sample: 4 of 47) | 2.1× | 1.1× |
| sticker-bomb | 7.1% (6 of 84) | 1.7× | 0.9× |
| keepsake | 6.4% (6 of 94) | 1.6× | 0.8× |
| the-council | 4.9% | 1.2× | 0.6× |
| xoxo | 4.1% | 1.0× | 0.5× |
| bouquet | 3.3% | 0.8× | 0.4× |

These assume ad visitors convert at 70% of organic visitors **(est.)**. So the ad's landing template
matters more than anything else in the ad. Ads go to popup-card first, then kawaii, sticker-bomb and
keepsake. xoxo stays in as the control, because its post is the strongest hook we have.

**Q4 prices:** TikTok CPMs run about 20–35% higher in Q4 and Meta's 40–80% (est.), peaking in Black
Friday week (Black Friday is 27 Nov 2026). Gift demand rises too, and a digital gift has no shipping
cut-off. So: test now, keep tests out of 23 Nov–1 Dec, and scale only proven winners into Christmas
and Valentine's Day.

## The calendar

| When | What |
|---|---|
| **Now** | Pixel branch reviewed and merged; accounts and env vars (step 0). From that moment the audiences start filling |
| Go-live + 2–4 days | **Meta retargeting** on, once the audience has 100+ people |
| Go-live, ideally by 29 Oct | **TikTok Spark test**, 7 days |
| Day 8 | Decide per ad: scale, rework or stop (rules below) |
| 23 Nov – 1 Dec | No new tests (Black Friday prices). Retargeting and any ≥ 1.5× winner keep running at the same budget |
| 8–24 Dec | "First Christmas" push on winners: +20% budget every 3 days while they hold 1.5×. Last-minute angle from 18 Dec: arrives instantly |
| When TikTok's website audience reaches 1,000 matched | TikTok retargeting, same idea as Meta's (est. 5–8 weeks after go-live) |
| 15 Jan – 14 Feb 2027 | Valentine's Day (a Sunday). Heaviest 7–14 Feb, last-minute angle 12–14 Feb |

## Step 0: switch on tracking (you, about an hour)

Nothing below works until the pixels are live: there's no audience to retarget and no way to see what
an ad earned.

### Meta
1. **business.facebook.com:** create a business portfolio for SIA MIGLAI. Add Adrians as an admin.
2. A **Facebook Page "Ethos"** and the **Instagram account @tryethos**, connected to the portfolio.
3. **Events Manager → Connect data → Web → Meta Pixel**, named "Ethos web". Copy its ID.
4. Same pixel → **Settings → Conversions API → Generate access token**. Copy it.
5. Same pixel → Settings: **Automatic advanced matching OFF**, and **"Track events automatically
   without code" OFF** (the privacy policy says we don't collect form fields).
6. **Brand safety → Domains → add tryethos.io** → put the TXT record at one.com (where the Search
   Console record is) → Verify.
7. **Ad account:** currency EUR, time zone Europe/Riga, the company card.
8. **Commerce Manager → Add catalog → E-commerce → Data feed → Scheduled feed:**
   `https://tryethos.io/api/catalog/meta.csv`, daily. Then catalog → Settings → **Event sources →
   connect "Ethos web"**, so views and sales match their template.

### TikTok
1. **ads.tiktok.com:** an ad account for SIA MIGLAI, Latvia, currency EUR, time zone Europe/Riga, card.
2. **Tools → Events → Web events → Set up → Manual**, named "Ethos web". Copy the **pixel code**.
3. Same pixel → **Settings → Events API → Generate access token**. Copy it.
4. Same pixel → Settings: **Automatic advanced matching OFF**. Leave first-party cookies on.
5. (For later, catalog ads) **Assets → Catalogs → Create → Data feed:**
   `https://tryethos.io/api/catalog/tiktok.csv`, daily.

### Vercel (project ethoslove → Settings → Environment Variables)

| Name | Value | Environments | Type |
|---|---|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | the Meta pixel ID | Production | plain |
| `META_CAPI_TOKEN` | the Conversions API token | Production | **Sensitive** |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | the TikTok pixel code | Production | plain |
| `TIKTOK_EVENTS_TOKEN` | the Events API token | Production | **Sensitive** |

Then redeploy production: the `NEXT_PUBLIC_` ones are built into the page. Claude then checks the live
site with the real IDs: events after "Allow" only, none on /g/, no CSP errors, and a test purchase event
under Events Manager → **Test events** (set `META_TEST_EVENT_CODE` / `TIKTOK_TEST_EVENT_CODE` for that
check only, then remove them).

## Campaign 1: Meta retargeting

| Setting | Value |
|---|---|
| Campaign | **Sales**, manual setup (not an Advantage+ sales campaign: that one also prospects). Catalog: on, the Ethos catalog |
| Ad set: conversion | Website · Performance goal: maximise conversions · Event: **Purchase** |
| Ad set: audience | **Retarget products to people who viewed or added to cart but not purchased, last 14 days.** Countries US, GB, CA, AU, IE, NZ. No age or interest limits |
| Ad set: budget | **€7 a day**, no end date |
| Placements | Advantage+ placements, but **Audience Network off** |
| Ad | **Advantage+ catalog ad**: carousel of the template they viewed. Primary text: "A gift that opens like a story. Theirs is a few minutes from done." Headline: the template's name. CTA: Shop now |
| URL parameters | `ref=ad-meta-rt&utm_source=meta&utm_medium=paid&utm_campaign=retarget` |
| Creative enhancements | all **off** (music, text overlays, AI variations) |
| Start | when the audience shows 100+ people |

Don't write "you left" or "your draft is saved": a draft lives in the browser it was made in (often
TikTok's in-app browser), and Instagram opens a different one.

**How we'll know it's working:** 13 of 50 people who abandoned checkout came back on their own before any
ads. Track that share weekly. Retargeting is worth keeping only if it lifts it. Platform-reported
retargeting sales over-count: up to three quarters of them would have happened anyway (est.).

## Campaign 2: TikTok Spark Ads test (7 days)

| Setting | Value |
|---|---|
| Campaign | Objective **Traffic**. Budget: no limit at campaign level |
| Ad group: optimisation | Website · pixel "Ethos web" · **Landing page view** (Purchase optimisation needs ~50 sales a week to learn; this budget gives a few) |
| Placements | **TikTok only** (Pangle and the app network off) |
| Targeting | US, GB, CA, AU, IE, NZ · ages 18–24 and 25–34 · all genders · English · no interests |
| Budget and bid | **$21 a day** (TikTok's floor is $20 per ad group) · lowest cost |
| Dayparting | 19:00–08:00 Riga time (16:00–05:00 UTC: when our buyers buy) |
| Ads | **Spark Ads**, 3–4 of them (below), CTA "Shop now", smart creative and automatic music **off** |

| Ad | Post | Link |
|---|---|---|
| A | a popup-card post (make one in the format of the hits if none exists) | `/create/popup-card?ref=ad-tt-a&utm_source=tiktok&utm_medium=paid&utm_campaign=wk1&utm_content=a` |
| B | the best kawaii, sticker-bomb or keepsake post | `/create/<that template>?ref=ad-tt-b&utm_source=tiktok&utm_medium=paid&utm_campaign=wk1&utm_content=b` |
| C | "the council v. jake" (192K views) | `/create/the-council?ref=ad-tt-c&utm_source=tiktok&utm_medium=paid&utm_campaign=wk1&utm_content=c` |
| D | "are u mad at me" (1M views): the control | `/create/xoxo?ref=ad-tt-d&utm_source=tiktok&utm_medium=paid&utm_campaign=wk1&utm_content=d` |

All links are on `https://tryethos.io`. **Spark codes:** in the TikTok app, on each post: ⋯ → **Ad
settings → Ad authorisation on → Generate code (365 days)**. Paste each into Ads Manager.

## Rules: every day, and on day 8

- **Hands off for 72 hours.** Edits restart learning.
- **Per ad**, the book's test budget: up to **2× the 30-day profit of a customer ≈ €17**.
  - Pause at $10 spent if CTR is under 0.8%.
  - Stop at €17 with no sale.
- **Daily:** TikTok spend, CPM, CTR, CPC per ad. Meta spend and purchases. Vercel visitors per
  `utm_content`, editor opens and pay clicks. Paid sales per ref from `revenue-by-ref`.
- **Day 8**, per ad and per channel: return = sales with its ref × order × 0.91 ÷ spend.
  - **≥ 1.5×:** keep it, +20% budget every 3 days.
  - **1.0–1.5×:** new hook on slide 1, or the same post to a better-converting template.
  - **< 1.0×:** stop it.
  - If no TikTok ad reaches 1×, stop TikTok prospecting and keep only retargeting.

## What would change this
- **CTR on our proven posts under 1.5%:** the organic advantage doesn't carry into ads. Stop prospecting.
- **Ad visitors converting at well under 70% of organic:** the template table shrinks; only popup-card
  stays worth it.
- **A bigger order:** every ad's return rises with it. The €4.99 "+ their next date" bump in
  `ADS-PLAN.md` would move the break-even more than any ad tweak.

## Sources
- Our funnel, per-template conversion and order size: `ADS-PLAN.md` (Stripe, Supabase and Vercel, read-only, 24 Oct 2026).
- TikTok costs and Spark Ads vs in-feed CTR: [webtonic.io](https://www.webtonic.io/blog/franchise-tiktok-ads-statistics), [influee.co](https://influee.co/blog/tiktok-cpm), [lebesgue.io](https://lebesgue.io/blog/tiktok-ads-benchmarks), [megadigital.ai](https://megadigital.ai/en/blog/tiktok-ad-benchmarks/)
- Q4 cost increases: [stackmatix.com](https://stackmatix.com/blog/ad-cost-comparison-across-platforms-2026), [trackbee.io](https://www.trackbee.io/blog/tiktok-ads-cost-2025-cpc-cpm-budget-best-strategies), [admetrics.io](https://admetrics.io/en/post/tiktok-ads-costs-complete-2026-pricing-guide)
- Pinterest: [trackbee.io](https://trackbee.io/blog/pinterest-ads-cost), [aiadvantageagency.com](https://aiadvantageagency.com/pinterest-ads-cost-for-ecommerce/)
- Reddit: [webtonic.io](https://www.webtonic.io/blog/e-commerce-reddit-ads-statistics), [shno.co](https://www.shno.co/marketing-statistics/reddit-ads-statistics)
- Snapchat: [webtonic.io](https://www.webtonic.io/blog/e-commerce-snapchat-ads-statistics), [hubfluence.io](https://www.hubfluence.io/resources/snapchat-cpm-rates)
- Audience minimums: TikTok 1,000 matched users ([TikTok help](https://ads.tiktok.com/help/article/custom-audiences)); Meta 100 to run, ~1,000 for steady delivery ([stackmatix.com](https://www.stackmatix.com/blog/meta-custom-audiences))
- Retargeting conversion and incrementality: [shno.co](https://www.shno.co/marketing-statistics/retargeting-statistics), [foundrycro.com](https://foundrycro.com/blog/retargeting-benchmarks-2026/)
- Spark Ads in carousel format: [TikTok help](https://ads.tiktok.com/help/article/carousel-ads)
- Valentine's Day buying peaks: [ometria.com](https://ometria.com/blog/valentines-day-marketing-ideas)
- Test budget and scaling rules: *$100M Leads*, paid ads chapter (via the hormozi skill)
