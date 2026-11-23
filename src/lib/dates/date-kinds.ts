import { ideaById, type DateIdea } from "./ideas";

/** Every kind the brief names, in its order of demand. A kind is only a page when it has enough ideas (DATE_KINDS). */
export const DATE_KIND_IDS = ["first-date", "fun", "cheap", "romantic", "double-date", "winter", "at-home", "rainy-day"] as const;
export type DateKind = (typeof DATE_KIND_IDS)[number];

/** A kind with fewer ideas than this gets no page (BRIEF-dates.md 2a). */
export const MIN_KIND_IDEAS = 8;

/** The ideas that honestly fit each kind, in the order its page shows them. */
export const KIND_IDEAS: Record<DateKind, readonly string[]> = {
  "first-date": ["bookshop-and-coffee", "ice-cream-walk", "gallery-hop", "mini-golf-and-milkshakes", "bowling-night", "arcade-night", "museum-then-wine", "garden-afternoon", "skating-and-hot-chocolate"],
  fun: ["mini-golf-and-milkshakes", "bowling-night", "arcade-night", "escape-room-debrief", "karaoke-duet", "climbing-first-timers", "boats-on-the-water", "skating-and-hot-chocolate"],
  cheap: ["gallery-hop", "golden-hour-picnic", "sunrise-and-breakfast", "garden-afternoon", "bookshop-and-coffee", "ice-cream-walk", "stars-and-planets", "mini-golf-and-milkshakes"],
  romantic: ["golden-hour-picnic", "pasta-and-a-slow-walk", "stars-and-planets", "beach-until-sunset", "sunrise-and-breakfast", "boats-on-the-water", "theatre-night", "spa-evening", "garden-afternoon", "skating-and-hot-chocolate"],
  "double-date": ["bowling-night", "escape-room-debrief", "mini-golf-and-milkshakes", "karaoke-duet", "arcade-night", "boats-on-the-water", "pasta-and-a-slow-walk", "golden-hour-picnic"],
  winter: ["skating-and-hot-chocolate", "spa-evening", "cinema-and-late-dessert", "stars-and-planets", "bookshop-and-coffee", "museum-then-wine", "theatre-night", "bowling-night", "climbing-first-timers"],
  // Nothing in ideas.ts happens at home: every idea is made of places. No ideas, so no page.
  "at-home": [],
  "rainy-day": ["bookshop-and-coffee", "museum-then-wine", "gallery-hop", "cinema-and-late-dessert", "bowling-night", "arcade-night", "escape-room-debrief", "climbing-first-timers", "skating-and-hot-chocolate", "karaoke-duet", "spa-evening", "theatre-night"],
};

/** The cheap page's two sections: the four that can cost nothing, then the four for pocket change. */
export const CHEAP_FREE: readonly string[] = ["gallery-hop", "golden-hour-picnic", "sunrise-and-breakfast", "garden-afternoon"];

/**
 * What a kind's page never plans past, its own ideas or not: the cheap page's planner giving way to
 * an escape room is not a cheap date. A budget the visitor chose above it still counts.
 */
export const KIND_MAX_BUDGET: Partial<Record<DateKind, 0 | 1 | 2 | 3>> = { cheap: 1 };

export const kindIdeas =(kind: DateKind): DateIdea[] => KIND_IDEAS[kind].flatMap((id) => ideaById(id) ?? []);
export const fitsKind = (idea: Pick<DateIdea, "id">, kind: DateKind): boolean => KIND_IDEAS[kind].includes(idea.id);

/** The kinds with a page. */
export const DATE_KINDS: DateKind[] = DATE_KIND_IDS.filter((kind) => kindIdeas(kind).length >= MIN_KIND_IDEAS);
export const getDateKind = (slug: string): DateKind | undefined => DATE_KINDS.find((kind) => kind === slug);

/** A kind inside a city, only where it is searched (SEO-PICTURE.md section 5). Every other pair is a 404. */
export const CITY_KIND_PAGES = [
  { city: "new-york", kind: "cheap" },
  { city: "new-york", kind: "first-date" },
  { city: "london", kind: "first-date" },
  { city: "london", kind: "cheap" },
] as const satisfies readonly { city: string; kind: DateKind }[];
export const isCityKindPage = (city: string, kind: string): boolean => CITY_KIND_PAGES.some((p) => p.city === city && p.kind === kind);
