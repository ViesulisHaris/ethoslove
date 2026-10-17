"use client";

import type { GiftUnwrap } from "@/lib/gift/schema";
import { photoAt } from "@/lib/dates/photos";
import { photoFor } from "@/components/dates/photo-store";

type Place = { id: string; name: string; lat: number; lng: number };

/** How wide a stop's picture is drawn in the gift (the itinerary's 64px tiles), in CSS pixels. */
export const UNWRAP_PHOTO_WIDTH = 72;
/** A trip's towns are small round chips on the card. */
export const CHIP_PHOTO_WIDTH = 40;
/** A gift is not held up for a slow photograph: whatever has come by then goes in, the rest is drawn by kind. */
const WAIT_MS = 3500;

/**
 * Real photographs of the places a surprise will show, by place id, through the same store the
 * dates list uses (so a photo already found there costs nothing), sized for the gift's tiles.
 * Missing ones are null; the gift draws the kind's picture for those.
 */
export async function gatherPhotos(places: Place[], width = UNWRAP_PHOTO_WIDTH, wait = WAIT_MS): Promise<Record<string, string | null>> {
  const found: Record<string, string | null> = {};
  const all = Promise.all(
    places.map(async (place) => {
      const photo = await photoFor(place);
      // Commons adds tracking-style query strings to its thumbnails; the picture is the same without them, and shorter.
      found[place.id] = photo ? photoAt(photo, width).split("?")[0] : null;
    }),
  );
  await Promise.race([all, new Promise((resolve) => window.setTimeout(resolve, wait))]);
  return { ...found };
}

/** A key for a stop that has no id of its own (a trip's towns): where it is, and where it comes in the list. */
const stopKey = (s: { lat?: number; lng?: number }, i: number) => `unwrap-stop:${s.lat},${s.lng}:${i}`;

/**
 * The stops of a surprise worth asking a photograph for: the ones on the map that have none yet.
 * `searchNames` are the names to look them up by, in order, when the ones on the card are
 * translated: Commons files Pompeii under "Pompeii", and asked for "Pompeya" it finds nothing.
 */
export function stopPlaces(unwrap: GiftUnwrap, searchNames: readonly string[] = []): Place[] {
  return unwrap.stops.flatMap((s, i) => (s.lat !== undefined && s.lng !== undefined && !s.image ? [{ id: stopKey(s, i), name: searchNames[i] || s.name, lat: s.lat, lng: s.lng }] : []));
}

/** The surprise with each photograph that was found (by gatherPhotos over stopPlaces) put on its stop. */
export function withStopPhotos(unwrap: GiftUnwrap, found: Record<string, string | null>): GiftUnwrap {
  return {
    ...unwrap,
    stops: unwrap.stops.map((s, i) => {
      const image = found[stopKey(s, i)];
      return image && !s.image ? { ...s, image } : s;
    }),
  };
}
