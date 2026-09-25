import type { Plan } from "@/lib/dates/plan";
import type { SavedDate, SavedDatesError, SavedDatesList, SavedKind, SavedTripData } from "./types";

/**
 * The browser's side of /api/saved-dates. Every call answers rather than throws: `network` when the
 * request never arrived (offline, a timeout), otherwise the API's own error code. The answers are
 * our own server's, so they are read for the fields the pages use and nothing more is checked.
 */
export type Failure = { ok: false; status: number; error: SavedDatesError | "network"; limit?: number; used?: number; savedDate?: SavedDate };
export type Result<T> = ({ ok: true; status: number } & T) | Failure;

const BASE = "/api/saved-dates";

async function call<T extends object>(path: string, init?: RequestInit): Promise<Result<T>> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: "same-origin", cache: "no-store", ...init, headers: { ...(init?.body ? { "content-type": "application/json" } : {}), ...init?.headers } });
  } catch {
    return { ok: false, status: 0, error: "network" };
  }
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    // An error page from a proxy on the way: read below as the status alone.
  }
  if (res.ok) return { ok: true, status: res.status, ...(body as T) };
  const error = typeof body.error === "string" ? (body.error as SavedDatesError) : res.status === 401 ? "unauthenticated" : res.status === 429 ? "rate_limited" : "network";
  return {
    ok: false,
    status: res.status,
    error,
    ...(typeof body.limit === "number" && { limit: body.limit }),
    ...(typeof body.used === "number" && { used: body.used }),
    ...(typeof body.savedDate === "object" && body.savedDate !== null && { savedDate: body.savedDate as SavedDate }),
  };
}

export const listSavedDates = (kind?: SavedKind) => call<SavedDatesList>(kind ? `${BASE}?kind=${kind}` : BASE);

export const getSavedDate = (id: string) => call<{ savedDate: SavedDate }>(`${BASE}/${encodeURIComponent(id)}`);

export type SaveBody = { kind: "date"; data: Plan; title?: string } | { kind: "trip"; data: SavedTripData; title?: string };
export const saveDate = (body: SaveBody) => call<{ savedDate: SavedDate; existing?: true }>(BASE, { method: "POST", body: JSON.stringify(body) });

export type PatchBody = { baseVersion?: number; data?: Plan | SavedTripData; title?: string; remind?: boolean };
export const patchSavedDate = (id: string, body: PatchBody) => call<{ savedDate: SavedDate }>(`${BASE}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) });

/** `keepalive` lets a delete made as the page closes (the end of an undo window) still arrive. */
export const deleteSavedDate = (id: string, options: { keepalive?: boolean } = {}) => call<{ ok: true }>(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE", keepalive: options.keepalive });
