import "server-only";

import { VectorTile } from "@mapbox/vector-tile";
import { PbfReader } from "pbf";
import { keepsPoi, POI_ZOOM, type PoiFeature, type TileXY } from "./tiles";

const TILEJSON_URL = "https://tiles.openfreemap.org/planet";
const USER_AGENT = "Ethos/1.0 (+https://tryethos.io)";
/** The few properties the pages use; a tile names every place in eighty languages. */
const KEPT = ["name", "name:en", "name:es", "name_en", "name:latin", "subclass", "rank"] as const;

let template: { url: string; at: number } | null = null;
const TEMPLATE_TTL_MS = 60 * 60 * 1000;

/**
 * OpenFreeMap publishes a new planet every week under a new path, so the address of a tile is
 * read from its TileJSON rather than written down here.
 */
async function tileTemplate(): Promise<string | null> {
  if (template && Date.now() - template.at < TEMPLATE_TTL_MS) return template.url;
  try {
    const res = await fetch(TILEJSON_URL, { next: { revalidate: 3600 }, headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return template?.url ?? null;
    const url = ((await res.json()) as { tiles?: string[] }).tiles?.[0];
    if (typeof url !== "string" || !url.startsWith("https://tiles.openfreemap.org/")) return template?.url ?? null;
    template = { url, at: Date.now() };
    return url;
  } catch {
    return template?.url ?? null;
  }
}

/** Date-worthy points of each tile already read, newest last. A warm server answers a neighbourhood without fetching anything. */
const cache = new Map<string, PoiFeature[]>();
const CACHE_MAX = 300;

export type TileResult = { features: PoiFeature[]; ok: boolean };

export async function poisOfTile(tile: TileXY): Promise<TileResult> {
  const tpl = await tileTemplate();
  if (!tpl) return { features: [], ok: false };
  const url = tpl.replace("{z}", String(POI_ZOOM)).replace("{x}", String(tile.x)).replace("{y}", String(tile.y));
  const hit = cache.get(url);
  if (hit) {
    cache.delete(url);
    cache.set(url, hit);
    return { features: hit, ok: true };
  }
  try {
    const res = await fetch(url, { cache: "no-store", headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(7000) });
    // Open sea has no tile at all.
    if (res.status === 404 || res.status === 204) return { features: [], ok: true };
    if (!res.ok) return { features: [], ok: false };
    const layer = new VectorTile(new PbfReader(new Uint8Array(await res.arrayBuffer()))).layers.poi;
    const features: PoiFeature[] = [];
    for (let i = 0; i < (layer?.length ?? 0); i++) {
      const f = layer.feature(i);
      if (f.type !== 1 || !keepsPoi(f.properties.subclass)) continue;
      const point = f.loadGeometry()[0]?.[0];
      if (!point) continue;
      const properties: Record<string, unknown> = {};
      for (const key of KEPT) if (f.properties[key] !== undefined) properties[key] = f.properties[key];
      features.push({ id: f.id, px: point.x, py: point.y, extent: f.extent, properties });
    }
    cache.set(url, features);
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
    return { features, ok: true };
  } catch {
    return { features: [], ok: false };
  }
}
