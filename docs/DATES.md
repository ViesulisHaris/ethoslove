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
| `/long-distance` | Meet in the middle, clocks, dates for two screens, gifts for the distance. |
| `/games` | One playable deck of question cards, and what is being built. |

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

Five to play, at `/games`. The deck of question cards (one phone). **How well do you know me?** and
**Would you rather?** run on one phone passed back and forth or on two phones joined by a room
code: a room is a Supabase Realtime channel named after its four-letter code (`use-room.ts`), with
presence for who is here and broadcast for the moves. No table, no row: the room exists while both
are in it. The host (whoever made the code) holds the game state and sends it after every move; the
guest sends moves (`use-synced.ts`). The game logic itself is pure (`src/lib/games/play.ts`) and
runs identically in both modes, so it is unit-tested once. **Dishes roulette** and **Truth or dare,
soft edition** are one-screen games. Memory and Draw-it are still to come, and say so.
Tested for real in two tabs of one browser: room, join, answer on both, reveal, guest-driven next.

## Ethos for Two

`/pricing` now leads with the couples' side: Free (everything above) and "Ethos for Two", €29 a
year per couple, **not for sale yet**: a waitlist (`waitlist` table, written by the server only,
rate-limited, no email sent). What it will include, and why it is priced so, is in
MONETIZATION.md. The gifts' one-time prices follow, unchanged.

## Privacy, by construction

- A position is snapped to a grid of about 100 m (`snapSearch`) **in the browser**, before any
  request, so neither a URL nor a log ever holds where somebody is standing. It also makes every
  search in a neighbourhood the same cacheable URL.
- A "near me" search is never written into the address bar; a named town is, so it can be shared.
- A plan lives in `localStorage` and travels in the link's `#fragment`, which browsers do not send
  to servers. There is no plan table, and nothing new in the database at all.
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
