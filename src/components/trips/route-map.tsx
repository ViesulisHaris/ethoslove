"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { Loader2 } from "lucide-react";
import { applyPalette, MAP_PAPER, type MapStyle } from "@/lib/dates/map-style";
import { MAPLIBRE_URL, loadMapStyle, preloadMapLibre } from "@/lib/dates/map-vendor";
import type { TripKind } from "@/lib/trips/presets";

type MapLibre = typeof import("maplibre-gl");

export type RouteMapLabels = {
  map: string;
  loading: string;
  unavailable: string;
  gestureMobile: string;
  gestureWindows: string;
  gestureMac: string;
  zoomIn: string;
  zoomOut: string;
  credits: string;
};

type Props = { stops: { name: string; lat: number; lng: number }[]; kind: TripKind; labels: RouteMapLabels };

const ROUTE = "ethos-trip-route";
/* The site's rose and a sea blue, as literals: MapLibre paints on a canvas and cannot read CSS variables. */
const ROSE = "#D6336C";
const SEA = "#2F7FB5";
/**
 * How each kind of trip is drawn: a road is a solid line, a railway a dashed one, a ferry a dotted
 * line over the sea, and a city (on foot, by bike) the same dotted rose as a date's route.
 */
const LINE: Record<TripKind, { color: string; width: number; dash?: number[] }> = {
  road: { color: ROSE, width: 3.5 },
  train: { color: ROSE, width: 3, dash: [2.2, 1.6] },
  islands: { color: SEA, width: 3.5, dash: [0.1, 2.2] },
  city: { color: ROSE, width: 3, dash: [0.1, 2] },
};
/** Neighbourhoods a kilometre apart should not fill the screen as if they were a street. */
const MAX_ZOOM = 13.5;

const numbered = (n: number, name: string): HTMLElement => {
  const el = document.createElement("div");
  el.className = "ethos-stop-pin";
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", `${n}. ${name}`);
  el.title = name;
  el.textContent = String(n);
  return el;
};

/**
 * The route, drawn on the same blush map as the dates. Loaded only when TripMap sees it coming
 * (MapLibre is a megabyte the rest of the page never needs). Page scroll always wins: one finger
 * scrolls the page on a phone and the wheel scrolls it on a laptop; two fingers, or Ctrl/⌘ with
 * the wheel, move the map. Where there is no WebGL, or the tiles don't answer, the stops are
 * listed in its place.
 */
export default function RouteMap({ stops, kind, labels }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const first = useRef({ stops, kind, labels });

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    (async () => {
      try {
        // Both of MapLibre's files at once (the second is only found by reading the first), and the
        // style beside them, shared with any warm-up that already asked for it, as the Dates map does.
        preloadMapLibre();
        const [lib, raw] = await Promise.all([import(/* webpackIgnore: true */ MAPLIBRE_URL) as Promise<MapLibre>, loadMapStyle()]);
        // A copy: the fetched style is shared with every other map in the visit.
        const style = applyPalette(structuredClone(raw) as MapStyle);
        if (cancelled || !holder.current) return;
        const { stops: route, kind: routeKind, labels: text } = first.current;
        const bounds = new lib.LngLatBounds();
        for (const s of route) bounds.extend([s.lng, s.lat]);
        const phone = window.matchMedia("(max-width: 639px)").matches;
        map = new lib.Map({
          container: holder.current,
          style: style as never,
          bounds,
          fitBoundsOptions: { padding: phone ? 44 : 72, maxZoom: MAX_ZOOM },
          minZoom: 2,
          maxZoom: 17,
          attributionControl: { compact: true },
          cooperativeGestures: true,
          dragRotate: false,
          pitchWithRotate: false,
          locale: {
            "Map.Title": text.map,
            "CooperativeGesturesHandler.MobileHelpText": text.gestureMobile,
            "CooperativeGesturesHandler.WindowsHelpText": text.gestureWindows,
            "CooperativeGesturesHandler.MacHelpText": text.gestureMac,
            "NavigationControl.ZoomIn": text.zoomIn,
            "NavigationControl.ZoomOut": text.zoomOut,
            "AttributionControl.ToggleAttribution": text.credits,
          },
        });
        map.touchZoomRotate.disableRotation();
        map.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
        const live = map;
        live.once("style.load", () => {
          if (cancelled) return;
          const line = LINE[routeKind];
          live.addSource(ROUTE, { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: route.map((s) => [s.lng, s.lat]) }, properties: {} } });
          live.addLayer({
            id: ROUTE,
            type: "line",
            source: ROUTE,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": line.color, "line-width": line.width, "line-opacity": 0.9, ...(line.dash ? { "line-dasharray": line.dash } : {}) },
          });
          route.forEach((s, i) => new lib.Marker({ element: numbered(i + 1, s.name), anchor: "center" }).setLngLat([s.lng, s.lat]).addTo(live));
          setState("ready");
        });
        // A tile that fails is a gap in the paper, not a broken map; MapLibre would log each one.
        live.on("error", () => undefined);
      } catch {
        if (!cancelled) setState("failed");
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  return (
    <div className="relative isolate h-full w-full overflow-hidden" style={{ background: MAP_PAPER }}>
      {/* Sized with height, not inset: MapLibre's stylesheet sets `position: relative` on this element. */}
      <div ref={holder} className="h-full w-full" role="region" aria-label={labels.map} data-map-state={state} />
      {state === "loading" ? (
        <div className="absolute inset-0 grid place-items-center text-[13px] text-forest/55">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 shadow-soft backdrop-blur">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            {labels.loading}
          </span>
        </div>
      ) : null}
      {state === "failed" ? <StopList stops={stops} note={labels.unavailable} /> : null}
    </div>
  );
}

/** What the map would have shown, as a list: the same numbers, the same order. */
export function StopList({ stops, note }: { stops: { name: string }[]; note: string }) {
  return (
    <div className="absolute inset-0 overflow-auto p-5 sm:p-7">
      <p className="text-[13.5px] leading-snug text-forest/60">{note}</p>
      <ol className="mt-4 grid gap-2">
        {stops.map((s, i) => (
          <li key={`${s.name}-${i}`} className="flex items-center gap-3 text-[15px] font-medium text-forest">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-rose text-[12.5px] font-bold text-white">{i + 1}</span>
            {s.name}
          </li>
        ))}
      </ol>
    </div>
  );
}
