import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { GROUP_GLYPHS } from "@/lib/dates/glyphs";
import { GROUPS, KINDS } from "@/lib/dates/kinds";
import type { Place } from "@/lib/dates/places";
import type { Ratings } from "@/lib/dates/rank";

type MapLibre = typeof import("maplibre-gl");

/**
 * The pins on the map, as real elements rather than painted symbols: a pill with the kind's colour,
 * its glyph and the place's name, which grows on hover to say what it is and how far. Elements cost
 * more than a symbol layer, so only what fits on the screen is drawn — the best first, and never
 * two overlapping — and everything else stays a dot on the layer underneath.
 */
export type PinsController = {
  sync: (input: { places: Place[]; selected: Place | null; hoveredId: string | null }) => void;
  destroy: () => void;
};

/** How many pills at a time. Close in, a street can hold more of them; far out, they'd be a wall. */
const limitFor = (zoom: number) => (zoom >= 16.5 ? 70 : zoom >= 15.5 ? 48 : zoom >= 14.5 ? 32 : zoom >= 13 ? 20 : 12);
/** Below this, a pill is its icon alone: names at that scale are a hedge of text. */
const NAMES_FROM = 13.4;
const OUT_MS = 180;

const svgNS = "http://www.w3.org/2000/svg";

function glyph(group: Place["group"]): SVGSVGElement {
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  for (const d of GROUP_GLYPHS[group]) {
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  }
  return svg;
}

const metres = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

export function createPins(lib: MapLibre, map: MapLibreMap, opts: { locale: "en" | "es"; ratings: () => Ratings; onSelect?: (id: string) => void; onHover?: (id: string | null) => void }): PinsController {
  type Pin = { marker: Marker; el: HTMLButtonElement; sub: HTMLSpanElement; place: Place };
  const pins = new Map<string, Pin>();
  const leaving = new Set<string>();
  let last: { places: Place[]; selected: Place | null; hoveredId: string | null } = { places: [], selected: null, hoveredId: null };
  let frame = 0;

  const label = (place: Place) => {
    const rating = opts.ratings()[place.id];
    const kind = KINDS[place.kind].label[opts.locale];
    const stars = rating && rating.reviews > 0 ? ` · ${rating.stars.toFixed(1)}★` : "";
    return `${kind}${stars} · ${metres(place.distanceKm)}`;
  };

  function build(place: Place, order: number): Pin {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "ethos-pin";
    el.style.setProperty("--pin", GROUPS[place.group].color);
    el.style.setProperty("--tint", GROUPS[place.group].soft);
    el.style.setProperty("--i", String(Math.min(order, 18)));

    const icon = document.createElement("span");
    icon.className = "ethos-pin-ico";
    icon.appendChild(glyph(place.group));
    const text = document.createElement("span");
    text.className = "ethos-pin-text";
    const name = document.createElement("span");
    name.className = "ethos-pin-name";
    name.textContent = place.named ? place.name : KINDS[place.kind].label[opts.locale];
    const sub = document.createElement("span");
    sub.className = "ethos-pin-sub";
    sub.textContent = label(place);
    text.append(name, sub);
    el.append(icon, text);
    // The list beside the map is the same places, as real buttons, and it is the keyboard and
    // screen-reader path. Twenty pills in the tab order would only be the list again, in a worse
    // order and in the way, so the map is left to the pointer.
    el.setAttribute("aria-hidden", "true");
    el.tabIndex = -1;
    el.title = `${place.name} · ${label(place)}`;

    el.addEventListener("click", (event) => {
      event.stopPropagation();
      opts.onSelect?.(place.id);
    });
    el.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      opts.onHover?.(place.id);
    });
    el.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") return;
      opts.onHover?.(null);
    });

    const marker = new lib.Marker({ element: el, anchor: "bottom", offset: [0, -6] }).setLngLat([place.lng, place.lat]).addTo(map);
    return { marker, el, sub, place };
  }

  /** Roughly how wide this pill will be: the icon and padding, plus the name at ~7px a letter. */
  function widthOf(place: Place, compact: boolean): number {
    if (compact) return 36;
    const name = place.named ? place.name : KINDS[place.kind].label[opts.locale];
    return Math.min(210, 52 + Math.min(name.length, 24) * 7.1);
  }

  /** The pills that fit: best first, the chosen and hovered ones always, and none on top of another. */
  function choose(places: Place[], selected: Place | null, hoveredId: string | null): Place[] {
    const zoom = map.getZoom();
    const compact = zoom < NAMES_FROM;
    const bounds = map.getBounds();
    const canvas = map.getCanvas();
    const view = { w: canvas.clientWidth, h: canvas.clientHeight };
    const inView = places.filter((p) => bounds.contains([p.lng, p.lat]));
    const first = [selected, inView.find((p) => p.id === hoveredId) ?? null].filter((p): p is Place => Boolean(p));
    const rest = inView.filter((p) => !first.some((f) => f.id === p.id)).sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);
    const wanted = limitFor(zoom);
    const taken: { x: number; y: number; half: number }[] = [];
    const out: Place[] = [];
    for (const place of [...first, ...rest]) {
      if (out.length >= wanted) break;
      const point = map.project([place.lng, place.lat]);
      const half = widthOf(place, compact) / 2;
      // Half a pill over the edge of the map reads as a bug, so the edges are left alone.
      const chosen = place.id === selected?.id || place.id === hoveredId;
      if (!chosen && (point.x - half < 8 || point.x + half > view.w - 8 || point.y < 24 || point.y > view.h - 16)) continue;
      // Nothing is drawn over anything else: each pill keeps its own box in screen space.
      if (taken.some((t) => Math.abs(t.x - point.x) < t.half + half + 10 && Math.abs(t.y - point.y) < 34)) continue;
      taken.push({ x: point.x, y: point.y, half });
      out.push(place);
    }
    return out;
  }

  function apply() {
    frame = 0;
    const { places, selected, hoveredId } = last;
    const zoom = map.getZoom();
    const compact = zoom < NAMES_FROM;
    const keep = choose(places, selected, hoveredId);
    const wanted = new Set(keep.map((p) => p.id));

    for (const [id, pin] of pins) {
      if (wanted.has(id) || leaving.has(id)) continue;
      leaving.add(id);
      pin.el.classList.add("is-out");
      window.setTimeout(() => {
        pin.marker.remove();
        pins.delete(id);
        leaving.delete(id);
      }, OUT_MS);
    }

    keep.forEach((place, order) => {
      let pin = pins.get(place.id);
      if (pin && leaving.has(place.id)) {
        // It was on its way out and is wanted again: keep it, and stop it leaving.
        pin.el.classList.remove("is-out");
        leaving.delete(place.id);
      }
      if (!pin) {
        pin = build(place, order);
        pins.set(place.id, pin);
      } else if (pin.place !== place) {
        pin.sub.textContent = label(place);
        pin.el.title = `${place.name} · ${label(place)}`;
        pin.marker.setLngLat([place.lng, place.lat]);
        pin.place = place;
      }
      const on = selected?.id === place.id;
      const near = hoveredId === place.id;
      pin.el.classList.toggle("is-on", on);
      pin.el.classList.toggle("is-near", near);
      pin.el.classList.toggle("is-compact", compact && !on && !near);
      // A chosen or pointed-at pill is never behind its neighbours.
      pin.marker.getElement().style.zIndex = on ? "4" : near ? "3" : "1";
    });
  }

  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(apply);
  };

  map.on("moveend", schedule);
  map.on("zoomend", schedule);

  return {
    sync(input) {
      last = input;
      schedule();
    },
    destroy() {
      if (frame) cancelAnimationFrame(frame);
      map.off("moveend", schedule);
      map.off("zoomend", schedule);
      for (const pin of pins.values()) pin.marker.remove();
      pins.clear();
      leaving.clear();
    },
  };
}
