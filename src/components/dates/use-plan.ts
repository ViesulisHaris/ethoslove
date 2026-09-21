"use client";

import { useCallback, useSyncExternalStore } from "react";
import { EMPTY_PLAN, parseStoredPlan, type Plan } from "@/lib/dates/plan";

const KEY = "ethos.dates.plan.v1";
const EVENT = "ethos:plan";

// One parse per change, and the same object back until the next one, as useSyncExternalStore needs.
let cache: { raw: string | null; plan: Plan } = { raw: null, plan: EMPTY_PLAN };

function read(): Plan {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // Private mode with storage off: the plan lives for this page only.
    return cache.plan;
  }
  if (raw !== cache.raw) cache = { raw, plan: parseStoredPlan(raw) };
  return cache.plan;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/**
 * The date being planned. It lives in this browser and nowhere else (there is no account and no
 * row in a database), and every open tab and page sees a change at once.
 */
export function usePlan(): [Plan, (update: (plan: Plan) => Plan) => void] {
  const plan = useSyncExternalStore(subscribe, read, () => EMPTY_PLAN);
  const update = useCallback((fn: (plan: Plan) => Plan) => {
    const next = fn(read());
    const raw = JSON.stringify(next);
    cache = { raw, plan: next };
    try {
      window.localStorage.setItem(KEY, raw);
    } catch {
      // Nowhere to keep it; it still updates this page.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [plan, update];
}
