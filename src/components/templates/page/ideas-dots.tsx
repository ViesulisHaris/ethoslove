"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The dots under "What to write" on a phone. There the six idea cards are one row, one card to a
 * screen, swiped sideways (the owner, 22 Nov 2026: six at once "looks clustered… maybe on the phone
 * there's like a swipe function where you only see one at a time"). With one card showing, the dots
 * are what says there are six and which one this is. They are only that: the row is swiped, the
 * dots are not pressed, and a screen reader reads the six cards as the list they are.
 */
/** The most cards shown as dots: an occasion's page has up to twelve ideas, and each has its dot. Past that (the finder's longer lists) the place is said as a count. */
export const DOTS_MAX = 12;

export function IdeasDots({ target, count, className }: { target: string; count: number; className?: string }) {
  const [at, setAt] = useState(0);
  useEffect(() => {
    const row = document.getElementById(target);
    if (!row) return;
    let frame = 0;
    const follow = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // The card nearest the margin the row snaps its cards to.
        const edge = row.getBoundingClientRect().left + (parseFloat(getComputedStyle(row).scrollPaddingLeft) || 0);
        let nearest = 0;
        let distance = Infinity;
        row.querySelectorAll<HTMLElement>("[data-card]").forEach((card, i) => {
          const d = Math.abs(card.getBoundingClientRect().left - edge);
          if (d < distance) {
            distance = d;
            nearest = i;
          }
        });
        setAt(nearest);
      });
    };
    // A page come back to keeps where its row was.
    follow();
    row.addEventListener("scroll", follow, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      row.removeEventListener("scroll", follow);
    };
  }, [target]);
  // Past twelve cards the dots fill a line and are too small to count (the finder's end, 31 picks:
  // walk-choose-9): the place is written out instead, "4 / 31".
  if (count > DOTS_MAX)
    return (
      <p data-dots data-count aria-hidden="true" className={cn("text-center text-page-label text-page-body tabular-nums", className)}>
        {at + 1} / {count}
      </p>
    );
  return (
    <div data-dots aria-hidden="true" className={cn("flex justify-center gap-2", className)}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} data-on={i === at ? "" : undefined} className={cn("size-1.5 rounded-full transition-colors duration-200", i === at ? "bg-page-accent" : "bg-page-ink/20")} />
      ))}
    </div>
  );
}
