"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { GiftLocale } from "@/lib/gift/schema";
import { BRAND } from "@/config/brand";
import { LogoMark } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { GIFT_CONTROLS, coversControl } from "./watermark-spot";

/**
 * Free-tier footer. Deliberately small and tasteful — it is the viral hook, not an ad.
 *
 * It opens a page made for whoever taps it (/made-with-ethos): they have just been given one and are
 * curious, not ready to pay, so it starts with making one back for free, the gift's own template
 * first among its kind, and never goes straight to a checkout. Gifts carry no app context, so the
 * language prefix is the gift's own, the same as its "send one back".
 *
 * It floats at the foot of the gift, except on the end screen, which carries it in its own flow
 * (`inline`) so it never lands on top of the buttons there. Floating, it never lands on any other
 * button either: while one of the gift's controls is under it, it stands down (./watermark-spot.ts).
 */
export function Watermark({ locale, slug, inline = false, className }: { locale: GiftLocale; slug?: string; inline?: boolean; className?: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const standDown = useControlUnder(ref, !inline);
  const prefix = locale === "es" ? "/es" : "";
  const href = `${prefix}/made-with-ethos?ref=watermark${slug ? `&template=${encodeURIComponent(slug)}` : ""}`;
  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener"
      className={cn(
        "z-40 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-[11px] font-medium whitespace-nowrap text-white/85 shadow-sm backdrop-blur-md transition-colors hover:bg-black/55",
        inline ? "relative" : "absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2",
        // Gone at once when a button turns up under it (out of reach and out of the tab order too), back
        // gently once its spot is clear.
        standDown ? "invisible opacity-0" : !inline && "transition-[opacity,background-color] duration-300",
        className,
      )}
    >
      <LogoMark className="size-3.5" />
      {BRAND.watermark[locale]}
    </a>
  );
}

/**
 * How long the badge's spot has to stay clear before it comes back, so it doesn't blink: a balloon bobbing in
 * and out of the spot (Balloons), a button gone for a moment between two steps (The Council's verdict, before
 * its stamp). It also waits this long at the start, so it comes in once the gift has settled rather than
 * just before the gift's first button.
 */
const SETTLE_MS = 1500;

/**
 * Whether the floating badge should stand down: one of the gift's own controls is under it, or was a
 * moment ago (SETTLE_MS). It starts out as "yes", so the badge never shows over a button that was there
 * first.
 *
 * In sight, it looks under itself every frame, before the frame is drawn, since a CSS animation, a
 * scroll or a resize moves a button in without a word; and at once, before anything else runs, whenever
 * the gift's markup changes (a button mounted, restyled). Standing down, it looks twice a second, which
 * is plenty to see its spot has cleared. It hides itself on the spot rather than at React's next render,
 * so no frame ever shows a button under it.
 */
function useControlUnder(ref: RefObject<HTMLElement | null>, active: boolean): boolean {
  const [under, setUnder] = useState(active);
  useEffect(() => {
    const badge = ref.current;
    const gift = badge?.closest<HTMLElement>(".gift-root");
    if (!active || !badge || !gift) return;
    // As it is drawn now: hidden on its first render, but an effect that runs again finds it as it left it.
    let shown = badge.style.visibility !== "hidden" && !badge.classList.contains("invisible");
    let blockedAt = shown ? -Infinity : performance.now();
    let frame = 0;
    let wake = 0;
    const look = () => {
      const now = performance.now();
      // Standing down only hides it, so its box is where it would be.
      const spot = badge.getBoundingClientRect();
      const area = gift.getBoundingClientRect();
      if ([...gift.querySelectorAll(GIFT_CONTROLS)].some((el) => !badge.contains(el) && coversControl(spot, el.getBoundingClientRect(), area) && seen(el))) blockedAt = now;
      const show = now - blockedAt >= SETTLE_MS;
      if (show === shown) return;
      shown = show;
      // The class (`invisible`, then a fade back in) follows with React's render.
      badge.style.visibility = show ? "" : "hidden";
      setUnder(!show);
    };
    const tick = () => {
      look();
      if (shown) frame = requestAnimationFrame(tick);
      else wake = window.setTimeout(tick, 500);
    };
    const changes = new MutationObserver(() => {
      if (shown) look();
    });
    changes.observe(gift, { subtree: true, childList: true, attributes: true });
    tick();
    return () => {
      changes.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(wake);
    };
  }, [ref, active]);
  return under;
}

/**
 * Whether a control can be seen: laid out, not `visibility: hidden` and not faded to nothing (itself or
 * anything it sits in). One fading in is seen from its first frame above zero, and the badge looks every
 * frame while it is in sight.
 */
function seen(el: Element): boolean {
  // Both spellings of the options (the first pair is the older one). A browser without checkVisibility
  // counts everything laid out, which can only make the badge stand down more, never cover a button.
  return el.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true }) ?? true;
}
