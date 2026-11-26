import { ADVENT_CALENDAR_LIVE } from "@/templates/held";

/**
 * Where each gift's preview film really begins (public/templates/<slug>/preview.webm), in seconds.
 *
 * The films were recorded from the demo page (scripts/capture-thumbnails.mjs), and a recording opens
 * on things that are not the gift: a blank frame while the page loads, the demo page's own bar ("All
 * templates … Use this template") for a second or so (two films keep it for four), and then the
 * cover every gift opens on: "someone made this for you", a name, "turn your sound on", for two
 * dark seconds. On the gallery's cards nobody minds: the film plays on hover, small. In the phone
 * lying in a gift page's hero the film is silent and is the first thing the page shows, so "turn your
 * sound on" under a play button was what most pages opened on (the review of 21 Nov 2026). There
 * the film starts where the gift's own first screen is up, and loops back to the same point.
 *
 * Measured, not guessed: scripts/film-starts.mjs reads every tenth of a second of every film for
 * the blank frame, the bar and the cover, and prints this table. Five gifts open on a drawn cover
 * of their own (Balloons, Fireside, Kawaii, The Toast, Trick or Treat: an envelope or a present,
 * "For Ana"), which is their first screen: theirs start just past the bar. Record a film again and
 * its number here is stale: run the script again. tests/unit/template-film-starts.test.ts holds
 * every film to a row.
 */
export const TEMPLATE_FILM_STARTS: Record<string, number> = {
  // Only while it is in the gallery (src/templates/held.ts).
  ...(ADVENT_CALENDAR_LIVE ? { "advent-calendar": 4.5 } : {}),
  arcade: 2.7,
  "autumn-reel": 2.5,
  balloons: 1.3,
  "bat-swarm": 2.6,
  "be-my-boo": 2.3,
  "birthday-cinema": 2.6,
  bloom: 2.8,
  bouquet: 2.7,
  "cap-toss": 2.7,
  cauldron: 2.5,
  constellations: 2.8,
  coquette: 2.6,
  "dark-romance": 2.4,
  digicam: 2.6,
  evergreen: 2.4,
  "fall-for-you": 2.6,
  "favorite-person": 2.4,
  fireside: 1.4,
  "fortune-cookie": 2.6,
  "front-page": 2.7,
  "frosted-window": 2.8,
  garden: 2.5,
  "gingerbread-house": 4.1,
  halfway: 4.2,
  "haunted-house": 2.9,
  "jack-o-lantern": 2.6,
  "jar-of-reasons": 2.6,
  kawaii: 1.3,
  keepsake: 2.7,
  "light-the-candles": 2.8,
  "midnight-countdown": 2.5,
  museum: 2.7,
  "music-box": 2.4,
  "nice-list": 3.7,
  "on-repeat": 2.4,
  "our-timeline": 2.7,
  "pack-your-bags": 2.7,
  "paper-crane": 2.6,
  "party-animals": 2.4,
  passport: 2.8,
  "photo-booth": 2.5,
  picnic: 2.9,
  "popup-card": 2.9,
  "recipe-box": 2.6,
  scrapbook: 2.5,
  "scratch-card": 2.5,
  seance: 2.7,
  sketchbook: 2.7,
  "snow-globe": 4.4,
  "spooky-season": 2.4,
  "sticker-bomb": 2.5,
  "string-the-lights": 2.8,
  "text-thread": 2.6,
  "the-council": 2.7,
  "the-letter": 2.7,
  "the-toast": 1.2,
  "trick-or-treat": 1.3,
  unwrapped: 3.8,
  vinyl: 2.6,
  wishbone: 3.3,
  // Past its own envelope too: mid-open, cropped into a gallery card, it read as a broken letter (the owner, 26 Nov 2026).
  xoxo: 4.4,
};

/** The second a gift's preview film starts from; 0 for one that starts clean. */
export function templateFilmStart(slug: string): number {
  return Object.hasOwn(TEMPLATE_FILM_STARTS, slug) ? TEMPLATE_FILM_STARTS[slug] : 0;
}
