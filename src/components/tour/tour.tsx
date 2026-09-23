"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { motion, useIsPresent, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics/track";
import type { TourRoom } from "@/lib/tour/room";
import { canShow, stepAfter, type TourStep } from "@/lib/tour/steps";
import { findTarget, isPinned, safeInsets, toBox } from "@/lib/tour/dom";
import { cardWidth, glide, placeCard, scrollBand, scrollNeeded, spotlight, spotRadius, type Box, type Insets } from "@/lib/tour/geometry";

/** How quickly the spotlight and the card catch a moving target up: the time constant of the glide. */
const FOLLOW_MS = 90;
/** Longest frame the glide will account for, so a tab coming back from the background doesn't lurch. */
const MAX_FRAME_MS = 64;
/** The page behind, dimmed with the site's wine rather than grey. */
const SCRIM = "0 0 0 200vmax rgba(42, 15, 31, 0.58)";
/** A white edge and a rose halo round what is lit, so it reads on the pale pages and the wine ones. */
const RING = "0 0 0 2px rgba(255, 255, 255, 0.95), 0 0 0 7px rgba(214, 51, 108, 0.3)";
const EASE = [0.22, 1, 0.36, 1] as const;

type Props = { room: TourRoom; steps: readonly TourStep[]; topInset: number; onClose: () => void };

const viewport = () => ({ width: document.documentElement.clientWidth, height: window.innerHeight });
const onScreen = (step: TourStep) => findTarget(step.targets) !== null;
const showable = (step: TourStep) => canShow(step, onScreen);

/**
 * The coach marks: the page dimmed, one thing on it lit, and a card that says what it is for.
 *
 * The spotlight and the card follow their target every frame, straight from the DOM, without a
 * React render: the page scrolls under them, a list reflows, the phone rotates, and they stay put
 * on what they point at. They glide there rather than jump, unless motion is reduced.
 */
export function Tour({ room, steps, topInset, onClose }: Props) {
  const t = useTranslations("tour");
  const reduced = useReducedMotion() ?? false;
  const present = useIsPresent();
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const isLast = index === steps.length - 1;
  const titleId = useId();
  const bodyId = useId();

  const spot = useRef<HTMLDivElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const target = useRef<HTMLElement | null>(null);
  /** The target's own corner radius, read once per step rather than every frame. */
  const corner = useRef(0);
  const insets = useRef<Insets>({ top: 0, bottom: 0 });

  const go = useCallback(
    (dir: 1 | -1) => {
      const to = stepAfter(steps, index, dir, showable);
      if (to !== -1) setIndex(to);
      else if (dir === 1) onClose();
    },
    [steps, index, onClose],
  );
  const skip = useCallback(() => {
    track("tour_skipped", { room, step: step.id });
    onClose();
  }, [room, step.id, onClose]);

  useEffect(() => {
    track("tour_step", { room, step: step.id });
  }, [room, step.id]);

  // Before the first paint: the card has to know its width to know its height, and the height
  // decides how far to scroll.
  useLayoutEffect(() => {
    insets.current = safeInsets();
  }, []);

  // Each step finds its target afresh (the page may have changed under the last one) and brings it
  // into the part of the screen the card leaves free. Pinned things (a docked button, the editor's
  // bar) are already on screen and scrolling wouldn't move them.
  useLayoutEffect(() => {
    const el = findTarget(step.targets);
    target.current = el;
    corner.current = el ? parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0 : 0;
    if (!el || isPinned(el)) return;
    const vp = viewport();
    if (holder.current) holder.current.style.width = `${cardWidth(vp)}px`;
    const band = scrollBand(vp, topInset, card.current?.offsetHeight ?? 0, insets.current);
    const delta = scrollNeeded(toBox(el.getBoundingClientRect()), band);
    if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: reduced ? "instant" : "smooth" });
  }, [step, topInset, reduced]);

  useLayoutEffect(() => {
    let frame = 0;
    let then = performance.now();
    let shownSpot: Box | null = null;
    let shownCard: Box | null = null;
    let shownWidth = 0;
    let lit: boolean | null = null;

    const draw = (now: number) => {
      const dt = Math.min(MAX_FRAME_MS, Math.max(0, now - then));
      then = now;
      const k = reduced ? 1 : 1 - Math.exp(-dt / FOLLOW_MS);
      const vp = viewport();
      const h = holder.current;
      const c = card.current;
      // The card's height depends on its width, so a new width (a resize, a rotation) goes in
      // first. Otherwise every read comes before every write: one layout a frame, not one per write.
      const width = cardWidth(vp);
      if (h && width !== shownWidth) {
        h.style.width = `${width}px`;
        shownWidth = width;
      }
      const el = target.current?.isConnected ? target.current : null;
      const goal = el ? spotlight(toBox(el.getBoundingClientRect()), vp) : null;
      const cardHeight = c?.offsetHeight ?? 0;

      // With nothing to light, the hole shrinks to nothing in the middle and the scrim is whole.
      const spotGoal = goal ?? { top: vp.height / 2, left: vp.width / 2, width: 0, height: 0 };
      shownSpot = shownSpot ? glide(shownSpot, spotGoal, k) : spotGoal;
      const s = spot.current;
      if (s) {
        s.style.transform = `translate3d(${shownSpot.left}px, ${shownSpot.top}px, 0)`;
        s.style.width = `${shownSpot.width}px`;
        s.style.height = `${shownSpot.height}px`;
        s.style.borderRadius = `${spotRadius(corner.current, shownSpot.height)}px`;
        if (lit !== Boolean(goal)) {
          lit = Boolean(goal);
          s.style.boxShadow = lit ? `${RING}, ${SCRIM}` : SCRIM;
          s.dataset.lit = String(lit);
        }
      }

      if (h && c) {
        const place = placeCard(goal, cardHeight, vp, insets.current);
        const to = { top: place.top, left: place.left, width: 0, height: 0 };
        shownCard = shownCard ? glide(shownCard, to, k) : to;
        h.style.transform = `translate3d(${shownCard.left}px, ${shownCard.top}px, 0)`;
      }
      frame = requestAnimationFrame(draw);
    };

    draw(then);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  // Focus starts on "Next" and stays in the card; if the button it was on has gone (Back, on the
  // first step), it goes back to "Next".
  useEffect(() => {
    if (!card.current?.contains(document.activeElement)) next.current?.focus({ preventScroll: true });
  }, [index]);

  const keys = useRef({ go, skip, present });
  useEffect(() => {
    keys.current = { go, skip, present };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { go, skip, present } = keys.current;
      const box = card.current;
      // Fading out: the page has its keyboard back.
      if (!present || !box) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        skip();
        return;
      }
      const inside = box.contains(document.activeElement);
      if (e.key === "Tab") {
        const items = [...box.querySelectorAll<HTMLElement>("button:not([disabled])")];
        const first = items[0];
        const final = items[items.length - 1];
        if (!first || !final) return;
        if (!inside || (e.shiftKey && document.activeElement === first) || (!e.shiftKey && document.activeElement === final)) {
          e.preventDefault();
          (e.shiftKey && inside ? final : first).focus();
        }
        return;
      }
      if (!inside) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
    };
    // Capture, so Escape closes the tour and not whatever the page would have closed with it.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const counter = t("step", { n: index + 1, total: steps.length });

  return (
    <motion.div
      // Catches every tap meant for the page underneath: the tour points at things, it doesn't press them.
      className={cn("fixed inset-0 z-[100] overflow-hidden", !present && "pointer-events-none")}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.22, ease: EASE }}
    >
      <div ref={spot} aria-hidden="true" className="group pointer-events-none absolute top-0 left-0" style={{ boxShadow: SCRIM }}>
        {reduced ? null : (
          <motion.span
            className="absolute -inset-1.5 rounded-[inherit] ring-2 ring-rose-tint group-data-[lit=false]:hidden"
            animate={{ opacity: [0.9, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </div>

      <div ref={holder} className="absolute top-0 left-0">
        <motion.div
          ref={card}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          data-tour-card=""
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}
          className="relative overflow-hidden rounded-[26px] bg-white p-5 text-forest shadow-[0_1px_2px_rgba(60,20,40,0.08),0_30px_70px_-26px_rgba(42,15,31,0.6)] ring-1 ring-forest/5 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <p aria-hidden="true" className="text-[12px] font-semibold tracking-[0.18em] text-rose-deep uppercase tabular-nums">
              {counter}
            </p>
            {isLast ? null : (
              <button type="button" onClick={skip} aria-label={t("skipLabel")} className="-my-2 -mr-2 h-11 rounded-full px-3 text-[13.5px] font-semibold text-forest/55 transition-colors hover:bg-forest/5 hover:text-forest outline-none focus-visible:ring-2 focus-visible:ring-rose/45 focus-visible:ring-offset-2">
                {t("skip")}
              </button>
            )}
          </div>

          {/* One live region for the whole tour, so each new step is read out as it arrives. */}
          <div aria-live="polite" aria-atomic="true">
            <span className="sr-only">{counter}</span>
            <motion.div key={step.id} initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: EASE }}>
              <h2 id={titleId} className="mt-1.5 font-display text-[23px] leading-[1.12] text-balance text-forest">
                {t(`${room}.${step.id}.title`)}
              </h2>
              <p id={bodyId} className="mt-2 text-[15px] leading-relaxed text-forest/70">
                {t(`${room}.${step.id}.body`)}
              </p>
            </motion.div>
          </div>

          {/* Wraps rather than squeezes: at 360px the Spanish "Atrás" and "Siguiente" beside six dots
              leave about ten pixels spare, and a phone set to larger text would otherwise push the way
              forward out of the card. */}
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
              {steps.map((s, i) => (
                <span key={s.id} className={cn("h-1.5 shrink-0 rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none", i === index ? "w-5 bg-rose" : i < index ? "w-1.5 bg-rose/40" : "w-1.5 bg-forest/15")} />
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1">
              {index > 0 ? (
                <button type="button" onClick={() => go(-1)} className="h-11 rounded-full px-4 text-[14.5px] font-semibold text-forest/70 transition-colors hover:bg-forest/5 hover:text-forest outline-none focus-visible:ring-2 focus-visible:ring-rose/45 focus-visible:ring-offset-2">
                  {t("back")}
                </button>
              ) : null}
              <button ref={next} type="button" onClick={() => go(1)} className="btn-rose h-11 rounded-full px-6 text-[14.5px] font-semibold transition-[filter] hover:brightness-110 outline-none focus-visible:ring-2 focus-visible:ring-rose/45 focus-visible:ring-offset-2">
                {isLast ? t("done") : t("next")}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
