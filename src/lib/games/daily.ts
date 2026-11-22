import { RATHER_PAIRS, type RatherPair } from "./content";
import { shuffle } from "./play";

/**
 * Today's question (/games/today): one "Would you rather" pair a day, the same for everyone that
 * day, picked from the free pairs. Nothing is stored and nothing is asked of a server: the day is
 * counted from the clock, the pick is a fixed shuffle of the list, and the answers travel after the
 * `#` of a link from one phone to the other. The clock is always an argument here, never read.
 */

export const DAY_MS = 86_400_000;
/** The UTC day a moment falls in, counted from 1 January 1970. */
export const dayOf = (ms: number): number => Math.floor(ms / DAY_MS);
/** A day number as "2026-11-23". */
export const dayIso = (day: number): string => new Date(day * DAY_MS).toISOString().slice(0, 10);
/**
 * The first day of the first round of the list: 23 November 2026. Which pair a day shows is counted
 * from here. Never change it once the page is live: every day's question would change with it.
 */
export const DAILY_EPOCH = dayOf(Date.UTC(2026, 10, 23));

const raw = (cycle: number, pairs: readonly RatherPair[]) => shuffle([...pairs], 9973 + cycle * 7919);

/** One round of the list: every pair once, in an order of its own. The last of one round is never the first of the next. */
export function dailyCycle(cycle: number, pairs: readonly RatherPair[] = RATHER_PAIRS): RatherPair[] {
  const round = raw(cycle, pairs);
  if (pairs.length >= 3) {
    const before = raw(cycle - 1, pairs);
    // Swapping the first two never changes a round's last entry, so one round back is enough.
    if (round[0].id === before[pairs.length - 1].id) [round[0], round[1]] = [round[1], round[0]];
  }
  return round;
}

/** The pair of a day: the same for everyone, and no pair twice until the whole list has gone round. */
export function dailyPair(day: number, pairs: readonly RatherPair[] = RATHER_PAIRS): RatherPair {
  const n = pairs.length;
  if (n === 0) throw new Error("daily: no pairs");
  const since = day - DAILY_EPOCH;
  const cycle = Math.floor(since / n);
  const index = ((since % n) + n) % n;
  return dailyCycle(cycle, pairs)[index];
}

export const pairById = (id: string, pairs: readonly RatherPair[] = RATHER_PAIRS): RatherPair | null => pairs.find((p) => p.id === id) ?? null;

/* ---- the link ---- */

export type DailyAnswer = { name: string; side: 0 | 1 };
/** What a link holds. `to` is the answer it replies to: the first person's, sent back so they see both. */
export type DailyLink = { day: number; pair: RatherPair; from: DailyAnswer; to?: DailyAnswer };

/** The lobby's limit for a name (lobby.tsx, maxLength). */
export const DAILY_NAME_MAX = 24;
export const DAILY_HASH_MAX = 400;

// Control characters, zero-width marks and the characters that turn text round.
const UNSAFE = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g;

/** A name as it may travel and be shown: no control or direction characters, single spaces, 24 characters at most. */
export function cleanName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const tidy = raw.replace(UNSAFE, "").replace(/\s+/g, " ").trim();
  return Array.from(tidy).slice(0, DAILY_NAME_MAX).join("").trim();
}

/** A field of the link: never holds a dot, so the dot can separate the fields. */
const field = (name: string) => encodeURIComponent(cleanName(name)).replace(/\./g, "%2E");

/** "#q=1.<day>.<pairId>.<side>.<name>" and, for a reply, ".<side>.<name>" of the answer replied to. */
export function encodeDaily(link: { day: number; pairId: string; from: DailyAnswer; to?: DailyAnswer }): string {
  const parts = ["1", String(link.day), link.pairId, String(link.from.side), field(link.from.name)];
  if (link.to) parts.push(String(link.to.side), field(link.to.name));
  // The "=" matters: the ad pixels stay off on any address whose hash holds one (isAdTrackingOffHere).
  return `#q=${parts.join(".")}`;
}

const side = (s: string): 0 | 1 | null => (s === "0" ? 0 : s === "1" ? 1 : null);
function name(s: string): string | null {
  try {
    return cleanName(decodeURIComponent(s));
  } catch {
    return null;
  }
}

/** What a hash holds, or null for anything that is not a whole, sane link. `today` is the reader's UTC day. */
export function decodeDaily(hash: unknown, today: number, pairs: readonly RatherPair[] = RATHER_PAIRS): DailyLink | null {
  if (typeof hash !== "string" || hash.length > DAILY_HASH_MAX) return null;
  const body = hash.startsWith("#q=") ? hash.slice(3) : hash.startsWith("q=") ? hash.slice(2) : null;
  if (body === null) return null;
  const parts = body.split(".");
  if ((parts.length !== 5 && parts.length !== 7) || parts[0] !== "1") return null;
  const [, dayText, pairId, fromSide, fromName, toSide, toName] = parts;
  if (!/^\d{1,6}$/.test(dayText)) return null;
  const day = Number(dayText);
  // A clock a little behind must not refuse today's link.
  if (day < DAILY_EPOCH || day > today + 1) return null;
  if (!/^[a-z0-9-]{1,40}$/.test(pairId)) return null;
  const pair = pairById(pairId, pairs);
  if (!pair) return null;
  const a = side(fromSide);
  const aName = name(fromName);
  if (a === null || aName === null) return null;
  const link: DailyLink = { day, pair, from: { name: aName, side: a } };
  if (parts.length === 7) {
    const b = side(toSide);
    const bName = name(toName);
    if (b === null || bName === null) return null;
    link.to = { name: bName, side: b };
  }
  return link;
}
