# Dates, plans, long distance, games

What was added on top of the gifts product, how it gets its data without a single API key, and
what to swap when it outgrows that. Everything here is in this repository (`reasj2/ethoswebsite`);
the gifts site in production is `reasj2/ethoslove`, which this one pulls from and never pushes to.

## The rooms

| Route | What it is |
|---|---|
| `/` | The front door: one question (where are you two?) and the four rooms. |
| `/dates` | Where, when, ideas, a map. The main new thing. |
| `/plan` | The date being planned: editable when it is theirs, read-only when it came in a link. |
| `/gifts` | What used to be the homepage, unchanged. `/templates`, `/occasions`, `/pricing` are as they were. |
| `/trips` | Twelve ready-made trips for two and a flight search that only builds links. See [TRIPS.md](TRIPS.md). |
| `/long-distance` | Meet in the middle (with flight links from each of you to halfway), clocks, dates for two screens, gifts for the distance. |
| `/games` | Seven card games for two, on the table: pick one and play. |

## How a date is made

An **idea** (`src/lib/dates/ideas.ts`) is a small recipe: one to three stops, each a list of the kinds
of place that would do, plus a twist, a time of day, a budget, and whether rain spoils it. Picking
one fills every stop with a real place near the search (`fillStops`), preferring the kind the idea
was written for and places within a walk of the stop before; "Another" takes the next candidate.
Stop times come from `timing.ts`, and the ones about light hang off the actual sunrise or sunset of
the day they picked. The forecast hides ideas rain would ruin and leads with the indoor ones.

## Where the data comes from (no keys, no quotas of ours)

| Need | Source | How |
|---|---|---|
| Base map | [OpenFreeMap](https://openfreemap.org) vector tiles, "positron" style | Fetched by the browser; repainted to the site's palette in `map-style.ts` before the first frame. |
| Places | **The same vector tiles** (`poi` layer, zoom 14) | `/api/dates/search` reads the tiles server-side (`tile-source.ts`, `tiles.ts`). Fast (a CDN), complete (a central London search finds ~3,600 date-worthy places) and unlimited. Tiles carry a name and a kind and nothing else. |
| Rare kinds (bowling, arcades, climbing, karaoke, boats, spas, wineries, planetarium, beaches) | [Overpass](https://overpass-api.de) | `/api/dates/rare`, one small bounding-box query over 8 km, hedged across three public servers, cached a week. **These servers are often busy**; the page never waits for them and works without them. |
| A place's address, hours, website, phone | [Nominatim](https://nominatim.org) lookup, Overpass as fallback | `/api/dates/place`, only when somebody opens a place; cached a month. |
| Forecast, sunset, time zone | [Open-Meteo](https://open-meteo.com) | `/api/dates/weather`; sixteen days ahead. |
| Town search | [Photon](https://photon.komoot.io) | The existing `/api/places`. |
| Roughly where a visitor is | Vercel's geo headers | `/api/dates/here`; city-level, not stored. Locally there are none, and the page asks. |

Licences: OpenStreetMap data is ODbL and must be credited, which the map's attribution control and
the line under the place list both do. MapLibre GL is BSD-3.

| A real photograph of a place | [Wikimedia Commons](https://commons.wikimedia.org) and Wikidata | `/api/dates/photo`, asked only for cards somebody scrolls to (three at a time) and when a place is opened: the picture its Wikidata item names, else a geotagged Commons photo within 250 m whose file name carries the place's name. Author and licence travel with it and are shown. `/api/dates/photos` matches a neighbourhood's Wikipedia articles to places by name in one request. Cached a month. |

### Pictures, and which ones are real

Two kinds, never confused. **Illustrations** (`public/dates`, mapped in `art.ts`): one per idea, one
per kind of place, a hero per room, all made for the site in one style, with nobody's face and
nothing that reads as a real venue. They illustrate *ideas* and *kinds*. **Photographs** of actual
places come only from Wikimedia, with credit. A place nobody has photographed gets its kind's tile
washed in the group colour with a glyph on it, which reads as "a café", never as "this café".
Wikipedia also remembers buildings demolished in 1829, so its articles are only ever used to
illustrate places the map says exist today, never added as places themselves.

### What this data cannot do

OpenStreetMap has **no ratings and no reviews** (and no photos of its own: see above for where those come from, which is generous in big cities and thin in small towns), opening hours for about a third of
places and a website for about a quarter. The site is designed round that rather than hiding it:
places are ordered by how near and how unusual they are (never shown as a score), hours are read
for the chosen day and an unknown is called an unknown (`hours.ts` refuses to guess at the hard
parts of the grammar), and every place has a "Photos & reviews" link out to a web search.

### When it outgrows this

- **Ratings, booking, photos everywhere**: affiliate partner feeds first (they pay us and bring photos and ratings: see MONETIZATION.md), or Google Places or Foursquare behind the same `Place` type. Both need
  a billing account and a key in `.env.local`; `/api/dates/place` is the one route to change.
- **Overpass reliability**: run a private Overpass instance, or drop the rare kinds into a nightly
  extract. The public servers are fine for a launch, not for a campaign that lands.
- **Nominatim's policy is one request a second.** Month-long caching keeps a normal day far under
  it; a viral day would not be. Same fix: a paid geocoder or a private instance.

## Stars, cost and rank (what makes it read like TripAdvisor)

- **Stars are real.** They come from `place_reviews` (migration 0008): one review per signed-in
  person per place, 1 to 5 stars, what it cost for two, what they went as, and up to 400
  characters. Anyone can read them; only the author can write theirs (row-level security). The
  server strips links and phone numbers and lowercases shouting. A place nobody has rated says so;
  nothing is ever shown as a rating that is not one.
- **Cost** is on the ideas' four-step scale (free, pocket change, dinner money, a treat). It is
  guessed from the kind of place and the cuisine (`cost.ts`), and the typical answer in reviews
  replaces the guess as soon as there is one (a gold ring on the chip says it came from couples).
- **Rank** ("#3 of 41 in dinner & drinks") is by *date score* (`rank.ts`): the map's own score,
  ratings pulled towards the middle when there are few of them (a Bayesian average with a prior of
  3.8 and the weight of four reviews), and a lift for a real photograph. Rank is always by score,
  whatever the list is sorted by, so it means the same thing on every card.
- **Sort**: best for a date, top rated, nearest, cheapest. **Filter** by group and by cost.
- **Top picks**: the ten best, as a shelf with photographs and rank badges.
- **Make it a date**: on every place, two others of a different kind within a short walk (dinner
  then a view; coffee then a gallery), the better ranked first.

## Games

Seven to play, at `/games`, all of them card games on a dark wine table (`GameTable`). The deck is in
`src/components/games/cards.tsx`: a `PlayingCard` with corner ranks, a patterned back and a 3D turn
(`.card-3d` in globals.css); `GameHand` fans them all, sized in container units so it fits any
column; `Chip` is a score token. Which games exist, and the rank, suit, sticker and minutes each is
dealt with, is one list: `src/lib/games/catalogue.ts`, read by the hub, the home page's band and
the sitemap. Adding a game means a row there, a page, and its strings.

**How well do you know me?**, **Would you rather?** and **Draw it, guess it** run on one phone
passed back and forth or on two phones joined by a room code: a room is a Supabase Realtime channel named after its four-letter
code (`use-room.ts`), with presence for who is here and broadcast for the moves. No table, no row:
the room exists while both are in it. The host (whoever made the code) holds the game state and
sends it after every move, addressed to the one guest it is playing with; the guest sends moves
(`use-synced.ts`), and `restart()` deals a fresh game in the same room. Presence carries the moment
each phone arrived, so every phone sorts the same list the same way and agrees that **the first
guest in keeps the seat**: a third phone on the link is told the room is full and is never sent the
game. **Memory** (eight pairs, from our stickers or from photos the couple picks, which stay in the
browser as object URLs and are never uploaded), **question cards**, **Truth or dare, soft edition**
and **Dishes roulette** are one-phone games.

Draw it, guess it is the one game whose moves are not the synced state: strokes are their own
broadcasts on the same channel (`ink` a new stroke, `ink+` more points about once a frame, `ink=`
the whole paper, `ink0` a wipe, `ink?` "what have I missed"), and points are fractions of the board
rather than pixels, so a finger on a phone and a mouse on a laptop draw the same picture. The word
is only ever on the screen of whoever is drawing; on one phone it is peeked at behind a hand-over
card and then hidden. A guess counts in either language, so two phones set to different ones can
still play.

The game logic is pure (`src/lib/games/play.ts`, `memory.ts`) and runs identically in both modes,
so it is unit-tested once (`draw.ts` too, including how loosely a guess is matched). `ScreenTop`
scrolls each new screen up under the header — without it a
phone starts the next question halfway down the page. Two phones are tested for real in
`tests/e2e/games-rooms.spec.ts`: three browser contexts, a full ten rounds, the third turned away,
play again, and one phone leaving; and a drawing round where the ink has to reach the other
browser's canvas and the right word has to end the round.

## Saved dates

Planning needs no account, as before; a plan can now also be **kept with one** (docs/MEMBERSHIP.md
section 3 is the contract). One `saved_dates` row per saved date or trip (migration 0015): a date's
`data` is the plan exactly as `readPlan` reads it, a trip's is `{ v: 1, tripId, depart?, note? }`;
the server derives `city`, `day` and `stops_count`. Free accounts keep **3**, dates and trips
together; members of Ethos for Two any number (500 is the database's backstop), shared with their
partner, who reads and edits them. Only a row's owner deletes it.

- **The API** (`src/app/api/saved-dates/**`, logic in `src/lib/saved-dates/server.ts` over an
  injected store and couple, so it is tested without a database): reads through the user's own
  client (row-level security: one's own rows, and the partner's while `couple_partner()` says so),
  writes with the service role after the checks. The free limit is checked before the insert and
  again after it; two saves at once are ranked by the database's `created_at` (the insert sends no
  time of ours), and the one past the limit is deleted and refused. An edit names its `baseVersion`
  and is written only while the row is still at it (else `409` with the current row); a new version
  is stamped by the database (`saved_dates_touch`). The 500 cap (`23514`, "too many saved dates") is
  `limit_reached`; any other CHECK the table refuses is `400 invalid_input`. Per user: the list and
  one date 120 a minute, saving 30 an hour, editing 600, deleting 120.
- **When a membership ends** nothing is deleted: sharing stops, and of one's own rows the 3 most
  recently changed stay editable, the rest read-only (`403 read_only`) until some are deleted or
  they join again.
- **The plan editor** keeps its working plan where it was (`ethos.dates.plan.v1`); a saved date is
  opened into it (`/plan#s=<id>`) and linked (`ethos.dates.saved.v1`: id, version, the plan as last
  saved). While linked, every change is saved a moment later (`useSavedPlanSync`, on /plan and the
  map; one save is the pure `saveLinkedPlan` in `sync.ts`). A conflict takes the version saved
  first and says who changed it (the `409` carries the row as it is when answering, not as it was
  read before the checks); anything typed while the losing save was out is not wiped: it is sent
  next on the same version, and that answer's copy is the one shown. Offline keeps the change as
  "Not saved yet" and tries again on the next change, on focus or back online; a date gone is
  unlinked with a toast. A date that turns **read-only while being edited** is unlinked, the plan
  stays on the device, and a banner in the membership's dusk colours says why (`DetachedBanner`,
  `ethos.dates.saved.detached.v1`) until it is closed or the plan is replaced.
- **When saving is unavailable** (0015 not applied, the database down) the website's requests carry
  `x-ethos-quiet: 1` and get `200 { unavailable: true }` instead of `503` (the app still gets the
  503), the tab remembers it (`availability.ts`: half a minute after one such answer, then two
  minutes, then ten while they keep coming; any answer that works starts over, and the pages ask
  again by themselves when a pause ends), and "Save to my dates" and "Save trip" are not shown: no
  button that can only fail, and nothing in the console. A save left for after signing in waits for
  the account's answer and is only used up by an answer: one that didn't get through (saving off,
  offline, too many at once) is kept and saves itself once saving answers again.
- **Members' extras**: the whole date in Google or Apple Maps (`src/lib/dates/maps-route.ts`, by
  coordinates, walked when every leg is within `WALK_KM`; free visitors see it locked), and an email
  the day before each saved date with a day (the second phase of `/api/cron/reminders`: members'
  rows only, from 0015's `saved_dates_due`, claimed before sending, owner and partner each in their
  language, the claim given back when every send failed, a signed "turn off" link).
- `/my-dates` lists them (server-rendered first page, then the browser), and the data export
  carries one's own rows.

## Ethos for Two

The couples' membership: €4.99 a month or €29.99 a year per couple (docs/MEMBERSHIP.md). For the
dates it adds what is above: unlimited saved dates and trips shared with the partner, the day-before
reminder, and the whole date in Maps. Planning and sharing one date stay free, as they always were.

## Privacy, by construction

- A position is snapped to a grid of about 100 m (`snapSearch`) **in the browser**, before any
  request, so neither a URL nor a log ever holds where somebody is standing. It also makes every
  search in a neighbourhood the same cacheable URL.
- A "near me" search is never written into the address bar; a named town is, so it can be shared.
- A plan lives in `localStorage` and travels in the link's `#fragment`, which browsers do not send
  to servers. It reaches our database only when its maker saves it to their account
  (`saved_dates`), and then only they and, while they share a membership, their partner can read it.
- `Permissions-Policy` now allows `geolocation=(self)`; the CSP allows `tiles.openfreemap.org` for
  `connect-src` and `img-src`, and Wikimedia's two image hosts for `img-src`, and nothing else new.

## MapLibre is not bundled

MapLibre 6 ships as three ES modules that find each other by relative URL (the map, a shared chunk,
the worker). `scripts/copy-maplibre.mjs` copies them to `public/vendor/maplibre-gl/<version>/` before
`dev` and `build` (the folder is gitignored), and `map-view.tsx` imports the map from there at
runtime, so nothing about it is in the site's own JavaScript until a map is on screen. A unit test
fails if `MAPLIBRE_VERSION` in `map-vendor.ts` falls behind the installed package.

## Tests

- `tests/unit/dates.test.ts`: geography, kinds, the opening-hours reader, tiles, Overpass queries,
  details, the forecast, the calendar, ideas, timing, plans and their links, long-distance maths,
  the question decks.
- `tests/e2e/dates.spec.ts`: the pages with the outside world mocked (places, forecast, details, the
  map style), on a phone and a laptop, in both languages.
- Saved dates: `tests/unit/saved-dates.test.ts` (validation, the free limit and its race, members,
  versions, read-only after a membership, the partner, owner-only delete, rate limits, outages,
  reminders), `saved-dates-sync.test.ts` (autosave, conflicts, offline, read-only answers, the
  quiet client), `maps-route.test.ts`, `migrations-saved-dates.test.ts` (0015 read as SQL),
  `tests/e2e/saved-dates.spec.ts` (with /api/saved-dates answered by the test: nobody signs in), and
  `tests/e2e/my-dates.spec.ts` (My dates drawn by the development-only
  `/for-two/preview/my-dates?state=…`, since the real page needs a signed-in account).
