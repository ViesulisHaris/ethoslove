# How Ethos makes money

The money playbook. Written 23 September 2026 and revised the same day after a finance, legal and brand review. It replaces the first version of this file. What was still right is kept; what the numbers and the review overturned is cut (appendix B).

> **What was built differs from this plan in places (owner's decisions, 23 Sept).** The new site
> keeps the order bump (it always makes the order exactly Everything's price, unticked), keeps "Make
> it special" at €7.49, sells Ethos for Two at €29 a year, makes the catalogue song free everywhere,
> gives a paid premium gift's recipient one free reply (footer on), pays creators 30% through their
> link with no buyer discount and no codes, sets `allow_promotion_codes: false` on every checkout,
> and keeps gift cards off sale for now. `docs/LAUNCH.md` is the source of truth for what ships;
> this file is the reasoning and the roadmap.

Every figure is marked **measured** (read-only counts from the production database and the live code, 23 Sept) or **assumption**. Commission rates, fees and competitor prices are what the programmes published in September 2026. Check each one in its dashboard before relying on it. This is not legal advice: appendix C lists four questions for a lawyer (plus one that applies only if a check turns something up), and each item says which rule keeps it legal.

## What we know (measured, 23 Sept)

- **706 paid purchases, €5,332**, 6 to 23 Sept (almost all since 12 Sept). Average order **€7.55**. 705 of 706 sessions were priced in euros. How many buyers actually paid in dollars or pounds is in Stripe's `presentment_details` and the card country, which we don't store yet (W7 reads them).
- **698 singles, 2 pick three, 6 Everything.** Almost nobody buys the bundles.
- Singles by template: The Letter 322, Birthday Cinema 118, Bouquet 87, Constellations 40, XOXO 35, The Council 24, then single digits (Bloom 8, Halfway 8).
- **The two free templates bring in half the revenue.** 362 of 706 sales are people paying €7.49 for extras on The Letter or Constellations. Since post 149 (21 Sept), The Letter alone is 193 of 331 sales (58%).
- Those 362 unlocks cover 393 paid free-template gifts, because one unlock covers later gifts on the same template. Of those gifts, 55% carry a catalogue song, 44% more than 10 photos, 31% a video and 12% a voice note. **25% were bought for the song and nothing else.**
- Premium templates: about 60% of the people who start one pay (Birthday Cinema 51 of 78, Bouquet 36 of 60, first wave). Free templates: 4.5% of starts pay (The Letter 62 of 1,383), which is about 6% of published free gifts. **A premium start is worth about €4.50; a Letter start is worth about €0.34.**
- Quiet days (16 to 20 Sept) ran at 27 to 36 sales, about €235 a day, and that was still the tail of the 13 to 14 Sept wave. The two days after post 149 (1.1M views) brought 142 and 170 sales. **One hit is worth about €1,900 in 48 hours (measured)** and plausibly €2,900 to 3,800 once its tail is counted (assumption). That is €1.70 to 3.50 per 1,000 views.
- 863 checkouts started and **155 were not paid (18%)**. 2 refunds.
- **23 singles were charged €5.99 with the code LOVE (20% off).** The code is printed in the "in character" pinned comment of 71 of the 173 TikTok scripts, post 149's included.
- 680 buyers, of whom **22 bought twice (3%)**, although 33% of the 5,555 makers made two or more gifts. 12.2% of makers paid.
- 13,959 recipients. **86% of gift opens are on free, watermarked gifts.** Opens by device (recipients, not buyers): iPhone 68%, Android 25%, desktop 7%.
- Replies: 2.3% of free gifts get one sent back, against 0.5% of premium gifts, whose recipients meet the full paywall.
- **The live site shows prices in the wrong currency.** Every live page picks the currency from the page's language, not the visitor's country: `currencyFor(locale === "es" ? "ES" : "US")` in publish-sheet, template-card, the template page, the pricing teaser and seo. Every visitor on the English pages sees $7.99, including visitors in London and Riga. The live Stripe prices carry only euros, so checkout falls back to €7.49 and Adaptive Pricing converts it: a US buyer sees $7.99 on the page and pays about $9.00.
- **The live withdrawal waiver doesn't hold.** Live Terms say the buyer gives up the 14-day right "by completing a purchase". Nothing at checkout asks for that, and the receipt doesn't confirm it.

**Planning base: €5,000 gross a month (about 660 sales).** This is an assumption: the 16 to 20 Sept level (€7k a month, still a wave's tail), decaying about 30% with no new hit. A month with two hits is about €10k. Estimates are gross. EU prices include VAT, so net after VAT and Stripe is roughly 78 to 85%. The estimates overlap and are **not additive**.

---

## 1. The answer, in one paragraph

Nearly all the money comes from one engine. A TikTok story ends on a gift, the viewer makes it and pays €7.49 at the publish sheet, and half the time that is for extras (mostly the song) on the free Letter. **The biggest lever is still the posts: one extra hit a month is worth more than every funnel change below put together.** So, in order:

1. **Make the engine safe this week.** Find out which company owns the Stripe account. Label the story accounts, and stop the in-character comments and the LOVE code. Ship one small deploy to live with your yes: a withdrawal tickbox, euro prices shown to everyone, the false Apple line removed, and "Ethos" at the top of checkout. Book the accountant.
2. **Cut over to the new site by 14 Oct at unchanged prices,** with gifts on the home page for everyone and measurement on. Nothing in the new repo earns anything until it serves tryethos.io.
3. **Then make one change at a time,** each read for 7 days: premium templates at €9.99 with a free reply included, an upgrade to Everything for the difference, a test of the Letter's price, and "try it first" on the cards.
4. **Sell the second occasion.** Birthday, anniversary and Valentine's reminders go live by 31 Oct, so a list exists by February.
5. **Launch new products for the same channel.** The Proposal (€19.99) by 9 Nov, The Question (free, with paid extras) by 15 Jan, and group gifts by 15 Feb, in time for Mother's Day.
6. **Add affiliate travel and partner gifts only once search traffic exists.**

One cost to accept: at cutover the Apple song preview stops being sold as a paid extra, because selling it breaks Apple's terms. That puts up to €650 a month at risk. Don't sell display ads, don't hide a cheaper price, don't pay for TikTok ads, and don't ship physical prints this Christmas.

**What it adds up to (assumption, rough).** At today's posting rate, the plan changes monthly revenue by between −€250 and +€1,900 by January:

- The funnel changes add €500 to 1,250.
- The Proposal and The Question add €200 to 800, most of it in January and February.
- The song change removes up to €650, and UK VAT costs €150 to 300.

February could reach €8,000 to 16,000. Every figure beyond that comes from posting.

### Rules of the house

Kept from the first version, still right:

- **Dates stays free.** It is the weekly habit that brings a couple back on the three days a year they need a gift. No paywall on the map, on planning, or on sharing a plan.
- **Money is taken where money already changes hands**: a gift, a ticket, a train, a table.
- **The price on the page is the price on the card statement,** in the currency of the buyer's country (W2). On live, run `check-prices.mjs` after every price change (appendix A).
- **No display ads, and no selling or sharing data.**
- **Partner links** are labelled, sit next to a real decision and never change the ranking. They never appear on the publish sheet or paywall, inside a recipient's gift, in a plan someone received, or in emails. Each screen gets at most one partner action and one disclosure line. No rows of logos, and nothing on map or list results.
- **Only one test runs per group of buyers at a time.** The groups are premium makers, free makers and people who have just bought. Each test runs for seven days against the week before and is judged on one number: **gift revenue per gift visitor**, meaning everyone who lands on /gifts, /templates or the editor. Paid ÷ started per template is the diagnostic. Nothing is read in cutover week.

New in this revision:

- **What each screen may carry.**

  | Screen | Budget |
  |---|---|
  | Gift page (what the recipient sees) | 0 prices, 0 forms, 0 partner links, 0 ads |
  | Gift end screen | 2 buttons + Replay, plus a small Report link |
  | Pay panel | 2 rows, 1 button, 1 line of small print (guarantee and email opt-out) |
  | Stripe page | the withdrawal tickbox only: no bump, no code field |
  | Share screen | the send buttons first, then 1 card |
  | Email | at most 1 marketing email per address every 14 days, and 6 a year |

- **Posting rules** (W1): label every gift post as an Ethos ad, never comment on your own posts from a persona or staff account, use only Commercial Music Library or original sounds, and write adult characters only.
- **Owner time** in October: about 5 hours a week beyond posting. Posting is the job that pays.

---

## 2. The money map

### Every revenue line

| Line | Status | €/month | What the number rests on |
|---|---|---|---|
| Premium templates, single (€7.49) | earning | **≈€2,350 at base** (336 sales measured, 6 to 23 Sept) | about 60% of starters pay |
| Extras on free templates (€7.49) | earning | **≈€2,500 at base** (362 sales measured) | 55% include a catalogue song |
| Pick three / Everything | earning | **≈€150 at base** (2 + 6 sales) | bundles barely sell |
| Live fixes and honest currency (W2, W5) | this week / cutover | ≈€0; protects all revenue; −€10 to 40 from the tickbox | compliance |
| Wallets: Link, Google Pay (W6) | this week | +€50 to 150; +€150 to 300 if wallets show in TikTok's browser | 18% of checkouts unpaid |
| Song on Apple's terms (M5) | cutover | **−€0 to 650** at risk | 25% of paid free-template gifts were bought for the song alone |
| Gifts-first home (W8) | cutover | protects €1,000 to 2,000; watermark +€50 to 150 | assumption: a map-first home loses 20 to 40% of gift starts |
| Copy fixes (W9) | cutover | +€50 to 150 | guarantee at the pay button, honest pricing page |
| Premium at €9.99 with the reply included (M2, M11) | cutover + 7 | **+€100 (−€150 to +€370)** | starts and conversion both fall (table in M2) |
| Upgrade to Everything for the difference (M7) | cutover + 14 | +€105 to 210 | 1 to 2% of about 650 single buyers × €16 |
| Test of the Letter's price (M10) | early November | +€200 to 350 if €8.99 holds; €0 if rolled back | break-even volume loss at €8.99 is 17% |
| "Try it first" card copy (M3) | mid November | +€0 to 250 | the switch away from the Letter is unmodelled |
| Recovery and draft-deletion notice (M13) | November | +€25 to 100 | consented addresses only |
| Reminders and a lawful email list (M6) | by 31 Oct | €0 now; €300 to 2,900 in Valentine's fortnight; €300 to 1,000/month by late 2027 | 5 to 15% of senders opt in |
| Seasonal calendar (Q2) | dated | +€3,000 to 8,000 in February (2 to 4 extra hits); year average €400 to 800 | excludes the list and search, counted elsewhere |
| The Proposal €19.99, The Question free with extras (Q1) | 9 Nov / 15 Jan | €200 to 800 averaged, about 70% in January and February | premium starters pay about 60% |
| Group gifts, "everyone signs it" (Q5) | by 15 Feb | €300 to 1,200 by month 3 to 6 | 1 to 3% of makers organise one, half pay |
| Instagram cross-posts (M8) | October | €50 to 300 in the first quarter | new-account benchmarks |
| "See it as…" in the free editor (Q4) | December test | €0 to 250 | free makers are price-sensitive |
| Free "Print it" PDF (Q8) | by 1 Dec | €0 directly; supports the €9.99 | replaces physical prints |
| "This one + two more" row (M12) | later test | €30 to 80 | 2 to 5% of premium buyers |
| Creators on commission, 3-creator pilot (M4) | later | €0 to 500 in the pilot | chance 0.2 |
| Spanish-language account (Q3) | later | €0 to 300 in the first quarter | 102 of 7,253 accounts are Spanish today |
| Gift-intent search pages (Q9) | quarter | near €0 for 3 to 4 months; €500 to 2,000 by month 9 to 12 | 5,000 to 15,000 visits a month |
| Travel affiliate, stays, partner gifts (M9, Q7) | after 10,000 search visits/month | €0 until then; €60 to 200 at 50,000 visitors | published EPCs $0.01 to 0.12 per click |
| Hand-offs from plans, long distance and games (Q4) | after traffic | €0 until measured | |
| Game packs (L1) | after traffic | €100 to 500 | 2 to 3% of hosts |
| Ethos for Two (L5) | after M14 and L1 | €600 to 2,000 | 0.1 to 0.3% of visitors |
| Display ads | **not recommended** | €150 to 500 at 150,000 pageviews | a 5% dip in gift conversion cancels them |

Together, the funnel items (W6 to M13) plausibly add **10 to 25% (+€500 to 1,250 a month)**, shipped one at a time with one offer per screen. The reminders and the seasonal calendar are what change February.

### Costs (none of these is optional)

| Cost | When | Size |
|---|---|---|
| UK VAT on digital services (owed from the first UK sale, arrears included) | now | about one sixth of UK sales; €150 to 300 a month at base |
| Stripe fees | now | €0.36 on €7.49 with a standard EEA card. Premium, UK and international cards cost more (stripe.com/ie/pricing), plus 2% when a charge is converted |
| Stripe Tax | once VAT registrations exist | 0.5% of taxed volume, about €15 to 25 a month |
| Resend | if the audit shows refused sends | Pro $20 a month (50,000 emails). Marketing broadcasts are priced by contacts: free to 1,000, about $40 a month for 5,000 |
| Accountant | this month | quote |
| AI writer (Anthropic) | only if the key is set | capped by a monthly limit, or €0 if the key is removed |
| Creator commission | pilot | 40% of net on credited sales only |
| Withdrawals of sales made before the tickbox | until 12 months + 14 days after the fix | small so far (2 refunds) |

### How the order was decided

**Done regardless, not scored.** These protect the revenue that exists, or are the law. Items marked "if needed" happen only when W3 finds a problem.

1. W3, the audit (today)
2. W1, labelled posts, no in-character comments, LOVE code expired (this week)
3. W5, the live fixes with your yes (this week)
4. M1, the cutover date (decide this week)
5. W4, VAT (this week)
6. M14, a Stripe account of Ethos's own (this week if the entity is wrong; otherwise before Valentine's)
7. At cutover: W2, W7, W8, M5, M15, and the AI writer lock (W9)

**Everything else is scored.** Expected value = chance × upside + (1 − chance) × downside, in € a month once live. Score = expected value ÷ your days (minimum 0.25, for review and approval). Owner time is the scarce resource, because posting drives all revenue. Claude's build time isn't counted, but test slots are: one change per group of buyers per week. The calendar therefore decides the order among items Claude builds. **Every item below earns €0 until cutover.**

| # | Item | If it works | Chance | If it fails | Expected | Your days | Score | Earns from |
|---|---|---|---|---|---|---|---|---|
| 1 | M2 Premium €9.99, reply included | +€370 | 0.5 | −€150 | +€110 | 0.25 | 440 | cutover + 7 |
| 2 | W6 Link and Google Pay | +€100 to 300 | 0.8 | €0 | +€100 | 0.25 | 400 | this week (settings only) |
| 3 | M7 Upgrade for the difference | +€160 | 0.6 | €0 | +€95 | 0.25 | 380 | cutover + 14 |
| 4 | M10 The Letter's price test | +€275 | 0.4 | −€50 | +€80 | 0.25 | 320 | early Nov |
| 5 | M6 Reminders and a lawful list | +€250 (year average) | 0.6 | €0 | +€150 | 0.5 | 300 | by 31 Oct |
| 6 | Q5 Group gifts | +€750 | 0.4 | €0 | +€300 | 1 | 300 | by 15 Feb |
| 7 | Q4 "See it as…" test | +€125 | 0.5 | €0 | +€60 | 0.25 | 250 | December |
| 8 | W9 Copy fixes | +€100 | 0.6 | €0 | +€60 | 0.25 | 240 | cutover |
| 9 | Q1 The Proposal, The Question | +€500 | 0.4 | €0 | +€200 | 1 | 200 | 9 Nov / 15 Jan |
| 10 | M3 "Try it first" copy | +€200 | 0.35 | −€50 | +€40 | 0.25 | 150 | mid Nov |
| 11 | M13 Recovery, deletion notice | +€60 | 0.6 | €0 | +€35 | 0.25 | 140 | November |
| 12 | M12 "+2 for later" row | +€55 | 0.5 | €0 | +€28 | 0.25 | 110 | later |
| 13 | M8 Instagram cross-posts | +€175 | 0.5 | €0 | +€88 | 2 | 44 | October |
| 14 | Q9 Search pages | +€200 (year 1) | 0.3 | €0 | +€60 | 3 | 20 | from January |
| 15 | M4 Creators, 3-creator pilot | +€900 | 0.2 | €0 | +€180 | 10 | 18 | later |
| 16 | Q3 Spanish-language account | +€150 | 0.3 | €0 | +€45 | 5 | 9 | later |
| — | M9, Q7 affiliate; Q4 surfaces; L1 game packs | €0 until traffic | | | | | | after 10,000 search visits |

Hard dates move some items forward:

- Reminders must exist before December for a list to exist by Valentine's.
- The Proposal must be live before engagement season.
- A lawful Black Friday "was" price needs €24.99 held from 28 Oct.
- Group gifts must be ready for Mothering Sunday (7 Mar).

---

## 3. The plan

**The one dependency.** tryethos.io runs from the old repo (ethoslove), which auto-deploys and is not changed from here. Everything built in the new repo (ethoswebsite) earns €0 until the new site serves tryethos.io. Until then, only the legal fixes in W5 go to live, as one deploy, with your yes.

**The new repo already holds a lot of uncommitted commerce code:** price_data checkout, creator codes, a €29 pass, gift cards, a bump, a €3.99 "make it special", a 20% reply discount, reminders, recovery, trip links and a ref-based home hero. Several parts contradict this plan (M1 lists what to change), so none of it ships until it is reconciled.

**If you only do five things:** W3 (the audit), W1 (label the posts, expire LOVE), W5 (say yes to the live fixes), M1 (cut over by 14 Oct with the must-ship list), W6 (Link and Google Pay).

### Do this week (by Wednesday 30 Sept)

| | Item | Who |
|---|---|---|
| W3 | One-hour audit: which company owns the Stripe account, whether a Terms URL is set, Resend refusals, production env vars | you, today |
| W1 | Label the story accounts and every gift post; no comments from your own accounts; LOVE expired; one ref per account per day; scripts rewritten | you; Claude rewrites the scripts |
| W5 | The live fixes, one deploy: withdrawal tickbox, FAQ, a withdrawal link, euro prices for everyone (W2), the false Apple line removed, "Ethos" on checkout | Claude prepares; you say yes |
| M1 | Set the cutover date (by Wed 14 Oct) | you |
| W4 | VAT: book the accountant; export Stripe's card-country and currency data for them | you and the accountant |
| W6 | Link and Google Pay on; test checkout inside TikTok on an iPhone and an Android phone | you (30 min) |
| W10 | National Boyfriend Day (Sat 3 Oct): 3 to 5 labelled posts on the "him" account, 30 Sept to 2 Oct | you |
| M14 | A Stripe account of Ethos's own: this week only if W3 finds the wrong company | you |

### Cutover (by Wednesday 14 Oct): the must-ship list

| | Item | Who |
|---|---|---|
| M1 | Uncommitted pricing and commerce code reconciled with this plan; prices unchanged | Claude |
| W5 | Withdrawal tickbox for every buyer, Terms s.7 rewritten, consent stored, receipts retried | Claude |
| W7 | Daily counters, the ref on every gift and purchase, the weekly money script | Claude |
| W8 | Gifts first on the home page for everyone; Dates gets a header tab; "the gift from the video"; watermark links to its template | Claude |
| W2 | Currency from the visitor's country; charged exactly as shown | Claude |
| M5 | The song no longer sold as a paid extra; preview free, on tap, with Apple's badge | Claude |
| M15 | What Everything and For Two include; review and ranking notes; report links | Claude; you approve |
| W9 | Pay-panel guarantee, pricing page, AI writer locked (the gallery sort waits for data) | Claude |
| M9 | Disclosure on every partner link that ships (Pack Your Bags' "book what's on the ticket") | Claude |

### After cutover (October)

| | Item | Who |
|---|---|---|
| M2 + M11 | Premium €9.99 with the reply included: cutover + 7 days, no later than 21 Oct | Claude; you approve |
| M6 | Reminders, the buyer opt-out, the privacy policy update: live by 31 Oct | Claude; you approve the wording |
| M7 | Upgrade to Everything for the difference, with a real 14-day window: cutover + 14 | Claude; you approve the copy |
| M8 | Instagram cross-posts of the same carousels | you |
| Q2 | Occasion pages (Boyfriend Day, Girlfriend Day, New Year) | Claude |

### November to February

| | Item | Who |
|---|---|---|
| Q1 | The Proposal (€19.99) live by 9 Nov; The Question (free, extras €7.49) by 15 Jan | Claude builds; you post |
| M10 | The Letter's price, a 7-day test, early November | both |
| M3 | "€9.99 · try it first, pay when you send" on premium cards, mid November | Claude |
| M13 | Draft-deletion notice, consented recovery, "email me a link to finish" | Claude; you add a webhook event |
| Q8 | Free "Print it" PDF on paid gifts, by 1 Dec | Claude |
| Q4 | Plan hand-off at the send step, game end cards, "See it as…" test in December | Claude |
| Q9 | Gift-intent search pages; Valentine's pages indexed by 10 Jan | Claude drafts; you edit |
| Q5 | Group gifts, live by 15 Feb for Mothering Sunday (7 Mar) | both |

### Later (when the new platform has traffic, or once the data says so)

| | Item |
|---|---|
| M12 | "This one + two more for later" as a test against the pay panel's second row |
| M4 | Creators on commission: a 3-creator pilot once W7 has per-concept data |
| Q3 | Spanish-language account, aimed first at US Hispanic viewers |
| M8b | Pinterest |
| M9, Q7 | Travel affiliate beyond what ships at cutover; stays; flowers and experiences on the dashboard |
| L1 to L9 | Game packs, codes for businesses, wedding kit, city pages and trips, Ethos for Two, sponsored venues, the long-distance loop, per-view creators, the gift card |

### The calendar

Post before the buying hours: 19:00 UK for UK stories, 23:00 UK for US ones.

| Date | Occasion | What to have ready |
|---|---|---|
| Sat 3 Oct | National Boyfriend Day | 3 to 5 labelled posts on the "him" account, 30 Sept to 2 Oct |
| by Wed 14 Oct | | cutover, with the must-ship list |
| Sat 17 Oct | Sweetest Day (US Midwest) | 1 to 2 US-leaning posts |
| by Wed 21 Oct | | premium at €9.99 (cutover + 7) |
| 15 to 31 Oct | Halloween | Trick or Treat posts (already in the tracker) |
| by 28 Oct | | Everything at €24.99 and no public code anywhere, if you want a Black Friday "was" price |
| by 31 Oct | | reminders and the buyer opt-out live, so the list grows for three months |
| by 9 Nov | engagement season starts (Thanksgiving is 26 Nov) | The Proposal live |
| Fri 27 to Mon 30 Nov | Black Friday | optional: Everything at a real reduction from €24.99, only if €24.99 was the lowest price (codes included) for the 30 days before. Otherwise no "was" price |
| by 1 Dec | | free "Print it" PDF |
| 1 to 25 Dec | Christmas | posts from 1 Dec pushing "opens at midnight on the 25th" (scheduling is a paid extra) |
| 31 Dec | New Year | a "new-year" occasion page and the midnight countdown |
| by 10 Jan | | Valentine's pages final, so search engines index them |
| by 15 Jan | | The Question live |
| by 25 Jan | | 15 or more Valentine's carousels ready |
| 1 to 14 Feb | Valentine's Day (Sun 14 Feb 2027) | Daily posts and midnight delivery. One email on Mon 8 Feb to buyers who didn't opt out ("it can open at midnight on Sunday"). Fri 12 Feb only to people who asked for a Valentine's reminder and haven't started a gift |
| by 15 Feb | | group gifts live |
| Sun 7 Mar | Mothering Sunday (UK) | posts from 20 Feb; the group gift "from all of us" |
| Sun 9 May / Mon 10 May | Mother's Day (US, Canada, Australia, Latvia) / Mexico | English posts; Spanish only if Q3 has started |
| Sun 20 Jun | Father's Day (US, UK) | posts from 6 Jun |
| Aug to Sep | back to uni, long distance | Halfway, Pack Your Bags |

---

## 4. Each item in detail

### W1. Label the story accounts, and stop the in-character comments

- **What.**
  1. Accounts 1 (the couple, today posting "as her") and 4 ("him"): put Ethos in the display name, and a bio such as "text stories by ethos · made up, the gifts are real", then the bio link.
  2. On every post that shows an Ethos gift, do all three: put "fictional story · by ethos" as text on slide 1; make the caption's first line "Ad · fictional story by @ethos"; and before posting, set More options → Disclose post content → "Your brand".
  3. No comments on Ethos posts from any account you control: staff, burner or persona accounts, and no seeded comment fights. The posting account may pin one comment written as Ethos, for example "this one's The Letter on tryethos.io. story's made up, the gift is real". Replies to real commenters are also written as Ethos.
  4. Expire the code LOVE today (Stripe → Product catalogue → Coupons) and never print a code in a comment again.
  5. Use only the Commercial Music Library or original sounds, on every account. Check in the app whether the disclosure switch restricts the sounds offered.
  6. Characters are adults (uni, work, their 20s). No school settings, and no "buy now" or "ask your parents" lines. Label AI-made images with TikTok's AI label.
  7. Keep the "control" posts (jealousy, isolation, phone-checking, solved by a gift) off the labelled accounts. If one is used, the caption or pinned comment calls the behaviour a red flag.
  8. Attribution: one ref per account per day, such as `tryethos.io/?ref=tt-couple-0924`, and one concept family per account per day. Compare families across days. Keep per-post views, profile visits and link clicks in tracker.csv (0 of 167 rows have results today).
  9. Creator briefs, when M4 starts: the branded-content switch, #ad in the first line (#reklāma for Latvian creators), the same sound and character rules, and no payment for undisclosed posts.
- **Where.** The TikTok app. Claude rewrites `docs/marketing/PLAYBOOK.md` sections 2 and 3 ("as her", "the whole pitch is that it's real"). In all 173 scripts, Claude renames "Pinned comment (in character, not a brand)" to "Pinned comment (as Ethos)", deletes LOVE (in 71 scripts), writes "Replies to have ready" in Ethos's voice, and adds the slide-1 and caption lines.
- **Why.** These accounts bring in almost all the revenue.
  - A post written "as her" ("my bf made me this") is a testimonial from a person who doesn't exist. The FTC's rule on consumer reviews and testimonials (16 CFR 465) bans that, with penalties up to $53,088 per violation. EU consumer law blacklists falsely representing oneself as a consumer (UCPD Annex I No 22) and hiding commercial intent (Art 7(2)). The CMA and ASA say the same. A bio line alone isn't disclosure.
  - Own-brand posts come under TikTok's "Your brand" disclosure setting, which TikTok says does not affect recommendation. The Branded Content Policy covers third-party brands.
  - Trending sounds are licensed for non-commercial use (UMG v Bang Energy, 2022).
  - A public 20% code makes €7.49 look like the price only fools pay. It also sets the "lowest price in 30 days" for any later "was" price.
  - PTAC (Latvia) enforces. Fines reach 4% of turnover for widespread breaches.
- **Estimate.** Protects about 100% of today's revenue (≈€5k a month, €1k+ a day in a wave). Expiring LOVE recovers about €1.50 on each of about 3% of singles. Per-day refs: +10 to 20% revenue per post if effort moves to the families that sell (assumption).
- **Effort / who.** Hours, you. Claude rewrites the scripts and PLAYBOOK in the new repo's `docs/marketing`.
- **Risk.** The label may cool comment fights a little. Compare 10 posts before and after (views, profile visits, sales per day-ref). Not labelling puts the one channel that pays at risk.
- **The rule.** A made-up story is fine. Hiding that a business is behind it is not. **Lawyer check 1.**
- Sources: [TikTok disclosure setting](https://ads.tiktok.com/help/article/about-the-commercial-content-disclosure-setting-for-advertisers), [TikTok Branded Content Policy](https://www.tiktok.com/legal/page/global/bc-policy/en), [FTC reviews and testimonials rule](https://www.ftc.gov/legal-library/browse/rules/rule-use-consumer-reviews-testimonials), [UCPD guidance 2021](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX%3A52021XC1229%2805%29).

### W2. Show the currency you charge

- **What.** **Don't add dollar or pound options to the live Stripe prices.** With the live pages as they are, that would charge every English-speaking buyer in the EU and UK in dollars.
  - **This week, on live, inside W5 (your yes):** every price shows in euros. `currencyFor` in ethoslove's `src/lib/pricing/products.ts` returns `eur`, so the page says what checkout charges. Stripe may still offer a non-euro buyer their own currency at its rate, as happens today.
  - **At cutover, on the new site:**
    - The server picks the currency from `x-vercel-ip-country` and passes it down as a prop, with no cookie: US gets USD, GB gets GBP, everyone else gets EUR (Bulgaria has used the euro since 1 Jan 2026).
    - Checkout works the currency out again from the same header. If it differs from what the page showed, it returns 409 and the sheet shows the right price.
    - Ethos sessions set `adaptive_pricing: { enabled: false }`, so the amount charged is the number shown.
    - Amounts are set so a dollar sale nets about what a euro sale does, at about $1.17 to the euro (check on the day): single $8.99 / £6.49, pick three $12.99 / £9.49, Everything $26.99 / £19.99. M2 has the later ladder.
    - Set `NEXT_PUBLIC_PRICE_CURRENCIES=eur,usd,gbp`. `llms.txt` lists only these currencies.
- **Why.** A page that shows less than the checkout charges is a misleading price (UCPD Art 6). The UK regulator fined the AA £4.2M and StubHub about £900k in 2026 for prices that grew at checkout. Dollars at $7.99 would also lose money. Today a US buyer pays about $9.00 through Adaptive Pricing and Ethos receives €7.49; a $7.99 option would net about €6.69 after Stripe's 2% conversion fee, −€0.80 a sale.
- **Estimate.** About €0: this is compliance. Showing euros on live for three weeks may cost a little US conversion (unmeasured).
- **Effort / who.** One line on live, with your yes. Hours at cutover (Claude).
- **The rule.** The shown price is the charged price, in the same currency.
- Sources: [Adaptive Pricing](https://docs.stripe.com/payments/currencies/localize-prices/adaptive-pricing), [CMA enforcement 2026](https://www.winstontaylor.com/insights/cma-consumer-protection-enforcement-in-2026-the-cma-flexes-its-new-powers).

### W3. The one-hour audit (today)

- **What.**
  1. **Stripe → Settings → Business details.** Which legal entity owns the account whose checkout says "Pay SECUORA"? If it isn't SIA "MIGLAI", then Ethos revenue, VAT and customer data sit in the wrong company, and Stripe prohibits taking payments for another business. Do M14 this week, and don't paper over it with a checkout disclaimer.
  2. **Stripe → Settings → Public details.** Is a Terms of service URL set? The W5 tickbox needs one. Our tickbox text carries its own link to Ethos's Terms, so the account-level URL can stay the other business's until M14.
  3. **Resend → Emails (logs) and Usage.** Were sends refused on 13 to 14 or 21 to 22 Sept? The free plan allows 100 emails a day and 3,000 a month. Sign-in codes, welcome emails and receipts all go through Resend, and the receipt is the legal confirmation of the waiver. If sends were refused, Resend Pro ($20 a month) is the one paid line worth keeping.
  4. **Vercel → the tryethos.io project → Settings → Environment Variables → Production.** Is `ANTHROPIC_API_KEY` set? If so, the AI writer calls a paid model free for any signed-in user, 12 times an hour. Set a monthly limit in the Anthropic console today, or remove the key until W9 locks the writer. Is `STRIPE_AUTOMATIC_TAX` set? That feeds W4.
- **Estimate.** Protective. The email check alone could be worth several sales a day in a viral week.
- **Effort / who.** One hour, you.

### W4. VAT: put it in the right country

- **What.** Questions for the accountant:
  1. Are sales to consumers outside the EU and UK being declared as Latvian 21% sales? Consumer e-services are taxed where the buyer is.
  2. UK: register with HMRC as a non-established seller of digital services. There is no threshold; VAT is owed from the first UK sale, including past ones.
  3. EU buyers outside Latvia: track cross-border consumer sales against €10,000 (this and last calendar year, goods and e-services together), then register for OSS with VID. Destination VAT applies from the sale that crosses the line. money-weekly alerts at €8,000.
  4. Other countries have thresholds: Switzerland (CHF 100k of worldwide turnover plus any Swiss consumer sale), Norway VOEC (NOK 50k), Australia (A$75k), Canada (C$30k), New Zealand (NZ$60k). Mexico requires registration from the first sale, so Q3 starts with US Hispanic viewers.
  5. Keep two proofs of each buyer's country (card country and IP).
  6. Gift cards and business codes become multi-purpose vouchers once past the OSS threshold, with VAT due at redemption. That is why L9 is on hold.
  7. How to pay creators abroad, and whether Latvian residents paid as individuals need Latvian income tax withheld.
- **Before anyone switches on Stripe Tax:** every live price and currency option must be tax-inclusive (Stripe → the price → Tax behaviour: Inclusive). Otherwise US sales tax is added on top of the shown price. The new site already sets `tax_behavior: "inclusive"`. Turn on Stripe Tax's threshold monitoring now; it is free. Enable collection only after the registrations exist.
- **Estimate.** −€150 to 300 a month of UK VAT, already owed, plus arrears. Up to +€150 to 300 if non-EU sales are over-declared at 21% today. Net −€300 to +€150. Not ranked.
- **Effort / who.** Days of the accountant's time. You. Bring a Stripe export of 6 to 23 Sept with card country and currency.
- Sources: [UK VAT for non-UK sellers](https://www.avalara.com/vatlive/en/country-guides/europe/uk/uk-vat-registration.html), [EU OSS](https://stripe.com/guides/introduction-to-eu-vat-and-european-vat-oss), [Stripe Tax pricing](https://support.stripe.com/questions/understanding-stripe-tax-pricing).

### W5. The live fixes: one deploy, your yes

- **What.** One patch for ethoslove, prepared by Claude, shipped only when you say yes, in a quiet hour (not 20:00 to 22:00 UTC):
  1. **A withdrawal tickbox for every buyer**, whatever their IP. The checkout sets `consent_collection: { terms_of_service: "required" }` and `custom_text.terms_of_service_acceptance`:
     - EN: "I ask Ethos to unlock my purchase straight away, before the 14-day cancellation period ends, and I understand that once it's unlocked I lose my right to cancel. [Terms]"
     - ES: "Pido a Ethos que desbloquee mi compra de inmediato, antes de que termine el plazo de desistimiento de 14 días, y entiendo que, una vez desbloqueada, pierdo mi derecho de desistimiento. [Términos]"

     `fulfil.ts` stores `session.consent` and the time on the purchase, and the receipt repeats the sentence. Terms s.7 is rewritten to match.
  2. **FAQ.** Until the tickbox is live: "EU and UK buyers can cancel within 14 days for a full refund: email support@…". After: "At checkout you ask us to unlock straight away and tick that you then lose the 14-day right to cancel. If a gift won't open on their phone and we can't fix it, tell us within 30 days for a full refund." Refund any withdrawal request on a pre-tickbox purchase without argument.
  3. **"Withdraw from a purchase"**, linked from /account and the footer. It stays until 12 months and 14 days after the last sale made without the tickbox.
  4. **Delete** "Previews come from Apple Music's catalogue and are cleared for embedding with credit" (`editor.music.songPreviewNote`). It isn't true as stated (M5).
  5. **Checkout says Ethos:** `branding_settings: { display_name: "Ethos", icon: { type: "url", url: <site icon> } }`, tested in Stripe's sandbox first. The header then reads Ethos. Receipts and the Apple Pay sheet still show the account's name until M14.
  6. **Euro prices for everyone** (W2).

  The new site ships the same at cutover: the tickbox for everyone replaces the "By paying…" line drafted in `src/lib/stripe/line-items.ts`, Terms s.7 is rewritten, and receipts go through a retry queue with an alert on failure.
- **Where (ethoslove).** `src/lib/pricing/products.ts`, `src/app/api/stripe/checkout/route.ts`, `src/lib/stripe/fulfil.ts`, a migration adding a consent column, `src/emails/templates.tsx`, `src/content/legal.ts` (s.7 and the FAQ), `messages/en.json` and `es.json`, the account page and the footer.
- **Why.**
  - Under the Consumer Rights Directive, an EU or UK buyer of digital content can cancel within 14 days and pay nothing, even after the gift was sent and opened, unless they gave prior express consent, acknowledged losing the right, and got confirmation on a durable medium (Art 16(m), 14(4)(b), 8(7)).
  - "By completing a purchase" in the Terms is not express consent, and a line of text above the button is contested (Cologne, 2019). So every sale since 6 Sept can be withdrawn, and because the information given was wrong, the period may run to 12 months plus 14 days (Art 10).
  - "We can't refund a change of heart" misstates the law (UCPD Art 6(1)(g)).
  - Since 19 June 2026, the withdrawal function is required (Art 11a).
  - An IP-based tickbox would miss VPN users and travellers, because the law goes by residence (Rome I Art 6).
  - A receipt that never arrives breaks the third condition, so a receipt Resend refused is a refundable sale.
- **Estimate.** Protects €50 to 200 a month, plus the tail risk of a "get your money back after sending it" post going round TikTok. Costs perhaps 0.5 to 2% of checkouts (€10 to 40).
- **Effort / who.** Hours, Claude. You check the Terms URL (W3) and say yes.
- **The rule.** The tickbox wording matches Terms s.7 word for word. **Lawyer checks 2 and 4.**
- Sources: [Stripe: terms of service consent](https://docs.stripe.com/payments/checkout/customization/policies), [Stripe: Checkout Session branding_settings](https://docs.stripe.com/api/checkout/sessions/create), [Osborne Clarke on withdrawal](https://www.osborneclarke.com/insights/withdrawal-right), [the withdrawal button from June 2026](https://www.gtlaw.com/en/insights/2026/5/eu-consumer-law-new-withdrawal-button-requirements-for-online-contracts).

### W6. Link and Google Pay

- **What.**
  1. Stripe → Settings → Payments → Payment methods: turn on **Link**, which works inside in-app browsers, and **Google Pay**. If the other business on the account objects, create a configuration named "Ethos" instead (Cards, Apple Pay, Google Pay, Link, Revolut Pay, and iDEAL, Bancontact and BLIK for their countries) and send Claude the `pmc_` id. The new site then passes `payment_method_configuration` from `STRIPE_PMC_ETHOS`. PayPal comes after M14 (about €0.75 to 0.85 on a €7.49 sale). Skip Klarna.
  2. **The in-app test.** Open the bio link inside the TikTok app on an iPhone and an Android phone, go to checkout, and note which wallets show. Apple Pay is normally off in in-app browsers that inject scripts, and Google Pay works only if the app opted in.
  3. If wallets don't show, add a "Pay faster in Safari / Chrome" hint, but only on /gifts inside TikTok's browser and only before a draft exists. Guest drafts and photos live in that browser, so moving browsers mid-gift loses them. For a draft already started, the only safe hand-off is M13's "email me a link to finish on another device".
- **Why.** 18% of checkouts are left unpaid. Stripe's payment-method study reports that relevant wallets lift conversion (Apple Pay by about 22% on eligible checkouts). The 25% Android figure is recipients' opens, not buyers'.
- **Estimate.** +€50 to 150 a month (1 to 3%) unless the in-app test shows wallets; +€150 to 300 if it does.
- **Effort / who.** 30 minutes for you. The code is minutes of work at cutover.
- Sources: [Stripe payment-method study](https://stripe.com/blog/testing-the-conversion-impact-of-50-plus-global-payment-methods), [payment method configurations](https://docs.stripe.com/payments/payment-method-configurations), [Google Pay in Android WebView](https://developers.google.com/pay/api/android/guides/recipes/using-android-webview).

### W7. Measure before changing anything (ships with cutover)

- **What.**
  1. **The ref on every gift and purchase.** `purchases.ref` exists in the drafted migration 0009. Add `gifts.ref` and `gifts.reply_to_gift_id`. The reply link carries a signed token (an HMAC of the gift id), and the server resolves it. A gift id never goes into a URL, a ref, funnel data or Stripe metadata.
  2. **Daily counters, not raw rows.** A `funnel_daily` table (day × event × template × ref → count) is upserted by `POST /api/events`, with no user id, no IP and nothing stored on the phone. Events: gift_visit, editor_open, extra_added, publish_sheet_shown, plan_chosen, pay_clicked, paid, published, reply_clicked, watermark_clicked, reminder_saved, partner_click. Raw rows would reach 0.4 to 3 million a month and outgrow Supabase's free 500 MB. The Vercel custom events drafted in `src/lib/analytics/track.ts` count against the Pro plan's analytics allowance, so decisions read Supabase.
  3. While a ref is in memory, internal links to /create and /templates carry it.
  4. **`scripts/money-weekly.mjs`**, read-only.
     - From Supabase: sales by template, product, day and ref; revenue per gift visitor; extras on paid gifts; repeat buyers; reply rate; unpaid checkouts.
     - From Stripe: presentment currency, card country, wallet or card, refunds and disputes, UK sales, and EU cross-border consumer sales, with the €8,000 alert.
- **Why.** No event exists anywhere today, and no post can be tied to revenue. Every test below has a downside case that can't be read without a before and after. The "most buyers pay in dollars" assumption becomes a measurement.
- **Effort / who.** Hours, Claude.
- **The rule.** Server-side counts that store nothing on the device need no consent banner (ePrivacy Art 5(3)). Never log names, messages, photos, emails or gift ids.

### W8. Visitors who came for a gift land on gifts (ships with cutover)

- **What.**
  1. At cutover, `/` and `/es` show gifts first for everyone: "the gift from the video", then the gallery. Dates gets its own header tab at /dates and a section further down the home page. Flip back only once Dates has measured revenue per visitor. The ref-based hero drafted in `src/lib/attribution/landing.ts` is the fallback if you want Dates first for visitors with no ref.
  2. `src/config/featured.ts` has a line per day-ref naming the template in the current video. You change one line per new carousel.
  3. The watermark links to `/templates/<slug>?ref=wm-<slug>` (drafted today as `?ref=watermark`).
  4. Old bio links (`?ref=tt-couple`, `tt-ideas`, `tt-him`) keep working.
- **Why.** Every sale so far came from someone who came to make a gift, and many of them arrive without a ref: people who type the address from the watermark, returning buyers, DM shares, and anyone whose in-memory ref was lost on reload. 86% of gift opens carry the watermark, the most-seen ad Ethos has.
- **Estimate.** Protects €1,000 to 2,000 a month from cutover day (assumption: a map-first home loses 20 to 40% of gift starts). The watermark link adds €50 to 150.
- **Effort / who.** Hours, Claude.
- **Risk.** A routing bug that catches sign-in or `/g` links. Test it.

### W9. Cheap fixes: pay panel, pricing page, gallery order, AI writer

- **What.**
  - **Pay panel** (`editor.publishSheet`, en and es):
    - payNote becomes "Won't open on their phone and we can't fix it? Full refund within 30 days. No subscription." That matches Terms s.8.
    - "Card, Apple Pay and more" stays out until W6 is confirmed.
    - The button becomes "Pay €7.49 and send it to {name}".
  - **/pricing:**
    - The price cards go above For Two.
    - Pick three says "3 singles would be €22.47" instead of a struck-through price.
    - "Forever" becomes "Pay once. No subscription, no expiry." (M15).
  - **Gallery order.** Until W7 has two weeks of data, the order is set by hand: the gift from the video, Birthday Cinema, Bouquet, The Letter, XOXO, The Council, Constellations. After that, order by paid revenue per start over 30 days. Sorting by unlock count would put The Letter first, and it is the template worth least per start (€0.34 against about €4.50). No popularity badge for now: a true one would sit on The Letter.
  - **`src/app/llms.txt/route.ts`:** list only the currencies charged.
  - **AI writer** (`src/app/api/ai/write/route.ts`):
    - Only for accounts with a paid unlock, with a daily cap and an 18+ tick.
    - Labelled in the UI: "Drafted by AI (Anthropic's Claude). Edit it before you send."
    - Anthropic is named as a processor in the privacy policy.
- **Estimate.** +€50 to 150 a month together (assumption). The AI lock prevents an open-ended bill.
- **Effort / who.** Hours, Claude. You confirm the guarantee wording.
- **The rule.** The guarantee matches the Terms word for word. A struck-through price must be one actually charged. The AI label isn't required on the gift itself: AI Act Art 50(4) covers text published to inform the public, not a love letter.

### W10. National Boyfriend Day, Saturday 3 October

- **What.** 3 to 5 "for him" carousels on the "him" account, posted 30 Sept to 2 Oct at 19:00 and 23:00 UK, ending on a premium reveal (Birthday Cinema, Bouquet, XOXO) or on The Letter with its song. Labelled as in W1, with a per-day ref.
- **Estimate.** One hit is about €1,900 in 48 hours (measured). Most posts earn far less.
- **Effort / who.** You. Claude can draft scripts from VIRAL-FORMULA.md.

### M1. Cut over by 14 October, at unchanged prices

- **What.** Decide the date this week. The cutover release carries the must-ship list (section 3) and nothing that changes a price. The uncommitted code in the new repo is reconciled first:
  - **Prices at cutover = live prices:** single €7.49 for every template, pick three €10.99, Everything €22.99, in USD and GBP as in W2. The draft sets €9.99 for every template, which would raise The Letter by 33% untested.
  - **The €3.99 "make it special" product comes off sale** (see M10 for why).
  - **The pay-panel bump** ("every other template, forever" for +€14.99) **comes off.** It sells the same buyer as M7, and on a €3.99 purchase it would sell every template for €18.98 against Everything at €24.99.
  - **The 20% reply discount comes off** (M11 replaces it).
  - **The €29 pass stops granting templates** (M15).
  - **Creator codes credit through the creator's ref only,** with no buyer discount and no code box (M4). `allow_promotion_codes: false`.
  - **Checkout expiry goes back to 24 hours** (the draft has 1 hour, which kills sessions buyers would have returned to).
  - **Stripe metadata carries no gift ids, names or notes.** The gift card's recipient name and note are stored with the purchase.
  - **The gift card stays built but unsold** until the accountant settles voucher VAT (L9).
- **Why.** Every funnel item in this plan is built in the new repo and earns nothing until cutover. Cutover changes every funnel at once, so its week can't be read as a test. Prices therefore change a week later (M2).
- **If it slips.** If cutover lands after 21 Oct, drop the Black Friday "was" price and move M2 and the reminders to cutover + 7.

### M2. The price ladder (cutover + 7, no later than 21 Oct)

- **What.** The amounts in `src/lib/pricing/products.ts` change in one deploy. The new site charges through `price_data`, so there is nothing to create in Stripe.

  | | At cutover | Cutover + 7 |
  |---|---|---|
  | One premium template | €7.49 / $8.99 / £6.49 | **€9.99 / $11.99 / £8.99** |
  | The Letter or Constellations with every extra | €7.49 / $8.99 / £6.49 | **unchanged** (M10 tests it) |
  | Pick three | €10.99 / $12.99 / £9.49 | €14.99 / $17.99 / £12.99 |
  | Everything | €22.99 / $26.99 / £19.99 | **€24.99 / $29.99 / £21.99** |
  | The Proposal (Q1) | — | €19.99 / $23.99 / £17.99 from 9 Nov |

  Dollars are set so a US sale nets about what a euro sale does. $9.99 would cut US revenue per premium sale by about 15%.
- **The pay panel.** Two rows, one button, one line of small print.
  - Premium templates: [This template €9.99] and [Every template, and every one we add €24.99].
  - Free templates: [The Letter with every extra €7.49] and the same Everything row.
  - Premium templates add the line "Pay once, no expiry. {name} can send one back free." (M11).
- **Read it for 7 days against the week before** on gift revenue per gift visitor, with premium paid ÷ started per template as the diagnostic. 45% paid ÷ started is the break-even only if starts hold; if starts fall 10%, it is 50%.
- **Estimate.** Base: 320 premium sales a month at €7.49 (€2,397).

  | Starts | Paid ÷ started | Revenue | Change |
  |---|---|---|---|
  | unchanged | 52% | 277 × €9.99 = €2,770 | +€370 |
  | −10% | 52% | 250 sales = €2,493 | +€96 |
  | −15% | 50% | 227 sales = €2,265 | −€133 |

  Expected about +€100 (−€150 to +€370).
- **Why.** When 60% of the people who reach a paywall pay, price is not what stops them. The Letter's extras are half the revenue and have never been price-tested, so they stay put until M10.
- **Effort / who.** Hours, Claude, with your yes.
- **The rule.** Every visitor in a country sees the same price for the same template. A later "was" price must be the lowest price charged in the previous 30 days, including any public code (Omnibus Art 6a, CJEU C-330/23). Changing back resets that clock.
- Sources: [CJEU C-330/23](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A62023CJ0330), [Commission guidance on Art 6a](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:52021XC1229(06)).

### M3. "€9.99 · try it first, pay when you send" (mid November)

- **What.** After M2 and M10 have been read, premium cards and template pages say "€9.99 · try it first, pay when you send", and the editor's top bar shows a chip "€9.99 when you send". Run it for seven days, judged on gift revenue per gift visitor.
- **Why.** Premium makers already pay after seeing their own gift, but the card doesn't say so. The copy leads with the price, not with "free", so "it said free" doesn't reach the comments.
- **Estimate.** +€0 to 250 a month. The upside comes from more premium starts; the unmodelled part is how many of them are Letter starts moving over.
- **The rule.** The price sits on the same line as "try it first", on every card and in the editor (UCPD Art 7(4)).

### M4. Creators on commission (later: a 3-creator pilot)

- **What.** Once W7 has per-concept data, recruit 3 creators.
  - Each gets a link, `tryethos.io/?ref=c-<handle>`, and is credited only on checkouts that arrived through it. There is no buyer discount and no code box.
  - They are paid 40% of net (after VAT, refunds and disputes) monthly, after the 14-day window, with a €20 minimum. `scripts/creator-payouts.mjs` (read-only) totals it.
  - The /creators page and creators table are already drafted; the code box and discount come out.
  - The brief is an iMessage story that ends on a premium reveal, or The Letter with its song, and is never "it's free". W1's disclosure, sound and character rules apply.
- **Why.** You pay only when something sells. A code shown to every viewer is a public price cut, which breaks the "was" price rule. Typed codes also leak, as LOVE did, and then pay commission plus a discount on organic sales.
- **Estimate.** €0 to 500 in the pilot; €300 to 1,500 a month if it scales. Chance 0.2. At €1.70 to 3.50 of revenue per 1,000 views, a creator earns about €0.50 to 1.20 per 1,000 views, below per-view programmes ($0.75 to 2 per 1,000), so recruit creators who would post this format anyway.
- **Effort / who.** About 10 of your days (recruit, brief, pay). Claude builds.
- **The rule.** Ethos is liable alongside the creator, so the terms include a takedown right.

### M5. Put the song on terms Apple allows (do regardless; ships with cutover)

- **What.**
  1. This week, delete the "cleared for embedding" sentence (W5).
  2. At cutover, take "a real song" out of every paid feature list: `publishSheet.featureSong`, the pricing features and `pricing.freeNote`.
  3. The preview becomes free on every gift. It plays once on tap, doesn't loop, never plays under a video, and sits next to the "Listen on Apple Music" badge and "Preview courtesy of Apple Music" (`src/templates/_shared/SongDedication.tsx`, `src/app/api/music/search/route.ts`). Inside `/g/`, the badge links to the track with no affiliate token; the token goes only in the editor's song picker.
  4. The paid extras become video, voice note, 20 photos, scheduling and no footer.
  5. The fallback, if Apple objects anyway: drop Apple previews and keep the free song link, which opens the full song.
  6. Apply to Apple Services Performance Partners for the picker's links.
- **Why.** Apple's Search API terms allow previews only to promote store content: not for entertainment value, not synchronised with video, and not to promote other goods. A paid gift that loops a preview under an animation is the excluded use, and "25% bought for the song alone" is the evidence. Apple can switch the API off.
- **Estimate.** −€0 to 650 a month (the song-only sales at risk), plus part of the ≈€1,400 that include a song. Cutover week becomes the free makers' new baseline.
- **Effort / who.** Hours, Claude. You apply to Apple.
- Sources: [Apple Search API terms](https://performance-partners.apple.com/search-api).

### M6. Reminders and an email list you're allowed to use (live by 31 Oct)

- **What.** The reminders table, the daily cron, `ReminderEmail` and the share-screen form are already drafted. Change them to this:
  1. **One question, one tap:** "Want a nudge before the next one?" with [Their birthday] [Our anniversary] [Valentine's]. Ask for a date only when one is needed, then confirm: "We'll email you 9 days before, and once more 2 days before if you haven't made one. Nothing else." The tap is the consent; store the wording and the time. Guests confirm they're 16 or older.
  2. **Where it's offered:**
     - the share screen's one card, after the first share tap;
     - a link in `GiftOpenedEmail` and `ReactionEmail` (a service link, with no price or offer);
     - the dashboard.

     Never on the recipient's end screen.
  3. An optional "every month" setting for couples who count months (untested). Ask about Mother's Day only in February and April, and only people who once made a gift for mum.
  4. **Buyers:** small print on the pay panel, shown before checkout collects the email: "We'll email you before Valentine's and Mother's Day. [ ] No thanks." Add the same opt-out notice to the sign-up screens now, so future buyers are covered.
  5. **The 7,253 existing accounts get no marketing.** They can opt in.
  6. **Privacy policy:** rewrite `src/content/legal.ts` (around line 342 it says "We don't send marketing emails") to cover reminders (consent), buyer emails (opt-out) and recovery (consent). You approve it.
  7. **Email budget:**
     - at most one marketing email per address every 14 days, and six a year;
     - the 2-day reminder goes only if no gift was started after the 9-day one;
     - no recovery email within 7 days of a marketing email;
     - no open-ended "gift ideas" series.
  8. **Resend setup:** open and click tracking off; sends from a subdomain; one-click unsubscribe in every email; reminders included in the account export. The recipient's birthday is someone else's data, so keep only the first name, day and month, and delete it on unsubscribe.
- **Why.** Only 3% of buyers paid twice, though a third of makers made two gifts. The second occasion happens and isn't sold. Moonpig built its business on this (101 million occasion reminders).
- **Estimate.** €0 now. €300 to 2,900 in Valentine's fortnight (assumption: 5 to 15% of senders opt in, the swing number; read it in early November). €300 to 1,000 a month by late 2027 as birthdays recur. Cost: Resend's contact-based pricing once the list passes 1,000.
- **Effort / who.** Days, Claude. You approve the wording and check the Resend plan before February.
- **The rule.**
  - Latvia's e-marketing law needs prior consent, except for your own buyers offered a free opt-out when the address was collected, and in every email, about similar products (ePrivacy Art 13(2)).
  - Consent text must name every email it covers.
  - Email tracking pixels need consent (EDPB Guidelines 2/2023).
  - **Lawyer check 3.**
- Sources: [Moonpig FY25 results](https://www.moonpig.group/media/ylcfmqgj/moonpig-group-plc-fy25-full-year-results-announcementpdf.pdf), [Latvia e-marketing](https://www.dlapiperdataprotection.com/index.html?t=electronic-marketing&c=LV), [Resend pricing](https://resend.com/pricing).

### M7. Upgrade to Everything for the difference (cutover + 14)

- **What.**
  - **When it shows:** when someone who bought a single opens a second premium template within 14 days, the publish sheet shows both prices: "This template €9.99, or €15.00 more for every template (your €9.99 counts until 4 Nov)". It also shows on /account. It appears in the receipt only after M6's opt-out exists, and never on the share screen before 31 Jan (that slot is the reminder's).
  - **How the price is set:** the server works out Everything minus what the buyer paid in the last 14 days, in the currency they paid, and creates the line itself.
  - **Who qualifies:** a paid, unrefunded single or pick three, and no Everything.
  - **Refunds:** a refund of the first purchase revokes the upgrade.
  - **The drafted code changes:** `src/lib/commerce/pricing.ts` credits every past payment forever with a €4.99 floor. It needs the real 14-day window instead.
- **Why.** Today a second template costs full price again. Everything sold 6 times in 706.
- **Estimate.** +€105 to 210 a month (1 to 2% × 650 single buyers × €16). Shopify's add-on benchmarks don't transfer to a €7.49 digital product.
- **Effort / who.** Days, Claude. You approve the copy.
- **The rule.** The window is real (a false "limited time" is banned outright, UCPD Annex I No 7). Both prices are shown, so the upgrade never replaces the standard price.

### M8. Instagram cross-posts (October; Pinterest later)

- **What.** A business account, `ig-couple`. The same carousels 1 to 2 hours after TikTok, exported clean (no TikTok watermark), with the same labels as W1 and a per-day ref. Pinterest waits until W7 shows which templates sell per visit.
- **Estimate.** €50 to 300 in the first quarter. A new account sits in Socialinsider's 1K to 5K follower row: about 993 views per carousel against 580 per Reel.
- **Effort / who.** About 2 of your days a month.
- Sources: [Socialinsider Instagram benchmarks](https://www.socialinsider.io/social-media-benchmarks/instagram).

### M9. Travel affiliate: only what's built, labelled

- **What.**
  - **At cutover, only the parts already built ship, and each carries its disclosure.** Pack Your Bags' "book what's on the ticket" is the sender's one card after publishing. Each link carries a `sub_id` naming the placement (never a user or gift id), `rel="sponsored noopener noreferrer"` and a partner_click count. Next to it: "Partner links: if you book, we may earn a commission. Your price is the same." (en and es). A partner-links paragraph goes into the privacy text.
  - **Flights:** Kiwi.com first once approved; Aviasales only after you've read Travelpayouts' contracting and paying entity (appendix C, 5); Google Flights last, labelled "no commission".
  - **No car link** until DiscoverCars approves (Auto Europe pays about $0.01 a click).
  - **Tickets** only on the page of a place that sells tickets.
  - **Partners get only the place, dates and party size,** never names, emails or gift ids.
  - **A plan someone received carries no partner links.**
  - Everything else waits for 10,000 search visits a month.
  - Fix docs/TRIPS.md (Kayak has left Travelpayouts).
- **Estimate.** €0 until there is traffic; €60 to 200 a month at 50,000 visitors (published EPCs: Aviasales $0.12, Tiqets $0.09, Kiwi.com $0.08, Omio $0.07).
- **The rule.** Disclosure sits where the link is (UCPD Art 7(2); FTC; ASA). Never rank a place higher because it pays (Annex I No 11a). Plain links only, never partner scripts. Never sell travel or take payment for it (package travel law).
- Sources: [Kiwi.com](https://www.travelpayouts.com/en/offers/kiwi-affiliate-program/), [Aviasales](https://www.travelpayouts.com/en/offers/aviasales-affiliate-program/), [Omio](https://www.travelpayouts.com/en/offers/omio-affiliate-program/), [Tiqets](https://www.travelpayouts.com/en/offers/tiqets-affiliate-program/), [DiscoverCars](https://www.discovercars.com/affiliate).

### M10. The Letter's price, tested (early November; replaces the €3.99 downsell)

- **What.** One price for everyone for a whole week, judged on gift revenue per gift visitor, after M2 has been read and the cutover baseline exists. W7 sets the direction:
  - If many free makers add an extra and then leave without paying, test **€4.99**.
  - Otherwise test **€8.99**. At €8.99 the break-even volume loss is 17%; a 5 to 10% loss gives +€200 to 350 a month.

  Roll back if revenue per gift visitor falls.
- **Why.** The Letter's €7.49 is half the revenue and has never been tested. The hidden €3.99 downsell is cut:
  - Its expected value was negative (0.5 × €250 + 0.5 × −€300).
  - Hiding a cheaper price until the exit tap is an omission risk (UCPD Art 7).
  - Comment fights would spread "tap no and it drops to 3.99" within a day.
- **Estimate.** +€200 to 350 if €8.99 holds; €0 if rolled back.

### M11. The reply is included (ships with M2)

- **What.**
  1. Someone who receives a paid premium gift can send one back with the same template for free. The reply works like a free template: the footer stays on and extras cost €7.49. The editor shows a banner: "{sender} covered your reply. Make it and send it back."
  2. On paid gifts' end screens, a text link under Replay: "or make one for someone else" (`/gifts?ref=g`, with no gift id). On free gifts the watermark already does this.
  3. `/g/<id>` gets its own web manifest, so "Add to Home Screen" opens the gift (`src/app/manifest.ts` has `start_url: "/"` for the whole site).

  The drafted 20% reply discount and its price line in `EndScreen.tsx` come out.
- **Why.** A premium gift gets a reply 0.5% of the time against 2.3% for a free one, because the recipient meets the full price. A €3.99 reply would earn about €30 to 40 a month and put a price inside a love letter. A +€2.99 "let them reply" bump would charge about 98% of buyers for nothing. Included, it supports the €9.99 and puts the watermark on new phones.
- **Estimate.** +€50 to 150 a month (assumption: holding 1 to 2 points of premium conversion is worth about €56 a point at €9.99, plus replies that reach new phones).
- **Effort / who.** Days, Claude (`src/lib/editor/reply-seed.ts`, `src/lib/gift/publish.ts`, `EndScreen.tsx`, the manifest).

### M12. "This one + two more for later" (later, as a test)

- **What.** A swap test for the pay panel's second row: "This one + two more, whenever you need them: €14.99". Two saved template credits go into a `template_credits` table and show on /account. Refunds remove them. Unused credits are refundable for 14 days, because the waiver can't cover what hasn't been supplied.
- **Estimate.** €30 to 80 a month (2 to 5% of 320 premium buyers × €5).

### M13. Draft-deletion notice and consented checkout recovery (November)

- **What.**
  1. Signed-in drafts get a plain notice 24 hours before the 7-day purge (`src/lib/gift/retention.ts`): "Your gift for Anna will be deleted on Friday. Open it to keep it." No price, no offer.
  2. Checkouts keep the 24-hour expiry, with Stripe's recovery link on. On `checkout.session.expired`, one email goes out, only to an address with consent. Stripe's own consent box works only for US businesses, so in practice this means past buyers under M6's opt-out, or accounts that ticked "remind me if I leave a gift unfinished". The draft in `src/lib/stripe/recovery.ts` relies on the US-only box.
  3. Guests get "Email me a link to finish on another device". It signs them in and saves the draft, a service they asked for.
- **Estimate.** +€25 to 100 a month.
- **Effort / who.** Days, Claude. You add `checkout.session.expired` to the live webhook's events.
- **The rule.** A discount in the deletion notice would make it marketing. One reminder, never a series.
- Sources: [Stripe abandoned carts](https://docs.stripe.com/payments/checkout/abandoned-carts), [Stripe promotional consent (US only)](https://docs.stripe.com/payments/checkout/promotional-emails-consent).

### M14. A Stripe account of Ethos's own

- **What.** A second account under the same login, for SIA "MIGLAI":
  - public name "Ethos", statement descriptor "TRYETHOS.IO", a support email and the Terms URL;
  - the Apple Pay domain verified; Google Pay, Link and PayPal on;
  - the webhook with its events plus `checkout.session.expired`.

  Swap the Stripe env vars in Vercel in a quiet hour. Keep the old account's webhook for refunds and disputes on old sales.
- **Why.**
  - On a shared account, a hold or a reserve during a viral spike stops all revenue, and the other business's too.
  - Disputes above 0.75% (five a month at 660 sales) count as excessive for both.
  - Receipts and the Apple Pay sheet still name the other business.
  - If the account belongs to a different company, the checkout names a different trader from the one in the Terms (CRD Art 6(1)(b) to (c)), Ethos customer data sits in a third company with no processing agreement, and VAT is booked in the wrong place.
  - The subscription product (L5) depends on this account.
- **Estimate.** All revenue is at risk if the shared account is held. About +€50 a month from fewer disputes.
- **Effort / who.** Days of verification, you. Claude swaps the env vars. This week if W3 finds the wrong entity; otherwise before Valentine's. Switch before a big push, not during one.
- Sources: [Stripe: multiple accounts](https://docs.stripe.com/get-started/account/multiple-accounts).

### M15. Say what things include (ships with cutover)

- **Everything.**
  - "Forever" and "yours for good" become "Pay once. No subscription, no expiry."
  - The blurb: "Every template we've made and every one we add, for as long as Ethos runs."
  - Terms s.6: "Everything unlocks every gift template, including future ones, with all extras. It doesn't include group-gift mode, game packs or prints."
  - Everything buyers from before that date keep group-gift mode free (there are only 6).
  - This has to be settled before M7 pushes Everything volume up, because the code grants `*`, meaning all current and future templates.
- **For Two.**
  - The card stops promising "Every gift template". The €29 pass in `products.ts` stops granting templates.
  - The card says "From €29 a year for people on this list", and that price is honoured for year one for everyone who joined before the change.
  - It stays a non-renewing 365-day pass.
  - Waitlist emails carry only the launch notice, never M6 marketing.
- **Reviews and ranking (Dates).**
  - Next to reviews: "Reviews come from signed-in Ethos users. We don't check that they visited. We remove reviews that break our rules." (UCPD Art 7(6), Annex I No 23b.)
  - On lists: "Sorted by distance, rating and number of reviews. Nobody pays to be listed." (Art 7(4a).)
  - A "Report" link on each review and on each gift's end screen (DSA Art 16).
- **Effort / who.** Hours, Claude. You approve.

### Q1. The Proposal and The Question

- **What.** Two templates, built with the build-gift-template skill.
  - **The Proposal** (€19.99 / $23.99 / £17.99, a new tier, no footer), live by 9 Nov. A ring box, "our story" in photos and the song, then "Will you marry me?". No runaway button, so it can't read as a joke. After the Yes, a second link, "We're engaged", for family. Everything owners get it.
  - **The Question** is the **third free template**, live by 15 Jan. "Will you be my girlfriend / Valentine / move in with me?" The No button runs from the finger; Yes brings confetti, photos and the message, and the answer reaches the sender through the reaction email. The footer stays on, and extras cost €7.49, including "opens at midnight on the 14th".
- **Why.** The only measured viral wave ran on a free template with paid extras. The runaway-No page is already a free trend, so charging €9.99 for it invites "it's free on X" comments, while a free one puts the watermark on a new phone with every Yes in Valentine's fortnight. About 47% of US engagements happen between Thanksgiving and Valentine's Day.
- **Estimate.** €200 to 800 a month averaged, about 70% of it in January and February (assumption).
- **Effort / who.** Days each, Claude. You post the carousels, with adult characters.
- **The rule.** The price is on the card before the editor opens.
- Sources: [the TikTok trend](https://www.tiktok.com/discover/will-you-be-my-valentine-yes-or-no-website), [engagement season](https://www.millsjewelers.com/blogs/blog/welcome-to-engagement-season-when-47-of-marriage-proposals-take-place).

### Q2. The seasonal calendar

- **What.** The dated table in section 3.
  - **Code:** "boyfriend-day", "girlfriend-day" and "new-year" occasions and pages (`src/config/occasions.ts`, messages, `src/app/sitemap.ts`), with the Valentine's pages final by 10 Jan.
  - **You:** carousel batches ahead of each date, with 15 or more Valentine's carousels by 25 Jan.
  - **Email:** M6's budget: one email on Mon 8 Feb to buyers, and Fri 12 Feb only to people with a Valentine's reminder who haven't started a gift.
- **Why.** US Valentine's spending was forecast at a record $29.1B for 2026 (NRF). It is the one fortnight when every viewer has the problem the stories solve.
- **Estimate.** +€3,000 to 8,000 in February, from 2 to 4 extra hits over the normal rate; the list and search are excluded because they are counted in M6 and Q9. Christmas and New Year are about half that. Each smaller date is €300 to 1,000. Year average €400 to 800.
- **The rule.** Countdowns only to real dates.
- Sources: [NRF Valentine's Day](https://nrf.com/research-insights/holiday-data-and-trends/valentines-day).

### Q3. A Spanish-language TikTok account (later)

- **What.** Adapt the winning scripts (not word for word) for US Hispanic viewers first, with the bio link `tryethos.io/es?ref=tt-es-<day>` and a native speaker reviewing every post. Mexico comes only after SAT registration (W4). Anchors: 14 Feb ("Día del Amor y la Amistad") and 10 May.
- **Why.** Only 102 of 7,253 accounts are Spanish, because nothing markets in Spanish. It waits for W2's display by country (`/es` would otherwise show euros everywhere) and for per-concept data.
- **Estimate.** €0 to 300 in the first quarter.

### Q4. Hand-offs to a prefilled premium gift

- **What.**
  - **/plan:** the choice sits at the send step, in the planner's view only: "Send the link" (free) or "Send it as a surprise they open · €9.99", opening the plan gift drafted in `src/lib/dates/plan-gift.ts` with the plan carried in. A plan someone received shows only "Plan the next one" (free), with no gift button and no partner links.
  - **Meet in the middle:** "Send them the halfway point" opens Halfway with both towns filled in.
  - **Games:** an end card, "Loser makes the next gift", with both names filled in (`game-end.tsx`).
  - **Free editor:** a "See it as…" strip (Birthday Cinema, Bouquet, Scrapbook) that carries the words and photos into a premium template in one tap. Shown once, as a December test.
- **Estimate.** "See it as…": €0 to 250 as a test. Plans, long distance and games earn €0 until they have measured traffic.
- **The rule.** Sharing a plan stays free. The gift is an extra, never a gate.

### Q5. Group gifts, "everyone signs it" (live by 15 Feb)

- **What.** On Birthday Cinema (friends' messages as the closing credits), Jar of Reasons, The Toast and Scrapbook:
  - The organiser shares a contribute link. Contributors add a note and a photo without an account, and the organiser approves each entry, then sends as usual.
  - Pricing: €9.99 for up to 25 contributors, €19.99 unlimited with video, shown before anyone is invited.
  - Each contributor later gets "here's the gift you signed", with the make-your-own ending.
  - Aimed at Mothering Sunday (7 Mar), with siblings joining in, and US Mother's Day (9 May).
- **Why.** Kudoboard sells the same job at $6.99 to 19.99 a board. It is the only loop where one maker brings in 10 to 30 new people.
- **Estimate.** €300 to 1,200 a month by month 3 to 6 (assumption: 1 to 3% of makers organise one, half of them pay).
- **Effort / who.** Weeks, Claude. You set the prices and a report contact.
- **The rule.**
  - Never collect or pool money from contributors: that is a payment service (PSD2) and breaks Stripe's terms.
  - Contributors get a privacy notice and "don't upload photos of children who aren't yours".
  - Every contributed item gets a report link (DSA).
- Sources: [Kudoboard pricing](https://www.kudoboard.com/pricing).

### Q7. Stays and partner gifts (after traffic)

- **What.** Stays: plain Stay22 links on overnight trip stops, the halfway city and Pack Your Bags (never its script or map), applied for once the new site has traffic. Flowers after Bouquet and experiences after birthday and anniversary templates, only on the dashboard's gift page, labelled "partner · we may earn a commission", never on the share screen.
- **Estimate.** Flowers about €60 a month (10,000 senders × 2% click-through × $0.35). Stays €45 to 250 once there is traffic.
- Sources: [Stay22 Allez links](https://dev.stay22.com/docs/allez), [Interflora on Awin](https://ui.awin.com/merchant-profile/12199), [Tinggly](https://tinggly.com/affiliate-program).

### Q8. A free "Print it" PDF (by 1 Dec; replaces physical prints)

- **What.** On paid gifts' dashboard pages: an A4 or A3 PDF of the constellation, boarding pass or letter, with the QR code to the gift (the QR designer already exists). Rendered in the browser, so it costs nothing to run.
- **Why not posters this Christmas.** The Stripe account is shared: five disputes a month (0.75% of 660 sales) marks it as excessive, for the other business too. A few "never arrived" posters before 25 Dec could get there, and a late Christmas gift is the worst experience a gift brand can give. Look at Gelato again after M14. By then the product page itself must show the manufacturer, the EU responsible person and an identifier (GPSR Art 19), and packaging must be registered for Germany (LUCID) unless the printer covers it.
- **Estimate.** €0 directly. It supports the €9.99 price and tests demand for prints.

### Q9. Gift-intent search pages

- **What.** `/gifts/for/<who>/<occasion>` for boyfriend, girlfriend, husband, wife, mum and best friend, starting with the 30 strongest. Plus pages for exact phrases ("digital love letter", "open when letters online", "long distance birthday ideas"). Each page has the live demo, the three best templates (premium first), the paid extras and a real FAQ. Sitemap entries, and `?ref=seo` on the Make buttons. Valentine's pages indexed by 10 Jan.
- **Estimate.** Near €0 for 3 to 4 months; €500 to 2,000 a month by month 9 to 12.
- **The rule.** Real content on every page; noindex the thin ones.
- Sources: [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies).

### L1 to L9. Later

- **L1. Game packs.** Base decks stay free. Extra packs €2.99, all packs €5.99. Only the host pays. Stored as `pack:` unlocks so Everything doesn't include them. "Bolder" packs launch only after M14, so an adult-content flag can't freeze the shared account; explicit content is never allowed. €100 to 500 a month once games have traffic.
- **L2. Codes for florists and businesses.** A code for a named unlock, not a money balance, and only after the accountant: past the OSS threshold it becomes a multi-purpose voucher.
- **L3. Wedding kit.** An animated save-the-date and invitation with RSVP, €39 / €69 per wedding. Menu choices use the couple's own dish names only; no allergy or religious options, which would be special-category data (GDPR Art 9). Only after group gifts.
- **L4. The search engine.** City date pages and about 60 couple trips, with free partner data (prices and photos labelled with source and age). Dozens of real pages, not thousands. €750 to 1,850 a month from affiliate and plan-to-gift sales at 100,000 organic pageviews. The gift pages are Q9.
- **L5. Ethos for Two.** Both phones, game packs, the Thursday date email, shared plans and countdowns, reminders, and the AI planner with a spend cap. No templates. Only after M14 and L1. Keep it a non-renewing yearly pass unless the renewal rules (withdrawal button, renewal reminders, California and UK rules) are built.
- **L6. Sponsored venues.** Once a city page has about 10,000 visits a month: a labelled "Sponsored" pick outside the ranking, and a "How we rank" note. Never seeded or filtered reviews.
- **L7. The long-distance loop.** Save "our two cities" and the next visit, with flights both ways.
- **L8. Creators paid per view.** Only once measured revenue per 1,000 views beats the $0.75 to 2 rate. Every paid clip carries #ad plus the switch, and the brief includes a takedown right.
- **L9. The "Give Everything" gift card.** Already drafted and held until the accountant settles voucher VAT. Its personal note is stored with the purchase, not in Stripe metadata.

---

## 5. What not to do (it would cost more than it earns)

- **Display ads.** At 150,000 pageviews a month they'd earn about €150 to 500. They need a consent wall for personalised ads in Europe, slow the pages search depends on, and could put a rival gift site next to a love letter. A 5% dip in gift conversion (about €250 a month) wipes them out. ([Google's consent-tool rule](https://support.google.com/adsense/answer/13554116?hl=en))
- **Dollar or pound options on the live Stripe prices** before the pages show currency by country. That would charge EU and UK buyers in dollars.
- **A cheaper price revealed only at the exit** (the €3.99 downsell), or €3.99 as the default for extras.
- **Anything commercial inside a gift:** a price, a discount, a form, a partner link, a reminder sign-up.
- **Checkout bumps** ("let them reply" for +€2.99, "every other template" for +€15), and a promotion-code field on Stripe's page.
- **Public discount codes** in comments or captions, and buyer discounts for creators.
- **Posing as customers:** posts "as her" without labels, in-character comments, seeded comment fights, fake or seeded reviews, rewards only for good reviews.
- **Trending sounds, school settings, or "ask your parents" lines** in any post.
- **Fake urgency or fake discounts:** evergreen countdowns, "only 3 left" on a digital product, a "was" price that wasn't the lowest in the previous 30 days (codes included), pre-ticked add-ons, guilt-trip decline buttons.
- **Marketing email to the 7,253 existing accounts**, email to anyone who didn't opt in, more than one marketing email per 14 days, or email open and click tracking.
- **Gift ids, names or notes in refs, URLs other than the gift's own, or Stripe metadata.**
- **"Forever" promises**, and a For Two that includes templates.
- **Physical prints this Christmas** on the shared Stripe account.
- **Paid TikTok (Spark Ads):** $5 to 10 per 1,000 views against €1.70 to 3.50 of revenue per 1,000.
- **Partner scripts** (Travelpayouts Drive, Stay22's script or map, booking widgets). Plain links only.
- **Aviasales before you've checked Travelpayouts' contracting entity.**
- **Selling trips, taking payment for travel, and travel insurance.**
- **Programmes not worth joining now:** Amazon Associates (the account closes after 180 days without 3 sales), Etsy (about 4%), Moonpig (a competitor), Booking.com directly (closed to small affiliates), OpenTable, Skyscanner and Kayak through Travelpayouts, Klarna.
- **TikTok Shop and native app stores.** Digital goods aren't allowed on TikTok Shop in the EU; app stores take a cut and reject thin web wrappers.
- **Money-balance gift cards.**
- **A paywall on Dates, planning or sharing a plan**, or charging the guest in a two-phone game.
- **Explicit "spicy" content anywhere.**
- **Per-person prices**, and two price tests on the same buyers at once.
- **The AI writer free and open in production.**

---

## 6. The numbers to watch every Monday (30 minutes)

Get the production keys, run, delete:

```
vercel env pull .env.vercel --environment=production   # in the project that serves tryethos.io
node scripts/revenue-by-ref.mjs 7 .env.vercel          # checkouts, paid, revenue per ref and per day
node scripts/money-weekly.mjs .env.vercel              # once W7 is built
NEXT_PUBLIC_PRICE_CURRENCIES=eur node --env-file=.env.vercel scripts/check-prices.mjs   # live only, after a live price change
rm .env.vercel
```

`revenue-by-ref.mjs` doesn't subtract refunds, and it shows returning visitors as "(none)" until W7 saves the ref. On the new site the price lives in `products.ts` and is charged through `price_data`, so there is nothing for `check-prices.mjs` to compare.

| Number | Today (measured) | What good looks like | How to read it |
|---|---|---|---|
| Gift revenue per gift visitor | not measured (W7) | rising week on week | The one success metric for every price and card test |
| Sales and revenue per day, per ref | 27 to 36 a day quiet; 142 to 170 after a hit | quiet days rising | Per-day refs next to tracker.csv; one concept family per account per day |
| Revenue per 1,000 views, per concept family | €1.70 to 3.50 (post 149) | known per family | Move effort to the families that sell, not the ones that get comments |
| Average order | €7.55 | €8.50+ after M2 and M7 | |
| Premium paid ÷ started, per template | ≈60% | above 45% at €9.99 if starts hold (50% if starts fall 10%) | The diagnostic, not the verdict |
| Letter paid ÷ started | 4.5% | read at cutover (the song change) and in M10 | |
| Checkout completion | 82% (155 of 863 unpaid) | 85%+ | Wallet against card in Stripe → Payments |
| Currency and card country of buyers | not stored | known | presentment_details via money-weekly |
| Receipts sent ÷ purchases | unknown | 100% | A missing receipt voids the waiver |
| Refunds, withdrawals, disputes | 2 refunds | disputes under 0.5% | 0.75% is "excessive" on a shared account |
| Repeat buyers | 3% (22 of 680) | 6%+ | Upgrades and reminders should move it |
| Reply rate | premium 0.5%, free 2.3% | premium 2%+ after M11 | From `reply_to_gift_id` |
| Reminder opt-in | 0 | 5 to 15% of senders | The swing number for February; read in early November |
| Email complaints | 0 | under 0.1% | Resend; one marketing email per 14 days |
| UK sales; EU cross-border consumer sales | unknown | known monthly | UK VAT owed; OSS alert at €8,000 |
| Partner clicks and earnings | €0 | EPC per placement | Only after traffic |
| Costs | unknown | known | Resend, Anthropic (if on), Stripe fees, Stripe Tax, VAT, accountant |

Rules for reading a test: seven days against the week before; compare rates, not totals, because a viral post swamps totals; note any hit in tracker.csv; one test per group of buyers at a time; nothing is read in cutover week.

---

## Appendix A. Changing a price without the site lying

- **Live (ethoslove, until cutover).** Stripe prices can't be edited, only replaced (currency options can be added). Don't add currency options until the pages show currency by country. A new price must be tax-inclusive. Create it, make it the product's default, change the amounts in `src/lib/pricing/products.ts` in the same deploy (with your yes), and run `check-prices.mjs` against the live env.
- **New site.** The price lives in `src/lib/pricing/products.ts` and is charged through `price_data` with `tax_behavior: "inclusive"`, so the page and the charge can't drift. The currency is chosen on the server from the visitor's country and checked again at checkout (W2).
- **Every price change.** One per group of buyers per week. Same price for everyone in a country. A "was" price only when it is the lowest price charged, public codes included, in the previous 30 days.

## Appendix B. What changed

**From the first version.**

- **Kept:**
  - Dates free as the habit.
  - Money where it already changes hands.
  - The plan-to-gift sale (now at the send step, planner's view only).
  - Reminders; sharing stays free.
  - For Two built from conveniences.
  - No ads, no data selling.
  - City pages as the long-run engine; sponsored venues only labelled.
- **Changed:**
  - Premium (€9.99) is split from the Letter's extras (€7.49).
  - Affiliate is a top-up, not a pillar.
  - For Two no longer includes templates.
- **Cut:**
  - Booking.com, OpenTable, Skyscanner and Kayak as partners.
  - "A single template costs $7.99".

**In this revision (after the finance, legal and brand review).**

- **W2 reversed.** The live pages pick currency by language, so adding dollar options would have charged EU and UK buyers in dollars. Now: euros for everyone on live, then by country at cutover.
- **The live waiver found invalid.** A tickbox for every buyer, a withdrawal link and a corrected FAQ go into one live deploy with your yes.
- **The €5.99 mystery code is our own LOVE,** printed in in-character comments. Both are stopped.
- **Posts get on-slide and caption labels,** not just a bio line. No comments from our own accounts. Only licensed sounds. Adult characters.
- **Cutover moved up** to 14 Oct at unchanged prices, with M2 a week later. The uncommitted pricing code gets reconciled first.
- **The home page shows gifts first for everyone,** not only visitors with a ref.
- **The song stops being a paid extra** (up to €650 a month at risk), because that use breaks Apple's terms.
- **Cut:**
  - the €3.99 downsell (replaced by a test of the Letter's price);
  - the €3.99 recipient reply and the +€2.99 reply bump (replaced by the reply included in €9.99);
  - the pay-panel bump;
  - physical prints for Christmas (replaced by a free PDF).
- **Moved later:** "+2 for later", creators (now a 3-creator pilot, credited by ref with no discount), Pinterest, the Spanish account, and affiliate work beyond what's built.
- **The Question becomes a free template.** Group gifts move up to 15 Feb.
- **Estimates corrected:**
  - M2: +€100 (−€150 to +€370)
  - M7: €105 to 210
  - M6 in Valentine's fortnight: €300 to 2,900
  - February: €3,000 to 8,000 from hits alone
  - W4 VAT is a cost, not a saving
  - the funnel together: +10 to 25%, not +30 to 60%
- **Scoring is now expected value per day of your time,** with downsides counted and €0 before cutover.
- **Added:**
  - the screen and email budgets;
  - Checkout says "Ethos";
  - what Everything and For Two include;
  - review and ranking notes;
  - a costs table.

## Appendix C. Questions for a lawyer

1. **The story accounts.** Is on-slide "fictional story · by ethos", a caption starting "Ad", the "Your brand" switch and an Ethos display name enough under the UCPD, the FTC's testimonials rule and the CMA/ASA? Do the "toxic couple" control posts, now disclosed ads, need a red-flag framing? (W1)
2. **The withdrawal tickbox wording and the receipt.** How do we handle sales made before the tickbox, given the 12 months + 14 days exposure? (W5)
3. **Email.** The buyer opt-out wording. Whether free sign-ups count as customers after the CJEU's November 2025 ruling. What accounts created before the opt-out notice may receive. (M6)
4. **Is a hosted, shareable gift link digital content or a digital service** (Dir 2019/770 Art 2(2))? For a service, the right to cancel ends only once it is fully performed. Draft Terms s.6 so the unlock is the digital content and the hosting is a free ancillary service. (W5)
5. **Only if the Travelpayouts check finds a Russian-linked contracting, paying or advertiser entity:** does EU Regulation 833/2014 Art 5n bar the Aviasales links? (M9)
