"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "./lobby";
import type { useRoom } from "./use-room";

/**
 * A game's state, kept where the session says. On one phone it is simply here. On two, the host
 * keeps it and sends it after every move; the guest sends moves and takes what comes back, and
 * says hello until it has something (a guest who reloads gets the whole game again). Only the
 * other player's messages count, and every state is addressed to that player: a third phone on
 * the link can watch nothing and change nothing.
 * `restart` deals a fresh game in the same room, so "play again" needs no new link.
 */
export function useSynced<S, M>(session: Session, room: ReturnType<typeof useRoom>, make: (generation: number) => S, reduce: (state: S, move: M) => S) {
  const [state, setState] = useState<S>(() => make(0));
  const latest = useRef(state);
  const generation = useRef(0);
  const makeRef = useRef(make);
  const reduceRef = useRef(reduce);
  useEffect(() => {
    latest.current = state;
  }, [state]);
  useEffect(() => {
    makeRef.current = make;
    reduceRef.current = reduce;
  });

  const guest = session.mode === "two" && !session.host;
  const host = session.mode === "two" && session.host;
  const [waiting, setWaiting] = useState(guest);
  const waitingRef = useRef(waiting);
  useEffect(() => {
    waitingRef.current = waiting;
  }, [waiting]);
  const { on, send, me } = room;
  const push = useCallback((next: S) => send("state", { to: session.peer, state: next }), [send, session.peer]);

  const apply = useCallback(
    (next: S) => {
      latest.current = next;
      setState(next);
      if (host) push(next);
    },
    [host, push],
  );

  const dispatch = useCallback(
    (move: M) => {
      if (guest) return send("move", move);
      apply(reduceRef.current(latest.current, move));
    },
    [guest, send, apply],
  );

  const restart = useCallback(() => {
    if (guest) return send("restart", null);
    generation.current += 1;
    apply(makeRef.current(generation.current));
  }, [guest, send, apply]);

  useEffect(() => {
    if (session.mode !== "two") return;
    const fromPeer = (from: string) => !session.peer || from === session.peer;
    if (host) {
      const offs = [
        on("move", (payload, from) => {
          if (fromPeer(from)) apply(reduceRef.current(latest.current, payload as M));
        }),
        on("restart", (_payload, from) => {
          if (!fromPeer(from)) return;
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
      const { to, state: next } = (payload ?? {}) as { to?: string; state?: S };
      if (!fromPeer(from) || to !== me || next === undefined) return;
      latest.current = next;
      setState(next);
      setWaiting(false);
    });
    send("hello", null);
    // Until the first state arrives, keep asking: the host may have been mid-reload.
    const retry = window.setInterval(() => {
      if (!waitingRef.current) return window.clearInterval(retry);
      send("hello", null);
    }, 1500);
    return () => {
      off();
      window.clearInterval(retry);
    };
  }, [session.mode, session.peer, host, me, on, send, push, apply]);

  return { state, dispatch, restart, waiting };
}
