"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/track";

/** Counts a page of one kind of date as seen, once (a ref: React's development double-run of effects must not count it twice). */
export function KindView({ kind }: { kind: string }) {
  const counted = useRef<string | null>(null);
  useEffect(() => {
    if (counted.current === kind) return;
    counted.current = kind;
    track("date_kind_view", { kind });
  }, [kind]);
  return null;
}
