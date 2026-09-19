import type { TemplateModule } from "./types";

/**
 * Template code, lazily: each entry is its own chunk, loaded only when a template is rendered.
 *
 * Only for code that renders a template (the gift renderer, the editor). Anything that only
 * needs to know about templates — every page that lists them, the sitemap, checkout — imports
 * ./manifests instead: see the note there on what importing this file from a server component
 * costs. The manifest helpers are re-exported here so older imports keep working.
 */
export { TEMPLATE_MANIFESTS, TEMPLATE_SLUGS, getManifest, isTemplateSlug, listManifests } from "./manifests";

/* eslint-disable @typescript-eslint/no-explicit-any */
const loaders: Record<string, () => Promise<{ template: TemplateModule<any> }>> = {
  "the-letter": () => import("./the-letter"),
  constellations: () => import("./constellations"),
  "birthday-cinema": () => import("./birthday-cinema"),
  "jar-of-reasons": () => import("./jar-of-reasons"),
  "scratch-card": () => import("./scratch-card"),
  "midnight-countdown": () => import("./midnight-countdown"),
  "our-timeline": () => import("./our-timeline"),
  vinyl: () => import("./vinyl"),
  museum: () => import("./museum"),
  "front-page": () => import("./front-page"),
  "fortune-cookie": () => import("./fortune-cookie"),
  "text-thread": () => import("./text-thread"),
  arcade: () => import("./arcade"),
  passport: () => import("./passport"),
  bloom: () => import("./bloom"),
  bouquet: () => import("./bouquet"),
  kawaii: () => import("./kawaii"),
  fireside: () => import("./fireside"),
  "trick-or-treat": () => import("./trick-or-treat"),
  scrapbook: () => import("./scrapbook"),
  halfway: () => import("./halfway"),
  garden: () => import("./garden"),
  "snow-globe": () => import("./snow-globe"),
  "recipe-box": () => import("./recipe-box"),
  "cap-toss": () => import("./cap-toss"),
  "paper-crane": () => import("./paper-crane"),
  "the-toast": () => import("./the-toast"),
  balloons: () => import("./balloons"),
  "party-animals": () => import("./party-animals"),
  "the-council": () => import("./the-council"),
  "sticker-bomb": () => import("./sticker-bomb"),
  "popup-card": () => import("./popup-card"),
  sketchbook: () => import("./sketchbook"),
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Every slug with a loader; tests/unit/templates.test.ts checks it against ./manifests. */
export const LOADER_SLUGS = Object.keys(loaders);

export async function loadTemplate(slug: string): Promise<TemplateModule | null> {
  const loader = loaders[slug];
  if (!loader) return null;
  const mod = await loader();
  return mod.template as TemplateModule;
}
