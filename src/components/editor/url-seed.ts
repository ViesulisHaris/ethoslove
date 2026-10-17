"use client";

import type { GiftUnwrap } from "@/lib/gift/schema";
import { buildUrlSeed, readUrlSeed, type BuiltUrlSeed } from "@/lib/editor/url-seed";
import { CHIP_PHOTO_WIDTH, gatherPhotos, stopPlaces, withStopPhotos } from "@/components/gifts/unwrap-photos";

/** A gift is never held up for a slow photograph: after this, the surprise draws the stops by kind. */
const PHOTO_WAIT_MS = 3000;

export type UrlSeed = BuiltUrlSeed & {
  /** The surprise again with the stops' photographs, asked for after the editor is up (null when there is none). */
  photographed: () => Promise<GiftUnwrap | null>;
};

/**
 * The seed this editor's address asks for (lib/editor/url-seed.ts), or null. The trips, the plan
 * codec and the builders load only when an address carries one.
 */
export async function loadUrlSeed(slug: string, locale: "en" | "es"): Promise<UrlSeed | null> {
  const request = readUrlSeed(new URLSearchParams(window.location.search), window.location.hash);
  if (!request) return null;
  const [presets, tripGift, lastFrom, plan, planGift, ideas] = await Promise.all([
    import("@/lib/trips/presets"),
    import("@/lib/trips/trip-gift"),
    import("@/lib/trips/last-from"),
    import("@/lib/dates/plan"),
    import("@/lib/dates/plan-gift"),
    import("@/lib/dates/ideas"),
  ]);
  const built = buildUrlSeed(slug, request, locale, lastFrom.readLastFrom(), {
    getTrip: presets.getTrip,
    tripGiftSlug: tripGift.TRIP_GIFT_SLUG,
    tripGiftFields: tripGift.tripGiftFields,
    tripUnwrap: tripGift.tripUnwrap,
    decodePlan: plan.decodePlan,
    planUnwrap: planGift.planUnwrap,
    ideaTitle: (id, lang) => ideas.ideaById(id)?.title[lang],
  });
  if (!built) return null;

  const photographed = async (): Promise<GiftUnwrap | null> => {
    const unwrap = built.seed.unwrap as GiftUnwrap | undefined;
    if (!unwrap) return null;
    if (built.trip) {
      const found = await gatherPhotos(stopPlaces(unwrap, built.trip.stops.map((s) => s.name)), CHIP_PHOTO_WIDTH, PHOTO_WAIT_MS);
      return withStopPhotos(unwrap, found);
    }
    if (built.plan) {
      const stops = built.plan.stops.filter((s) => s.named !== false).map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }));
      const photos = await gatherPhotos(stops, undefined, PHOTO_WAIT_MS);
      return planGift.planUnwrap(built.plan, locale, { photos, ...(built.link ? { link: built.link } : {}), ...(built.title ? { title: built.title } : {}) });
    }
    return null;
  };
  return { ...built, photographed };
}
