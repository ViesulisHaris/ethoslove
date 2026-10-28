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
  - six sections: Birthday gifts 4, Love letters 5, Long distance 3, Anniversary & photos 2, Surprise reveals 2, Christmas 1;
  - four featured listings: Pop-up Card, XOXO, Jar of Reasons, Halfway;
  - five FAQs: getting the gift, the order number, no Canva, if it doesn't open, how long it lasts.
- **Policies:**
  - Returns: Etsy's fixed digital-item policy.
  - Privacy: a GDPR policy naming SIA "MIGLAI" as controller, consistent with the site's.
  - EU right of withdrawal: 14 days, with the model form. It is stated rather than waived because Etsy's checkout doesn't ask the buyer to give it up for the gift; unstated, the law stretches it to 12 months.
  - The EU ODR link is left off: that platform closed in 2025.
  - Etsy's advisor lists nothing left to do; only a seller photo is missing.
- **EU seller status: Trader** (set 28 Oct, owner's OK). Buyers see it under "View shop registration details", with SIA MIGLAI's registration and VAT numbers, address and support email from `src/content/legal.ts`. There is no phone number: add one under Other details if the company gets one.
- **17 listings live since 28 Oct:** the first 8, and 9 more (wave 2). Publishing cost $3.40; each renews itself every four months for $0.20.
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

**Left:** a real test order bought by someone else, sent as a gift on the site, then refunded on Etsy. By
the next morning the daily check takes the template back.

**Where buyers are told about tryethos.io/etsy (28 Oct):** step 1 of every listing's "How it works", the shop announcement, the first FAQ, "Message to buyers" on every receipt and "Message to buyers for digital items" on the Downloads page (Shop Manager → Settings → Info & Appearance). Etsy's own emails can't be edited, and its guest email shows neither message.

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

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

How it works:
1. After you buy, go to tryethos.io/etsy and type your Etsy order number (it's in Etsy's email, after "Order #"). No download needed.
2. Add your photos and captions, your song and your letter.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add a countdown that opens it on the day, and a surprise at the end. If it doesn't open on their phone, message us and we'll refund you.
