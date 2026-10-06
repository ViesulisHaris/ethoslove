"use client";

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tag = "span" | "p" | "h1" | "h2" | "div";

/**
 * A name set large in a script or poster face, kept whole on its line. A long one shrinks until it
 * fits (down to `min` of its size) and past that wraps onto a second line: never "…", because a
 * name cut short is the first thing the recipient sees. Nothing clips it either. A script capital's
 * swash and the tail of a "y" draw outside the letters' own boxes, so `truncate` (which hides
 * overflow) used to shave them off; the padding here is the room they need.
 *
 * Measured with offsetWidth, not getBoundingClientRect: the templates rotate and scale the paper a
 * name sits on, and a rotated box's bounding rect is wider than the line.
 */
export function FitName({ as: Element = "span", children, min = 0.55, className, style }: { as?: Tag; children: ReactNode; min?: number; className?: string; style?: CSSProperties }) {
  const outerRef = useRef<HTMLElement | null>(null);
  const innerRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    let alive = true;
    let width = -1;

    const fit = () => {
      if (!alive) return;
      inner.style.fontSize = "1em";
      inner.style.whiteSpace = "nowrap";
      inner.style.maxWidth = "none";
      const box = getComputedStyle(outer);
      const room = outer.clientWidth - parseFloat(box.paddingLeft) - parseFloat(box.paddingRight);
      const need = inner.offsetWidth;
      if (room <= 0 || need <= 0) return;
      const scale = Math.min(1, room / need);
      if (scale >= min) {
        inner.style.fontSize = `${scale}em`;
        return;
      }
      // Too long even at its smallest: two lines rather than an ellipsis.
      inner.style.fontSize = `${min}em`;
      inner.style.whiteSpace = "normal";
      inner.style.maxWidth = "100%";
    };

    // Width only: the fit itself changes the height, and refitting on that would loop.
    const resize = new ResizeObserver(() => {
      if (outer.clientWidth === width) return;
      width = outer.clientWidth;
      fit();
    });
    resize.observe(outer);
    // The editor's preview retypes the name on every keystroke.
    const typing = new MutationObserver(fit);
    typing.observe(inner, { characterData: true, childList: true, subtree: true });
    // A script face arrives after the first paint, and is a different width from its fallback.
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    fonts?.addEventListener("loadingdone", fit);
    void fonts?.ready.then(fit);
    fit();

    return () => {
      alive = false;
      resize.disconnect();
      typing.disconnect();
      fonts?.removeEventListener("loadingdone", fit);
    };
  }, [min]);

  return (
    <Element ref={(el: HTMLElement | null) => void (outerRef.current = el)} data-fit-name="" className={cn("block", className)} style={style}>
      <span ref={innerRef} className="inline-block px-[0.14em] pb-[0.12em] align-top text-balance whitespace-nowrap">
        {children}
      </span>
    </Element>
  );
}
