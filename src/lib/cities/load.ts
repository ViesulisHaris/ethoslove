import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import { snapSearch } from "@/lib/dates/geo";
import { poisOfTile } from "@/lib/dates/tile-source";
import { tilesCovering } from "@/lib/dates/tiles";
import { getCity } from "./cities";
import { assembleCityPlaces, CITY_RADIUS_M, type CityPlaces } from "./places";

/** The same week the page itself is kept for (its `revalidate`). */
const KEPT_S = 60 * 60 * 24 * 7;
const RETRY_S = 60 * 60;

/** Some tiles could not be read. Carries whatever the others gave, which is still worth showing. */
class IncompleteTiles extends Error {
  constructor(readonly partial: CityPlaces | null) {
    super("cities: some map tiles could not be read");
  }
}

/** Date-worthy places round a city's centre, out of the same map tiles the dates map reads. */
async function readCentre(slug: string, locale: "en" | "es"): Promise<CityPlaces> {
  const city = getCity(slug);
  if (!city) return { places: [], counts: {} };
  const { center, radiusM } = snapSearch(city, CITY_RADIUS_M);
  const reads = await Promise.all(tilesCovering(center, radiusM).map(async (tile) => ({ tile, ...(await poisOfTile(tile)) })));
  const { found, complete } = assembleCityPlaces(reads, center, radiusM, locale);
  if (complete && found) return found;
  // Thrown, not returned, so the cache below never keeps a map with holes in it for a week.
  throw new IncompleteTiles(found);
}

/**
 * Cached for as long as the page is, and the tile fetches happen inside the cache on purpose: the
 * tile reader asks for `no-store`, which anywhere else in a page would make the whole page render
 * on every visit instead of once a week. The data cache outlives a deploy, so the key's version
 * goes up whenever what is kept changes.
 */
const cachedCentre = unstable_cache(readCentre, ["city-places-v2"], { revalidate: KEPT_S });

/**
 * Called only when the tiles failed. Reading a cache entry with a one-hour lifetime shortens the
 * page's own lifetime to match, so a page built without its places is rebuilt within the hour
 * instead of standing like that for a week.
 */
const retrySoon = unstable_cache(async () => true, ["city-places-retry"], { revalidate: RETRY_S });

/**
 * A city's places, or null when the map could not be read at all; the page is then built without
 * them rather than not built. Deduplicated per request, since the title needs the count too.
 */
export const loadCityPlaces = cache(async (slug: string, locale: "en" | "es"): Promise<CityPlaces | null> => {
  try {
    return await cachedCentre(slug, locale);
  } catch (error) {
    await retrySoon().catch(() => undefined);
    if (error instanceof IncompleteTiles) {
      console.warn("cities: some map tiles missing, rebuilding within the hour", slug);
      return error.partial;
    }
    console.error("cities: places unavailable", slug, error);
    return null;
  }
});
