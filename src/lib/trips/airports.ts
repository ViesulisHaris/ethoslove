import { CITIES, resolvePlace } from "@/templates/_shared/places";
import { distanceKm, type LatLng } from "@/lib/dates/geo";

/**
 * Where people fly from and to, offline. A flight search needs an airport, and most people know
 * their city, not its code, so every city the site already knows (the offline table the globe and
 * "meet in the middle" use) is given the airport a local would fly from, plus the handful of
 * islands and coasts the preset trips land at.
 *
 * `iata` is the main airport; `metro` is the code that means "any airport in this city" where
 * there is more than one worth searching (London's six, New York's three). Search sites that take
 * codes get the metro code when there is one, so a cheaper Gatwick flight is not left out.
 *
 * No city is included on a guess: somewhere without an airport of its own gets the one people
 * actually use (Kyoto flies from Osaka's), and nowhere with its airspace closed is listed.
 */
export type Airport = {
  city: string;
  country: string;
  iata: string;
  metro?: string;
  lat: number;
  lng: number;
  /** Other names people type for it. */
  aka?: string[];
  /** The city's name in Spanish, where it is not the same word (Londres, Nápoles). */
  es?: string;
};

/** City in the offline table → [main airport, metro code]. */
const FOR_CITY: Record<string, [string, string?]> = {
  Madrid: ["MAD"],
  Barcelona: ["BCN"],
  Valencia: ["VLC"],
  Sevilla: ["SVQ"],
  Bilbao: ["BIO"],
  Málaga: ["AGP"],
  Palma: ["PMI"],
  "Las Palmas": ["LPA"],
  Lisbon: ["LIS"],
  Porto: ["OPO"],
  Paris: ["CDG", "PAR"],
  Lyon: ["LYS"],
  Marseille: ["MRS"],
  Nice: ["NCE"],
  Bordeaux: ["BOD"],
  London: ["LHR", "LON"],
  Manchester: ["MAN"],
  Edinburgh: ["EDI"],
  Glasgow: ["GLA"],
  Birmingham: ["BHX"],
  Bristol: ["BRS"],
  Dublin: ["DUB"],
  Cork: ["ORK"],
  Berlin: ["BER"],
  Munich: ["MUC"],
  Hamburg: ["HAM"],
  Frankfurt: ["FRA"],
  Cologne: ["CGN"],
  Amsterdam: ["AMS"],
  Rotterdam: ["RTM"],
  Brussels: ["BRU"],
  Antwerp: ["BRU"],
  Luxembourg: ["LUX"],
  Zurich: ["ZRH"],
  Geneva: ["GVA"],
  Vienna: ["VIE"],
  Prague: ["PRG"],
  Budapest: ["BUD"],
  Warsaw: ["WAW"],
  Kraków: ["KRK"],
  Copenhagen: ["CPH"],
  Stockholm: ["ARN", "STO"],
  Gothenburg: ["GOT"],
  Oslo: ["OSL"],
  Bergen: ["BGO"],
  Helsinki: ["HEL"],
  Reykjavik: ["KEF"],
  Tallinn: ["TLL"],
  Riga: ["RIX"],
  Vilnius: ["VNO"],
  Rome: ["FCO", "ROM"],
  Milan: ["MXP", "MIL"],
  Florence: ["FLR"],
  Venice: ["VCE"],
  Naples: ["NAP"],
  Turin: ["TRN"],
  Bologna: ["BLQ"],
  Palermo: ["PMO"],
  Athens: ["ATH"],
  Thessaloniki: ["SKG"],
  Istanbul: ["IST"],
  Ankara: ["ESB"],
  Bucharest: ["OTP"],
  Sofia: ["SOF"],
  Belgrade: ["BEG"],
  Zagreb: ["ZAG"],
  Split: ["SPU"],
  Ljubljana: ["LJU"],
  Tbilisi: ["TBS"],
  Yerevan: ["EVN"],
  "Tel Aviv": ["TLV"],
  Jerusalem: ["TLV"],
  Beirut: ["BEY"],
  Amman: ["AMM"],
  Cairo: ["CAI"],
  Dubai: ["DXB"],
  "Abu Dhabi": ["AUH"],
  Doha: ["DOH"],
  Riyadh: ["RUH"],
  Casablanca: ["CMN"],
  Marrakech: ["RAK"],
  Tunis: ["TUN"],
  Algiers: ["ALG"],
  Lagos: ["LOS"],
  Accra: ["ACC"],
  Dakar: ["DSS"],
  Nairobi: ["NBO"],
  "Addis Ababa": ["ADD"],
  "Cape Town": ["CPT"],
  Johannesburg: ["JNB"],
  Mumbai: ["BOM"],
  Delhi: ["DEL"],
  Bangalore: ["BLR"],
  Chennai: ["MAA"],
  Kolkata: ["CCU"],
  Karachi: ["KHI"],
  Lahore: ["LHE"],
  Dhaka: ["DAC"],
  Colombo: ["CMB"],
  Kathmandu: ["KTM"],
  Bangkok: ["BKK"],
  Singapore: ["SIN"],
  "Kuala Lumpur": ["KUL"],
  Jakarta: ["CGK"],
  Bali: ["DPS"],
  Manila: ["MNL"],
  Hanoi: ["HAN"],
  "Ho Chi Minh City": ["SGN"],
  "Hong Kong": ["HKG"],
  Shanghai: ["PVG"],
  Beijing: ["PEK", "BJS"],
  Shenzhen: ["SZX"],
  Taipei: ["TPE"],
  Seoul: ["ICN", "SEL"],
  Busan: ["PUS"],
  Tokyo: ["HND", "TYO"],
  Osaka: ["KIX", "OSA"],
  Kyoto: ["KIX", "OSA"],
  Sapporo: ["CTS"],
  Sydney: ["SYD"],
  Melbourne: ["MEL"],
  Brisbane: ["BNE"],
  Perth: ["PER"],
  Auckland: ["AKL"],
  Wellington: ["WLG"],
  "New York": ["JFK", "NYC"],
  "Los Angeles": ["LAX"],
  "San Francisco": ["SFO"],
  Chicago: ["ORD", "CHI"],
  Miami: ["MIA"],
  Boston: ["BOS"],
  Washington: ["IAD", "WAS"],
  Seattle: ["SEA"],
  Austin: ["AUS"],
  Denver: ["DEN"],
  "Las Vegas": ["LAS"],
  Atlanta: ["ATL"],
  Houston: ["IAH", "HOU"],
  Dallas: ["DFW"],
  Philadelphia: ["PHL"],
  Honolulu: ["HNL"],
  Toronto: ["YYZ", "YTO"],
  Vancouver: ["YVR"],
  Montreal: ["YUL"],
  Calgary: ["YYC"],
  "Mexico City": ["MEX"],
  Guadalajara: ["GDL"],
  Cancún: ["CUN"],
  Havana: ["HAV"],
  "San Juan": ["SJU"],
  "Santo Domingo": ["SDQ"],
  "Panama City": ["PTY"],
  "San José": ["SJO"],
  Bogotá: ["BOG"],
  Medellín: ["MDE"],
  Caracas: ["CCS"],
  Quito: ["UIO"],
  Lima: ["LIM"],
  "La Paz": ["LPB"],
  Santiago: ["SCL"],
  "Buenos Aires": ["EZE", "BUE"],
  Córdoba: ["COR"],
  Montevideo: ["MVD"],
  Asunción: ["ASU"],
  "São Paulo": ["GRU", "SAO"],
  "Rio de Janeiro": ["GIG", "RIO"],
  Brasília: ["BSB"],
  Salvador: ["SSA"],
};

/** Places the offline city table does not have, mostly where trips land: islands, coasts, the north. */
const EXTRA: Airport[] = [
  { city: "Faro", country: "PT", iata: "FAO", lat: 37.0194, lng: -7.9304, aka: ["Algarve"] },
  { city: "Funchal", country: "PT", iata: "FNC", lat: 32.6669, lng: -16.9241, aka: ["Madeira"] },
  { city: "Ponta Delgada", country: "PT", iata: "PDL", lat: 37.7412, lng: -25.6756, aka: ["Azores", "Açores", "São Miguel"] },
  { city: "Santorini", country: "GR", iata: "JTR", lat: 36.4167, lng: 25.4318, aka: ["Thira", "Fira", "Santorin"] },
  { city: "Naxos", country: "GR", iata: "JNX", lat: 37.1036, lng: 25.3763 },
  { city: "Mykonos", country: "GR", iata: "JMK", lat: 37.4467, lng: 25.3289, aka: ["Míkonos"] },
  { city: "Heraklion", country: "GR", iata: "HER", lat: 35.3387, lng: 25.1442, aka: ["Crete", "Creta", "Iraklio"] },
  { city: "Corfu", country: "GR", iata: "CFU", lat: 39.6243, lng: 19.9217, aka: ["Corfú", "Kerkyra"] },
  { city: "Rhodes", country: "GR", iata: "RHO", lat: 36.4349, lng: 28.2176, aka: ["Rodas", "Rodos"] },
  { city: "Dubrovnik", country: "HR", iata: "DBV", lat: 42.6507, lng: 18.0944 },
  { city: "Inverness", country: "GB", iata: "INV", lat: 57.4778, lng: -4.2247 },
  { city: "Pisa", country: "IT", iata: "PSA", lat: 43.7228, lng: 10.4017 },
  { city: "Catania", country: "IT", iata: "CTA", lat: 37.5079, lng: 15.083, aka: ["Sicily", "Sicilia"] },
  { city: "Cagliari", country: "IT", iata: "CAG", lat: 39.2238, lng: 9.1217, aka: ["Sardinia", "Cerdeña", "Sardegna"] },
  { city: "Olbia", country: "IT", iata: "OLB", lat: 40.9236, lng: 9.4964 },
  { city: "Bari", country: "IT", iata: "BRI", lat: 41.1171, lng: 16.8719, aka: ["Puglia", "Apulia"] },
  { city: "Valletta", country: "MT", iata: "MLA", lat: 35.8989, lng: 14.5146, aka: ["Malta"] },
  { city: "Salzburg", country: "AT", iata: "SZG", lat: 47.8095, lng: 13.055 },
  { city: "Innsbruck", country: "AT", iata: "INN", lat: 47.2692, lng: 11.4041 },
  { city: "Basel", country: "CH", iata: "BSL", lat: 47.5596, lng: 7.5886 },
  { city: "Toulouse", country: "FR", iata: "TLS", lat: 43.6047, lng: 1.4442 },
  { city: "Nantes", country: "FR", iata: "NTE", lat: 47.2184, lng: -1.5536 },
  { city: "Gdańsk", country: "PL", iata: "GDN", lat: 54.352, lng: 18.6466, aka: ["Gdansk"] },
  { city: "Tromsø", country: "NO", iata: "TOS", lat: 69.6492, lng: 18.9553, aka: ["Tromso"] },
  { city: "Rovaniemi", country: "FI", iata: "RVN", lat: 66.5039, lng: 25.7294, aka: ["Lapland", "Laponia"] },
];

/**
 * What a Spanish speaker calls the cities whose names differ. Shown on the Spanish pages, and
 * understood when typed in either language: "Nápoles" has to find Naples.
 */
const ES_NAMES: Record<string, string> = {
  Lisbon: "Lisboa",
  Paris: "París",
  Marseille: "Marsella",
  Bordeaux: "Burdeos",
  London: "Londres",
  Edinburgh: "Edimburgo",
  Dublin: "Dublín",
  Berlin: "Berlín",
  Munich: "Múnich",
  Hamburg: "Hamburgo",
  Frankfurt: "Fráncfort",
  Cologne: "Colonia",
  Amsterdam: "Ámsterdam",
  Rotterdam: "Róterdam",
  Brussels: "Bruselas",
  Antwerp: "Amberes",
  Luxembourg: "Luxemburgo",
  Zurich: "Zúrich",
  Geneva: "Ginebra",
  Vienna: "Viena",
  Prague: "Praga",
  Warsaw: "Varsovia",
  Kraków: "Cracovia",
  Copenhagen: "Copenhague",
  Stockholm: "Estocolmo",
  Gothenburg: "Gotemburgo",
  Reykjavik: "Reikiavik",
  Tallinn: "Tallin",
  Rome: "Roma",
  Milan: "Milán",
  Florence: "Florencia",
  Venice: "Venecia",
  Naples: "Nápoles",
  Turin: "Turín",
  Bologna: "Bolonia",
  Athens: "Atenas",
  Thessaloniki: "Tesalónica",
  Istanbul: "Estambul",
  Bucharest: "Bucarest",
  Belgrade: "Belgrado",
  Tbilisi: "Tiflis",
  Yerevan: "Ereván",
  Cairo: "El Cairo",
  "Cape Town": "Ciudad del Cabo",
  Singapore: "Singapur",
  Beijing: "Pekín",
  Seoul: "Seúl",
  Tokyo: "Tokio",
  Kyoto: "Kioto",
  "New York": "Nueva York",
  Philadelphia: "Filadelfia",
  "Mexico City": "Ciudad de México",
  Havana: "La Habana",
  Heraklion: "Heraclión",
  Corfu: "Corfú",
  Rhodes: "Rodas",
  Valletta: "La Valeta",
  Salzburg: "Salzburgo",
  Basel: "Basilea",
};

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export const AIRPORTS: Airport[] = [
  ...CITIES.flatMap((c): Airport[] => {
    const codes = FOR_CITY[c.name];
    return codes ? [{ city: c.name, country: c.country, iata: codes[0], ...(codes[1] ? { metro: codes[1] } : {}), lat: c.lat, lng: c.lng }] : [];
  }),
  ...EXTRA,
].map((a) => (ES_NAMES[a.city] ? { ...a, es: ES_NAMES[a.city] } : a));

/** Every name the airport answers to, folded: the city, its Spanish name and the aliases. */
const namesOf = (a: Airport) => [a.city, ...(a.es ? [a.es] : []), ...(a.aka ?? [])].map(fold);

/** The city as the page's language says it. */
export const cityName = (a: Airport, locale: "en" | "es"): string => (locale === "es" && a.es ? a.es : a.city);

/**
 * The airport for a city someone typed, in either language ("Lisboa", "Londres", "Crete"), or a
 * code ("RIX"). Null when we don't know it: better to ask than to send them to the wrong airport.
 */
export function findAirport(name: string | undefined | null): Airport | null {
  const q = fold(name ?? "");
  if (!q) return null;
  if (/^[a-z]{3}$/.test(q)) {
    const code = q.toUpperCase();
    const byCode = AIRPORTS.find((a) => a.iata === code || a.metro === code);
    if (byCode) return byCode;
  }
  const exact = AIRPORTS.find((a) => namesOf(a).includes(q));
  if (exact) return exact;
  // The city table knows the Spanish names and the short forms (Londres, NYC, CDMX).
  const known = resolvePlace(name ?? undefined);
  if (known) {
    const near = nearestAirport(known, 5);
    if (near) return near.airport;
  }
  return q.length >= 3 ? (AIRPORTS.find((a) => namesOf(a).some((n) => n.startsWith(q))) ?? null) : null;
}

/** The closest airport we know to a point, if one is within reach by train or car. */
export function nearestAirport(point: LatLng, maxKm = 150): { airport: Airport; km: number } | null {
  let best: { airport: Airport; km: number } | null = null;
  for (const airport of AIRPORTS) {
    const km = distanceKm(point, airport);
    if (km <= maxKm && (!best || km < best.km)) best = { airport, km };
  }
  return best;
}

/** Typed-ahead suggestions for a flight box, best first: the start of a name beats the middle of one. */
export function suggestAirports(text: string, limit = 6): Airport[] {
  const q = fold(text);
  if (q.length < 2) return [];
  const score = (a: Airport) => {
    const names = namesOf(a);
    if (a.iata.toLowerCase() === q || a.metro?.toLowerCase() === q) return 0;
    if (names.some((n) => n === q)) return 1;
    if (names.some((n) => n.startsWith(q))) return 2;
    if (names.some((n) => n.includes(q))) return 3;
    return 9;
  };
  const known = resolvePlace(text);
  const alias = known ? nearestAirport(known, 5)?.airport : undefined;
  const ranked = AIRPORTS.map((a) => ({ a, s: a === alias ? 1 : score(a) }))
    .filter((r) => r.s < 9)
    .sort((x, y) => x.s - y.s || x.a.city.localeCompare(y.a.city));
  const seen = new Set<string>();
  return ranked.map((r) => r.a).filter((a) => (seen.has(a.city) ? false : (seen.add(a.city), true))).slice(0, limit);
}
