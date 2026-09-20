"use client";

import { createContext, useContext } from "react";

/**
 * What the gift's frame tells the pieces inside it about its own chrome.
 *
 * Only one thing so far: the free-tier badge floats at the bottom of every gift, which is exactly
 * where the end screen puts its buttons. So the end screen says when it is on screen, and takes the
 * badge into its own flow instead of being covered by it.
 */
export type GiftChrome = {
  watermarked: boolean;
  onEndScreen?: (onScreen: boolean) => void;
};

export const GiftChromeContext = createContext<GiftChrome>({ watermarked: false });

export function useGiftChrome() {
  return useContext(GiftChromeContext);
}
