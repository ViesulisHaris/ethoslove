import { isLatLng } from "./geo";

/** Where the Dates map last looked, as it keeps it in the browser (the explorer and the planner on a page by kind write and read it). */
export const WHERE_KEY = "ethos.dates.where.v1";
export type StoredWhere = { lat: number; lng: number; name: string; share: boolean };

/**
 * A place name cut to at most 80 UTF-16 units, the length a plan's reader accepts (plan.ts), and
 * only between whole characters: a cut never splits an emoji in two, which /plan showed as a
 * replacement character.
 */
export function clipName(name: string, max = 80): string {
  let out = "";
  for (const char of name) {
    if (out.length + char.length > max) break;
    out += char;
  }
  return out;
}

/** Last time's place, or null. Never throws: no storage, or something else under the key, is null. */
export function readStoredWhere(): StoredWhere | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(WHERE_KEY) ?? "null") as { lat?: unknown; lng?: unknown; name?: unknown; share?: unknown } | null;
    // Saved before the share flag was: private, as they all were then.
    if (saved && typeof saved.lat === "number" && typeof saved.lng === "number" && isLatLng(saved.lat, saved.lng) && typeof saved.name === "string") return { lat: saved.lat, lng: saved.lng, name: clipName(saved.name), share: saved.share === true };
  } catch {
    // Unreadable, or no storage at all.
  }
  return null;
}

/** Keeps the place for next time. Never throws: without storage it is just not remembered. */
export function writeStoredWhere(where: StoredWhere): void {
  try {
    window.localStorage.setItem(WHERE_KEY, JSON.stringify({ lat: where.lat, lng: where.lng, name: clipName(where.name), share: where.share }));
  } catch {
    // No storage: it just will not be remembered.
  }
}
