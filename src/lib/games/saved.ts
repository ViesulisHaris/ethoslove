import type { DrawState } from "./draw";
import type { MemoryState } from "./memory";
import type { KnowState, Player, RatherState } from "./play";
import { parseRoomCode, type Entry, type Mode, type Session } from "./room";
import type { HostBook } from "./sync";

/**
 * What a game remembers across a reload, a back-and-forward or a phone throwing the tab out of
 * memory: the room it went into, the session, and the game so far. It is kept in sessionStorage,
 * so it stays in this tab, never leaves the phone and is gone when the tab closes: the lobby's
 * "nothing is stored" still holds.
 *
 * A browser that blocks site data throws on the storage property itself, not just on a read, so
 * every touch goes through here and turns into "nothing remembered" rather than a crash.
 */
export type TabStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function tabStorage(): TabStore | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export type SavedPart = "entry" | "session" | "state" | "play";
const PARTS: SavedPart[] = ["entry", "session", "state", "play"];
export const savedKey = (game: string, part: SavedPart) => `ethos.games.${game}.${part}`;

export function readSaved<T>(storage: TabStore | null, key: string, revive: (raw: unknown) => T | null): T | null {
  try {
    const raw = storage?.getItem(key);
    return raw ? revive(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeSaved(storage: TabStore | null, key: string, value: unknown): void {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // Blocked or full: the game plays on, it just won't survive a reload.
  }
}

export function removeSaved(storage: TabStore | null, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Nothing to forget.
  }
}

/** Everything one game remembers, for "change players", a room that has ended, or a fresh room. */
export function forgetGame(storage: TabStore | null, game: string): void {
  for (const part of PARTS) removeSaved(storage, savedKey(game, part));
}

/* ------------------------------------------------------------------ which game to reopen */

/**
 * Whether a remembered room or game is the one this address asks for. A room link reopens only its
 * own room. A plain address reopens a game on one phone, or a room this tab made: the host's
 * address never carries the code. `?mode=two` asks for a new room, so nothing is reopened.
 */
export function resumes(saved: { code: string | null; host: boolean }, search: string): boolean {
  const params = new URLSearchParams(search);
  if (params.get("mode") === "two") return false;
  const wanted = parseRoomCode(params.get("room"));
  if (wanted) return saved.code === wanted;
  return saved.code === null || saved.host;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isCount = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0;
const isPlayer = (value: unknown): value is Player => value === 0 || value === 1;
// The lobby trims names and caps them at 24; "Somebody" stands in for a guest who gave none.
const isName = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= 24;

export function reviveEntry(raw: unknown): Entry | null {
  if (!isObject(raw)) return null;
  const { code, name, host } = raw;
  const room = parseRoomCode(typeof code === "string" ? code : null);
  return room !== null && room === code && isName(name) && typeof host === "boolean" ? { code: room, name, host } : null;
}

export function reviveSession(raw: unknown): Session | null {
  if (!isObject(raw)) return null;
  const { mode, code, host, names, peer } = raw;
  if (mode !== "one" && mode !== "two") return null;
  if (!Array.isArray(names) || names.length !== 2 || !names.every(isName) || typeof host !== "boolean") return null;
  const pair: [string, string] = [names[0], names[1]];
  if (mode === "one") return code === null && peer === null ? { mode: "one" as Mode, code: null, host: true, names: pair, peer: null } : null;
  const room = parseRoomCode(typeof code === "string" ? code : null);
  return room !== null && room === code && typeof peer === "string" && peer.length > 0 ? { mode: "two", code: room, host, names: pair, peer } : null;
}

/** A session as it is kept: the host's first message was only for opening the game. */
export const sessionToSave = ({ mode, code, host, names, peer }: Session): Session => ({ mode, code, host, names, peer });

/**
 * A game's state is kept beside the room it belongs to, so a state from another room is never dealt
 * into this one; on the host, with its count of the guest's moves (lib/games/sync.ts).
 */
export type Kept<S> = { code: string | null; state: S; book?: HostBook };
export function reviveKept<S>(raw: unknown, code: string | null, revive: (raw: unknown) => S | null): S | null {
  return isObject(raw) && raw.code === code ? revive(raw.state) : null;
}

/* ------------------------------------------------------------------ the games' own states */

// Written by this tab, but maybe by the build before this one: a shape that no longer fits is
// dropped and the game starts afresh, rather than rendering half a state.

function turns(raw: unknown, game: string): Record<string, unknown> | null {
  if (!isObject(raw) || raw.game !== game || !isCount(raw.gen) || !isCount(raw.round)) return null;
  const { order } = raw;
  if (!Array.isArray(order) || !order.every((id) => typeof id === "string") || raw.round > order.length) return null;
  return raw;
}

const twoRecords = (value: unknown) => Array.isArray(value) && value.length === 2 && value.every(isObject);

export function reviveKnow(raw: unknown): KnowState | null {
  const state = turns(raw, "know");
  return state && twoRecords(state.answers) ? (state as unknown as KnowState) : null;
}

export function reviveRather(raw: unknown): RatherState | null {
  const state = turns(raw, "rather");
  return state && twoRecords(state.picks) ? (state as unknown as RatherState) : null;
}

export function reviveDraw(raw: unknown): DrawState | null {
  const state = turns(raw, "draw");
  return state && Array.isArray(state.results) && state.results.length === (state.order as string[]).length && Array.isArray(state.guesses) ? (state as unknown as DrawState) : null;
}

export function reviveMemory(raw: unknown): MemoryState | null {
  if (!isObject(raw)) return null;
  const { cards, matched, open, turn, scores } = raw;
  if (!Array.isArray(cards) || cards.length === 0 || !cards.every(isCount)) return null;
  if (!Array.isArray(matched) || matched.length !== cards.length || !matched.every((m) => m === null || isPlayer(m))) return null;
  if (!Array.isArray(open) || open.length > 2 || !open.every((slot) => isCount(slot) && slot < cards.length)) return null;
  if (!isPlayer(turn) || !Array.isArray(scores) || scores.length !== 2 || !scores.every(isCount)) return null;
  return raw as unknown as MemoryState;
}

/** Truth or dare: where each deck is up to and whose turn it is. The card on the table is its deck and number, and its words come from the deck again. */
export type DareTable = { pack: string | null; seed: number; turn: Player; used: { truth: number; dare: number }; card: { kind: "truth" | "dare"; n: number } | null; stopped: boolean };

export function reviveDare(raw: unknown): DareTable | null {
  if (!isObject(raw)) return null;
  const { pack, seed, turn, used, card, stopped } = raw;
  if ((pack !== null && typeof pack !== "string") || !isCount(seed) || !isPlayer(turn) || typeof stopped !== "boolean") return null;
  if (!isObject(used) || !isCount(used.truth) || !isCount(used.dare)) return null;
  if (card !== null && (!isObject(card) || (card.kind !== "truth" && card.kind !== "dare") || !isCount(card.n) || card.n < 1)) return null;
  return raw as unknown as DareTable;
}

/** Dishes roulette: what the wheel has settled so far, newest first. */
export type RouletteTable = { chore: number; results: { who: Player; chore: number; n: number }[]; settled: boolean };

export function reviveRoulette(raw: unknown, chores: number): RouletteTable | null {
  if (!isObject(raw)) return null;
  const { chore, results, settled } = raw;
  const isChore = (value: unknown) => isCount(value) && value < chores;
  if (!isChore(chore) || typeof settled !== "boolean" || !Array.isArray(results)) return null;
  if (!results.every((r) => isObject(r) && isPlayer(r.who) && isChore(r.chore) && isCount(r.n))) return null;
  return raw as unknown as RouletteTable;
}
