/**
 * The site's rose and its deeper shade as plain hexes, for the few places a stylesheet's names
 * cannot reach: a map's paint (MapLibre takes a colour, not a CSS variable), a canvas's ink, a
 * colour handed to another player's screen. Everything else asks for the token (`text-rose`,
 * `var(--color-rose)`).
 *
 * These are `--brand-rose-ui` and `--brand-rose-ui-deep` in src/app/globals.css, and
 * tests/unit/site-paper.test.ts holds the two to each other. The rose turned a shade deeper with
 * the cream paper on 22 Nov 2026; the old one (#d6336c) stayed written by hand in a map's route, a
 * suit of cards, a pen and a wheel, so the site had two roses (the review of that day).
 */
export const BRAND_ROSE = "#bd2a5e";
export const BRAND_ROSE_DEEP = "#a31f52";
