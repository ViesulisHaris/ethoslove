import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";

/**
 * How the maps move. MapLibre draws on a canvas and eases its own camera, so the site's CSS curve
 * (--ease-out-quint) and its reduced-motion setting are repeated here for it.
 */

/** The site's ease-out-quint: quick to leave, long to settle, never past the mark. */
export const easeOutQuint = (t: number): number => 1 - (1 - t) ** 5;
/**
 * A pen's pace: easing out, but gently. Quint drew four fifths of a route in its first third and
 * crawled through the rest, so the stops near the start popped all at once and the last one late.
 */
export const easeOutSine = (t: number): number => Math.sin((t * Math.PI) / 2);

/** Bringing a chosen place into view. */
export const CAMERA_MS = 700;
/** Framing a route, a plan or a nearby search: a longer way to go. */
export const FRAME_MS = 800;
/** The dots and the halo fading on the canvas (MapLibre paint transitions). */
export const DOTS_MS = 280;

/** True when the reader has asked for less motion: the camera jumps and lines are drawn at once. */
export function prefersStill(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type LngLat = [number, number];

/**
 * How far along a route each stop is, from the first, in metres on a flat map: near enough for
 * a line drawn across a town or a coast, and all a pen needs to keep an even pace.
 */
export function routeLengths(coords: LngLat[]): number[] {
  const out = [0];
  for (let i = 1; i < coords.length; i++) {
    const [lng0, lat0] = coords[i - 1];
    const [lng1, lat1] = coords[i];
    const x = (lng1 - lng0) * Math.cos((((lat0 + lat1) / 2) * Math.PI) / 180);
    const y = lat1 - lat0;
    out.push(out[i - 1] + Math.hypot(x, y) * 111_320);
  }
  return out;
}

/** The route as far as `length` along it: every stop before that point, and the point itself. */
export function routeUpTo(coords: LngLat[], lengths: number[], length: number): LngLat[] {
  if (coords.length === 0) return [];
  if (length <= 0) return [coords[0]];
  let i = 1;
  while (i < coords.length && lengths[i] <= length) i++;
  const part = coords.slice(0, i);
  if (i >= coords.length) return part;
  const leg = lengths[i] - lengths[i - 1];
  const f = leg > 0 ? (length - lengths[i - 1]) / leg : 1;
  const [lng0, lat0] = coords[i - 1];
  const [lng1, lat1] = coords[i];
  part.push([lng0 + (lng1 - lng0) * f, lat0 + (lat1 - lat0) * f]);
  return part;
}

const asLine = (coords: LngLat[]) => ({
  type: "FeatureCollection" as const,
  features: coords.length > 1 ? [{ type: "Feature" as const, geometry: { type: "LineString" as const, coordinates: coords }, properties: {} }] : [],
});

/**
 * Draws a route into a GeoJSON line source as if by pen, from the stop `from` (the part before it
 * is already there) to the last, over `ms`. `onReach(i)` is called as the pen gets to each stop,
 * so its marker can arrive with it. A dashed line keeps its dashes still: they are measured from the
 * start, which never moves. Reduced motion draws it whole at once. Returns a function that stops it.
 */
export function drawRoute(map: MapLibreMap, sourceId: string, coords: LngLat[], { from = 0, ms = 900, onReach, easing = easeOutSine }: { from?: number; ms?: number; onReach?: (i: number) => void; easing?: (t: number) => number } = {}): () => void {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  const lengths = routeLengths(coords);
  const total = lengths[lengths.length - 1] ?? 0;
  const start = Math.min(Math.max(0, from), Math.max(0, coords.length - 1));
  let reached = 0;
  const reach = (length: number) => {
    while (reached < coords.length && lengths[reached] <= length + 1e-6) onReach?.(reached++);
  };
  if (!source || coords.length < 2 || total === 0 || prefersStill() || start >= coords.length - 1) {
    void source?.setData(asLine(coords));
    reach(Infinity);
    return () => undefined;
  }
  const fromLength = lengths[start];
  reach(fromLength);
  let frame = 0;
  let began = 0;
  const tick = (now: number) => {
    began ||= now;
    const t = Math.min(1, (now - began) / ms);
    const length = fromLength + (total - fromLength) * easing(t);
    void source.setData(asLine(t >= 1 ? coords : routeUpTo(coords, lengths, length)));
    reach(t >= 1 ? Infinity : length);
    if (t < 1) frame = requestAnimationFrame(tick);
  };
  void source.setData(asLine(routeUpTo(coords, lengths, fromLength)));
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

/**
 * Sets paint properties on a layer, and when MapLibre refuses because its style is (re)loading —
 * "Style is not done loading", thrown for instance when React's development double mount leaves an
 * effect holding the map that is being torn down — tries once more when the style next reports in,
 * instead of throwing out of an effect. A map that is gone never reports again, which is the end of it.
 */
type PaintName = Parameters<MapLibreMap["setPaintProperty"]>[1];
type PaintValue = Parameters<MapLibreMap["setPaintProperty"]>[2];

export function paintLayer(map: MapLibreMap, layer: string, props: Partial<Record<PaintName, PaintValue>>): void {
  const apply = () => {
    if (!map.getLayer(layer)) return;
    for (const [name, value] of Object.entries(props)) map.setPaintProperty(layer, name as PaintName, value as PaintValue);
  };
  try {
    apply();
  } catch {
    map.once("styledata", () => {
      try {
        apply();
      } catch {
        // Torn down meanwhile: nothing left to paint.
      }
    });
  }
}

/**
 * New data for a GeoJSON source is cut into tiles in a worker and drawn a frame or two later. This
 * resolves once it has been (or after `patience` ms), so a fade started then shows the new dots
 * arriving, not the old ones for a frame.
 */
export function setDataDrawn(map: MapLibreMap, sourceId: string, data: GeoJSON.GeoJSON, patience = 300): Promise<void> {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (!source) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      map.off("sourcedata", check);
      resolve();
    };
    const check = (e: { sourceId?: string; tile?: unknown }) => {
      if (e.sourceId === sourceId && e.tile && map.isSourceLoaded(sourceId)) done();
    };
    const timer = window.setTimeout(done, patience);
    map.on("sourcedata", check);
    source.setData(data).catch(done);
  });
}

/**
 * Fades a canvas map in over the paper behind it once its first tiles are drawn, so the streets
 * arrive together instead of tile by tile. Waits at most `patience` ms: on a slow line the pins
 * are already on the paper and the streets fill in beneath them as they come.
 */
export function revealWhenDrawn(map: MapLibreMap, reveal: () => void, patience = 1500): () => void {
  let done = false;
  const show = () => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    map.off("load", show);
    reveal();
  };
  const timer = window.setTimeout(show, patience);
  if (map.loaded()) show();
  else map.on("load", show);
  return () => {
    done = true;
    window.clearTimeout(timer);
    map.off("load", show);
  };
}
