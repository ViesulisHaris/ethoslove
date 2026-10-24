"use client";

import { createContext, useContext } from "react";

/**
 * What the gift's frame tells the pieces inside it about its own chrome.
 *
 * The free-tier badge floats at the bottom of every gift, which is exactly where the end screen puts
 * its buttons. So the end screen says when it is on screen, and takes the badge into its own flow
 * instead of being covered by it. And on a real gift page, the end screen's "Keep this gift" goes to
 * that gift's keep page, which only the page knows the address of.
 */
export type GiftChrome = {
  watermarked: boolean;
  onEndScreen?: (onScreen: boolean) => void;
  /** The gift's keep page (/g/<id>/keep): only on a real gift page, never in a demo or the editor. */
  keepHref?: string;
};

export const GiftChromeContext = createContext<GiftChrome>({ watermarked: false });

export function useGiftChrome() {
  return useContext(GiftChromeContext);
}
