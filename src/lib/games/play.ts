import { KNOW_QUESTIONS, RATHER_PAIRS, type KnowQuestion, type RatherPair } from "./content";
import type { PackId } from "./packs";

/**
 * The two games that need both people to answer, as pure state and pure moves, so the same code
 * runs on one phone passed back and forth and on two phones joined by a room code: on two phones
 * the host holds the state and applies every move, the guest sends moves and receives the state.
 */
export type Player = 0 | 1;

/* ------------------------------------------------------------------ how well do you know me */

/** For each question each player gives two answers: their own, and their guess at the other's. */
export type KnowAnswer = { self: number; guess: number };
/**
 * `gen` counts restarts, so a phone can tell a fresh game from the last one. A game dealt from a
 * pack carries its dealt cards: the guest phone has not got the pack, only the host has to.
 */
export type KnowState = { game: "know"; gen: number; round: number; answers: [Record<string, KnowAnswer>, Record<string, KnowAnswer>]; order: string[]; pack?: PackId; cards?: KnowQuestion[] };

/** A pack's cards for one of these games, as the host holds them. */
export type PackDeal<T> = { pack: PackId; cards: T[] };

export const KNOW_ROUNDS = 8;

/** A fixed shuffle from a seed, so both phones deal the same questions in the same order. */
export function shuffle<T>(items: T[], seed: number): T[] {
  const out = items.slice();
  let s = (seed >>> 0) || 1;
  const next = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const seedOf = (code: string): number => [...code].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function newKnow(seed: number, gen = 0, deal: PackDeal<KnowQuestion> | null = null): KnowState {
  const dealt = shuffle(deal?.cards ?? KNOW_QUESTIONS, seed + gen * 7919).slice(0, KNOW_ROUNDS);
  const state: KnowState = { game: "know", gen, round: 0, answers: [{}, {}], order: dealt.map((q) => q.id) };
  return deal ? { ...state, pack: deal.pack, cards: dealt } : state;
}

export const knowQuestion = (state: KnowState) => (state.cards ?? KNOW_QUESTIONS).find((q) => q.id === state.order[state.round]) ?? null;
export const knowAnswered = (state: KnowState, player: Player): boolean => state.order[state.round] in state.answers[player];
export const knowRoundDone = (state: KnowState): boolean => knowAnswered(state, 0) && knowAnswered(state, 1);
export const knowFinished = (state: KnowState): boolean => state.round >= state.order.length;

export type KnowMove = { type: "answer"; player: Player; self: number; guess: number } | { type: "next" };

export function knowReduce(state: KnowState, move: KnowMove): KnowState {
  if (knowFinished(state)) return state;
  const id = state.order[state.round];
  if (move.type === "answer") {
    if (knowAnswered(state, move.player) || ![0, 1, 2, 3].includes(move.self) || ![0, 1, 2, 3].includes(move.guess)) return state;
    const answers: KnowState["answers"] = [{ ...state.answers[0] }, { ...state.answers[1] }];
    answers[move.player][id] = { self: move.self, guess: move.guess };
    return { ...state, answers };
  }
  if (move.type === "next" && knowRoundDone(state)) return { ...state, round: state.round + 1 };
  return state;
}

/** How many of the other's answers each player guessed right, over the rounds both have answered. */
export function knowScore(state: KnowState): [number, number] {
  const score: [number, number] = [0, 0];
  for (const id of state.order) {
    const a = state.answers[0][id];
    const b = state.answers[1][id];
    if (!a || !b) continue;
    if (a.guess === b.self) score[0]++;
    if (b.guess === a.self) score[1]++;
  }
  return score;
}

/* ------------------------------------------------------------------ would you rather */

export type RatherState = { game: "rather"; gen: number; round: number; picks: [Record<string, 0 | 1>, Record<string, 0 | 1>]; order: string[]; pack?: PackId; cards?: RatherPair[] };
export const RATHER_ROUNDS = 10;

export function newRather(seed: number, gen = 0, deal: PackDeal<RatherPair> | null = null): RatherState {
  const dealt = shuffle(deal?.cards ?? RATHER_PAIRS, seed + gen * 7919).slice(0, RATHER_ROUNDS);
  const state: RatherState = { game: "rather", gen, round: 0, picks: [{}, {}], order: dealt.map((p) => p.id) };
  return deal ? { ...state, pack: deal.pack, cards: dealt } : state;
}
export const ratherPair = (state: RatherState) => (state.cards ?? RATHER_PAIRS).find((p) => p.id === state.order[state.round]) ?? null;
export const ratherPicked = (state: RatherState, player: Player): boolean => state.order[state.round] in state.picks[player];
export const ratherRoundDone = (state: RatherState): boolean => ratherPicked(state, 0) && ratherPicked(state, 1);
export const ratherFinished = (state: RatherState): boolean => state.round >= state.order.length;

export type RatherMove = { type: "pick"; player: Player; side: 0 | 1 } | { type: "next" };

export function ratherReduce(state: RatherState, move: RatherMove): RatherState {
  if (ratherFinished(state)) return state;
  const id = state.order[state.round];
  if (move.type === "pick") {
    if (ratherPicked(state, move.player) || (move.side !== 0 && move.side !== 1)) return state;
    const picks: RatherState["picks"] = [{ ...state.picks[0] }, { ...state.picks[1] }];
    picks[move.player][id] = move.side;
    return { ...state, picks };
  }
  if (move.type === "next" && ratherRoundDone(state)) return { ...state, round: state.round + 1 };
  return state;
}

/** Rounds both picked the same side, out of the rounds both have picked. */
export function ratherMatches(state: RatherState): { same: number; answered: number } {
  let same = 0;
  let answered = 0;
  for (const id of state.order) {
    if (!(id in state.picks[0]) || !(id in state.picks[1])) continue;
    answered++;
    if (state.picks[0][id] === state.picks[1][id]) same++;
  }
  return { same, answered };
}
