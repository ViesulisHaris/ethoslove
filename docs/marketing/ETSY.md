# Selling on Etsy

Etsy is plan B for when paid ads don't pay: buyers there already search for digital love letters,
interactive birthday gifts and long-distance gifts, and the shop only pays a commission on a sale.
On 27 Oct 2026 the top results for those searches were Canva templates the buyer still has to edit
(€2–10), a ready-made interactive gift is the gap.

## How an Etsy sale works

1. The buyer pays on Etsy. Etsy charges the price and, for EU and UK buyers, the VAT on digital items.
2. Etsy hands them the listing's download at once: a one-page PDF with a link (and QR code) to
   `tryethos.io/etsy/<slug>`. A buyer who checked out as a guest can't download it without signing in
   to Etsy (seen on the real test order, 28 Oct), so every listing and the message to buyers also give
   **tryethos.io/etsy**: type the order number from any Etsy email and it opens the gift bought, the
   number already in its "Bought on Etsy" box (`/api/etsy/find`, which hands nothing over).
3. That page shows the gift running and three steps; its button opens `/create/<slug>?etsy=1`.
4. They make the gift on the site like anyone else. When they press Send, the pay sheet shows
   **Bought on Etsy** instead of prices: the Etsy order number, and an email if they have no account.
5. The server asks Etsy for that order (`/api/etsy/claim`). It hands the template over only when
   Etsy says the order is paid (`is_paid`, status `paid` or `completed`, nothing refunded) and one of
   its items has this template's SKU. Each item works once (a unique key per item in `purchases`).
6. A guest gets an account from the email and is signed in, as after a Stripe checkout; the gift goes out.
7. Every day `/api/cron/etsy` asks Etsy again about orders from the last 100 days. A cancelled or fully
   refunded order takes the template back. A partial refund is only logged, to look at by hand.

Nothing the buyer's browser sends decides whether something was paid: that answer comes from
Etsy every time. Code: `src/lib/etsy/`, `src/app/api/etsy/`, `src/components/editor/etsy-claim.tsx`,
migration `0018_etsy.sql`, tests `tests/unit/etsy.test.ts`.

## Where it stands (28 Oct 2026)

- **Shop open:** TryEthos (tryethos.etsy.com). English, Latvia, EUR; Migla as an incorporated business; Etsy Plus declined.
- **Shop page finished on 28 Oct:**
  - logo, tagline, About; location Riga, Latvia; the banner (`etsy/photos/shop-banner.jpg`);
  - an announcement (how it works, the refund promise);
  - eleven sections: Birthday gifts 10, Love letters 11, Long distance 4, Anniversary & photos 9, Surprise reveals 3, Christmas 1, Halloween & fall 10, Graduation 1, New Year 1, Wedding 1, Funny gifts 3 (the last five added with wave 3);
  - four featured listings: Pop-up Card, XOXO, Jar of Reasons, Halfway;
  - five FAQs: getting the gift, the order number, no Canva, if it doesn't open, how long it lasts.
- **Policies:**
  - Returns: Etsy's fixed digital-item policy.
  - Privacy: a GDPR policy naming SIA "MIGLAI" as controller, consistent with the site's.
  - EU right of withdrawal: 14 days, with the model form. It is stated rather than waived because Etsy's checkout doesn't ask the buyer to give it up for the gift; unstated, the law stretches it to 12 months.
  - The EU ODR link is left off: that platform closed in 2025.
  - Etsy's advisor lists nothing left to do; only a seller photo is missing.
- **EU seller status: Trader** (set 28 Oct, owner's OK). Buyers see it under "View shop registration details", with SIA MIGLAI's registration and VAT numbers, address and support email from `src/content/legal.ts`. There is no phone number: add one under Other details if the company gets one.
- **All 54 templates live since 28 Oct:** the first 8, 9 more (wave 2) and the other 37 (wave 3, at the end). Publishing cost $3.40 + $7.40; each renews itself every four months for $0.20.
  - each has 5 photos (Museum has 4), a 15 s video, its PDF and its SKU;
  - all 13 tags, €10.99, quantity 999. Etsy adds VAT on top for EU buyers (a buyer in Latvia sees €13.30, "VAT included");
  - titles, tags, a first line and the Occasion rewritten on 28 Oct from Etsy's own search suggestions (see Getting found);
  - "made by me", "created by me".
- **The Etsy app "ethos":** approved (Personal Access), callback URL set, the three keys in Vercel, and the shop connected on 28 Oct. A made-up order number now answers "order_not_found", which only happens once Etsy answers for our shop.
- **The buyer's path, tested locally on 28 Oct** against a stand-in Etsy (iPhone sizes, Chrome and Safari's engine). A new buyer goes from the PDF link to a sent gift in about 18 s, and the recipient's link opens. Also tested:
  - a returning buyer signs in inside the Etsy box, their email filled in, and the gift they wrote goes out;
  - an order of 2 sends two gifts and refuses a third;
  - an order for another gift offers "Open <that gift>";
  - unpaid, typo and already-used orders each get their own message;
  - a refunded order is taken back by the daily check (its gift link stops working, as with a Stripe refund), and a partly refunded one is only flagged in the logs.

**Real test order done (28 Oct, #4213425511):** bought on Etsy with a code (€1.20), found through tryethos.io/etsy, the gift made and sent; its link opens for the recipient. The refund half was skipped on the owner's call and the order kept. Refunds taking a gift back are covered by the local test; the first real refund is the moment to check the gift went down the next morning.

**Where buyers are told about tryethos.io/etsy (28 Oct):** a starred "★ HOW TO GET YOUR GIFT ★" block right above "No Canva, no app" in every description, the fifth photo ("Go to tryethos.io/etsy: type your Etsy order number. No download.", all 17 replaced and checked as Etsy serves them), step 1 of every listing's "How it works", the shop announcement, the first FAQ, "Message to buyers" on every receipt and "Message to buyers for digital items" on the Downloads page (Shop Manager → Settings → Info & Appearance). Etsy's own emails can't be edited, and its guest email shows neither message.

**Launch pricing and ads (owner's go, 28 Oct):**
- **Sale LAUNCH40:** 40% off the whole shop, 28 Oct – 22 Nov. €10.99 becomes €6.59 (€7.97 with Latvian VAT), and new listings get it too. It is legal because €10.99 was the only price before. Top competitors all show 25–57% off.
- **Cyber Specials:** signed up at 40%, 23 Nov – 1 Dec (Etsy's event), so the price holds through 1 Dec. After that it goes back to €10.99; the next sale should be a real event, not a permanent one.
- **Etsy Ads:** approved at $3–5/day from about 12 Nov, when a new shop's 15-day wait ends. Not started yet.
- **Search:** on 28 Oct none of the 17 listings showed up signed out, even for their exact titles; Etsy hadn't indexed them yet. Signed in as the shop, Etsy hides your own listings, so measure ranks signed out.
- **The 37 remaining templates:** listed and published on 28 Oct (wave 3, at the end). Not yet in search either; check each signed out by its exact title once Etsy indexes them.

- **Pinterest:** business account [@tryethosgifts](https://www.pinterest.com/tryethosgifts/) ("Ethos", the shop logo, website tryethos.io), set up 28 Oct.
  - Five public boards, each with a keyword description.
  - The 17 pins went in by bulk upload (`etsy/pins/pinterest-bulk.csv`, images served from `tryethos.io/pins/etsy/`). Two publish at once, then 3 a day at 13:00/18:00/23:00 UTC until 2 Nov.
  - Pinterest no longer lets you claim an Etsy shop, so tryethos.io is claimed instead (the `p:domain_verify` tag in the root layout).

- **Spanish:** added as a shop language on 28 Oct. Shoppers browsing Etsy in Spanish see the Spanish versions.
  - The 17 original listings have Spanish titles, 13 tags and descriptions (`etsy/listings-es.md`).
  - The shop texts are translated too: title, announcement, both thank-you messages, sections, FAQ and About.
  - The two legal policies stay in English. Photos and videos have no per-language version on Etsy, so they stay English.
  - Checked signed out as a shopper in Spain: the Spanish title, description, sale price and seller "Ethos" show.
  - The 37 wave-3 listings are not translated yet.
- **Saved replies:** the five from `etsy/replies-and-pins.md` are in Etsy as "snippets", reached from the snippet icon under any message box.
- A one-off rank check is scheduled for 29 Oct 10:00, in the signed-out in-app browser.

### The test order

**Real test order #4213425511, 28 Oct:** paid €1.20 with Apple Pay as a guest. Etsy's guest email only offers "Sign in & view order", so the owner couldn't reach the PDF; that led to /etsy. `/api/etsy/find` read the real receipt correctly (popup-card), and the editor opened with the order filled in.

1. Someone else buys one listing. A shop can't buy from itself, and the buyer shouldn't leave a review: a refunded order with a review looks like the shop bought it.
   **A promo code makes it cost about €1** (created 28 Oct, in Etsy under Marketing → Sales and discounts; the code itself is kept out of this repo).
   - It takes €10 off any listing, so a buyer pays €0.99 plus their VAT: about €1.20 in Latvia.
   - It works from 28 Oct to 11 Nov 2026, twice in all, once per buyer. Etsy caps percentage codes at 75%, hence the fixed amount.
   - The buyer types it at checkout, or opens the shop link with `?coupon=<code>`.
   - Our side doesn't look at the price, so a discounted order unlocks the gift like a full-price one.
   A message to send them: *"Could you test my Etsy shop? Buy any gift at tryethos.etsy.com and I'll refund you the same day. After paying, download the PDF, open its link on your phone, make a little gift for anyone, press Send and type the order number from your Etsy receipt. Tell me if anything was confusing. Please don't leave a review."*
2. Check they got the "It's live" page and that their gift's link opens on another phone. The logs show it too: `vercel logs --scope ethoslvoe --project ethoslove` should have `POST /api/etsy/claim 200` and no `[etsy]` errors.
3. Refund the order on Etsy: Shop Manager → Orders → the order → Issue a refund, full amount.
4. The next morning, after the 05:00 UTC daily check, their gift's link should show "This page wandered off", as a Stripe refund does.

Photos: `docs/marketing/etsy/photos/<slug>/`, made by `scripts/etsy-shots.mjs`, then `etsy-photos.mjs` and `etsy-brand.mjs`.
All three take slugs, to make one listing without touching the others. A new listing is quickest as an
Etsy copy of a draft in the same category (Copy, Delete all photos, then upload): it keeps the price,
quantity, digital type, category and attributes.

## Setting it up (the owners, once)

Claude can't open accounts, enter bank details or handle keys: these steps are yours.

1. **Open the shop** at etsy.com/sell, signed in with the business email.
   - Country Latvia (Etsy Payments works there without Payoneer), shop currency EUR, shop language English.
   - Shop name: something like *TryEthos* or *EthosGifts*, whichever is free.
   - Etsy asks for a bank account, ID verification and a card for fees; it may charge a one-time
     opening fee.
2. **Fill in the shop**: logo (the Ethos mark), banner, About, and these policies:
   - Returns: *No returns* (it's a digital item), plus in the FAQ: "If your gift doesn't open on their
     phone, message us and we'll refund you", the same promise as on the site.
   - Messages: answer within 24 hours. Etsy ranks shops by it.
3. **Create the Etsy app** at etsy.com/developers/register, signed in as the shop's owner:
   - Name: *Ethos order check*. Type: for your own shop.
   - Callback URL: `https://tryethos.io/api/etsy/callback`
   - Etsy shows a **keystring** and a **shared secret**.
4. **Add them to Vercel** (project ethoslove, Production), yourself:
   - `ETSY_KEYSTRING`: the keystring
   - `ETSY_SHARED_SECRET`: the shared secret
   - `ETSY_CONNECT_SECRET`: any long random password (a password manager can make one). It guards the
     connect link.
   - Optional: `ETSY_SHOP_ID`, to pin the shop. Without it, the shop is the one the connecting
     account owns.
   - Then redeploy.
5. **Apply migration `0018_etsy.sql`** in Supabase (Claude can do it in your browser, with your OK, as
   with the earlier ones).
6. **Connect**: signed in to Etsy as the shop's owner, open
   `https://tryethos.io/api/etsy/connect?key=<ETSY_CONNECT_SECRET>` and press Allow. The page says
   "Etsy is connected". If Etsy ever stops answering (the app revoked, or its sign-in refused), do this again. The
   daily check renews the sign-in once a month, so a quiet shop doesn't lapse after Etsy's 90 days, and logs
   `[etsy] the shop's Etsy sign-in failed` if it can't.
   Then open `https://tryethos.io/api/etsy/status?key=<ETSY_CONNECT_SECRET>`: every check should say
   `"ok": true`. It tests the keys, migration 0018, the connection, the token's renewal, Etsy
   answering for the shop, and permission to read orders, without buying anything.
7. **Create the listings** below. On each one:
   - Type: **Digital files**. Upload that template's PDF from `docs/marketing/etsy/`.
   - **SKU**: exactly as given (`ethos-<slug>`). This is how the site knows which template was bought;
     a listing without it can't send a gift.
   - Price €10.99 (US buyers see about $12; the site charges $11.99).
   - Photos: at least 5, the first a single picture of the gift on a phone, 2000 px or more.
   - Use all 13 tags and pick the most specific category.
8. **Test with a real order** before advertising: someone else buys one (a shop can't buy from
   itself), follows the PDF, sends the gift, and is refunded on Etsy. By the next morning the template
   is gone from that account.

## Getting found

Etsy ranks by relevance (title, tags, attributes, category, description), then by how often people
who see a listing buy it, the shop's service (reviews, replies, cases) and listing quality (photos,
return policy). Etsy Ads put a listing in the ad slots at the top but don't change the rest of the
ranking. Sources: [How Etsy Search Works](https://www.etsy.com/seller-handbook/article/375461474487),
[Search visibility](https://help.etsy.com/hc/en-us/articles/25869947521175).

### What buyers type

Etsy's search box suggests only phrases people search, so its suggestions are the demand list
(checked 28 Oct 2026):

- **Birthday:** interactive birthday card, interactive birthday website (template), birthday website
  template, digital birthday card for husband / boyfriend, birthday card for husband.
- **Love:** digital love letter, digital love letter website, love letter template, love website
  template, interactive website template, anniversary website template, open when letters digital.
- **Who it's for:** digital gift for him / for mom / ideas, long distance gift for boyfriend / him /
  girlfriend, valentines gift for him / her / boyfriend / girlfriend / husband / wife.
- **Photos:** digital memory book, digital photo album, photo book template couple, photo slideshow video.
- **Others we can serve:** reasons why i love you, surprise trip reveal, scratch off cards, digital
  anniversary scratch off, advent calendar digital, digital flowers, animated card, pop up card, last
  minute gifts.

**No suggestions, so hardly searched:** virtual bouquet, virtual gift, digital bouquet, birthday ecard,
christmas ecard, digital gift for her / boyfriend / girlfriend. Two of the first titles led with these.

### Who is on top

Canva website and photo-book templates at €4–15 ("edit in Canva"). Two searches have almost no
digital listing in their top 10: **"reasons why i love you"** (none) and **"long distance gift for
boyfriend"** (one). Those are the quickest #1s.

### How every listing is written

- The title opens with the phrase with the most demand, then a second phrase, then who it's for.
- 13 tags, all phrases from the list above, at most 20 characters; the title's main phrase is a tag too.
- The description's first line says the main phrase in an ordinary sentence.
- Occasion: Birthday or Anniversary. This category has no Valentine's occasion; the title and tags carry it.
- Say what Canva templates can't: **no Canva, no app, made on your phone in minutes, opens as a real
  interactive gift**. It's why someone who clicks buys, and buying is what ranks.
- Never another brand's name. Never buy from the shop ourselves, ask friends to, or offer anything
  for a review: Etsy closes shops for it.

### The plan to be #1 (money steps need the owners' OK)

1. **Publish** the 17 drafts after the test order passes ($0.20 each).
2. **Etsy Ads at $3–5 a day** on every listing for 30 days. A new listing with no sales gets almost
   no organic views; ads bring the first orders, and orders lift the organic rank. A sale leaves about
   €9.30 after Etsy's published fees (6.5% transaction, 4% + €0.30 payment, $0.20 listing; check it
   against the first payout), so an ad order must cost less than that. A new shop can only start Etsy
   Ads 15 days after opening: TryEthos from about 12 Nov 2026.
   **Offsite Ads: keep them on** (they are on). Etsy pays for the ads on Google, Pinterest and Instagram
   and takes 15% only when one brings a sale, about €2 of an €11 gift. That still leaves about €7.30, far
   cheaper than a Meta sale, and every sale lifts the ranking.
3. **Wave 2, nine listings for the open searches:** built as drafts on 28 Oct (texts under Wave 2 listings, at the end).
   - Jar of Reasons: "reasons why i love you"
   - Halfway and Passport: "long distance gift for boyfriend"
   - Pack Your Bags: "surprise trip reveal"
   - Scratch Card: "scratch off cards", "digital anniversary scratch off"
   - Snow Globe: Christmas; Fireside: "thinking of you gift" (both live by mid-November, when Christmas searches climb)
   - Arcade: "video game gift", "interactive birthday"
   - On Repeat: "custom album cover", song and playlist gifts
4. **Dates:** Christmas listings live by mid-November; every love listing needs orders and reviews
   by mid-January, before Valentine's week.
5. **Shop:** sections done on 28 Oct. Still to do: the Spanish texts as Etsy translations, and replies within
   24 hours. A sale only if the price was really higher before.

### Ranking audit, 28 Oct

Made with the etsy-seo and etsy-advertising skills (nexscope-ai/ecommerce-skills, reviewed, then installed in `~/.claude/skills`) and current guides.

**Where we stand:**
- The etsy-seo analyzer scores the 17 listings 83–91/100:
  - titles and tags are full and well within limits;
  - Jar of Reasons and Scratch Card titles lack a buyer modifier ("personalized", "gift");
  - photos score 50/100 (5 of 20 slots);
  - attributes 80/100: only Occasion is set;
  - descriptions have no closing call to action.
- Etsy's own search-visibility page rates the shop "set up for success".
- Each listing has room for a second video.

**What ranks on Etsy (2026):**
- Relevance first: title, tags, category, attributes.
- Then listing quality: clicks, favourites, add-to-basket and sales relative to views. Conversion is the biggest lever.
- Dwell time, which video helps.
- A short boost for new or renewed listings.
- Shop reputation: reviews, policies, replies.
- Each shopper's own history.

**The plan, in order:**
1. **Conversion first** (done: the 40% sale, the clear "how to get your gift" block, the new fifth photo).
2. **Attributes:** fill every attribute that fits ("Show all attributes": Occasion, Holiday, Recipient…) on all listings; wave 3 does it as it builds.
3. **A second video and up to 10 more photos per listing:** the recipient's view, the making, "works on any phone".
4. **Titles:** add a true buyer modifier ("Personalized", "Gift for…") where it is missing; a closing call to action in the descriptions.
5. **Personalisation fields** (Etsy "Custom options"): they would put us under the "Personalised" filter (eRank: "personalized gift" ≈ 63K searches a month). The cost is an extra checkout field. **Owner's decision.**
6. **Etsy Ads from about 12 Nov:**
   - $5/day on all listings for the first 14 days, then cut any listing with 30+ clicks and no sale, and keep the converters.
   - Ceiling: cost per sale under the €5.40 a sale nets during the sale.
   - KPIs: click-through 1.5%+, conversion 2%+, ROAS 2+.
   - Per-listing strategies only unlock at $25/day.
   - Offsite Ads stay on (fee only on a sale).
7. **Outside traffic to the listings** (TikTok, Pinterest), through Etsy's Share & Save links, which return 4% of the fees on those sales.
8. **Re-measure ranks signed out** (the in-app browser) once indexed, then weekly. Searches to track: interactive birthday card, digital love letter, reasons why i love you, long distance gift for boyfriend, digital flowers, surprise trip reveal, scratch off card, digital memory book.

## The listings

Live in the drafts since 28 Oct. Each title starts with what buyers search; tags are at most 20 characters.

### Pop-up Card · SKU `ethos-popup-card`

**Title:** Interactive Birthday Card, Digital Birthday Card for Boyfriend or Husband, Birthday Website Gift

**Tags:** interactive birthday, digital birthday, birthday website, interactive card, card for boyfriend, card for husband, birthday for him, birthday for her, pop up card, last minute gifts, digital gift for him, long distance gift, animated card

**Description:**
Interactive birthday card for him or her: a little birthday website with candles they really blow out, and your photos inside.

A birthday card they open on their phone, like a real pop-up card. A three-tier paper cake rises out
of the fold with their age on the topper, balloons and bunting stand up behind it, and a little
present waits at the front. They tap the candles to light them, make a wish, and blow into the phone
(or swipe) to put them out. Inside: your letter in handwriting and up to 8 of your photos on pegs.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

How it works:
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add their name, your photos and your words. Pick a colour: vanilla, midnight, kraft or cherry.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add music, a countdown that opens it on their birthday, and a surprise at the end. If it doesn't open
on their phone, message us and we'll refund you.

### Bouquet · SKU `ethos-bouquet`

**Title:** Digital Flowers Gift, Interactive Bouquet Love Website, Digital Gift for Her or Mom

**Tags:** digital flowers, flowers for her, digital gift for mom, love website, digital love letter, valentines for her, gift for girlfriend, mothers day gift, anniversary gift, long distance gift, interactive website, last minute gifts, birthday for her

**Description:**
Digital flowers for her, or for mom: an interactive bouquet with a little card inside holding your message.

Flowers that never wilt. You build the bouquet stem by stem: roses, peonies, tulips, sunflowers and
more, in the colours you choose, wrapped in paper and tied with a ribbon. They watch it come together
one flower at a time, then open the little card inside to find your message. Add up to 6 photos.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app: you make it on your phone in a few minutes and send them a link.

How it works:
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Pick the flowers and colours, write your card, add photos.
3. Press Send and type your Etsy order number. Your bouquet's link is ready to share.

For Valentine's Day, anniversaries, Mother's Day, birthdays, or any day you're far apart.

### XOXO · SKU `ethos-xoxo`

**Title:** Digital Love Letter Website, Interactive Valentine Gift for Boyfriend or Girlfriend, Love Website

**Tags:** digital love letter, love letter website, love website, interactive website, valentines gift, gift for boyfriend, gift for girlfriend, anniversary website, long distance gift, love letter template, digital gift for him, love notes, digital anniversary

**Description:**
Digital love letter website for your boyfriend or girlfriend: a red collage of your photos as polaroids, a kiss wherever they tap, and your letter at the bottom.

An envelope sealed with a lipstick kiss. They open it and scroll a collage in red: your photos as
polaroids on a lace doily, cut-out letters spelling what you call them, ribbon bows, fingerprint
hearts, and a card with the lines you'd underline. Wherever they tap, a kiss lands. Your letter waits
at the bottom, with one last kiss by your name. 1 to 9 photos. Cream, noir or blush.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app: you make it on your phone in a few minutes and send them a link.

How it works:
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos, your words and what you call them.
3. Press Send and type your Etsy order number. Your letter's link is ready to share.

### Birthday Cinema · SKU `ethos-birthday-cinema`

**Title:** Interactive Birthday Website, Digital Birthday Card for Him with Photos and Video, Last Minute Gift

**Tags:** interactive birthday, birthday website, digital birthday, photo slideshow, slideshow video, card for husband, card for boyfriend, birthday for him, digital gift for him, last minute gifts, long distance gift, birthday surprise, animated card

**Description:**
Interactive birthday website for him or her: their name in lights, a cake whose candles they blow out, and your photos and video rolling like a film.

Red curtains part on a marquee with their name in lights. A cake with flickering candles waits: they
blow into the phone (or swipe) to put them out, confetti fires, and a film strip of your photos rolls.
Up to 20 photos and a video clip, with music.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app: you make it on your phone in a few minutes and send them a link.

How it works:
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add their name, photos, a video and your message.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

### Coquette · SKU `ethos-coquette`

**Title:** Love Website Template, Coquette Digital Love Letter for Girlfriend, Interactive Anniversary Gift

**Tags:** love website, website template, digital love letter, love letter website, coquette gift, pink aesthetic, gift for girlfriend, anniversary website, digital anniversary, valentines for her, birthday for her, interactive website, long distance gift

**Description:**
Love website template in pink gingham: a coquette digital love letter for your girlfriend, with your photos as polaroids, real lilies and your song.

They untie a satin bow and a collage unrolls: a polaroid of the two of you between lilies and
blossom, a ticket to happiness, your song on a little player that really pauses, a postcard in your
handwriting, a gingham photo strip, and more polaroids all the way down. Your letter waits at the
bottom. 1 to 10 photos. Blush, or something blue.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app: you make it on your phone in a few minutes and send them a link.

How it works:
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos, your song and your letter.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

### Digicam · SKU `ethos-digicam`

**Title:** Interactive Birthday Website, Y2K Digital Camera Gift with Your Photos, Digital Gift for Her

**Tags:** interactive birthday, birthday website, y2k gift, digital camera, photo gift, digital birthday, birthday for her, gift for best friend, digital memory book, photo strip, gift for girlfriend, digital gift for him, last minute gifts

**Description:**
Interactive birthday website for her (or him): a little Y2K digital camera with your photos on its roll, date-stamped, and printed as a photo strip at the end.

A pocket camera from 2006 on a collage of tulips, stars and a disco ball. They press power, the lens
whirs out and your photos are on the camera roll, each with the orange date in the corner and your
caption in pixel type. Every press of the shutter takes the next one with a flash. After the last,
it prints the whole roll as a strip, and your letter comes out on a printed card. 1 to 12 photos.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app: you make it on your phone in a few minutes and send them a link.

How it works:
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos, captions and letter. Pick baby pink, silver, lilac or black.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

### Scrapbook · SKU `ethos-scrapbook`

**Title:** Digital Memory Book Website, Interactive Digital Scrapbook, Anniversary Gift for Boyfriend

**Tags:** digital memory book, digital scrapbook, memory book, digital photo album, photo book template, anniversary website, digital anniversary, anniversary gift, gift for boyfriend, gift for girlfriend, long distance gift, love website, interactive website

**Description:**
Digital memory book for your boyfriend or girlfriend: an interactive scrapbook website of your photos, their song and a letter from you.

A scrapbook they open like a real one. Your photos land on the pages as polaroids that develop, a
photo-booth strip, a stamp and a roll of film, taped and pinned between flowers. A torn note in
handwriting, a typed letter from you, their song playing, and a bouquet at the end. Up to 12 photos.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app: you make it on your phone in a few minutes and send them a link.

How it works:
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos, notes and letter. Pick Blossom, Favorite person, Seaside, Sunshine or Memories.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

### Museum · SKU `ethos-museum`

**Title:** Anniversary Website, Digital Photo Album Gift for Him or Her, Interactive Photo Gallery

**Tags:** anniversary website, digital anniversary, digital photo album, anniversary gift, anniversary for him, photo gallery gift, memory book, gift for husband, gift for wife, wedding anniversary, digital memory book, gift for parents, interactive website

**Description:**
Anniversary website and digital photo album for him or her, or for your parents: your years together, hung as a gallery they walk through.

A quiet gallery of the two of you. Each photo hangs framed on a wall with a plaque underneath: a
title, a year, a line. They walk from room to room as they swipe, and the last room is a wall text
with your message. 2 to 20 photos, a video clip and music.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app: you make it on your phone in a few minutes and send them a link.

How it works:
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos, their plaques and your message.
3. Press Send and type your Etsy order number. Your gallery's link is ready to share.

## Wave 2 listings (drafts since 28 Oct)

Written from Etsy's search suggestions (see Getting found). Snow Globe and Fireside are copies of
XOXO with the Occasion cleared; Arcade is a copy of the Pop-up Card (Birthday Cards); the rest are
copies of XOXO (Love Cards, Anniversary).

### Jar of Reasons · SKU `ethos-jar-of-reasons`

**Title:** Reasons Why I Love You Jar, Digital Love Jar for Boyfriend or Girlfriend, Interactive Love Notes

**Tags:** reasons i love you, reasons jar, love jar, love notes, jar of love notes, digital love letter, love website, gift for boyfriend, gift for girlfriend, valentines gift, anniversary gift, long distance gift, digital gift for him

**Occasion:** Anniversary

**Description:**
Reasons why I love you, in a jar they shake: every folded note is one of your reasons, some carry a photo, and your letter waits at the bottom.

A glass jar stuffed with folded notes. They shake the phone (or tap the jar) and a note tumbles out and unfolds. They keep going until the jar is empty. Write as few as 3 reasons or as many as 100, and add up to 20 photos. White, kraft or pastel.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

How it works:
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Write your reasons, add photos, pick a colour.
3. Press Send and type your Etsy order number. Your jar's link is ready to share.

Add music, a countdown that opens it on the day, and a surprise at the end. If it doesn't open on their phone, message us and we'll refund you.

### Halfway · SKU `ethos-halfway`

**Title:** Long Distance Relationship Gift for Boyfriend, Interactive Miss You Card, Digital Love Letter Map

**Tags:** long distance gift, long distance love, miss you gift, miss you card, thinking of you gift, gift for boyfriend, gift for girlfriend, digital love letter, love website, interactive card, anniversary gift, valentines gift, digital gift for him

**Occasion:** Anniversary

**Description:**
Long distance relationship gift: a postcard map of your two towns, and a paper plane they fly from your door to theirs with their breath.

Your home on one island, theirs on the other, and the real distance between you in big numbers. They blow into their phone and a paper plane, a balloon or a little bird rides their breath along the dotted path, the kilometres counting down, until the path turns into a heart and the postcard flips over to your letter, with your photos taped beside it. No microphone? A tap flies it home. Up to 8 photos; blush, sea, butter or dusk.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

How it works:
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Type both towns, add your photos and your letter.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add music, a countdown that opens it on the day, and a surprise at the end. If it doesn't open on their phone, message us and we'll refund you.

### Passport · SKU `ethos-passport`

**Title:** Long Distance Relationship Gift, Digital Passport with Your Photos as Stamps, Travel Anniversary Gift

**Tags:** long distance gift, long distance love, travel gift, passport gift, travel anniversary, anniversary gift, gift for boyfriend, gift for girlfriend, gift for traveler, digital photo album, digital love letter, love website, digital gift for him

**Occasion:** Anniversary

**Description:**
A digital passport for the one you travel with, or the one you miss: a globe draws the route from your city to theirs, and your photos fill the pages as stamps.

Their name is on the cover. They open it, a globe turns, the route draws itself (stopovers welcome), the pages fill with stamps, one per photo, and the visa page reveals your message. Up to 10 photos; navy, burgundy, forest or black.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

How it works:
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add both cities, your photos and your message.
3. Press Send and type your Etsy order number. Your passport's link is ready to share.

Add music, a countdown that opens it on the day, and a surprise at the end. If it doesn't open on their phone, message us and we'll refund you.

### Pack Your Bags · SKU `ethos-pack-your-bags`

**Title:** Surprise Trip Reveal, Digital Boarding Pass Gift, Trip Reveal Ticket for Boyfriend or Girlfriend

**Tags:** surprise trip reveal, trip reveal, trip reveal gift, surprise trip, surprise trip ticket, boarding pass gift, boarding pass, travel gift, gift for boyfriend, gift for girlfriend, anniversary gift, birthday surprise, digital gift for him

**Occasion:** Anniversary

**Description:**
A surprise trip reveal they play through: they pack a suitcase with your clues, and a departures board spells out where you're going.

They pack an open suitcase with your clues, one luggage tag at a time. The lid shuts, the zip runs and a tag with the date swings from the handle. Then a departures board clatters letter by letter to the destination, a boarding pass, train ticket or road-trip map slides up with both your names on it, and when they tear off the stub, your letter is underneath. Up to 5 clues and 6 photos.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

How it works:
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Type where you're going, when, and your clues; add photos.
3. Press Send and type your Etsy order number. Your trip's link is ready to share.

Add music and a countdown that opens it on the day. If it doesn't open on their phone, message us and we'll refund you.

### Scratch Card · SKU `ethos-scratch-card`

**Title:** Scratch Off Cards, Digital Scratch Card Reveal with Your Photos, Pregnancy Announcement or Proposal

**Tags:** scratch off cards, scratch off ticket, scratch off, scratch card reveal, digital scratch off, proposal gift, baby announcement, pregnancy reveal, anniversary gift, gift for boyfriend, gift for girlfriend, valentines gift, interactive card

**Occasion:** Anniversary

**Description:**
Scratch off cards they rub with a finger: each one hides a photo and a line, and the last one holds your message, or your news.

A stack of scratch cards. They rub the foil away and it clears with a little burst. Made for proposals, pregnancy and other announcements, and every "will you?". 1 to 12 photos; silver, gold, rose or holographic foil.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

How it works:
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos and a line for each card, then the last card's message.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add music, a countdown that opens it on the day, and a surprise at the end. If it doesn't open on their phone, message us and we'll refund you.

### Snow Globe · SKU `ethos-snow-globe`

**Title:** Christmas Gift for Boyfriend or Girlfriend, Personalized Snow Globe with Your Photos, Digital Christmas Card

**Tags:** snow globe, custom snow globe, christmas gift, digital christmas, christmas card, our first christmas, christmas for him, christmas for her, gift for boyfriend, gift for girlfriend, long distance gift, digital love letter, interactive card

**Occasion:** none (this category has no Christmas occasion)

**Description:**
A snow globe on their shelf: they shake their phone, it snows, and every time it settles one of your photos or lines appears.

A snow globe on a shelf. A harder shake makes a wilder storm, and turning the phone over tips the whole globe. After the last one the brass plaque is engraved and your letter opens. No motion sensor? A button shakes it. 1 to 8 photos.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

How it works:
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos, your lines and your letter.
3. Press Send and type your Etsy order number. Your globe's link is ready to share.

Add music, a countdown that opens it on Christmas morning, and a surprise at the end. If it doesn't open on their phone, message us and we'll refund you.

### Fireside · SKU `ethos-fireside`

**Title:** Thinking of You Gift, Cozy Digital Love Letter with a Candle and Your Photos, Miss You Card

**Tags:** thinking of you gift, miss you card, miss you gift, cozy gifts, cozy gifts for her, digital love letter, love letter, love website, long distance gift, gift for girlfriend, gift for boyfriend, christmas card, interactive card

**Occasion:** none (this category has no Christmas occasion)

**Description:**
A thinking of you gift for a cold evening: they light a candle in a little cabin, the room turns gold, and your letter unfolds from the blanket.

Leaves or snow fall past the window. Your photos hang from a string on wooden pegs, sparks drift up from the candle, and their song plays low. Up to 8 photos; amber, maple or moss.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

How it works:
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Write your letter, add photos and their song.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add a countdown that opens it on the day, and a surprise at the end. If it doesn't open on their phone, message us and we'll refund you.

### Arcade · SKU `ethos-arcade`

**Title:** Video Game Gift for Boyfriend, Interactive Birthday Game with Your Photos, Retro Arcade Message

**Tags:** video game gift, gamer gift, interactive birthday, birthday for him, gift for boyfriend, digital gift for him, retro game, arcade game, pixel gift, anniversary gift, valentines for him, long distance gift, last minute gifts

**Occasion:** Birthday

**Description:**
A video game gift made from your photos: they catch falling hearts, every level clears a photo, and the last one reveals your message.

A tiny retro game. They drag the basket to catch hearts, stars or slices of cake; bleeps, pixel text, a CRT scanline switch and a leaderboard of one. 1 to 8 photos, one per level.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

How it works:
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos and your message, pick what falls.
3. Press Send and type your Etsy order number. Your game's link is ready to share.

Add a countdown that opens it on the day, and a surprise at the end. If it doesn't open on their phone, message us and we'll refund you.

### On Repeat · SKU `ethos-on-repeat`

**Title:** Custom Album Cover Gift, Digital Playlist Love Letter with Your Photo and Song, Gift for Girlfriend

**Tags:** custom album cover, album cover art, album cover gift, song gifts, playlist gift, our song, digital love letter, love website, gift for girlfriend, gift for boyfriend, anniversary gift, valentines for her, pink aesthetic

**Occasion:** Anniversary

**Description:**
Your photo as the album cover and their name as the artist: a music player that turns into a sticker collage, with your song and a playlist of your photos.

Under a pink sunset they press play: a gingham bow, flower stickers, a bouquet, a heart paperclip on a note in your handwriting, your song on the big player, and every photo on a playlist with your captions as the song titles, down to your letter. Every tap adds a sticker. 1 to 10 photos; sunset, lilac or night.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

How it works:
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos and captions, your song and your letter.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add a countdown that opens it on the day, and a surprise at the end. If it doesn't open on their phone, message us and we'll refund you.

## Wave 3 listings (live since 28 Oct)

The other 37 templates, built the way waves 1 and 2 were and published on 28 Oct (owner: "yes list all", $7.40).

- **Keywords:** Etsy's search suggestions, 28 Oct. The phrases that carried them: be my boo, love potion, dark romance, spirit board, haunted house, jack o lantern, trick or treat and spooky season (Halloween); fall gift for her; graduation gift / card; new years eve; birthday newspaper; personalized fortune cookies; custom music box; relationship timeline / our story timeline; im sorry gift / apology gift; photo booth strip; date night gift; mom birthday gift; funny cat gift; custom vinyl record; best friend gift; wedding toast / speech.
- **Not used:** "custom star map" (buyers expect the real sky on a date; Constellations is a sky of your photos, and says so), "ouija" (a brand), "haunted mansion" (a Disney ride), and Christmas for Evergreen (it is a sage butterfly collage, nothing about Christmas).
- **Facts:** every description was checked against the template's `schema.ts` and `Template.tsx` by an outside reader before listing; 21 needed fixes (a searched song plays as a 30-second preview, never on Vinyl's record; Front Page has no doormat; the countdown is a timer, the unlock is a schedule; and so on). Descriptions that mention a song say which music plays.
- **The two free templates** (The Letter, Constellations) are sold as their full version: their SKU unlocks "make it special" (`etsyProduct()`), and the description lists what that adds.
- **Copies:** love, Halloween and the rest of XOXO (Love Cards, Occasion Anniversary); birthday ones of the Pop-up Card (Birthday Cards, Occasion Birthday; their quantity came over as 998 and was set back to 999). Love Cards has no Halloween or New Year occasion; Cap Toss has Occasion Graduation and The Toast Wedding. "Show all attributes" in these categories offers only Occasion, Materials, Width, Length, Envelope included and Blank inside: nothing besides Occasion fits a digital gift, so there is no Holiday or Recipient to fill.
- **Photos and videos:** `scripts/etsy-shots.mjs` plays each demo through (wave 3 scripts after On Repeat). Midnight Countdown's demo counts to a birthday, so its capture swaps in New Year words the buyer would type (`WORDS`). Bloom's 3D flower drops frames in software WebGL: its video is recorded with `ETSY_GPU=1`. Every video was checked frame by frame before upload and again as Etsy serves it (`v.etsystatic.com/…/vid_v1.mp4`, 720x1280, read from the editor's `<video><source>`): no grey padding, no zoom flashes, 0–1 repeated frames each; the remaining "flashes" are the gifts' own (lightning, camera flash, stickers landing).
- **In the editor:** a copy, then "Delete all" media and the copied PDF, the five photos and the video in one upload (two when over 10 MB), the PDF, then title, description, SKU, tags and section filled by script. Tags need about half a second each, or Etsy drops one and repeats another.

### Constellations · SKU `ethos-constellations` · listing 4604976457

**Title:** Constellation Gift with Your Photos as Stars, Digital Night Sky Love Letter, Anniversary Gift for Him or Her

**Tags:** constellation gift, constellation, night sky, night sky keepsake, written in the stars, star gifts, galaxy gifts, anniversary gift, gift for boyfriend, gift for girlfriend, long distance gift, digital love letter, valentines gift

**Section:** Anniversary & photos · **Occasion:** Anniversary

**Description:**
A constellation gift they explore with a finger: every star in this night sky is one of your photos, and once they have found them all, the stars join into a heart over your message.

They tap a star and fly to it, and your photo opens with your caption under it. When the last one is found, the lines draw themselves into a heart, an infinity sign or a star, and your last line appears under the sky, which shifts as they tilt the phone. It isn't a chart of the real sky on a date: the stars are your photos. 3 to 12 photos; a midnight, aurora or dawn sky.

This listing is the full version, with every extra: a voice message, up to 12 photos, a surprise wrapped at the end (a date or a trip), a time it unlocks, a password, and no Ethos footer.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos and a caption for each, pick the sky and the shape.
3. Press Send and type your Etsy order number. Your sky's link is ready to share.

Add music and a countdown too. If it doesn't open on their phone, message us and we'll refund you.

### The Letter · SKU `ethos-the-letter` · listing 4604969518

**Title:** Digital Love Letter, Wax Sealed Open When Letter with Your Photos, Love Letter for Boyfriend or Girlfriend

**Tags:** digital love letter, love letter, love letters, open when letter, love letter template, love notes for him, anniversary letters, gift for boyfriend, gift for girlfriend, long distance gift, valentines gift, anniversary gift, im sorry gift

**Section:** Love letters · **Occasion:** Anniversary

**Description:**
A digital love letter sealed with wax: they break the seal, the letter unfolds on a candlelit desk, and your words write themselves in handwriting.

The envelope carries your initial on the seal. One tap and it breaks, the letter slides out, and your words appear letter by letter, as if you were writing them now. Your photos drop in as polaroids with your captions. Cream, white or kraft paper on a walnut, linen or slate desk. For an anniversary, an apology, an open-when letter or a day you're apart.

This listing is the full version, with every extra: a video clip, a voice message, up to 20 photos, a surprise wrapped at the end (a date or a trip), a time it unlocks, a password, and no Ethos footer.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Write your letter, add photos, pick the paper and the desk.
3. Press Send and type your Etsy order number. Your letter's link is ready to share.

Add music and a countdown too. If it doesn't open on their phone, message us and we'll refund you.

### Autumn Reel · SKU `ethos-autumn-reel` · listing 4604974128

**Title:** Fall Gift for Her, Vintage Autumn Photo Collage on Film with Your Song, Fall Anniversary Gift for Girlfriend

**Tags:** fall gift for her, fall gift, autumn gift, fall anniversary, cozy gifts for her, vintage gifts, anniversary gift, gift for girlfriend, gift for boyfriend, digital love letter, love website, digital photo album, our song gift

**Section:** Halloween & fall · **Occasion:** Anniversary

**Description:**
A fall gift for her (or him): a darkroom where your photos develop, then a vintage autumn collage of them on film, with your song and your letter.

Your first three photos hang on the line as negatives under a red light. One tap and the light comes on, the prints develop, and the collage is underneath: your photos on frames of film, a page from an old novel with your two names as its running head, pressed maple leaves, an apple with I LOVE YOU on its skin, two cats cuddling, a line cut word by word from a book, a ticket for two, your song on a little player and your letter at the end. Every tap presses another leaf onto the page. 1 to 10 photos; rust, espresso or olive.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos, your song and your letter. Pick rust, espresso or olive.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

The music: a track from our library, your own audio file, or a 30-second preview of a real song they tap to hear.

### Balloons · SKU `ethos-balloons` · listing 4604981589

**Title:** Birthday Balloons Surprise, Interactive Birthday Card with Your Photos, Digital Birthday Gift for Her or Him

**Tags:** birthday balloons, birthday surprise, interactive birthday, digital birthday, birthday website, birthday for her, birthday for him, best friend gift, digital gift for him, last minute gifts, long distance gift, animated card, birthday card

**Section:** Birthday gifts · **Occasion:** Birthday

**Description:**
A birthday balloons surprise they pop with a finger: the balloons drop your photos one by one, and the biggest one holds your letter.

A ceiling of hand-painted balloons floats in, with their age in gold foil numbers and a bunting line spelling out the day. They pop the balloons one by one: some burst into confetti, the rest drop a polaroid of yours onto the floor. The last balloon, the biggest, holds your letter. 1 to 8 photos; pastel, sunset, jewel, or cream and gold.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add their age, your photos and your letter. Pick the colours.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add music, a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

### Bat Swarm · SKU `ethos-bat-swarm` · listing 4604963109

**Title:** Halloween Card for Boyfriend, Bats Spell Their Name Across the Moon, Digital Halloween Gift with Your Photos

**Tags:** halloween gifts, halloween cards, halloween lover gift, halloween love card, spooky gifts for him, spooky gift for her, bat gifts, spooky season, gift for boyfriend, gift for girlfriend, digital love letter, animated card, interactive card

**Section:** Halloween & fall · **Occasion:** Anniversary

**Description:**
A Halloween card for your boyfriend (or anyone you love): they tap the moon and hundreds of bats pour out and spell their name across it.

A huge moon over a castle on the hill, a few bats circling it. One tap and the swarm pours out of the moon, whirls into a vortex, then flies in to spell their name, a short line of yours and a heart, wings still beating, before bursting away into the night. Underneath: your letter on dark glass, your photos hung in the moonlight and your song. Up to 8 photos; midnight, harvest moon, blood moon or frost.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Type their name and your line, add photos, your song and your letter.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

The music: a track from our library, your own audio file, or a 30-second preview of a real song they tap to hear.

### Be My Boo · SKU `ethos-be-my-boo` · listing 4604954969

**Title:** Be My Boo Halloween Card, Cute Ghost Collage with Your Photos, Halloween Gift for Girlfriend or Boyfriend

**Tags:** be my boo, be my boo card, be my boo halloween, halloween love card, halloween lover gift, cute ghost, cute ghost gift, spooky gift for her, halloween gifts, gift for girlfriend, gift for boyfriend, digital love letter, spooky season

**Section:** Halloween & fall · **Occasion:** Anniversary

**Description:**
A be my boo Halloween card: a little ghost holds a sign with their name, says boo, and flies off to show your photos on a page of watercolour pumpkins.

One tap and the ghost says boo and flies off in a flurry of bats. Underneath: your photos on polaroids down a page printed with pumpkins and ghosts, a black cat stretched along the edge of a photo, swishing its tail, your song on a little player, a note in handwriting and your letter at the end. Every tap on the page sends up a tiny ghost. 1 to 10 photos; pumpkin, pink or midnight.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos, your song, a note and your letter.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

The music: a track from our library, your own audio file, or a 30-second preview of a real song they tap to hear.

### Bloom · SKU `ethos-bloom` · listing 4604977197

**Title:** Digital Flower Gift for Her, a Flower That Opens While They Hold the Screen, Sorry Gift or Mothers Day Gift

**Tags:** digital flowers, flower gift, flowers for her, flower gift for mom, apology gift, apology gift for her, im sorry gift, sorry gifts for him, mothers day gift, valentines for her, digital love letter, gift for girlfriend, thinking of you gift

**Section:** Love letters · **Occasion:** Anniversary

**Description:**
Digital flowers for her: one flower, grown in 3D, that opens petal by petal only while they hold the screen, with your message waiting inside.

Pollen drifts in the light as it opens. When it's fully open your photos float up around it and your message appears. A peony, a tulip or a daisy, in any colour you like, against a dawn, dusk or paper sky. Up to 8 photos. For an apology, Mother's Day, Valentine's, or a day you can't bring real ones.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Pick the flower and its colour, add photos and your message.
3. Press Send and type your Etsy order number. Your flower's link is ready to share.

Add music, a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

### Cap Toss · SKU `ethos-cap-toss` · listing 4604979339

**Title:** Graduation Gift for Her or Him, Interactive Digital Graduation Card with Photos, They Cheer and the Cap Flies

**Tags:** graduation gift, graduation card, grad gift for her, grad gift for him, graduation, graduation keepsake, graduation card son, class of 2027 gifts, congratulations card, gift for graduate, interactive card, digital card, last minute gifts

**Section:** Graduation · **Occasion:** Graduation

**Description:**
A graduation card they open on their phone: they cheer into it and the cap flies up, then a diploma unrolls into your letter.

A mortarboard hovers in a pool of light, a crowd in gowns behind it. They tap the microphone and cheer, shout or whoop, a meter climbs, and the cap launches, spinning through the confetti; the louder, the higher. Or they just press "throw it". Then a rolled diploma drops in, tied with a ribbon: they pull the ribbon and it unrolls into your letter, with their photos taped on like a yearbook. 1 to 10 photos; the year, the school and what it's awarded for are yours to write.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add the year, their school, your photos and your letter.
3. Press Send and type your Etsy order number. Your card's link is ready to share.

Add music, a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

### Witch's Brew · SKU `ethos-cauldron` · listing 4604965501

**Title:** Love Potion Halloween Gift, Witch's Cauldron with Your Photos, Witchy Gift for Her or Him, Digital Halloween Card

**Tags:** love potion, love potion witch, witchy gifts, witchy gifts for her, witch gift, halloween gifts, halloween love card, halloween lover gift, spooky gift for her, spooky gifts for him, gift for girlfriend, gift for boyfriend, digital love letter

**Section:** Halloween & fall · **Occasion:** Anniversary

**Description:**
A love potion for Halloween: they tip up to three jars into a witch's cauldron, each labelled with something you love about them, and it boils over into a heart.

A witch's kitchen at night: a black cat on the windowsill, herbs drying overhead, a cauldron over the fire. Each jar they tap in makes a splash, a new colour, harder bubbling. After the last one the steam coils into a heart and a bottle with their name on the label floats up. One tap and the cork pops, and the page opens on the potion's recipe card, your letter, your photos kept in glass jars and your song. Up to 8 photos; witch green, love pink, midnight blue or pumpkin gold.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Write up to three jar labels and the potion's name, add photos, your song and your letter.
3. Press Send and type your Etsy order number. Your potion's link is ready to share.

Add a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

The music: a track from our library, your own audio file, or a 30-second preview of a real song they tap to hear.

### Dark Romance · SKU `ethos-dark-romance` · listing 4604977780

**Title:** Dark Romance Gift, Gothic Digital Love Letter with Your Photos and Song, Goth Anniversary Gift for Him or Her

**Tags:** dark romance, dark romance gift, gothic gift, gothic gifts for her, gothic gifts for him, spooky anniversary, digital love letter, love letter, anniversary gift, valentines gift, gift for boyfriend, gift for girlfriend, halloween love card

**Section:** Love letters · **Occasion:** Anniversary

**Description:**
A dark romance gift: a black leather diary with their name in gold, locked with a heart, that opens onto a gothic love collage of your photos.

They turn the key, the lock drops and the cover swings open: your photo between dark roses and an anatomical heart, your words in cut-out letters, your song on a little player, your second photo printed on a tarot card, The Lovers, playing cards and a die for the bet you'd make on the two of you, a crow, candles burnt low, and polaroids all the way down to your letter under a wax seal. Every tap leaves a rose. 1 to 10 photos; bordeaux, noir or parchment.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos, your song, your bet and your letter.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

The music: a track from our library, your own audio file, or a 30-second preview of a real song they tap to hear.

### Evergreen · SKU `ethos-evergreen` · listing 4604978746

**Title:** Sage Green Butterfly Gift, Digital Love Letter Collage with Your Photos and Song, Just Because Gift for Her

**Tags:** butterfly gift, sage green, just because gift, just because card, anniversary gift, gift for girlfriend, gift for wife, digital love letter, love letter, love website, digital photo album, our song gift, vintage gifts

**Section:** Anniversary & photos · **Occasion:** Anniversary

**Description:**
A butterfly gift in sage green: a parcel wrapped in old newspaper that they unwrap, and butterflies fly out over a collage of your photos, your song and your letter.

It arrives tied with twine, a tag with their name on it and a butterfly resting on the corner. When the paper falls open, cream butterflies fly out over the collage: your photos on white polaroids, a record labelled with your song and your two names, torn newsprint, green leaves, white flowers, a sage ribbon, your song on a little player and your letter at the end. Every tap lets another butterfly go. 1 to 10 photos; sage, olive or mint.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos, your song and your letter. Pick sage, olive or mint.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

The music: a track from our library, your own audio file, or a 30-second preview of a real song they tap to hear.

### Fall for You · SKU `ethos-fall-for-you` · listing 4604958155

**Title:** Fall for You Cozy Gift for Her, Autumn Gingham Collage with Your Photos and Song, Fall Gift for Girlfriend

**Tags:** fall gift for her, fall gift, autumn gift, cozy gifts for her, cozy gifts, fall anniversary, anniversary gift, gift for girlfriend, gift for wife, digital love letter, love website, thinking of you gift, our song gift

**Section:** Halloween & fall · **Occasion:** Anniversary

**Description:**
A cozy fall gift for her (or him): a jar candle with their name on the label, and when they light it, an autumn collage of your photos on gingham.

One tap lights the candle and the room warms up: your photos on polaroids, their name spelled out in wooden letter blocks, real maple leaves, an acorn, a wooden heart, a patchwork pumpkin, a coffee steaming and a teddy, then your song on a little player, a recipe card for the two of you and your letter at the end. Every tap lets a leaf fall. 1 to 10 photos; gingham, sage or cranberry.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos, the word for the letter blocks, your song and your letter.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

The music: a track from our library, your own audio file, or a 30-second preview of a real song they tap to hear.

### Favorite Person · SKU `ethos-favorite-person` · listing 4604958873

**Title:** Best Friend Gift, Favorite Person Digital Scrapbook with Your Photos, Pink Watercolour Gift for Her

**Tags:** best friend gift, favorite person, bestie gift, bestie birthday gift, gift for girlfriend, gift for sister, digital scrapbook, digital memory book, memory book, anniversary gift, just because gift, digital love letter, pink aesthetic

**Section:** Anniversary & photos · **Occasion:** Anniversary

**Description:**
A best friend gift (or one for your girlfriend): a watercolour scrapbook page of your photos, pearls and pressed flowers, under a sheet of tissue paper with their name on it.

They lift the tissue and underneath: your photos on polaroids held with gingham tape and a gold clip, soft watercolour, baby's breath, cherry blossom, pearls, a satin bow, a torn note that says favorite person, your song on a little player and a bouquet with love you written under it, down to your letter. Every tap doodles a heart. 1 to 10 photos; blush, lilac or peach.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos, your song and your letter.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

The music: a track from our library, your own audio file, or a 30-second preview of a real song they tap to hear.

### Fortune Cookie · SKU `ethos-fortune-cookie` · listing 4605008148

**Title:** Personalized Fortune Cookies with a Custom Message, Digital Fortune Cookie Gift, Funny Gift for Boyfriend

**Tags:** fortune cookie, fortune cookies, fortune cookie gifts, funny gift for him, funny gift for her, funny birthday gift, just because gift, gift for boyfriend, gift for girlfriend, love notes, long distance gift, graduation gift, digital gift for him

**Section:** Funny gifts · **Occasion:** Birthday

**Description:**
Personalized fortune cookies with your own messages: they crack each one open and find a fortune you wrote, silly, sweet or oddly specific.

A plate of fortune cookies. They tap one and it cracks in two; a paper slip slides out with your fortune and their lucky numbers. A slip can carry a photo too, one per fortune. The last cookie holds your message. 3 to 20 fortunes and up to 10 photos, on a red, jade or linen table.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Write your fortunes and lucky numbers, add photos and your message.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add music, a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

### Front Page · SKU `ethos-front-page` · listing 4604982707

**Title:** Birthday Newspaper Personalized, Digital Newspaper Front Page About Them with Your Photos, Birthday Gift for Him

**Tags:** birthday newspaper, custom newspaper, newspaper birthday, newspaper gift, birthday for him, birthday for her, fathers day gift, graduation gift, gift for husband, gift for dad, funny birthday gift, birthday surprise, newspaper wedding

**Section:** Birthday gifts · **Occasion:** Birthday

**Description:**
A personalized birthday newspaper with them on the front page: your headline, their photo and the stories only you could write.

It waits folded on a table beside a coffee and a pair of glasses, their name on the masthead. They tap to open it: your headline and subhead, a lead photo with its caption, your message set as newspaper copy with a drop cap, a weather box ("100% chance of cake", or your own forecast), up to 8 classified ads you write and a horoscope that is suspiciously accurate. 1 to 8 photos; black, navy or sepia ink. For a birthday, a graduation, Father's Day or a wedding.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Write the headline, the stories and the ads, add photos.
3. Press Send and type your Etsy order number. Your paper's link is ready to share.

Add music, a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

### The Garden · SKU `ethos-garden` · listing 4604987604

**Title:** Digital Flower Garden Gift, Interactive Love Letter That Blooms as They Scroll, Gift for Her or Mom

**Tags:** digital flowers, flower gift, flowers for her, flower gift for mom, mothers day gift, digital love letter, love website, anniversary gift, valentines for her, gift for girlfriend, gift for wife, thinking of you gift, long distance gift

**Section:** Love letters · **Occasion:** Anniversary

**Description:**
Digital flowers for her, or for mom: a garden that grows as they scroll, with your photos on a trellis and your letter taped up in the greenhouse.

They push open a gate with their name on it and walk down a page that grows as they go: seedlings drawn in ink, a meadow that opens flower by flower, your photos pinned to a trellis under climbing vines, a greenhouse with your letter taped up inside, and at the end a bouquet of everything they walked past, tied and tagged for them. Wildflowers, roses, peonies or sunflowers, with a butterfly, a bee or a cat for company. 1 to 12 photos and a video clip.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Pick the flowers and the garden's colours, add photos and your letter.
3. Press Send and type your Etsy order number. Your garden's link is ready to share.

Add music, a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

### Haunted House · SKU `ethos-haunted-house` · listing 4604967413

**Title:** Haunted House Halloween Gift, Interactive Halloween Card with Your Photos in the Windows, Spooky Gift for Him

**Tags:** haunted house, halloween house, halloween gifts, halloween cards, halloween lover gift, spooky gifts for him, spooky gift for her, spooky season, halloween love card, gift for boyfriend, gift for girlfriend, interactive card, digital love letter

**Section:** Halloween & fall · **Occasion:** Anniversary

**Description:**
A haunted house for Halloween: they open the gate in a thunderstorm, every lit window holds one of your photos, and the door holds your letter.

A mansion on a hill in the rain: a wind-bent tree, bats, and lightning that lights the whole house for a heartbeat. They tap the gate and walk up the path as the windows light one by one, each with a little silhouette inside. Tap a window and the silhouette steps aside to show your photo in a gilt frame. Then they knock, and the door swings open on a warm glow, your letter and your song. Up to 6 photos; storm blue, blood moon, swamp green or midnight violet.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos, your song and your letter.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

The music: a track from our library, your own audio file, or a 30-second preview of a real song they tap to hear.

### Jack-o'-Lantern · SKU `ethos-jack-o-lantern` · listing 4604968335

**Title:** Jack O Lantern with Their Name, Digital Halloween Card, Pumpkin Carving Gift with Your Photos and Letter

**Tags:** jack o lantern, pumpkin carving, pumpkin gift, pumpkin, halloween gifts, halloween cards, halloween lover gift, halloween love card, spooky gift for her, spooky gifts for him, gift for boyfriend, gift for girlfriend, animated card

**Section:** Halloween & fall · **Occasion:** Anniversary

**Description:**
A jack-o'-lantern carved with their name: they watch the pumpkin get carved piece by piece, then light the candle and the face glows.

A pumpkin on a table in a dark room, and a knife. One tap and it carves itself: the eyes, the nose, the grin, then their name across the belly, each piece dropping onto the table. Then they light the candle and the whole face glows through the cuts, embers rising. Underneath: your letter on old paper, your photos as candlelit polaroids and your song. A name of up to 12 letters, up to 8 photos; orange, ghost white, witch purple or blush pink; a classic grin, heart eyes or a cat.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Type the name to carve, pick the face, add photos and your letter.
3. Press Send and type your Etsy order number. Your pumpkin's link is ready to share.

Add a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

The music: a track from our library, your own audio file, or a 30-second preview of a real song they tap to hear.

### Kawaii · SKU `ethos-kawaii` · listing 4604983533

**Title:** Cute Birthday Card for Her, Kawaii Digital Gift with a Plush Bunny and Your Photos, Cute Gift for Girlfriend

**Tags:** cute birthday card, kawaii gift, kawaii, cute gift for her, cute birthday gifts, birthday for her, gift for girlfriend, best friend gift, pink aesthetic, interactive birthday, digital birthday, valentines for her, animated card

**Section:** Birthday gifts · **Occasion:** Birthday

**Description:**
A cute birthday card for her: a plush bunny, bear or kitten in a bow waves hello, then a gift box pops open with your photos as stickers.

A pastel sticker book of a gift. Hearts and sparkles drift across the screen, the ribboned box pops open with a burst of confetti, and inside are your photos as taped-in stickers, your message on a taped-in note and their song. Up to 8 photos; pink, lavender, mint or cherry.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Pick the plushie and the colour, add photos and your message.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

The music: a track from our library, your own audio file, or a 30-second preview of a real song they tap to hear.

### Keepsake · SKU `ethos-keepsake` · listing 4604959573

**Title:** Anniversary Keepsake Gift, Digital Locket with Your Photo, Pressed Flowers and a Typed Letter, Gift for Her

**Tags:** keepsake gift, keepsake, locket with photo, pressed flowers, anniversary gift, long distance gift, gift for wife, gift for girlfriend, gift for mom, digital love letter, love letter, vintage gifts, memory book

**Section:** Anniversary & photos · **Occasion:** Anniversary

**Description:**
An anniversary keepsake they open like a box of kept things: pressed flowers, a gold locket with your initials that opens on your photo, and a typed letter.

A kraft-paper parcel tied with twine and closed with a wax seal. They break it and scroll through: your first photo on deckle-edged paper under dried flowers, a ticket with your words on it, one word torn out of a book, and the locket, which opens on a tap. The rest of your photos are pressed in like pages, and your letter is typed on aged paper (add a surprise and it comes as a P.S. in its own envelope). 1 to 9 photos; kraft, ivory or dusty rose.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos, the word, the ticket and your letter.
3. Press Send and type your Etsy order number. Your keepsake's link is ready to share.

Add music, a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

### Midnight Countdown · SKU `ethos-midnight-countdown` · listing 4604978235

**Title:** New Years Eve Countdown to Midnight with Fireworks, Digital New Year Card with Your Photos, Long Distance Gift

**Tags:** new years eve, new years, new year card, new years cards, happy new year card, new year countdown, countdown, birthday countdown, long distance gift, new year gifts, gift for boyfriend, gift for girlfriend, digital love letter

**Section:** New Year · **Occasion:** Anniversary

**Description:**
A New Year's Eve countdown to midnight: the sky darkens from dusk to night as it gets close, and at zero fireworks fill the screen and your photos and words open.

A live countdown to the moment you choose, landing at midnight in their time zone: send it before New Year's Eve, or set it for the stroke of midnight on their birthday. Over a city, the sea or the mountains, with the headline and the line at zero written by you ("Happy New Year, Ana."). Then your photos, your song and your message. 1 to 20 photos.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Set the moment, write the line it shows at zero, add photos and your message.
3. Press Send and type your Etsy order number. Your countdown's link is ready to share.

Add music and a surprise at the end. If it doesn't open on their phone, message us and we'll refund you.

The music: a track from our library, your own audio file, or a 30-second preview of a real song they tap to hear.

### Music Box · SKU `ethos-music-box` · listing 4604968985

**Title:** Custom Music Box with Your Photos, Digital Ballerina Music Box That Plays Swan Lake, Anniversary Gift for Her

**Tags:** custom music box, music box, ballerina music box, music box gift, swan lake music box, ballerina gift, anniversary gift, gift for wife, gift for mom, mothers day gift, gift for girlfriend, digital love letter, wedding anniversary

**Section:** Anniversary & photos · **Occasion:** Anniversary

**Description:**
A custom music box with your photos in its mirror: they wind the key, the lid opens, and a ballerina turns to Swan Lake, Brahms' Lullaby or Für Elise.

A lacquered music box on a lace-covered vanity, their name on the gold plate. They wind the key three turns, the ratchet clicking under their thumb, and the lid opens: a porcelain ballerina, or two swans who meet as a heart, turns on the velvet while the box plays, note by note. Your photos come up one at a time in the oval mirror inside the lid. As the spring runs down the tune slows, and a folded letter lifts out of the velvet. 1 to 8 photos; blush, ivory, lilac or sage.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Pick the figurine, the tune and the colour, add photos and your letter.
3. Press Send and type your Etsy order number. Your music box's link is ready to share.

Add a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

### Our Timeline · SKU `ethos-our-timeline` · listing 4604991116

**Title:** Relationship Timeline Gift, Our Story Timeline with Your Photos and Dates, Dating Anniversary Gift for Him or Her

**Tags:** our story timeline, our story, dating anniversary, 1 year anniversary, anniversary gift, first anniversary, anniversary website, digital photo album, memory book, gift for boyfriend, gift for girlfriend, wedding anniversary, long distance gift

**Section:** Anniversary & photos · **Occasion:** Anniversary

**Description:**
A relationship timeline of the two of you: a road that draws itself down the page as they scroll, every milestone pinned with a photo and a date.

From the day you met to now: each stop on the road is a photo with its date and your words, in layers that move as they scroll. It ends on "and it's only the beginning" (or your own last line) with, if you set one, a countdown to whatever comes next. 2 to 20 photos and a video clip; an asphalt, chalk or ink road.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos with their dates, and your last line.
3. Press Send and type your Etsy order number. Your timeline's link is ready to share.

Add music, a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

### Paper Crane · SKU `ethos-paper-crane` · listing 4604970381

**Title:** Im Sorry Gift for Her or Him, Digital Paper Crane Apology Message They Fold Line by Line, Origami Crane Card

**Tags:** im sorry gift, apology gift, apology gift for her, sorry gifts for him, apology card, im sorry card, origami crane, origami crane card, paper crane, paper anniversary, thinking of you gift, long distance gift, digital love letter

**Section:** Love letters · **Occasion:** Anniversary

**Description:**
An I'm sorry gift that takes a little patience: they fold a paper crane crease by crease, and every fold that lands says one more line of what you wanted to say.

A sheet of paper on a quiet table. They press and hold each crease and the paper folds while they hold it; let go early and it springs open. After the last fold it is a crane, and when they blow into the phone it lifts and flies off, leaving your letter where it was. No microphone? There are tap-to-fold and let-it-go buttons. Up to 6 photos. For an apology, a hard week, or someone far away.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Write a line for each fold and your letter, add photos.
3. Press Send and type your Etsy order number. Your crane's link is ready to share.

Add music, a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

### Party Animals · SKU `ethos-party-animals` · listing 4604984551

**Title:** Funny Birthday Card for Him or Her, Interactive Birthday Collage Crashed by Hamsters in Party Hats, Digital Card

**Tags:** funny birthday card, funny birthday gift, cat birthday card, birthday for her, birthday for him, interactive birthday, digital birthday, birthday website, best friend gift, hamster, gift for sister, last minute gifts, animated card

**Section:** Birthday gifts · **Occasion:** Birthday

**Description:**
A funny birthday card they scroll: a birthday collage crashed by hamsters, cats and puppies in party hats, and each one yells a line you wrote when tapped.

An invitation sealed with a hamster in a party hat. They open it and scroll down: their name in cut-out letters, their age in foil balloons, your photos in polaroids and a photo-booth strip, your song, and ten animals in party hats in between, including two ferrets nobody invited. Tap an animal and it jumps, squeaks and yells a line (yours, or ours where you leave one blank); tap anywhere else and confetti pops. Further down, a cake with their age in candles: they tap it, or blow into the phone, to put them out. Your letter is at the bottom. 1 to 7 photos; linen, bubblegum, lime or midnight.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add their age, the animals' lines, your photos and your letter.
3. Press Send and type your Etsy order number. Your card's link is ready to share.

Add a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

The music: a track from our library, your own audio file, or a 30-second preview of a real song they tap to hear.

### Photo Booth · SKU `ethos-photo-booth` · listing 4604971025

**Title:** Photo Booth Strip Gift, Digital Photo Strip of the Two of You, Love Letter for Boyfriend or Girlfriend

**Tags:** photo booth, photo strip, photo booth strip, digital love letter, love letter, gift for boyfriend, gift for girlfriend, anniversary gift, valentines gift, 1 year anniversary, digital photo album, long distance gift, love notes

**Section:** Anniversary & photos · **Occasion:** Anniversary

**Description:**
A photo booth strip of the two of you: they pull the curtain, press the button, four flashes go off, and the strip prints, coming up in colour as they watch.

An old photo booth in red velvet with a sign lit up on top. Three, two, one, flash, four times, each flash freezing one of your photos in the booth's mirror. The machine whirrs and the strip slides out of the slot still grey. They tap it to take it, and it lands on a wall of love letters: your letter on lined paper in handwriting, lipstick kisses, a teddy, envelopes and heart stamps, and a line of yours in pen. 1 to 10 photos; a cherry, blush, black or mint booth, in colour, black and white or sepia.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos, your line and your letter.
3. Press Send and type your Etsy order number. Your strip's link is ready to share.

Add music, a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

### Picnic · SKU `ethos-picnic` · listing 4604971701

**Title:** Date Night Gift, Digital Picnic Basket of Love Notes with Your Photos, Date Reveal for Boyfriend or Girlfriend

**Tags:** date night gift, date night ideas, date ideas, date night, picnic, picnic basket, love notes, love notes for him, gift for boyfriend, gift for girlfriend, anniversary gift, just because gift, digital love letter

**Section:** Surprise reveals · **Occasion:** Anniversary

**Description:**
A date night gift: a picnic basket on a gingham blanket, every thing they take out carries a line from you, and the date you've planned can come out just before your letter.

They tap the basket and the lid creaks open; every tap after that takes one thing out and sets it on the blanket: strawberries, cherries tied with a bow, a bottle of pink lemonade, tulips, a ticket to happiness, your photos in gingham frames. Each carries a tag with your line, and butterflies land on them as they arrive. Planned a date? It comes out of the basket too, and the last thing out is a folded note with your letter. 3 to 8 tags, up to 6 photos; a pink, blue, red or lilac blanket.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Write the tags, add photos, your letter and the date if you've planned one.
3. Press Send and type your Etsy order number. Your picnic's link is ready to share.

Add music, a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

### Recipe Box · SKU `ethos-recipe-box` · listing 4604986141

**Title:** Mom Birthday Gift, Digital Recipe Card for Mom with Your Photos and Letter, Mothers Day Gift from Daughter

**Tags:** mom birthday gift, gift for mom, mothers day gift, mothers day card, mothers day present, recipe card gifts, recipe cards, gift for grandma, mom birthday, gift for wife, long distance gift, thinking of you gift, digital gift for mom

**Section:** Birthday gifts · **Occasion:** Birthday

**Description:**
A mom birthday gift in the shape of a recipe: the recipe for her, written on a card on the kitchen counter one ingredient at a time, two cups of patience, a whole Sunday of her time.

She tilts the phone and the jar tips with it, pouring each ingredient into the bowl, and each one is written on the card as it lands. When the last is in she shakes the phone to stir, and the full recipe card appears, your letter as its method and your photos clipped to it. Pour and stir buttons are there for any phone that can't feel a tilt. 1 to 8 photos. For Mother's Day, her birthday, or a grandmother.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Name the recipe, write the ingredients, add photos and your letter.
3. Press Send and type your Etsy order number. Your recipe's link is ready to share.

Add music, a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

### The Séance · SKU `ethos-seance` · listing 4604972425

**Title:** Spirit Board Halloween Gift, Digital Planchette Spells Out Your Message, Spooky Love Letter for Him or Her

**Tags:** spirit board, spirit boards, planchette, halloween gifts, halloween cards, halloween love card, halloween lover gift, spooky gifts for him, spooky gift for her, spooky season, gift for boyfriend, gift for girlfriend, digital love letter

**Section:** Halloween & fall · **Occasion:** Anniversary

**Description:**
A spirit board message for Halloween: they touch the planchette and it glides from letter to letter by itself, spelling out the words you chose.

A candlelit table at midnight, the board between two candles. Each letter glows as the planchette passes. Then it says goodbye and the candles go out, and in the dark your letter is written on old paper, your photos develop out of the mist as spirit photographs, and your song plays. Up to 22 letters on the board, up to 8 photos; candle, moonlight, blood moon or graveyard green.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Type the words it spells, add photos, your song and your letter.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

The music: a track from our library, your own audio file, or a 30-second preview of a real song they tap to hear.

### Sketchbook · SKU `ethos-sketchbook` · listing 4604985399

**Title:** Birthday Card for Her or Him, Doodle Sketchbook That Draws Itself Around Your Photos, Hand Drawn Digital Card

**Tags:** birthday card, birthday for her, birthday for him, doodle gifts, doodle art, sketchbook, interactive birthday, digital birthday, cute birthday card, best friend gift, gift for girlfriend, last minute gifts, animated card

**Section:** Birthday gifts · **Occasion:** Birthday

**Description:**
A birthday card that draws itself: a coil-bound sketchbook with their name on the cover, and every page doodles itself in ink as they turn to it.

A cake with candles, their age circled twice, a party hat, presents, arrows and hearts, with watercolour bleeding in behind the lines. Your photos are taped in between the doodles with notes in handwriting, and the last page is your letter. Up to 12 photos; white paper, kraft, or black paper with a white pen.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add their name and age, your photos and notes, and your letter.
3. Press Send and type your Etsy order number. Your sketchbook's link is ready to share.

Add music, a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

### Spooky Season · SKU `ethos-spooky-season` · listing 4604960217

**Title:** Spooky Season Gift for Her, Cozy Halloween Scrapbook with Your Photos and Song, Halloween Gift for Girlfriend

**Tags:** spooky season, spooky gift for her, spooky gifts for him, spooky gift, halloween gifts, halloween love card, halloween lover gift, black cat gift, digital scrapbook, gift for girlfriend, gift for boyfriend, digital love letter, cozy gifts for her

**Section:** Halloween & fall · **Occasion:** Anniversary

**Description:**
A spooky season gift: a heap of autumn leaves with their name on a kraft tag, and one tap blows them away to show a cozy Halloween scrapbook of your photos.

Underneath: your photo on a frame of film under the moon, a black cat, a ticket for two to the haunted house, your song on a little player, a postcard in handwriting, a film strip of three more photos and polaroids all the way down to your letter. 1 to 10 photos; pumpkin patch, midnight or cozy kraft.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos, your song, the ticket and your letter.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

The music: a track from our library, your own audio file, or a 30-second preview of a real song they tap to hear.

### Sticker Bomb · SKU `ethos-sticker-bomb` · listing 4604987773

**Title:** Funny Gift for Boyfriend, Digital Meme Sticker Card Where Every Tap Slaps a Sticker, Funny Birthday Card

**Tags:** funny gift for him, funny gift for her, funny birthday card, funny birthday gift, meme gifts, cat meme, funny cat gift, im sorry gift, just because gift, best friend gift, gift for boyfriend, gift for girlfriend, interactive card

**Section:** Funny gifts · **Occasion:** Birthday

**Description:**
A funny gift made of meme stickers: every tap slaps one down exactly where their finger lands, and twelve taps in, your card is waiting.

A blank cutting mat and one instruction: tap anywhere. A cat in a shark hat, a hamster with cake, your own photos as polaroids, some with a label-maker strip saying whatever you wrote ("certified menace"). Twelve stickers in, the page is a mess, the confetti goes, and a "read the card" button opens your card. Up to 6 photos; cats, party animals, the soft ones with bows, or all of it at once.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Pick the sticker pack, add photos, the labels and your card.
3. Press Send and type your Etsy order number. Your card's link is ready to share.

Add music, a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

### Text Thread · SKU `ethos-text-thread` · listing 4604973173

**Title:** Long Distance Gift, Text Message Love Story That Arrives Bubble by Bubble, Digital Love Letter for Boyfriend

**Tags:** long distance gift, long distance love, text messages, miss you gift, miss you card, thinking of you gift, im sorry gift, digital love letter, love letter, gift for boyfriend, gift for girlfriend, anniversary gift, funny birthday card

**Section:** Long distance · **Occasion:** Anniversary

**Description:**
A long distance gift written as a text thread: your messages arrive one bubble at a time, typing dots and all, ending on the one you'd never send by text.

You write the chat; they watch it come in, little pops, the pauses while you're typing, and your photos landing as attachments wherever you type [photo]. 2 to 40 messages and up to 12 photos; ink, blue, green or coral bubbles.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Write the messages, add photos and type [photo] where each should land.
3. Press Send and type your Etsy order number. Your thread's link is ready to share.

Add music, a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

### The Council · SKU `ethos-the-council` · listing 4604995276

**Title:** Funny Cat Gift, a Council of Cats Reviews the Evidence and Stamps a Verdict, Funny Anniversary or Birthday Card

**Tags:** funny cat gift, cat lover gift, cat gift, cat gifts for her, cat birthday card, funny anniversary, funny birthday card, funny gift for him, funny gift for her, gift for boyfriend, gift for girlfriend, cat lover, interactive card

**Section:** Funny gifts · **Occasion:** Anniversary

**Description:**
A funny cat gift: a council of five cats hears the case for (or against) them, reads out the evidence you wrote, and stamps a verdict.

The chair with the paperwork, the prosecution, security in a shark hat, a witness already in tears. They call the hearing to order, each cat reads out one of your findings ("said five minutes away, from bed"), the gavel comes down three times, and the ruling arrives with a rubber stamp: guilty, approved, certified or pardoned. Your photos go in as exhibits, and the full ruling is your letter. Up to 6 findings and 6 photos.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Write the charge and the findings, pick the verdict, add photos and your letter.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add music, a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

### The Toast · SKU `ethos-the-toast` · listing 4604980435

**Title:** Digital Wedding Toast with Your Speech and Photos, Champagne Glasses That Clink, Wedding Gift for the Couple

**Tags:** wedding toast, wedding speech, wedding speech gift, wedding card, wedding gift, engagement gift, engagement card, wedding anniversary, anniversary gift, gift for husband, gift for wife, valentines gift, champagne

**Section:** Wedding · **Occasion:** Wedding

**Description:**
A wedding toast in their pocket: they tilt the phone to pour, knock it to clink the glasses, and your speech begins.

Two glasses on cream linen, a candle and a menu card standing between them. They tilt and the bottle tips with it, filling both glasses (overfill and it goes over the side, which is funnier). One knock, the way you touch two glasses, and gold rings ring out across the screen while your first photos rise in the bubbles. The menu card opens into your speech. No tilt sensor? Pour and clink buttons do the same. 1 to 8 photos. For a wedding, an engagement or an anniversary.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Write your speech, the venue and the date line, add photos.
3. Press Send and type your Etsy order number. Your toast's link is ready to share.

Add music, a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

### Trick or Treat · SKU `ethos-trick-or-treat` · listing 4604996120

**Title:** Trick or Treat Halloween Card, Digital Halloween Gift with a Little Ghost and Your Photos, Halloween for Her

**Tags:** trick or treat, halloween gifts, halloween cards, halloween love card, halloween lover gift, cute ghost gift, spooky gift for her, spooky gifts for him, spooky season, gift for girlfriend, gift for boyfriend, interactive card, animated card

**Section:** Halloween & fall · **Occasion:** Anniversary

**Description:**
A trick or treat Halloween card: they ring the bell of a moonlit porch, choose trick or treat, and a little ghost opens the door on your photos.

Bats cross the sky and a jack-o'-lantern waits by the door. Treat lights the pumpkin and rains sweets; trick earns a boo first, then the treat anyway. Inside: your words on a scroll, your photos in haunted frames and their song, with a little ghost, cat or pumpkin keeping them company. Up to 8 photos; midnight, pumpkin, witch or candy.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Pick the host, add photos, your words and their song.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.

The music: a track from our library, your own audio file, or a 30-second preview of a real song they tap to hear.

### Vinyl · SKU `ethos-vinyl` · listing 4604996914

**Title:** Custom Vinyl Record Gift, Our Song Digital Love Letter, Song Gift for Boyfriend or Girlfriend with Photos

**Tags:** custom vinyl record, record gift, song gifts, our song, our song gift, music gifts for him, music gift, vinyl records, anniversary gift, gift for boyfriend, gift for girlfriend, digital love letter, valentines gift

**Section:** Love letters · **Occasion:** Anniversary

**Description:**
A custom vinyl record gift: they drop the needle, the record spins, and your photos sit in a crate as album covers.

A turntable, with the album name and artist you make up on the label. The record turns while the music plays: a track from our library, or your song as an audio file you upload. (A song you search for by name plays as a 30-second preview at the end instead.) They flip through your photos in the crate like records, and your message is printed on the liner notes. 1 to 12 photos; a black, cream or burgundy sleeve.

★ HOW TO GET YOUR GIFT ★
After you buy, go to tryethos.io/etsy and type your Etsy order number. Your gift opens right away on your phone. No download.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

HOW IT WORKS
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your song, your photos and the liner notes.
3. Press Send and type your Etsy order number. Your record's link is ready to share.

Add a countdown to a day that matters and a surprise at the end, or lock it until the moment you choose. If it doesn't open on their phone, message us and we'll refund you.
