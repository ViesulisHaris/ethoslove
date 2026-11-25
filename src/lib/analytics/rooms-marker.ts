import { withoutLocale } from "./consent";

/**
 * Visitors who use two or more rooms within 30 days (audit X3), counted in the browser alone and
 * only for a visitor who allowed cookies: which rooms were seen and the day each was last seen, kept
 * under one key, and one event, `two_rooms_30d`, with no property, the first time a second room is
 * seen within 30 days of another. No id is made, kept or sent. The privacy policy names the entry
 * (section 12). This half is pure: no window, no storage.
 */

/** The browser entry (localStorage), kept only for a visitor who allowed cookies. */
export const ROOMS_KEY = "ethos-rooms";
export const ROOMS_WINDOW_DAYS = 30;
/** The rooms counted: the navbar's (components/marketing/rooms.ts) without Pricing. */
export const VISITED_ROOMS = ["gifts", "dates", "trips", "longDistance", "games"] as const;
export type VisitedRoom = (typeof VISITED_ROOMS)[number];

/** Rooms seen and the day each was last seen (whole days since 1970, UTC), and the day the count was last sent. */
export type RoomsMarker = { seen: Partial<Record<VisitedRoom, number>>; sent?: number };

/**
 * Each room's pages. The navbar's own lists, minus the editor and the demos (a gift running, and
 * never counted). Never a gift, the editor, checkout or an account page: none is listed, and the
 * component that calls this is mounted in the marketing layout only.
 */
const ROOM_PATHS: Record<VisitedRoom, readonly string[]> = {
  gifts: ["/templates", "/occasions", "/gifts"],
  dates: ["/dates", "/plan"],
  trips: ["/trips"],
  longDistance: ["/long-distance"],
  games: ["/games"],
};

/** The room a path is in (with or without its language), or null. */
export function visitedRoom(pathname: string): VisitedRoom | null {
  const path = withoutLocale(pathname) || "/";
  return VISITED_ROOMS.find((room) => ROOM_PATHS[room].some((root) => path === root || path.startsWith(`${root}/`))) ?? null;
}

export const dayOf = (now: number): number => Math.floor(now / 86_400_000);

const isDay = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0;

/** What was stored, checked field by field: only the five rooms and whole days survive. */
export function parseMarker(raw: string | null | undefined): RoomsMarker | null {
  if (!raw) return null;
  try {
    const kept = JSON.parse(raw) as { seen?: Record<string, unknown>; sent?: unknown } | null;
    if (!kept || typeof kept !== "object" || Array.isArray(kept) || !kept.seen || typeof kept.seen !== "object") return null;
    const seen: RoomsMarker["seen"] = {};
    for (const room of VISITED_ROOMS) {
      const day = kept.seen[room];
      if (isDay(day)) seen[room] = day;
    }
    return { seen, ...(isDay(kept.sent) ? { sent: kept.sent } : {}) };
  } catch {
    return null;
  }
}

/**
 * A room was seen today. `send` is true when another room was seen no more than 30 days ago and the
 * count was not sent in the last 30 days. A day later than today (a clock set back) can't be read:
 * such a room is dropped, and such a "sent" is read as today, so a moved clock never counts twice.
 */
export function seeRoom(prev: RoomsMarker | null, room: VisitedRoom, today: number): { marker: RoomsMarker; send: boolean } {
  const seen: RoomsMarker["seen"] = {};
  for (const key of VISITED_ROOMS) {
    const day = prev?.seen[key];
    if (day !== undefined && day <= today && today - day <= ROOMS_WINDOW_DAYS) seen[key] = day;
  }
  const sent = prev?.sent === undefined ? undefined : Math.min(prev.sent, today);
  const quiet = sent !== undefined && today - sent <= ROOMS_WINDOW_DAYS;
  const send = !quiet && VISITED_ROOMS.some((key) => key !== room && seen[key] !== undefined);
  seen[room] = today;
  const keep = send ? today : quiet ? sent : undefined;
  return { marker: { seen, ...(keep !== undefined ? { sent: keep } : {}) }, send };
}
