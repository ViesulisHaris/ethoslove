"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "./lobby";
import type { useRoom } from "./use-room";

/**
 * A game's state, kept where the session says: on one phone it is simply here; on two, the host
 * keeps it and sends it after every move, and the guest sends moves and takes what comes back.
 * A guest who arrives late (or reloads) says hello and gets the whole state again.
 */
export function useSynced<S, M>(session: Session, room: ReturnType<typeof useRoom>, initial: () => S, reduce: (state: S, move: M) => S) {
  const [state, setState] = useState<S>(initial);
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);
  const guest = session.mode === "two" && !session.host;
  const host = session.mode === "two" && session.host;
  const [waiting, setWaiting] = useState(guest);

  const dispatch = useCallback(
    (move: M) => {
      if (guest) return room.send("move", move);
      const next = reduce(latest.current, move);
      latest.current = next;
      setState(next);
      if (host) room.send("state", next);
    },
    [guest, host, reduce, room],
  );

  useEffect(() => {
    if (session.mode !== "two") return;
    if (host) {
      const offMove = room.on("move", (payload) => {
        const next = reduce(latest.current, payload as M);
        latest.current = next;
        setState(next);
        room.send("state", next);
      });
      const offHello = room.on("hello", () => room.send("state", latest.current));
      room.send("state", latest.current);
      return () => {
        offMove();
        offHello();
      };
    }
    const off = room.on("state", (payload) => {
      latest.current = payload as S;
      setState(payload as S);
      setWaiting(false);
    });
    room.send("hello", null);
    return off;
  }, [session.mode, host, room, reduce]);

  return { state, dispatch, waiting };
}
