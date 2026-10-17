"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { playerId } from "@/lib/games/room";
import { tabStorage } from "@/lib/games/saved";

/**
 * Two phones in one room. A room is a realtime channel named after its code: no table, no row,
 * nothing kept once both leave. The host (whoever made the code) holds the game and sends the
 * whole state after every move; the guest sends moves. Presence says who is here and by what name.
 */
export type Peer = { id: string; name: string; host: boolean; at: number };
export type RoomStatus = "off" | "connecting" | "open" | "failed";

type Listener = (payload: unknown, from: string) => void;

export function useRoom(code: string | null, name: string, host: boolean) {
  const [status, setStatus] = useState<RoomStatus>("off");
  const [peers, setPeers] = useState<Peer[]>([]);
  const channel = useRef<RealtimeChannel | null>(null);
  const listeners = useRef(new Map<string, Set<Listener>>());
  // Through tabStorage: with site data blocked, reading window.sessionStorage itself throws, and a
  // throw here took the whole page down. Without storage the id is simply new on every load.
  const [me] = useState(() => (typeof window === "undefined" ? "" : playerId(tabStorage())));

  useEffect(() => {
    if (!code || !name) return;
    let cancelled = false;
    let ch: RealtimeChannel | null = null;
    // When this phone came in. Every phone sorts the same presence list by it, so all of them agree
    // which guest arrived first and keeps the seat.
    const at = Date.now();
    (async () => {
      const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
      if (cancelled) return;
      setStatus("connecting");
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return setStatus("failed");
      ch = supabase.channel(`game:${code}`, { config: { presence: { key: me }, broadcast: { self: false } } });
      ch.on("presence", { event: "sync" }, () => {
        const state = ch!.presenceState<{ name: string; host: boolean; at?: number }>();
        const list: Peer[] = Object.entries(state).map(([id, metas]) => ({ id, name: metas[0]?.name ?? "", host: Boolean(metas[0]?.host), at: Number(metas[0]?.at) || 0 }));
        setPeers(list.sort((a, b) => Number(b.host) - Number(a.host) || a.at - b.at || a.id.localeCompare(b.id)));
      });
      ch.on("broadcast", { event: "*" }, ({ event, payload }) => {
        const { from, data } = (payload ?? {}) as { from?: string; data?: unknown };
        if (from === me) return;
        listeners.current.get(event)?.forEach((l) => l(data, from ?? ""));
      });
      ch.subscribe(async (state) => {
        if (cancelled) return;
        if (state === "SUBSCRIBED") {
          await ch!.track({ name, host, at });
          setStatus("open");
        } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") setStatus("failed");
      });
      channel.current = ch;
    })().catch(() => {
      // The client's chunk didn't load (offline), or the browser refused it something (site data
      // blocked): the room says it couldn't open, with its way out, rather than connecting for ever.
      if (!cancelled) setStatus("failed");
    });
    return () => {
      cancelled = true;
      channel.current = null;
      void ch?.unsubscribe();
      setPeers([]);
      setStatus("off");
    };
  }, [code, name, host, me]);

  const send = useCallback((event: string, data: unknown) => {
    void channel.current?.send({ type: "broadcast", event, payload: { from: me, data } });
  }, [me]);

  const on = useCallback((event: string, listener: Listener) => {
    const set = listeners.current.get(event) ?? new Set<Listener>();
    set.add(listener);
    listeners.current.set(event, set);
    return () => {
      set.delete(listener);
    };
  }, []);

  return { status, peers, me, send, on };
}
