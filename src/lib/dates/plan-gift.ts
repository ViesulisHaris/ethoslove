import type { GiftUnwrap, GiftUnwrapStop } from "@/lib/gift/schema";
import { clipText, isUnwrapImage, isUnwrapLink, UNWRAP_LIMITS } from "@/lib/gift/unwrap-rules";
import { round } from "./geo";
import { stopName, type Plan } from "./plan";

/**
 * A planned date as "a surprise inside" a gift (GiftData.unwrap): the day, the town, and each stop
 * with its time, its kind and a photograph of it where one exists. Whichever gift they choose
 * carries it, wrapped, under its last words. Written without zod: this runs on /plan, which keeps
 * the schema library out of its bundle (plan.ts), and the builder checks its own pictures and link
 * against the same allow-list the schema holds every gift to.
 */
const WORDS = {
  en: { title: "Our date" },
  es: { title: "Nuestra cita" },
} as const;

export type PlanUnwrapOptions = {
  /** Photographs found for the stops, by stop id: a Wikimedia URL, already sized for a thumbnail. */
  photos?: Record<string, string | null | undefined>;
  /** Where "Open our plan" goes: the plan's own share link, as a site path. */
  link?: string;
  /** A name for the evening, like the idea it was built from ("Museum, then wine"). */
  title?: string;
};

export function planUnwrap(plan: Plan, locale: "en" | "es", options: PlanUnwrapOptions = {}): GiftUnwrap {
  const { photos = {}, link, title } = options;
  const stops: GiftUnwrapStop[] = plan.stops.slice(0, UNWRAP_LIMITS.stops).map((s) => {
    const photo = photos[s.id];
    return {
      name: clipText(stopName(s, locale), UNWRAP_LIMITS.stopName),
      ...(s.time ? { time: s.time } : {}),
      kind: s.kind,
      lat: round(s.lat, 5),
      lng: round(s.lng, 5),
      // No photo is left as none: the gift draws the kind's picture, marked as a kind, so an
      // illustration is never passed off as this very café (lib/dates/art.ts).
      ...(isUnwrapImage(photo) ? { image: photo } : {}),
      ...(s.note?.trim() ? { note: clipText(s.note, UNWRAP_LIMITS.stopNote) } : {}),
    };
  });
  const where = plan.where?.trim();
  return {
    kind: "date",
    title: clipText(title?.trim() || where || WORDS[locale].title, UNWRAP_LIMITS.title),
    ...(plan.date ? { date: plan.date } : {}),
    ...(where ? { city: clipText(where, UNWRAP_LIMITS.city) } : {}),
    stops,
    ...(isUnwrapLink(link) ? { link } : {}),
  };
}
