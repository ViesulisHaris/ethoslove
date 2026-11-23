"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { GiftLocale } from "@/lib/gift/schema";
import { BRAND } from "@/config/brand";
import { LogoMark } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics/track";
import { WATERMARK_REF, madeWithEthosHref } from "@/lib/attribution/recipient";
import { GIFT_CONTROLS, coversControl } from "./watermark-spot";

/**
 * Free-tier footer. Deliberately small and tasteful — it is the viral hook, not an ad.
 *
 * It opens a page made for whoever taps it (/made-with-ethos): they have just been given one and are
 * curious, not ready to pay, so it starts with making one back for free, the gift's own template
 * first among its kind, and never goes straight to a checkout. Gifts carry no app context, so the
 * language prefix is the gift's own, the same as its "send one back". Its address carries the
 * template and never the gift, and the page it opens is told only the site's name as where the tap
 * came from (next.config.ts: a gift page sends no more than its origin as a referrer).
 *
 * It floats at the foot of the gift, except on the end screen, which carries it in its own flow
 * (`inline`) so it never lands on top of the buttons there. Floating, it never lands on any other
 * button either: while one of the gift's controls is under it, it stands down (./watermark-spot.ts).
 *
 * On the end screen it is the maker's mark at the foot of the gift, and reads as two quiet lines:
 * the badge, and under it what Ethos makes (BRAND.categoryLine), in the end screen's own `tone`.
 * One link, a thumb tall. The floating badge stays the one line it was: its size is tuned.
 *
 * `counted`: on a real gift page a tap is counted (the template, nothing else). A demo shows the
 * badge too, and a tap there is a visitor's, not a recipient's.
 */
export function Watermark({
  locale,
  slug,
  inline = false,
  tone = "dark",
  counted = false,
  className,
}: {
  locale: GiftLocale;
  slug?: string;
  inline?: boolean;
  tone?: "light" | "dark";
  counted?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const standDown = useControlUnder(ref, !inline);
  const href = madeWithEthosHref(locale, WATERMARK_REF, slug);
  // Not counted with no connection: the new tab opens on the browser's error page, not on ours.
  const onClick = counted
    ? () => {
        if (navigator.onLine !== false) track("watermark_clicked", { template: slug ?? null });
      }
    : undefined;
  if (inline)
    return (
      <a
        ref={ref}
        href={href}
        target="_blank"
        rel="noopener"
        onClick={onClick}
        // Its keyboard ring stands off both lines, and on a dark end screen it is a light one (the
        // site's own is a dark plum, lost on a dark gift).
        className={cn(
          "group/mark relative z-40 flex min-h-11 flex-col items-center justify-center gap-1.5 rounded-2xl px-3 focus-visible:outline-offset-4 active:opacity-70",
          tone === "dark" && "focus-visible:outline-white/60",
          className,
        )}
      >
        {/* On a light end screen the pill is darker: white on black at 40% over paper was under 3:1. */}
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium whitespace-nowrap shadow-sm backdrop-blur-md transition-colors",
            tone === "light" ? "bg-black/65 text-white group-hover/mark:bg-black/75" : "bg-black/40 text-white/85 group-hover/mark:bg-black/55",
          )}
        >
          <LogoMark className="size-3.5" />
          {BRAND.watermark[locale]}
        </span>
        {/* Small type, so black at 60% on a light end screen: about 5:1 on paper or white (50% was under the 4.5:1 small text needs). */}
        <span className={cn("text-[10px] leading-none tracking-[0.04em] whitespace-nowrap", tone === "dark" ? "text-white/55" : "text-black/60")}>
          {BRAND.categoryLine[locale]}
        </span>
      </a>
    );
  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener"
      onClick={onClick}
      className={cn(
        "z-40 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-[11px] font-medium whitespace-nowrap text-white/85 shadow-sm backdrop-blur-md transition-colors hover:bg-black/55",
        "absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2",
        // Gone at once when a button turns up under it (out of reach and out of the tab order too), back
        // gently once its spot is clear.
        standDown ? "invisible opacity-0" : "transition-[opacity,background-color] duration-300",
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

/** Besides its tag, what makes an element one of the gift's controls (GIFT_CONTROLS). */
const CONTROL_ATTRIBUTES = ["href", "role", "tabindex"];

/**
 * Whether the floating badge should stand down: one of the gift's own controls is under it, or was a
 * moment ago (SETTLE_MS). It starts out as "yes", so the badge never shows over a button that was there
 * first.
 *
 * In sight, it looks under itself every frame, before the frame is drawn, since a CSS animation, a
 * scroll or a resize moves a button in without a word; and at once whenever a control is mounted or
 * made one. Standing down, it looks twice a second, which is plenty to see its spot has cleared. It
 * hides itself on the spot rather than at React's next render, so a button is never under it for more
 * than a frame.
 *
 * A look has to be cheap, as it runs every frame of the gift: it measures the controls it already
 * found, and looks them up again only when one is mounted or made one, never on a mere restyle, since
 * an animated gift restyles every frame. Searching the whole gift every frame, and again on every
 * restyle, cost Bouquet a fifth of its frames with the CPU slowed 4× (18 Nov 2026). And a gift with
 * no box at all is out of sight (the editor keeps a played gift mounted behind its form): the badge
 * stands down there and only looks twice a second; looking every frame there had tripled what the
 * hidden Bouquet cost.
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
    // The gift's controls, found again only when the markup brings a new one (below). One taken out of the
    // gift since has no box, so it can't be under the badge.
    let controls: Element[] | null = null;
    const look = () => {
      const now = performance.now();
      // Standing down only hides it, so its box is where it would be. No box: the gift is out of sight.
      const spot = badge.getBoundingClientRect();
      if (spot.width === 0 && spot.height === 0) blockedAt = now;
      else {
        const area = gift.getBoundingClientRect();
        controls ??= [...gift.querySelectorAll(GIFT_CONTROLS)].filter((el) => !badge.contains(el));
        if (controls.some((el) => coversControl(spot, el.getBoundingClientRect(), area) && seen(el))) blockedAt = now;
      }
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
    const changes = new MutationObserver((records) => {
      const anew = records.some(
        (r) => r.type === "attributes" || [...r.addedNodes].some((n) => n instanceof Element && (n.matches(GIFT_CONTROLS) || n.querySelector(GIFT_CONTROLS) !== null)),
      );
      if (!anew) return;
      controls = null;
      if (shown) look();
    });
    changes.observe(gift, { subtree: true, childList: true, attributes: true, attributeFilter: CONTROL_ATTRIBUTES });
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
