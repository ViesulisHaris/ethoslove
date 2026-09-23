/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { ArrowUpRight, CalendarPlus, Car, MapPin, Plane, TrainFront, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { giftUnwrapSchema, type GiftData, type GiftLocale, type GiftUnwrap, type GiftUnwrapStop } from "@/lib/gift/schema";
import { GROUP_GLYPHS } from "@/lib/dates/glyphs";
import { cn } from "@/lib/utils";
import { Confetti } from "./Confetti";
import { isGiftMuted } from "./hooks/use-gift-audio";
import { giftString } from "./i18n";
import { guard, noise, tone } from "./synth";
import { luminance, mix } from "./theme";
import { kindLabel, stopArt, tripDates, tripNights, unwrapDay, unwrapIcs } from "./unwrap";

/**
 * "A surprise inside": a present under the gift's last words, with a date or a trip in it. Closed,
 * it sits in the gift's own colours and wiggles now and then; a tap (or Enter) unties the bow,
 * slides the ribbon off, lifts the lid and drops the paper, and the plan rises out of the box.
 *
 * Every moving part is an HTML box with its own small drawing, moved by transform and opacity only,
 * so the whole unwrapping runs on the compositor on a phone. Reduced motion opens it at once.
 */

type Phase = "closed" | "opening" | "open";

/** When each part goes, in seconds from the tap; the card is timed to rise as the lid clears it. */
const T = { bow: 0, ribbon: 0.14, lid: 0.3, paper: 0.52, card: 0.42, confetti: 380, done: 1300 } as const;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN = [0.55, 0, 0.8, 0.4] as const;

/** Paper, pattern and satin in the gift's accent. A pale accent gets a deep ribbon; any other, a cream one. */
function presentColors(accent: string) {
  const light = luminance(accent) > 0.42;
  return {
    paper: accent,
    paperDeep: mix(accent, "#000000", 0.16),
    dot: light ? mix(accent, "#000000", 0.14) : mix(accent, "#FFFFFF", 0.3),
    ribbon: light ? mix(accent, "#000000", 0.42) : mix(accent, "#FFFFFF", 0.9),
    ribbonShade: light ? mix(accent, "#000000", 0.58) : mix(accent, "#FFFFFF", 0.62),
    confetti: [accent, mix(accent, "#FFFFFF", 0.5), "#F4C95D", mix(accent, "#000000", 0.25), "#FFF6EC"],
  };
}

const presentVars = (colors: ReturnType<typeof presentColors>) =>
  ({
    "--paper": colors.paper,
    "--paper-deep": colors.paperDeep,
    "--dot": colors.dot,
    "--ribbon": colors.ribbon,
    "--ribbon-shade": colors.ribbonShade,
  }) as CSSProperties;

/** Room left above "One more thing…" when it is brought up, for a template's own buttons in the corner. */
const SCROLL_GAP_PX = 48;

/**
 * Scrolls the one container the recipient scrolls, and nothing else. scrollIntoView would do it,
 * but it also scrolls every overflow-hidden box on the way up, and a template's frame is one of
 * those: the whole gift slid up inside its window and left a black band under it.
 */
function scrollToTop(el: HTMLElement, behavior: ScrollBehavior) {
  for (let box = el.parentElement; box; box = box.parentElement) {
    const { overflowY } = getComputedStyle(box);
    if ((overflowY === "auto" || overflowY === "scroll") && box.scrollHeight > box.clientHeight) {
      const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - SCROLL_GAP_PX;
      box.scrollTo({ top: Math.max(0, top), behavior });
      return;
    }
  }
}

/** A rustle of paper and three soft notes, only if they haven't muted the gift. */
export function playUnwrap() {
  guard(isGiftMuted(), (c, t) => {
    noise(c, t, 0.32, 0.05, "bandpass", 2400);
    [880, 1108.73, 1318.51].forEach((f, i) => tone(c, "sine", f, f, t + 0.26 + i * 0.09, 0.9, 0.045));
  });
}

export function UnwrapGift({
  unwrap: raw,
  locale,
  sender,
  accent,
  dark,
  autoOpen = false,
  className,
}: {
  unwrap: unknown;
  locale: GiftLocale;
  sender: string;
  accent: string;
  dark: boolean;
  /** Unwrap straight away: the editor's peek, where the tap that opened it was the tap on the present. */
  autoOpen?: boolean;
  className?: string;
}) {
  // Checked again here, not only when it was saved: an old or hand-edited draft must never make a
  // gift load a picture from anywhere the allow-list doesn't name.
  const unwrap = useMemo(() => {
    const parsed = giftUnwrapSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }, [raw]);
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(autoOpen ? "opening" : "closed");
  const [burst, setBurst] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const colors = useMemo(() => presentColors(accent), [accent]);

  // The unwrapping runs on a clock from the tap: confetti as the lid clears, then the plan is simply
  // there. Reduced motion skips the clock and shows it at once.
  useEffect(() => {
    if (phase !== "opening") return;
    const timers = reduce ? [window.setTimeout(() => setPhase("open"), 0)] : [window.setTimeout(() => setBurst((b) => b + 1), T.confetti), window.setTimeout(() => setPhase("open"), T.done)];
    const frame = requestAnimationFrame(() => {
      // The present is usually tapped low on the screen and the plan is taller than what is left
      // under it: bring it up as the bow unties, so the card rises where it can be seen. After the
      // card is in the page, not on the tap: until then there is nothing below to scroll to.
      if (root.current) scrollToTop(root.current, reduce ? "auto" : "smooth");
      // To the plan, for a screen reader, without a second scroll fighting the first.
      heading.current?.focus({ preventScroll: true });
    });
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      cancelAnimationFrame(frame);
    };
  }, [phase, reduce]);

  if (!unwrap) return null;

  const open = () => {
    if (phase !== "closed") return;
    playUnwrap();
    setPhase("opening");
  };

  const vars = presentVars(colors);

  return (
    <div ref={root} className={cn("relative flex w-full flex-col items-center", className)} data-testid="unwrap" data-phase={phase}>
      <p className="text-[1.45rem] leading-tight italic" style={{ fontFamily: "var(--gift-font-display)" }}>
        {giftString(locale, "unwrapOneMore")}
      </p>

      {phase === "closed" ? (
        <>
          <motion.button
            type="button"
            onClick={open}
            aria-label={giftString(locale, "unwrapLabel", { sender })}
            whileHover={reduce ? undefined : { scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            className="relative mt-3 size-[min(46cqw,176px)] rounded-[32px] outline-offset-4 [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-[var(--gift-accent)]"
            data-testid="unwrap-present"
          >
            <Present vars={vars} phase="closed" reduce={Boolean(reduce)} />
          </motion.button>
          <p className={cn("mt-1 text-sm font-medium", dark ? "text-white/70" : "text-black/55")}>{giftString(locale, "unwrapTap")}</p>
        </>
      ) : (
        // A little wider than the end screen's column, which was drawn for a line of text: the
        // itinerary needs the room, and a template's paper card still leaves a margin around it.
        // Same margin as the button it replaces, so the present coming apart starts exactly where it was tapped.
        <div className="relative mt-3 w-[calc(100%+1.5rem)] max-w-[24rem]">
          <motion.div
            className="@container"
            // It grows out of the middle of the box, behind the paper as that falls away.
            initial={reduce ? false : { opacity: 0, y: 36, scale: 0.32 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: T.card, type: "spring", stiffness: 110, damping: 16, mass: 0.9, opacity: { delay: T.card, duration: 0.2 } }}
            style={{ transformOrigin: "50% 90px" }}
          >
            {unwrap.kind === "trip" ? (
              <TripCard unwrap={unwrap} locale={locale} dark={dark} headingRef={heading} reduce={Boolean(reduce)} />
            ) : (
              <DateCard unwrap={unwrap} locale={locale} dark={dark} headingRef={heading} reduce={Boolean(reduce)} />
            )}
          </motion.div>
          {phase === "opening" && !reduce ? (
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
              <div className="relative size-[min(46cqw,176px)]">
                <Present vars={vars} phase="opening" reduce={false} />
              </div>
            </div>
          ) : null}
          <div aria-hidden="true" className="pointer-events-none absolute top-0 left-1/2 z-20 h-[480px] w-[min(520px,100cqw)] -translate-x-1/2 -translate-y-[38%]">
            <Confetti burst={burst} colors={colors.confetti} origin={{ x: 0.5, y: 0.5 }} count={110} className="absolute inset-0" />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The editor's still frame never reaches the end screen, so there the present waits in a corner
 * instead: the sender can see it is in there, and a tap unwraps it over the frame, as it will open
 * for the other person at the end.
 */
export function UnwrapPeek({ data }: { data: GiftData }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const colors = useMemo(() => presentColors(data.accentColor), [data.accentColor]);
  const { locale } = data;
  // Back to the present it was opened from, so a keyboard is not dropped at the top of the page.
  const close = () => {
    setOpen(false);
    button.current?.focus({ preventScroll: true });
  };
  return (
    <>
      <motion.button
        ref={button}
        type="button"
        onClick={() => {
          playUnwrap();
          setOpen(true);
        }}
        initial={reduce ? false : { opacity: 0, y: 16, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 18 }}
        whileTap={{ scale: 0.95 }}
        aria-label={giftString(locale, "unwrapLabel", { sender: data.senderName })}
        // A small round corner piece: most templates keep their own button along the bottom, centred.
        className="absolute right-3 bottom-4 z-40 grid size-14 place-items-center rounded-full bg-[#1c1216]/65 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/15 backdrop-blur-md [-webkit-tap-highlight-color:transparent]"
        data-testid="unwrap-peek"
      >
        <span className="relative block size-11">
          <Present vars={presentVars(colors)} phase="closed" reduce={Boolean(reduce)} small />
        </span>
        {/* Says what it is for a few seconds, then gets out of the way of the gift behind it. */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-[calc(100%+0.5rem)] -translate-y-1/2 rounded-full bg-[#1c1216]/75 px-3 py-1.5 text-[12.5px] leading-none font-semibold whitespace-nowrap text-white shadow-lg backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ delay: 0.9, duration: 5, times: [0, 0.08, 0.85, 1] }}
        >
          {giftString(locale, "unwrapOneMore")}
        </motion.span>
      </motion.button>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="unwrap-peek"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-[60] bg-[#140c10]/85 text-white backdrop-blur-md"
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
            }}
            data-testid="unwrap-peek-open"
          >
            <div className="absolute inset-0 overflow-y-auto overscroll-contain">
              <div className="flex min-h-full flex-col items-center justify-center px-5 pt-14 pb-10">
                <UnwrapGift unwrap={data.unwrap} locale={locale} sender={data.senderName} accent={data.accentColor} dark autoOpen />
              </div>
            </div>
            <button type="button" onClick={close} aria-label={giftString(locale, "unwrapClose")} className="absolute top-3 right-3 grid size-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20">
              <X className="size-5" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* The present                                                                                 */
/* ------------------------------------------------------------------------------------------ */

/**
 * Drawn on a 200-unit square: the lid from 22 to 178 across and 70 to 98 down, the box under it
 * from 30 to 170 and 92 to 184, the ribbon down the middle, the bow's knot on the lid at (100, 70).
 * Each part is placed as a percentage of that square, so it scales with the button.
 */
const pct = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: `${x / 2}%`, top: `${y / 2}%`, width: `${w / 2}%`, height: `${h / 2}%` });

function Present({ vars, phase, reduce, small = false }: { vars: CSSProperties; phase: "closed" | "opening"; reduce: boolean; small?: boolean }) {
  const opening = phase === "opening";
  const idle = !opening && !reduce;
  // Pattern ids are global to the page: two presents (the closed one and the one coming apart) must not share one.
  const uid = useId().replace(/:/g, "");
  const go = (delay: number, duration: number, ease: readonly number[] = EASE_OUT) => ({ delay, duration, ease: ease as [number, number, number, number] });

  return (
    <motion.span
      className="absolute inset-0 block"
      style={vars}
      animate={idle ? { rotate: [0, -5, 4, -3, 2, 0], y: [0, -7, 0, -3, 0, 0] } : undefined}
      transition={idle ? { duration: 1.3, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" } : undefined}
    >
      {/* The glow it sits in, and its shadow on the ground. */}
      {small ? null : <span aria-hidden="true" className="absolute inset-[-14%] rounded-full opacity-70 blur-2xl" style={{ background: "radial-gradient(closest-side, rgba(var(--gift-accent-rgb), 0.35), transparent)" }} />}
      <motion.span
        className="absolute block rounded-[50%]"
        style={{ ...pct(34, 178, 132, 18), background: "radial-gradient(closest-side, rgba(20,8,12,0.32), transparent)" }}
        animate={opening ? { opacity: 0, scaleX: 0.6 } : undefined}
        transition={go(T.paper, 0.5)}
      />

      {/* Light from inside, as the lid comes off: behind the box's front, so only what spills over its rim shows. */}
      {opening ? (
        <motion.span
          className="absolute block rounded-full"
          style={{ ...pct(10, 2, 180, 180), background: "radial-gradient(closest-side, rgba(255,247,226,0.95), rgba(255,226,170,0.55) 38%, rgba(var(--gift-accent-rgb),0.22) 62%, transparent)" }}
          initial={{ opacity: 0, scale: 0.35 }}
          animate={{ opacity: [0, 1, 0], scale: [0.35, 1.05, 1.35] }}
          transition={{ delay: T.lid - 0.04, duration: 0.95, times: [0, 0.35, 1], ease: "easeOut" }}
        />
      ) : null}

      {/* The box, in two halves that fall apart. */}
      {(["left", "right"] as const).map((side) => (
        <motion.span
          key={side}
          className="absolute block overflow-hidden"
          style={{
            ...pct(side === "left" ? 30 : 100, 92, 70, 92),
            borderRadius: side === "left" ? "7% 0 0 9% / 7% 0 0 9%" : "0 7% 9% 0 / 0 7% 9% 0",
            transformOrigin: side === "left" ? "100% 100%" : "0% 100%",
          }}
          animate={opening ? { x: side === "left" ? "-55%" : "55%", y: "70%", rotate: side === "left" ? -24 : 24, opacity: 0 } : undefined}
          transition={go(T.paper, 0.7, EASE_IN)}
        >
          <PaperFill side={side} uid={uid} />
        </motion.span>
      ))}

      {/* The ribbon down the front, which slides off first. */}
      <motion.span
        className="absolute block"
        style={{ ...pct(90, 70, 20, 114), background: "linear-gradient(90deg, var(--ribbon-shade), var(--ribbon) 30%, color-mix(in srgb, var(--ribbon) 70%, white) 50%, var(--ribbon) 70%, var(--ribbon-shade))" }}
        animate={opening ? { y: "45%", opacity: 0 } : undefined}
        transition={go(T.ribbon, 0.42, EASE_IN)}
      />

      {/* The lid. */}
      <motion.span
        className="absolute block"
        style={{ ...pct(22, 70, 156, 28), transformOrigin: "30% 100%" }}
        animate={opening ? { y: "-330%", x: "-8%", rotate: -16, opacity: 0 } : undefined}
        transition={go(T.lid, 0.6)}
      >
        <svg viewBox="0 0 156 28" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
          <defs>
            <pattern id={`${uid}-lid-dots`} width="12" height="12" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1.7" fill="var(--dot)" />
              <circle cx="9" cy="9" r="1.7" fill="var(--dot)" />
            </pattern>
            <linearGradient id={`${uid}-lid-shade`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
              <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.16" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="156" height="28" rx="5" fill="var(--paper)" />
          <rect x="0" y="0" width="156" height="28" rx="5" fill={`url(#${uid}-lid-dots)`} />
          <rect x="0" y="0" width="156" height="28" rx="5" fill={`url(#${uid}-lid-shade)`} />
          <rect x="68" y="0" width="20" height="28" fill="var(--ribbon)" />
          <rect x="68" y="0" width="5" height="28" fill="var(--ribbon-shade)" opacity="0.55" />
        </svg>
      </motion.span>

      {/* The bow, which unties before anything else moves. */}
      <span className="absolute block" style={pct(50, 24, 100, 80)}>
        <svg viewBox="0 0 100 80" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
          <motion.g
            style={{ transformBox: "fill-box", transformOrigin: "100% 50%" }}
            animate={opening ? { rotate: -70, scale: 0.2, opacity: 0, x: -10 } : undefined}
            transition={go(T.bow, 0.36)}
          >
            <path d="M50 46 C38 30 13 14 6 27 C0 39 18 50 50 46 Z" fill="var(--ribbon)" />
            <path d="M50 46 C37 37 21 30 14 32 C20 40 34 46 50 46 Z" fill="var(--ribbon-shade)" opacity="0.8" />
            <path d="M22 24 C16 24 11 27 10 31" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" fill="none" />
          </motion.g>
          <motion.g
            style={{ transformBox: "fill-box", transformOrigin: "0% 50%" }}
            animate={opening ? { rotate: 70, scale: 0.2, opacity: 0, x: 10 } : undefined}
            transition={go(T.bow, 0.36)}
          >
            <path d="M50 46 C62 30 87 14 94 27 C100 39 82 50 50 46 Z" fill="var(--ribbon)" />
            <path d="M50 46 C63 37 79 30 86 32 C80 40 66 46 50 46 Z" fill="var(--ribbon-shade)" opacity="0.8" />
            <path d="M78 24 C84 24 89 27 90 31" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" fill="none" />
          </motion.g>
          <motion.g animate={opening ? { y: 26, opacity: 0 } : undefined} transition={go(T.bow + 0.04, 0.4, EASE_IN)}>
            <path d="M47 49 L31 74 L37 71.5 L39.5 78 L52 51 Z" fill="var(--ribbon)" />
            <path d="M53 49 L69 74 L63 71.5 L60.5 78 L48 51 Z" fill="var(--ribbon)" />
            <path d="M47 49 L31 74 L37 71.5 Z" fill="var(--ribbon-shade)" opacity="0.6" />
          </motion.g>
          <motion.rect
            x="43"
            y="39"
            width="14"
            height="14"
            rx="5"
            fill="var(--ribbon)"
            stroke="var(--ribbon-shade)"
            strokeOpacity="0.6"
            style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
            animate={opening ? { scale: 0, opacity: 0 } : undefined}
            transition={go(T.bow + 0.1, 0.25)}
          />
        </svg>
      </span>

      {/* A few sparkles while it waits. */}
      {idle && !small ? (
        <>
          {[
            { x: 8, y: 22, d: 0 },
            { x: 88, y: 14, d: 0.9 },
            { x: 94, y: 62, d: 1.7 },
          ].map((s) => (
            <motion.svg
              key={`${s.x}-${s.y}`}
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="absolute size-[11%]"
              style={{ left: `${s.x}%`, top: `${s.y}%`, color: "var(--gift-accent)" }}
              animate={{ scale: [0, 1, 0], opacity: [0, 1, 0], rotate: [0, 45, 90] }}
              transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.6, delay: s.d, ease: "easeInOut" }}
            >
              <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill="currentColor" />
            </motion.svg>
          ))}
        </>
      ) : null}
    </motion.span>
  );
}

/** One half of the box's paper: the dots, a soft light from the left, and the shade under the lid. */
function PaperFill({ side, uid }: { side: "left" | "right"; uid: string }) {
  const id = `${uid}-dots-${side}`;
  return (
    <svg viewBox="0 0 70 92" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden="true">
      <defs>
        <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse" x={side === "left" ? 0 : 2}>
          <circle cx="3" cy="3" r="1.7" fill="var(--dot)" />
          <circle cx="9" cy="9" r="1.7" fill="var(--dot)" />
        </pattern>
        <linearGradient id={`${id}-light`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity={side === "left" ? 0.16 : 0} />
          <stop offset="1" stopColor="#000" stopOpacity={side === "left" ? 0 : 0.14} />
        </linearGradient>
      </defs>
      <rect width="70" height="92" fill="var(--paper)" />
      <rect width="70" height="92" fill={`url(#${id})`} />
      <rect width="70" height="92" fill={`url(#${id}-light)`} />
      <rect width="70" height="7" fill="#000" opacity="0.14" />
    </svg>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* What was inside                                                                             */
/* ------------------------------------------------------------------------------------------ */

type CardProps = { unwrap: GiftUnwrap; locale: GiftLocale; dark: boolean; headingRef: RefObject<HTMLHeadingElement | null>; reduce: boolean };

const cardClass = (dark: boolean) =>
  cn(
    "relative w-full overflow-hidden rounded-[28px] text-left",
    dark ? "bg-[#1c1518]/92 text-white ring-1 ring-white/12 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]" : "bg-white text-[#241a1e] ring-1 ring-black/5 shadow-[0_30px_60px_-28px_rgba(60,20,35,0.45)]",
  );
const muted = (dark: boolean) => (dark ? "text-white/60" : "text-black/50");

/**
 * A stop's picture: the photograph, or the kind's picture washed in its colour with its glyph, never
 * passed off as the place. A town on a trip has no kind to draw, so it gets its initial on the
 * gift's colour, like a contact without a photo: a pin on a pale disc read as a picture that failed.
 */
function StopPhoto({ stop, className }: { stop: GiftUnwrapStop; className?: string }) {
  const [broken, setBroken] = useState<string | null>(null);
  const photo = stop.image && stop.image !== broken ? stop.image : null;
  const art = stopArt(stop);
  const initial = Array.from(stop.name.trim())[0]?.toLocaleUpperCase() ?? "";
  return (
    <span className={cn("@container relative block shrink-0 overflow-hidden", className)} style={{ background: art ? `${art.tint}33` : "var(--gift-accent-pale)" }} aria-hidden="true">
      {photo ? (
        <img src={photo} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(photo)} className="absolute inset-0 size-full object-cover" />
      ) : art ? (
        <>
          <img src={art.src} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full scale-110 object-cover opacity-60 saturate-[0.75]" />
          <span className="absolute inset-0 mix-blend-multiply" style={{ backgroundColor: art.tint, opacity: 0.42 }} />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute top-1/2 left-1/2 size-[40%] -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-[0_2px_5px_rgba(40,10,25,0.45)]">
            {GROUP_GLYPHS[art.group].map((d) => (
              <path key={d} d={d} />
            ))}
          </svg>
        </>
      ) : initial ? (
        <span
          className="absolute inset-0 grid place-items-center text-[48cqw] leading-none"
          style={{ background: "linear-gradient(140deg, var(--gift-accent-soft), var(--gift-accent) 55%, var(--gift-accent-deep))", color: "var(--gift-on-accent)", fontFamily: "var(--gift-font-display)" }}
        >
          {initial}
        </span>
      ) : (
        <MapPin className="absolute top-1/2 left-1/2 size-[42%] -translate-x-1/2 -translate-y-1/2" style={{ color: "var(--gift-accent-deep)" }} />
      )}
    </span>
  );
}

function download(ics: string, name: string) {
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const rise = (reduce: boolean, i: number) => (reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: T.card + 0.2 + i * 0.08, duration: 0.5, ease: EASE_OUT } });

function DateCard({ unwrap, locale, dark, headingRef, reduce }: CardProps) {
  const day = unwrapDay(unwrap, locale);
  const ics = unwrap.date ? unwrapIcs(unwrap, locale) : null;
  const subtitle = [unwrap.city, unwrap.title !== unwrap.city ? unwrap.title : null].filter(Boolean).join(" · ");
  return (
    <article className={cardClass(dark)} data-testid="unwrap-card" data-kind="date">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-40" style={{ background: "linear-gradient(180deg, rgba(var(--gift-accent-rgb), 0.13), rgba(var(--gift-accent-rgb), 0))" }} />
      <header className="relative px-5 pt-6 @max-2xs:px-4">
        <p className="text-[11px] font-semibold tracking-[0.24em] uppercase" style={{ color: dark ? "var(--gift-accent-soft)" : "var(--gift-accent-deep)" }}>
          {giftString(locale, "unwrapDate")}
        </p>
        <h3 ref={headingRef} tabIndex={-1} className="mt-2 text-[2rem] leading-[1.02] tracking-[-0.01em] text-balance outline-none first-letter:uppercase @max-2xs:text-[1.7rem]" style={{ fontFamily: "var(--gift-font-display)" }}>
          {day ?? giftString(locale, "unwrapSoon")}
        </h3>
        {subtitle ? (
          <p className={cn("mt-2 flex items-center gap-1.5 text-[14px]", muted(dark))}>
            <MapPin className="size-3.5 shrink-0" />
            <span className="min-w-0 [overflow-wrap:anywhere]">{subtitle}</span>
          </p>
        ) : null}
      </header>

      {unwrap.stops.length > 0 ? (
        <ol className="relative mt-5 px-5 @max-2xs:px-4" aria-label={giftString(locale, "unwrapStops")}>
          {unwrap.stops.map((stop, i) => {
            const kind = kindLabel(stop.kind, locale);
            const last = i === unwrap.stops.length - 1;
            return (
              <motion.li key={`${stop.name}-${i}`} className="relative flex gap-3.5 pb-4" {...rise(reduce, i)}>
                {/* The route: dotted from one picture to the next. */}
                {!last ? <span aria-hidden="true" className="absolute top-[3.9rem] bottom-1 left-7 border-l-2 border-dotted @max-2xs:top-[3.4rem] @max-2xs:left-6" style={{ borderColor: "rgba(var(--gift-accent-rgb), 0.45)" }} /> : null}
                <span className="relative">
                  <StopPhoto stop={stop} className={cn("size-14 rounded-[18px] ring-[3px] @max-2xs:size-12 @max-2xs:rounded-2xl", dark ? "ring-white/10" : "ring-white shadow-[0_10px_20px_-12px_rgba(40,10,25,0.6)]")} />
                  <span className="absolute -top-1.5 -left-1.5 grid size-6 place-items-center rounded-full text-[11px] font-bold shadow-sm" style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)" }}>
                    {i + 1}
                  </span>
                </span>
                <span className="min-w-0 flex-1 pt-1">
                  {stop.time || kind ? (
                    <span className="flex flex-wrap items-center gap-x-2 text-[12.5px] font-semibold">
                      {stop.time ? <span className="tabular-nums" style={{ color: dark ? "var(--gift-accent-soft)" : "var(--gift-accent-deep)" }}>{stop.time}</span> : null}
                      {kind ? <span className={muted(dark)}>{kind}</span> : null}
                    </span>
                  ) : null}
                  <span className="mt-0.5 block text-[1.08rem] leading-[1.2] [overflow-wrap:anywhere] @max-2xs:text-[1rem]" style={{ fontFamily: "var(--gift-font-display)" }}>
                    {stop.name}
                  </span>
                  {stop.note ? (
                    <span className={cn("mt-1 block text-[1.05rem] leading-snug", dark ? "text-white/80" : "text-black/70")} style={{ fontFamily: "var(--gift-font-hand)" }}>
                      {stop.note}
                    </span>
                  ) : null}
                </span>
              </motion.li>
            );
          })}
        </ol>
      ) : null}

      <motion.div className="flex flex-col gap-2.5 px-5 pt-2 pb-5 @max-2xs:px-4" {...rise(reduce, unwrap.stops.length)}>
        {unwrap.link ? (
          <a href={unwrap.link} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold shadow-lg" style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)" }} data-testid="unwrap-link">
            {giftString(locale, "unwrapOpenPlan")}
            <ArrowUpRight className="size-4" />
          </a>
        ) : null}
        {ics ? (
          <button
            type="button"
            onClick={() => download(ics, giftString(locale, "unwrapFile"))}
            className={cn("flex min-h-12 items-center justify-center gap-2 rounded-full border px-5 text-[15px] font-medium", dark ? "border-white/20 hover:bg-white/10" : "border-black/12 hover:bg-black/[0.04]")}
          >
            <CalendarPlus className="size-4" />
            {giftString(locale, "unwrapCalendar")}
          </button>
        ) : null}
        <PhotoCredit unwrap={unwrap} locale={locale} dark={dark} />
      </motion.div>
    </article>
  );
}

/** The photographs are other people's, given away on Commons on the condition they are credited. */
function PhotoCredit({ unwrap, locale, dark }: { unwrap: GiftUnwrap; locale: GiftLocale; dark: boolean }) {
  const wikimedia = [unwrap.image, ...unwrap.stops.map((s) => s.image)].some((src) => src?.startsWith("https://"));
  if (!wikimedia) return null;
  return <p className={cn("mt-1 text-center text-[11px]", dark ? "text-white/40" : "text-black/35")}>{giftString(locale, "unwrapPhotos")}</p>;
}

const MODE_ICON = { flight: Plane, road: Car, train: TrainFront } as const;
const MODE_WORD = { flight: "unwrapFlight", road: "unwrapRoad", train: "unwrapTrain" } as const;

function TripCard({ unwrap, locale, dark, headingRef, reduce }: CardProps) {
  const trip = unwrap.trip;
  const mode = trip?.mode ?? "flight";
  const Icon = MODE_ICON[mode];
  const [coverBroken, setCoverBroken] = useState(false);
  const dates = trip ? tripDates(trip, locale) : null;
  const nights = trip ? tripNights(trip) : null;
  const facts = [dates ?? giftString(locale, "unwrapSoon"), nights ? (nights === 1 ? giftString(locale, "unwrapNight") : giftString(locale, "unwrapNights", { n: nights })) : null].filter(Boolean).join(" · ");
  const cover = unwrap.image && !coverBroken ? unwrap.image : null;
  return (
    <article className={cardClass(dark)} data-testid="unwrap-card" data-kind="trip">
      <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ background: "linear-gradient(135deg, var(--gift-accent-soft), var(--gift-accent-deep))" }}>
        {cover ? <img src={cover} alt="" loading="lazy" decoding="async" onError={() => setCoverBroken(true)} className="absolute inset-0 size-full object-cover" /> : <Icon aria-hidden="true" className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 text-white/80" />}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: dark ? "linear-gradient(to top, rgba(28,21,24,0.95), transparent)" : "linear-gradient(to top, rgba(255,255,255,1), transparent)" }} />
        <span className="absolute top-4 left-4 flex h-9 items-center gap-1.5 rounded-full bg-black/40 px-3 text-[12.5px] font-semibold text-white backdrop-blur-md">
          <Icon aria-hidden="true" className="size-4" />
          {giftString(locale, MODE_WORD[mode])}
        </span>
      </div>
      <div className="relative -mt-12 px-5 pb-5 @max-2xs:px-4">
        <p className="text-[11px] font-semibold tracking-[0.24em] uppercase" style={{ color: dark ? "var(--gift-accent-soft)" : "var(--gift-accent-deep)" }}>
          {giftString(locale, "unwrapTrip")}
        </p>
        <h3 ref={headingRef} tabIndex={-1} className="mt-2 text-[2rem] leading-[1.02] tracking-[-0.01em] text-balance outline-none [overflow-wrap:anywhere] @max-2xs:text-[1.6rem]" style={{ fontFamily: "var(--gift-font-display)" }}>
          {unwrap.title}
        </h3>
        {trip ? (
          <motion.div className="mt-4 flex items-center gap-2.5 text-[15px] font-semibold" {...rise(reduce, 0)}>
            {trip.from ? <span className="min-w-0 shrink [overflow-wrap:anywhere]">{trip.from}</span> : null}
            {trip.from ? (
              <span aria-hidden="true" className="relative flex h-5 min-w-10 flex-1 items-center">
                <span className="w-full border-t-2 border-dashed" style={{ borderColor: "rgba(var(--gift-accent-rgb), 0.5)" }} />
                <Icon className="absolute left-1/2 size-4 -translate-x-1/2 rounded-full p-px" style={{ color: "var(--gift-accent)", background: dark ? "#1c1518" : "#fff" }} />
              </span>
            ) : (
              <Icon aria-hidden="true" className="size-4" style={{ color: "var(--gift-accent)" }} />
            )}
            <span className="min-w-0 shrink [overflow-wrap:anywhere]">{trip.to}</span>
          </motion.div>
        ) : null}
        <motion.p className={cn("mt-2 text-[14px]", muted(dark))} {...rise(reduce, 1)}>
          {facts}
        </motion.p>

        {unwrap.stops.length > 0 ? (
          <motion.div className="mt-5" {...rise(reduce, 2)}>
            <p className={cn("text-[11px] font-semibold tracking-[0.18em] uppercase", muted(dark))}>{giftString(locale, "unwrapWay")}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {unwrap.stops.map((stop, i) => (
                <li key={`${stop.name}-${i}`} className={cn("flex h-10 max-w-full items-center gap-2 rounded-full pr-3.5 pl-1 text-[13.5px] font-medium", dark ? "bg-white/10" : "bg-black/[0.045]")}>
                  <StopPhoto stop={stop} className="size-8 rounded-full" />
                  <span className="min-w-0 truncate">{stop.name}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}

        {unwrap.link ? (
          <motion.a
            href={unwrap.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold shadow-lg"
            style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)" }}
            data-testid="unwrap-link"
            {...rise(reduce, 3)}
          >
            {giftString(locale, "unwrapSeeTrip")}
            <ArrowUpRight className="size-4" />
          </motion.a>
        ) : null}
        <div className="mt-3">
          <PhotoCredit unwrap={unwrap} locale={locale} dark={dark} />
        </div>
      </div>
    </article>
  );
}
