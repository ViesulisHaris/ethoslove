import { AIRPORTS, cityName, type Airport } from "./airports";

/**
 * Where they last flew from. Most people search from the same airport every time, so the flight
 * box starts there, and a surprise trip made from a preset starts its ticket there too. Kept in
 * this browser only; a blocked or private storage simply means starting blank.
 */
const KEY = "ethos:trips:from";

export function readLastFrom(): Airport | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as { city?: unknown; iata?: unknown } | null;
    if (!saved || typeof saved.city !== "string" || typeof saved.iata !== "string") return null;
    // By city and code together: Osaka and Kyoto share an airport, and both are listed.
    return AIRPORTS.find((a) => a.city === saved.city && a.iata === saved.iata) ?? null;
  } catch {
    return null;
  }
}

/** Said to every airport box on the page when one of them picks an airport: the page has one airport they leave from. */
const PICKED = "ethos:trips:from-picked";

export function saveLastFrom(airport: Airport): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ city: airport.city, iata: airport.iata }));
  } catch {}
  window.dispatchEvent(new CustomEvent<Airport>(PICKED, { detail: airport }));
}

/** Forgets the airport ("Leave the airport out"): the next visit, and another tab, open without it. */
export function clearLastFrom(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}

/**
 * Hears an airport picked in another box on this page (the hero's flight search, the matcher), so the
 * two "from" boxes on /trips say the same airport: pick in one and the other follows.
 */
export function onLastFromPicked(listen: (airport: Airport) => void): () => void {
  const handler = (e: Event) => listen((e as CustomEvent<Airport>).detail);
  window.addEventListener(PICKED, handler);
  return () => window.removeEventListener(PICKED, handler);
}

/**
 * A ticket's "from" as gift fields, in the gift's language. The coordinates are cleared with it, so
 * a draft's old override can't send the new ticket from somewhere else.
 */
export function fromFields(from: Airport, locale: "en" | "es"): { fromCity: string; fromCoords: string } {
  return { fromCity: cityName(from, locale).slice(0, 40), fromCoords: "" };
}
