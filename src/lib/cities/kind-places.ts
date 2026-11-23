import { guessCost } from "@/lib/dates/cost";
import type { DateKind } from "@/lib/dates/date-kinds";
import type { PlaceKind } from "@/lib/dates/kinds";
import type { Place } from "@/lib/dates/places";
import { rankPlaces, type Ranked } from "@/lib/dates/rank";

/** How many places a city-by-kind page names, and how many of one kind at most. */
// Six, not eight: with the page's ideas and questions, eight names took New York's cheap page past 300 words (dates-D8).
export const KIND_PLACES = 6;
const PER_KIND = 3;
/** What the "where to meet" heading names: cafés, bookshops and galleries (a row of chocolatiers is not a place to meet). */
const MEETING: readonly PlaceKind[] = ["cafe", "bookshop", "gallery"];
/** A name that is only what the place is ("Books", "Gallery") says nothing a reader can find it by. */
const GENERIC = new Set(["books", "bookshop", "bookstore", "gallery", "art gallery", "park", "garden", "cafe", "café", "coffee", "coffee shop"]);
/**
 * Coffee and tea chains. On a list chosen for a first date a Starbucks reads as filler, and the map
 * tiles the city pages are built from carry no brand tag, so a chain is known by its name. Only
 * for a café: "Paul Kasmin Gallery" is not the bakery. Matched at the start ("Starbucks Reserve").
 */
const CHAINS = ["starbucks", "costa", "costa coffee", "pret", "pret a manger", "caffe nero", "cafe nero", "dunkin", "tim hortons", "blank street", "joe & the juice", "black sheep coffee", "gail's", "le pain quotidien", "kung fu tea", "gong cha", "chatime", "tiger sugar", "peet's coffee", "la colombe", "bluestone lane", "joe coffee"];
/**
 * A chain whose name is also a person's: only the whole name or the name with its trade ("Paul
 * Bakery"), alone or with the branch after it in brackets or a dash with a space before it ("Paul
 * (Covent Garden)", "Paul - Covent Garden"), never "Paul Rothe & Son" or "Paul-Henri Café" (dates-N3-2).
 */
const NAMED_CHAINS = ["paul", "paul bakery", "paul boulangerie", "boulangerie paul"];
const namedChain = (name: string): boolean =>
  NAMED_CHAINS.some((chain) => name === chain || (name.startsWith(chain) && /^(\s*\(|\s+[-–—])/.test(name.slice(chain.length))));
/**
 * Squares the map files as parks that are paving, traffic and cinemas, not a lawn to sit on. Named
 * one by one: a square with a garden in the middle (Russell Square, Soho Square) is filed the same
 * way and is exactly what the list is for.
 */
const PAVED_SQUARES = ["leicester square", "trafalgar square", "times square", "duffy square", "herald square", "parliament square", "piccadilly circus"];
/** Galleries that charge to walk in, though a gallery usually does not (cost.ts): never under "usually free". */
const PAID = ["courtauld", "hayward gallery", "barbican art gallery", "dulwich picture gallery", "queen's gallery", "photographers' gallery", "neue galerie", "frick", "international center of photography"];
/** Sports grounds the map files as parks: the basketball courts are not a walk for two. */
const SPORTS = /\b(courts?|pitch(es)?|playground|ball ?fields?|skate ?park|tennis|basketball|handball|bocce)\b/;

/** Lower case, accents and curly quotes plain, so "Caffè Nero" and "GAIL’s" match. */
const plain = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'")
    .trim()
    .toLowerCase();

/**
 * True for a place no hand-picked list should name: a chain café, a gallery that charges, a sports
 * ground, or a paved square the map calls a park (Leicester Square is paving and cinemas, not a lawn).
 */
export function leftOff(place: Pick<Place, "name" | "kind">): boolean {
  const name = plain(place.name);
  if (place.kind === "cafe" && (namedChain(name) || CHAINS.some((chain) => name === chain || name.startsWith(`${chain} `) || name.startsWith(`${chain}(`)))) return true;
  if (PAID.some((paid) => name.includes(paid))) return true;
  if (SPORTS.test(name)) return true;
  return (place.kind === "park" || place.kind === "garden") && PAVED_SQUARES.includes(name);
}

/**
 * The places of a city that belong to a kind of date, best first by the dates map's own ranking,
 * only places with a name on the door, one of any name, a few of each kind of place at most (the
 * shape of topCityPlaces in ./places.ts). `cheap`: the ones that usually cost nothing to walk into
 * (cost.ts). `first-date`: where to meet. Any other kind has no list.
 */
export function kindPlaces(kind: DateKind, places: Place[], count = KIND_PLACES): Ranked[] {
  // A "landmark" is whatever the map calls an attraction, a sewer lamp and a private house among them:
  // only one with an encyclopedia entry is worth naming on a page.
  const free = (p: Place) => guessCost(p) === 0 && (p.kind !== "landmark" || p.notable);
  const fits = kind === "cheap" ? free : kind === "first-date" ? (p: Place) => MEETING.includes(p.kind) : null;
  if (!fits) return [];
  const names = new Set<string>();
  const taken = new Map<PlaceKind, number>();
  const picked: Ranked[] = [];
  for (const place of rankPlaces(places, {})) {
    if (picked.length === count) break;
    const name = place.name.trim().toLowerCase();
    if (!place.named || GENERIC.has(name) || leftOff(place) || !fits(place) || names.has(name) || (taken.get(place.kind) ?? 0) >= PER_KIND) continue;
    names.add(name);
    taken.set(place.kind, (taken.get(place.kind) ?? 0) + 1);
    picked.push(place);
  }
  return picked;
}
