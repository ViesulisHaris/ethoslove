import type { Occasion } from "@/config/occasions";
import type { TemplateManifest, TemplateTier } from "./types";
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
import { manifest as balloons } from "./balloons/manifest";
import { manifest as partyAnimals } from "./party-animals/manifest";
import { manifest as theCouncil } from "./the-council/manifest";
import { manifest as stickerBomb } from "./sticker-bomb/manifest";
import { manifest as coquette } from "./coquette/manifest";
import { manifest as xoxo } from "./xoxo/manifest";
import { manifest as spookySeason } from "./spooky-season/manifest";
import { manifest as beMyBoo } from "./be-my-boo/manifest";
import { manifest as fallForYou } from "./fall-for-you/manifest";
import { manifest as autumnReel } from "./autumn-reel/manifest";
import { manifest as darkRomance } from "./dark-romance/manifest";
import { manifest as favoritePerson } from "./favorite-person/manifest";
import { manifest as onRepeat } from "./on-repeat/manifest";
import { manifest as evergreen } from "./evergreen/manifest";
import { manifest as keepsake } from "./keepsake/manifest";
import { manifest as popupCard } from "./popup-card/manifest";
import { manifest as sketchbook } from "./sketchbook/manifest";
import { manifest as packYourBags } from "./pack-your-bags/manifest";
import { manifest as digicam } from "./digicam/manifest";
import { manifest as photoBooth } from "./photo-booth/manifest";
import { manifest as picnic } from "./picnic/manifest";
import { manifest as musicBox } from "./music-box/manifest";
import { manifest as hauntedHouse } from "./haunted-house/manifest";
import { manifest as jackOLantern } from "./jack-o-lantern/manifest";
import { manifest as cauldron } from "./cauldron/manifest";
import { manifest as batSwarm } from "./bat-swarm/manifest";
import { manifest as seance } from "./seance/manifest";

/**
 * What a template is — its names, occasions, tier, poster — and nothing it runs.
 *
 * Kept apart from the loaders in ./registry on purpose. A server component that imported the
 * registry, only to list manifests, reached its `import("./bloom")`-style loaders too, and the
 * bundler counts every client component those reach as part of that route. So every page that
 * listed templates shipped all 27 templates' code up front, three.js included — 874 KB of script
 * on the homepage, pricing and the gallery, for gifts nobody had opened. Import from here unless
 * you are about to render a template.
 */
export const TEMPLATE_MANIFESTS: readonly TemplateManifest[] = [theLetter, constellations, birthdayCinema, jarOfReasons, scratchCard, midnightCountdown, ourTimeline, vinyl, museum, frontPage, fortuneCookie, textThread, arcade, passport, bloom, bouquet, kawaii, fireside, trickOrTreat, scrapbook, halfway, garden, snowGlobe, recipeBox, capToss, paperCrane, theToast, balloons, popupCard, sketchbook, partyAnimals, theCouncil, stickerBomb, coquette, xoxo, keepsake, packYourBags, digicam, photoBooth, picnic, musicBox, spookySeason, darkRomance, favoritePerson, onRepeat, evergreen, beMyBoo, fallForYou, autumnReel, seance, batSwarm, cauldron, jackOLantern, hauntedHouse];

export const TEMPLATE_SLUGS = TEMPLATE_MANIFESTS.map((m) => m.slug);

export function isTemplateSlug(slug: string): boolean {
  return TEMPLATE_SLUGS.includes(slug);
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
