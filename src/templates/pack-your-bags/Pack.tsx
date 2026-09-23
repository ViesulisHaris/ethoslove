"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { buzz } from "../_shared/synth";
import { CaseBase, LidInside, LidOutside, TagString, Tick } from "./art";
import { fill, type Copy } from "./copy";
import { TAG, slotLayout, tossPath, trayLayout } from "./packing";
import { playLid, playPacked, playToss, playZip } from "./sounds";

/** The pack stage's height, in --k; it's centred in whatever room there is. */
export const PACK_H = 156;
/** Where the "Where to?" button's top sits on the stage, in --k. */
const GO_AT = 141;
/**
 * What the stage is centred as: its own height, or down to the bottom of the button when the
 * button's 44px floor is taller than the room drawn for it (a phone on its side, where --k is
 * small), so the button is never pushed off the bottom of the screen.
 */
const STAGE_H = `max(${PACK_H} * var(--k), ${GO_AT} * var(--k) + 44px)`;
/** How long a tag takes to fly into the case (see .pyb-tag in ./css). */
const TOSS_MS = 640;
/** Where the suitcase sits on the stage (see .pyb-case). */
const CASE_AT = { x: 4.5, y: 27 };

type TagState = "home" | "flying" | "landed";
type Lid = "open" | "closing" | "closed";

const k = (n: number) => `calc(${n.toFixed(2)} * var(--k))`;

/** The date on a luggage tag in handwriting: smaller the longer it is, so it stays on the tag. */
const dateSize = (text: string) => k(text.length <= 8 ? 6.6 : text.length <= 12 ? 5.4 : text.length <= 20 ? 4.2 : 3.4);
const clueSize = (text: string) => k(text.length <= 12 ? 4.6 : text.length <= 22 ? 3.8 : 3.2);

/**
 * Pack the case. Each clue waits on a luggage tag; a tap throws it into the case in an arc, where
 * it lands with a tick. When the last one is in, the lid comes over, the case slides to the middle,
 * the zip runs, and a tag with the date on it swings down from the handle.
 */
export function PackStage({
  s,
  recipient,
  clues,
  date,
  nights,
  monogram,
  seed,
  reduce,
  muted,
  onStart,
  onPacked,
  onGo,
}: {
  s: Copy;
  recipient: string;
  clues: string[];
  date: string;
  nights: number;
  monogram: string;
  seed: number;
  reduce: boolean;
  muted: boolean;
  onStart: () => void;
  onPacked: () => void;
  onGo: () => void;
}) {
  const [tags, setTags] = useState<TagState[]>(() => clues.map(() => "home"));
  const [lid, setLid] = useState<Lid>("open");
  const [moved, setMoved] = useState(false);
  const [zip, setZip] = useState<"idle" | "run" | "done">("idle");
  const [tagDown, setTagDown] = useState(false);
  const [ready, setReady] = useState(false);
  const tray = trayLayout(clues.length, seed);
  const slots = slotLayout(clues.length, seed);
  const timers = useRef<number[]>([]);
  const started = useRef(false);
  const landed = useRef(new Set<number>());
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  });
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);
  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  /** Everything after the last tag lands, on one timetable. */
  const close = () => {
    onPacked();
    if (reduce) {
      setLid("closed");
      setMoved(true);
      setZip("done");
      later(200, () => {
        setTagDown(true);
        setReady(true);
      });
      return;
    }
    later(350, () => setLid("closing"));
    later(350 + 590, () => {
      playLid(mutedRef.current);
      buzz(24);
    });
    later(350 + 900, () => {
      setLid("closed");
      setMoved(true);
    });
    later(2050, () => {
      setZip("run");
      playZip(mutedRef.current);
    });
    later(2700, () => {
      setZip("done");
      setTagDown(true);
    });
    later(3400, () => setReady(true));
  };

  const land = (i: number) => {
    if (landed.current.has(i)) return;
    landed.current.add(i);
    setTags((prev) => prev.map((st, j) => (j === i ? "landed" : st)));
    playPacked(mutedRef.current);
    buzz(8);
    // The last one in: the case closes itself.
    if (landed.current.size === clues.length) close();
  };

  const toss = (i: number) => {
    if (tags[i] !== "home") return;
    if (!started.current) {
      started.current = true;
      onStart();
    }
    playToss(mutedRef.current);
    if (reduce) {
      land(i);
      return;
    }
    setTags((prev) => prev.map((st, j) => (j === i ? "flying" : st)));
    // The arc's own end lands it; this is in case the browser never tells us (a hidden tab pauses animations).
    later(TOSS_MS + 250, () => land(i));
  };

  const packed = lid !== "open";
  const trayBottom = Math.max(0, ...tray.map((t) => t.y)) + TAG.h;
  const heading = packed ? fill(s.packed, { name: recipient }) : fill(s.packTitle, { name: recipient });
  const long = recipient.length > 12;

  return (
    <div className="absolute" style={{ left: "calc(50% - 50 * var(--k))", top: `max(0px, calc((100cqh - ${STAGE_H}) / 2))`, width: k(100), height: k(PACK_H) }}>
      <div className="absolute inset-x-0 top-[calc(2*var(--k))] px-[calc(6*var(--k))] text-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={packed ? "packed" : "pack"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35 }}>
            <h1 className="leading-[1.04] text-balance text-[#F7F0E1] italic [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-display)", fontSize: k(long ? 6 : 7.4) }}>
              {heading}
            </h1>
            <p className="mx-auto mt-[calc(1.8*var(--k))] max-w-[calc(80*var(--k))] text-balance text-[#F7F0E1]/70" style={{ fontSize: k(3.4) }}>
              {packed ? s.packedSub : s.packSub}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="pyb-case" data-moved={moved ? "true" : "false"}>
        <div className="pyb-floor" aria-hidden="true" />
        <div className="pyb-spine" aria-hidden="true" />
        <div className={lid === "closing" ? "pyb-base pyb-thud" : "pyb-base"} aria-hidden="true">
          <CaseBase />
        </div>

        {clues.map((clue, i) => {
          const from = tray[i];
          const to = slots[i];
          if (!from || !to) return null;
          const { dx, dy, peak } = tossPath(from, to);
          const state = tags[i];
          const vars = {
            left: k(from.x),
            top: k(from.y),
            zIndex: state === "landed" ? 3 : 7,
            "--dx": dx.toFixed(2),
            "--dy": dy.toFixed(2),
            "--peak": peak.toFixed(2),
            "--tilt": `${from.tilt.toFixed(1)}deg`,
            "--mid": `${((from.tilt + to.rot) / 2).toFixed(1)}deg`,
            "--rot": `${to.rot.toFixed(1)}deg`,
            "--bob": `${(-i * 0.7).toFixed(1)}s`,
          } as CSSProperties;
          return (
            <button
              key={i}
              type="button"
              className="pyb-tag"
              data-testid="pyb-clue"
              data-state={state}
              style={vars}
              disabled={state !== "home"}
              aria-label={fill(s.pack, { thing: clue })}
              onClick={() => toss(i)}
            >
              <span className="pyb-fly">
                <span
                  className="pyb-arc"
                  onAnimationEnd={(e) => {
                    if (e.animationName === "pyb-y") land(i);
                  }}
                >
                  <TagString className="pyb-string" />
                  <span className="pyb-card">
                    <span className="pyb-hole" />
                    <span className="pyb-no">{String(i + 1).padStart(2, "0")}</span>
                    <span className="pyb-clue" style={{ fontSize: clueSize(clue) }}>
                      {clue}
                    </span>
                  </span>
                  <span className="pyb-tick">
                    <Tick />
                  </span>
                </span>
              </span>
            </button>
          );
        })}

        <div className="pyb-lid" data-state={lid} aria-hidden="true">
          <div className="pyb-face">
            <LidInside monogram={monogram} />
          </div>
          <div className="pyb-face pyb-face-out">
            <LidOutside />
          </div>
        </div>
        <div className="pyb-lidshade" aria-hidden="true" />

        <div className="pyb-zip" data-zip={zip} aria-hidden="true" style={{ opacity: lid === "closed" ? 1 : 0 }}>
          <span className="pyb-zip-track" />
          <span className="pyb-zip-pull" />
        </div>

        {tagDown ? (
          <motion.div
            className="absolute z-[4]"
            style={{ left: k(68.5 - 15), top: k(61), width: k(30), transformOrigin: "50% 0%" }}
            initial={reduce ? false : { rotate: -110, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ rotate: { type: "spring", stiffness: 55, damping: 4.5 }, opacity: { duration: 0.15 } }}
          >
            <DateTag s={s} date={date} nights={nights} />
          </motion.div>
        ) : null}
      </div>

      {!packed ? (
        <p className="absolute inset-x-0 text-center font-semibold tracking-[0.22em] text-[#F7F0E1]/60 uppercase" style={{ top: k(CASE_AT.y + trayBottom + 7), fontSize: k(2.6) }}>
          {s.packHint}
        </p>
      ) : null}

      <AnimatePresence>
        {ready ? (
          <motion.div key="go" className="absolute inset-x-0 flex justify-center" style={{ top: k(GO_AT) }} initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 18 }}>
            <button
              type="button"
              data-testid="pyb-where"
              onClick={onGo}
              className="pyb-go relative min-h-11 rounded-full font-semibold tracking-[0.18em] uppercase shadow-[0_calc(1.4*var(--k))_calc(3*var(--k))_rgba(0,0,0,.45)] outline-none focus-visible:ring-4 focus-visible:ring-white/70"
              style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)", fontSize: k(3.4), padding: `${k(3.4)} ${k(8)}` }}
            >
              {s.where}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** The tag on the handle: when they leave, how long for, and where to — not yet. */
function DateTag({ s, date, nights }: { s: Copy; date: string; nights: number }) {
  return (
    <div className="relative" style={{ filter: "drop-shadow(0 calc(.8*var(--k)) calc(1.4*var(--k)) rgba(0,0,0,.45))" }} aria-hidden="true">
      <svg viewBox="0 0 10 14" className="absolute left-1/2 h-[calc(5*var(--k))] w-[calc(3.6*var(--k))] -translate-x-1/2" style={{ top: k(-2.2) }}>
        <path d="M5 0C2 4 2 9 5 13C8 9 8 4 5 0" fill="none" stroke="#F4E9D2" strokeWidth="1.1" />
      </svg>
      <div
        className="pyb-grain relative px-[calc(3*var(--k))] pt-[calc(7*var(--k))] pb-[calc(4*var(--k))] text-center text-[#2B2116]"
        style={{
          backgroundColor: "#E8CD95",
          marginTop: k(2),
          clipPath: "polygon(22% 0, 78% 0, 100% 13%, 100% 100%, 0 100%, 0 13%)",
        }}
      >
        <span className="absolute top-[calc(1.8*var(--k))] left-1/2 size-[calc(3.4*var(--k))] -translate-x-1/2 rounded-full" style={{ background: "radial-gradient(circle,#1a2230 0 32%,#EBC878 35% 55%,#8A6424 60% 68%,transparent 71%)" }} />
        <span className="block font-bold tracking-[0.22em] uppercase opacity-60" style={{ fontSize: k(2.5), fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
          {s.departs}
        </span>
        <span className="mt-[calc(.6*var(--k))] block leading-[1.05] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: dateSize(date) }}>
          {date}
        </span>
        <span className="mx-auto mt-[calc(1.8*var(--k))] block h-0 w-[80%] border-t border-dashed border-[#2B2116]/35" />
        <span className="mt-[calc(1.6*var(--k))] block font-semibold" style={{ fontSize: k(2.8) }}>
          {fill(nights === 1 ? s.night : s.nights, { n: nights })}
        </span>
        <span className="mt-[calc(1*var(--k))] block tracking-[0.2em] uppercase" style={{ fontSize: k(2.6), fontFamily: 'var(--font-type), "Courier New", monospace' }}>
          {s.to}:{" "}
          {/* Kept whole: where the word for "to" is long ("destino") the line breaks after the colon, not between two of the marks. */}
          <span className="whitespace-nowrap">{s.mystery}</span>
        </span>
      </div>
    </div>
  );
}
