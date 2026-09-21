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

### What this data cannot do

OpenStreetMap has **no photos, no ratings and no reviews**, opening hours for about a third of
places and a website for about a quarter. The site is designed round that rather than hiding it:
places are ordered by how near and how unusual they are (never shown as a score), hours are read
for the chosen day and an unknown is called an unknown (`hours.ts` refuses to guess at the hard
parts of the grammar), and every place has a "Photos & reviews" link out to a web search.

### When it outgrows this

- **Photos, ratings, booking**: Google Places or Foursquare behind the same `Place` type. Both need
  a billing account and a key in `.env.local`; `/api/dates/place` is the one route to change.
- **Overpass reliability**: run a private Overpass instance, or drop the rare kinds into a nightly
  extract. The public servers are fine for a launch, not for a campaign that lands.
- **Nominatim's policy is one request a second.** Month-long caching keeps a normal day far under
  it; a viral day would not be. Same fix: a paid geocoder or a private instance.

## Privacy, by construction

- A position is snapped to a grid of about 100 m (`snapSearch`) **in the browser**, before any
  request, so neither a URL nor a log ever holds where somebody is standing. It also makes every
  search in a neighbourhood the same cacheable URL.
- A "near me" search is never written into the address bar; a named town is, so it can be shared.
- A plan lives in `localStorage` and travels in the link's `#fragment`, which browsers do not send
  to servers. There is no plan table, and nothing new in the database at all.
- `Permissions-Policy` now allows `geolocation=(self)`; the CSP allows `tiles.openfreemap.org` for
  `connect-src` and `img-src` and nothing else new.

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
