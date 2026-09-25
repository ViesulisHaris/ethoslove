"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isSavingUnavailable, markSavingAvailable, markSavingUnavailable, subscribeAvailability } from "@/lib/saved-dates/availability";
import { listSavedDates } from "@/lib/saved-dates/client";
import type { SavedDatesList, SavedKind } from "@/lib/saved-dates/types";
import { hasSessionCookie } from "@/lib/supabase/session-cookie";

/**
 * Whether this browser is signed in, as far as its cookies say, on pages that are static and so
 * learn it only in the browser. It is checked again when the tab comes back into focus (signed in
 * in another tab, by the magic link) and when a sign-in sheet sees a new session (sessionChanged).
 *
 * The answer is a number rather than a yes: 0 without a session, and a new number for each session
 * seen since, so a sign-in over a stale cookie (an expired session the server had refused) is still
 * a change that makes every hook here ask again.
 */
let sessionsSeen = 0;
const listeners = new Set<() => void>();
export const sessionChanged = () => {
  sessionsSeen += 1;
  listeners.forEach((listener) => listener());
};
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("focus", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("focus", onChange);
  };
}
const readSession = () => (hasSessionCookie() ? sessionsSeen + 1 : 0);
export const useSessionKey = (): number => useSyncExternalStore(subscribe, readSession, () => 0);
export const useHasSession = (): boolean => useSessionKey() > 0;

/** The session cookies as they are now: a sign-in rewrites them, so a change is a new session. */
const sessionCookies = () =>
  document.cookie
    .split(/;\s*/)
    .filter((c) => /^sb-[^=]*auth-token/.test(c))
    .join(";");

/**
 * While a sign-in sheet is up, the page watches for the session it makes: the six-digit code signs
 * in on this page, the magic link in another tab, which shares the cookies. Compared with the
 * cookies as they were when the sheet opened, so a stale session that sent them to the sheet in the
 * first place doesn't close it again at once.
 */
export function useSignedInWhile(open: boolean, onSignedIn: () => void): void {
  const done = useRef(onSignedIn);
  useEffect(() => {
    done.current = onSignedIn;
  });
  useEffect(() => {
    if (!open) return;
    const before = sessionCookies();
    const timer = window.setInterval(() => {
      const now = sessionCookies();
      if (!now || now === before) return;
      window.clearInterval(timer);
      sessionChanged();
      done.current();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open]);
}

export type SavedAccount = {
  /**
   * `guest`: signed out (or the session has gone); `error`: the list couldn't be had, which reads as
   * unknown, never as "free"; `unavailable`: saving is off right now (lib/saved-dates/availability),
   * and the saving buttons are hidden.
   */
  status: "guest" | "loading" | "ready" | "error" | "unavailable";
  list: SavedDatesList | null;
  reload: () => void;
};

/**
 * The signed-in person's saved dates, their quota and whether they are a member: what the plan's
 * panel, the Maps button and the trip page's button decide from. Nothing is asked for without a
 * session, so a visitor who never signed in makes no request at all.
 */
const readUnavailable = () => isSavingUnavailable();
export const useSavingUnavailable = (): boolean => useSyncExternalStore(subscribeAvailability, readUnavailable, () => false);

export function useSavedAccount(kind?: SavedKind): SavedAccount {
  const session = useSessionKey();
  const signedIn = session > 0;
  const unavailable = useSavingUnavailable();
  const [version, setVersion] = useState(0);
  const [answer, setAnswer] = useState<{ key: string; list: SavedDatesList | null; guest: boolean } | null>(null);
  const key = `${kind ?? "all"}:${session}:${version}`;

  useEffect(() => {
    // Known to be off: nothing is asked until it is worth asking again.
    if (!signedIn || unavailable) return;
    let live = true;
    void listSavedDates(kind).then((res) => {
      if (res.ok) markSavingAvailable();
      else if (res.error === "not_configured") markSavingUnavailable();
      if (!live) return;
      setAnswer({ key, list: res.ok ? { items: res.items, quota: res.quota, member: res.member, partner: res.partner } : null, guest: !res.ok && res.error === "unauthenticated" });
    });
    return () => {
      live = false;
    };
  }, [signedIn, unavailable, kind, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  // A reload keeps showing the last answer until the new one is in, rather than blinking to "loading".
  const status: SavedAccount["status"] = !signedIn || answer?.guest ? "guest" : unavailable ? "unavailable" : !answer ? "loading" : answer.list ? "ready" : "error";
  return { status, list: signedIn && answer && !answer.guest ? answer.list : null, reload };
}
