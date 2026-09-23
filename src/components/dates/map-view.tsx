"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { DataDrivenPropertyValueSpecification, ExpressionSpecification, Map as MapLibreMap, MapMouseEvent, Marker } from "maplibre-gl";
import { Loader2, LocateFixed, Minus, Plus, RotateCw } from "lucide-react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { cn } from "@/lib/utils";
import { distanceKm, type LatLng } from "@/lib/dates/geo";
import { GROUP_IDS, GROUPS } from "@/lib/dates/kinds";
import { CAMERA_MS, DOTS_MS, drawRoute, easeOutQuint, FRAME_MS, prefersStill, revealWhenDrawn, setDataDrawn } from "@/lib/dates/map-motion";
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
  /**
   * Which route this is (an idea and its shuffles), when the map should frame it: whenever this
   * changes, and when its stops change because of a search somewhere else, but never because the
   * map was dragged and searched its new view itself. Absent for a plan being added to while
   * browsing, which is left where they are looking.
   */
  fitRoute?: string | null;
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
/**
 * Two dot layers taking turns: each new set of places goes into the hidden one, which fades in
 * as the other fades out, so the dots crossfade with the search instead of blinking (a MapLibre
 * paint transition can fade a layer, not the features in it).
 */
const DOTS = [`${PLACES}-a`, `${PLACES}-b`] as const;
const HALO = "ethos-halo";
const ROUTE = "ethos-route";
const DOT_OPACITY = 0.5;
const DOT_STROKE = 0.8;
/** A dot's size by zoom; a layer on its way out shrinks to half as it fades, and grows back in. */
const dotRadius = (k: number) => ["interpolate", ["linear"], ["zoom"], 11, 2.5 * k, 15, 4 * k, 18, 5.5 * k] as ExpressionSpecification;
/** Further than this, a new search is another town: the map flies there, or cuts if it is far. */
const EASE_KM = 25;
/** A flight that would take longer than this is a cut instead (MapLibre's own maxDuration rule). */
const FLY_MAX_MS = 1300;
const FADE = { duration: 0.2, ease: [0.22, 1, 0.36, 1] } as const;
/** The status chip over the map: a short drop and fade in, a lift and fade out. */
const CHIP = { initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: FADE } as const;
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

/** A numbered stop: MapLibre moves the root, the disc inside it pops in when the line reaches it. */
function numbered(): { root: HTMLElement; disc: HTMLElement } {
  const root = document.createElement("div");
  root.className = "ethos-stop-root";
  const disc = document.createElement("span");
  disc.className = "ethos-stop-pin is-waiting";
  root.append(disc);
  return { root, disc };
}
type Stop = { lat: number; lng: number; name: string };
/** Stops are told apart by where they are (the same place twice is two stops, in order). */
function stopKeys(route: Stop[]): string[] {
  const seen = new Map<string, number>();
  return route.map((s) => {
    const at = `${s.lat.toFixed(6)},${s.lng.toFixed(6)}`;
    const n = seen.get(at) ?? 0;
    seen.set(at, n + 1);
    return `${at}#${n}`;
  });
}

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
  // The canvas stays transparent over the paper until its first tiles are drawn, then fades in.
  const [drawn, setDrawn] = useState(false);
  const settle = useRef<number | undefined>(undefined);
  const searchedAt = useRef<LatLng | null>(null);
  // Where the map itself last asked the page to search, until that search comes back as `center`.
  const ownSearch = useRef<LatLng | null>(null);
  // Whether the page's latest `center` was a search the map asked for itself (a drag).
  const centerOwn = useRef(false);
  const callbacks = useRef({ onSelect, onSearchArea, onHover, cover });
  const live = useRef({ ratings: ratings ?? {}, locale, center, labels, route });
  useEffect(() => {
    callbacks.current = { onSelect, onSearchArea, onHover, cover };
    live.current = { ratings: ratings ?? {}, locale, center, labels, route };
  });
  const pins = useRef<PinsController | null>(null);
  const stopMarkers = useRef(new Map<string, { marker: Marker; disc: HTMLElement }>());
  // The route last drawn, what it was last framed for, and the pen still drawing it.
  const drawnRoute = useRef<string[]>([]);
  const fitted = useRef<{ id: string | null; key: string }>({ id: null, key: "" });
  const stopDrawing = useRef<() => void>(() => undefined);
  const originMarker = useRef<Marker | null>(null);
  // Which dot layer is showing, and the latest set of places sent to the other.
  const dots = useRef({ front: 0, token: 0 });
  const first = useRef({ zoom, interactive });

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    const undo: (() => void)[] = [];
    const shownStops = stopMarkers.current;
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
        // Paint changes fade (MapLibre's own transitions); with reduced motion they are instant.
        const fade = { duration: prefersStill() ? 0 : DOTS_MS, delay: 0 };
        made.addSource(ROUTE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        made.addLayer({ id: ROUTE, type: "line", source: ROUTE, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ROSE, "line-width": 3, "line-dasharray": [0.2, 2], "line-opacity": 0.85 } });
        made.addSource(HALO, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        made.addLayer({
          id: HALO,
          type: "circle",
          source: HALO,
          paint: { "circle-radius": 12, "circle-radius-transition": fade, "circle-color": ROSE, "circle-opacity": 0, "circle-opacity-transition": fade, "circle-stroke-color": ROSE, "circle-stroke-width": 1.5, "circle-stroke-opacity": 0, "circle-stroke-opacity-transition": fade },
        });
        // Every place is a dot, so the shape of a neighbourhood reads at a glance; the pills on
        // top of them are elements, and only as many as fit (map-pins.ts). Both layers start
        // hidden and small, and the first places grow and fade in.
        for (const id of DOTS) {
          made.addSource(id, { type: "geojson", data: { type: "FeatureCollection", features: [] }, promoteId: "id" });
          made.addLayer({
            id,
            type: "circle",
            source: id,
            paint: {
              "circle-radius": dotRadius(0.5),
              "circle-radius-transition": fade,
              "circle-color": groupColour(),
              "circle-opacity": 0,
              "circle-opacity-transition": fade,
              "circle-stroke-color": "#FFFFFF",
              "circle-stroke-width": 1.5,
              "circle-stroke-opacity": 0,
              "circle-stroke-opacity-transition": fade,
            },
          });
          // Only the layer showing answers: the other may still hold the last search's dots.
          made.on("click", id, (e: MapMouseEvent & { features?: { properties?: Record<string, unknown> }[] }) => {
            if (id !== DOTS[dots.current.front]) return;
            const place = e.features?.[0]?.properties?.id;
            if (typeof place === "string") callbacks.current.onSelect?.(place);
          });
          made.on("mouseenter", id, () => {
            if (id === DOTS[dots.current.front]) made.getCanvas().style.cursor = "pointer";
          });
          made.on("mouseleave", id, () => (made.getCanvas().style.cursor = ""));
        }
        // A tap on bare map puts the open place away, as in any maps app. A pill's own click stops
        // there (map-pins.ts), and MapLibre fires no click after a drag, so panning under an open
        // sheet still works.
        made.on("click", (e: MapMouseEvent) => {
          if (made.queryRenderedFeatures(e.point, { layers: [DOTS[dots.current.front]] }).length > 0) return;
          callbacks.current.onSelect?.(null);
        });

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
        undo.push(revealWhenDrawn(made, () => setDrawn(true)));
      });
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(settle.current);
      for (const fn of undo) fn();
      mapRef.current = null;
      pins.current?.destroy();
      pins.current = null;
      // A map made again (a retry) starts from nothing: no stops shown, no route drawn or framed,
      // and its first dot layer in front.
      stopDrawing.current();
      for (const stop of shownStops.values()) stop.marker.remove();
      shownStops.clear();
      drawnRoute.current = [];
      fitted.current = { id: null, key: "" };
      dots.current = { front: 0, token: dots.current.token + 1 };
      map?.remove();
    };
  }, [attempt]);

  // Lost on the way in (offline, a tunnel): try again as soon as the connection is back.
  useEffect(() => {
    if (state !== "failed") return;
    const again = () => {
      setState("loading");
      setDrawn(false);
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
    setDrawn(false);
    setAttempt((n) => n + 1);
  };

  // A new search: go there. Unless the map asked for it itself: then they are already looking at
  // it, and the camera stays exactly where they left it.
  useEffect(() => {
    const map = mapRef.current;
    if (state !== "ready" || !map || !center) return;
    searchedAt.current = center;
    const own = ownSearch.current;
    ownSearch.current = null;
    centerOwn.current = Boolean(own && distanceKm(own, center) < OWN_SEARCH_KM);
    if (centerOwn.current) return;
    const here = map.getCenter();
    const away = distanceKm({ lat: here.lat, lng: here.lng }, center);
    if (away < 0.05 && map.getZoom() > 11) return;
    const to = { center: [center.lng, center.lat] as [number, number], zoom: Math.max(zoom, map.getZoom() > 11 ? Math.min(map.getZoom(), 16) : zoom) };
    // Across a town, a glide; to the next town, a short flight; to another country, a cut: a
    // flight that far is seconds of blank paper while the tiles on the way load.
    if (away < EASE_KM) map.easeTo({ ...to, duration: FRAME_MS, easing: easeOutQuint });
    else map.flyTo({ ...to, speed: 1.8, maxDuration: FLY_MAX_MS, easing: easeOutQuint });
  }, [center, zoom, state]);

  // The dots of a new set of places go into the hidden layer and fade in over the old ones.
  useEffect(() => {
    const map = mapRef.current;
    if (state !== "ready" || !map) return;
    const turn = dots.current;
    const back = 1 - turn.front;
    const token = ++turn.token;
    void setDataDrawn(map, DOTS[back], toFeatures(places)).then(() => {
      if (token !== turn.token || mapRef.current !== map) return;
      const show = (i: number, on: boolean) => {
        map.setPaintProperty(DOTS[i], "circle-opacity", on ? DOT_OPACITY : 0);
        map.setPaintProperty(DOTS[i], "circle-stroke-opacity", on ? DOT_STROKE : 0);
        map.setPaintProperty(DOTS[i], "circle-radius", dotRadius(on ? 1 : 0.5));
      };
      show(back, true);
      show(turn.front, false);
      turn.front = back;
    });
  }, [places, state]);

  // The pills follow the places, the chosen one and the pointed-at one.
  useEffect(() => {
    if (state !== "ready") return;
    pins.current?.sync({ places, selected, hoveredId });
  }, [places, selected, hoveredId, ratings, state]);

  // A soft ring under the place being pointed at, grown and faded in once it is where it belongs;
  // let go, it shrinks and fades where it was.
  const hovered = hoveredId ? places.find((p) => p.id === hoveredId) : undefined;
  const hoveredLat = hovered?.lat;
  const hoveredLng = hovered?.lng;
  useEffect(() => {
    const map = mapRef.current;
    if (state !== "ready" || !map) return;
    const ring = (on: boolean) => {
      map.setPaintProperty(HALO, "circle-opacity", on ? 0.18 : 0);
      map.setPaintProperty(HALO, "circle-stroke-opacity", on ? 0.55 : 0);
      map.setPaintProperty(HALO, "circle-radius", on ? 21 : 12);
    };
    ring(false);
    if (hoveredLat === undefined || hoveredLng === undefined) return;
    let current = true;
    void setDataDrawn(map, HALO, { type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Point", coordinates: [hoveredLng, hoveredLat] }, properties: {} }] }).then(() => {
      if (current && mapRef.current === map) ring(true);
    });
    return () => {
      current = false;
    };
  }, [hoveredLat, hoveredLng, state]);

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
    map.easeTo({ center: [selectedLng, selectedLat], offset: [target.x - view.w / 2, target.y - view.h / 2], duration: CAMERA_MS, easing: easeOutQuint });
  }, [selectedId, selectedLat, selectedLng, state]);

  // The route: its line drawn in as if by pen (only the new leg, when a stop was added to the end),
  // each new stop popping in as the pen reaches it, and stops that stay keeping their marker. Keyed
  // on where the stops are, so the same route handed over again (a re-render, a late rating) is
  // left alone instead of being torn down and put back.
  const routeKey = stopKeys(route).join(";");
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    // Drawn once the streets are showing: a line drawn on the canvas while it waits to fade in
    // would be over before anyone saw it.
    if (state !== "ready" || !drawn || !map || !lib) return;
    const stops = live.current.route;
    const keys = routeKey ? routeKey.split(";") : [];
    const shown = stopMarkers.current;
    for (const [key, stop] of shown) {
      if (keys.includes(key)) continue;
      shown.delete(key);
      stop.disc.classList.add("is-out");
      window.setTimeout(() => stop.marker.remove(), 200);
    }
    const waiting = new Map<number, HTMLElement>();
    stops.forEach((stop, i) => {
      let shownStop = shown.get(keys[i]);
      if (!shownStop) {
        const { root, disc } = numbered();
        shownStop = { marker: new lib.Marker({ element: root, anchor: "center" }).setLngLat([stop.lng, stop.lat]).addTo(map), disc };
        shown.set(keys[i], shownStop);
        waiting.set(i, disc);
      }
      shownStop.disc.textContent = String(i + 1);
      shownStop.disc.setAttribute("aria-label", `${i + 1}. ${stop.name}`);
    });
    // Added to the end (a stop put in the plan while browsing): only the new leg is drawn.
    const before = drawnRoute.current;
    const extended = before.length > 1 && before.length < keys.length && before.every((k, i) => k === keys[i]);
    drawnRoute.current = keys;
    stopDrawing.current();
    stopDrawing.current = drawRoute(
      map,
      ROUTE,
      stops.map((s) => [s.lng, s.lat]),
      { from: extended ? before.length - 1 : 0, ms: FRAME_MS, onReach: (i) => waiting.get(i)?.classList.remove("is-waiting") },
    );
  }, [routeKey, state, drawn]);
  useEffect(() => () => stopDrawing.current(), []);

  // Framing the route. A still map (the plan's) frames every version of it, the first at once. The
  // explorer's frames an idea when it is picked or shuffled, and again when a search elsewhere
  // changes its stops, but not when a drag of the map set that search off: the camera stays put.
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (state !== "ready" || !map || !lib || !routeKey) return;
    const still = !first.current.interactive;
    const id = fitRoute ?? null;
    const was = fitted.current;
    if (still ? routeKey === was.key : id === null || (id === was.id && (routeKey === was.key || centerOwn.current))) return;
    fitted.current = { id, key: routeKey };
    const bounds = new lib.LngLatBounds();
    for (const s of live.current.route) bounds.extend([s.lng, s.lat]);
    const frame = () => void map.fitBounds(bounds, { padding: still ? 56 : { top: 150, bottom: 90, left: 90, right: 90 }, maxZoom: 16.4, duration: still && !was.key ? 0 : FRAME_MS, easing: easeOutQuint });
    // A phone's map put away behind the list has no size to frame anything in: it frames the
    // route when it is next opened instead.
    if (map.getCanvas().clientWidth > 0) return frame();
    map.once("resize", frame);
    return () => void map.off("resize", frame);
  }, [routeKey, fitRoute, state]);

  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (state !== "ready" || !map || !lib) return;
    originMarker.current?.remove();
    originMarker.current = null;
    if (!origin) return;
    const root = document.createElement("div");
    const dot = document.createElement("span");
    dot.className = "ethos-you-pin";
    root.append(dot);
    originMarker.current = new lib.Marker({ element: root }).setLngLat([origin.lng, origin.lat]).addTo(map);
  }, [origin, state]);

  return (
    // With reduced motion, what moves here only fades (motion's "user" setting drops the transforms).
    <MotionConfig reducedMotion="user">
    <div className={cn("relative isolate overflow-hidden", className)} style={{ background: MAP_PAPER }}>
      {/* Sized with height, not inset: MapLibre's stylesheet sets `position: relative` on this element. */}
      <div ref={holder} className="ethos-map-canvas h-full w-full" role="application" aria-label={labels.map} data-map-state={state} data-drawn={drawn ? "true" : "false"} />
      <AnimatePresence initial={false}>
        {state === "loading" ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FADE} className="pointer-events-none absolute inset-0 grid place-items-center text-[13px] text-forest/65">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-soft backdrop-blur">
              <Loader2 className="size-4 animate-spin" />
              {labels.loading}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
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
            {/* One chip at a time, each dropping in and lifting away; "wait", so two never stack. */}
            <AnimatePresence mode="wait" initial={false}>
              {notice ? (
                <motion.span key="notice" {...CHIP} role="status" className="inline-flex min-h-10 max-w-full items-center rounded-full bg-white/95 px-4 py-2 text-center text-[13px] leading-snug font-medium text-destructive shadow-lift">
                  {notice}
                </motion.span>
              ) : searching ? (
                <motion.span key="searching" {...CHIP} className="inline-flex h-10 items-center gap-2 rounded-full bg-white/95 px-4 text-[13px] font-medium text-forest shadow-lift">
                  <Loader2 className="size-4 animate-spin" />
                  {labels.loading}
                </motion.span>
              ) : farOut && onSearchArea ? (
                <motion.span key="far" {...CHIP} className="inline-flex h-10 items-center gap-2 rounded-full bg-white/95 px-4 text-[13px] font-medium text-forest shadow-lift">
                  <Plus className="size-4 text-rose-deep" />
                  {labels.zoomToSee}
                </motion.span>
              ) : null}
            </AnimatePresence>
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
    </MotionConfig>
  );
}
