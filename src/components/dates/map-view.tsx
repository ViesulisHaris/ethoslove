"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { DataDrivenPropertyValueSpecification, GeoJSONSource, Map as MapLibreMap, MapMouseEvent, Marker } from "maplibre-gl";
import { Loader2, LocateFixed, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { distanceKm, type LatLng } from "@/lib/dates/geo";
import { GROUP_IDS, GROUPS } from "@/lib/dates/kinds";
import { applyPalette, MAP_PAPER, type MapStyle } from "@/lib/dates/map-style";
import { MAP_STYLE_URL, MAPLIBRE_URL } from "@/lib/dates/map-vendor";
import type { Place } from "@/lib/dates/places";
import type { Ratings } from "@/lib/dates/rank";
import { createPins, type PinsController } from "./map-pins";

type MapLibre = typeof import("maplibre-gl");

export type MapLabels = { zoomToSee: string; nearMe: string; loading: string; unavailable: string; map: string; zoomIn: string; zoomOut: string };

type Props = {
  center: LatLng | null;
  zoom?: number;
  places: Place[];
  selected: Place | null;
  hoveredId: string | null;
  /** What the cards know about stars, so a pin can say it too. */
  ratings?: Ratings;
  locale?: "en" | "es";
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
  /** Pointing at a pin lights its card in the list, the way pointing at a card lights its pin. */
  onHover?: (id: string | null) => void;
  onSearchArea?: (center: LatLng, radiusM: number) => void;
  onNearMe?: () => void;
};

const PLACES = "ethos-places";
const HALO = "ethos-halo";
const ROUTE = "ethos-route";
/* The same rose as the site's tokens, as literals: MapLibre paints on a canvas and cannot read CSS variables. */
const ROSE = "#D6336C";
/** How far the map has to be dragged, as a share of what it shows, before it looks again. */
const MOVED_SHARE = 0.35;
/**
 * Closer than this, a moved map finds the places in the new view by itself, the way Airbnb does.
 * Further out it would be searching a whole region at once, which the tiles cannot answer well, so
 * it asks for a zoom instead.
 */
const AUTO_FROM_ZOOM = 12;
/** A drag often comes in two or three flicks: wait for the map to settle before searching. */
const SETTLE_MS = 450;

/** One colour per group, as the expression MapLibre wants: match, then a pair per group, then a fallback. */
const groupColour = () => ["match", ["get", "group"], ...GROUP_IDS.flatMap((g) => [g, GROUPS[g].color]), ROSE] as unknown as DataDrivenPropertyValueSpecification<string>;

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
export function MapView({ center, zoom = 14, places, selected, hoveredId, ratings, locale = "en", route, fitRoute, origin, searching, locating, labels, interactive = true, className, onSelect, onHover, onSearchArea, onNearMe }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const libRef = useRef<MapLibre | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  // Too far out to show places: the map says so rather than searching a country at once.
  const [farOut, setFarOut] = useState(false);
  const settle = useRef<number | undefined>(undefined);
  const searchedAt = useRef<LatLng | null>(null);
  const callbacks = useRef({ onSelect, onSearchArea, onHover });
  const live = useRef({ ratings: ratings ?? {}, locale });
  useEffect(() => {
    callbacks.current = { onSelect, onSearchArea, onHover };
    live.current = { ratings: ratings ?? {}, locale };
  });
  const pins = useRef<PinsController | null>(null);
  const stopMarkers = useRef<Marker[]>([]);
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

        // Ready when the style is, not when every tile has arrived: the pins are ours and need no
        // network, so on a slow connection they are on the paper at once and the streets fill in
        // beneath them. Waiting for "load" left a blank panel saying "Loading…" for as long as that took.
        map.once("style.load", () => {
          if (cancelled || !map) return;
          map.addSource(ROUTE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          map.addLayer({ id: ROUTE, type: "line", source: ROUTE, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ROSE, "line-width": 3, "line-dasharray": [0.2, 2], "line-opacity": 0.85 } });
          map.addSource(HALO, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          map.addLayer({ id: HALO, type: "circle", source: HALO, paint: { "circle-radius": 21, "circle-color": ROSE, "circle-opacity": 0.18, "circle-stroke-color": ROSE, "circle-stroke-width": 1.5, "circle-stroke-opacity": 0.55 } });
          map.addSource(PLACES, { type: "geojson", data: { type: "FeatureCollection", features: [] }, promoteId: "id" });
          // Every place is a dot, so the shape of a neighbourhood reads at a glance; the pills on
          // top of them are elements, and only as many as fit (map-pins.ts).
          map.addLayer({
            id: `${PLACES}-dots`,
            type: "circle",
            source: PLACES,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 2.5, 15, 4, 18, 5.5],
              "circle-color": groupColour(),
              "circle-opacity": 0.5,
              "circle-stroke-color": "#FFFFFF",
              "circle-stroke-width": 1.5,
              "circle-stroke-opacity": 0.8,
            },
          });

          map.on("click", `${PLACES}-dots`, (e: MapMouseEvent & { features?: { properties?: Record<string, unknown> }[] }) => {
            const id = e.features?.[0]?.properties?.id;
            if (typeof id === "string") callbacks.current.onSelect?.(id);
          });
          map.on("mouseenter", `${PLACES}-dots`, () => map && (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", `${PLACES}-dots`, () => map && (map.getCanvas().style.cursor = ""));

          // A drag, a pinch, a scroll or our own zoom buttons count; the map moving itself to a new
          // search does not, or every search would set off another.
          map.on("moveend", (e: { originalEvent?: unknown; byPerson?: boolean }) => {
            if (!map || (!e.originalEvent && !e.byPerson)) return;
            window.clearTimeout(settle.current);
            if (map.getZoom() < AUTO_FROM_ZOOM) return setFarOut(true);
            setFarOut(false);
            const c = map.getCenter();
            const bounds = map.getBounds();
            const here = { lat: c.lat, lng: c.lng };
            const half = Math.min(distanceKm(here, { lat: bounds.getNorth(), lng: c.lng }), distanceKm(here, { lat: c.lat, lng: bounds.getEast() })) * 1000;
            const from = searchedAt.current;
            if (from && distanceKm(from, here) * 1000 < Math.max(250, half * MOVED_SHARE)) return;
            settle.current = window.setTimeout(() => {
              searchedAt.current = here;
              callbacks.current.onSearchArea?.(here, Math.round(half));
            }, SETTLE_MS);
          });
          pins.current = createPins(lib, map, {
            locale: live.current.locale,
            ratings: () => live.current.ratings,
            onSelect: (id) => callbacks.current.onSelect?.(id),
            onHover: (id) => callbacks.current.onHover?.(id),
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
      window.clearTimeout(settle.current);
      mapRef.current = null;
      pins.current?.destroy();
      pins.current = null;
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

  // The pills follow the places, the chosen one and the pointed-at one.
  useEffect(() => {
    if (state !== "ready") return;
    pins.current?.sync({ places, selected, hoveredId });
  }, [places, selected, hoveredId, ratings, state]);

  useEffect(() => {
    const map = mapRef.current;
    if (state !== "ready" || !map) return;
    const hovered = hoveredId ? places.find((p) => p.id === hoveredId) : null;
    (map.getSource(HALO) as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: hovered ? [{ type: "Feature", geometry: { type: "Point", coordinates: [hovered.lng, hovered.lat] }, properties: {} }] : [] });
  }, [hoveredId, places, state]);

  // A place chosen from the list may be off the screen: bring it into view, its pill and all.
  useEffect(() => {
    const map = mapRef.current;
    if (state !== "ready" || !map || !selected) return;
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
        <div className="absolute inset-0 grid place-items-center text-[13px] text-forest/55">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-soft backdrop-blur">
            <Loader2 className="size-4 animate-spin" />
            {labels.loading}
          </span>
        </div>
      ) : null}
      {state === "failed" ? <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-sm leading-relaxed text-forest/55">{labels.unavailable}</p> : null}

      {interactive && state === "ready" ? (
        <>
          {/* On a wide screen the map runs up behind the site's floating header; its own controls start below that. */}
          <div className="pointer-events-none absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex justify-center px-3 lg:top-[calc(var(--header-h,0px)+0.5rem)]">
            {searching ? (
              <span className="inline-flex h-10 items-center gap-2 rounded-full bg-white/95 px-4 text-[13px] font-medium text-forest shadow-lift">
                <Loader2 className="size-4 animate-spin" />
                {labels.loading}
              </span>
            ) : farOut && onSearchArea ? (
              <span className="inline-flex h-10 items-center gap-2 rounded-full bg-white/95 px-4 text-[13px] font-medium text-forest shadow-lift">
                <Plus className="size-4 text-rose-deep" />
                {labels.zoomToSee}
              </span>
            ) : null}
          </div>
          <div className="absolute right-3 bottom-10 z-10 flex flex-col overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-forest/10 max-lg:bottom-24">
            {onNearMe ? (
              <button type="button" onClick={onNearMe} aria-label={labels.nearMe} title={labels.nearMe} className="grid size-11 place-items-center text-rose-ink hover:bg-rose-soft">
                {locating ? <Loader2 className="size-[18px] animate-spin" /> : <LocateFixed className="size-[18px]" />}
              </button>
            ) : null}
            <button type="button" onClick={() => mapRef.current?.zoomIn(undefined, { byPerson: true })} aria-label={labels.zoomIn} className="hidden size-11 place-items-center border-t border-forest/10 text-forest hover:bg-forest/5 lg:grid">
              <Plus className="size-[18px]" />
            </button>
            <button type="button" onClick={() => mapRef.current?.zoomOut(undefined, { byPerson: true })} aria-label={labels.zoomOut} className="hidden size-11 place-items-center border-t border-forest/10 text-forest hover:bg-forest/5 lg:grid">
              <Minus className="size-[18px]" />
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
