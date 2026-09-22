"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Sections fade up as they scroll into view. Pages stay server components and only mark what should
 * move, with `data-reveal` (and `style={{ "--reveal-delay": "80ms" }}` to stagger siblings); this one
 * observer, mounted once in the layout, does the rest.
 *
 * Nothing is hidden until this has run: the `reveal-ready` class it puts on <html> is what arms the
 * CSS, so with JavaScript off, or before hydration, every section is simply there. Heroes are never
 * marked, because the largest thing on the first screen has to paint at once.
 */
export function RevealRoot() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (!("IntersectionObserver" in window)) return;
    root.classList.add("reveal-ready");
    const seen = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          seen.unobserve(entry.target);
        }
      },
      // A little before it is fully on screen, so a fast scroll never lands on an empty band.
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const watch = () => document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)").forEach((el) => seen.observe(el));
    // A frame after the new page's elements are in the document.
    const frame = requestAnimationFrame(watch);
    return () => {
      cancelAnimationFrame(frame);
      seen.disconnect();
    };
  }, [pathname]);

  return null;
}
