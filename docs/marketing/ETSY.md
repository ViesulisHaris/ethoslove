# Selling on Etsy

Etsy is plan B for when paid ads don't pay: buyers there already search for digital love letters,
interactive birthday gifts and long-distance gifts, and the shop only pays a commission on a sale.
On 27 Oct 2026 the top results for those searches were Canva templates the buyer still has to edit
(€2–10), a ready-made interactive gift is the gap.

## How an Etsy sale works

1. The buyer pays on Etsy. Etsy charges the price and, for EU and UK buyers, the VAT on digital items.
2. Etsy hands them the listing's download at once: a one-page PDF with a link (and QR code) to
   `tryethos.io/etsy/<slug>`.
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

## Where it stands (27 Oct 2026)

- **Shop open:** TryEthos (tryethos.etsy.com). English, Latvia, EUR; Migla as an incorporated business; Etsy Plus declined.
- **Shop basics:** logo, tagline and About are filled in. The banner is in `etsy/photos/shop-banner.jpg`, not uploaded.
- **8 listings saved as drafts, not published:**
  - each has 5 photos (Museum has 4), a 15 s video, its PDF and its SKU;
  - all 13 tags, €10.99, quantity 999;
  - "made by me", "created by me".
- **The Etsy app "ethos":** registered, waiting for Etsy's personal approval. Its callback URL can only be added once it's approved.

**Left before publishing:**
1. App approved, then add the callback URL.
2. Keys in Vercel.
3. Migration 0018.
4. The connect link.
5. A real test order bought by someone else, then refunded.
6. Publish the 8 drafts ($0.20 each).

Photos: `docs/marketing/etsy/photos/<slug>/`, made by `scripts/etsy-shots.mjs`, then `etsy-photos.mjs` and `etsy-brand.mjs`.

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
   "Etsy is connected". If Etsy ever stops answering (a revoked app, 90 days unused), do this again.
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

- Words buyers type, exactly: "digital love letter", "virtual bouquet", "digital pop up card",
  "interactive birthday gift". Never another brand's name.
- Say what Canva templates can't: **no Canva, no app, made on your phone in minutes, opens as a real
  interactive gift**. It's why someone who clicks buys, and buying is what ranks.
- Etsy Ads at $1–3 a day for the first weeks bring the first orders and reviews.
- Add the Spanish texts as Etsy translations: own translations beat Etsy's.
- Valentine's Day is the niche's biggest week; listings need orders and reviews before January.
- Never buy from the shop ourselves, ask friends to, or offer anything for a review: Etsy closes
  shops for it.

## The listings

Each title is short and starts with what buyers search. Tags are at most 20 characters.

### Pop-up Card · SKU `ethos-popup-card`

**Title:** Digital Pop Up Birthday Card, Interactive Birthday Gift for Her or Him, Blow Out the Candles

**Tags:** digital pop up card, interactive card, birthday ecard, digital birthday, pop up birthday, virtual cake, birthday for her, birthday for him, long distance gift, last minute gift, ecard with photos, animated card, no canva needed

**Description:**
A birthday card they open on their phone, like a real pop-up card. A three-tier paper cake rises out
of the fold with their age on the topper, balloons and bunting stand up behind it, and a little
present waits at the front. They tap the candles to light them, make a wish, and blow into the phone
(or swipe) to put them out. Inside: your letter in handwriting and up to 8 of your photos on pegs.

No Canva, no app. You make it in your phone's browser in a few minutes, then send them a link.

How it works:
1. After you buy, download the PDF and open its link.
2. Add their name, your photos and your words. Pick a colour: vanilla, midnight, kraft or cherry.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

Add music, a countdown that opens it on their birthday, and a surprise at the end. If it doesn't open
on their phone, message us and we'll refund you.

### Bouquet · SKU `ethos-bouquet`

**Title:** Virtual Bouquet Gift, Digital Flowers for Her, Interactive Bouquet with Your Message

**Tags:** virtual bouquet, digital flowers, virtual flowers, flowers for her, digital bouquet, long distance gift, anniversary gift, valentines for her, mothers day ecard, flower ecard, gift for girlfriend, last minute gift, no canva needed

**Description:**
Flowers that never wilt. You build the bouquet stem by stem: roses, peonies, tulips, sunflowers and
more, in the colours you choose, wrapped in paper and tied with a ribbon. They watch it come together
one flower at a time, then open the little card inside to find your message. Add up to 6 photos.

No Canva, no app: you make it on your phone in a few minutes and send them a link.

How it works:
1. After you buy, download the PDF and open its link.
2. Pick the flowers and colours, write your card, add photos.
3. Press Send and type your Etsy order number. Your bouquet's link is ready to share.

For Valentine's Day, anniversaries, Mother's Day, birthdays, or any day you're far apart.

### XOXO · SKU `ethos-xoxo`

**Title:** Digital Love Letter for Boyfriend or Girlfriend, Interactive Valentine with Your Photos

**Tags:** digital love letter, love letter, interactive letter, valentines gift, gift for boyfriend, gift for girlfriend, anniversary gift, long distance gift, romantic ecard, love note, polaroid gift, just because gift, no canva needed

**Description:**
An envelope sealed with a lipstick kiss. They open it and scroll a collage in red: your photos as
polaroids on a lace doily, cut-out letters spelling what you call them, ribbon bows, fingerprint
hearts, and a card with the lines you'd underline. Wherever they tap, a kiss lands. Your letter waits
at the bottom, with one last kiss by your name. 1 to 9 photos. Cream, noir or blush.

No Canva, no app: you make it on your phone in a few minutes and send them a link.

How it works:
1. After you buy, download the PDF and open its link.
2. Add your photos, your words and what you call them.
3. Press Send and type your Etsy order number. Your letter's link is ready to share.

### Birthday Cinema · SKU `ethos-birthday-cinema`

**Title:** Interactive Birthday Gift, Cinema Style Digital Birthday Card with Photos and Video

**Tags:** birthday ecard, digital birthday, interactive birthday, birthday for him, birthday for her, birthday video, photo slideshow, virtual birthday, movie birthday, long distance gift, last minute gift, birthday surprise, no canva needed

**Description:**
Red curtains part on a marquee with their name in lights. A cake with flickering candles waits: they
blow into the phone (or swipe) to put them out, confetti fires, and a film strip of your photos rolls.
Up to 20 photos and a video clip, with music.

No Canva, no app: you make it on your phone in a few minutes and send them a link.

How it works:
1. After you buy, download the PDF and open its link.
2. Add their name, photos, a video and your message.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

### Coquette · SKU `ethos-coquette`

**Title:** Coquette Digital Gift for Girlfriend, Pink Gingham Love Letter with Your Song and Photos

**Tags:** coquette gift, pink aesthetic gift, digital love letter, gift for girlfriend, anniversary gift, valentines for her, bow aesthetic, scrapbook gift, long distance gift, polaroid gift, birthday for her, romantic ecard, no canva needed

**Description:**
They untie a satin bow and a collage unrolls: a polaroid of the two of you between lilies and
blossom, a ticket to happiness, your song on a little player that really pauses, a postcard in your
handwriting, a gingham photo strip, and more polaroids all the way down. Your letter waits at the
bottom. 1 to 10 photos. Blush, or something blue.

No Canva, no app: you make it on your phone in a few minutes and send them a link.

How it works:
1. After you buy, download the PDF and open its link.
2. Add your photos, your song and your letter.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

### Digicam · SKU `ethos-digicam`

**Title:** Digital Camera Photo Gift, Y2K Birthday Gift with Your Photos, Interactive Ecard

**Tags:** y2k gift, digicam aesthetic, photo gift, birthday ecard, digital camera, gift for best friend, birthday for her, photo strip, memory gift, interactive card, anniversary gift, just because gift, no canva needed

**Description:**
A pocket camera from 2006 on a collage of tulips, stars and a disco ball. They press power, the lens
whirs out and your photos are on the camera roll, each with the orange date in the corner and your
caption in pixel type. Every press of the shutter takes the next one with a flash. After the last,
it prints the whole roll as a strip, and your letter comes out on a printed card. 1 to 12 photos.

No Canva, no app: you make it on your phone in a few minutes and send them a link.

How it works:
1. After you buy, download the PDF and open its link.
2. Add your photos, captions and letter. Pick baby pink, silver, lilac or black.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

### Scrapbook · SKU `ethos-scrapbook`

**Title:** Digital Scrapbook Gift for Boyfriend or Girlfriend, Interactive Photo Memory Book

**Tags:** digital scrapbook, scrapbook gift, photo memory book, anniversary gift, gift for boyfriend, gift for girlfriend, long distance gift, polaroid gift, our story gift, birthday gift, just because gift, interactive letter, no canva needed

**Description:**
A scrapbook they open like a real one. Your photos land on the pages as polaroids that develop, a
photo-booth strip, a stamp and a roll of film, taped and pinned between flowers. A torn note in
handwriting, a typed letter from you, their song playing, and a bouquet at the end. Up to 12 photos.

No Canva, no app: you make it on your phone in a few minutes and send them a link.

How it works:
1. After you buy, download the PDF and open its link.
2. Add your photos, notes and letter. Pick Blossom, Favorite person, Seaside, Sunshine or Memories.
3. Press Send and type your Etsy order number. Your gift's link is ready to share.

### Museum · SKU `ethos-museum`

**Title:** Anniversary Gift, Digital Photo Gallery of Your Relationship, Interactive Museum

**Tags:** anniversary gift, photo gallery gift, our story gift, gift for husband, gift for wife, relationship gift, memory gift, wedding anniversary, long distance gift, gift for parents, digital gift, interactive gift, no canva needed

**Description:**
A quiet gallery of the two of you. Each photo hangs framed on a wall with a plaque underneath: a
title, a year, a line. They walk from room to room as they swipe, and the last room is a wall text
with your message. 2 to 20 photos, a video clip and music.

No Canva, no app: you make it on your phone in a few minutes and send them a link.

How it works:
1. After you buy, download the PDF and open its link.
2. Add your photos, their plaques and your message.
3. Press Send and type your Etsy order number. Your gallery's link is ready to share.
