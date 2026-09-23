import { preconnect } from "react-dom";

/**
 * MapLibre is served from this site rather than bundled (see scripts/copy-maplibre.mjs for why).
 * The folder is named after the version, so this must match the installed package; a unit test
 * fails when the package is upgraded and this line is not.
 */
export const MAPLIBRE_VERSION = "6.10.0";
const VENDOR = `/vendor/maplibre-gl/${MAPLIBRE_VERSION}`;
export const MAPLIBRE_URL = `${VENDOR}/maplibre-gl.mjs`;
/**
 * The first file imports this one, and the browser only finds that out once the first has arrived:
 * two downloads of ~150 KB one after the other. Named here so both can be asked for at once.
 */
export const MAPLIBRE_SHARED_URL = `${VENDOR}/maplibre-gl-shared.mjs`;

/** OpenFreeMap's light style: free, no key, and quiet enough to recolour (map-style.ts). */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const TILES_ORIGIN = "https://tiles.openfreemap.org";

/**
 * A failed `import()` is remembered by the browser for the rest of the visit, even once the
 * connection is back, so a retry has to ask under an address it has not seen.
 */
export const maplibreUrl = (attempt: number): string => (attempt > 0 ? `${MAPLIBRE_URL}?retry=${attempt}` : MAPLIBRE_URL);

let style: Promise<unknown> | null = null;

/**
 * The style, fetched once per visit and shared by every map on the page, so a warm-up and the map
 * itself never ask twice. A failure is forgotten, so the next attempt asks again.
 */
export function loadMapStyle(): Promise<unknown> {
  style ??= fetch(MAP_STYLE_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`style ${res.status}`);
      return res.json() as Promise<unknown>;
    })
    .catch((error: unknown) => {
      style = null;
      throw error;
    });
  return style;
}

/**
 * A file fetched into the HTTP cache, where a later import finds it, and never as a module preload:
 * a module that fails to load (a phone in a tunnel) stays failed in the page's module map for the
 * rest of the visit, even once the connection is back, where a cache miss simply asks again. The
 * files are immutable for a year, so this only costs anything on a first visit.
 */
function intoCache(url: string, priority: "high" | "low"): void {
  // Read to the end: a body nobody reads can stall half-way into the cache.
  fetch(url, { priority })
    .then((res) => res.arrayBuffer())
    .catch(() => undefined);
}

/**
 * For the moment a map is actually being made: MapLibre's first file is being imported, and the
 * second is asked for beside it instead of after it. Not preloaded as a module: the second file is
 * always imported under the same address (the first names it), so a failed preload of it would
 * leave a map first opened offline unable to load again until the page was reloaded.
 */
export function preloadMapLibre(): void {
  intoCache(MAPLIBRE_SHARED_URL, "high");
}

let warmed = false;

/**
 * Gets a map ready before anybody asks for one: MapLibre's files, the style and a connection to the
 * tile server. At low priority while the page has other things to fetch, or high when a finger is
 * already on the Map button: the map's own import joins these requests rather than starting again.
 */
export function warmMap(soon = false): void {
  if (warmed) return;
  warmed = true;
  for (const url of [MAPLIBRE_URL, MAPLIBRE_SHARED_URL]) intoCache(url, soon ? "high" : "low");
  preconnect(TILES_ORIGIN, { crossOrigin: "anonymous" });
  loadMapStyle().catch(() => undefined);
}
