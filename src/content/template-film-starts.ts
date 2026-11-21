/**
 * Where each gift's preview film really begins (public/templates/<slug>/preview.webm), in seconds.
 *
 * The films were recorded from the demo page, and most of them open on that page's own bar ("All
 * templates … Use this template") or on a blank white frame, for a second or so; two keep the bar
 * for four. On the gallery's cards nobody sees it: the film plays on hover, small. In the phone
 * lying in a gift page's hero it is the first thing the page shows, cut off at the screen's edge,
 * so there the film starts after it and loops back to the same point.
 *
 * Measured, not guessed (21 Nov 2026): every tenth of a second of every film was read for the
 * bar's red button on its dark strip, and for a white frame; the number is the last tenth either
 * was seen, plus three tenths. A film not listed starts clean. Record a film again and its number
 * here is stale: measure it again, or take it out once the recording has no bar in it.
 *
 * Five are set by hand, later than measured: Cap Toss, Evergreen, Front Page, Pack Your Bags and
 * Spooky Season. Their picture is drawn smaller in the phone so its title is whole
 * (content/template-page-themes.ts, `cover.zoom`), over a soft copy of the cover, which is light.
 * Every film opens on two dark seconds ("someone made this for you"), and dark between two light
 * bands looked like a film in the wrong shape; these start where the gift's own page comes up.
 */
export const TEMPLATE_FILM_STARTS: Record<string, number> = {
  arcade: 1.3,
  balloons: 1.3,
  "birthday-cinema": 1.2,
  bloom: 1.5,
  bouquet: 1.3,
  "cap-toss": 2.5,
  constellations: 1.5,
  coquette: 1.3,
  digicam: 0.3,
  evergreen: 2.2,
  "fall-for-you": 0.3,
  fireside: 1.5,
  "fortune-cookie": 1.2,
  "front-page": 2.5,
  "frosted-window": 0.3,
  garden: 1.8,
  "gingerbread-house": 0.9,
  halfway: 4.2,
  "haunted-house": 0.4,
  "jar-of-reasons": 1.3,
  kawaii: 1.3,
  keepsake: 1.3,
  "light-the-candles": 0.4,
  "midnight-countdown": 1.2,
  museum: 1.3,
  "nice-list": 0.8,
  "our-timeline": 1.5,
  "pack-your-bags": 2.2,
  "paper-crane": 1.5,
  passport: 1.2,
  "popup-card": 1.6,
  "recipe-box": 1.2,
  scrapbook: 1.1,
  "scratch-card": 1.7,
  seance: 0.3,
  sketchbook: 1.3,
  "snow-globe": 4.4,
  "spooky-season": 2.2,
  "sticker-bomb": 1.2,
  "string-the-lights": 0.4,
  "text-thread": 1.3,
  "the-council": 1.3,
  "the-letter": 1.3,
  "the-toast": 1.2,
  "trick-or-treat": 1.3,
  unwrapped: 0.7,
  vinyl: 1.3,
  wishbone: 0.5,
  xoxo: 1.3,
};

/** The second a gift's preview film starts from; 0 for one that starts clean. */
export function templateFilmStart(slug: string): number {
  return Object.hasOwn(TEMPLATE_FILM_STARTS, slug) ? TEMPLATE_FILM_STARTS[slug] : 0;
}
