"use client";

import { photoAt } from "@/lib/dates/photos";
import type { PlanStop } from "@/lib/dates/plan";
import { photoFor } from "./photo-store";

/** Half a link preview's width: photoAt asks Wikimedia for twice this, its 1280-pixel size. */
const PREVIEW_PHOTO_WIDTH = 600;
/** A share is not held up for a slow photograph; the stops found by then are the ones considered. */
const WAIT_MS = 4000;

/**
 * The photograph a shared plan's preview shows: the first stop, in the plan's order, that has a
 * real one (through the same store as the Dates list, so a photo found there costs nothing). Null
 * when none has, and the preview is then the site's own card, never a picture of something else.
 */
export async function firstCover(stops: readonly Pick<PlanStop, "id" | "name" | "lat" | "lng" | "named">[], wait = WAIT_MS): Promise<string | null> {
  const named = stops.filter((s) => s.named !== false);
  const found: (string | null | undefined)[] = named.map(() => undefined);
  const all = Promise.all(
    named.map(async (stop, i) => {
      const photo = await photoFor({ id: stop.id, name: stop.name, lat: stop.lat, lng: stop.lng });
      found[i] = photo ? photoAt(photo, PREVIEW_PHOTO_WIDTH).split("?")[0] : null;
    }),
  );
  await Promise.race([all, new Promise((resolve) => window.setTimeout(resolve, wait))]);
  return found.find((src): src is string => Boolean(src)) ?? null;
}
