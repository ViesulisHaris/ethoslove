import { useEffect, useRef, useSyncExternalStore } from "react";
import { isInApp, NATIVE_EVENT, NATIVE_READY_EVENT, tell, type PayloadOf } from "./bridge";

/** React's view of the iPhone app's bridge (./bridge): for client components only. */

const subscribeReady = (onChange: () => void) => {
  window.addEventListener(NATIVE_READY_EVENT, onChange);
  return () => window.removeEventListener(NATIVE_READY_EVENT, onChange);
};

/**
 * Whether the page is inside the app, for rendering. False on the server and in the first render
 * (hydration), true straight after when the app's global is there, so the HTML never mismatches.
 */
export function useInApp(): boolean {
  const inApp = useSyncExternalStore(subscribeReady, isInApp, () => false);
  useEffect(() => {
    // The app marks <html data-app> before the page draws; should a build not, the CSS still gets it.
    if (inApp && !document.documentElement.dataset.app) document.documentElement.dataset.app = "ios";
  }, [inApp]);
  return inApp;
}

export type NativeEvent = { type: "entitlements" | "session" | (string & {}); payload: unknown };

/** Calls `handler` for every `ethos-native` event the app sends while the component is mounted. */
export function useNativeEvents(handler: (event: NativeEvent) => void): void {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail as Partial<NativeEvent> | null;
      if (detail && typeof detail === "object" && typeof detail.type === "string") latest.current({ type: detail.type, payload: detail.payload });
    };
    window.addEventListener(NATIVE_EVENT, listener);
    return () => window.removeEventListener(NATIVE_EVENT, listener);
  }, []);
}

/** Tells the app a page is on screen (it hides its loading skeleton and titles the bar), once. */
export function useNativeReady(route: PayloadOf<"ready">["route"], title?: string, when = true): void {
  const told = useRef(false);
  const inApp = useInApp();
  useEffect(() => {
    if (!inApp || !when || told.current) return;
    told.current = true;
    tell("ready", title ? { route, title } : { route });
  }, [inApp, when, route, title]);
}
