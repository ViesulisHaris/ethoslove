import { z } from "zod";
import { isYmd } from "./calendar";
import { KIND_IDS, type PlaceKind } from "./kinds";

/**
 * A date, planned: a day, a handful of stops in order, and a line to the person it is for. It
 * lives in the browser and travels inside the link that shares it, after the `#`, which a
 * browser never sends to a server: no account, no database row, and nothing of theirs in our logs.
 */
export type PlanStop = { id: string; name: string; kind: PlaceKind; lat: number; lng: number; address?: string; time?: string; note?: string };
export type Plan = { v: 1; date?: string; where?: string; from?: string; to?: string; note?: string; idea?: string; stops: PlanStop[] };

export const MAX_STOPS = 8;
export const EMPTY_PLAN: Plan = { v: 1, stops: [] };

const text = (max: number) => z.string().trim().max(max);
const stopSchema = z.object({
  id: text(40),
  name: text(120).min(1),
  kind: z.enum(KIND_IDS as [PlaceKind, ...PlaceKind[]]),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: text(160).optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  note: text(140).optional(),
});
const planSchema = z.object({
  v: z.literal(1),
  date: z.string().refine(isYmd).optional(),
  where: text(80).optional(),
  from: text(40).optional(),
  to: text(40).optional(),
  note: text(280).optional(),
  idea: text(40).optional(),
  stops: z.array(stopSchema).max(MAX_STOPS),
});

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
    const parsed = planSchema.safeParse(JSON.parse(new TextDecoder().decode(fromBase64Url(encoded))));
    return parsed.success ? (parsed.data as Plan) : null;
  } catch {
    return null;
  }
}

export const parseStoredPlan = (raw: string | null): Plan => {
  if (!raw) return EMPTY_PLAN;
  try {
    const parsed = planSchema.safeParse(JSON.parse(raw));
    return parsed.success ? (parsed.data as Plan) : EMPTY_PLAN;
  } catch {
    return EMPTY_PLAN;
  }
};

export function addStop(plan: Plan, stop: PlanStop): Plan {
  if (plan.stops.some((s) => s.id === stop.id) || plan.stops.length >= MAX_STOPS) return plan;
  return { ...plan, stops: [...plan.stops, stop] };
}

export const removeStop = (plan: Plan, id: string): Plan => ({ ...plan, stops: plan.stops.filter((s) => s.id !== id) });

export function moveStop(plan: Plan, id: string, by: -1 | 1): Plan {
  const i = plan.stops.findIndex((s) => s.id === id);
  const j = i + by;
  if (i === -1 || j < 0 || j >= plan.stops.length) return plan;
  const stops = plan.stops.slice();
  [stops[i], stops[j]] = [stops[j], stops[i]];
  return { ...plan, stops };
}
