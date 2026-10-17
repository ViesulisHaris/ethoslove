import { isYmd } from "./calendar";
import { distanceKm, type LatLng } from "./geo";
import { KIND_IDS, KINDS, type PlaceKind } from "./kinds";

/**
 * A date, planned: a day, a handful of stops in order, and a line to the person it is for. It
 * lives in the browser and travels inside the link that shares it, after the `#`, which a
 * browser never sends to a server: no account, no database row, and nothing of theirs in our logs.
 */
export type PlanStop = {
  id: string;
  name: string;
  kind: PlaceKind;
  lat: number;
  lng: number;
  address?: string;
  time?: string;
  note?: string;
  /**
   * False for a place the map has no name for (a viewpoint, a bench by the river): its `name` is
   * only its kind, in whatever language the page was in when it was added. Absent means named,
   * which is what every plan made before this field was.
   */
  named?: false;
};
export type Plan = { v: 1; date?: string; where?: string; from?: string; to?: string; note?: string; idea?: string; stops: PlanStop[] };

export const MAX_STOPS = 8;
export const EMPTY_PLAN: Plan = { v: 1, stops: [] };

/*
 * The check is written out by hand rather than as a zod schema: this file is in the browser on
 * /dates and /plan, and zod came with it — 85 KB gzipped, the last script those pages waited for,
 * to check one small object. It does what the schema did: text is trimmed and then measured,
 * absent fields stay absent, anything of the wrong kind fails the whole plan, and fields the
 * plan doesn't know are dropped.
 */
const BAD = Symbol("bad");
type Fields = Record<string, unknown>;
const isFields = (value: unknown): value is Fields => typeof value === "object" && value !== null && !Array.isArray(value);

/** A trimmed string of at most `max` characters; `undefined` when absent, BAD when anything else. */
function text(value: unknown, max: number): string | undefined | typeof BAD {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return BAD;
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : BAD;
}

const within = (value: unknown, limit: number): value is number => typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function readStop(value: unknown): PlanStop | null {
  if (!isFields(value)) return null;
  const id = text(value.id, 40);
  const name = text(value.name, 120);
  const address = text(value.address, 160);
  const note = text(value.note, 140);
  const { kind, lat, lng } = value;
  const time = value.time === undefined ? undefined : typeof value.time === "string" && TIME.test(value.time) ? value.time : BAD;
  const named = value.named === undefined ? undefined : value.named === false ? false : BAD;
  if (id === undefined || id === BAD || name === undefined || name === BAD || name.length === 0) return null;
  if (address === BAD || note === BAD || time === BAD || named === BAD) return null;
  if (typeof kind !== "string" || !(KIND_IDS as readonly string[]).includes(kind)) return null;
  if (!within(lat, 90) || !within(lng, 180)) return null;
  return {
    id,
    name,
    kind: kind as PlaceKind,
    lat,
    lng,
    ...(address !== undefined && { address }),
    ...(time !== undefined && { time }),
    ...(note !== undefined && { note }),
    ...(named === false && { named }),
  };
}

/**
 * What to call a stop, in the reader's language. A place with no name of its own is called by its
 * kind, and that is said again in each language rather than kept in the one it was added in: a
 * plan made on /dates and opened on /es/plan read "Mirador" over "Viewpoint".
 */
export const stopName = (stop: Pick<PlanStop, "name" | "kind" | "named">, locale: "en" | "es"): string => (stop.named === false ? KINDS[stop.kind].label[locale] : stop.name);

/** A plan, or null when any part of it is not one. */
export function readPlan(value: unknown): Plan | null {
  if (!isFields(value) || value.v !== 1) return null;
  const { stops } = value;
  const date = value.date === undefined ? undefined : isYmd(value.date) ? value.date : BAD;
  const where = text(value.where, 80);
  const from = text(value.from, 40);
  const to = text(value.to, 40);
  const note = text(value.note, 280);
  const idea = text(value.idea, 40);
  if (date === BAD || where === BAD || from === BAD || to === BAD || note === BAD || idea === BAD) return null;
  if (!Array.isArray(stops) || stops.length > MAX_STOPS) return null;
  const read = stops.map(readStop);
  if (read.some((stop) => stop === null)) return null;
  return {
    v: 1,
    ...(date !== undefined && { date }),
    ...(where !== undefined && { where }),
    ...(from !== undefined && { from }),
    ...(to !== undefined && { to }),
    ...(note !== undefined && { note }),
    ...(idea !== undefined && { idea }),
    stops: read as PlanStop[],
  };
}

/** Anything over this is not a plan somebody made by tapping eight places. */
const MAX_ENCODED = 8000;

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromBase64Url = (value: string): Uint8Array => {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};

export function encodePlan(plan: Plan): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(plan)));
}

/** Reads a plan out of a link. It is whatever somebody pasted, so it is checked field by field. */
export function decodePlan(encoded: string): Plan | null {
  if (!encoded || encoded.length > MAX_ENCODED || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
  try {
    return readPlan(JSON.parse(new TextDecoder().decode(fromBase64Url(encoded))));
  } catch {
    return null;
  }
}

export const parseStoredPlan = (raw: string | null): Plan => {
  if (!raw) return EMPTY_PLAN;
  try {
    return readPlan(JSON.parse(raw)) ?? EMPTY_PLAN;
  } catch {
    return EMPTY_PLAN;
  }
};

export function addStop(plan: Plan, stop: PlanStop): Plan {
  if (plan.stops.some((s) => s.id === stop.id) || plan.stops.length >= MAX_STOPS) return plan;
  return { ...plan, stops: [...plan.stops, stop] };
}

/**
 * Several stops at once (an idea's), all or none: half an idea in the plan, stamped as the whole
 * idea, was worse than a clear "the plan is full". Stops already in it are not counted twice.
 */
export function addStops(plan: Plan, stops: PlanStop[]): { plan: Plan; fits: boolean } {
  const fresh = stops.filter((s, i) => !plan.stops.some((p) => p.id === s.id) && stops.findIndex((t) => t.id === s.id) === i);
  if (plan.stops.length + fresh.length > MAX_STOPS) return { plan, fits: false };
  return { plan: fresh.length > 0 ? { ...plan, stops: [...plan.stops, ...fresh] } : plan, fits: true };
}

/** Stops further apart than this are not one evening out: a place in another city starts a new plan. */
export const PLAN_REACH_KM = 30;

/** True when a place is too far from the plan's first stop to belong to the same date (London's plan, a café in Lisbon). */
export const isFarFromPlan = (plan: Plan, at: LatLng): boolean => plan.stops.length > 0 && distanceKm(plan.stops[0], at) > PLAN_REACH_KM;

export const removeStop = (plan: Plan, id: string): Plan => ({ ...plan, stops: plan.stops.filter((s) => s.id !== id) });

/** Before this, a time is the small hours after the evening, not the morning before it: 00:30 comes after 23:00. */
const NIGHT_ENDS_MIN = 5 * 60;
const eveningMinute = (time: string): number => {
  const minute = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  return minute < NIGHT_ENDS_MIN ? minute + 24 * 60 : minute;
};

/**
 * One stop earlier or later. The times are the evening's slots, not the places': moved later, a
 * stop takes the later time and the one it swapped with takes its earlier one, or the plan reads
 * 18:00 then 17:00. Only while the two times are in order, though: when they are not (a stop timed
 * by hand, then moved to where its time belongs), each keeps its own, and that puts them in order.
 * When only one of the two has a time it stays with its place: that one may be a booking.
 */
export function moveStop(plan: Plan, id: string, by: -1 | 1): Plan {
  const i = plan.stops.findIndex((s) => s.id === id);
  const j = i + by;
  if (i === -1 || j < 0 || j >= plan.stops.length) return plan;
  const stops = plan.stops.slice();
  const a = stops[i];
  const b = stops[j];
  const [earlier, later] = i < j ? [a, b] : [b, a];
  const swapTimes = Boolean(earlier.time && later.time && eveningMinute(earlier.time) <= eveningMinute(later.time));
  stops[i] = swapTimes ? { ...b, time: a.time } : b;
  stops[j] = swapTimes ? { ...a, time: b.time } : a;
  return { ...plan, stops };
}
