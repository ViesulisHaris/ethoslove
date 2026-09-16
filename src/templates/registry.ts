import type { Occasion } from "@/config/occasions";
import type { TemplateManifest, TemplateModule, TemplateTier } from "./types";
import { manifest as theLetter } from "./the-letter/manifest";
import { manifest as constellations } from "./constellations/manifest";
import { manifest as birthdayCinema } from "./birthday-cinema/manifest";
import { manifest as jarOfReasons } from "./jar-of-reasons/manifest";
import { manifest as scratchCard } from "./scratch-card/manifest";
import { manifest as midnightCountdown } from "./midnight-countdown/manifest";
import { manifest as ourTimeline } from "./our-timeline/manifest";
import { manifest as vinyl } from "./vinyl/manifest";
import { manifest as museum } from "./museum/manifest";
import { manifest as frontPage } from "./front-page/manifest";
import { manifest as fortuneCookie } from "./fortune-cookie/manifest";
import { manifest as textThread } from "./text-thread/manifest";
import { manifest as arcade } from "./arcade/manifest";
import { manifest as passport } from "./passport/manifest";
import { manifest as bloom } from "./bloom/manifest";
import { manifest as bouquet } from "./bouquet/manifest";
import { manifest as kawaii } from "./kawaii/manifest";
import { manifest as fireside } from "./fireside/manifest";
import { manifest as trickOrTreat } from "./trick-or-treat/manifest";
import { manifest as scrapbook } from "./scrapbook/manifest";
import { manifest as halfway } from "./halfway/manifest";
import { manifest as garden } from "./garden/manifest";
import { manifest as snowGlobe } from "./snow-globe/manifest";
import { manifest as recipeBox } from "./recipe-box/manifest";
import { manifest as capToss } from "./cap-toss/manifest";
import { manifest as paperCrane } from "./paper-crane/manifest";
import { manifest as theToast } from "./the-toast/manifest";

/**
 * Manifests are eager (tiny, safe to import on the server).
 * Template code is lazy: each entry is its own chunk, loaded only when rendered.
 */
export const TEMPLATE_MANIFESTS: readonly TemplateManifest[] = [theLetter, constellations, birthdayCinema, jarOfReasons, scratchCard, midnightCountdown, ourTimeline, vinyl, museum, frontPage, fortuneCookie, textThread, arcade, passport, bloom, bouquet, kawaii, fireside, trickOrTreat, scrapbook, halfway, garden, snowGlobe, recipeBox, capToss, paperCrane, theToast];

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
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export const TEMPLATE_SLUGS = TEMPLATE_MANIFESTS.map((m) => m.slug);

export function isTemplateSlug(slug: string): boolean {
  return slug in loaders;
}

export function getManifest(slug: string): TemplateManifest | null {
  return TEMPLATE_MANIFESTS.find((m) => m.slug === slug) ?? null;
}

/**
 * A manifest lists its occasions most-central-first, so a template's position in that list is
 * how well it fits. Filtering by occasion therefore ranks by fit — the templates built for the
 * occasion lead, the ones that merely suit it follow — and falls back to `sortOrder` within a
 * rank. Unfiltered, the gallery keeps its curated `sortOrder`.
 */
export function listManifests(filter: { occasion?: Occasion; tier?: TemplateTier } = {}) {
  const { occasion } = filter;
  return TEMPLATE_MANIFESTS.filter(
    (m) => (!occasion || m.occasions.includes(occasion)) && (!filter.tier || m.tier === filter.tier),
  ).sort((a, b) =>
    occasion
      ? a.occasions.indexOf(occasion) - b.occasions.indexOf(occasion) || a.sortOrder - b.sortOrder
      : a.sortOrder - b.sortOrder,
  );
}

export async function loadTemplate(slug: string): Promise<TemplateModule | null> {
  const loader = loaders[slug];
  if (!loader) return null;
  const mod = await loader();
  return mod.template as TemplateModule;
}
