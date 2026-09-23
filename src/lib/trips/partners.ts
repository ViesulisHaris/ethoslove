/**
 * The travel partners we earn from, through Travelpayouts. Nothing here needs a key or a script:
 * each partner has one short link, and a short link takes `?u=<any page on that partner's site>`
 * and lands the visitor on that page with our partner id attached (checked 2026-09-23: Aviasales
 * gets `?marker=780901…`, Tiqets `tq_campaign=…-780901`, Auto Europe `sub_id=…-780901`).
 *
 * So a deep link is just the partner's own URL, wrapped. The partner sets its cookie on its own
 * site after the click; nothing is loaded or stored on ours, which is why this needs no consent
 * banner of its own. Every page that shows one of these says that we may earn a commission.
 *
 * Travelpayouts' "Drive" script was the other way to do this and was turned down on purpose: it
 * uploads each page's HTML, records clicks and key presses, can open popunders, and weighs about
 * 220 KB. A private gift page must never run it.
 */
export type PartnerId = "aviasales" | "tiqets" | "autoeurope";

const SHORT_LINKS: Record<PartnerId, string> = {
  aviasales: "https://aviasales.tpm.lv/DHecFLiz",
  tiqets: "https://tiqets.tpm.lv/6ik2vRS7",
  autoeurope: "https://autoeurope.tpm.lv/6xALsrap",
};

export const PARTNER_NAMES: Record<PartnerId, string> = { aviasales: "Aviasales", tiqets: "Tiqets", autoeurope: "Auto Europe" };

/** A page on the partner's site, reached through our link so the booking is credited to us. */
export function viaPartner(partner: PartnerId, url: string): string {
  return `${SHORT_LINKS[partner]}?u=${encodeURIComponent(url)}`;
}

const ddmm = (iso: string) => `${iso.slice(8, 10)}${iso.slice(5, 7)}`;

/**
 * Aviasales' search, already run: `/search/RIX1010LIS13102` is Riga on 10 October to Lisbon,
 * back on 13 October, two adults. Its search needs a date, so without one it opens the home
 * page with our id instead of a search that would fail.
 */
export function aviasalesSearch({ from, to, depart, back, adults = 2 }: { from: string; to: string; depart?: string; back?: string; adults?: number }): string {
  const people = Math.min(9, Math.max(1, Math.round(adults)));
  const valid = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined);
  const out = valid(depart);
  const home = out ? valid(back) : undefined;
  const target = out
    ? `https://www.aviasales.com/search/${from.toUpperCase()}${ddmm(out)}${to.toUpperCase()}${home ? ddmm(home) : ""}${people}`
    : "https://www.aviasales.com/";
  return viaPartner("aviasales", target);
}

/** Tickets and tours for a place, in the visitor's language. A name Tiqets knows exactly opens that sight's or city's own page; anything else is its search. */
export function tiqetsSearch(query: string, locale: "en" | "es"): string {
  return viaPartner("tiqets", `https://www.tiqets.com/${locale}/search?q=${encodeURIComponent(query)}`);
}

/**
 * Car hire. Auto Europe's EU site has pages for some countries and cities and not others (Italy
 * and Portugal yes; the UK, Iceland and the Baltics were 404 on 2026-09-23), so a trip names the
 * page it wants and anything else gets the home page, where they type the pick-up themselves.
 */
export function autoEuropeHire(page?: string): string {
  return viaPartner("autoeurope", page && /^car-rental-[a-z-]+$/.test(page) ? `https://www.autoeurope.eu/${page}/` : "https://www.autoeurope.eu/");
}

/** Where on the site a partner button sat, for the `affiliate_click` event: which spot earns, not who clicked. */
export type PartnerPlacement = "trips_finder" | "trip_flights" | "trip_tickets" | "trip_car" | "place_sheet" | "plan" | "meet_middle" | "gift_share" | "city";

type L = { en: string; es: string };

/**
 * A sight on a trip's plan that sells tickets, a timed slot or a boat seat. `name` is what the
 * button says; `query` is what Tiqets is asked, in English: its Spanish search finds the English
 * names too, and a name it knows exactly ("Uffizi Gallery") opens that sight's own page instead of
 * a list. `stop` is the stop it belongs to (its English name, as in presets.ts) where it has one.
 */
export type TripTicket = { name: L; query: string; stop?: string };

/**
 * Up to four per trip: only sights the plan itself sends them to, only ones with a queue or a
 * booked slot worth skipping, and only ones Tiqets actually sells. Every query was run through
 * Tiqets' own search in both languages on 2026-09-23; the ones it had nothing for, or only a day
 * trip from a city the couple has already left, were taken out rather than sent to an empty page:
 * Villa Rufolo, Turaida, Kadriorg, St Peter's in Riga, Český Krumlov's castle, the Westerkerk
 * tower, Eilean Donan, Jökulsárlón, the Louisiana (only inside a city pass there) and Santorini's
 * wineries. A trip missing from here shows no tickets at all.
 */
const TRIP_TICKETS: Record<string, TripTicket[]> = {
  "lisbon-slow-weekend": [
    { stop: "Alfama", name: { en: "Castelo de São Jorge", es: "Castillo de San Jorge" }, query: "São Jorge Castle" },
    { stop: "Belém", name: { en: "Jerónimos Monastery", es: "Monasterio de los Jerónimos" }, query: "Jerónimos Monastery" },
    { stop: "Belém", name: { en: "Belém Tower", es: "Torre de Belém" }, query: "Belém Tower" },
  ],
  "amalfi-coast": [
    { stop: "Naples", name: { en: "The Veiled Christ, Cappella Sansevero", es: "El Cristo velado, capilla Sansevero" }, query: "Sansevero Chapel" },
    { stop: "Pompeii", name: { en: "Pompeii", es: "Pompeya" }, query: "Pompeii" },
  ],
  "tuscany-hill-towns": [
    { stop: "Florence", name: { en: "The Uffizi", es: "Galería Uffizi" }, query: "Uffizi Gallery" },
    { stop: "Florence", name: { en: "Giotto's bell tower", es: "Campanario de Giotto" }, query: "Giotto's Bell Tower Florence" },
    { stop: "Siena", name: { en: "Siena Cathedral", es: "Catedral de Siena" }, query: "Siena Cathedral" },
  ],
  "paris-without-cliches": [
    { stop: "Canal Saint-Martin", name: { en: "A boat up the Canal Saint-Martin", es: "En barco por el canal Saint-Martin" }, query: "Canal Saint-Martin cruise Paris" },
    { name: { en: "Musée de l'Orangerie", es: "Museo de la Orangerie" }, query: "Musée de l'Orangerie Paris" },
  ],
  "scottish-highlands": [
    { stop: "Edinburgh", name: { en: "Edinburgh Castle", es: "Castillo de Edimburgo" }, query: "Edinburgh Castle" },
    { stop: "Inverness", name: { en: "A cruise on Loch Ness", es: "Un crucero por el lago Ness" }, query: "Loch Ness" },
  ],
  "iceland-south-coast": [
    // At Grindavík, on the road in from the airport, which is where the plan stops for it: not Reykjavík.
    { name: { en: "The Blue Lagoon", es: "La Laguna Azul" }, query: "Blue Lagoon" },
    { stop: "Vík", name: { en: "A glacier walk on Sólheimajökull", es: "Caminata por el glaciar Sólheimajökull" }, query: "Sólheimajökull glacier walk" },
  ],
  "baltic-coast": [
    { stop: "Riga", name: { en: "House of the Blackheads", es: "Casa de los Cabezas Negras" }, query: "House of the Black Heads" },
    { stop: "Tallinn", name: { en: "The Tallinn Card", es: "La Tallinn Card" }, query: "Tallinn Card" },
  ],
  "prague-krumlov-vienna": [
    { stop: "Prague", name: { en: "The astronomical clock's tower", es: "La torre del reloj astronómico" }, query: "Prague Astronomical Clock" },
    { stop: "Prague", name: { en: "Prague Castle", es: "Castillo de Praga" }, query: "Prague Castle" },
    { stop: "Vienna", name: { en: "The Belvedere", es: "El Belvedere" }, query: "Belvedere Palace" },
    { stop: "Vienna", name: { en: "The Prater's giant wheel", es: "La noria del Prater" }, query: "Wiener Riesenrad" },
  ],
  "santorini-naxos": [{ stop: "Oia", name: { en: "A sunset sail round the caldera", es: "Velero al atardecer por la caldera" }, query: "Santorini sunset cruise" }],
  "copenhagen-hygge": [
    { name: { en: "Tivoli Gardens", es: "Jardines de Tivoli" }, query: "Tivoli Gardens" },
    { name: { en: "A canal boat from Nyhavn", es: "En barco por los canales desde Nyhavn" }, query: "Copenhagen canal tour" },
  ],
  "algarve-coast": [
    { stop: "Benagil", name: { en: "The Benagil cave by kayak", es: "La cueva de Benagil en kayak" }, query: "Benagil cave kayak" },
    { stop: "Lagos", name: { en: "Ponta da Piedade by boat", es: "Ponta da Piedade en barco" }, query: "Ponta da Piedade boat tour Lagos" },
  ],
  "amsterdam-by-bike": [
    { stop: "Vondelpark", name: { en: "The Rijksmuseum", es: "El Rijksmuseum" }, query: "Rijksmuseum" },
    { name: { en: "Hortus Botanicus", es: "Hortus Botanicus" }, query: "Hortus Botanicus" },
  ],
};

/** Auto Europe's own page for the country a road trip is driven in, where it has one (see autoEuropeHire). */
const TRIP_CAR_PAGES: Record<string, string> = {
  "amalfi-coast": "car-rental-italy",
  "tuscany-hill-towns": "car-rental-italy",
  "algarve-coast": "car-rental-portugal",
};

export const tripTickets = (tripId: string): TripTicket[] => TRIP_TICKETS[tripId] ?? [];

/** Car hire for a road trip, on its country's page or Auto Europe's home page; no link for any other kind of trip. */
export const tripCarHire = (trip: { id: string; kind: string }): string | null => (trip.kind === "road" ? autoEuropeHire(TRIP_CAR_PAGES[trip.id]) : null);
