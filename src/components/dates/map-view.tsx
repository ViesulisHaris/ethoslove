"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { DataDrivenPropertyValueSpecification, GeoJSONSource, Map as MapLibreMap, MapMouseEvent, Marker } from "maplibre-gl";
import { Loader2, LocateFixed, Minus, Plus, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { distanceKm, type LatLng } from "@/lib/dates/geo";
import { GROUP_IDS, GROUPS } from "@/lib/dates/kinds";
import { applyPalette, MAP_PAPER, type MapStyle } from "@/lib/dates/map-style";
import { loadMapStyle, maplibreUrl, preloadMapLibre } from "@/lib/dates/map-vendor";
import type { Place } from "@/lib/dates/places";
import type { Ratings } from "@/lib/dates/rank";
import { createPins, openArea, pinInArea, type PinsController } from "./map-pins";

type MapLibre = typeof import("maplibre-gl");

export type MapLabels = {
  zoomToSee: string;
  nearMe: string;
  loading: string;
  unavailable: string;
  map: string;
  zoomIn: string;
  zoomOut: string;
  /** The credits' (i) button. MapLibre's own name for it is English. */
  credits?: string;
  /** Offered when the map failed for a reason a second try can fix (a dropped connection). */
  retry?: string;
};

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
  /** Something the page has to say while the map covers it ("we couldn't get your location"). */
  notice?: string | null;
  /** Where the open place's sheet sits over the map, so the chosen place is kept out from under it. */
  cover?: () => DOMRect | null;
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
/**
 * The page rounds every search's centre to a grid of 0.001° (geo.ts snapSearch), up to ~80 m from
 * where the map was left. A search the map asked for itself that comes back within this is the same
 * view, not a new place to go to.
 */
const OWN_SEARCH_KM = 0.2;
const DESKTOP = "(min-width: 1024px)";

/** One colour per group, as the expression MapLibre wants: match, then a pair per group, then a fallback. */
const groupColour = () => ["match", ["get", "group"], ...GROUP_IDS.flatMap((g) => [g, GROUPS[g].color]), ROSE] as unknown as DataDrivenPropertyValueSpecification<string>;

const toFeatures = (places: Place[]) => ({
  type: "FeatureCollection" as const,
  features: places.map((p) => ({ type: "Feature" as const, id: p.id, geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] }, properties: { id: p.id, name: p.name, group: p.group, score: p.score } })),
});

/**
 * How much of the map's top the site's floating header covers. On a wide screen the map runs up
 * behind it; on a phone the full-screen map sits above the header, and nothing covers it.
 */
function headerOverlap(el: HTMLElement | null): number {
  if (!el || !window.matchMedia(DESKTOP).matches) return 0;
  const header = parseFloat(getComputedStyle(el).getPropertyValue("--header-h")) || 0;
  return Math.max(0, header - el.getBoundingClientRect().top);
}

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
 * that fails it says so: a dropped connection is tried again when the connection comes back (or
 * from a button), and a browser that cannot draw maps at all is told so once.
 */
export function MapView({ center, zoom = 14, places, selected, hoveredId, ratings, locale = "en", route, fitRoute, origin, searching, locating, notice, cover, labels, interactive = true, className, onSelect, onHover, onSearchArea, onNearMe }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const libRef = useRef<MapLibre | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed" | "unsupported">("loading");
  // Each try after a failure starts again from scratch…
  const [attempt, setAttempt] = useState(0);
  // …and one after MapLibre itself failed to load asks for it under a new address (see maplibreUrl).
  const libFailures = useRef(0);
  // Too far out to show places: the map says so rather than searching a country at once.
  const [farOut, setFarOut] = useState(false);
  const settle = useRef<number | undefined>(undefined);
  const searchedAt = useRef<LatLng | null>(null);
  // Where the map itself last asked the page to search, until that search comes back as `center`.
  const ownSearch = useRef<LatLng | null>(null);
  const callbacks = useRef({ onSelect, onSearchArea, onHover, cover });
  const live = useRef({ ratings: ratings ?? {}, locale, center, labels });
  useEffect(() => {
    callbacks.current = { onSelect, onSearchArea, onHover, cover };
    live.current = { ratings: ratings ?? {}, locale, center, labels };
  });
  const pins = useRef<PinsController | null>(null);
  const stopMarkers = useRef<Marker[]>([]);
  const originMarker = useRef<Marker | null>(null);
  const first = useRef({ zoom, interactive });

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    const undo: (() => void)[] = [];
    (async () => {
      // Both of MapLibre's files at once: the second is only found by reading the first.
      preloadMapLibre();
      const [loaded, fetched] = await Promise.allSettled([import(/* webpackIgnore: true */ maplibreUrl(libFailures.current)) as Promise<MapLibre>, loadMapStyle()]);
      if (loaded.status === "rejected") libFailures.current += 1;
      if (loaded.status === "rejected" || fetched.status === "rejected") {
        if (!cancelled) setState("failed");
        return;
      }
      const lib = loaded.value;
      const raw = fetched.value;
      if (cancelled || !holder.current) return;
      libRef.current = lib;
      // A copy: the fetched style is shared with any other map on the page, and with a retry.
      const style = applyPalette(structuredClone(raw) as MapStyle);
      const start = { ...first.current, center: live.current.center, labels: live.current.labels };
      try {
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
          // MapLibre names its canvas and the credits' button itself, in English.
          locale: { "Map.Title": start.labels.map, ...(start.labels.credits ? { "AttributionControl.ToggleAttribution": start.labels.credits } : {}) },
        });
      } catch {
        // No WebGL (Lockdown Mode, hardware acceleration off, some locked-down webviews): no second
        // try will change that, so none is offered.
        if (!cancelled) setState("unsupported");
        return;
      }
      const made = map;
      made.touchZoomRotate.disableRotation();
      // On a phone the credits start folded behind their (i), where the dock's buttons are; the same
      // credit is written out under the list. MapLibre unfolds them itself the first time a source
      // says who to credit, a moment after this, unless the control is already marked compact.
      if (window.matchMedia("(max-width: 1023px)").matches) {
        const credits = holder.current.querySelector(".maplibregl-ctrl-attrib");
        credits?.classList.add("maplibregl-compact");
        credits?.classList.remove("maplibregl-compact-show");
        credits?.removeAttribute("open");
      }

      // A tile that fails is a gap in the paper, not a broken map (MapLibre would log each one), but
      // it is never asked for again while it stays in view: when the connection comes back, the
      // tiles are, so a blip on the train doesn't leave holes until the next pan.
      let tilesFailed = false;
      made.on("error", () => {
        tilesFailed = true;
      });
      const refill = () => {
        if (!tilesFailed) return;
        tilesFailed = false;
        try {
          for (const [id, source] of Object.entries(made.getStyle()?.sources ?? {})) if (source.type === "vector") made.refreshTiles(id);
        } catch {
          // The style isn't in yet: its tiles will be asked for anyway.
        }
      };
      window.addEventListener("online", refill);
      undo.push(() => window.removeEventListener("online", refill));

      // Ready when the style is, not when every tile has arrived: the pins are ours and need no
      // network, so on a slow connection they are on the paper at once and the streets fill in
      // beneath them. Waiting for "load" left a blank panel saying "Loading…" for as long as that took.
      made.once("style.load", () => {
        if (cancelled) return;
        made.addSource(ROUTE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        made.addLayer({ id: ROUTE, type: "line", source: ROUTE, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ROSE, "line-width": 3, "line-dasharray": [0.2, 2], "line-opacity": 0.85 } });
        made.addSource(HALO, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        made.addLayer({ id: HALO, type: "circle", source: HALO, paint: { "circle-radius": 21, "circle-color": ROSE, "circle-opacity": 0.18, "circle-stroke-color": ROSE, "circle-stroke-width": 1.5, "circle-stroke-opacity": 0.55 } });
        made.addSource(PLACES, { type: "geojson", data: { type: "FeatureCollection", features: [] }, promoteId: "id" });
        // Every place is a dot, so the shape of a neighbourhood reads at a glance; the pills on
        // top of them are elements, and only as many as fit (map-pins.ts).
        made.addLayer({
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

        made.on("click", `${PLACES}-dots`, (e: MapMouseEvent & { features?: { properties?: Record<string, unknown> }[] }) => {
          const id = e.features?.[0]?.properties?.id;
          if (typeof id === "string") callbacks.current.onSelect?.(id);
        });
        // A tap on bare map puts the open place away, as in any maps app. A pill's own click stops
        // there (map-pins.ts), and MapLibre fires no click after a drag, so panning under an open
        // sheet still works.
        made.on("click", (e: MapMouseEvent) => {
          if (made.queryRenderedFeatures(e.point, { layers: [`${PLACES}-dots`] }).length > 0) return;
          callbacks.current.onSelect?.(null);
        });
        made.on("mouseenter", `${PLACES}-dots`, () => (made.getCanvas().style.cursor = "pointer"));
        made.on("mouseleave", `${PLACES}-dots`, () => (made.getCanvas().style.cursor = ""));

        // A drag, a pinch, a scroll or our own zoom buttons count; the map moving itself to a new
        // search does not, or every search would set off another.
        made.on("moveend", (e: { originalEvent?: unknown; byPerson?: boolean }) => {
          if (!e.originalEvent && !e.byPerson) return;
          window.clearTimeout(settle.current);
          if (made.getZoom() < AUTO_FROM_ZOOM) return setFarOut(true);
          setFarOut(false);
          const c = made.getCenter();
          const bounds = made.getBounds();
          const here = { lat: c.lat, lng: c.lng };
          const half = Math.min(distanceKm(here, { lat: bounds.getNorth(), lng: c.lng }), distanceKm(here, { lat: c.lat, lng: bounds.getEast() })) * 1000;
          const from = searchedAt.current;
          if (from && distanceKm(from, here) * 1000 < Math.max(250, half * MOVED_SHARE)) return;
          settle.current = window.setTimeout(() => {
            searchedAt.current = here;
            ownSearch.current = here;
            callbacks.current.onSearchArea?.(here, Math.round(half));
          }, SETTLE_MS);
        });
        pins.current = createPins(lib, made, {
          locale: live.current.locale,
          ratings: () => live.current.ratings,
          topInset: () => headerOverlap(holder.current),
          onSelect: (id) => callbacks.current.onSelect?.(id),
          onHover: (id) => callbacks.current.onHover?.(id),
        });
        mapRef.current = made;
        setState("ready");
      });
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(settle.current);
      for (const fn of undo) fn();
      mapRef.current = null;
      pins.current?.destroy();
      pins.current = null;
      map?.remove();
    };
  }, [attempt]);

  // Lost on the way in (offline, a tunnel): try again as soon as the connection is back.
  useEffect(() => {
    if (state !== "failed") return;
    const again = () => {
      setState("loading");
      setAttempt((n) => n + 1);
    };
    window.addEventListener("online", again);
    return () => window.removeEventListener("online", again);
  }, [state]);

  const retry = () => {
    // MapLibre failing under a second address too is usually its other file, which the browser now
    // refuses for the rest of the visit and a new address for the first cannot reach: only a fresh
    // page clears that.
    if (libFailures.current > 1) return window.location.reload();
    setState("loading");
    setAttempt((n) => n + 1);
  };

  // A new search: go there. Unless the map asked for it itself: then they are already looking at it.
  useEffect(() => {
    const map = mapRef.current;
    if (state !== "ready" || !map || !center) return;
    searchedAt.current = center;
    const own = ownSearch.current;
    ownSearch.current = null;
    if (own && distanceKm(own, center) < OWN_SEARCH_KM) return;
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

  // A chosen place stays where it can be seen: on the map, below the header, and out from under the
  // sheet that just opened over it (the bottom of a phone, the left of a desktop). Before, the map
  // only moved for a place off the screen, so the pin that was tapped ended up behind its own sheet.
  const selectedId = selected?.id;
  const selectedLat = selected?.lat;
  const selectedLng = selected?.lng;
  useEffect(() => {
    const map = mapRef.current;
    if (state !== "ready" || !map || !selectedId || selectedLat === undefined || selectedLng === undefined) return;
    const canvas = map.getCanvas();
    const view = { w: canvas.clientWidth, h: canvas.clientHeight };
    // A phone's map is kept, hidden, behind the list: nothing to keep in view there.
    if (view.w === 0 || view.h === 0) return;
    const box = canvas.getBoundingClientRect();
    const sheet = callbacks.current.cover?.() ?? null;
    const area = openArea(view, sheet ? { x0: sheet.left - box.left, y0: sheet.top - box.top, x1: sheet.right - box.left, y1: sheet.bottom - box.top } : null, headerOverlap(holder.current));
    if (pinInArea(map.project([selectedLng, selectedLat]), area)) return;
    // A little below the middle of what is left, because the pill hangs above its place. An offset
    // lasts for this one move, where padding would stay on the map and shift every later search.
    const target = { x: (area.x0 + area.x1) / 2, y: area.y0 + (area.y1 - area.y0) * 0.58 };
    map.easeTo({ center: [selectedLng, selectedLat], offset: [target.x - view.w / 2, target.y - view.h / 2], duration: 500 });
  }, [selectedId, selectedLat, selectedLng, state]);

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
        <div className="absolute inset-0 grid place-items-center text-[13px] text-forest/65">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-soft backdrop-blur">
            <Loader2 className="size-4 animate-spin" />
            {labels.loading}
          </span>
        </div>
      ) : null}
      {state === "failed" || state === "unsupported" ? (
        <div className="absolute inset-x-6 top-1/2 flex -translate-y-1/2 flex-col items-center gap-3 text-center">
          <p role="status" className="max-w-sm text-sm leading-relaxed text-forest/60">
            {labels.unavailable}
          </p>
          {state === "failed" && labels.retry ? (
            <button type="button" onClick={retry} className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-forest shadow-soft ring-1 ring-forest/10 transition-colors hover:bg-rose-mist">
              <RotateCw aria-hidden="true" className="size-4" />
              {labels.retry}
            </button>
          ) : null}
        </div>
      ) : null}

      {interactive && state === "ready" ? (
        <>
          {/* On a wide screen the map runs up behind the site's floating header; its own controls start below that. */}
          <div className="pointer-events-none absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-10 flex justify-center px-3 lg:top-[calc(var(--header-h,0px)+0.5rem)]">
            {notice ? (
              <span role="status" className="inline-flex min-h-10 max-w-full items-center rounded-full bg-white/95 px-4 py-2 text-center text-[13px] leading-snug font-medium text-destructive shadow-lift">
                {notice}
              </span>
            ) : searching ? (
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
