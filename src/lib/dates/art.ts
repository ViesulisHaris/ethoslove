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

/**
 * How wide each full-size hero really is; every -sm file is half. The home hero is the one portrait
 * picture (1350 by 1800): described as 1800 wide, the browser thought the 675-pixel small file was
 * sharp enough for a 432-pixel box on a 2x screen, and drew it soft.
 */
const HERO_WIDTH: Partial<Record<string, number>> = { [HERO_ART.home]: 1350 };

/** The hero in two sizes, described by their real widths so the browser picks the sharp one it needs. */
export const heroSrcSet = (path: string): string => {
  const width = HERO_WIDTH[path] ?? 1800;
  return `${path.replace(".webp", "-sm.webp")} ${width / 2}w, ${path} ${width}w`;
};

/**
 * `sizes` for a landscape hero, from the widest layout down, ending with a phone's full width. A
 * 2.6–3x phone asks for ~1100 px for a full-width card, and the next file up from 900 px is 1800 px:
 * four times the bytes (the four doors on the home page came to 565 KB instead of 176 KB) for detail
 * nobody can see in a photo that size, and there is no file in between. Past 2.2x a phone is told its
 * slot is 300px, so it takes the 900 px file, which still puts ~2.4 pixels in each of its own.
 */
export const heroSizes = (...wider: string[]): string => [...wider, "(max-width: 639px) and (min-resolution: 2.2dppx) 300px", "100vw"].join(", ");
