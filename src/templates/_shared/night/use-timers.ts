"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Timeouts for a staged reveal that clean up after themselves: whatever is still waiting when the
 * gift is replayed or closed never fires into a template that has already gone.
 */
export function useTimers() {
  const ids = useRef<number[]>([]);

  const clear = useCallback(() => {
    for (const id of ids.current) window.clearTimeout(id);
    ids.current = [];
  }, []);

  const after = useCallback((ms: number, fn: () => void) => {
    ids.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => clear, [clear]);

  return { after, clear };
}
