"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CircleQuestionMark } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { env } from "@/lib/env";
import { hidesConsentBanner } from "@/lib/analytics/consent";
import { useConsent } from "@/lib/analytics/use-consent";
import { useScrolledPast } from "@/hooks/use-scrolled-past";
import type { TourRoom } from "@/lib/tour/room";
import { playableSteps, TOURS, type TourStep } from "@/lib/tour/steps";
import { hasSeenTour, markTourSeen } from "@/lib/tour/seen";
import { findTarget, isCovered, isTyping, otherDialogOpen } from "@/lib/tour/dom";
import { Tour } from "./tour";

const POLL_MS = 400;
/** Nobody has touched, typed or scrolled for this long: a tour that opens mid-gesture is in the way. */
const QUIET_MS = 1500;
/** And the room has stayed ready this long, so the list it points into has stopped arriving. */
const SETTLE_MS = 600;
/** Ready this long and never a calm moment: they're busy, so it waits for their next visit. */
const PATIENCE_MS = 30_000;
/** Past this much scroll the replay button tucks away; it comes back at the top, or when focused. */
const TUCK_AFTER_PX = 40;
/** Under the marketing header, and under the editor's bar (Tailwind can't compile `env()` inside an arbitrary `calc()`). */
const BUTTON_TOP = { marketing: "calc(var(--header-h, 76px) + 8px)", editor: "calc(3.5rem + env(safe-area-inset-top, 0px) + 8px)" };

const INPUTS = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;

/**
 * `id` keys the tour. A replay started while the last one is still fading out is a new tour from
 * step one, not the old one (and its step index) brought back by AnimatePresence.
 */
type Session = { id: number; steps: TourStep[] };

/** What the tour would light first. */
function leadTarget(steps: readonly TourStep[]): HTMLElement | null {
  for (const step of steps) {
    const el = findTarget(step.targets);
    if (el) return el;
  }
  return null;
}

const subscribeGiftRunning = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-gift-running"] });
  return () => observer.disconnect();
};

/**
 * The editor's phone preview is a gift running full-screen and says so on <html>. A floating button
 * has no business on top of a gift, the same rule the consent banner follows.
 */
function useGiftRunning(): boolean {
  return useSyncExternalStore(
    subscribeGiftRunning,
    () => document.documentElement.dataset.giftRunning === "true",
    () => false,
  );
}

/**
 * One room's tour: it opens by itself on the first visit, once the room has loaded and the visitor
 * isn't in the middle of something, and a small "How it works" button replays it any time.
 */
export function TourRoot({ room, pathname }: { room: TourRoom; pathname: string }) {
  const t = useTranslations("tour");
  const config = TOURS[room];
  const reduced = useReducedMotion() ?? false;
  const consent = useConsent();
  // The consent strip asks first, and the tour never sits over it: one thing at a time.
  const bannerUp = consent === null && Boolean(env.clarityId) && !hidesConsentBanner(pathname);
  const giftRunning = useGiftRunning();
  const tucked = useScrolledPast(TUCK_AFTER_PX);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const help = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const sessions = useRef(0);
  const bannerUpRef = useRef(bannerUp);
  useEffect(() => {
    bannerUpRef.current = bannerUp;
  });

  const begin = useCallback(
    (from: HTMLElement | null): boolean => {
      const steps = playableSteps(config.steps, (step) => findTarget(step.targets) !== null);
      if (steps.length === 0) return false;
      returnTo.current = from;
      markTourSeen(room);
      sessions.current += 1;
      setSession({ id: sessions.current, steps });
      return true;
    },
    [config, room],
  );

  const close = useCallback(() => {
    setSession(null);
    const back = returnTo.current;
    returnTo.current = null;
    if (back?.isConnected) back.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    // Automated browsers (the e2e suite, Lighthouse under Puppeteer) would find every first visit
    // covered by the tour. It is for people; its own spec switches this off to test it.
    const robot = navigator.webdriver === true;
    let lastInput = 0;
    let waited = 0;
    let calmSince = 0;
    const onInput = () => {
      lastInput = performance.now();
    };
    for (const type of INPUTS) window.addEventListener(type, onInput, { passive: true, capture: true });

    const timer = window.setInterval(() => {
      const isReady = findTarget(config.ready) !== null;
      if (isReady) setReady(true);
      const wanted = !robot && !hasSeenTour(room) && waited <= PATIENCE_MS;
      if (!wanted) {
        if (isReady) stop();
        return;
      }
      // Patience only runs down while the tour could have opened: not while the room is still
      // loading (a first visit with no town yet), and not while the cookie question is up.
      if (isReady && !bannerUpRef.current) waited += POLL_MS;
      const now = performance.now();
      const calm = isReady && !bannerUpRef.current && document.visibilityState === "visible" && now - lastInput >= QUIET_MS && !isTyping() && !otherDialogOpen() && !isCovered(leadTarget(config.steps));
      if (!calm) {
        calmSince = 0;
        return;
      }
      if (!calmSince) calmSince = now;
      if (now - calmSince < SETTLE_MS) return;
      const active = document.activeElement;
      if (begin(active instanceof HTMLElement && active !== document.body ? active : null)) stop();
    }, POLL_MS);

    function stop() {
      window.clearInterval(timer);
      for (const type of INPUTS) window.removeEventListener(type, onInput, { capture: true });
    }
    return stop;
  }, [config, room, begin]);

  // Whether a replay would find anything to point at now. A room's handles can go while the page
  // stays: once a game starts, its lobby (and the handles with it) gives way to the game, where
  // the button sat over the score in the top corner and did nothing when pressed.
  const [canPlay, setCanPlay] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setCanPlay(playableSteps(config.steps, (step) => findTarget(step.targets) !== null).length > 0), POLL_MS);
    return () => window.clearInterval(timer);
  }, [config]);

  // Kept while a tour is running, so focus has the button to come back to when it ends.
  const showButton = ready && (canPlay || session !== null) && !bannerUp && !giftRunning;

  return createPortal(
    <>
      <AnimatePresence>
        {showButton ? (
          <motion.div
            key="help"
            data-tour-ui=""
            className="fixed right-3 z-[45] sm:right-5"
            style={{ top: BUTTON_TOP[room === "editor" ? "editor" : "marketing"] }}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              ref={help}
              type="button"
              onClick={() => begin(help.current)}
              className={cn(
                // 36px tall to stay light; the pseudo-element carries the touch target past 44.
                "glass-petal relative inline-flex h-9 items-center gap-1.5 rounded-full pr-3.5 pl-2.5 text-[13px] font-semibold text-forest transition-[opacity,translate] duration-200 after:absolute after:-inset-1.5 after:rounded-full hover:text-rose-deep motion-reduce:transition-none",
                // Tucked away, not removed: a keyboard can still reach it, and focus comes back to it after a replay.
                tucked && "pointer-events-none -translate-y-1 opacity-0 focus:pointer-events-auto focus:translate-y-0 focus:opacity-100",
              )}
            >
              <CircleQuestionMark aria-hidden="true" className="size-4 text-rose-deep" />
              {t("open")}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>{session ? <Tour key={session.id} room={room} steps={session.steps} topInset={config.topInset} onClose={close} /> : null}</AnimatePresence>
    </>,
    document.body,
  );
}
