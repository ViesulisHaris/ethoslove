# Trips and flights

A room of ready-made trips for couples, a flight search that costs nothing to run, and a way to
turn any trip into a gift. No API keys, no quotas, no bookings: we never touch a fare. Some of the
links earn a commission through Travelpayouts (Aviasales, Tiqets, Auto Europe); every page that
shows one says so. See "Partners" below.

## The pages

| Route | What it is |
|---|---|
| `/trips` | The flight search on the first screen, then the twelve trips with chips to filter them by kind, then a band to the "Pack your bags" gift. |
| `/trips/<id>` | One trip: hero picture and facts, the route on a map with every stop (each links to `/dates` for that town), the plan day by day, "Tickets for this trip" (Tiqets, up to four), flights to where it lands (with "Hire a car" beside them on road trips), and "Make it a surprise". |

Both are statically rendered for every trip in both languages (`generateStaticParams` on the
trip's page; the locale comes from the `[locale]` layout). Both carry JSON-LD: an `ItemList` of
the trips on the hub, a `TouristTrip` with its itinerary as an `ItemList` of places on each trip.

## Where things live

| File | What |
|---|---|
| `src/lib/trips/airports.ts` | The offline airport table: every city the site already knows plus the islands and coasts trips land at. `findAirport`, `nearestAirport`, `suggestAirports`, and `cityName` (the Spanish name where it differs: Nápoles, Praga). |
| `src/lib/trips/flights.ts` | `flightLinks` (Aviasales, then the three comparison URLs), `weekendAhead` (the dates every search starts with) and `withDepart` (a new departure moves the return with it), `estimateFlight` and `formatFlightTime` ("about 3 h 10 min in the air"), `trainHint` (under 600 km), `withPartner` (see below). |
| `src/lib/trips/partners.ts` | The Travelpayouts short links and the deep links built on them (`aviasalesSearch`, `tiqetsSearch`, `autoEuropeHire`), each trip's ticketed sights (`tripTickets`) and car-hire page (`tripCarHire`), and `PartnerPlacement`. |
| `src/lib/dates/ticketed.ts` | Which kinds of place get a "Tickets" button (`sellsTickets`) and what Tiqets is asked (`ticketQuery`). |
| `src/lib/dates/plan-gift.ts` | A date plan as "a surprise inside" a gift (`planUnwrap`): the day, the town, the stops with their times, kinds and photographs. |
| `src/lib/trips/presets.ts` | `TRIPS`: the twelve trips, all text in English and Spanish. |
| `src/lib/trips/trip-gift.ts` | What "Pack your bags" starts with for a trip (`tripGiftFields`), and a trip as a surprise inside any other gift (`tripUnwrap`). |
| `src/lib/trips/last-from.ts` | The last airport someone searched from, in `localStorage`, so the next search and the next surprise start there. |
| `src/lib/editor/gift-seed.ts` | Hands template fields (and a surprise inside, `unwrap`) to the editor through `sessionStorage` (read once, an hour at most, size-capped); `editor-shell.tsx` merges them over the defaults and over a restored draft. |
| `src/components/gifts/` | `template-chooser.tsx` (every gift, to wrap a date or a trip in) and `unwrap-photos.ts` (the stops' photographs, through the dates photo store). |
| `src/components/trips/` | `flight-finder.tsx`, `airport-box.tsx`, `trip-card.tsx`, `trips-grid.tsx`, `trip-map.tsx` + `route-map.tsx`, `trip-art.tsx`, `surprise-link.tsx`, `partner-link.tsx` (every link that earns goes through it). |
| `public/trips/<id>.webp`, `<id>-sm.webp` | The pictures, 1600×1200 and 800×600. |

## Flights, and why they are links

We sell nothing and fetch no fares. The finder builds four URLs from the two airports, the dates
and the number of travellers, and opens them in a new tab:

- **Aviasales** (first, the big button, "Search on Aviasales"): `https://aviasales.tpm.lv/DHecFLiz?u=<encoded https://www.aviasales.com/search/<FROM><ddmm><TO><ddmm><adults>>`, e.g. `RIX1610LIS19102`. City codes where there is one (`LON`, `PAR`), like Kayak. With no departure date it opens Aviasales' home page instead, since its search needs one.
- **Google Flights**: `https://www.google.com/travel/flights?q=Flights from X to Y on DATE through DATE&hl=en|es`. The query is plain English in both languages; `hl` sets the page's language.
- **Skyscanner**: `https://www.skyscanner.net/transport/flights/<from>/<to>/<yymmdd>/<yymmdd>/?adultsv2=2&cabinclass=economy&rtn=1`.
- **Kayak**: `https://www.kayak.com/flights/<FROM>-<TO>/<YYYY-MM-DD>/<YYYY-MM-DD>/2adults`.

Skyscanner and Kayak get the city's code where there is one, so every airport in town is
searched. Kayak takes IATA's (`LON` rather than `LHR`); Skyscanner has its own four-letter ones
(`lond`, `pari`, `nyca`), kept in `SKYSCANNER_CITY` in `flights.ts`: a metro code added to the
airport table needs its Skyscanner twin there too, and a unit test fails until it has one.

Dates start filled in: the first Friday at least three weeks away, back on the Monday
(`weekendAhead`), so every link finds fares. It is worked out from the visitor's own today, in the
browser after hydration (`useSyncExternalStore` with no server snapshot), so the server's render
and the first one in the browser agree. Once they pick a date, theirs win; a departure past the
return moves the return with it, keeping the trip's length (`withDepart`), and only clearing the
return makes it one way. Every URL shape is in `tests/unit/trips.test.ts` and
`tests/unit/trip-partners.test.ts`, so a site changing its format fails a test, not a visitor.

"Meet in the middle" on `/long-distance` uses the same links: from each person's nearest airport to
the one nearest halfway (one seat each), or from one of them to the other when halfway has no
airport of its own. Each flight is an Aviasales button with Google Flights beside it to compare,
on the same three-weeks-out weekend.

## Partners

Travelpayouts gives each programme one short link, and `?u=<any page on the partner's site>` lands
the visitor there with our id attached; `partners.ts` has the three and the reasons nothing else
(no script, no cookie of ours) is needed. Every partner link goes through `PartnerLink`
(`src/components/trips/partner-link.tsx`): `target="_blank"`, `rel="noopener noreferrer sponsored"`,
and `track("affiliate_click", { partner, placement })`. The comparison links (Google Flights,
Skyscanner, Kayak) are not partners and keep `rel="noopener noreferrer"` with no event.

| Where | Partner | Placement | What |
|---|---|---|---|
| `/trips`, the flight finder | Aviasales | `trips_finder` | "Search on Aviasales", first and full width, above the three to compare. |
| `/trips/<id>`, "Getting there" | Aviasales | `trip_flights` | The same finder with the trip's airport in "To". |
| `/trips/<id>`, "Tickets for this trip" | Tiqets | `trip_tickets` | Up to four things the plan sends them to that Tiqets sells (`tripTickets`): a Tiqets search for each, in the page's language. |
| `/trips/<id>`, "Hire a car" (road trips only) | Auto Europe | `trip_car` | `car-rental-italy` for the Amalfi coast and Tuscany, `car-rental-portugal` for the Algarve, the home page for Scotland, Iceland and the Baltics (their pages were 404). |
| `/dates`, a place's sheet | Tiqets | `place_sheet` | "Tickets" for museums, zoos and aquariums, planetariums and theme parks, and for galleries and landmarks with an encyclopedia entry (`sellsTickets` in `src/lib/dates/ticketed.ts`). The search is the place's name and the town. |
| `/plan`, each stop | Tiqets | `plan` | The same "Tickets" on a ticketed stop. A plan's stop doesn't know whether it is famous, so galleries and landmarks get none there. |
| `/long-distance`, "Meet in the middle" | Aviasales | `meet_middle` | Each flight, one seat, with Google Flights as the second link. |

The small print sits next to the buttons, in both languages: "We may earn a commission if you book
through some of these links. It costs you nothing extra." (`affiliate.disclosure`, and
`affiliate.disclosureBoth` for the pages that talk to the two of you in Spanish; the finder's own is
`trips.flights.smallPrint`). A new placement adds its name to `PartnerPlacement` and its line to
this table.

A trip's tickets live in `TRIP_TICKETS` in `partners.ts`: a name in both languages, the words Tiqets
is searched with, and the stop it belongs to (its English name, checked by a unit test). Only sights
the plan itself mentions, only ones with a queue or a booked slot worth skipping, and only ones
Tiqets sells where the couple will be: a day trip from a city they have already left doesn't count.

Check a query before adding it. `https://www.tiqets.com/en/search?q=<query>` opens the sight's own
page when Tiqets knows the name exactly; otherwise the page is filled by
`https://www.tiqets.com/web_api/search/offerings?salesChannel=tiqets.com&query=<query>&language=en&currency=EUR`,
which shows what the visitor will see. Try `language=es` too: the Spanish search finds English names,
but not every one (the Louisiana). On 2026-09-23 these had nothing, or the wrong place, and were left
out: Villa Rufolo, Turaida, Kadriorg, St Peter's in Riga (Tiqets' is in Melaka), Český Krumlov's
castle and the Westerkerk tower (only tours from elsewhere), Eilean Donan and Jökulsárlón (only day
trips from Inverness and Reykjavík), Santorini's wineries. Santorini and Naxos has one ticket for
that reason.

### Ids for the comparison sites

Google Flights, Skyscanner and Kayak pay nothing today, and nothing breaks without an id. When
there is one, it goes in `withPartner(site, url)` in `flights.ts`, the only place their links pass
through:

- **Skyscanner** pays through Impact: wrap the search URL in the tracking link Impact gives you
  (`https://skyscanner.pxf.io/c/<id>/<ad>/<campaign>?u=<encoded search URL>`).
- **Kayak** (and many others) through Travelpayouts: add `marker=<your id>` to the programme's
  links as its dashboard shows.
- **Google Flights** has no programme; leave it as it is.

Put the id in an env var read by `withPartner` at that point (and in `docs/DEPLOY.md`); the links
must keep working when it is absent, and set `partner` on its `FlightLink` so the button is marked
sponsored and counted.

## The trips

Twelve, none in Spain (the owner's rule for the whole site). Each has a kind (road, city, train,
islands), days, best months, a budget for what two people spend there a day (€ up to about 150,
€€ 150–300, €€€ more; flights not included), the airport it lands at, its stops in route order,
and a plan with one entry per day: three to five things, real places, and something for each
evening. Write like a friend who has been, never like a brochure.

- **Coordinates** are the town centre, square or sight, checked against Nominatim
  (`https://nominatim.openstreetmap.org/search?format=json&q=...`, a real User-Agent, a second
  between requests). A town's name alone often returns the centre of its province (Siena did), so
  search for the main square.
- **`flyTo`** must be in `AIRPORTS`; add a missing one to `EXTRA` in `airports.ts`.
- **Pictures**: `public/trips/<id>.webp` (1600×1200, quality ~72) and `<id>-sm.webp` (800×600), in
  the site's art direction: editorial 35mm film, warm light, soft blush palette, a couple seen from
  behind, no text, logos or faces. Look at every one before keeping it; the first Copenhagen
  picture had a shop sign on a façade and was made again. A new trip can ship with `image: null`
  and is drawn as its two colours and a sticker until its picture exists.

The unit tests check ids, both languages everywhere, the day count, nights adding up, stops within
400 km of each other, the airport, the pictures on disk, and that no text mentions Spain.

## Make it a surprise

The button saves a gift seed for `pack-your-bags` and opens `/create/pack-your-bags`:

- `trip`: road trips `road`, the train trip `train`, cities and islands `flight`;
- `toCity`: where the road ends for a road trip, otherwise the city it flies to, in the gift's
  language; `toCoords` too when the ticket's map couldn't place that name (Jökulsárlón, Sagres),
  otherwise emptied so an old draft's override can't win;
- `stops`: the towns between the first and the last, road trips only, five at most;
- `nights`: days − 1;
- `clues`: emptied, so the ticket gets the template's own packing list for that kind of trip
  rather than a list an old draft made for somewhere else;
- `fromCity`: where they last searched flights from, if anywhere.

The editor validates the seed against the template's schema field by field; whatever fails stays
at the default.

## A surprise inside any gift

"Wrap it in a gift" on `/plan`, and "…or put it inside any gift" under a trip's "Make it a
surprise", open the gift chooser (`src/components/gifts/template-chooser.tsx`): every template, in
the gallery's order, each saying what the surprise costs in it. The one they pick opens in the
editor with the plan or the trip attached as `GiftData.unwrap` (`planUnwrap` / `tripUnwrap`), and
the gift carries it as a present on its end screen, under the last words (`UnwrapGift` in
`src/templates/_shared`). Tapped, it unwraps into the itinerary: the day, each stop with its
photograph (or its kind's picture, marked as a kind), "Open our plan" and "Add to calendar"; or the
trip's photograph, from where to where, the nights and the towns on the way.

- Pictures and the link are held to an allow-list (`src/lib/gift/unwrap-rules.ts`): Wikimedia's two
  image hosts and this site's own `/dates/`, `/trips/` and `/templates/` pictures, and a link only to
  a plan or a preset trip. A gift is opened by someone who agreed to nothing, so it may not load a
  picture from anywhere else.
- The photographs come through the same store as the Dates list (`photoFor` in
  `components/dates/photo-store.ts`), asked for as the chooser opens and waited on for a few seconds
  at most.
- It is one of the paid extras on the two free templates ("Make it special") and comes with every
  premium template (`premiumExtras` in `src/lib/gift/publish.ts`).
- The editor has a section for it, after "Your words": the attached plan or trip with its day, or
  "Add your date plan" (the one this browser keeps) and "Add a trip" (the twelve presets).

## The map

The route map is `route-map.tsx`, loaded by `trip-map.tsx` only when the map is within a screen of
being seen: MapLibre (served from `/vendor`, see DATES.md), its stylesheet and the tiles cost a
visitor who never scrolls there nothing. Stops are numbered like the list beside it; a road is a
solid line, the train dashed, the ferry dotted blue, a city dotted rose. Cooperative gestures keep
the page scrolling on phones (two fingers move the map) and on laptops (Ctrl/⌘ and the wheel to
zoom), with MapLibre's hints translated. Without WebGL, or when the map style can't be fetched, the box lists the stops instead.
