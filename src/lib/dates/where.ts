import { isSettlement, type PlaceResult } from "@/lib/places/photon";
import { CITIES, searchCities, type City } from "@/templates/_shared/places";
import { ES_CITY_NAMES, STARTER_CITIES } from "./cities";

/**
 * What the where box offers for what has been typed so far. The geocoder answers in its own order,
 * which puts a village called Londa before London for "Lond" and Toky (Ukraine) before Tokyo for
 * "Toky", and it can take seconds or not answer at all. The big cities the site knows without
 * asking anybody lead instead, as soon as they are typed, in the page's language; the geocoder's
 * towns follow, without the ones that are the same city again.
 */
export type Suggestion = PlaceResult & {
  /** One of the site's own cities whose name starts with what was typed: it leads, and Enter can take it before the geocoder answers. */
  lead?: boolean;
};

/** Built-in cities offered at most, so a two-letter start never fills the list with them. */
const BUILT_INS = 3;
/** Rows in the list. */
const LIMIT = 8;

const fold = (s: string): string => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
/** Within about twenty kilometres: the same city, whichever point each source puts it at. */
const near = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => Math.abs(a.lat - b.lat) < 0.2 && Math.abs(a.lng - b.lng) < 0.2;

const regionNames = new Map<string, Intl.DisplayNames | null>();
/** A country's name in the page's language ("Japón", not "日本"), from its two-letter code. */
export function countryName(code: string | undefined, locale: "en" | "es"): string | undefined {
  if (!code) return undefined;
  if (!regionNames.has(locale)) regionNames.set(locale, typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames([locale], { type: "region" }) : null);
  try {
    return regionNames.get(locale)?.of(code) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * The built-in cities for a query: the table's own search (which knows "tokio", "londres", "nyc"),
 * and its Spanish names. Spain's cities included: this answers what somebody typed, and the owner's
 * rule of never naming Spain keeps the world-city search lists whole on purpose, so that people who
 * live there find their own city (docs/LAUNCH.md). Without Madrid here, "Madr" led with Madré.
 */
function builtIns(query: string): City[] {
  const q = fold(query);
  if (q.length < 2) return [];
  const bySpanish = CITIES.filter((c) => ES_CITY_NAMES[c.name] && fold(ES_CITY_NAMES[c.name]).startsWith(q));
  const found = [...searchCities(query, 6), ...bySpanish];
  return found.filter((c, i) => found.indexOf(c) === i).slice(0, BUILT_INS);
}

/**
 * Where a built-in city's dates are. The table has each city's official centre point; the starter
 * cities were placed where the evenings are (Covent Garden, the Baixa), so a town picked here
 * opens on the same map as its chip.
 */
const centreOf = (city: City): { lat: number; lng: number } => STARTER_CITIES.find((s) => s.name === city.name) ?? city;

export function suggestPlaces(query: string, remote: PlaceResult[], locale: "en" | "es"): Suggestion[] {
  const q = fold(query);
  const known = builtIns(query).map((city) => {
    const names = [city.name, ES_CITY_NAMES[city.name]].filter((n): n is string => Boolean(n)).map(fold);
    // "York" is inside "New York" without being the start of it: York itself comes first.
    const inside = names.some((n) => n.includes(q)) && !names.some((n) => n.startsWith(q));
    const { lat, lng } = centreOf(city);
    const row: Suggestion = { name: (locale === "es" && ES_CITY_NAMES[city.name]) || city.name, kind: "city", country: countryName(city.country, locale) ?? city.country, countryCode: city.country, lat, lng, lead: !inside };
    return { row, names };
  });
  // The same city from the geocoder: by either of its names, or mapped as the region it governs
  // ("東京都", a province, for Tokyo). A different town a few kilometres away keeps its row.
  const same = (k: { row: Suggestion; names: string[] }, r: PlaceResult) => near(k.row, r) && (k.names.includes(fold(r.name)) || !isSettlement(r.kind));
  const out: Suggestion[] = known.filter((k) => k.row.lead).map((k) => k.row);
  for (const r of remote) {
    if (known.some((k) => k.row.lead && same(k, r))) continue;
    out.push({ ...r, country: countryName(r.countryCode, locale) ?? r.country });
  }
  for (const k of known) if (!k.row.lead && !remote.some((r) => same(k, r))) out.push(k.row);
  return out.slice(0, LIMIT);
}

/**
 * A town named in a link without coordinates (/dates?q=Lisboa, typed or pasted into a bio), found
 * the way the where box would pick it: one of the site's own cities, else the geocoder's first.
 * `null` when there is no such town; `undefined` when the geocoder could not be asked, which is
 * not the same answer.
 */
export async function findTown(name: string, locale: "en" | "es", ask: (url: string) => Promise<Response> = fetch): Promise<{ lat: number; lng: number; name: string } | null | undefined> {
  const q = name.trim().slice(0, 80);
  if (q.length < 2) return null;
  const known = suggestPlaces(q, [], locale).find((s) => s.lead);
  if (known) return { lat: known.lat, lng: known.lng, name: known.name };
  try {
    const res = await ask(`/api/places?q=${encodeURIComponent(q)}${locale === "en" ? "&lang=en" : ""}`);
    if (!res.ok) return undefined;
    const json = (await res.json()) as { results?: unknown };
    const first = suggestPlaces(q, Array.isArray(json.results) ? (json.results as PlaceResult[]) : [], locale)[0];
    return first ? { lat: first.lat, lng: first.lng, name: first.name } : null;
  } catch {
    return undefined;
  }
}
