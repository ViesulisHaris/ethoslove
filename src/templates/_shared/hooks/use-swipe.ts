"use client";

import {
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

export type SwipeDirection = "up" | "down" | "left" | "right";

/**
 * A drag that counts as a swipe once it has travelled `distance` px, mostly in one direction.
 *
 * It fires during the move, not on release: a finger's drag on a phone ends in `pointercancel`
 * instead of `pointerup` as soon as the browser claims it for scrolling, so a check in
 * `onPointerUp` never runs on touch. The element these handlers go on also needs
 * `touch-action: none` (vertical swipes) or `pan-y` (sideways swipes) while the swipe matters,
 * or the browser takes the gesture before `distance` is reached.
 */
export function useSwipe(
  onSwipe: (direction: SwipeDirection) => void,
  { distance = 60, enabled = true } = {},
) {
  const start = useRef<{ id: number; x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const onPointerDown = (e: ReactPointerEvent) => {
    swiped.current = false;
    if (!enabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    start.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const from = start.current;
    if (!from || from.id !== e.pointerId) return;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    const along = Math.max(Math.abs(dx), Math.abs(dy));
    // Diagonal drags don't count, so a sloppy scroll of a letter never turns a page.
    if (along < distance || Math.min(Math.abs(dx), Math.abs(dy)) * 1.4 > along) return;
    // One gesture, one swipe: the finger has to lift before the next one counts.
    start.current = null;
    swiped.current = true;
    onSwipe(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down");
  };
  const onPointerEnd = () => {
    start.current = null;
    // The click a mouse drag produces comes straight after the release; a later one (a key
    // press, say) is a real click again.
    if (swiped.current) window.setTimeout(() => (swiped.current = false), 0);
  };

  // A mouse drag that starts and ends on the same button still clicks it, which would turn a
  // second page (or blow twice) on top of the swipe.
  const onClickCapture = (e: ReactMouseEvent) => {
    if (!swiped.current) return;
    swiped.current = false;
    e.stopPropagation();
    e.preventDefault();
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
    onClickCapture,
  };
}
