import { shuffle, type Player } from "./play";

/**
 * Memory, for two on one phone. Sixteen cards, eight pairs. Turn two over: a pair is yours and you
 * go again; anything else goes back face down and it is the other person's turn.
 */
export type MemoryState = {
  /** The face on each slot: pair number 0 to 7, each twice. */
  cards: number[];
  /** Who took each slot's pair, or null while it is still in play. */
  matched: (Player | null)[];
  /** The one or two slots face up right now. */
  open: number[];
  turn: Player;
  scores: [number, number];
};

export const MEMORY_PAIRS = 8;

export function newMemory(seed: number, pairs = MEMORY_PAIRS): MemoryState {
  const cards = shuffle(
    Array.from({ length: pairs * 2 }, (_, i) => Math.floor(i / 2)),
    seed,
  );
  return { cards, matched: cards.map(() => null), open: [], turn: 0, scores: [0, 0] };
}

/** Turn a card over. Nothing happens to a card already up, a taken pair, or a third card. */
export function memoryFlip(state: MemoryState, slot: number): MemoryState {
  if (slot < 0 || slot >= state.cards.length || state.matched[slot] !== null || state.open.includes(slot) || state.open.length >= 2) return state;
  return { ...state, open: [...state.open, slot] };
}

export const memoryIsPair = (state: MemoryState): boolean => state.open.length === 2 && state.cards[state.open[0]] === state.cards[state.open[1]];

/** Settle two open cards: a pair goes to whoever turned it and they go again; otherwise the turn passes. */
export function memoryResolve(state: MemoryState): MemoryState {
  if (state.open.length < 2) return state;
  const [a, b] = state.open;
  if (state.cards[a] !== state.cards[b]) return { ...state, open: [], turn: state.turn === 0 ? 1 : 0 };
  const matched = state.matched.slice();
  matched[a] = state.turn;
  matched[b] = state.turn;
  const scores: [number, number] = [state.scores[0], state.scores[1]];
  scores[state.turn] += 1;
  return { ...state, matched, scores, open: [] };
}

export const memoryDone = (state: MemoryState): boolean => state.matched.every((m) => m !== null);
