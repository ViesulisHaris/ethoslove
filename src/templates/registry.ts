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

/**
 * Manifests are eager (tiny, safe to import on the server).
 * Template code is lazy: each entry is its own chunk, loaded only when rendered.
 */
export const TEMPLATE_MANIFESTS: readonly TemplateManifest[] = [theLetter, constellations, birthdayCinema, jarOfReasons, scratchCard, midnightCountdown, ourTimeline, vinyl, museum, frontPage, fortuneCookie, textThread, arcade, passport, bloom, bouquet, kawaii, fireside, trickOrTreat, scrapbook, halfway];

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
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export const TEMPLATE_SLUGS = TEMPLATE_MANIFESTS.map((m) => m.slug);

export function isTemplateSlug(slug: string): boolean {
  return slug in loaders;
}

export function getManifest(slug: string): TemplateManifest | null {
  return TEMPLATE_MANIFESTS.find((m) => m.slug === slug) ?? null;
}

export function listManifests(filter: { occasion?: Occasion; tier?: TemplateTier } = {}) {
  return TEMPLATE_MANIFESTS.filter(
    (m) =>
      (!filter.occasion || m.occasions.includes(filter.occasion)) &&
      (!filter.tier || m.tier === filter.tier),
  ).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function loadTemplate(slug: string): Promise<TemplateModule | null> {
  const loader = loaders[slug];
  if (!loader) return null;
  const mod = await loader();
  return mod.template as TemplateModule;
}
