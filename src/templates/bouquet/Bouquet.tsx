"use client";

import { useId, useMemo } from "react";
import { motion } from "motion/react";
import { FlowerHead, Spray, mix } from "./art";
import { NECK, arrange, type Arrangement } from "./arrange";
import type { BouquetFields } from "./schema";

const PAPER = {
  kraft: { back: ["#D8B98F", "#BF9868"], front: ["#E2C49B", "#B58A5A"], line: "#8C6640" },
  tissue: { back: ["#FBF7F0", "#E9DECB"], front: ["#FFFDF8", "#E4D8C3"], line: "#C4B294" },
  blush: { back: ["#F9DFE2", "#EABAC1"], front: ["#FCE7EA", "#E2A7B0"], line: "#C07C88" },
  noir: { back: ["#3C3A40", "#1C1B1F"], front: ["#39373E", "#131216"], line: "#67636E" },
} as const;

const RIBBON = {
  cream: ["#F8F1E5", "#D5C3A6"],
  red: ["#E24B54", "#921925"],
  sage: ["#BACDB6", "#6F8B6D"],
  black: ["#44414A", "#0F0E11"],
  pink: ["#F9CAD6", "#D57C98"],
} as const;

const LEFT_SHEET = "M56 312C118 338 178 346 240 338L214 470L186 470C150 420 100 360 56 312Z";
const RIGHT_SHEET = "M344 312C282 338 222 348 160 342L186 470L214 470C250 420 300 360 344 312Z";
const BACK = "M200 480C124 414 42 336 34 236C92 188 150 172 200 170C250 172 308 188 366 236C358 336 276 414 200 480Z";

export type BouquetTiming = { heads: number; wrap: number; ribbon: number; card: number };

export function timingFor(arr: Arrangement): BouquetTiming {
  const heads = 1.1;
  const wrap = heads + arr.heads.length * 0.12 + 0.25;
  return { heads, wrap, ribbon: wrap + 0.55, card: wrap + 0.95 };
}

/**
 * The bouquet as one SVG. With `animate` it assembles itself: paper, greens, every head in
 * turn, then the paper folds round, the ribbon ties and the card drops in.
 */
/** The wax that closes the paper: a poured blob, pressed with a heart while it was soft. */
function WaxSeal({ x, y, color }: { x: number; y: number; color: string }) {
  const deep = mix(color, "#000000", 0.38);
  const light = mix(color, "#FFFFFF", 0.32);
  const blob = "M0 -18C9 -19 17 -12 18 -4C19 5 13 15 4 17C-6 19 -16 13 -18 4C-20 -6 -9 -17 0 -18Z";
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={blob} transform="translate(1.5 2.5)" fill="#000" opacity={0.22} />
      <path d={blob} fill={color} />
      <path d={blob} fill="none" stroke={deep} strokeWidth={1.6} />
      <path d="M-11 -8C-8 -13 -3 -15 1 -14" fill="none" stroke={light} strokeWidth={2.6} strokeLinecap="round" opacity={0.75} />
      <path d="M0 8C-7 2 -10 -2 -8 -6C-6 -9 -2 -8 0 -5C2 -8 6 -9 8 -6C10 -2 7 2 0 8Z" fill={deep} opacity={0.55} />
      <path d="M0 6.5C-6.4 1 -9 -2.6 -7.2 -6.2C-5.4 -8.8 -1.8 -7.9 0 -5.2C1.8 -7.9 5.4 -8.8 7.2 -6.2C9 -2.6 6.4 1 0 6.5Z" fill={light} opacity={0.4} />
    </g>
  );
}

export function BouquetArt({
  fields,
  cardText,
  seal,
  openLabel,
  animate,
  onCard,
  className,
}: {
  fields: BouquetFields;
  cardText: string;
  seal?: string;
  openLabel?: string;
  animate: boolean;
  onCard?: () => void;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const arr = useMemo(() => arrange(fields.stems, fields.seed), [fields.stems, fields.seed]);
  const time = timingFor(arr);
  const paper = PAPER[fields.wrap] ?? PAPER.kraft;
  const ribbon = RIBBON[fields.ribbon] ?? RIBBON.cream;
  const stemInk = "#5E7A4C";

  const grow = (delay: number) =>
    animate
      ? {
          initial: { scale: 0.15, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          transition: { delay, type: "spring" as const, stiffness: 120, damping: 14 },
        }
      : {};

  return (
    // Cropped tight to the paper so the bouquet fills the phone; greens may spill past the edges.
    <svg viewBox="35 118 330 492" preserveAspectRatio="xMidYMin meet" className={className} style={{ overflow: "visible" }} role="img" aria-label="Bouquet">
      <defs>
        <linearGradient id={`${uid}-bk`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={paper.back[0]} />
          <stop offset="1" stopColor={paper.back[1]} />
        </linearGradient>
        <linearGradient id={`${uid}-fl`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={paper.front[0]} />
          <stop offset="1" stopColor={paper.front[1]} />
        </linearGradient>
        <linearGradient id={`${uid}-fr`} x1="1" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={mix(paper.front[0], "#FFFFFF", 0.12)} />
          <stop offset="1" stopColor={paper.front[1]} />
        </linearGradient>
        <linearGradient id={`${uid}-rb`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ribbon[0]} />
          <stop offset="1" stopColor={ribbon[1]} />
        </linearGradient>
        <radialGradient id={`${uid}-sh`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={200} cy={588} rx={120} ry={14} fill={`url(#${uid}-sh)`} />

      {/* The paper behind the flowers. */}
      <motion.g
        {...(animate
          ? { initial: { y: 40, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { delay: 0.1, duration: 0.7, ease: "easeOut" as const } }
          : {})}
      >
        <path d={BACK} fill={`url(#${uid}-bk)`} />
        <path d="M34 236C92 188 150 172 200 170C250 172 308 188 366 236" fill="none" stroke={paper.line} strokeOpacity={0.35} strokeWidth={1.2} />
        <path d="M200 474C168 400 120 300 104 214M200 474C232 400 280 300 296 214" fill="none" stroke={paper.line} strokeOpacity={0.18} strokeWidth={1.2} />
      </motion.g>

      {arr.greens.map((g, i) => (
        <g key={g.key} transform={`translate(${NECK.x} ${NECK.y}) rotate(${g.angle.toFixed(1)})`}>
          <motion.g style={{ transformOrigin: "50% 100%" }} {...grow(0.45 + i * 0.08)}>
            <Spray id={g.id} tone={g.tone} uid={`${uid}${g.key}`} seed={g.seed} length={g.length} />
          </motion.g>
        </g>
      ))}

      {arr.fillers.map((f, i) => (
        <g key={f.key} transform={`translate(${NECK.x} ${NECK.y}) rotate(${f.angle.toFixed(1)})`}>
          <motion.g style={{ transformOrigin: "50% 100%" }} {...grow(0.85 + i * 0.07)}>
            <Spray id={f.id} tone={f.tone} uid={`${uid}${f.key}`} seed={f.seed} length={f.length} />
          </motion.g>
        </g>
      ))}

      {arr.heads.map((h, i) => (
        <motion.path
          key={`st${h.key}`}
          d={`M${NECK.x} ${NECK.y}Q${((NECK.x + h.x) / 2 + (h.x - NECK.x) * 0.15).toFixed(1)} ${((NECK.y + h.y) / 2).toFixed(1)} ${h.x.toFixed(1)} ${h.y.toFixed(1)}`}
          fill="none"
          stroke={stemInk}
          strokeWidth={3}
          strokeLinecap="round"
          {...(animate
            ? { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { delay: time.heads + i * 0.12 - 0.3, duration: 0.5 } }
            : {})}
        />
      ))}

      {arr.heads.map((h, i) => (
        <g key={h.key} transform={`translate(${h.x.toFixed(1)} ${h.y.toFixed(1)}) rotate(${h.rot.toFixed(1)}) scale(${h.scale.toFixed(3)})`}>
          <motion.g
            style={{ transformOrigin: "50% 50%" }}
            {...(animate
              ? {
                  initial: { scale: 0.2, opacity: 0, rotate: -40 },
                  animate: { scale: 1, opacity: 1, rotate: 0 },
                  transition: { delay: time.heads + i * 0.12, type: "spring" as const, stiffness: 150, damping: 13 },
                }
              : {})}
          >
            <FlowerHead id={h.id} tone={h.tone} uid={`${uid}${h.key}`} seed={h.seed} />
          </motion.g>
        </g>
      ))}

      {/* The paper folding round the front. */}
      {[
        { d: LEFT_SHEET, fill: `url(#${uid}-fl)`, fold: "M92 330C130 380 164 430 190 468", from: -24 },
        { d: RIGHT_SHEET, fill: `url(#${uid}-fr)`, fold: "M306 330C270 380 236 430 210 468", from: 24 },
      ].map((s) => (
        <motion.g
          key={s.from}
          style={{ transformBox: "view-box", transformOrigin: `${NECK.x}px ${NECK.y}px` }}
          {...(animate
            ? { initial: { rotate: s.from, opacity: 0 }, animate: { rotate: 0, opacity: 1 }, transition: { delay: time.wrap, type: "spring" as const, stiffness: 90, damping: 15 } }
            : {})}
        >
          <path d={s.d} fill={s.fill} stroke={paper.line} strokeOpacity={0.35} strokeWidth={1} strokeLinejoin="round" />
          <path d={s.fold} fill="none" stroke={paper.line} strokeOpacity={0.3} strokeWidth={1.2} />
        </motion.g>
      ))}

      <motion.g {...(animate ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: time.wrap + 0.2, duration: 0.4 } } : {})}>
        <path d="M186 470L214 470L240 590Q200 602 160 590Z" fill={`url(#${uid}-fl)`} stroke={paper.line} strokeOpacity={0.35} strokeWidth={1} />
        <path d="M200 474L201 596" stroke={paper.line} strokeOpacity={0.25} strokeWidth={1.1} />
      </motion.g>

      {/* The wax seal that holds the paper closed, pressed on once the sheets have folded round. */}
      <motion.g
        style={{ transformBox: "view-box", transformOrigin: "200px 398px" }}
        {...(animate
          ? { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { delay: time.wrap + 0.35, type: "spring" as const, stiffness: 240, damping: 12 } }
          : {})}
      >
        <WaxSeal x={200} y={398} color={seal ?? "#B03A3C"} />
      </motion.g>

      {/* The ribbon. */}
      <motion.g
        style={{ transformBox: "view-box", transformOrigin: `${NECK.x}px ${NECK.y}px` }}
        {...(animate
          ? { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { delay: time.ribbon, type: "spring" as const, stiffness: 260, damping: 11 } }
          : {})}
      >
        <path d="M180 461Q200 457 220 461L221 477Q200 481 179 477Z" fill={`url(#${uid}-rb)`} />
        <path d="M195 474C188 502 176 530 166 552L177 549L182 561C192 534 200 506 204 476Z" fill={`url(#${uid}-rb)`} />
        <path d="M205 474C212 502 224 530 234 552L223 549L218 561C208 534 200 506 196 476Z" fill={`url(#${uid}-rb)`} />
        <path d="M199 469C176 438 140 446 146 468C150 486 182 484 199 471Z" fill={`url(#${uid}-rb)`} />
        <path d="M201 469C224 438 260 446 254 468C250 486 218 484 201 471Z" fill={`url(#${uid}-rb)`} />
        <path d="M194 466C178 450 158 452 156 466M206 466C222 450 242 452 244 466" fill="none" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.6} strokeLinecap="round" />
        <ellipse cx={200} cy={470} rx={9} ry={8} fill={ribbon[1]} />
        <ellipse cx={198} cy={467} rx={4} ry={3} fill="#FFFFFF" opacity={0.3} />
      </motion.g>

      {/* The card, tied to the ribbon. */}
      <motion.g
        data-card=""
        role={onCard ? "button" : undefined}
        aria-label={onCard ? (openLabel ?? cardText) : undefined}
        tabIndex={onCard ? 0 : undefined}
        onClick={onCard}
        onKeyDown={onCard ? (e) => (e.key === "Enter" || e.key === " ") && onCard() : undefined}
        style={{ cursor: onCard ? "pointer" : undefined, transformBox: "view-box", transformOrigin: "236px 452px" }}
        {...(animate
          ? {
              initial: { y: -60, opacity: 0, rotate: -30 },
              animate: { y: 0, opacity: 1, rotate: [-30, 10, -6, 3, 0] },
              transition: { delay: time.card, duration: 1.4, ease: "easeOut" as const },
            }
          : {})}
      >
        <path d="M205 470C220 470 232 460 244 452" fill="none" stroke="#8C7A66" strokeWidth={1} />
        <g transform="translate(244 452) rotate(-9)">
          <rect x={0} y={-6} width={104} height={62} rx={4} fill="#FFFDF8" stroke="#E4D9C8" strokeWidth={1} />
          <rect x={0} y={-6} width={104} height={62} rx={4} fill="none" stroke="#000" strokeOpacity={0.06} strokeWidth={4} />
          <circle cx={11} cy={4} r={3} fill="none" stroke="#B9A88F" strokeWidth={1} />
          <text x={54} y={34} textAnchor="middle" fontSize={cardText.length > 14 ? 13 : 17} fill="#3A2E2A" style={{ fontFamily: "var(--gift-font-hand)" }}>
            {cardText}
          </text>
        </g>
      </motion.g>
    </svg>
  );
}
