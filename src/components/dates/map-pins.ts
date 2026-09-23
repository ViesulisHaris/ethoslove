import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { GROUP_GLYPHS } from "@/lib/dates/glyphs";
import { COST_LABELS, COST_MARKS, costOf, type Cost } from "@/lib/dates/cost";
import { formatStars } from "@/lib/dates/format";
import { formatDistance } from "@/lib/dates/geo";
import { GROUPS, KINDS } from "@/lib/dates/kinds";
import type { Place } from "@/lib/dates/places";
import type { Ranked, Ratings } from "@/lib/dates/rank";

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
/** A pill is anchored by its bottom edge, lifted this far above its place (the marker's offset)… */
const PILL_LIFT = 6;
/** …and is this tall: a 28px icon in 4px of padding. */
const PILL_H = 36;
/** Kept this far inside every edge of what can be seen: half a pill over an edge reads as a bug. */
const EDGE = 8;

type Point = { x: number; y: number };
/** A rectangle in the map's own pixels, as [left, top] to [right, bottom]. */
export type Area = { x0: number; y0: number; x1: number; y1: number };

/**
 * Would a pill this wide, for a place at `point`, sit wholly on the part of the map that can be
 * seen? `top` is how much of the map's top edge something else covers (the site's floating header
 * on a wide screen), and the pill hangs above its point, so it is its top that has to clear it.
 */
export function fitsView(point: Point, half: number, view: { w: number; h: number }, top = 0): boolean {
  return point.x - half >= EDGE && point.x + half <= view.w - EDGE && point.y - PILL_LIFT - PILL_H >= top + EDGE && point.y <= view.h - 16;
}

/**
 * The part of the map left to look at when a sheet is open over it, and the header over its top.
 * A sheet across most of the width lies along the bottom (a phone); a narrower one stands at one
 * side (the desktop's, on the left).
 */
export function openArea(view: { w: number; h: number }, sheet: Area | null, top = 0): Area {
  const area = { x0: 0, y0: top, x1: view.w, y1: view.h };
  if (!sheet || sheet.x1 <= 0 || sheet.x0 >= view.w || sheet.y1 <= 0 || sheet.y0 >= view.h) return area;
  if (sheet.x1 - sheet.x0 >= view.w * 0.6) area.y1 = Math.max(top, Math.min(view.h, sheet.y0));
  else if (sheet.x0 + sheet.x1 < view.w) area.x0 = Math.max(0, sheet.x1);
  else area.x1 = Math.min(view.w, sheet.x0);
  return area;
}

/**
 * Which pills get the room first: the list's order, by rank (its date score, whatever the list is
 * sorted by), so the map's "best first" is the list's best first. Sorting by the place's raw score
 * put a park the list ranked 46th on the map ahead of the list's top ten. A place with no rank
 * (a map given plain places) keeps the raw score.
 */
export function pinOrder(a: Place, b: Place): number {
  const ra = (a as Partial<Ranked>).rank ?? Number.MAX_SAFE_INTEGER;
  const rb = (b as Partial<Ranked>).rank ?? Number.MAX_SAFE_INTEGER;
  return ra - rb || b.score - a.score || a.distanceKm - b.distanceKm;
}

/**
 * Room for a chosen pill, which is wider than the rest: its name, what it is and how far, and its
 * price usually take it to its full 250px (.ethos-pin's max-width), so half of that each side.
 */
const CHOSEN_HALF = 125;

/** Is a chosen place's pill in plain sight inside `area`? */
export const pinInArea = (point: Point, area: Area): boolean =>
  point.x - CHOSEN_HALF >= area.x0 + EDGE && point.x + CHOSEN_HALF <= area.x1 - EDGE && point.y - PILL_LIFT - PILL_H - 12 >= area.y0 + EDGE && point.y + EDGE <= area.y1;

/**
 * Pills on their way out: each has a timer to take it off the map. One that is wanted again before
 * its timer fires is kept, and the timer is cancelled; the timer used to run anyway and remove a
 * pill that was back on the map, so a card hovered for a tenth of a second cost the #1 pick its pin.
 */
export function createExits(ms: number, gone: (id: string) => void) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  return {
    has: (id: string) => timers.has(id),
    start(id: string) {
      if (timers.has(id)) return;
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id);
          gone(id);
        }, ms),
      );
    },
    /** Wanted again: stop it leaving. True when it was on its way out. */
    cancel(id: string): boolean {
      const timer = timers.get(id);
      if (timer === undefined) return false;
      clearTimeout(timer);
      timers.delete(id);
      return true;
    },
    clear() {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    },
  };
}

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

export function createPins(
  lib: MapLibre,
  map: MapLibreMap,
  opts: {
    locale: "en" | "es";
    ratings: () => Ratings;
    /** How much of the map's top is covered by something else, in pixels. */
    topInset?: () => number;
    onSelect?: (id: string) => void;
    onHover?: (id: string | null) => void;
  },
): PinsController {
  type Pin = { marker: Marker; el: HTMLButtonElement; sub: HTMLSpanElement; price: HTMLSpanElement; place: Place };

  /** The same tier the cards show: what couples reported, else the kind's usual cost. */
  const tierOf = (place: Place): Cost => ("cost" in place ? (place as Place & { cost: Cost }).cost : costOf(place, opts.ratings()[place.id]?.cost));
  const priceText = (tier: Cost) => (tier === 0 ? COST_LABELS[0][opts.locale] : COST_MARKS[tier]);
  const pins = new Map<string, Pin>();
  const leaving = createExits(OUT_MS, (id) => {
    pins.get(id)?.marker.remove();
    pins.delete(id);
  });
  let last: { places: Place[]; selected: Place | null; hoveredId: string | null } = { places: [], selected: null, hoveredId: null };
  let frame = 0;

  const label = (place: Place) => {
    const rating = opts.ratings()[place.id];
    const kind = KINDS[place.kind].label[opts.locale];
    const stars = rating && rating.reviews > 0 ? ` · ${formatStars(rating.stars, opts.locale)}★` : "";
    // The same distance the list and the sheet give, in the reader's decimals.
    return `${kind}${stars} · ${formatDistance(place.distanceKm, opts.locale)}`;
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
    const price = document.createElement("span");
    const tier = tierOf(place);
    price.className = `ethos-pin-price${tier === 0 ? " is-free" : ""}`;
    price.textContent = priceText(tier);
    el.append(icon, text, price);
    // The list beside the map is the same places, as real buttons, and it is the keyboard and
    // screen-reader path. Twenty pills in the tab order would only be the list again, in a worse
    // order and in the way, so the map is left to the pointer.
    el.setAttribute("aria-hidden", "true");
    el.tabIndex = -1;
    el.title = `${place.name} · ${priceText(tierOf(place))} · ${label(place)}`;

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
    return { marker, el, sub, price, place };
  }

  /** Roughly how wide this pill will be: the icon and padding, plus the name at ~7px a letter. */
  function widthOf(place: Place, compact: boolean): number {
    if (compact) return 36;
    const name = place.named ? place.name : KINDS[place.kind].label[opts.locale];
    return Math.min(250, 88 + Math.min(name.length, 24) * 7.1);
  }

  /** The pills that fit: best first, the chosen and hovered ones always, and none on top of another. */
  function choose(places: Place[], selected: Place | null, hoveredId: string | null): Place[] {
    const zoom = map.getZoom();
    const compact = zoom < NAMES_FROM;
    const bounds = map.getBounds();
    const canvas = map.getCanvas();
    const view = { w: canvas.clientWidth, h: canvas.clientHeight };
    const top = opts.topInset?.() ?? 0;
    const inView = places.filter((p) => bounds.contains([p.lng, p.lat]));
    const first = [selected, inView.find((p) => p.id === hoveredId) ?? null].filter((p): p is Place => Boolean(p));
    const rest = inView.filter((p) => !first.some((f) => f.id === p.id)).sort(pinOrder);
    const wanted = limitFor(zoom);
    const taken: { x: number; y: number; half: number }[] = [];
    const out: Place[] = [];
    for (const place of [...first, ...rest]) {
      if (out.length >= wanted) break;
      const point = map.project([place.lng, place.lat]);
      const half = widthOf(place, compact) / 2;
      // Half a pill over the edge of the map, or under the header, reads as a bug (and can't be clicked).
      const chosen = place.id === selected?.id || place.id === hoveredId;
      if (!chosen && !fitsView(point, half, view, top)) continue;
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
      pin.el.classList.add("is-out");
      leaving.start(id);
    }

    keep.forEach((place, order) => {
      let pin = pins.get(place.id);
      // It was on its way out and is wanted again: keep it, and stop it leaving.
      if (pin && leaving.cancel(place.id)) pin.el.classList.remove("is-out");
      if (!pin) {
        pin = build(place, order);
        pins.set(place.id, pin);
      } else if (pin.place !== place) {
        pin.sub.textContent = label(place);
        const tier = tierOf(place);
        pin.price.textContent = priceText(tier);
        pin.price.classList.toggle("is-free", tier === 0);
        pin.el.title = `${place.name} · ${priceText(tier)} · ${label(place)}`;
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
      leaving.clear();
      for (const pin of pins.values()) pin.marker.remove();
      pins.clear();
    },
  };
}
