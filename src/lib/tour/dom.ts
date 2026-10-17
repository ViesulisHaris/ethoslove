import type { Box } from "./geometry";

/**
 * The tour's reads of the page. Every one of them expects the element not to be there: a room
 * renders what it has loaded, sheets come and go, and a target missing is a step skipped, never
 * an error.
 */

/** Drawn, with a size, and not hidden from people, by CSS or by an open dialog elsewhere. */
export function isOnScreen(el: Element): boolean {
  if (!el.isConnected || el.getClientRects().length === 0) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;
  // Radix hides everything outside an open dialog this way; the tour waits for it to close.
  if (el.closest('[aria-hidden="true"], [inert]')) return false;
  return getComputedStyle(el).visibility !== "hidden";
}

/** The first match of the first selector that has one on screen. */
export function findTarget(selectors: readonly string[]): HTMLElement | null {
  for (const selector of selectors) {
    let found: NodeListOf<Element>;
    try {
      found = document.querySelectorAll(selector);
    } catch {
      // `:has()` in a browser too old for it. The next selector may still do.
      continue;
    }
    for (const el of found) if (el instanceof HTMLElement && isOnScreen(el)) return el;
  }
  return null;
}

export const toBox = (rect: DOMRect): Box => ({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });

/** Fixed or sticky, itself or inside something that is: scrolling the page won't move it. */
export function isPinned(el: Element): boolean {
  for (let node: Element | null = el; node && node !== document.body; node = node.parentElement) {
    const position = getComputedStyle(node).position;
    if (position === "fixed" || position === "sticky") return true;
  }
  return false;
}

/** Someone else's dialog or popover is open: the date picker, the menu, the publish sheet. */
export function otherDialogOpen(): boolean {
  for (const el of document.querySelectorAll('[role="dialog"], [role="alertdialog"]')) {
    if (!el.hasAttribute("data-tour-card") && isOnScreen(el)) return true;
  }
  return false;
}

/**
 * Something is drawn over the part of it that is on screen: on a phone the Dates map opens as a
 * layer over the whole list, and a tour opening then would light patches of map. Off screen there
 * is no telling, so it counts as clear, as does nothing at all. The tour's own button is not
 * "something".
 */
export function isCovered(el: Element | null): boolean {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const left = Math.max(rect.left, 0);
  const right = Math.min(rect.right, document.documentElement.clientWidth);
  const top = Math.max(rect.top, 0);
  const bottom = Math.min(rect.bottom, window.innerHeight);
  if (right - left < 1 || bottom - top < 1) return false;
  const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
  // An ancestor answering means the target lets taps through there itself, not that it is hidden.
  return hit !== null && !el.contains(hit) && !hit.contains(el) && !hit.closest("[data-tour-ui]");
}

/** Focus is in something they type into. */
export function isTyping(): boolean {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el instanceof HTMLInputElement && !["button", "checkbox", "radio", "submit", "reset", "range", "color", "file"].includes(el.type));
}

/** The notch and the home indicator, which CSS knows and JavaScript can only ask CSS for. */
export function safeInsets(): { top: number; bottom: number } {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)";
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = { top: parseFloat(style.paddingTop) || 0, bottom: parseFloat(style.paddingBottom) || 0 };
  probe.remove();
  return insets;
}
