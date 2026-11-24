import { isLatLng, round } from "@/lib/dates/geo";
import { shareTitle } from "@/lib/share/links";

/**
 * The halfway finder's link: two towns, each its name and where it is to about a kilometre, and
 * nothing else. Opened, it shows the same answer without asking anybody for the towns again.
 */

export type Town = { lat: number; lng: number; name: string };
export const TOWN_NAME_MAX = 60;

/** A name a link may carry: plain words (no address, nothing invisible), no "~", at most 60 letters. */
const clean = (name: string): string =>
  Array.from((shareTitle(name) ?? "").replaceAll("~", " ").replace(/\s+/g, " ").trim())
    .slice(0, TOWN_NAME_MAX)
    .join("")
    .trim();

const NUMBER = /^-?\d{1,3}(\.\d{1,5})?$/;
const write = (town: Town): string => `${clean(town.name)}~${round(town.lat, 2)}~${round(town.lng, 2)}`;

/** "a=Riga~56.95~24.11&b=Lisbon~38.72~-9.14": each town's name and where it is, to about a kilometre. */
export function halfwayQuery(a: Town, b: Town): string {
  return `a=${encodeURIComponent(write(a))}&b=${encodeURIComponent(write(b))}`;
}

function read(value: string | null): Town | null {
  if (!value) return null;
  const at = value.lastIndexOf("~");
  const mid = at > 0 ? value.lastIndexOf("~", at - 1) : -1;
  if (at <= 0 || mid <= 0) return null;
  const latText = value.slice(mid + 1, at);
  const lngText = value.slice(at + 1);
  if (!NUMBER.test(latText) || !NUMBER.test(lngText)) return null;
  const lat = Number(latText);
  const lng = Number(lngText);
  if (!isLatLng(lat, lng)) return null;
  const name = clean(value.slice(0, mid));
  return name ? { name, lat, lng } : null;
}

/** The two towns of a link, or null unless both are whole: a name, and a real latitude and longitude. */
export function readHalfwayLink(search: URLSearchParams): { a: Town; b: Town } | null {
  const a = read(search.get("a"));
  const b = read(search.get("b"));
  return a && b ? { a, b } : null;
}
