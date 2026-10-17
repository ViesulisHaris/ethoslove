"use client";

import { useCallback, useEffect, useState } from "react";
import type { GameKey } from "@/lib/games/catalogue";
import type { Entry, Session } from "@/lib/games/room";
import { forgetGame, readSaved, removeSaved, resumes, reviveEntry, reviveSession, savedKey, sessionToSave, tabStorage, writeSaved } from "@/lib/games/saved";
import { useRoom } from "./use-room";

/** The same address without its room code, so a reload (or the lobby) doesn't walk back into a room that's over. */
function dropRoomFromAddress() {
  if (!new URLSearchParams(window.location.search).has("room")) return;
  window.history.replaceState(window.history.state, "", window.location.pathname);
}

/**
 * A game's seat at the table: the room it is in and the session being played. Both live in the
 * game, not the lobby, because the lobby leaves the screen when the game starts and the connection
 * has to stay; a game calls this once and hands `room` to both.
 *
 * Both are also kept in the tab (see lib/games/saved.ts), so a reload, the back button and forward
 * again, or a phone that threw the tab out while the link went over WhatsApp, all come back to the
 * game rather than the lobby. A host that reloads goes back into its own room under the same player
 * id, and the guest, still waiting there, carries on.
 *
 * `closed` is the other phone saying it left on purpose ("change players"), as opposed to going
 * quiet: there is no point waiting for it.
 */
export function useGame(game: GameKey, { twoPhones = true }: { twoPhones?: boolean } = {}) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const room = useRoom(entry?.code ?? null, entry?.name ?? "", entry?.host ?? true);
  const [session, setSession] = useState<Session | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    // The address is read now, not in the frame below: the lobby tidies `?mode=two` out of it in
    // that same frame, and here it still has to say "a new room, nothing old".
    const search = window.location.search;
    // A frame after mount, like the lobby's names: the server rendered no game, and the first
    // client render has to match it.
    const frame = requestAnimationFrame(() => {
      const storage = tabStorage();
      if (new URLSearchParams(search).get("mode") === "two") return forgetGame(storage, game);
      const kept = readSaved(storage, savedKey(game, "session"), reviveSession);
      const entered = readSaved(storage, savedKey(game, "entry"), reviveEntry);
      if (kept && resumes(kept, search) && (kept.mode === "one" || twoPhones)) {
        setSession(kept);
        if (kept.mode === "two" && kept.code) setEntry({ code: kept.code, name: kept.names[kept.host ? 0 : 1], host: kept.host });
      } else if (entered && twoPhones && resumes(entered, search)) {
        // In a room, before the game began: back into it, the room card showing.
        setEntry(entered);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [game, twoPhones]);

  const enter = useCallback(
    (next: Entry | null) => {
      setEntry(next);
      const storage = tabStorage();
      if (next) writeSaved(storage, savedKey(game, "entry"), next);
      else removeSaved(storage, savedKey(game, "entry"));
    },
    [game],
  );

  const start = useCallback(
    (next: Session) => {
      setClosed(false);
      setSession(next);
      writeSaved(tabStorage(), savedKey(game, "session"), sessionToSave(next));
    },
    [game],
  );

  const { send, on } = room;
  const inRoom = entry !== null;
  /** Out of the game and back to the lobby. The other phone is told first, while the channel is still open. */
  const leave = useCallback(() => {
    if (inRoom) send("bye", null);
    forgetGame(tabStorage(), game);
    setSession(null);
    setEntry(null);
    setClosed(false);
    dropRoomFromAddress();
  }, [inRoom, send, game]);

  const peer = session?.mode === "two" ? session.peer : null;
  useEffect(() => {
    if (!peer) return;
    return on("bye", (_payload, from) => {
      if (from !== peer) return;
      setClosed(true);
      // A reload now opens the lobby, not a room that is over.
      forgetGame(tabStorage(), game);
      dropRoomFromAddress();
    });
  }, [on, peer, game]);

  return { room, entry, enter, session, start, leave, closed };
}
