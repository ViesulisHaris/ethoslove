import { useSyncExternalStore } from "react";

/**
 * Which place is being pointed at, in the list or on the map. It lived in the Dates page's state,
 * so every card hovered re-rendered the whole page (all the cards, the rail, the picks, the map's
 * props) to light one card and one pin: a 50–70 ms frame in development for each card the mouse
 * crossed. Kept here instead, a change reaches only the card that lights up, the one that goes out,
 * and the map.
 */
export type HoverStore = {
  get: () => string | null;
  set: (id: string | null) => void;
  subscribe: (onChange: () => void) => () => void;
};

export function createHoverStore(): HoverStore {
  let current: string | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: (id) => {
      if (id === current) return;
      current = id;
      for (const fn of listeners) fn();
    },
    subscribe: (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
}

const nobody = () => null;
const no = () => false;

/** The place being pointed at, for whatever shows all of them (the map). */
export function useHoveredId(store: HoverStore): string | null {
  return useSyncExternalStore(store.subscribe, store.get, nobody);
}

/** Whether this one place is being pointed at: re-renders only when that answer changes. */
export function useIsHovered(store: HoverStore, id: string): boolean {
  return useSyncExternalStore(store.subscribe, () => store.get() === id, no);
}
