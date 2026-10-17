"use client";

import { useRef } from "react";

/**
 * Focus back on the trigger when a menu or picker closes, without the keyboard's ring after a tap.
 *
 * Radix hands focus back to the trigger as the card closes, which is right for the keyboard. But the
 * browser counts that as focus by script, and Chrome then draws the keyboard ring on the trigger after
 * a plain click or tap on a choice, where it reads as a stuck highlight. So a choice made by pointer
 * gives focus back quietly (`data-quiet`, which the triggers' ring classes skip); the next key or blur
 * brings the ring back. Spread `triggerProps` on the trigger and `contentProps` on the card.
 */
export function useQuietFocus<T extends HTMLElement = HTMLButtonElement>() {
  const trigger = useRef<T>(null);
  const byPointer = useRef(false);
  const unquiet = () => {
    if (trigger.current) delete trigger.current.dataset.quiet;
  };
  return {
    trigger,
    triggerProps: { onKeyDown: unquiet, onBlur: unquiet },
    contentProps: {
      onPointerDown: () => {
        byPointer.current = true;
      },
      onKeyDown: () => {
        byPointer.current = false;
      },
      onCloseAutoFocus: (event: Event) => {
        if (!byPointer.current) return;
        byPointer.current = false;
        const el = trigger.current;
        if (!el) return;
        event.preventDefault();
        el.dataset.quiet = "";
        el.focus({ preventScroll: true });
      },
    },
  };
}
