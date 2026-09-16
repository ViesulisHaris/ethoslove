"use client";

import { useId } from "react";
import {
  BOX,
  FOLDS,
  SHEETS,
  STEPS,
  WING_FAR,
  WING_NEAR,
  creaseMid,
  lerpPts,
  polyPath,
  shadowX,
  sheetShadow,
  sheetShift,
  type Tone,
} from "./origami";
import type { Paper as PaperPalette } from "./art";

const KEYFRAMES = `
.pc-settle{transform-box:view-box;transform-origin:70px 100px;animation:pc-settle .4s cubic-bezier(.2,1.5,.4,1)}
@keyframes pc-settle{0%{transform:scale(1.02) rotate(.5deg)}100%{transform:scale(1) rotate(0)}}
.pc-breathe{transform-box:view-box;transform-origin:70px 118px;animation:pc-breathe 5.5s ease-in-out infinite alternate}
@keyframes pc-breathe{from{transform:rotate(-.6deg)}to{transform:rotate(.6deg)}}
.pc-fly{transform-box:view-box;transform-origin:70px 100px;animation:pc-fly 2.6s cubic-bezier(.4,0,.7,.45) forwards}
@keyframes pc-fly{0%{transform:translate(0,0) scale(1) rotate(0);opacity:1}
16%{transform:translate(3px,-11px) scale(1.02) rotate(-3deg);opacity:1}
100%{transform:translate(-30px,-132px) scale(.32) rotate(-13deg);opacity:0}}
.pc-flap{transform-box:view-box;transform-origin:72px 56px;animation:pc-flap .44s ease-in-out infinite alternate}
@keyframes pc-flap{from{transform:rotate(-20deg) scaleY(.78)}to{transform:rotate(14deg) scaleY(1)}}
.pc-flap-far{transform-box:view-box;transform-origin:72px 56px;animation:pc-flap-far .44s ease-in-out infinite alternate}
@keyframes pc-flap-far{from{transform:rotate(-13deg) scaleY(.86)}to{transform:rotate(19deg) scaleY(1)}}
.pc-shadow-go{animation:pc-shadow-go 1.1s ease-out forwards}
@keyframes pc-shadow-go{to{opacity:0;transform:scale(.5)}}
.pc-pulse{transform-box:fill-box;transform-origin:center;animation:pc-pulse 2.6s ease-in-out infinite}
@keyframes pc-pulse{0%,100%{transform:scale(.9);opacity:.5}50%{transform:scale(1.35);opacity:.12}}
@media (prefers-reduced-motion: reduce){.pc-settle,.pc-breathe,.pc-flap,.pc-flap-far,.pc-pulse{animation:none}}
`;

type Props = {
  p: PaperPalette;
  /** Folds already made: none is a flat sheet, six is a crane. */
  step: number;
  /** How far through the fold being made, 0…1. */
  t: number;
  /** How much breath the crane has under it, 0…1. */
  lift: number;
  flying: boolean;
  reduce: boolean;
  /** Before anyone has pressed anything, the first crease asks to be pressed. */
  showHint: boolean;
};

/**
 * The sheet itself: what is folded already, the flap part-way through the fold being made, and
 * the crease inking in underneath for as long as the press goes on.
 */
export function Paper({ p, step, t, lift, flying, reduce, showHint }: Props) {
  const done = Math.max(0, Math.min(STEPS, step));
  const crane = done >= STEPS;
  const fold = crane ? null : FOLDS[done];
  const fills: Record<Tone, string> = { face: p.face, shade: p.shade, deep: p.deep };
  const wingT = crane ? 1 : done === STEPS - 1 ? t : 0;
  // The breath under the crane: it rises, tips forward and its shadow draws in and pales.
  const rise = flying ? 0 : lift * 17;
  const [dx, dy] = sheetShift(done);
  const shadow = sheetShadow(done);
  const [cx, cy] = fold ? creaseMid(fold.crease) : [0, 0];
  // The editor draws the gift more than once on one page, so every instance owns its own defs.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ids = { shadow: `pc-shadow-${uid}`, sheen: `pc-sheen-${uid}`, drop: `pc-drop-${uid}` };
  // Everything but the flap. The one fold that opens the paper out is all flap and has none.
  const still = crane ? SHEETS[STEPS] : fold && fold.base !== null ? SHEETS[fold.base] : null;

  return (
    <svg
      viewBox={`0 0 ${BOX} ${BOX}`}
      className="h-full w-full overflow-visible"
      aria-hidden="true"
    >
      <style>{KEYFRAMES}</style>
      <defs>
        <radialGradient id={ids.shadow} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#000000" stopOpacity="0.5" />
          <stop offset="1" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ids.sheen} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.05" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.07" />
        </linearGradient>
        <filter id={ids.drop} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="0.4"
            dy="2"
            stdDeviation="1.6"
            floodColor="#140f0b"
            floodOpacity="0.5"
          />
        </filter>
      </defs>

      <g
        style={{
          transform: `translate(${dx}px, ${dy}px)`,
          transition: reduce ? undefined : "transform .5s cubic-bezier(.22,1,.36,1)",
        }}
      >
        {/* the shadow draws in under the breath, inside a stage that eases between silhouettes */}
        <g
          style={{
            transformBox: "view-box",
            transformOrigin: `${shadowX(done)}px 116px`,
            transform: `scaleX(${1 - lift * 0.3})`,
          }}
        >
          <ellipse
            cx={shadowX(done)}
            cy="116"
            rx="42"
            ry={crane ? 4 : 5.5}
            fill={`url(#${ids.shadow})`}
            className={flying && !reduce ? "pc-shadow-go" : undefined}
            style={{
              transformBox: "view-box",
              transformOrigin: `${shadowX(done)}px 116px`,
              transform: `scaleX(${shadow / 42})`,
              transition: reduce ? undefined : "transform .5s cubic-bezier(.22,1,.36,1)",
              opacity: 0.85 - lift * 0.5,
            }}
          />
        </g>

        {/* it leaves — on the wing, or, for anyone who asked for less motion, simply gone */}
        <g
          className={flying && !reduce ? "pc-fly" : undefined}
          style={
            flying
              ? reduce
                ? { opacity: 0, transition: "opacity .35s linear" }
                : undefined
              : {
                  transformBox: "view-box",
                  transformOrigin: "70px 108px",
                  transform: `translateY(${-rise}px) rotate(${-lift * 3}deg)`,
                }
          }
        >
          <g className={!flying && !reduce && crane ? "pc-breathe" : undefined}>
            {/* the wing behind the body */}
            {wingT > 0 ? (
              <path
                d={polyPath(WING_FAR)}
                fill={p.deep}
                stroke={p.edge}
                strokeWidth="0.5"
                strokeLinejoin="round"
                className={flying && !reduce ? "pc-flap-far" : undefined}
                style={{
                  opacity: wingT,
                  transformBox: "view-box",
                  transformOrigin: "72px 56px",
                  transform: `scale(${0.6 + wingT * 0.4})`,
                }}
              />
            ) : null}

            <g key={done} className={reduce ? undefined : "pc-settle"} filter={`url(#${ids.drop})`}>
              {/* what stays still under the flap */}
              {still ? (
                <>
                  <path
                    d={still}
                    fill={p.face}
                    stroke={p.edge}
                    strokeWidth="0.6"
                    strokeLinejoin="round"
                  />
                  <path d={still} fill={`url(#${ids.sheen})`} opacity="0.55" />
                </>
              ) : null}

              {/* and what moves: together they are exactly the paper on the table */}
              {fold
                ? fold.flaps.map((flap, i) => (
                    <path
                      key={i}
                      d={polyPath(lerpPts(flap.from, flap.to, t))}
                      fill={fills[flap.tone]}
                      strokeLinejoin="round"
                    />
                  ))
                : null}

              {/* the near wing, once it is up */}
              {crane ? (
                <path
                  d={polyPath(WING_NEAR)}
                  fill={p.shade}
                  stroke={p.edge}
                  strokeWidth="0.6"
                  strokeLinejoin="round"
                  className={flying && !reduce ? "pc-flap" : undefined}
                />
              ) : null}

              {crane ? <circle cx="23" cy="42" r="1.3" fill={p.ink} opacity="0.65" /> : null}
            </g>

            {/* the crease being pressed: dotted, and inking in as the fold goes on */}
            {fold ? (
              <g>
                <line
                  x1={fold.crease[0][0]}
                  y1={fold.crease[0][1]}
                  x2={fold.crease[1][0]}
                  y2={fold.crease[1][1]}
                  stroke={p.edge}
                  strokeWidth="1"
                  strokeDasharray="1.6 3.4"
                  strokeLinecap="round"
                  opacity="0.75"
                />
                <line
                  x1={fold.crease[0][0]}
                  y1={fold.crease[0][1]}
                  x2={fold.crease[1][0]}
                  y2={fold.crease[1][1]}
                  stroke="var(--gift-accent)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={`${Math.max(0.0001, t)} 1`}
                  opacity="0.95"
                />
                {showHint ? (
                  <circle cx={cx} cy={cy} r="5" fill="var(--gift-accent)" className="pc-pulse" />
                ) : null}
                <circle
                  cx={cx}
                  cy={cy}
                  r="1.9"
                  fill="var(--gift-accent)"
                  opacity={t > 0 ? 1 : 0.8}
                />
              </g>
            ) : null}
          </g>
        </g>
      </g>
    </svg>
  );
}
