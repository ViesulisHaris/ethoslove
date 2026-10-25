# Meta ads, USA, $30 a day: the test

Written 25 Oct 2026. The owners set the budget ($30 a day, USA only) and asked for the best-selling
templates, interactive videos, and agent-tested creatives. This is how the money is split, how the
winners are picked, and when to stop.

## What profit needs

| | |
|---|---|
| What a US sale leaves after Stripe | **≈ $11** ($11.99, no VAT on US orders) |
| Break-even | an ad brings a buyer for **≤ $11** |
| 1.5× | **≤ $7.50** a buyer |
| A US Reels visitor who reaches the template (CPM $12–16, 1.5% CTR, 80% load) | **≈ $1.00–1.30** |

How often an editor visitor pays (30 days to 24 Oct, organic): popup-card **12.3%**, xoxo 4.1%,
bouquet 3.3%, birthday-cinema 3.0%. Ad visitors usually pay a little less often than organic ones.
So a sale costs about **$13 on popup-card and $40–55 on the other three**, unless a video gets an
unusually high click rate. The test exists to find out cheaply which one beats that; expect to lose
part of the test money.

## The four ads

The four most-bought premium templates (bouquet 46 sales, xoxo 26, popup-card 17, birthday-cinema
14 in 30 days), each filmed as it really plays (the gift running, not a mock-up), with the hook the
agent panel liked best for it. Every ad lands on its own template's editor.

| Ad | Hook (first 2.6 s) | Landing |
|---|---|---|
| Birthday Cinema: curtains, she blows the candles out, confetti, the message | Can’t be there for their birthday? Send this. | `/create/birthday-cinema?ref=ad-meta-bc` |
| Pop-up Card: the cake rises out of the card, candles lit and blown out, the letter | A birthday card that pops up on their phone | `/create/popup-card?ref=ad-meta-pc` |
| Bouquet: a flower blooms, the bouquet gathers, the card opens | A bouquet that blooms on her phone 💐 | `/create/bouquet?ref=ad-meta-bq` |
| xoxo: the envelope, "my person", the love letter | When “I love you” isn’t enough to text | `/create/xoxo?ref=ad-meta-xo` |

All links on `https://tryethos.io`, plus `&utm_source=meta&utm_medium=paid&utm_campaign=usa-test`.
Primary text on every ad: *"Make it free with their name, your words and your photos. Pay $11.99 once,
only when you send it. No app, no subscription."* End card: "Make one in minutes · Free to start.
$11.99 once, only when you send it · tryethos.io".

### What the agent panel said (5 simulated US shoppers, 19–41, 8 ad ideas)

- Plain, adult hooks won: "Can’t be there for their birthday?" (4 of 5 put it in their top 2) and
  "A birthday card that pops up on their phone" (3 of 5).
- "POV…" and "are u mad at me 🥺" stopped the 19-year-old cold and lost everyone over 24.
- "Flowers that never wilt" read as a gimmick and as misleading ("they aren’t real flowers").
- **4 of 5 named the same dealbreaker:** they want to make it with the real name before paying, and to
  know it’s one-time, not a subscription. That is how Ethos already works, so every ad says it.

A panel of agents is a filter, not a result: it picked which four to pay for. Meta's numbers decide.

## The structure

- **One campaign**, Sales, manual (not Advantage+ sales). **Four ad sets, one ad each, $7.50 a day
  each** (≈ €6.50): an even split, so every video gets a fair test instead of Meta starving three of them
  on day one.
- Each ad set: **USA only**, 18–65+, broad (Advantage+ audience), placements Facebook and Instagram
  (Audience Network and Threads off), optimised for **Purchase** on the Ethos web dataset.
- **7 days ≈ $210.** Hands off for the first 72 hours unless a kill rule fires.
- Built 25 Oct as a draft in Ads Manager: campaign **"USA test: 4 gift videos"**, ad sets Birthday Cinema,
  Pop-up Card, Bouquet, xoxo. Personalized destinations are off on every ad (Meta switches "Product browsing"
  back on whenever the URL is edited, so re-check it after any change).

## Kill rules (check once a day)

| Spent on an ad | Pause it if |
|---|---|
| $10 | link CTR under 0.8%, or a landing view costs over $2 |
| $25 | no checkout started |
| $40 | no sale |

Sales are counted from Stripe by `ref` (`node scripts/revenue-by-ref.mjs`), not only from Meta: Meta
sees a buyer only if they pressed "Allow" on the cookie banner.

## Day 8: the winners get the $30

- One ad clearly best and **≤ $11 a sale** → all $30 on it.
- Two within about 25% of each other and both ≤ $11 → **$15 / $15**.
- Raise a winner by 20% every 3 days only while it holds ≤ $11.
- **Nothing ≤ $15 a sale** → stop the cold ads; keep only retargeting, and change the offer (a bundle or
  a cheaper first gift) before the next test.

## Retargeting

Drafted already (USA, people who viewed a template in the last 14 days and didn't buy in 30). It goes on
at **$3–5 a day out of the $30** once the audience reaches 100 people. Usually the most profitable piece.

## Before publishing

- Meta won't publish until the ad account has a **verified phone number** (error #3858013, "Add phone
  number" in the editor). Only the owner can do this.
- The ad account's spending cap is **€100 total** (set 25 Oct so nothing can run away). The 7-day test
  needs ≈ €185: raise it to about **€200**, still "only when changed by hand".
- The EU advertiser/payer fields aren't needed for USA-only ads.

## Two levers bigger than any ad

1. **The cookie banner.** Meta can only learn from buyers who press "Allow". US state laws (California
   and others) ask for an opt-out for ad tracking (a "Do not sell or share" link, honouring Global
   Privacy Control), not an opt-in banner; asking only EU/UK visitors and giving US visitors the opt-out
   would let Meta find buyers much faster. It needs a privacy-policy and code change, so it is the
   owners' decision, ideally with a lawyer's look.
2. **Order size.** Every ad's return rises with the order. A small add-on at checkout moves break-even
   more than any creative tweak.
