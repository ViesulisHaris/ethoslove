import type { PlaceKind } from "./kinds";

/**
 * The pictures. Every idea has its own (public/dates/ideas/<id>.webp), and every kind of place has
 * one that stands for it on a tile. They were made for this site, as illustrations of a mood, in
 * one hand: warm film, nobody's face, nothing that reads as a real venue. A real place is only
 * ever shown with a real photograph of it (photos.ts); where there is none it gets the kind's
 * tile, tinted and marked with its glyph, so it cannot be mistaken for one.
 */
export const ideaImage = (id: string): string => `/dates/ideas/${id}.webp`;

const idea = (id: string) => `/dates/ideas/${id}.webp`;
const kind = (id: string) => `/dates/kinds/${id}.webp`;

export const KIND_ART: Record<PlaceKind, string> = {
  restaurant: idea("pasta-and-a-slow-walk"),
  bar: kind("bar"),
  cafe: kind("cafe"),
  dessert: idea("ice-cream-walk"),
  viewpoint: idea("sunrise-and-breakfast"),
  park: kind("park"),
  garden: idea("garden-afternoon"),
  beach: idea("beach-until-sunset"),
  picnic: idea("golden-hour-picnic"),
  museum: idea("museum-then-wine"),
  gallery: idea("gallery-hop"),
  cinema: idea("cinema-and-late-dessert"),
  theatre: idea("theatre-night"),
  planetarium: idea("stars-and-planets"),
  bookshop: idea("bookshop-and-coffee"),
  landmark: kind("landmark"),
  bowling: idea("bowling-night"),
  minigolf: idea("mini-golf-and-milkshakes"),
  arcade: idea("arcade-night"),
  escape: idea("escape-room-debrief"),
  climbing: idea("climbing-first-timers"),
  skating: idea("skating-and-hot-chocolate"),
  karaoke: idea("karaoke-duet"),
  boats: idea("boats-on-the-water"),
  zoo: kind("zoo"),
  themepark: kind("themepark"),
  spa: idea("spa-evening"),
  winery: kind("winery"),
};

/** A second picture for the commonest kinds, so two cafés side by side are not the same tile twice. */
const KIND_ART_ALT: Partial<Record<PlaceKind, string>> = {
  restaurant: kind("bar"),
  bar: idea("karaoke-duet"),
  cafe: idea("bookshop-and-coffee"),
  dessert: kind("cafe"),
  viewpoint: idea("golden-hour-picnic"),
  park: idea("ice-cream-walk"),
  garden: kind("park"),
  museum: idea("gallery-hop"),
  gallery: idea("museum-then-wine"),
  theatre: idea("cinema-and-late-dessert"),
  landmark: idea("pasta-and-a-slow-walk"),
  bookshop: kind("cafe"),
};

/** The tile for a kind of place; `seed` (a place id) picks between the two where there are two. */
export function kindImage(k: PlaceKind, seed = ""): string {
  const alt = KIND_ART_ALT[k];
  if (!alt) return KIND_ART[k];
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 2 === 0 ? KIND_ART[k] : alt;
}

export const HERO_ART = { home: "/dates/hero/home.webp", dates: "/dates/hero/dates.webp", gifts: "/dates/hero/gifts.webp", ldr: "/dates/hero/ldr.webp", games: "/dates/hero/games.webp" } as const;

/** The hero in two sizes: a phone's card gets half the pixels of a desktop's. */
export const heroSrcSet = (path: string): string => `${path.replace(".webp", "-sm.webp")} 900w, ${path} 1800w`;
