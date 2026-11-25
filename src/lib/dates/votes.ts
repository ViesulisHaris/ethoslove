/*
 * "Was this a good date?" (BRIEF-dates2.md 3): the arithmetic of the two counters, shared by the
 * browser and the route. No zod and no "server-only": the browser uses it too.
 */

export type Vote = "yes" | "no";
/** What a vote is on: a place ("place:node/123") or an idea ("idea:golden-hour-picnic"). Migration 0026's check is the same pattern. */
export const TARGET = /^(place:(node|way|relation)\/\d{1,15}|idea:[a-z0-9-]{1,40})$/;
/** Eight stops and an idea. */
export const MAX_TARGETS = 9;
/** Nothing is shown before five yes votes. */
export const LIKED_FLOOR = 5;
/** This browser's own answers, by target: a second tap changes the vote, it does not add one. */
export const VOTES_KEY = "ethos.dates.votes.v1";
/** How many answers a browser keeps, newest first. */
export const KEPT_VOTES = 500;

export type Delta = -1 | 0 | 1;
export type VoteChange = { target: string; yes: Delta; no: Delta };

const PLACE_ID = /^(node|way|relation)\/\d{1,15}$/;
const IDEA_ID = /^[a-z0-9-]{1,40}$/;

/** What a done date is a vote on: each stop's place and its idea, once each, nine at most. */
export function voteTargets(of: { places: readonly string[]; idea?: string }): string[] {
  const out: string[] = [];
  for (const id of of.places) {
    const target = `place:${id}`;
    if (PLACE_ID.test(id) && !out.includes(target)) out.push(target);
  }
  const kept = out.slice(0, of.idea && IDEA_ID.test(of.idea) ? MAX_TARGETS - 1 : MAX_TARGETS);
  return of.idea && IDEA_ID.test(of.idea) ? [...kept, `idea:${of.idea}`] : kept;
}

/** What one tap changes on the counters: from this browser's last answer for each target to the new one (null takes it back). Nothing for a target already at that answer. */
export function voteChanges(targets: readonly string[], kept: Readonly<Record<string, Vote>>, next: Vote | null): VoteChange[] {
  const changes: VoteChange[] = [];
  for (const target of targets) {
    const before = kept[target] ?? null;
    if (before === next) continue;
    const yes = ((next === "yes" ? 1 : 0) - (before === "yes" ? 1 : 0)) as Delta;
    const no = ((next === "no" ? 1 : 0) - (before === "no" ? 1 : 0)) as Delta;
    changes.push({ target, yes, no });
  }
  return changes;
}

/** One counter row after one change, never under zero: the same sum the database does. */
export function applyChange(row: { yes: number; no: number }, change: VoteChange): { yes: number; no: number } {
  return { yes: Math.max(row.yes + change.yes, 0), no: Math.max(row.no + change.no, 0) };
}

/** The count a place may show: the yes votes from five up, else null. Never the no votes. */
export const likedCount = (yes: number): number | null => (Number.isInteger(yes) && yes >= LIKED_FLOOR ? yes : null);

const isDelta = (v: unknown): v is Delta => v === -1 || v === 0 || v === 1;

/** The body of a vote, checked field by field: null for anything else. */
export function readVoteChanges(body: unknown): VoteChange[] | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const list = (body as { changes?: unknown }).changes;
  if (!Array.isArray(list) || list.length === 0 || list.length > MAX_TARGETS) return null;
  const seen = new Set<string>();
  const out: VoteChange[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") return null;
    const { target, yes, no } = item as Record<string, unknown>;
    if (typeof target !== "string" || !TARGET.test(target) || seen.has(target)) return null;
    if (!isDelta(yes) || !isDelta(no)) return null;
    if ((yes === 1 && no === 1) || (yes === 0 && no === 0)) return null;
    seen.add(target);
    out.push({ target, yes, no });
  }
  return out;
}

/** This browser's answers, as kept: only good targets and answers, the newest KEPT_VOTES. */
export function readKeptVotes(raw: string | null): Record<string, Vote> {
  if (!raw) return {};
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>).filter((e): e is [string, Vote] => TARGET.test(e[0]) && (e[1] === "yes" || e[1] === "no"));
  return Object.fromEntries(entries.slice(-KEPT_VOTES));
}
