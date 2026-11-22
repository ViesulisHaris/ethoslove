import { isLatLng } from "./geo";

/** Where the Dates map last looked, as it keeps it in the browser (the explorer writes it; the planner on a page by kind reads it). */
export const WHERE_KEY = "ethos.dates.where.v1";
export type StoredWhere = { lat: number; lng: number; name: string; share: boolean };

/** Last time's place, or null. Never throws: no storage, or something else under the key, is null. */
export function readStoredWhere(): StoredWhere | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(WHERE_KEY) ?? "null") as { lat?: unknown; lng?: unknown; name?: unknown; share?: unknown } | null;
    // Saved before the share flag was: private, as they all were then.
    if (saved && typeof saved.lat === "number" && typeof saved.lng === "number" && isLatLng(saved.lat, saved.lng) && typeof saved.name === "string") return { lat: saved.lat, lng: saved.lng, name: saved.name.slice(0, 80), share: saved.share === true };
  } catch {
    // Unreadable, or no storage at all.
  }
  return null;
}
