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

export const kindImage = (k: PlaceKind): string => KIND_ART[k];

export const HERO_ART = { home: "/dates/hero/home.webp", dates: "/dates/hero/dates.webp", gifts: "/dates/hero/gifts.webp", ldr: "/dates/hero/ldr.webp", games: "/dates/hero/games.webp" } as const;
