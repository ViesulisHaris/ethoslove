import type { CSSProperties } from "react";

/**
 * A gift's page in that gift's own colours (the owner, 21 Nov 2026: "each gift has a similar thing
 * but in each of its colors"). Every template page has the same layout; this table gives it its
 * palette. The Letter's is the owner's mock-up; the others were picked by hand from each
 * template's poster, its accent and the scene it plays in, and all of them are in the mock-up's
 * tone (the owner again: "like its light on the eyes"): a pale, low-saturation tint of the gift's
 * hue at about The Letter's lightness, never white, never grey and never dark, so a night-sky gift
 * is a pale mist of its blue and a Halloween one a pumpkin cream; ink and body a deep, soft version
 * of that hue leaning to warm brown; one accent, the gift's signature colour taken down to a muted
 * deep tone like the mock-up's wine; and the footer the only dark area. Together they should read
 * as one set of pastel stationery.
 *
 * - `ground`: the page. `raised`: a card on it. `band`: the deeper band of "The experience".
 * - `ink`: headings. `body`: sentences and labels.
 * - `accent`: the one strong colour, for the main button and small marks; `onAccent` is the type on
 *   it (cream unless said).
 * - `badge`: the fill of a step's number, with the number in `ink`.
 * - `footer` and `footerText`: the site footer while this page is open.
 * - `flowers`: which colourway of the page art goes with it (content/page-art.ts).
 *
 * The page sets these as CSS variables (pageThemeStyle below, read as --page-* in globals.css), so
 * no component names a colour. tests/unit/template-page-themes.test.ts holds every palette to WCAG
 * AA and fails when a template in the registry has none.
 */
export type Flowers = "ivory" | "blush" | "wine" | "moonlight";

export type PageTheme = {
  ground: string;
  raised: string;
  band: string;
  ink: string;
  body: string;
  accent: string;
  onAccent?: string;
  badge: string;
  footer: string;
  footerText: string;
  flowers: Flowers;
};

/** Cream type on the accent, unless a palette's accent is a light one. */
export const ON_ACCENT = "#fffaf5";

/** For a template added later, until someone picks its colours: the site's own paper, ink and rose. */
export const DEFAULT_PAGE_THEME: PageTheme = {
  ground: "#f3e8da",
  raised: "#faf4ea",
  band: "#e9d9c5",
  ink: "#24121b",
  body: "#5d4652",
  accent: "#b0245a",
  badge: "#e3bfc9",
  footer: "#2a0f1f",
  footerText: "#d9c6cd",
  flowers: "blush",
};

export const TEMPLATE_PAGE_THEMES: Record<string, PageTheme> = {
  // The owner's mock-up: warm sand, wine, ivory lilies. Every other palette is held to its softness.
  "the-letter": { ground: "#f1e3d3", raised: "#f7ecdf", band: "#e8d3bd", ink: "#2b1a14", body: "#6a5546", accent: "#7b1d3a", badge: "#c9a585", footer: "#2d0e18", footerText: "#cdb7b0", flowers: "ivory" },

  // Paper and cream.
  balloons: { ground: "#f5e6e3", raised: "#faf0ee", band: "#ecd3d1", ink: "#33202a", body: "#6a525d", accent: "#a23a5e", badge: "#dcb872", footer: "#3a1826", footerText: "#dcc4c9", flowers: "blush" },
  "popup-card": { ground: "#f4eadc", raised: "#f9f2e8", band: "#e9d9c6", ink: "#33272a", body: "#675856", accent: "#a8475a", badge: "#dfb59a", footer: "#352329", footerText: "#d8c8c6", flowers: "blush" },
  sketchbook: { ground: "#f1ebdd", raised: "#f8f3e9", band: "#e4dcc8", ink: "#2e2a2a", body: "#5f5955", accent: "#8f3a4c", badge: "#cdbd9f", footer: "#2e2628", footerText: "#cfc6c3", flowers: "ivory" },
  scrapbook: { ground: "#f5e5e0", raised: "#faf0ec", band: "#ebd2cc", ink: "#35212a", body: "#6c5359", accent: "#a2405a", badge: "#d6b1ae", footer: "#3a1a26", footerText: "#dcc4c9", flowers: "blush" },
  "favorite-person": { ground: "#f4e8e2", raised: "#faf2ee", band: "#e9d5ce", ink: "#2f1a1e", body: "#685255", accent: "#9c2f4f", badge: "#d2b0a6", footer: "#34141f", footerText: "#dcc3c8", flowers: "blush" },
  "our-timeline": { ground: "#f1e8da", raised: "#f8f1e6", band: "#e4d7c2", ink: "#262830", body: "#5b5751", accent: "#2e4a62", badge: "#cdb38d", footer: "#1c2a38", footerText: "#c3cdd6", flowers: "ivory" },
  museum: { ground: "#efe6d8", raised: "#f7f0e5", band: "#e0d3bf", ink: "#2a2420", body: "#5f554d", accent: "#6e1f2b", badge: "#c3aa7a", footer: "#2b1c1c", footerText: "#d2c4bb", flowers: "ivory" },
  bouquet: { ground: "#f2e7d8", raised: "#f8f0e5", band: "#e6d4bd", ink: "#33211c", body: "#69544a", accent: "#9c3348", badge: "#c7a97d", footer: "#36161d", footerText: "#dcc3c2", flowers: "blush" },
  "paper-crane": { ground: "#eee6dc", raised: "#f6f0e8", band: "#dfd3c4", ink: "#2f2924", body: "#5f554b", accent: "#8a5a44", badge: "#cbb9a3", footer: "#2f2924", footerText: "#d0c5b7", flowers: "ivory" },

  // Pink.
  coquette: { ground: "#f7e0e6", raised: "#fceef1", band: "#efccd6", ink: "#3b1a26", body: "#704d58", accent: "#9f2d55", badge: "#dca2b3", footer: "#3d1424", footerText: "#e3c2cc", flowers: "blush" },
  digicam: { ground: "#f6e1e4", raised: "#fbeff1", band: "#edcbd3", ink: "#2e1a22", body: "#6c5059", accent: "#a02f5c", badge: "#cfa5af", footer: "#33121f", footerText: "#dfc3cb", flowers: "blush" },
  "music-box": { ground: "#f6e5e1", raised: "#fbf0ed", band: "#ecd0ce", ink: "#3a1a26", body: "#6f5159", accent: "#8c2a4a", badge: "#d6b673", footer: "#3b1224", footerText: "#dfc2c9", flowers: "blush" },
  kawaii: { ground: "#f9e1e8", raised: "#fdeff3", band: "#f2cbd8", ink: "#40192b", body: "#754a5d", accent: "#a82d60", badge: "#e9a5bd", footer: "#45152b", footerText: "#ebc3d2", flowers: "blush" },
  "on-repeat": { ground: "#f3dfea", raised: "#f9edf3", band: "#e5cde3", ink: "#3a1a30", body: "#6c4c66", accent: "#9a2c62", badge: "#cfa6d8", footer: "#3b1636", footerText: "#dfc3da", flowers: "blush" },
  "jar-of-reasons": { ground: "#f6e6e7", raised: "#fbf1f2", band: "#edd3d8", ink: "#2c2428", body: "#655459", accent: "#2f6b4f", badge: "#e0b3bd", footer: "#1f3a2d", footerText: "#c4d6cb", flowers: "blush" },
  bloom: { ground: "#f6e0d5", raised: "#fbede5", band: "#edc9bb", ink: "#3a1c1c", body: "#704d47", accent: "#a03852", badge: "#a9c592", footer: "#3d1820", footerText: "#e3c4c0", flowers: "blush" },
  "party-animals": { ground: "#f3e5d9", raised: "#f9efe7", band: "#e8d2c5", ink: "#2c1c1a", body: "#68534d", accent: "#a62b5b", badge: "#e0ad5a", footer: "#32151f", footerText: "#dcc3c5", flowers: "blush" },
  picnic: { ground: "#f6e4e6", raised: "#fbf0f1", band: "#edd0d5", ink: "#2f2420", body: "#63534c", accent: "#a2345a", badge: "#b5cb8f", footer: "#26351f", footerText: "#cdd6c0", flowers: "blush" },

  // Red on cream.
  xoxo: { ground: "#f5e6de", raised: "#faf0ea", band: "#ebd2ca", ink: "#2f1216", body: "#6c4c4d", accent: "#8f1a2c", badge: "#d1a99d", footer: "#3a0a14", footerText: "#dfbfc0", flowers: "wine" },
  "photo-booth": { ground: "#f1e1d6", raised: "#f8ede4", band: "#e6cbbf", ink: "#2f1418", body: "#6a4c49", accent: "#96202c", badge: "#c59f8d", footer: "#3a0d16", footerText: "#dcbfbc", flowers: "wine" },
  wishbone: { ground: "#f5e1d4", raised: "#faede4", band: "#ebcab8", ink: "#33180f", body: "#6f4c3b", accent: "#9a2b22", badge: "#d2a97c", footer: "#3d1811", footerText: "#e0c3b6", flowers: "ivory" },
  "recipe-box": { ground: "#f5e8d8", raised: "#faf1e6", band: "#ecd3c2", ink: "#33201a", body: "#6b5245", accent: "#984420", badge: "#dab07a", footer: "#3a1c12", footerText: "#dfc6b6", flowers: "ivory" },
  unwrapped: { ground: "#f4e3dc", raised: "#f9eee9", band: "#e9cdc4", ink: "#331a14", body: "#6c4d44", accent: "#a02722", badge: "#d8b98a", footer: "#2e120c", footerText: "#dcc2b6", flowers: "wine" },
  "birthday-cinema": { ground: "#f5e2da", raised: "#faeee8", band: "#ebcbc2", ink: "#3a1418", body: "#6f4a48", accent: "#8a1c28", badge: "#e3c173", footer: "#3d0f17", footerText: "#e0c0bb", flowers: "wine" },
  "fortune-cookie": { ground: "#f5e4d0", raised: "#faeedf", band: "#ecd0b2", ink: "#3a1712", body: "#6e4d3c", accent: "#8c1f1c", badge: "#e3bd6a", footer: "#4a0f11", footerText: "#e6c4b6", flowers: "wine" },
  "dark-romance": { ground: "#f0e0e2", raised: "#f7ecee", band: "#e2cace", ink: "#2f121b", body: "#684a52", accent: "#6e1428", badge: "#c9a0a8", footer: "#2a0d16", footerText: "#d6b9be", flowers: "wine" },

  // Kraft, wood and biscuit.
  keepsake: { ground: "#efe2cd", raised: "#f6ecdb", band: "#e2cfb1", ink: "#2e1e16", body: "#665241", accent: "#832a2a", badge: "#bd9f79", footer: "#2f1512", footerText: "#d5bfae", flowers: "ivory" },
  "gingerbread-house": { ground: "#f3e4cf", raised: "#f9eedd", band: "#e6cfae", ink: "#3a2212", body: "#6a4f35", accent: "#9c2228", badge: "#c7965a", footer: "#3a1f10", footerText: "#dcc4a8", flowers: "ivory" },
  "the-council": { ground: "#f2e7d4", raised: "#f8f0e1", band: "#e5d3b3", ink: "#2e1f12", body: "#67533b", accent: "#96301f", badge: "#c7a268", footer: "#3b230f", footerText: "#dcc6a6", flowers: "ivory" },
  vinyl: { ground: "#f2e3cb", raised: "#f8eddb", band: "#e5cfac", ink: "#2e2116", body: "#66523d", accent: "#8f4318", badge: "#a9b592", footer: "#2a211a", footerText: "#d6c7b3", flowers: "ivory" },
  "front-page": { ground: "#f0e5d3", raised: "#f7efe2", band: "#e0cba9", ink: "#2a2018", body: "#5c5247", accent: "#8f2f26", badge: "#c7a172", footer: "#2a1d12", footerText: "#d6c6b0", flowers: "ivory" },
  "scratch-card": { ground: "#f3e6cf", raised: "#faf0df", band: "#ead3ac", ink: "#33240f", body: "#675337", accent: "#7d5a12", badge: "#dab45f", footer: "#2e2010", footerText: "#d9c8a6", flowers: "ivory" },
  "nice-list": { ground: "#f1e5cc", raised: "#f8efdc", band: "#e4d2aa", ink: "#33200f", body: "#665031", accent: "#9c2420", badge: "#a9c49c", footer: "#3a2012", footerText: "#dcc8a8", flowers: "wine" },
  "the-toast": { ground: "#f1e6d2", raised: "#f8efdf", band: "#e3d1b0", ink: "#2b1822", body: "#665159", accent: "#5a2338", badge: "#dab45f", footer: "#2b1822", footerText: "#d3c2c7", flowers: "ivory" },

  // Autumn and pumpkin.
  "spooky-season": { ground: "#f6e3cd", raised: "#fbeedd", band: "#eccfae", ink: "#2e1c10", body: "#6a523d", accent: "#9a4513", badge: "#e3a862", footer: "#2f1a10", footerText: "#dcc6b0", flowers: "wine" },
  "be-my-boo": { ground: "#f4e9da", raised: "#faf2e7", band: "#ead7bf", ink: "#2a211c", body: "#61574d", accent: "#a04a16", badge: "#e6ab6c", footer: "#2a1d17", footerText: "#d5c8bb", flowers: "ivory" },
  "fall-for-you": { ground: "#f0dfc8", raised: "#f7ebd9", band: "#e2c7a3", ink: "#33200f", body: "#684e34", accent: "#8f4019", badge: "#cf9a5a", footer: "#3a2110", footerText: "#dcc5a6", flowers: "wine" },
  "autumn-reel": { ground: "#f2decd", raised: "#f8ebde", band: "#e6c4aa", ink: "#3a180c", body: "#704c39", accent: "#8a3413", badge: "#d2996a", footer: "#4a1d0d", footerText: "#e3c4b0", flowers: "wine" },
  "jack-o-lantern": { ground: "#f7e2c9", raised: "#fbeeda", band: "#eecda6", ink: "#36200f", body: "#6b5034", accent: "#a34f12", badge: "#f0b660", footer: "#2b160b", footerText: "#dfc5a8", flowers: "wine" },
  seance: { ground: "#eee3df", raised: "#f5eeeb", band: "#dfcfc9", ink: "#2e1c18", body: "#63504a", accent: "#7a4a12", badge: "#e0b56c", footer: "#24140f", footerText: "#d2c2b8", flowers: "wine" },
  "light-the-candles": { ground: "#efe2e6", raised: "#f6eef0", band: "#e1cdd4", ink: "#33202c", body: "#66515c", accent: "#9a4a16", badge: "#e9b877", footer: "#2a1626", footerText: "#d3c1cc", flowers: "wine" },

  // Green.
  garden: { ground: "#eef0dc", raised: "#f6f7ea", band: "#dde3c6", ink: "#2a2e1e", body: "#596050", accent: "#9c3348", badge: "#b3c194", footer: "#233022", footerText: "#c9d2bd", flowers: "blush" },
  evergreen: { ground: "#e8ead7", raised: "#f1f3e5", band: "#d7dcc0", ink: "#232a1a", body: "#515c46", accent: "#3f5a34", badge: "#b0bd97", footer: "#1c2a18", footerText: "#c5d0b8", flowers: "ivory" },
  "sticker-bomb": { ground: "#e4eee2", raised: "#eef5ed", band: "#cfe0cf", ink: "#1c3022", body: "#455d4c", accent: "#a02b58", badge: "#9cc4ac", footer: "#153423", footerText: "#bdd3c4", flowers: "blush" },
  cauldron: { ground: "#e8ede0", raised: "#f1f5ea", band: "#d6dfca", ink: "#1f2e22", body: "#4f5f50", accent: "#8a2a6a", badge: "#e7a8d0", footer: "#14241b", footerText: "#bfcfc2", flowers: "wine" },
  "snow-globe": { ground: "#e2eee7", raised: "#eef6f1", band: "#cfe0d6", ink: "#1f2f2a", body: "#4e615a", accent: "#2f6b4f", badge: "#b9d3e3", footer: "#16271f", footerText: "#bfd0c7", flowers: "ivory" },

  // Sky, frost and steel.
  halfway: { ground: "#e6eef4", raised: "#f0f5f9", band: "#d3e0ea", ink: "#23303d", body: "#505e6b", accent: "#a8305a", badge: "#f0bccb", footer: "#1d3142", footerText: "#c2d3df", flowers: "blush" },
  passport: { ground: "#e3ebf2", raised: "#eef4f8", band: "#cfdce8", ink: "#1c2740", body: "#4c5c71", accent: "#24365f", badge: "#dab45f", footer: "#141f33", footerText: "#c2cedd", flowers: "moonlight" },
  "frosted-window": { ground: "#e4ecf0", raised: "#eff5f7", band: "#d2dfe5", ink: "#2a2f36", body: "#525f6a", accent: "#8f2420", badge: "#a9c0cd", footer: "#1c2630", footerText: "#c4cfd8", flowers: "ivory" },
  "string-the-lights": { ground: "#e4eaf1", raised: "#eff3f8", band: "#d1dbe7", ink: "#20293f", body: "#505b73", accent: "#96242a", badge: "#e3c173", footer: "#101a36", footerText: "#bdc6dc", flowers: "ivory" },
  "pack-your-bags": { ground: "#e2eaf0", raised: "#eef3f7", band: "#cfdae3", ink: "#222a38", body: "#515d6b", accent: "#a34a32", badge: "#f0c36e", footer: "#161c26", footerText: "#bfc7d2", flowers: "moonlight" },
  "text-thread": { ground: "#e1ecec", raised: "#edf4f4", band: "#cddede", ink: "#1f3033", body: "#4c6064", accent: "#2c5766", badge: "#a9cbd2", footer: "#132427", footerText: "#b9cdd0", flowers: "moonlight" },
  fireside: { ground: "#e4e8ef", raised: "#eff2f6", band: "#d1d8e3", ink: "#232a38", body: "#535c6c", accent: "#a0501a", badge: "#e6ab6c", footer: "#17202e", footerText: "#bcc5d2", flowers: "wine" },

  // Night skies, as a pale mist of their blue and violet.
  constellations: { ground: "#e6e4f1", raised: "#f0eff7", band: "#d5d2e7", ink: "#262340", body: "#57546f", accent: "#2f2f66", badge: "#e3c173", footer: "#17162e", footerText: "#bfbdd6", flowers: "moonlight" },
  "midnight-countdown": { ground: "#e9e3ee", raised: "#f2eef5", band: "#d9d0e2", ink: "#2b2238", body: "#5c536c", accent: "#4a2f66", badge: "#e3c173", footer: "#1c1528", footerText: "#c5bdd2", flowers: "moonlight" },
  "cap-toss": { ground: "#e3e7f2", raised: "#eef0f8", band: "#d0d6e9", ink: "#1f2647", body: "#505877", accent: "#27336b", badge: "#dab45f", footer: "#121a3c", footerText: "#bcc3de", flowers: "moonlight" },
  "bat-swarm": { ground: "#ebe5f3", raised: "#f4f0f9", band: "#dbd1ea", ink: "#2a2145", body: "#5b5275", accent: "#4f3a8a", badge: "#e8dfb8", footer: "#1c1538", footerText: "#c6bedd", flowers: "moonlight" },
  "trick-or-treat": { ground: "#efe2ee", raised: "#f6eef5", band: "#e0cde0", ink: "#33203a", body: "#655068", accent: "#a04a12", badge: "#e6ab6c", footer: "#25143a", footerText: "#cdbfd9", flowers: "moonlight" },
  "haunted-house": { ground: "#e6e6f0", raised: "#f0f0f6", band: "#d4d4e4", ink: "#25263d", body: "#575970", accent: "#8f5510", badge: "#efc47a", footer: "#14162c", footerText: "#bcbdd4", flowers: "moonlight" },
  arcade: { ground: "#ebe2f2", raised: "#f4eef8", band: "#dacbe7", ink: "#2c2140", body: "#5b4f70", accent: "#9c3058", badge: "#c3aede", footer: "#241a38", footerText: "#cdc3df", flowers: "moonlight" },
};

/** A template's page colours: its own, or the site's until it has some. */
export function templatePageTheme(slug: string): PageTheme {
  return Object.hasOwn(TEMPLATE_PAGE_THEMES, slug) ? TEMPLATE_PAGE_THEMES[slug] : DEFAULT_PAGE_THEME;
}

/** The palette as the CSS variables the page's components read (globals.css, "--page-*"). */
export function pageThemeVars(theme: PageTheme): Record<`--page-${string}`, string> {
  return {
    "--page-ground": theme.ground,
    "--page-raised": theme.raised,
    "--page-band": theme.band,
    "--page-ink": theme.ink,
    "--page-body": theme.body,
    "--page-accent": theme.accent,
    "--page-on-accent": theme.onAccent ?? ON_ACCENT,
    "--page-badge": theme.badge,
    "--page-footer": theme.footer,
    "--page-footer-text": theme.footerText,
  };
}

/** For the page's wrapper. */
export function pageThemeStyle(theme: PageTheme): CSSProperties {
  return pageThemeVars(theme) as CSSProperties;
}

/**
 * The same variables for what sits outside the wrapper while the page is open: the site's footer,
 * the header's button, the ground behind it all. `key` is the wrapper's data-page-theme value. A
 * browser without :has() shows the site's own footer and header, and the page itself still themed.
 */
export function pageThemeChromeCss(key: string, theme: PageTheme): string {
  const vars = Object.entries(pageThemeVars(theme))
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
  return `body:has([data-page-theme="${key}"]){${vars}}`;
}

// --- contrast, for the test and for anyone picking a palette ---

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of "#rrggbb". */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG contrast ratio of two "#rrggbb" colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
