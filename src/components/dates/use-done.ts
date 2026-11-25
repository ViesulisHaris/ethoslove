"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { track } from "@/lib/analytics/track";
import { DONE_KEY, readDone, type DoneDate } from "@/lib/dates/done";
import { readKeptVotes, voteChanges, VOTES_KEY, type Vote } from "@/lib/dates/votes";

/*
 * The dates a person has done, and their "Was this a good date?" answers: both in this browser
 * only, built like use-plan.ts (one parse per change, every tab told at once).
 */

const EVENT = "ethos:done";
const EMPTY: DoneDate[] = [];
let cache: { raw: string | null; list: DoneDate[] } = { raw: null, list: EMPTY };

function read(): DoneDate[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(DONE_KEY);
  } catch {
    return cache.list;
  }
  if (raw !== cache.raw) cache = { raw, list: readDone(raw) };
  return cache.list;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/** The log of done dates, newest first, and a way to change it. */
export function useDone(): [DoneDate[], (update: (list: DoneDate[]) => DoneDate[]) => void] {
  const list = useSyncExternalStore(subscribe, read, () => EMPTY);
  const update = useCallback((fn: (list: DoneDate[]) => DoneDate[]) => {
    const next = fn(read());
    const raw = JSON.stringify(next);
    cache = { raw, list: next };
    try {
      window.localStorage.setItem(DONE_KEY, raw);
    } catch {
      // Nowhere to keep it: it still shows on this page.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [list, update];
}

/** Whether this site takes votes at all (migration 0026 applied): asked once a tab. */
const AVAILABLE_KEY = "ethos.dates.votes.available";
const VOTES_EVENT = "ethos:votes";
let votesCache: { raw: string | null; kept: Record<string, Vote> } = { raw: null, kept: {} };
const NONE: Record<string, Vote> = {};

function readVotes(): Record<string, Vote> {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(VOTES_KEY);
  } catch {
    return votesCache.kept;
  }
  if (raw !== votesCache.raw) votesCache = { raw, kept: readKeptVotes(raw) };
  return votesCache.kept;
}
function writeVotes(kept: Record<string, Vote>) {
  const raw = JSON.stringify(kept);
  votesCache = { raw, kept };
  try {
    window.localStorage.setItem(VOTES_KEY, raw);
  } catch {
    // Nowhere to keep it: the answer is sent and shown on this page.
  }
  window.dispatchEvent(new Event(VOTES_EVENT));
}
function subscribeVotes(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(VOTES_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(VOTES_EVENT, onChange);
  };
}

function readAvailable(): boolean | null {
  try {
    const v = window.sessionStorage.getItem(AVAILABLE_KEY);
    return v === "1" ? true : v === "0" ? false : null;
  } catch {
    return null;
  }
}

export type Votes = {
  /** This browser's answers, by target. */
  kept: Record<string, Vote>;
  /** True when the site takes votes, false when it does not (the table is not there yet), null while unknown. */
  available: boolean | null;
  /** One tap: the new answer for every target (null takes it back). */
  cast: (targets: readonly string[], next: Vote | null) => Promise<void>;
};

/**
 * The votes, for the targets on screen. Whether votes are taken is asked once a tab (one GET) and
 * kept in sessionStorage; a tap writes the answer here first and puts the old one back if the
 * request fails. Nothing about the person is sent: the targets and the changes only.
 */
export function useVotes(targets: readonly string[]): Votes {
  const kept = useSyncExternalStore(subscribeVotes, readVotes, () => NONE);
  const [asked, setAsked] = useState<{ key: string; available: boolean } | null>(null);
  const key = targets.join(",");
  const stored = useSyncExternalStore(subscribeVotes, readAvailable, () => null);

  useEffect(() => {
    if (!key || stored !== null) return;
    const controller = new AbortController();
    fetch(`/api/dates/votes?t=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ available?: unknown }>) : null))
      .then((json) => {
        const available = json?.available === true;
        try {
          window.sessionStorage.setItem(AVAILABLE_KEY, available ? "1" : "0");
        } catch {}
        setAsked({ key, available });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [key, stored]);

  const available = !key ? null : stored ?? (asked?.key === key ? asked.available : null);

  const cast = useCallback(async (on: readonly string[], next: Vote | null) => {
    const before = readVotes();
    const changes = voteChanges(on, before, next);
    if (changes.length === 0) return;
    const after = { ...before };
    for (const t of on) {
      if (next) after[t] = next;
      else delete after[t];
    }
    writeVotes(after);
    try {
      const res = await fetch("/api/dates/votes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ changes }) });
      const json = res.ok ? ((await res.json()) as { ok?: unknown }) : null;
      if (json?.ok !== true) throw new Error("not counted");
      if (next) track("date_vote", { vote: next });
    } catch {
      writeVotes(before);
    }
  }, []);

  return { kept, available, cast };
}
