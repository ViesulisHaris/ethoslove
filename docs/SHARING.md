# Sharing a plan, a place, a trip or a gift

When a link is pasted into Messages, WhatsApp, Instagram, Telegram, Slack and the rest, the chat
draws a preview from the page's `og:image` / `twitter:image`. The owner's rule for every preview:
**it shows the actual photograph of the place**, or people won't want it. Never a generic
illustration or a stock picture standing in for the place.

The website and the iPhone app build the same links (this document is the contract); the website
renders whatever preview the app's link asks for.

## The links

### A plan

```
https://tryethos.io/plan?c=<cover>&t=<title>&d=<YYYY-MM-DD>#p=<encoded plan>
https://tryethos.io/es/plan?…            (Spanish)
```

- `#p=` is the plan itself, exactly as before (`encodePlan` in `src/lib/dates/plan.ts`: base64url of
  the JSON). It is after the `#`, which browsers never send to a server; that promise stays.
- `c`, `t`, `d` are **only for the preview**. They are read for nothing else, and the page does not
  change because of them.
  - `c`: the cover photo, the first stop (in the plan's order) that has a real photograph. Left
    out when no stop has one; the preview is then the site's own card with the title on it.
  - `t`: the title, at most 80 characters. The website uses the idea's name when the plan came from
    an idea ("Golden hour picnic"), otherwise the named stops joined with " · ". Public place names
    only: who it is for, who from, notes and times stay inside `#p=`.
  - `d`: the day, `YYYY-MM-DD`, optional.
- Parameters in that order; any can be absent. Old links (`/plan#p=…`) keep working unchanged.

### A place

```
https://tryethos.io/dates?lat=<lat>&lng=<lng>&q=<town>&place=<place id>&c=<cover>&t=<place name>
https://tryethos.io/es/dates?…           (Spanish)
```

- `lat`, `lng`: the place's own coordinates (the website rounds to 5 decimals).
- `q`: the town the search was named after ("London"); left out when there is none to name (a
  "near me" search).
- `place`: the map's id for it, `node/123`, `way/123` or `relation/123` (encoded `node%2F123`).
- `c`: the place's real photograph, when it has one. `t`: its name, at most 80 characters.
- Opening it shows the Dates page around that point, and opens that place's sheet once the search
  there has found it. A place that isn't in the results (or an id that isn't one) opens nothing and
  breaks nothing; searching somewhere else forgets it.
- Old links (`/dates?lat=…&lng=…&q=…`) keep working unchanged.

### Values

- Every value is percent-encoded as `encodeURIComponent` does it: a space is `%20`, a `+` is `%2B`,
  `/` in a place id is `%2F`. (A bare `+` reads as a space; Swift's `URLComponents` leaves `+` alone,
  so the app encodes it by hand.)
- `c` is **always a Wikimedia thumbnail**: `https://upload.wikimedia.org/…` or
  `https://thumb.wikimedia.org/…`, the site's only photo sources (`isWikimedia` in
  `src/lib/dates/photos.ts`). Ask for the 1280-pixel thumbnail (`photoAt(photo, 600)`) and drop the
  `?utm_…` query Commons adds. Anything else in `c` is ignored: the preview is drawn without it.
- `t` is cleaned the same way on both sides: one line, no control or bidi characters, no web
  address, cut to 80 characters with an ellipsis.

### Trips and gifts

They keep their own URLs: `/trips/<id>` and `/g/<id>`.

- A trip's preview is its hero picture with its title (`/og/share.jpg?k=trip&trip=<id>`), drawn
  from `public/trips/<id>.webp`. Note: those heroes are generated pictures in the site's art
  direction (docs/TRIPS.md), not photographs of the town.
- A gift's preview is its own card, `/g/<id>/card.jpg` (the invitation with their name on it,
  2400×1256), unchanged. It never shows what is inside the gift.

## The preview picture: `/og/share.jpg`

`src/app/og/share.jpg/route.tsx`, 1200×630 JPEG, usually 100 to 160 KB (WhatsApp drops previews
over about 300 KB).

- The query is the whole card: `k` (`plan`, `place` or `trip`), `l` (`en`/`es`), `c`, `t`, `d`,
  `trip`, and `v` (bumped when the drawing changes). The pages build it with `shareCardPath`
  (`src/lib/share/links.ts`), and the route reads it back through the same checks.
- The photograph is fetched **by our server from Wikimedia's two image hosts only**
  (`fetchCover`, `src/lib/share/cover.ts`): https, no port, no credentials, no redirects, a
  5-second deadline and a 6 MB cap, and only `image/jpeg|png|webp|gif`. A `c` anywhere else never
  reaches `fetch`, so the route cannot be used to fetch other URLs.
- It fills the card, cropped towards what draws the eye (sharp's attention strategy), shaded top
  and bottom, with the seal and wordmark small at the top, then the kind ("A DATE PLAN · SATURDAY
  3 OCTOBER", "A PLACE FOR A DATE", "A TRIP FOR TWO · 3 DAYS"), the title large, and the credit the
  photo's licence asks for ("Photo: Colin Smith · CC BY-SA 2.0 · Wikimedia Commons", read from the
  file's page on Commons or the English/Spanish Wikipedia, 2.5-second deadline).
- No `c`, or a photo that can't be had: the site's cream card with the title, never a picture of
  something else.
- Cache: a drawn card is `public, max-age=604800, s-maxage=31536000, immutable` (the query decides
  the image). A card drawn without its photograph because Wikimedia was slow or down is kept for
  five minutes only, so the next crawler gets the photograph.
- A generous per-address limit (120 fetching cards a minute) answers 429 past it; the CDN answers
  repeat requests, so a crawler never gets near it.
- `next.config.ts` traces `public/trips/*.webp` into this route (`outputFileTracingIncludes`),
  since `public/` is otherwise only on the CDN.

## The pages

- `/plan` and `/dates` read `c`, `t`, `d` in `generateMetadata` only (`withSharePreview` in
  `src/lib/seo.ts`): `og:image`, `og:title`, `og:description`, `og:url` and the twitter card. The
  document title, canonical and robots are unchanged. `og:url` keeps the preview query, or Facebook
  (which follows it) would fetch the bare page and show its default card.
- Reading the query makes these two pages render per request, as the homepage already does.
- Link-preview fetchers that stop at `</head>` get the metadata in the head rather than streamed:
  `htmlLimitedBots` in `next.config.ts` is Next's own list plus TelegramBot, Viber, Snapchat,
  Pinterest, Mastodon, Bluesky, Embedly, Iframely and Signal. (Apple's Messages fetches as
  `facebookexternalhit… Twitterbot`, which is on Next's list.)

## Where it is built on the website

- A plan: "Send it to them" on `/plan` (`src/components/dates/plan-view.tsx`). The cover is looked
  up while the plan is on the screen (`firstCover`, `src/components/dates/share-cover.ts`, through
  the same photo store as the Dates list), because the share sheet has to open within the tap.
  Keeping a plan from a link drops `c`, `t` and `d` from the address with the `#p=`.
- A place: the Share button in its sheet (`src/components/dates/place-sheet.tsx`), with the photo
  the sheet is showing.

## In the app

The same links. For the preview's photo: the place's real Wikimedia photo, or for a plan the first
stop that has one; when there is none, leave `c` out and the website draws its own card. Inside the
app's own share images the last resort is a real map of the actual spot (MKMapSnapshotter), never
an illustration.

## Tests

- `tests/unit/share-links.test.ts`: building and reading both links, titles, the allowlist
  (addresses that only look like Wikimedia's are refused, and never reach `fetch`), the size and
  type checks, the credit lookup.
- `tests/e2e/share-previews.spec.ts`: the tags a crawler sees on a shared plan, a shared place, an
  old link, a foreign `c`, and a trip; the card route's answers.
- `tests/e2e/dates.spec.ts` ("shared links"): a place's link opens its sheet (and a missing one
  doesn't); the Share buttons of a place and of a plan produce these links.
