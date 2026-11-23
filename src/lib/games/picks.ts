import { shuffle, type Player } from "./play";

/**
 * The moves "Would you rather" is made of (both pick a side in secret, then the round is shown), for
 * the games that are not "Would you rather". Pure, like play.ts, so the same code runs on one phone
 * passed across and on two phones joined by a room code. play.ts is left as it is: it is played
 * every day.
 */
export type PicksGame = "thisthat";
/** `gen` counts restarts, as in play.ts. `order` is the ids dealt; `picks[player][id]` is the side picked. */
export type PicksState = { game: PicksGame; gen: number; round: number; picks: [Record<string, 0 | 1>, Record<string, 0 | 1>]; order: string[] };
export type PicksMove = { type: "pick"; player: Player; side: 0 | 1 } | { type: "next" };
export const PICKS_ROUNDS = 10;

export function newPicks(game: PicksGame, ids: readonly string[], seed: number, gen = 0): PicksState {
  const order = shuffle([...ids], seed + gen * 7919).slice(0, PICKS_ROUNDS);
  return { game, gen, round: 0, picks: [{}, {}], order };
}

export const picksId = (state: PicksState): string | null => state.order[state.round] ?? null;
export const picksPicked = (state: PicksState, player: Player): boolean => state.order[state.round] in state.picks[player];
export const picksRoundDone = (state: PicksState): boolean => picksPicked(state, 0) && picksPicked(state, 1);
export const picksFinished = (state: PicksState): boolean => state.round >= state.order.length;

export function picksReduce(state: PicksState, move: PicksMove): PicksState {
  if (picksFinished(state)) return state;
  const id = state.order[state.round];
  if (move.type === "pick") {
    if (picksPicked(state, move.player) || (move.side !== 0 && move.side !== 1)) return state;
    const picks: PicksState["picks"] = [{ ...state.picks[0] }, { ...state.picks[1] }];
    picks[move.player][id] = move.side;
    return { ...state, picks };
  }
  if (move.type === "next" && picksRoundDone(state)) return { ...state, round: state.round + 1 };
  return state;
}

/** Rounds both picked the same side, out of the rounds both have picked. */
export function picksMatches(state: PicksState): { same: number; answered: number } {
  let same = 0;
  let answered = 0;
  for (const id of state.order) {
    if (!(id in state.picks[0]) || !(id in state.picks[1])) continue;
    answered++;
    if (state.picks[0][id] === state.picks[1][id]) same++;
  }
  return { same, answered };
}
