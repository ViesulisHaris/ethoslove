"use client";

import { useSyncExternalStore } from "react";
import { getConsent, serverConsent, subscribeToConsent, type Consent } from "./consent";

/**
 * The consent choice, as an external store rather than effect-and-setState: it lives in
 * localStorage, so React has to be told to subscribe to it. This also keeps the server render
 * ("not asked") and the first client render in agreement, so nothing flashes.
 */
export function useConsent(): Consent | null {
  return useSyncExternalStore(subscribeToConsent, getConsent, serverConsent);
}

const noop = () => () => {};

/**
 * False on the server and through hydration, true after. The banner needs it: the server has
 * to assume "not asked", and without this a visitor who already answered would see it flash
 * in and straight back out.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
