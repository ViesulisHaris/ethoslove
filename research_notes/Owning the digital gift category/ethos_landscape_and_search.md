# Ethos's brand position today, and the 2026 digital-gift landscape (searches, AI answers, copycats)

Compiled 1 Nov 2026. Part A is from the repository at /home/user/ethoslove (HEAD 6279c8b, 1 Nov 2026), read only. Part B is from web search run on 1 Nov 2026.

**Read this first: what limited Part B (1 Nov 2026)**
- WebFetch could not reach www.google.com, www.bing.com or html.duckduckgo.com. Each failed with "outside the session's allowed network domains". `curl` to rdap.org through the session proxy returned **403 (policy denial)**. So I could open no search-results pages, no WHOIS/RDAP lookups, no Google Trends, no competitor pages and no TikTok pages directly.
- The only web source was the WebSearch tool. It is **not Google**: it is a US-only engine that returns titles, URLs and an AI-written summary. Its result order is not a Google ranking, and the result sets are not personalised to the owner. The only Google rankings in these notes are the repo's own snapshot from 24 Oct 2026, taken from Google US (`docs/marketing/SEO-ORGANIC.md`).
- The WebSearch budget ran out after about 20 queries (a limit of 200 per turn, shared by every agent). It ran out before I could search the handles, the lookalike domains, "link gift", "digital gift for girlfriend", plain "digital gift" and "regalo digital". Those items are in the Gaps sections. To close them, allow those hosts in the session's network settings, or send a follow-up turn.

---

## A1. Where does a recipient or viewer meet the Ethos brand, and how does that differ between free and paid gifts?

### Takeaway
A recipient of a **paid** gift never sees the word "Ethos" inside the gift. What they see is an unlabelled wax-seal logo on the opening screens and the domain in the link. The words "Made with Ethos" appear only on **free** gifts and free replies. Paying removes them, and the paid "no footer" extra exists to sell that removal. The chat preview card stopped printing the domain on 16 Oct 2026.

### Cited Findings
**Brand constants**
- Name "Ethos", legal name "Ethos Love", tagline "Gifts that open like a story." / "Regalos que se abren como una historia.", domain `tryethos.io`. The watermark text is "Made with Ethos" / "Hecho con Ethos", with the comment "Shown on free-tier gifts... it is the viral hook" — `src/config/brand.ts` lines 5–27.
- The brand mark is a wax seal pressed with a heart (`LogoMark`). The wordmark is the name "Ethos" in italic display type, and `Logo` combines the two — `src/components/shared/logo.tsx`.

**Touchpoints, in the order a recipient meets them**
1. **The chat link preview (WhatsApp, iMessage and others).**
   - The image is `/g/<id>/card.jpg`: a sealed envelope with a wax seal, a bow and flowers, plus the recipient's name. Code comment: "It never shows the gift, and carries no web address: the chat prints the domain under it anyway" — `src/lib/gift/card-art.ts` lines 4–9.
   - The domain (`TRYETHOS.IO`) is printed only on the fallback "plain card", drawn if the envelope fails — `src/app/g/[shortId]/card.jpg/route.tsx` lines 65–103, 136.
   - VIRAL-FORMULA confirms the change: "the picture no longer prints the site's address" (16 Oct 2026) — `docs/marketing/VIRAL-FORMULA.md` lines 2216–2221.
   - The OG title is the sender's title, or "{name}, someone made you something 💌". The description is "Open it with your sound on." Neither contains "Ethos". The page is `noindex` — `src/app/[currency]/[locale]/(gift)/g/[shortId]/page.tsx` lines 19–36.
2. **The URL itself:** `tryethos.io/g/<9-char id>` — `src/config/site.ts` (`giftPath: "/g"`, `SHORT_ID_LENGTH = 9`).
3. **The sound gate**, the first screen of every live gift, free or paid:
   - a 56 px `LogoMark` (the seal only, no wordmark);
   - "Sender → Recipient";
   - "Someone made this for you, {name}…";
   - "Tap to open" and "Sound on".
   - Sources: `src/components/gift/sound-gate.tsx` lines 10–33 and `src/templates/_shared/i18n.ts` lines 9–12. It renders until the recipient opens the gift — `src/components/gift/gift-experience.tsx` line 136.
4. **The loading screen** (gifts without a cover): `LogoMark` plus "Someone made this for you", again with no name — `src/templates/_shared/LoadingScreen.tsx` line 115. A grep of the cover components (`src/templates/_shared/covers/`) found no logo, brand or "Ethos" references.
5. **The watermark pill**, on free gifts only:
   - "Made with Ethos", with the seal, floating at the foot of the gift;
   - it links to `/made-with-ethos?ref=watermark&template=<slug>`, a page that "starts with making one back for free" and "never goes straight to a checkout" — `src/templates/_shared/Watermark.tsx`;
   - it shows only if the gift's `watermark` flag is true and the mode is not preview — `src/templates/_shared/GiftRenderer.tsx` lines 106, 180;
   - the flag is `!entitlement.unlocked`. Free templates publish with it, and any unlock removes it — `src/lib/gift/publish.ts` lines 15–41.
6. **The end screen:**
   - a heart icon, "The end" and "Made by {sender} for {recipient}" (no Ethos name);
   - a reaction button, and "Send one back to {sender}" on live gifts, which run in reply mode (`gift-experience.tsx` line 131; `i18n.ts` line 43);
   - "The first reply is free" (paid premium gifts only), "Keep this gift" and "Replay";
   - the inline "Made with Ethos" pill appears **only when watermarked** — `src/templates/_shared/EndScreen.tsx` (`freeReplyLine`, final `chrome.watermarked ? <Watermark … inline />`).
7. **Emails after "Keep this gift":** sent from `Ethos <hello@tryethos.io>` — `docs/EMAIL.md` line 10.
8. **The checkout (buyers, not recipients):** "Which legal entity owns the account whose checkout says 'Pay SECUORA'?" (MONETIZATION, figures as of 23 Sept 2026). The Stripe account "is shared with the other businesses" (26 Oct) — `docs/MONETIZATION.md` line 335; `docs/marketing/PROFITABLE-ADS.md` ("Note: the Stripe account is shared…").

**Terms of service**
- "You may not copy templates, or resell or sublicense access to the Service. The 'Made with Ethos' footer on free gifts and free replies may be removed only by unlocking the template." — `src/content/legal.ts` line 226 (section 14; Spanish at line 421).
- "Removing the footer" is listed as a paid extra (line 84). "Make it special" unlocks "no footer" on The Letter and Constellations (line 132). A free reply "carries the 'Made with Ethos' footer" (line 139).

**Other site metadata**
- Marketing pages emit `twitter:site` = `@tryethos` — `src/config/site.ts` line 21; `src/app/[currency]/[locale]/layout.tsx` line 146; `src/lib/seo.ts` lines 74, 89.
- The Organization's `sameAs` lists only the TikTok and YouTube URLs — `src/lib/seo.ts` line 139; `brand.ts`.
- Site title template: "%s · Ethos" — `messages/en.json` line 43.

### Inferences
- The gift's own browser-tab title probably reads "… · Ethos" through the site-wide title template. The link preview's OG title does not.
- On a paid premium gift (Birthday Cinema, Bouquet, Pop-up Card and the like), only three things tie the experience to Ethos: the unlabelled seal, the domain in the link, and whatever the chat prints under the preview. These are the gifts that convert about 6 in 10 starters, and per VIRAL-FORMULA the gifts seen in hit posts. A recipient who loves one has no name to remember or search for.
- The watermark loop therefore runs mainly on free Letter and Constellations gifts. Those are about 70% of people reaching the pay sheet (`PROFITABLE-ADS.md` line 19ff), so the loop still reaches many recipients. But the brand is shown least where the product is most impressive.
- "Pay SECUORA" at checkout puts a third, unrelated name in front of the buyer at the moment of trust. It is as of 23 Sept; whether it was fixed later is not stated.

### Gaps
- I did not render a live gift, so I could not confirm the browser-tab title or what each messenger prints under the preview.
- I did not read `/made-with-ethos` or the 54 individual templates. Some templates might print the brand inside their own artwork.

---

## A2. What do the growth and sales numbers in the docs say (with dates)?

### Takeaway
Revenue is real but small and driven by hits. The figures:
- 706 paid purchases and €5,332 from 6 to 23 Sept 2026;
- a planning base of about €5k a month;
- one TikTok hit is worth about €1,900 in 48 hours;
- about 99% of organic search clicks are people typing the brand after seeing TikTok;
- in late October posts stall at about 500 views, and the Meta ad test lost money.

### Cited Findings
**Sales, measured 23 Sept 2026** — `docs/MONETIZATION.md` lines 23–42
- 706 paid purchases, €5,332 (6–23 Sept, almost all since 12 Sept). Average order €7.55, and 705 of 706 were priced in euros.
- 362 of 706 sales were €7.49 extras on the free templates. Since post 149 (21 Sept), The Letter alone was 193 of 331 sales (58%). 25% of paid free-template gifts were bought for the song alone.
- Premium templates: about 60% of starters pay (Birthday Cinema 51 of 78, Bouquet 36 of 60). Free templates: 4.5% (The Letter 62 of 1,383). A premium start is worth about €4.50; a Letter start about €0.34.
- Quiet days (16–20 Sept) brought 27–36 sales, about €235 a day. The two days after post 149 (1.1M views) brought 142 and 170 sales. "One hit is worth about €1,900 in 48 hours (measured)", or €1.70–3.50 per 1,000 views.
- 863 checkouts were started and 155 were not paid (18%). There were 2 refunds.
- 680 buyers; 22 bought twice (3%). 5,555 makers; 33% made two or more gifts; 12.2% of makers paid.
- Planning base: €5,000 gross a month (about 660 sales), an assumption. A month with two hits is about €10k. February could reach €8,000–16,000.

**Purchases by template, 12–15 Sept** (after post 30 went viral) — `docs/marketing/VIRAL-FORMULA.md` lines 144–159
- The Letter 62, Birthday Cinema 51, Bouquet 36, Constellations 21, the rest 17.
- Purchases peak 21:00–23:00 UK and 00:00–04:00 UK (the US evening).

**The TikTok account @luvierosiie ("rosie")** — `VIRAL-FORMULA.md` lines 2370–2390, 3004–3030
- Public profile on 21 Oct 2026: 44 posts, 303 followers, 420.8K likes.
- Top posts: 1.3M views (149, "are u mad at me"; 168.7K likes, 14.7K saves) and 984.8K (30, "first one to say it"; 24.9K saves). Then 347.1K, 278.2K and 277.8K.
- After the hold was lifted (20–25 Oct), posts reached 277 to 17.5K views with 0–2 comments each. "None of them went viral… a lot of them got 500 views" (the owner, 25 Oct).

**Organic search, Google Search Console 18 Sep – 22 Oct 2026, written 24 Oct** — `docs/marketing/SEO-ORGANIC.md` lines 9–33
- 7.4K clicks (about 210 a day), 10.7K impressions, average position 2.9, CTR 69%.
- About 99% of clicks searched the brand: "tryethos", "tryethos. io", "try ethos" and typos.
- Recent daily clicks ran 23–90, with spikes of 1,651 (21 Sep), 884 (2 Oct) and 359 (21 Oct), all TikTok hit days.
- Non-brand: "digital gifts" 6 impressions at position 9; "digital gift template" 10; "regalos digitales" 11.
- Clicks by device: mobile 6,621, desktop 683, tablet 131.
- Top countries by clicks: India 1,729, US 1,245, UK 660, Germany 247, Romania 240, Philippines 215.
- Queries such as "what website is that?", "send the link" and "which website" reach the site through Google Lens on TikTok screenshots. "is this website safe" and "will it hack me" also appear.
- scamadviser.com's page on tryethos.io was the 7th result for "tryethos".
- Only 8 external links, "all from two scam checkers" (scamadviser 7, gridinsoft 1). 45 pages were discovered but not crawled — line 39.

**Funnel, 30 days to 26 Oct 2026** — `docs/marketing/PROFITABLE-ADS.md` lines 17–30
| | Editor opens | Saw pay sheet | Clicked pay | Pay sheet → pay |
|---|---|---|---|---|
| Free templates | 4,058 | 3,287 | 129 | 4% |
| Paid templates | 2,569 | 1,720 | 338 | 20% |

- Pop-up Card converts 40% and Bouquet 17%. About half of pay clicks finish at Stripe (476 → 233).

**Meta USA ad test, 25–26 Oct 2026** — same file
- About 41 US visitors. 10 opened an editor (24%) and none paid.
- A Pop-up Card buyer cost about $17 against about $11 left per sale (0.65×). CPC was $0.51.
- A 100-person panel: "Every group asked for reviews, a company name, a refund line and payment logos" — line 196.

**Etsy, 28 Oct 2026** — `docs/marketing/ETSY.md` lines 32–80
- Shop "TryEthos" (tryethos.etsy.com) opened, with all 54 templates at €10.99. Sale LAUNCH40 (40% off) runs 28 Oct – 22 Nov.
- One real test order. On 28 Oct none of the listings appeared in signed-out search.

### Inferences
- The business is a TikTok-to-brand-search machine: viewers see a post, then type "tryethos". Every euro depends on (a) a hit and (b) the viewer remembering and spelling the name.
- Late-October reach has fallen from the September hits. A brand that relies on ad-free story posts loses buyers whenever reach drops.

### Gaps
- No sales figures after 23 Sept appear in the docs I read. Stripe revenue for October is not documented there.

---

## A3. What do the docs say about TikTok limiting branded posts?

### Takeaway
On 16 Oct 2026 the first post showing "tryethos.io" on screen got 0 views. On 17 Oct TikTok support said the post's visibility was "limited due to a violation of our Community Guidelines". Since then the rule has been: no site name on screen, the "Your brand" disclosure on any post showing the product, and the brand only in the bio and comments. That contradicts the September rule that "the link is in every carousel".

### Cited Findings
**16 Oct** — `docs/marketing/VIRAL-FORMULA.md` lines 2223–2249
- Post 529, which carried the link card showing "tryethos.io", got **0 views**. It went up on the account where 520 (no link) did 70K.
- Working explanation: "TikTok reads text in pictures, and a post that shows a web address gets held back."
- New rules:
  - "Nothing that names the site on screen. No link card, no domain, no 'tryethos' in the chat."
  - Show the gift instead, and let people ask in the comments: 30's top comment was "PLEASE TELL ME THE WEBSITE".
  - Test "tryethos" in a comment reply. Check that TikTok accepts tryethos.io as the bio link: "If it refuses the link, the domain itself is blocked and needs a new one."

**17 Oct** — lines 2251–2275
- TikTok support: visibility "was limited due to a violation of our Community Guidelines". No guideline was named and no notice came.
- The doc's inference is the Commercial Disclosure rules (Community Guidelines effective 24 Sept 2026): self-promotion needs the content disclosure setting, or TikTok can reduce visibility, and repeated cases can lead to restriction or a ban.
- So product posts go up only with "Your brand" turned on. "Posts with no product in them need no label; they carry the reach, and the brand sits in the bio."

**21 Oct** — lines 2370–2372
- TikTok said @luvierosiie's hold was "a false bot detection" and lifted it.

**23 Oct** — lines 2549–2551
- The US account @mayiiloveu was unblocked. Its only public post was "the tryethos one from 16 Oct (12 views)".

**25 Oct** — lines 3004–3030
- "Five website screenshots sit in the middle of every story… it makes the post read as an ad."

**11 Oct caption rule** — lines 1990–1995
- "Never the brand, the website or 'link in bio'."

**The earlier, contradicting rule** — lines 40–45
- "The link is in every carousel. A post nobody can trace back to tryethos.io grows an account but sells nothing."

**Legal note** — `docs/MONETIZATION.md` line 305
- Posts written "as her" ("my bf made me this") are "a testimonial from a person who doesn't exist", which falls under FTC 16 CFR 465 and EU UCPD Annex I No 22. "A bio line alone isn't disclosure."

### Inferences
- The brand cannot travel inside the content on TikTok, which is the one channel that sells. That makes the name's memorability and searchability unusually important: the 24 Oct Lens queries ("what website is that") are viewers trying to recover a brand they were never shown.
- The disclosure requirement and the "as her" format conflict. Both point toward branded accounts or creators who disclose, rather than anonymous story accounts.

### Gaps
- The docs do not record whether the bio-link test or the "tryethos" comment test was ever run, or how it turned out.

---

## A4. Which social accounts exist, and which are missing?

### Takeaway
Confirmed in the repo:
- TikTok @tryethos and YouTube @tryethos;
- the story accounts @luvierosiie and @mayiiloveu (unbranded);
- Pinterest @tryethosgifts (@tryethos was taken);
- the Etsy shop TryEthos.

Instagram @tryethos did not exist on 19 Sep 2026. X @tryethos is claimed in the site's metadata, but no account is documented.

### Cited Findings
- `socials`: tiktok.com/@tryethos and youtube.com/@tryethos. "instagram.com/tryethos didn't exist (checked 19 Sep 2026)" — `src/config/brand.ts` lines 14–23.
- Pinterest business account [@tryethosgifts](https://www.pinterest.com/tryethosgifts/), set up 28 Oct 2026 — `docs/marketing/ETSY.md` line 71. "@tryethos was taken" — `docs/marketing/etsy/replies-and-pins.md` line 33.
- Etsy shop TryEthos, tryethos.etsy.com, opened by 28 Oct 2026 — `docs/marketing/ETSY.md` line 32.
- Ads setup asks the owner to create "A Facebook Page 'Ethos' and the Instagram account @tryethos" — `docs/marketing/ADS-SETUP.md` line 80. The Meta USA test ran on Facebook and Instagram placements (25–26 Oct) — `docs/marketing/META-USA-TEST.md` line 78. The docs do not say whether an @tryethos Instagram profile was created.
- Instagram cross-posts (`ig-couple`) were planned for October — `docs/MONETIZATION.md` lines 571–576; `docs/marketing/PLAYBOOK.md` line 43. They are not confirmed as done.
- `twitter:site` = "@tryethos" is emitted site-wide (`src/config/site.ts` line 21), but brand.ts lists no X profile.
- Reddit is "blocked for Claude entirely". The Pinterest account signed in on Brave was the owner's personal one — `docs/marketing/LINK-KIT.md`.
- Directories (AlternativeTo, Product Hunt, PeerPush, SaaSHub) were not yet signed up as of 24 Oct — `docs/marketing/SEO-ORGANIC.md` "What's next".
- Nothing in the docs mentions Threads or Snapchat accounts.

### Inferences
- The site tells crawlers and X cards that @tryethos is Ethos's X handle without documenting that Ethos owns it. If someone else holds it, the metadata points to them.
- Brand handles are split: tryethos on TikTok and YouTube, tryethosgifts on Pinterest, TryEthos on Etsy. The handle that converts on TikTok is "tryethos".

### Gaps
- No web check of handle availability was possible on 1 Nov 2026 (see Part B5).

---

## A5. What do the docs say about competitors?

### Takeaway
The docs show a crowded long tail and no leader:
- tiny single-page sites win the niche Google searches;
- gift cards own "digital gift";
- Canva templates lead Etsy;
- paid TikTok sellers own "digital gift for girlfriend".

The docs say nothing about copycats of Ethos specifically.

### Cited Findings
**Google US, 24 Oct 2026** — `docs/marketing/SEO-ORGANIC.md` lines 52–66
- "digital gift" mostly means gift cards: Amazon, Visa and Mastercard gift cards, a gift-card shop, Good Housekeeping's list and one Reddit thread.
- **digital gift for boyfriend:** Etsy, Reddit, digiflower.net, 2-luv.com, Pinterest, gifft.me, qlovy.com, ourgiftverse.com, giftsqr.com.
- **online love letter:** gifft.me, digitalloveletters.com, lovepaper.app, 2-luv.com, digitalbouquet.org, lettersbyheart.com, openwhen.cards, shareloveletters.com.
- **digital bouquet:** digitalbouquet.org, digibouquet.net, digibouquet.app, digibouquet.cc, a Reddit post, thebouquet.me, attachedapp.com.
- **digital birthday gift:** American Greetings, aiskyla.com, Reddit, gifft.me, Good Housekeeping, 2-luv.com, Hallmark eCards, Paperless Post.
- "Each of those small sites has one page whose title is the search."

**Other notes in SEO-ORGANIC**
- "tryethos.app is a different 'Ethos' (a journaling app) and shows up under the brand search" — line 71.
- "In this niche the comparison results are the makers' own 'best websites' lists, each ranking itself first" — line 175.

**Directories and pitches** — `docs/marketing/LINK-KIT.md`
- DigiFlower is listed on AlternativeTo "next to Smilebox, Jacquie Lawson, Paperless Post and Canva's cards".
- PeerPush "already lists Letters by Heart, a direct competitor".
- iDrop News runs "The 12 Best Digital Gifts You Can Send Instantly". SELF, CNN Underscored, The Knot and Good Housekeeping publish long-distance and digital-gift guides.

**Prices** — `docs/marketing/PROFITABLE-ADS.md` line 166
- "Competitors sell one-off love-letter websites for $3–60 (Etsy, Gumroad). There is no subscription leader to copy in this niche."

**Etsy, 27 Oct 2026** — `docs/marketing/ETSY.md`
- Top results are Canva templates (€2–10) that the buyer still has to edit (lines 5–6). Elsewhere: "Canva website and photo-book templates at €4–15" (line 182).
- "Top competitors all show 25–57% off" (line 65).
- On Etsy, "virtual bouquet, virtual gift, digital bouquet… digital gift for her / boyfriend / girlfriend" get no search suggestions, so they are hardly searched (lines 176–177).

**TikTok, 11 Oct 2026** — `docs/marketing/VIRAL-FORMULA.md` lines 1944–1990
- Sellers' ads own "website gift for gf", "digital gift for girlfriend" and "long distance gift website": @htm_creates (2.7M), @flowers_the_bloom (3.8M), @lovecapsule.cc and @joygram.io, all with "customize yours / link in bio" captions.
- "my boyfriend made me a website" has weak results ("the open lane").
- #digitalgift: 5.5K posts and 75M views. #giftforboyfriend: 76K posts and 1.4B views.
- Viral third-party posts on the theme: @36grm "my boyfriend made me a website to prove he cares 😭" (3.8M), @brookemonk_ (5.0M video) and @veryawesomellie (817K).

**Copycats**
- A grep of `docs/` for "copycat", "clone" and "knockoff" found no mention of anyone copying Ethos's templates or format.

### Inferences
- The repo's own snapshot already shows Ethos absent from every non-brand results page it checked.

### Gaps
- None beyond Part B.

---

## B1. Who sells digital gifts, love-letter sites, digital bouquets and "open when" pages in 2026, at what price, and with what traction?

### Takeaway
The category is a long tail of cheap, near-identical web tools:
- one-time prices of $2.99–$9.90, or free with an upsell;
- Etsy and Gumroad templates at $2–60;
- old-guard e-card subscriptions at about $18–36 a year;
- a few small App Store apps.

No player shows dominant traction, and several market "free, no watermark".

### Cited Findings (all seen 1 Nov 2026 via WebSearch; prices are as the sources state, unverified on the live sites)
**Love-letter and gift-page makers**
- **Letters by Heart** (lettersbyheart.com).
  - Free plan: letters up to 100 characters. A one-time "lifetime" plan unlocks any length. No subscriptions. The price was not visible in results — [lettersbyheart.com](https://lettersbyheart.com/), [Terms](https://lettersbyheart.com/terms-of-service.html).
  - Publishes its own "Best Websites to Make Online Love Letters" and "Best Website to Make Love Letters Online — Honest Review & Comparison" — [blog](https://lettersbyheart.com/blog/best-online-love-letter-websites), [comparison](https://lettersbyheart.com/blog/best-website-to-make-love-letters-online-comparison).
  - On Product Hunt — [Product Hunt](https://www.producthunt.com/posts/letters-by-heart).
- **LovePanda** (lovepanda.co, Brazilian origin lovepanda.com.br).
  - Retrospective from $4.90 and Album $9.90, one-time payment. The FAQ shows "from R$19.90", so the currencies on its own site are inconsistent — [lovepanda.co blog](https://lovepanda.co/blog/best-digital-gift-website), [FAQ](https://lovepanda.co/faq).
  - Self-published head-to-heads against Memoryiit, Heartzzu, DearYou and TwoMade, "using public sources checked on Oct 1, 2026" — [vs Memoryiit/Heartzzu](https://lovepanda.co/blog/lovepanda-vs-memoryiit-vs-heartzzu), [vs DearYou](https://lovepanda.co/blog/lovepanda-vs-dearyou), [vs TwoMade](https://lovepanda.co/blog/lovepanda-vs-twomade).
  - Per LovePanda, Memoryiit has 19 complaints and a "Não recomendada" rating on Reclame AQUI. This is a competitor's claim — [same](https://lovepanda.co/blog/lovepanda-vs-memoryiit-vs-heartzzu).
  - Also ranks for "best digital gift website" on its .com.br blog — [lovepanda.com.br](https://lovepanda.com.br/blog/best-digital-gift-website).
- **MiMomento** (mimomento.app): $2.99 one-time. Features: a days-together counter, a hidden letter, scratch-to-reveal, confetti and a song, in EN, ES, FR and TR — [MiMomento roundup](https://www.mimomento.app/blog/best-digital-gift-page-makers-2026).
- **Named in MiMomento's roundup:**
  - YourLovePage: AI couple portraits; build free, publish from about $4.99.
  - ILoveYou.gift: scheduled opening date; $5–36.
  - LovePage.io: free subdomain; about $20 one-time.
  - Source: [same](https://www.mimomento.app/blog/best-digital-gift-page-makers-2026).
- **Product Hunt launches in the niche:** LovePaper (maker Enzo Falvo), Virtual Love Letters, Love you make and love written — [LovePaper](https://www.producthunt.com/p/lovepaper-a-love-letter-she-will-keep/lovepaper), [Virtual Love Letters](https://www.producthunt.com/products/virtual-love-letters/makers), [Love you make](https://www.producthunt.com/products/love-you-make/makers), [love written](https://www.producthunt.com/p/love-written/love-written).
- **Just Meant For You:** free, no-code, a shareable link "in under 15 minutes" — [justmeantforyou.com](https://justmeantforyou.com/blog/online-letter-maker.php).
- **SendLove:** "Free Digital Love Letter — Instant Envelope Link"; opens in any browser, no account — [sendlove.io](https://sendlove.io/template/love-letter).
- **2-luv:** a paid digital letter with photos and music; no sign-up — [2-luv.com](https://www.2-luv.com/en), [digital gift page](https://www.2-luv.com/en/event/digital-gift-for-loved-one).
- **AIskyla:** writing, photos, music, animation and the link "cost nothing", and "no watermark is added" — [aiskyla.com](https://aiskyla.com/create/love-letter).
- **AI builders** pitched for love letters: YouWare and HeartInk — [YouWare](https://www.youware.com/features/ai-love-letter-generator), [topai.tools](https://topai.tools/s/online-love-letter-creator).

**Digital bouquets** (many unrelated sites share the "digibouquet" name, and none appears to be canonical)
- digibouquet.net: free, 8 flowers, a message, a unique link — [digibouquet.net](https://digibouquet.net/).
- digibouquet.cc: free, music, motion, no sign-up — [digibouquet.cc](https://digibouquet.cc/).
- digibouquetai.com: free by hand; AI bouquets pay-as-you-go — [digibouquetai.com](https://digibouquetai.com/).
- digibouquet.space: a 3D procedural tool with a free plan — [digibouquet.space](https://digibouquet.space/en/online-bouquet-maker).
- Free, no-account makers: digital-bouquet.online, digi-bouquet.com (6–10 flowers) and digi-bouque.vercel.app — [digital-bouquet.online](https://digital-bouquet.online/), [digi-bouquet.com](https://digi-bouquet.com/virtual-bouquet-maker), [vercel app](https://digi-bouque.vercel.app/).
- VivoRose: pick the flowers, vase and ribbon, plus a Spotify song played on open — [hunted.space](https://hunted.space/product/vivorose).
- EGreet: free, no sign-up — [egreet.in](https://egreet.in/blog/post/digital-bouquet-maker-guide).
- An AR flowers app on the App Store — [App Store id1574300728](https://apps.apple.com/app/id1574300728).
- An AlternativeTo "Digital Flower Bouquet" alternatives page exists — [alternativeto.net](https://alternativeto.net/software/digital-flower-bouquet/).

**Etsy**
- Two models: (a) Canva or editable templates and (b) custom builds by the seller.
- Observed prices:
  - $5.08 sale price for an animated love letter;
  - $9.20 for a custom animated LDR letter;
  - $56.26 for a custom website;
  - custom builds delivered "in up to 7 days", with source files.
- Listings: "Personalized Digital Love Letter: Animated Virtual Gift (instant Download)"; "Personalised Website Gift for Boyfriend Girlfriend"; "Interactive Digital Love Letter (Canva)"; a Spanish-language Etsy Mexico listing, "Sorpresa romántica en línea regalo"; market pages "website for boyfriend" and "love letter virtual".
- Sources: [listing 4380478061](https://www.etsy.com/listing/4380478061/personalized-digital-love-letter), [AU listing](https://www.etsy.com/au/listing/4524568636/personalised-website-gift-for-boyfriend), [Canva listing](https://www.etsy.com/listing/4538348830/interactive-digital-love-letter-canva), [MX listing](https://www.etsy.com/mx/listing/4470831964/sorpresa-romantica-en-linea-regalo), [market page](https://www.etsy.com/market/website_for_boyfriend), [custom LDR](https://www.etsy.com/listing/4425824561/custom-animated-love-letter-long).
- A "Customizable Website Digital Love Letter Template" listing was summarised at $60, "Low in stock, only 4 left" — [Etsy 1857223924](https://www.etsy.com/listing/1857223924/customizable-website-digital-love-letter).
- An "Open When Letters App" digital listing — [Etsy 4456217709](https://www.etsy.com/listing/4456217709/open-when-letters-app-o-digital).

**Gumroad and similar**
- "Birthday Surprise Website", an HTML package at $50: love letter, catch-the-heart mini-game, music player, gallery, quiz and spinning gift wheel — [elementorcraft](https://elementorcraft.gumroad.com/l/rgvvuw).
- Love-letter templates at $4.50 and $4.99 — [digitalsbykath](https://digitalsbykath.gumroad.com/l/lovelettertemplate), [byadnen](https://byadnen.gumroad.com/l/pfidc).
- A Wix template at $20 — [studiodigital](https://studiodigital.gumroad.com/l/lovechronicles1).
- A Framer template at ₹1,299, discounted to ₹519.60 — [tsconnects](https://tsconnects.gumroad.com/l/love-story-web-template).
- Canva "websites" at about $2–4.50 — [luursdigitals](https://luursdigitals.gumroad.com/l/Pastelcanvawebsite).
- HTML tribute pages — [narrativenest](https://narrativenest.gumroad.com/l/surprise-your-boyfriend).
- A "Museum of Us" digital file sold on nas.com — [nas.com](https://nas.com/marg-lou/digital-files/museum-of-us).

**E-card incumbents**
- **Jacquie Lawson** — [App Store](https://apps.apple.com/us/app/id1538019085), [membership page](https://www.jacquielawson.com/prices-membership), [Trustpilot](https://ca.trustpilot.com/review/www.jacquielawson.com?page=2).
  - The App Store shows $29.99 a year or $5.99 a month. The listing's copyright line reads 2001–2023, so the prices may be stale.
  - Trustpilot shows 1,079 reviews, including a 15 Jan 2026 complaint about cancelling.
- **American Greetings Ecards** — [apppricinglab](https://apppricinglab.com/app/apple/1612834659), [App Store](https://apps.apple.com/us/app/id1612834659).
  - A March 2026 price tracker shows $7.99 a month and $35.99 a year.
  - An older App Store listing shows $6.99 and $29.99.
- **Hallmark eCards:** $4.99 a month and $17.99 a year (undated App Store text) — [appfollow](https://apps.appfollow.io/ios/hallmark-ecards/973324681?country=us).
- Kudoboard (group cards, printable) and Thankbox also appear — [kudoboard](https://www.kudoboard.com/?p=3626), [thankbox](https://www.thankbox.com/blog/17-places-to-find-the-best-online-presents-and-digital-gifts).

**App Store**
- **Letterbox: Open When Letters** (iPhone): 4 ratings at a 4.5 average; in-app purchases $1.99 to $19.99 lifetime — [App Store](https://apps.apple.com/us/app/letterbox-open-when-letters/id6736516126).
- **Love Letter: Between Couples:** the letter is sent as an SMS link and opens in a browser with music, so the recipient needs no app — [App Store](https://apps.apple.com/us/app/love-letter-between-couples/id1661561515).

**Canva**
- Canva love-letter or website templates resold at $2–4.50 on Gumroad, $2.46–8.55 for small Etsy templates, and $60 for an interactive Etsy "website" — [luursdigitals](https://luursdigitals.gumroad.com/l/bluecanvawebsite), [Etsy](https://www.etsy.com/listing/1857223924/customizable-website-digital-love-letter).

### Inferences
- **Price position:** Ethos's single template (€7.49–9.99, $11.99 in ads, €10.99 on Etsy) sits above the web tools ($2.99–9.90) and the Canva templates. It sits below custom Etsy builds ($56–60), and is about one third to two thirds of a year of e-cards.
- **Ethos's differentiators:** 54 animated templates, a voice note, a real song, scheduling, the free reply, and EN and ES. Ethos's own comparison post could cite these (LINK-KIT and SEO-ORGANIC plan one).
- **Copying, as far as I can judge:**
  - Several products share Ethos mechanics: sealed-envelope links (SendLove), scratch-to-reveal and counters (MiMomento), scheduled opening (ILoveYou.gift), built-up bouquets (VivoRose, digibouquet.*), a "Museum of Us" product and mini-game birthday sites (Gumroad).
  - I found **no evidence that any of them copied Ethos**. The bouquet and love-letter formats were already widespread, with Product Hunt launches and many digibouquet domains, and I could not compare designs or launch dates.
  - The "digibouquet" domain sprawl shows the format is trivially cloned. A distinct brand, not the format, would have to carry the moat.

### Gaps
- Not checked, because the search budget was exhausted and fetching was blocked:
  - traffic estimates (Similarweb and the like) for any competitor;
  - review counts for LovePanda and MiMomento;
  - TikTok follower counts for Joygram, Love Capsule, @htm_creates and @flowers_the_bloom;
  - Paperless Post, Smilebox and Canva's own love-letter templates;
  - Spanish-language makers (for example "regalo digital" sites), and the TwoMade and DearYou price pages.
- I could not open any page to check side by side whether a competitor copies an Ethos template or post format.

---

## B2. Who ranks for the category searches?

### Takeaway
Google itself could not be queried on 1 Nov 2026. In the non-Google WebSearch engine, Ethos appears for none of the category searches tried. Even a bare search for "tryethos" returns no Ethos page, only crypto and dictionary results. The only Google evidence is the repo's 24 Oct snapshot (A5): gift cards for "digital gift", and tiny single-page sites for the niche phrases.

### Cited Findings (WebSearch engine, US, unpersonalised, 1 Nov 2026; not Google)
- **"digital gift for boyfriend website":**
  - GiftYa blog (gift cards), Kudoboard, Under Lucky Stars, a Gumroad tribute template, a selar.com "Digital Keepsake for Your Girlfriend", getly.store "virtual rose" and a Chrome Web Store gift-ideas extension. No Ethos.
  - Sources: [giftya](https://blog.giftya.com/article/gift-ideas-for-boyfriend), [kudoboard](https://www.kudoboard.com/?p=3626), [narrativenest](https://narrativenest.gumroad.com/l/lovely-cute-tribute), [selar](https://selar.com/q11028h16e), [getly](https://www.getly.store/product/virtual-rose).
- **"love letter website maker":**
  - Product Hunt pages for LovePaper, Virtual Love Letters, Letters by Heart and Love you make, plus justmeantforyou.com, YouWare and lettersbyheart.com/about. No Ethos.
  - Sources: [PH Letters by Heart](https://www.producthunt.com/p/letters-by-heart/letters-by-heart), [justmeantforyou](https://justmeantforyou.com/blog/valentines-day-digital-love-letter-maker.php), [lettersbyheart about](https://lettersbyheart.com/about.html).
- **"virtual bouquet":**
  - An AR flowers app on the App Store, VivoRose (hunted.space), egreet.in, AlternativeTo "Digital Flower Bouquet", promptzone DigiBouquet posts and wagmag. No Ethos.
  - Sources: [App Store](https://apps.apple.com/app/id1574300728), [egreet](https://egreet.in/blog/post/virtual-bouquet-delivery-guide), [alternativeto](https://alternativeto.net/software/digital-flower-bouquet/about/).
- **"regalo digital para mi novio":**
  - Editorial gift lists and gift-card pages: El Imparcial, Chic Magazine MX, Bankinter, marriage.com/es, TV Azteca, Local10 en español ("10 regalos digitales de última hora") and El Financiero ("ideas digitales de 14 de febrero").
  - No dedicated gift-maker site in the results, and no Ethos.
  - Sources: [El Imparcial](https://www.elimparcial.com/estilos/2025/12/01/los-mejores-regalos-para-tu-novio-en-navidad-2025-opciones-desde-lo-mas-barato-hasta-lo-mas-premium/), [Local10](https://www.local10.com/espanol/2025/12/24/aqui-tienes-una-lista-de-10-regalos-digitales-de-ultima-hora-para-navidad/), [El Financiero](https://www.elfinanciero.com.mx/archivo/mucho-amor-y-poco-dinero-ideas-digitales-de-14-de-febrero/).
- **"tryethos":**
  - Coincodex (Etho Protocol crypto), CoinGecko, OpenSea "Cryptethos", Wikipedia "Ethos" and dictionary pages.
  - **No tryethos.io result** — [coincodex](https://coincodex.com/es/convert/try/etho-protocol/10000), [Wikipedia](https://en.wikipedia.org/wiki/Ethos).
- **"tryethos.io" (in quotes):**
  - Gridinsoft's scanner ranks first: "Safe or Scam? (60/100 Trust Score)", with "1 security-provider warning" and a "3-month domain history" — [gridinsoft](https://gridinsoft.com/online-virus-scanner/url/tryethos-io).
  - Then tryethos.io's /occasions, /occasions/birthday, /templates, /occasions/christmas, / , /pricing and /occasions/long-distance.
  - The engine's copy of the homepage still carries the old title, "Ethos — Date ideas, trips and gifts for couples". Its pricing summary says "2 of 37" templates free, against 54 templates and the "Digital gifts that open like a story" title since 24 Oct per SEO-ORGANIC.md — [tryethos.io](https://tryethos.io/), [pricing](https://tryethos.io/pricing), [templates](https://tryethos.io/templates).

### Inferences
- In at least this non-Google index, Ethos has almost no footprint: a stale copy of the site, ranked under a scam checker.
- AI assistants that browse through non-Google indexes would struggle to surface Ethos, even for its own name.
- The Spanish searches return editorial lists and no makers, which may be an open lane. That is a hypothesis, unconfirmed on Google.

### Gaps
- No Google, Bing or DuckDuckGo results pages could be opened (blocked hosts).
- Not run: "digital gift", "digital gift for girlfriend", "love letter website" exactly, and "regalo digital" (search budget exhausted).
- I can't say whether Google results for the owner are personalised. The repo's 24 Oct snapshot came from the owner's signed-in Brave browser per SEO-ORGANIC.md, so it may be personalised.

---

## B3. What do AI assistants name when asked for the best digital-gift sites, and does Ethos appear?

### Takeaway
I could not see a Google AI Overview. Two proxies were available: the published roundups that assistants draw on, and the WebSearch tool's own AI summaries. Neither names Ethos. The roundups are almost all written by competitors ranking themselves first.

### Cited Findings (1 Nov 2026)
**Published 2026 roundups**
- **LovePanda**, "Best digital gift website for couples in 2026": names itself best, with sources checked 1 Oct 2026 — [lovepanda.co](https://lovepanda.co/blog/best-digital-gift-website); also [lovepanda.com.br](https://lovepanda.com.br/blog/best-digital-gift-website).
- **MiMomento**, "Best Digital Gift Page Makers 2026": names itself best value, then YourLovePage, ILoveYou.gift and LovePage.io — [mimomento.app](https://www.mimomento.app/blog/best-digital-gift-page-makers-2026).
- **Letters by Heart's** comparison: picks Letters by Heart, with DigitalLoveLetters a close second — [lettersbyheart.com](https://lettersbyheart.com/blog/best-website-to-make-love-letters-online-comparison).
- **Others:**
  - The Dating Store, "Best Digital Gift Websites in India (2026)" — [thedatingstore.com](https://thedatingstore.com/gifts/best-digital-gift-websites-india).
  - Greenvelope, "Best Digital Greeting Card Sites in 2026" — [greenvelope.com](https://www.greenvelope.com/resources/best-digital-greeting-card-sites).
  - Thankbox, "17 places…" — [thankbox.com](https://www.thankbox.com/blog/17-places-to-find-the-best-online-presents-and-digital-gifts).
  - ABC7's syndicated "2024 Digital Gift Guide" (gift cards) — [abc7chicago](https://abc7chicago.com/best-last-minute-digital-gifts-shop/14017347/).

**The WebSearch tool's AI summaries**
- **"best digital gift websites 2026":**
  - Amazon eGift Card ("best overall pick"), Visa gift cards, PlayStation Store and Hulu cards, LovePanda (called "the most complete platform on the digital gift market" by one comparison), TwoMade (gamification), Thankbox, MasterClass, Toasty and Giftronaut.
  - It noted "no independent 2026 testing from a neutral source". No Ethos — [findingdulcinea](https://findingdulcinea.com/best-digital-gifts-ideas/), [lovepanda.com.br](https://lovepanda.com.br/blog/best-digital-gift-website).
- **"love letter website maker":** LovePaper, Letters by Heart, Just Meant For You, YouWare, Virtual Love Letters and HeartInk. No Ethos — [Product Hunt](https://www.producthunt.com/posts/letters-by-heart), [justmeantforyou](https://justmeantforyou.com/blog/online-letter-maker.php).
- **TikTok discover pages:** Canva templates, Joygram, Wish4Love, Love Capsule and LoveDigitalGift. No Ethos — [TikTok discover](https://www.tiktok.com/discover/virtual-gift-for-your-boyfriend-website).

**What the repo has done** — `docs/marketing/SEO-ORGANIC.md`
- `llms.txt` names each template's search phrase (24 Oct).
- The blog queue includes "best website to make a love letter online" and "best digital gift websites" comparison posts.
- Pitches to editorial lists (iDrop News, SELF, CNN) are on hold, by the owner's call on 24 Oct.

### Inferences
- In this niche, AI answers are effectively written by the makers' own self-ranking listicles. A credible, fair comparison table, plus a few third-party mentions (Product Hunt, AlternativeTo, PeerPush, editorial gift guides), is the realistic route into assistant answers.
- Generic gift-card publishers dominate the head term "digital gift", which suggests assistants frame "digital gift" as gift cards unless the question says "personal" or "love letter".

### Gaps
- I did not query ChatGPT, Perplexity, Gemini or Google AI Overviews directly. No such access was available, and google.com was blocked.

---

## B4. What do TikTok search and hashtags show for "digital gift", "digital gift for boyfriend" and "link gift"?

### Takeaway
TikTok has many web-visible discover pages for "website gift for boyfriend"-type searches. They are filled with Canva-template sellers and free or cheap gift sites (Joygram, Love Capsule, LoveDigitalGift, Wish4Love). In the repo's 11 Oct data, #digitalgift is a small tag (5.5K posts, 75M views).

### Cited Findings
**Discover pages that exist** (1 Nov 2026)
- [virtual-gift-for-your-boyfriend-website](https://www.tiktok.com/discover/virtual-gift-for-your-boyfriend-website)
- [gift-website-ideas-for-boyfriend](https://www.tiktok.com/discover/gift-website-ideas-for-boyfriend)
- [birthday-gifts-for-my-boyfriend-virtual](https://www.tiktok.com/discover/birthday-gifts-for-my-boyfriend-virtual)
- [making-a-website-for-my-boyfriend](https://www.tiktok.com/discover/making-a-website-for-my-boyfriend)
- [virtual-gifts-ideas](https://www.tiktok.com/discover/virtual-gifts-ideas?lang=en)
- [virtual-gift-ideas-for-your-boyfriend](https://www.tiktok.com/discover/virtual-gift-ideas-for-your-boyfriend)
- [love-digital-gift-tutorial](https://www.tiktok.com/discover/love-digital-gift-tutorial)
- [cute-websites-for-your-boyfriend](https://www.tiktok.com/discover/cute-websites-for-your-boyfriend)
- [virtual-gift-letters](https://www.tiktok.com/discover/virtual-gift-letters)
- [digital-love-letters](https://www.tiktok.com/discover/digital-love-letters)
- [app-for-writing-love-letter](https://www.tiktok.com/discover/app-for-writing-love-letter)

**What the summaries show on them**
- Canva website templates, including a "monthsary website template with a passcode" and tutorials for a "passworded birthday website gift".
- Joygram: a "free interactive website gift that takes about 30 seconds to make".
- Wish4Love: a free digital love letter creator.
- Love Capsule and LoveDigitalGift, promoted as gift websites.
- Source: [TikTok discover](https://www.tiktok.com/discover/gift-website-ideas-for-boyfriend).

**Repo, 11 Oct 2026** (`docs/marketing/VIRAL-FORMULA.md` lines 1944–1990)
- #digitalgift: 5.5K posts and 75M views. #giftforboyfriend: 76K posts and 1.4B views. #giftforgirlfriend: 110K posts and 1.3B views.
- Seller accounts @htm_creates (2.7M) and @flowers_the_bloom (3.8M), plus @lovecapsule.cc and @joygram.io, hold "digital gift for girlfriend" and similar searches.
- "my boyfriend made me a website" is weakly held.

### Inferences
- "Website gift" and "made me a website" are the words TikTok users actually use, more than "digital gift". Joygram and Love Capsule appear in both the repo's 11 Oct notes and the 1 Nov discover summaries, which makes them the most consistent TikTok-native competitors.

### Gaps
- "link gift" was not searched (budget exhausted), and the discover pages could not be opened. No view counts or creator follower counts for 1 Nov 2026.

---

## B5. Is the handle "tryethos" free on the main platforms, and who holds the lookalike domains?

### Takeaway
None of this could be verified from the web on 1 Nov 2026: RDAP was blocked by a proxy 403, search engines were unreachable, and the search budget was exhausted. The only evidence comes from the repo, as of its dates.

### Cited Findings
- **Instagram:** "instagram.com/tryethos didn't exist (checked 19 Sep 2026)" — `src/config/brand.ts` lines 15–18. In other words, it was unclaimed then. Ads setup asks the owner to create @tryethos — `docs/marketing/ADS-SETUP.md` line 80.
- **Pinterest:** "@tryethos was taken", so Ethos uses @tryethosgifts (28 Oct 2026) — `docs/marketing/etsy/replies-and-pins.md` line 33.
- **X:** the site emits `twitter:site` "@tryethos" (`src/config/site.ts` line 21). No doc confirms the account exists or is owned.
- **Threads, Snapchat, Reddit:** no repo evidence either way.
- **Domains:** tryethos.app is "a different 'Ethos' (a journaling app)" that shows up under the brand search (24 Oct 2026) — `docs/marketing/SEO-ORGANIC.md` line 71. Gridinsoft gives tryethos.io a "3-month domain history" — [gridinsoft](https://gridinsoft.com/online-virus-scanner/url/tryethos-io).
- **tryethos.com, ethos.gift, sendethos.com:** rdap.org returned 403 from the session proxy on 1 Nov 2026. No other lookup was possible. Status unknown.

### Inferences
- "Ethos" is a crowded name: a rhetoric term, a crypto token (Etho Protocol), a journaling app on tryethos.app, and Pinterest's @tryethos held by someone else. The brand's searchable identity is really "tryethos", which is itself only partly owned across platforms.

### Gaps
- Live availability of @tryethos on Instagram, X, Threads, Pinterest, Snapchat and Reddit, as of 1 Nov 2026.
- WHOIS or RDAP for tryethos.com, ethos.gift and sendethos.com.
- These need a session with rdap.org, or a registrar site, allowed, or a manual check by the owner.

---

## B6. Are there public signals of search interest in "tryethos" or "ethos gift"?

### Takeaway
I could not reach Google Trends. The best available signal is the repo's Search Console data: brand searches spike on TikTok hit days (1,651 clicks on 21 Sep) and sit at 23–90 clicks a day otherwise. Outside Google, the brand has almost no index footprint.

### Cited Findings
- Search Console, 18 Sep – 22 Oct 2026: 7.4K clicks, about 99% of them brand queries, with spikes of 1,651 (21 Sep), 884 (2 Oct) and 359 (21 Oct) and a baseline of 23–90 a day — `docs/marketing/SEO-ORGANIC.md` lines 13–18.
- Brand-query variants seen: "tryethos", "tryethos. io", "try ethos", typos, and safety checks ("is this website safe") — same file, lines 15, 29–33.
- WebSearch for "tryethos" on 1 Nov 2026 returned no Ethos result — [coincodex](https://coincodex.com/es/convert/try/etho-protocol/10000), [Wikipedia](https://en.wikipedia.org/wiki/Ethos).

### Inferences
- Brand demand is a series of TikTok-driven pulses with no steady base. Each pulse is partly lost to misspellings ("try ethos", "tryethos. io") and to safety doubts, which the scam-checker results then answer.

### Gaps
- Google Trends for "tryethos" and "ethos gift" (google.com blocked). Trends would probably show near-zero volume outside hit days anyway.

---

## Implications for Ethos (interpretation, not fact)

1. **The best gifts carry no name.**
   - The paid premium gifts that convert and travel show only an unlabelled seal and the domain. Free gifts carry "Made with Ethos", and that footer is sold for removal.
   - Consider a small, permanent maker's mark on the sound gate or under "Made by X for Y" (for example "· Ethos" beside the seal). It would be distinct from the removable footer, so paid buyers keep "no footer" while recipients still learn the name.
   - Check the wording against `legal.ts` section 14 and the paid-extras promise first.
2. **The name has to be easy to recall because TikTok won't let it be shown.**
   - With on-screen branding effectively banned (16–17 Oct) and Google Lens queries ("what website is that") showing demand, buyers can only arrive by remembering "tryethos".
   - Any brand work should make that one string unmistakable: in the bio, in pinned comments, and in what the recipient sees on the gift itself. Treat a rename or a second domain as a fallback only if TikTok blocks tryethos.io as a bio link (the doc's own test, still unrun).
3. **Nobody owns the category, and the head term belongs to gift cards.**
   - Niche searches are won by single-page sites and self-ranking listicles (LovePanda, MiMomento, Letters by Heart). Ethos appears in none of the roundups or AI summaries found.
   - The cheapest moves: a fair, cited comparison page; the directory listings already written in LINK-KIT (AlternativeTo, Product Hunt, PeerPush, where DigiFlower and Letters by Heart already sit); and one or two editorial gift-guide mentions before Christmas and Valentine's.
4. **The format can't be the moat.**
   - Bouquet, love-letter, scratch-reveal and "open when" makers are many, cheap ($0–9.90) and trivially cloned (the "digibouquet" sprawl). Some lead with "free, no watermark" (AIskyla).
   - What Ethos can own is breadth (54 templates), voice and song, the free reply, Spanish, and a recognisable seal. That only works if recipients see them attached to a name.
5. **Trust signals are weak at the moments that matter.**
   - Scam checkers are the only sites linking to Ethos and they rank for the brand. A 60/100 Gridinsoft score appears first for "tryethos.io" on a non-Google engine.
   - The ad panel asked for a company name and reviews. Checkout read "Pay SECUORA" as of 23 Sept.
   - Fixing the checkout name, the "who we are" details and early reviews (Etsy, Product Hunt) is brand work, not only conversion work.
6. **Handles: lock them down now.**
   - Claim @tryethos wherever it is still free: Instagram (free on 19 Sep), Threads, X (already referenced in site metadata), Snapchat and Reddit.
   - Check tryethos.com, ethos.gift and sendethos.com through a registrar.
   - Pinterest @tryethos is already lost, and tryethos.app already confuses brand search.
7. **Spanish may be the open lane.** In the non-Google results, "regalo digital para mi novio" showed editorial lists and gift cards but no makers. Ethos already has Spanish pages, a Spanish Etsy shop language, and a competitor (MiMomento) selling in ES. Verify on Google first.
