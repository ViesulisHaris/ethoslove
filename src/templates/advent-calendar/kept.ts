import { hashString } from "../_shared/random";
import { DOOR_COUNT } from "./doors";

/**
 * Where someone has got to in the house, kept for as long as the tab is: which doors are open and which notes have
 * been read. With twenty-four notes a reload, or a tab the phone threw away, cost forty-eight taps to get back.
 *
 * Kept in the tab's own sessionStorage, only on a real gift's page (never the editor's played preview, whose "play from
 * the start" means it, nor a demo), and nothing in it says whose gift it is: the key is worked out from the gift's two
 * names and its notes' own keys, as the doors are, and leaves this browser never. Storage can be switched off, full or
 * missing: then nothing is kept and the house opens shut, as it always did.
 */
export type Kept = { opened: number[]; read: string[] };

/** The key one gift's house is kept under: another list of notes, or other names, is another house. */
export const keptKey = (seed: number, noteKeys: readonly string[]) => `ethos-advent-${seed.toString(36)}-${hashString(noteKeys.join("|")).toString(36)}`;

/** The tab's storage, or nothing where it cannot be reached (it throws in some private windows, and with site data blocked). */
export function tabStore(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** What was kept for this house, taken only as far as it still fits it: a door that is a door, a note that is still in it. */
export function recall(store: Storage | null, key: string, noteKeys: readonly string[]): Kept | null {
  if (!store) return null;
  try {
    const raw: unknown = JSON.parse(store.getItem(key) ?? "null");
    if (!raw || typeof raw !== "object") return null;
    const { opened, read } = raw as Partial<Record<keyof Kept, unknown>>;
    const doors = Array.isArray(opened) ? [...new Set(opened.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= DOOR_COUNT))] : [];
    const notes = Array.isArray(read) ? [...new Set(read.filter((k): k is string => typeof k === "string" && noteKeys.includes(k)))] : [];
    return doors.length ? { opened: doors, read: notes } : null;
  } catch {
    return null;
  }
}

/** Keeps where they have got to; a house with every door shut is forgotten. */
export function keep(store: Storage | null, key: string, kept: Kept): void {
  if (!store) return;
  try {
    if (kept.opened.length) store.setItem(key, JSON.stringify(kept));
    else store.removeItem(key);
  } catch {
    // full, or switched off since: nothing is kept, and nothing else changes
  }
}
