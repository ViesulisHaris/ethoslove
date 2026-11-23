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

/**
 * Pairs worded from the answerer's own side, whose two sides swap who is who ("They cook" / "You
 * cook"). In the game both people read the same card on one table, so it works; today's question
 * carries one person's answer to the other's phone, where "you" is the other person, and the verdict
 * would say the opposite of what happened. They stay out of the daily pool (tests/unit/games-daily).
 */
export const DAILY_MIRRORED: readonly string[] = [
  "ex-bff", "dumped", "hates", "dms", "double", "old-texts", "mum", "boss", "wedding", "remote", "cooking", "commute",
  "front-row", "flu", "mums", "sorry-first", "christmas", "friends-over", "mum-calls", "third-wheel", "speech",
  "family-chat", "group-holiday", "bump-into", "love-advice", "truth-hour",
];
/**
 * Exes, jealousy, snooping and secrets: good at a table where both laugh, but as the one question a
 * person sends their partner today they read as a hint, and can start a fight. Also out of the pool.
 */
export const DAILY_FIGHTS: readonly string[] = [
  "nearly", "keep", "deepest-secret", "group-chat", "checks", "app", "ex-friends", "ex-birthday", "bestie", "next-door",
  "hoodie", "first-date", "settled", "disapprove", "out-loud", "lie", "hidden", "crush", "secret-account", "talk", "2am",
  "text", "jealousy", "friend-secret", "ex-gift", "follows", "face-down",
];
const NOT_DAILY = new Set([...DAILY_MIRRORED, ...DAILY_FIGHTS]);
/** The pairs a day can show: the free pairs, less the two lists above. */
export const DAILY_PAIRS: readonly RatherPair[] = RATHER_PAIRS.filter((p) => !NOT_DAILY.has(p.id));

const raw = (cycle: number, pairs: readonly RatherPair[]) => shuffle([...pairs], 9973 + cycle * 7919);

/** One round of the list: every pair once, in an order of its own. The last of one round is never the first of the next. */
export function dailyCycle(cycle: number, pairs: readonly RatherPair[] = DAILY_PAIRS): RatherPair[] {
  const round = raw(cycle, pairs);
  if (pairs.length >= 3) {
    const before = raw(cycle - 1, pairs);
    // Swapping the first two never changes a round's last entry, so one round back is enough.
    if (round[0].id === before[pairs.length - 1].id) [round[0], round[1]] = [round[1], round[0]];
  }
  return round;
}

/** The pair of a day: the same for everyone, and no pair twice until the whole list has gone round. */
export function dailyPair(day: number, pairs: readonly RatherPair[] = DAILY_PAIRS): RatherPair {
  const n = pairs.length;
  if (n === 0) throw new Error("daily: no pairs");
  const since = day - DAILY_EPOCH;
  const cycle = Math.floor(since / n);
  const index = ((since % n) + n) % n;
  return dailyCycle(cycle, pairs)[index];
}

export const pairById = (id: string, pairs: readonly RatherPair[] = DAILY_PAIRS): RatherPair | null => pairs.find((p) => p.id === id) ?? null;

/* ---- the link ---- */

export type DailyAnswer = { name: string; side: 0 | 1 };
/** What a link holds. `to` is the answer it replies to: the first person's, sent back so they see both. */
export type DailyLink = { day: number; pair: RatherPair; from: DailyAnswer; to?: DailyAnswer };

/** The lobby's limit for a name (lobby.tsx, maxLength). */
export const DAILY_NAME_MAX = 24;
/**
 * The longest hash a real link can be: "#q=1." and a day (6 digits), a pair id (40), two sides, and
 * two names of 24 characters each, a character taking up to 12 once percent-encoded (four UTF-8
 * bytes, an emoji). About 630; anything longer was not made by encodeDaily.
 */
export const DAILY_HASH_MAX = 5 + 7 + 41 + 2 * (3 + DAILY_NAME_MAX * 12);

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

/**
 * "#q=1.<day>.<pairId>.<name>.<side>" and, for a reply, ".<name>.<side>" of the answer replied to.
 * The name comes before the side so a link always ends on a digit: a chat app leaves a link's last
 * dot (or bracket, or "!") out of what it makes tappable, and a link that ended on an empty name did.
 */
export function encodeDaily(link: { day: number; pairId: string; from: DailyAnswer; to?: DailyAnswer }): string {
  const parts = ["1", String(link.day), link.pairId, field(link.from.name), String(link.from.side)];
  if (link.to) parts.push(field(link.to.name), String(link.to.side));
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
export function decodeDaily(hash: unknown, today: number, pairs: readonly RatherPair[] = DAILY_PAIRS): DailyLink | null {
  if (typeof hash !== "string" || hash.length > DAILY_HASH_MAX) return null;
  const body = hash.startsWith("#q=") ? hash.slice(3) : hash.startsWith("q=") ? hash.slice(2) : null;
  if (body === null) return null;
  const parts = body.split(".");
  if ((parts.length !== 5 && parts.length !== 7) || parts[0] !== "1") return null;
  const [, dayText, pairId, fromName, fromSide, toName, toSide] = parts;
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

/** What a tab remembers of the last link it sent: the day, the pair, the answer and name it carried, and whether it was a reply. */
export type DailySent = { day: number; pairId: string; name: string; side: 0 | 1; reply?: boolean };

/**
 * Whether a link is one this tab sent itself (people tap their own link in the chat to check it):
 * the same day, pair, answer and name as the last link the tab sent. A reply carries the tab's own
 * answer as its `to`, so it is matched on its `from`, as the first link is: a reply this tab sent
 * back is its own too. Such a link is never a reveal against oneself, and is never counted.
 * A first link and a reply are told apart by what the tab sent: two people who both leave the name
 * blank and pick the same side send links whose names and sides are all alike.
 */
export function sentHere(link: DailyLink, sent: DailySent | null): boolean {
  if (!sent || !!sent.reply !== !!link.to) return false;
  return sent.day === link.day && sent.pairId === link.pair.id && sent.side === link.from.side && cleanName(sent.name) === link.from.name;
}
