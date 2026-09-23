/**
 * The bookkeeping behind two phones playing one game, kept pure so it can be tested without a room.
 *
 * The host holds the game. The guest numbers every move it makes and shows it on its own screen at
 * once, on top of the last state the host sent: a tap answers within a frame instead of after two
 * trips through the realtime server. The host applies each numbered move once, however often it
 * arrives, and says in every state how far it has got (`ack`), so the guest can drop the moves the
 * host has taken and keep showing only the ones still on their way.
 *
 * The realtime server does not promise order between two phones, so every state also carries a
 * count (`n`) from the host that sent it (`h`, fresh on every load): an older state that overtakes
 * a newer one on the way is ignored instead of undoing a move.
 */

/**
 * `low` is the guest's oldest move still waiting for the host (this one, when nothing else is):
 * everything under it is settled on the guest's side, so the host never waits for it.
 */
export type Numbered<M> = { e: string; seq: number; low: number; move: M };
export type Pushed<S> = { to: string; state: S; h: string; n: number; ack: { e: string; seq: number } | null };

/**
 * A move travels as the move itself with its number beside its own fields (`{ type, …, e, seq, low }`),
 * so a phone still on the build before this one, which reads it as a plain move, can play it too.
 */
export const numbered = <M extends object>(move: M, e: string, seq: number, low = seq) => ({ ...move, e, seq, low });

/** A move as it is made: with the game and the round that were on screen when it was tapped. */
export const stamp = <M extends object>(move: M, state: { gen: number; round: number }) => ({ ...move, gen: state.gen, round: state.round });

/**
 * A move played only on the round it was made on. One that turns up after its round has gone (sent
 * again after a lost message, overtaken on the way, or laid over a newer state on the guest's own
 * screen) would otherwise count as a tap on whatever round is up now: an answer nobody gave, and a
 * guest locked out of a round it never played. A move with no stamp (the build before) is played.
 */
export function playAt<S extends { gen: number; round: number }, M>(reduce: (state: S, move: M) => S, state: S, move: M): S {
  const { gen, round } = (move ?? {}) as { gen?: unknown; round?: unknown };
  if ((typeof gen === "number" && gen !== state.gen) || (typeof round === "number" && round !== state.round)) return state;
  return reduce(state, move);
}

/** A numbered move; a plain one (from the build before) is a move with no number, `seq` 0. */
export function readNumbered<M>(payload: unknown): Numbered<M> | null {
  if (typeof payload !== "object" || payload === null || typeof (payload as { type?: unknown }).type !== "string") return null;
  const { e, seq, low } = payload as { e?: unknown; seq?: unknown; low?: unknown };
  const counted = typeof e === "string" && typeof seq === "number" && Number.isInteger(seq) && seq > 0;
  if (!counted) return { e: "", seq: 0, low: 0, move: payload as M };
  // A floor above the move itself would settle the move before it was taken: read as no floor at all.
  const floor = typeof low === "number" && Number.isInteger(low) && low >= 1 && low <= seq ? low : 1;
  return { e, seq, low: floor, move: payload as M };
}

/** A state from the host. One from the build before has no count, and is always taken. */
export function readPushed<S>(payload: unknown): Pushed<S> | null {
  if (typeof payload !== "object" || payload === null) return null;
  const { to, state, h, n, ack } = payload as Partial<Pushed<S>>;
  if (typeof to !== "string" || state === undefined || state === null) return null;
  const fair = ack && typeof ack === "object" && typeof ack.e === "string" && typeof ack.seq === "number" ? ack : null;
  return { to, state, h: typeof h === "string" ? h : "", n: typeof n === "number" ? n : 0, ack: fair };
}

/* ------------------------------------------------------------------ the host */

/**
 * The moves taken from the guest now at the table (`e`, fresh each time the guest's page loads):
 * every one up to `through`, and any taken early, out of order, above it.
 */
export type HostBook = { e: string | null; through: number; above: number[] };
export const EMPTY_HOST: HostBook = { e: null, through: 0, above: [] };

/** Moves in order: `through` moves up over any taken early that now follow on from it. */
function settle(e: string, through: number, taken: number[]): HostBook {
  const above = taken.filter((q) => q > through).sort((a, b) => a - b);
  let upTo = through;
  while (above[0] === upTo + 1) {
    upTo += 1;
    above.shift();
  }
  return { e, through: upTo, above };
}

/**
 * Whether a move is new (apply it) or one already taken, sent again because its answer went astray.
 * An uncounted move is always new.
 *
 * The guest's `low` lifts the count first. Without it, a host whose page loaded again mid-game (a
 * reload, back and forward) would start counting at 0 while the guest's moves went on from 10: the
 * ack would stay at 0 for good, and the guest would keep laying its old picks over every new round,
 * as if it had already answered. The same goes for a move the guest dropped with a game dealt again.
 */
export function hostTake(book: HostBook, note: { e: string; seq: number; low?: number }): { book: HostBook; fresh: boolean } {
  if (note.seq === 0) return { book, fresh: true };
  const known = book.e === note.e ? book : { e: note.e, through: 0, above: [] };
  const base = settle(note.e, Math.max(known.through, Math.min(note.low ?? 1, note.seq) - 1), known.above);
  if (note.seq <= base.through || base.above.includes(note.seq)) return { book: base, fresh: false };
  return { book: settle(note.e, base.through, [...base.above, note.seq]), fresh: true };
}

export const hostAck = (book: HostBook): Pushed<unknown>["ack"] => (book.e ? { e: book.e, seq: book.through } : null);

/** The host's count as kept beside the game in the tab, so the moves it took before a reload are not taken twice. */
export function reviveHostBook(raw: unknown): HostBook {
  if (typeof raw !== "object" || raw === null) return EMPTY_HOST;
  const { e, through, above } = raw as Partial<HostBook>;
  const count = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;
  if (typeof e !== "string" || !count(through) || !Array.isArray(above) || !above.every(count)) return EMPTY_HOST;
  return settle(e, through, above);
}

/* ------------------------------------------------------------------ the guest */

export type Pending<M> = { seq: number; gen: number; move: M };
/** The host's last state, which host and which of its states it was, and the guest's moves the host hasn't confirmed. */
export type GuestBook<S, M> = { base: S | null; h: string | null; n: number; seq: number; pending: Pending<M>[] };
export const emptyGuest = <S, M>(): GuestBook<S, M> => ({ base: null, h: null, n: -1, seq: 0, pending: [] });

/** A move made on the guest: numbered and held until the host confirms it. */
export function guestQueue<S, M>(book: GuestBook<S, M>, move: M, gen: number): { book: GuestBook<S, M>; note: { seq: number; low: number; move: M } } {
  const seq = book.seq + 1;
  const pending = [...book.pending, { seq, gen, move }];
  return { book: { ...book, seq, pending }, note: { seq, low: guestLow({ pending }), move } };
}

/** The guest's oldest move the host hasn't confirmed: every move goes out with it (see `hostTake`). */
export const guestLow = (book: Pick<GuestBook<unknown, unknown>, "pending">): number => book.pending[0]?.seq ?? 0;

/**
 * A state from the host. Null when it is older than one already taken. Moves the host has
 * confirmed are dropped, and so are moves made in a game the host has since dealt again.
 */
export function guestTake<S extends { gen: number }, M>(book: GuestBook<S, M>, pushed: Pushed<S>, e: string): GuestBook<S, M> | null {
  if (pushed.h && book.h === pushed.h && pushed.n <= book.n) return null;
  const confirmed = pushed.ack && pushed.ack.e === e ? pushed.ack.seq : 0;
  const pending = book.pending.filter((p) => p.seq > confirmed && p.gen === pushed.state.gen);
  return { ...book, base: pushed.state, h: pushed.h, n: pushed.n, pending };
}

/** What the guest shows: the host's state with its own unconfirmed moves on top. */
export function guestView<S, M>(book: GuestBook<S, M>, reduce: (state: S, move: M) => S): S | null {
  return book.base === null ? null : book.pending.reduce<S>((state, p) => reduce(state, p.move), book.base);
}
