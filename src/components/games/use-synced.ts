"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@/lib/games/room";
import { readSaved, reviveKept, savedKey, tabStorage, writeSaved, type Kept } from "@/lib/games/saved";
import { EMPTY_HOST, emptyGuest, guestLow, guestQueue, guestTake, guestView, hostAck, hostTake, numbered, playAt, readNumbered, readPushed, reviveHostBook, stamp, type GuestBook, type HostBook } from "@/lib/games/sync";
import type { useRoom } from "./use-room";

/** How often a guest asks again: for the game while it has none, or for its moves the host hasn't confirmed. */
const RETRY_MS = 1500;

const pageId = () => Math.random().toString(36).slice(2, 10);

/**
 * A game's state, kept where the session says. On one phone it is simply here. On two, the host
 * keeps it and sends it after every move; the guest sends moves and takes what comes back, and
 * says hello until it has something (a guest who reloads gets the whole game again). Only the
 * other player's messages count, and every state is addressed to that player: a third phone on
 * the link can watch nothing and change nothing.
 *
 * The guest's own taps show at once: each move is numbered and laid over the host's last state
 * until the host confirms it (see lib/games/sync.ts), and sent again until it does, so a message
 * lost on the way costs a second and not the move.
 *
 * `saved` keeps the game in the tab on one phone and on the host's, so a reload carries on where it
 * was; `restored` says it did. The guest keeps nothing: the host sends it everything again.
 * `restart` deals a fresh game in the same room, so "play again" needs no new link.
 */
export function useSynced<S extends { gen: number; round: number }, M extends object>(session: Session, room: ReturnType<typeof useRoom>, make: (generation: number) => S, reduce: (state: S, move: M) => S, saved?: { game: string; revive: (raw: unknown) => S | null }) {
  const guest = session.mode === "two" && !session.host;
  const host = session.mode === "two" && session.host;
  const { on, send, me, status } = room;
  // This page, as the other phone knows it: a reload is a new page, whose count starts again.
  const [epoch] = useState(pageId);
  // Where the game opens. A guest opens on the host's first state, which reached it in the lobby, so
  // there is no second wait for it here; one phone or a host carries on from the tab's copy.
  const [opening] = useState(() => {
    if (guest) {
      const first = readPushed<S>(session.first);
      const book = first && first.to === me ? guestTake(emptyGuest<S, M>(), first, epoch) : null;
      return { state: book?.base ?? make(0), book: book ?? emptyGuest<S, M>(), taken: EMPTY_HOST, restored: false };
    }
    // The host's count of the guest's moves comes back with the game, so a move it took before the
    // reload and is sent again (its confirmation never got out) is not played twice.
    const kept = saved
      ? readSaved(tabStorage(), savedKey(saved.game, "state"), (raw) => {
          const game = reviveKept(raw, session.code, saved.revive);
          return game ? { game, taken: reviveHostBook((raw as Kept<S>).book) } : null;
        })
      : null;
    return { state: kept?.game ?? make(0), book: emptyGuest<S, M>(), taken: kept?.taken ?? EMPTY_HOST, restored: kept !== null };
  });
  const [state, setState] = useState<S>(opening.state);
  const latest = useRef(state);
  const generation = useRef(opening.state.gen);
  const guestBook = useRef<GuestBook<S, M>>(opening.book);
  const hostBook = useRef<HostBook>(opening.taken);
  const sent = useRef(0);
  const makeRef = useRef(make);
  const reduceRef = useRef(reduce);
  const savedRef = useRef(saved);
  useEffect(() => {
    latest.current = state;
  }, [state]);
  useEffect(() => {
    makeRef.current = make;
    reduceRef.current = reduce;
    savedRef.current = saved;
  });

  const [waiting, setWaiting] = useState(guest && opening.book.base === null);
  const waitingRef = useRef(waiting);
  useEffect(() => {
    waitingRef.current = waiting;
  }, [waiting]);
  // The game a guest asked to deal again, so its "play again" can show it is on the way.
  const [asked, setAsked] = useState<number | null>(null);

  const push = useCallback(
    (next: S) => {
      sent.current += 1;
      send("state", { to: session.peer, state: next, h: epoch, n: sent.current, ack: hostAck(hostBook.current) });
    },
    [send, session.peer, epoch],
  );

  const show = useCallback((next: S) => {
    latest.current = next;
    setState(next);
  }, []);

  const apply = useCallback(
    (next: S) => {
      show(next);
      if (host) push(next);
      const keep = savedRef.current;
      if (keep) writeSaved(tabStorage(), savedKey(keep.game, "state"), { code: session.code, state: next, book: hostBook.current } satisfies Kept<S>);
    },
    [host, push, show, session.code],
  );

  // Every move carries the round it was made on and counts only there (see `playAt`).
  const play = useCallback((from: S, move: M) => playAt(reduceRef.current, from, move), []);

  const dispatch = useCallback(
    (tapped: M) => {
      const move: M = stamp(tapped, latest.current);
      if (!guest) return apply(play(latest.current, move));
      const { book, note } = guestQueue(guestBook.current, move, latest.current.gen);
      guestBook.current = book;
      show(guestView(book, play) ?? play(latest.current, move));
      send("move", numbered(note.move, epoch, note.seq, note.low));
    },
    [guest, apply, play, show, send, epoch],
  );

  const restart = useCallback(() => {
    if (guest) {
      setAsked(latest.current.gen);
      // Which game to deal again: a second tap, or the message arriving twice, deals only once.
      return send("restart", { gen: latest.current.gen });
    }
    generation.current += 1;
    apply(makeRef.current(generation.current));
  }, [guest, send, apply]);

  useEffect(() => {
    if (session.mode !== "two") return;
    const fromPeer = (from: string) => !session.peer || from === session.peer;
    if (host) {
      const offs = [
        on("move", (payload, from) => {
          const note = readNumbered<M>(payload);
          if (!fromPeer(from) || !note) return;
          const { book, fresh } = hostTake(hostBook.current, note);
          hostBook.current = book;
          // A move already taken, sent again because the state that confirmed it went astray: confirm it again.
          if (fresh) apply(play(latest.current, note.move));
          else push(latest.current);
        }),
        on("restart", (payload, from) => {
          if (!fromPeer(from)) return;
          const gen = (payload as { gen?: unknown } | null)?.gen;
          if (typeof gen === "number" && gen !== latest.current.gen) return push(latest.current);
          generation.current += 1;
          apply(makeRef.current(generation.current));
        }),
        on("hello", (_payload, from) => {
          if (fromPeer(from)) push(latest.current);
        }),
      ];
      push(latest.current);
      return () => offs.forEach((off) => off());
    }
    const off = on("state", (payload, from) => {
      const note = readPushed<S>(payload);
      if (!fromPeer(from) || !note || note.to !== me) return;
      const book = guestTake(guestBook.current, note, epoch);
      if (!book) return;
      guestBook.current = book;
      show(guestView(book, play) ?? note.state);
      setWaiting(false);
    });
    // Once even with the first state in hand: anything the host sent between the lobby and here is asked for again.
    send("hello", null);
    // Until the first state arrives, keep asking: the host may have been mid-reload. After that,
    // send again any move the host hasn't confirmed.
    const retry = window.setInterval(() => {
      if (waitingRef.current) return send("hello", null);
      const low = guestLow(guestBook.current);
      for (const p of guestBook.current.pending) send("move", numbered(p.move, epoch, p.seq, low));
    }, RETRY_MS);
    return () => {
      off();
      window.clearInterval(retry);
    };
  }, [session.mode, session.peer, host, me, on, send, push, apply, play, show, epoch]);

  // A host back from a reload comes into the room after the game is on screen: the state it sent
  // on the way in went nowhere, so it goes again once the room is open.
  useEffect(() => {
    if (host && status === "open") push(latest.current);
  }, [host, status, push]);

  return { state, dispatch, restart, waiting, restored: opening.restored, restarting: guest && asked === state.gen };
}
