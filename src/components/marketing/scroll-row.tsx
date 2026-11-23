"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * A sideways row of cards (the front page's strip of gifts, its date ideas) with a round
 * previous/next button at each side on a desk. A mouse wheel does not move a sideways row, and the
 * row hides its scrollbar, so on a desk without a trackpad only Tab reached the cards past the fifth
 * (walk-front-5, 23 Nov 2026). The buttons are the gallery card's round arrow (44px, paper, a hairline
 * ring), disabled and dimmed at each end, and absent under `lg`, where a finger swipes. Each press moves the row by
 * four fifths of its width.
 */
export function ScrollRow({
  as: Tag = "div",
  className,
  labels,
  children,
  ...rest
}: {
  as?: "div" | "ul";
  className?: string;
  labels: { previous: string; next: string };
  children: React.ReactNode;
} & Record<`data-${string}`, string | boolean | undefined>) {
  const row = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = row.current;
    if (!el) return;
    // A pixel of slack: a scroll position can land on a fraction.
    setEdges({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 });
  }, []);

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const move = (direction: 1 | -1) => {
    const el = row.current;
    if (!el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: calm ? "auto" : "smooth" });
  };

  const button = "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-paper text-ink shadow-[0_10px_24px_-14px_rgba(74,32,24,0.6)] ring-1 ring-ink/10 transition-colors duration-300 hover:bg-forest hover:text-cream disabled:pointer-events-none disabled:opacity-40 lg:grid";
  // In the row's side margin where it is wide enough (half of max(2rem, (100vw - 80rem) / 2 + 2rem)), and never closer than 12px to the window's edge.
  const side = "max(0.75rem, calc((100vw - 80rem) / 4 + 1rem - 1.375rem))";

  return (
    <div className="relative">
      <Tag ref={row as React.Ref<HTMLDivElement & HTMLUListElement>} className={className} {...rest}>
        {children}
      </Tag>
      <button type="button" data-row-previous aria-label={labels.previous} disabled={edges.start} onClick={() => move(-1)} className={button} style={{ left: side }}>
        <ChevronLeft aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
      </button>
      <button type="button" data-row-next aria-label={labels.next} disabled={edges.end} onClick={() => move(1)} className={button} style={{ right: side }}>
        <ChevronRight aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
      </button>
    </div>
  );
}
