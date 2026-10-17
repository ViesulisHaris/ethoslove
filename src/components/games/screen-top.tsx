"use client";

import { useEffect, useRef } from "react";

/**
 * Sits at the top of every game screen. A screen change (the next question, the phone handed over,
 * the reveal) would otherwise leave the page scrolled to wherever the last button was, and on a
 * phone the new screen's top, which is the question, would start under the floating header.
 *
 * `screen` names what is on show. Two screens of a game are often the same `<section>` in the same
 * place, so React updates it rather than mounting it again and the effect would never run twice:
 * the name changing is what says "this is a different screen now".
 */
export function ScreenTop({ screen }: { screen?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const header = parseFloat(getComputedStyle(el).getPropertyValue("--header-h")) || 0;
    const top = el.getBoundingClientRect().top;
    if (top < header) window.scrollTo({ top: Math.max(0, window.scrollY + top - header - 12), behavior: "instant" });
  }, [screen]);
  return <span ref={ref} aria-hidden="true" className="block h-0" />;
}
