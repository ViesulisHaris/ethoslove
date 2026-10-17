"use client";

import { useSyncExternalStore } from "react";
import { toYmd, type Ymd } from "@/lib/dates/calendar";

const noop = () => () => {};
const localDay = () => toYmd(new Date());

/**
 * The visitor's own today as "YYYY-MM-DD". The server doesn't know it (nor their zone), so there it
 * is undefined and the pickers show their fields but wait for the browser before they open.
 */
export function useToday(): Ymd | undefined {
  return useSyncExternalStore(noop, localDay, () => undefined);
}
