import { isYmd } from "@/lib/dates/calendar";
import { readPlan, type Plan } from "@/lib/dates/plan";
import { cityName, findAirport } from "@/lib/trips/airports";
import { getTrip } from "@/lib/trips/presets";
import type { SavedKind, SavedTripData } from "./types";

/**
 * What /api/saved-dates accepts, checked by hand like readPlan (which does the plan itself): the
 * body is whatever a browser or the iPhone app sent, so every field is read, measured and rebuilt,
 * and fields nobody asked for are dropped. The limits match the table's checks in 0015.
 */
export const TITLE_MAX = 80;
export const TRIP_NOTE_MAX = 280;
/** 0015 checks octet_length(data::text) <= 16384. jsonb prints a space after every `:` and `,`, which JSON.stringify doesn't, so the check here leaves room for them. */
export const DATA_MAX_BYTES = 16384 - 2048;
/** The database's backstop (saved_dates_cap in 0015), not the free limit: no account keeps more. */
export const MAX_SAVED_DATES = 500;
/** A trip id as the presets write them. */
const TRIP_ID = /^[a-z0-9-]{1,60}$/;

export type InputError = "invalid_input" | "empty_plan" | "unknown_trip";
export type SavedData = { kind: "date"; data: Plan } | { kind: "trip"; data: SavedTripData };
export type SaveInput = SavedData & { title: string | null };
/** A PATCH, before its `data` is read against the row's kind (only the row knows it). */
export type PatchInput = { baseVersion: number | null; data?: unknown; title?: string; remind?: boolean };

type Fields = Record<string, unknown>;
const isFields = (value: unknown): value is Fields => typeof value === "object" && value !== null && !Array.isArray(value);
const has = (fields: Fields, key: string) => Object.hasOwn(fields, key) && fields[key] !== undefined;

/** A title: one line, trimmed, at most TITLE_MAX. `null` when absent or blank; `false` when it isn't text or is too long. */
export function readTitle(value: unknown): string | null | false {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return false;
  const title = value.replace(/\s+/g, " ").trim();
  if (title.length > TITLE_MAX) return false;
  return title || null;
}

/** A saved trip: one of the presets, with an optional day to leave and a note. */
export function readTripData(value: unknown): SavedTripData | "unknown_trip" | null {
  if (!isFields(value) || value.v !== 1 || typeof value.tripId !== "string" || !TRIP_ID.test(value.tripId)) return null;
  const depart = value.depart === undefined ? undefined : isYmd(value.depart) ? value.depart : null;
  const note = value.note === undefined ? undefined : typeof value.note === "string" && value.note.trim().length <= TRIP_NOTE_MAX ? value.note.trim() : null;
  if (depart === null || note === null) return null;
  if (!getTrip(value.tripId)) return "unknown_trip";
  return { v: 1, tripId: value.tripId, ...(depart && { depart }), ...(note && { note }) };
}

/** A saved date: a plan readPlan accepts, with at least one stop (an empty plan is nothing to keep). */
export function readDateData(value: unknown): Plan | "empty_plan" | null {
  const plan = readPlan(value);
  if (!plan) return null;
  return plan.stops.length > 0 ? plan : "empty_plan";
}

/** A row's `data`, read for its kind. */
export function readSavedData(kind: SavedKind, value: unknown): SavedData | InputError {
  const read = kind === "date" ? readDateData(value) : readTripData(value);
  if (read === null) return "invalid_input";
  if (read === "empty_plan" || read === "unknown_trip") return read;
  if (new TextEncoder().encode(JSON.stringify(read)).length > DATA_MAX_BYTES) return "invalid_input";
  return kind === "date" ? { kind, data: read as Plan } : { kind, data: read as SavedTripData };
}

/** POST /api/saved-dates: `{ kind, data, title? }`. */
export function readSaveInput(body: unknown): { ok: true; value: SaveInput } | { ok: false; error: InputError } {
  if (!isFields(body) || (body.kind !== "date" && body.kind !== "trip")) return { ok: false, error: "invalid_input" };
  const title = readTitle(body.title);
  if (title === false) return { ok: false, error: "invalid_input" };
  const data = readSavedData(body.kind, body.data);
  if (typeof data === "string") return { ok: false, error: data };
  return { ok: true, value: { ...data, title } };
}

/**
 * PATCH /api/saved-dates/[id]: `{ baseVersion?, data?, title?, remind? }`. A change to the plan or
 * the title must say which version it was made on; a reminder on its own needs none, so toggling
 * it never conflicts with an edit made on the other phone.
 */
export function readPatchInput(body: unknown): { ok: true; value: PatchInput } | { ok: false; error: "invalid_input" } {
  if (!isFields(body)) return { ok: false, error: "invalid_input" };
  const { baseVersion, remind } = body;
  if (baseVersion !== undefined && !(Number.isSafeInteger(baseVersion) && (baseVersion as number) >= 1 && (baseVersion as number) < 2 ** 31)) return { ok: false, error: "invalid_input" };
  if (remind !== undefined && typeof remind !== "boolean") return { ok: false, error: "invalid_input" };
  const title = has(body, "title") ? readTitle(body.title) : undefined;
  // A rename to nothing is refused rather than guessed at: the card needs something to show.
  if (title === false || title === null) return { ok: false, error: "invalid_input" };
  const edits = has(body, "data") || title !== undefined;
  if (!edits && remind === undefined) return { ok: false, error: "invalid_input" };
  if (edits && baseVersion === undefined) return { ok: false, error: "invalid_input" };
  return {
    ok: true,
    value: {
      baseVersion: typeof baseVersion === "number" ? baseVersion : null,
      ...(has(body, "data") && { data: body.data }),
      ...(title !== undefined && { title }),
      ...(remind !== undefined && { remind }),
    },
  };
}

/**
 * The columns the server keeps beside `data`, so lists, the free limit and the reminder cron never
 * have to open a plan: where it is, which day, and how many stops. A trip's town is the one its
 * flights land in, in English (a card shows the trip's own name in the reader's language).
 */
export function deriveColumns(saved: SavedData): { city: string | null; day: string | null; stops_count: number } {
  if (saved.kind === "date") return { city: saved.data.where || null, day: saved.data.date ?? null, stops_count: saved.data.stops.length };
  const trip = getTrip(saved.data.tripId);
  const airport = trip ? findAirport(trip.flyTo) : null;
  const city = airport ? cityName(airport, "en") : (trip?.stops[0]?.name ?? null);
  return { city: city ? city.slice(0, TITLE_MAX) : null, day: saved.data.depart ?? null, stops_count: Math.min(trip?.stops.length ?? 0, 99) };
}
