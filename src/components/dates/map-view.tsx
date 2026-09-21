"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent, Marker } from "maplibre-gl";
import { Loader2, LocateFixed, Minus, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { distanceKm, type LatLng } from "@/lib/dates/geo";
import { GROUP_GLYPHS } from "@/lib/dates/glyphs";
import { GROUP_IDS, GROUPS, type PlaceGroup } from "@/lib/dates/kinds";
import { applyPalette, MAP_PAPER, type MapStyle } from "@/lib/dates/map-style";
import { MAP_STYLE_URL, MAPLIBRE_URL } from "@/lib/dates/map-vendor";
import type { Place } from "@/lib/dates/places";

type MapLibre = typeof import("maplibre-gl");

export type MapLabels = { searchHere: string; nearMe: string; loading: string; unavailable: string; map: string; zoomIn: string; zoomOut: string };

type Props = {
  center: LatLng | null;
  zoom?: number;
  places: Place[];
  selected: Place | null;
  hoveredId: string | null;
  /** The stops of the date being put together, in order, joined by a dotted line. */
  route: { lat: number; lng: number; name: string }[];
  /** Frame the route whenever it changes: for an idea just picked, not for a plan being added to while browsing. */
  fitRoute?: boolean;
  /** Their own position, when they pressed "Near me". */
  origin: LatLng | null;
  searching: boolean;
  locating?: boolean;
  labels: MapLabels;
  interactive?: boolean;
  className?: string;
  onSelect?: (id: string | null) => void;
  onSearchArea?: (center: LatLng, radiusM: number) => void;
  onNearMe?: () => void;
};

const PLACES = "ethos-places";
const HALO = "ethos-halo";
const ROUTE = "ethos-route";
/** How far the map has to be dragged, as a share of what it shows, before it offers to search again. */
const MOVED_SHARE = 0.35;

/** A round pin for one group: its colour, a white rim, its glyph. Drawn once, at twice the size, for sharp screens. */
function pinImage(group: PlaceGroup): ImageData | null {
  const size = 60;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const c = size / 2;
  ctx.shadowColor = "rgba(70,25,40,0.35)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.arc(c, c - 1, 22, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.beginPath();
  ctx.arc(c, c - 1, 18.5, 0, Math.PI * 2);
  ctx.fillStyle = GROUPS[group].color;
  ctx.fill();
  ctx.translate(c - 11, c - 12);
  ctx.scale(22 / 24, 22 / 24);
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of GROUP_GLYPHS[group]) ctx.stroke(new Path2D(d));
  return ctx.getImageData(0, 0, size, size);
}

const toFeatures = (places: Place[]) => ({
  type: "FeatureCollection" as const,
  features: places.map((p) => ({ type: "Feature" as const, id: p.id, geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] }, properties: { id: p.id, name: p.name, group: p.group, score: p.score } })),
});

const numbered = (n: number, name: string): HTMLElement => {
  const el = document.createElement("div");
  el.className = "ethos-stop-pin";
  el.setAttribute("aria-label", `${n}. ${name}`);
  el.textContent = String(n);
  return el;
};

/**
 * The map. MapLibre is fetched from this site when the component mounts (it is a megabyte the rest
 * of the site never needs), the base style is repainted before the first frame, and the places are
 * drawn by the GPU as one clustered layer, so three hundred pins cost the same as three. If any of
 * that fails (no WebGL, tiles unreachable) the list beside it still works, and this says so.
 */
export function MapView({ center, zoom = 14, places, selected, hoveredId, route, fitRoute, origin, searching, locating, labels, interactive = true, className, onSelect, onSearchArea, onNearMe }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const libRef = useRef<MapLibre | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [moved, setMoved] = useState<{ center: LatLng; radiusM: number } | null>(null);
  const searchedAt = useRef<LatLng | null>(null);
  const callbacks = useRef({ onSelect, onSearchArea });
  useEffect(() => {
    callbacks.current = { onSelect, onSearchArea };
  });
  const stopMarkers = useRef<Marker[]>([]);
  const selectedMarker = useRef<Marker | null>(null);
  const originMarker = useRef<Marker | null>(null);
  const first = useRef({ center, zoom, interactive });

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    (async () => {
      try {
        const [lib, styleRes] = await Promise.all([import(/* webpackIgnore: true */ MAPLIBRE_URL) as Promise<MapLibre>, fetch(MAP_STYLE_URL)]);
        if (!styleRes.ok) throw new Error("style");
        const style = applyPalette((await styleRes.json()) as MapStyle);
        if (cancelled || !holder.current) return;
        libRef.current = lib;
        const start = first.current;
        map = new lib.Map({
          container: holder.current,
          style: style as never,
          center: start.center ? [start.center.lng, start.center.lat] : [8, 47],
          zoom: start.center ? start.zoom : 3.2,
          minZoom: 2,
          maxZoom: 19,
          attributionControl: { compact: true },
          interactive: start.interactive,
          cooperativeGestures: false,
          dragRotate: false,
          pitchWithRotate: false,
        });
        map.touchZoomRotate.disableRotation();
        // On a phone the credits start folded behind their (i), where the dock's buttons are; the
        // same credit is written out under the list.
        if (window.matchMedia("(max-width: 1023px)").matches) {
          const credits = holder.current.querySelector(".maplibregl-ctrl-attrib");
          credits?.classList.remove("maplibregl-compact-show");
          credits?.removeAttribute("open");
        }

        map.on("load", () => {
          if (cancelled || !map) return;
          for (const group of GROUP_IDS) {
            const image = pinImage(group);
            if (image) map.addImage(`pin-${group}`, image, { pixelRatio: 2 });
          }
          map.addSource(ROUTE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          map.addLayer({ id: ROUTE, type: "line", source: ROUTE, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#B23A5E", "line-width": 3, "line-dasharray": [0.2, 2], "line-opacity": 0.85 } });
          map.addSource(HALO, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          map.addLayer({ id: HALO, type: "circle", source: HALO, paint: { "circle-radius": 21, "circle-color": "#B23A5E", "circle-opacity": 0.18, "circle-stroke-color": "#B23A5E", "circle-stroke-width": 1.5, "circle-stroke-opacity": 0.55 } });
          map.addSource(PLACES, { type: "geojson", data: { type: "FeatureCollection", features: [] }, cluster: true, clusterRadius: 38, clusterMaxZoom: 15, promoteId: "id" });
          map.addLayer({ id: `${PLACES}-clusters`, type: "circle", source: PLACES, filter: ["has", "point_count"], paint: { "circle-color": "#FFFFFF", "circle-radius": ["step", ["get", "point_count"], 15, 10, 18, 40, 22], "circle-stroke-color": "#E9A9BA", "circle-stroke-width": 3 } });
          map.addLayer({ id: `${PLACES}-count`, type: "symbol", source: PLACES, filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-allow-overlap": true }, paint: { "text-color": "#8E2F4C" } });
          map.addLayer({
            id: `${PLACES}-pins`,
            type: "symbol",
            source: PLACES,
            filter: ["!", ["has", "point_count"]],
            layout: {
              "icon-image": ["concat", "pin-", ["get", "group"]],
              "icon-size": ["interpolate", ["linear"], ["zoom"], 11, 0.62, 15, 0.86, 18, 1],
              "icon-allow-overlap": true,
              "symbol-sort-key": ["-", 0, ["get", "score"]],
              "text-field": ["step", ["zoom"], "", 15.5, ["get", "name"]],
              "text-font": ["Noto Sans Regular"],
              "text-size": 11,
              "text-offset": [0, 1.35],
              "text-anchor": "top",
              "text-optional": true,
              "text-max-width": 9,
            },
            paint: { "text-color": "#5B3F49", "text-halo-color": "rgba(255,250,247,0.95)", "text-halo-width": 1.4 },
          });

          map.on("click", `${PLACES}-pins`, (e: MapMouseEvent & { features?: { properties?: Record<string, unknown> }[] }) => {
            const id = e.features?.[0]?.properties?.id;
            if (typeof id === "string") callbacks.current.onSelect?.(id);
          });
          map.on("click", `${PLACES}-clusters`, async (e: MapMouseEvent & { features?: { properties?: Record<string, unknown>; geometry?: unknown }[] }) => {
            const feature = e.features?.[0];
            const clusterId = feature?.properties?.cluster_id;
            if (typeof clusterId !== "number" || !map) return;
            const target = await (map.getSource(PLACES) as GeoJSONSource).getClusterExpansionZoom(clusterId);
            map.easeTo({ center: (feature?.geometry as { coordinates: [number, number] }).coordinates, zoom: Math.min(target + 0.3, 18), duration: 450 });
          });
          for (const layer of [`${PLACES}-pins`, `${PLACES}-clusters`]) {
            map.on("mouseenter", layer, () => map && (map.getCanvas().style.cursor = "pointer"));
            map.on("mouseleave", layer, () => map && (map.getCanvas().style.cursor = ""));
          }
          // Only a drag or a pinch by a person counts; the map moving itself to a new search does not.
          map.on("moveend", (e: { originalEvent?: unknown }) => {
            if (!map || !e.originalEvent) return;
            const c = map.getCenter();
            const bounds = map.getBounds();
            const here = { lat: c.lat, lng: c.lng };
            const half = Math.min(distanceKm(here, { lat: bounds.getNorth(), lng: c.lng }), distanceKm(here, { lat: c.lat, lng: bounds.getEast() })) * 1000;
            const from = searchedAt.current;
            if (from && distanceKm(from, here) * 1000 < Math.max(250, half * MOVED_SHARE)) return setMoved(null);
            setMoved({ center: here, radiusM: Math.round(half) });
          });
          mapRef.current = map;
          setState("ready");
        });
        map.on("error", () => undefined);
      } catch {
        if (!cancelled) setState("failed");
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current = null;
      map?.remove();
    };
  }, []);

  // A new search: go there.
  useEffect(() => {
    const map = mapRef.current;
    if (state !== "ready" || !map || !center) return;
    searchedAt.current = center;
    const here = map.getCenter();
    if (distanceKm({ lat: here.lat, lng: here.lng }, center) < 0.05 && map.getZoom() > 11) return;
    map.easeTo({ center: [center.lng, center.lat], zoom: Math.max(zoom, map.getZoom() > 11 ? Math.min(map.getZoom(), 16) : zoom), duration: 900 });
  }, [center, zoom, state]);

  useEffect(() => {
    const map = mapRef.current;
    if (state !== "ready" || !map) return;
    (map.getSource(PLACES) as GeoJSONSource | undefined)?.setData(toFeatures(places));
  }, [places, state]);

  useEffect(() => {
    const map = mapRef.current;
    if (state !== "ready" || !map) return;
    const hovered = hoveredId ? places.find((p) => p.id === hoveredId) : null;
    (map.getSource(HALO) as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: hovered ? [{ type: "Feature", geometry: { type: "Point", coordinates: [hovered.lng, hovered.lat] }, properties: {} }] : [] });
  }, [hoveredId, places, state]);

  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (state !== "ready" || !map || !lib) return;
    selectedMarker.current?.remove();
    selectedMarker.current = null;
    if (!selected) return;
    const el = document.createElement("div");
    el.className = "ethos-selected-pin";
    el.style.setProperty("--pin", GROUPS[selected.group].color);
    el.appendChild(document.createElement("i"));
    const label = document.createElement("span");
    label.textContent = selected.name;
    el.appendChild(label);
    selectedMarker.current = new lib.Marker({ element: el, anchor: "bottom" }).setLngLat([selected.lng, selected.lat]).addTo(map);
    if (!map.getBounds().contains([selected.lng, selected.lat])) map.easeTo({ center: [selected.lng, selected.lat], duration: 500 });
  }, [selected, state]);

  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (state !== "ready" || !map || !lib) return;
    for (const m of stopMarkers.current) m.remove();
    stopMarkers.current = route.map((stop, i) => new lib.Marker({ element: numbered(i + 1, stop.name), anchor: "center" }).setLngLat([stop.lng, stop.lat]).addTo(map));
    (map.getSource(ROUTE) as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: route.length > 1 ? [{ type: "Feature", geometry: { type: "LineString", coordinates: route.map((s) => [s.lng, s.lat]) }, properties: {} }] : [] });
    if (route.length === 0) return;
    const still = !first.current.interactive;
    if (!still && !fitRoute) return;
    const bounds = new lib.LngLatBounds();
    for (const s of route) bounds.extend([s.lng, s.lat]);
    map.fitBounds(bounds, { padding: still ? 56 : { top: 150, bottom: 90, left: 90, right: 90 }, maxZoom: 16.4, duration: still ? 0 : 700 });
  }, [route, fitRoute, state]);

  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (state !== "ready" || !map || !lib) return;
    originMarker.current?.remove();
    originMarker.current = null;
    if (!origin) return;
    const el = document.createElement("div");
    el.className = "ethos-you-pin";
    originMarker.current = new lib.Marker({ element: el }).setLngLat([origin.lng, origin.lat]).addTo(map);
  }, [origin, state]);

  return (
    <div className={cn("relative isolate overflow-hidden", className)} style={{ background: MAP_PAPER }}>
      {/* Sized with height, not inset: MapLibre's stylesheet sets `position: relative` on this element. */}
      <div ref={holder} className="h-full w-full" role="application" aria-label={labels.map} data-map-state={state} />
      {state === "loading" ? (
        <div className="absolute inset-0 grid place-items-center text-[13px] text-[#8A6F78]">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-soft backdrop-blur">
            <Loader2 className="size-4 animate-spin" />
            {labels.loading}
          </span>
        </div>
      ) : null}
      {state === "failed" ? <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-sm leading-relaxed text-[#8A6F78]">{labels.unavailable}</p> : null}

      {interactive && state === "ready" ? (
        <>
          {/* On a wide screen the map runs up behind the site's floating header; its own controls start below that. */}
          <div className="pointer-events-none absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex justify-center px-3 lg:top-[calc(var(--header-h,0px)+0.5rem)]">
            {searching ? (
              <span className="inline-flex h-10 items-center gap-2 rounded-full bg-white/95 px-4 text-[13px] font-medium text-forest shadow-lift">
                <Loader2 className="size-4 animate-spin" />
                {labels.loading}
              </span>
            ) : moved && onSearchArea ? (
              <button
                type="button"
                onClick={() => {
                  onSearchArea(moved.center, moved.radiusM);
                  setMoved(null);
                }}
                className="pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full bg-forest px-5 text-[13.5px] font-semibold text-cream shadow-lift transition-transform hover:-translate-y-0.5"
              >
                <Search className="size-4" />
                {labels.searchHere}
              </button>
            ) : null}
          </div>
          <div className="absolute right-3 bottom-10 z-10 flex flex-col overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-forest/10 max-lg:bottom-24">
            {onNearMe ? (
              <button type="button" onClick={onNearMe} aria-label={labels.nearMe} title={labels.nearMe} className="grid size-11 place-items-center text-[#8E2F4C] hover:bg-[#FBE9EE]">
                {locating ? <Loader2 className="size-[18px] animate-spin" /> : <LocateFixed className="size-[18px]" />}
              </button>
            ) : null}
            <button type="button" onClick={() => mapRef.current?.zoomIn()} aria-label={labels.zoomIn} className="hidden size-11 place-items-center border-t border-forest/10 text-forest hover:bg-forest/5 lg:grid">
              <Plus className="size-[18px]" />
            </button>
            <button type="button" onClick={() => mapRef.current?.zoomOut()} aria-label={labels.zoomOut} className="hidden size-11 place-items-center border-t border-forest/10 text-forest hover:bg-forest/5 lg:grid">
              <Minus className="size-[18px]" />
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
