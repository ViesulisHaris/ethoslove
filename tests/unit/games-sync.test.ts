import { describe, expect, it } from "vitest";
import { newDraw } from "@/lib/games/draw";
import { applyInk, inkPairs, orderedSkip, orderedTake, placePoints, readInkNote, type InkOp, type Ordered, type Stroke } from "@/lib/games/ink";
import { newMemory } from "@/lib/games/memory";
import { newKnow, newRather, ratherPicked, ratherReduce, seedOf, type RatherMove, type RatherState } from "@/lib/games/play";
import { forgetGame, readSaved, removeSaved, resumes, reviveDare, reviveDraw, reviveEntry, reviveKept, reviveKnow, reviveMemory, reviveRather, reviveRoulette, reviveSession, savedKey, sessionToSave, writeSaved, type TabStore } from "@/lib/games/saved";
import { EMPTY_HOST, emptyGuest, guestLow, guestQueue, guestTake, guestView, hostAck, hostTake, numbered, playAt, readNumbered, readPushed, reviveHostBook, stamp, type Pushed } from "@/lib/games/sync";

function memoryStore(): TabStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}

/** Storage as a browser that blocks site data hands it over: every call throws. */
const blocked: TabStore = {
  getItem: () => {
    throw new DOMException("blocked", "SecurityError");
  },
  setItem: () => {
    throw new DOMException("blocked", "SecurityError");
  },
  removeItem: () => {
    throw new DOMException("blocked", "SecurityError");
  },
};

describe("what a game remembers in the tab", () => {
  it("reads back what it wrote, and forgets a whole game at once", () => {
    const store = memoryStore();
    const session = { mode: "one" as const, code: null, host: true, names: ["Ana", "Ben"] as [string, string], peer: null };
    writeSaved(store, savedKey("know", "session"), session);
    writeSaved(store, savedKey("know", "state"), { code: null, state: newKnow(1) });
    writeSaved(store, savedKey("rather", "session"), session);
    expect(readSaved(store, savedKey("know", "session"), reviveSession)).toEqual(session);
    forgetGame(store, "know");
    expect(readSaved(store, savedKey("know", "session"), reviveSession)).toBeNull();
    expect(store.map.has(savedKey("know", "state"))).toBe(false);
    // Another game's memory is its own.
    expect(readSaved(store, savedKey("rather", "session"), reviveSession)).toEqual(session);
  });

  it("degrades to remembering nothing when the browser blocks storage, or there is none", () => {
    expect(() => writeSaved(blocked, "k", { a: 1 })).not.toThrow();
    expect(readSaved(blocked, "k", reviveSession)).toBeNull();
    expect(() => removeSaved(blocked, "k")).not.toThrow();
    expect(() => forgetGame(blocked, "know")).not.toThrow();
    expect(readSaved(null, "k", reviveSession)).toBeNull();
    const store = memoryStore();
    store.setItem("k", "{not json");
    expect(readSaved(store, "k", reviveSession)).toBeNull();
  });

  it("keeps a session without the host's first message, and turns away one that doesn't fit", () => {
    const two = { mode: "two" as const, code: "KJQD", host: false, names: ["Ana", "Ben"] as [string, string], peer: "abc123def456", first: { big: "payload" } };
    expect(sessionToSave(two)).toEqual({ mode: "two", code: "KJQD", host: false, names: ["Ana", "Ben"], peer: "abc123def456" });
    expect(reviveSession(sessionToSave(two))).toEqual(sessionToSave(two));
    expect(reviveSession({ ...sessionToSave(two), code: "KIQD" })).toBeNull();
    expect(reviveSession({ ...sessionToSave(two), peer: null })).toBeNull();
    expect(reviveSession({ ...sessionToSave(two), names: ["Ana"] })).toBeNull();
    expect(reviveSession({ mode: "one", code: null, host: true, names: ["Ana", " "], peer: null })).toBeNull();
    expect(reviveSession({ mode: "one", code: null, host: true, names: ["Ana", "x".repeat(25)], peer: null })).toBeNull();
    expect(reviveSession("nonsense")).toBeNull();
    expect(reviveEntry({ code: "KJQD", name: "Ana", host: true })).toEqual({ code: "KJQD", name: "Ana", host: true });
    expect(reviveEntry({ code: "kjqd", name: "Ana", host: true })).toBeNull();
    expect(reviveEntry({ code: "KJQD", name: "", host: true })).toBeNull();
  });

  it("reopens only the game the address asks for", () => {
    const one = { code: null, host: true };
    const hosted = { code: "KJQD", host: true };
    const joined = { code: "KJQD", host: false };
    // A plain address: a game on one phone, or the room this tab made.
    expect(resumes(one, "")).toBe(true);
    expect(resumes(hosted, "")).toBe(true);
    expect(resumes(joined, "")).toBe(false);
    // A room link opens that room and nothing else.
    expect(resumes(joined, "?room=kjqd")).toBe(true);
    expect(resumes(hosted, "?room=KJQD")).toBe(true);
    expect(resumes(joined, "?room=ABCD")).toBe(false);
    expect(resumes(one, "?room=ABCD")).toBe(false);
    // Asked for a new room: nothing old comes back.
    expect(resumes(hosted, "?mode=two")).toBe(false);
    expect(resumes(one, "?mode=two")).toBe(false);
  });

  it("brings a game back only into the room it came from, and only in a shape that still fits", () => {
    const know = newKnow(seedOf("KJQD"));
    expect(reviveKept({ code: "KJQD", state: know }, "KJQD", reviveKnow)).toEqual(know);
    expect(reviveKept({ code: "ABCD", state: know }, "KJQD", reviveKnow)).toBeNull();
    expect(reviveKept({ code: null, state: know }, null, reviveRather)).toBeNull();
    expect(reviveRather(newRather(3))).toEqual(newRather(3));
    expect(reviveRather({ ...newRather(3), round: 99 })).toBeNull();
    expect(reviveDraw(newDraw(3))).toEqual(newDraw(3));
    expect(reviveDraw({ ...newDraw(3), results: [] })).toBeNull();
    const memory = newMemory(9);
    expect(reviveMemory(memory)).toEqual(memory);
    expect(reviveMemory({ ...memory, open: [1, 2, 3] })).toBeNull();
    expect(reviveMemory({ ...memory, turn: 2 })).toBeNull();
    const dare = { pack: null, seed: 5, turn: 1, used: { truth: 2, dare: 1 }, card: { kind: "dare", n: 1 }, stopped: false };
    expect(reviveDare(dare)).toEqual(dare);
    expect(reviveDare({ ...dare, card: { kind: "kiss", n: 1 } })).toBeNull();
    const wheel = { chore: 2, results: [{ who: 0, chore: 3, n: 1 }], settled: false };
    expect(reviveRoulette(wheel, 8)).toEqual(wheel);
    expect(reviveRoulette({ ...wheel, chore: 8 }, 8)).toBeNull();
  });
});

describe("two phones, one game", () => {
  const reduce = ratherReduce;
  const pick = (player: 0 | 1, side: 0 | 1): RatherMove => ({ type: "pick", player, side });
  const push = (state: RatherState, n: number, ack: Pushed<unknown>["ack"], h = "host1"): Pushed<RatherState> => ({ to: "guest", state, h, n, ack });

  it("shows the guest's own tap at once, and keeps it until the host confirms it", () => {
    const start = newRather(seedOf("KJQD"));
    let book = guestTake(emptyGuest<RatherState, RatherMove>(), push(start, 1, null), "g1")!;
    const queued = guestQueue(book, pick(1, 0), start.gen);
    book = queued.book;
    expect(queued.note.seq).toBe(1);
    // On screen before any answer: the pick is made, so the other card can't be taken as well.
    expect(ratherPicked(guestView(book, reduce)!, 1)).toBe(true);
    // A state from the host that crossed the tap on the way doesn't undo it.
    const hostMoved = reduce(start, pick(0, 1));
    book = guestTake(book, push(hostMoved, 2, null), "g1")!;
    const view = guestView(book, reduce)!;
    expect(ratherPicked(view, 0) && ratherPicked(view, 1)).toBe(true);
    // Confirmed: nothing is held any more, and the host's state is the whole truth.
    book = guestTake(book, push(reduce(hostMoved, pick(1, 0)), 3, { e: "g1", seq: 1 }), "g1")!;
    expect(book.pending).toEqual([]);
  });

  it("ignores a state that arrives after a newer one, until the host's page loads again", () => {
    const start = newRather(1);
    let book = guestTake(emptyGuest<RatherState, RatherMove>(), push(reduce(start, pick(0, 0)), 5, null), "g1")!;
    expect(guestTake(book, push(start, 4, null), "g1")).toBeNull();
    expect(guestTake(book, push(start, 5, null), "g1")).toBeNull();
    // A reloaded host counts from the start again, and is believed.
    book = guestTake(book, push(start, 1, null, "host2"), "g1")!;
    expect(book.base).toEqual(start);
  });

  it("drops the guest's moves from a game the host has since dealt again, and confirmations meant for an earlier page", () => {
    const start = newRather(1);
    let book = guestTake(emptyGuest<RatherState, RatherMove>(), push(start, 1, null), "g1")!;
    book = guestQueue(book, pick(1, 1), start.gen).book;
    const again = newRather(1, 1);
    expect(guestTake(book, push(again, 2, null), "g1")!.pending).toEqual([]);
    // An ack for the guest's previous page (a reload) confirms nothing on this one.
    expect(guestTake(book, push(start, 2, { e: "old", seq: 9 }), "g1")!.pending).toHaveLength(1);
  });

  it("applies each of the guest's moves once, however often and in whatever order they arrive", () => {
    let book = EMPTY_HOST;
    let take = hostTake(book, { e: "g1", seq: 1 });
    expect(take.fresh).toBe(true);
    book = take.book;
    expect(hostTake(book, { e: "g1", seq: 1 }).fresh).toBe(false);
    // 3 before 2: both count, and the ack only claims what has all arrived.
    take = hostTake(book, { e: "g1", seq: 3 });
    expect(take.fresh).toBe(true);
    book = take.book;
    expect(hostAck(book)).toEqual({ e: "g1", seq: 1 });
    take = hostTake(book, { e: "g1", seq: 2 });
    expect(take.fresh).toBe(true);
    book = take.book;
    expect(hostAck(book)).toEqual({ e: "g1", seq: 3 });
    expect(hostTake(book, { e: "g1", seq: 3 }).fresh).toBe(false);
    // The guest's page reloaded: its count starts again and its moves are new.
    take = hostTake(book, { e: "g2", seq: 1 });
    expect(take.fresh).toBe(true);
    expect(hostAck(take.book)).toEqual({ e: "g2", seq: 1 });
    expect(hostAck(EMPTY_HOST)).toBeNull();
  });

  it("catches up with a guest whose earlier moves a reloaded host never saw, instead of holding its ack at 0", () => {
    // The guest made ten moves before the host's page loaded again; its eleventh is the oldest still open.
    let take = hostTake(EMPTY_HOST, { e: "g1", seq: 11, low: 11 });
    expect(take.fresh).toBe(true);
    expect(hostAck(take.book)).toEqual({ e: "g1", seq: 11 });
    // So the guest lets go of it, and does not lay that pick over the next round.
    const start = newRather(1);
    const hostMoved = reduce(reduce(start, pick(1, 0)), pick(0, 0));
    const nextRound = reduce(hostMoved, { type: "next" });
    let guest = guestTake(emptyGuest<RatherState, RatherMove>(), push(start, 1, null), "g1")!;
    guest = { ...guest, seq: 10 };
    const queued = guestQueue(guest, pick(1, 0), start.gen);
    expect(queued.note).toMatchObject({ seq: 11, low: 11 });
    guest = guestTake(queued.book, push(nextRound, 2, hostAck(take.book), "host2"), "g1")!;
    expect(ratherPicked(guestView(guest, reduce)!, 1)).toBe(false);
    // A move under the guest's floor that turns up late is one it has already settled: not played again.
    expect(hostTake(take.book, { e: "g1", seq: 9, low: 9 }).fresh).toBe(false);
    // Moves taken out of order above the floor still wait for the one between.
    take = hostTake(take.book, { e: "g1", seq: 13, low: 12 });
    expect(take.fresh).toBe(true);
    expect(hostAck(take.book)).toEqual({ e: "g1", seq: 11 });
    take = hostTake(take.book, { e: "g1", seq: 14, low: 13 });
    expect(hostAck(take.book)).toEqual({ e: "g1", seq: 14 });
    // With two still open the guest's floor is the older one, so the newer can't settle it.
    const two = guestQueue(guestQueue(emptyGuest<RatherState, RatherMove>(), pick(1, 0), 0).book, { type: "next" }, 0);
    expect(two.note).toMatchObject({ seq: 2, low: 1 });
    expect(guestLow(emptyGuest())).toBe(0);
  });

  it("plays a move only on the round it was made on", () => {
    const play = (state: RatherState, move: RatherMove) => playAt(reduce, state, move);
    const start = newRather(1);
    const tapped = stamp(pick(1, 0), start);
    expect(ratherPicked(play(start, tapped), 1)).toBe(true);
    // The round has moved on by the time it lands (a retry, or laid over a newer state on the
    // guest's screen): it is not taken as a pick on the new round.
    const nextRound = reduce(reduce(reduce(start, pick(0, 0)), pick(1, 1)), { type: "next" });
    expect(play(nextRound, tapped)).toBe(nextRound);
    expect(play(newRather(1, 1), tapped)).toEqual(newRather(1, 1));
    // A move with no stamp, from the build before, is played as it always was.
    expect(ratherPicked(play(nextRound, pick(1, 0)), 1)).toBe(true);
    // On the guest's screen: a pick the host has not confirmed yet is not laid over the next round.
    let guest = guestTake(emptyGuest<RatherState, RatherMove>(), push(start, 1, null), "g1")!;
    guest = guestQueue(guest, tapped, start.gen).book;
    guest = guestTake(guest, push(nextRound, 2, null), "g1")!;
    expect(ratherPicked(guestView(guest, play)!, 1)).toBe(false);
  });

  it("keeps the host's count with the game, so a move it took before a reload isn't played twice", () => {
    let book = hostTake(EMPTY_HOST, { e: "g1", seq: 1, low: 1 }).book;
    book = hostTake(book, { e: "g1", seq: 3, low: 2 }).book;
    const kept = reviveHostBook(JSON.parse(JSON.stringify(book)));
    expect(kept).toEqual(book);
    expect(hostTake(kept, { e: "g1", seq: 3, low: 2 }).fresh).toBe(false);
    expect(reviveHostBook(null)).toEqual(EMPTY_HOST);
    expect(reviveHostBook({ e: null, through: 0, above: [] })).toEqual(EMPTY_HOST);
    expect(reviveHostBook({ e: "g1", through: -1, above: [] })).toEqual(EMPTY_HOST);
  });

  it("reads a numbered move as the move itself, and still takes the plain moves and states of the build before", () => {
    const sent = numbered(pick(1, 0), "g1", 1);
    // The move's own fields are all there, so a host on the build before plays it as it is.
    expect(ratherReduce(newRather(1), sent as RatherMove)).toEqual(ratherReduce(newRather(1), pick(1, 0)));
    const note = readNumbered<RatherMove>(sent)!;
    expect([note.e, note.seq, note.low, note.move.type]).toEqual(["g1", 1, 1, "pick"]);
    // A floor that would settle the move itself, or none at all, is read as no floor.
    expect(readNumbered<RatherMove>(numbered(pick(1, 0), "g1", 4, 9))!.low).toBe(1);
    expect(readNumbered<RatherMove>({ ...pick(1, 0), e: "g1", seq: 4 })!.low).toBe(1);
    // A plain move has no number, and is always new.
    expect(readNumbered<RatherMove>(pick(1, 0))).toEqual({ e: "", seq: 0, low: 0, move: pick(1, 0) });
    expect(hostTake(EMPTY_HOST, { e: "", seq: 0 }).fresh).toBe(true);
    expect(readNumbered({ e: "g1", seq: 1 })).toBeNull();
    expect(readNumbered(null)).toBeNull();
    expect(readPushed({ to: "g", state: { a: 1 }, h: "h", n: 1 })).toEqual({ to: "g", state: { a: 1 }, h: "h", n: 1, ack: null });
    // A state with no count is taken every time.
    const plain = readPushed<RatherState>({ to: "guest", state: newRather(1) })!;
    let book = guestTake(emptyGuest<RatherState, RatherMove>(), plain, "g1")!;
    book = guestTake(book, plain, "g1")!;
    expect(book).not.toBeNull();
    expect(readPushed({ to: "g" })).toBeNull();
    expect(readPushed("state")).toBeNull();
  });
});

describe("the drawing on the other phone", () => {
  const stroke = (id: number, points: number[] = [0.1, 0.1]): Stroke => ({ id, points, colour: "#000", width: 0.01 });

  it("applies messages in the order they were sent, holding any that come early", () => {
    let stream: Ordered<string> | null = null;
    const take = (q: number, body: string, whole = false) => {
      const out = orderedTake(stream, "artist", q, body, whole);
      stream = out.stream;
      return out.ready;
    };
    expect(take(0, "a")).toEqual(["a"]);
    expect(take(2, "c")).toEqual([]);
    expect(take(3, "d")).toEqual([]);
    expect(take(1, "b")).toEqual(["b", "c", "d"]);
    // Late or twice: already applied.
    expect(take(1, "b")).toEqual([]);
    // The whole drawing stands for everything before it.
    expect(take(6, "g")).toEqual([]);
    expect(take(5, "all", true)).toEqual(["all", "g"]);
    expect(take(4, "e")).toEqual([]);
  });

  it("stops waiting for a message that never came", () => {
    let { stream } = orderedTake<string>(null, "artist", 0, "a");
    stream = orderedTake(stream, "artist", 2, "c").stream;
    stream = orderedTake(stream, "artist", 3, "d").stream;
    const skipped = orderedSkip(stream);
    expect(skipped.ready).toEqual(["c", "d"]);
    expect(orderedTake(skipped.stream, "artist", 4, "e").ready).toEqual(["e"]);
    // A page that loaded again counts from 0.
    expect(orderedTake(skipped.stream, "artist-again", 0, "fresh").ready).toEqual(["fresh"]);
  });

  it("puts each batch of points where it belongs in the stroke, and draws around a gap", () => {
    // The start point is 2 numbers; batches follow at 2, 6…
    let points = placePoints([0.1, 0.1], 6, [0.4, 0.4]);
    expect(inkPairs(points)).toEqual([0.1, 0.1, 0.4, 0.4]);
    points = placePoints(points, 2, [0.2, 0.2, 0.3, 0.3]);
    expect(points).toEqual([0.1, 0.1, 0.2, 0.2, 0.3, 0.3, 0.4, 0.4]);
    // A gap sent over the room arrives as null.
    expect(inkPairs(JSON.parse(JSON.stringify(placePoints([0.1, 0.1], 4, [0.5, 0.5]))))).toEqual([0.1, 0.1, 0.5, 0.5]);
  });

  it("keeps strokes in the order they were begun, and the artist keeps what it drew after a reload", () => {
    const ops: InkOp[] = [{ t: "start", stroke: stroke(20) }, { t: "start", stroke: stroke(10) }, { t: "more", id: 10, at: 2, p: [0.2, 0.2] }];
    const paper = ops.reduce((was, op) => applyInk(was, op, false), [] as Stroke[]);
    expect(paper.map((s) => s.id)).toEqual([10, 20]);
    expect(paper[0].points).toEqual([0.1, 0.1, 0.2, 0.2]);
    expect(applyInk(paper, { t: "start", stroke: stroke(10) }, false)).toBe(paper);
    // The watcher's copy replaces a watcher's paper, and is added under the artist's new strokes.
    const copy = [stroke(1), stroke(2)];
    expect(applyInk(paper, { t: "all", strokes: copy }, false).map((s) => s.id)).toEqual([1, 2]);
    expect(applyInk([stroke(30)], { t: "all", strokes: copy }, true).map((s) => s.id)).toEqual([1, 2, 30]);
    expect(applyInk(paper, { t: "clear" }, false)).toEqual([]);
  });

  it("reads only well-formed ink", () => {
    expect(readInkNote({ s: "a", q: 0, k: "0:0", op: { t: "start", stroke: stroke(1) } })).not.toBeNull();
    expect(readInkNote({ s: "a", q: 0, k: "0:0", op: { t: "more", id: 1, at: 2, p: [0.1, null] } })).not.toBeNull();
    expect(readInkNote({ s: "a", q: 0, k: "0:0", op: { t: "more", id: 1, p: [0.1] } })).toBeNull();
    expect(readInkNote({ s: "a", q: -1, k: "0:0", op: { t: "clear" } })).toBeNull();
    expect(readInkNote({ s: "a", q: 0, k: "0:0", op: { t: "paint" } })).toBeNull();
  });
});
