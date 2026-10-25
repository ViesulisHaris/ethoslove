"use client";

/**
 * The party, drawn: the invitation it arrives in, crepe streamers, a pleated paper fan, party hats,
 * balloons, confetti lying on the page, the cake with its candles, bunting and the marker doodles.
 * The animals are photographs cut out as stickers (../_shared/memes); everything here is drawn to
 * sit beside them as cut paper does — flat colour, a white die-cut edge where a sticker would have
 * one, a soft shadow — and every id carries a `useId` because a page draws a dozen of each.
 */
import { useId, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { PAPER_GRAIN, POSTER_FONT, SCRIPT_FONT } from "../_shared/cover-kit";
import { mulberry32 } from "../_shared/random";
import { mix } from "../_shared/theme";
import { MemeSticker } from "../_shared/memes/MemeSticker";
import { candleLayout, type CandlePlan, type Fleck } from "./scene";
import type { Hat, Look, Tone } from "./looks";

const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");
const r1 = (n: number) => Math.round(n * 10) / 10;

export const PARTY_KEYFRAMES = `
@keyframes pa-bob { 0%,100% { translate: 0 0 } 50% { translate: 0 calc(-1.3*var(--p)) } }
@keyframes pa-tilt { 0%,100% { rotate: -3.5deg } 50% { rotate: 3.5deg } }
@keyframes pa-squish { 0%,100% { scale: 1 1 } 45% { scale: 1.05 .95 } 70% { scale: .97 1.04 } }
@keyframes pa-flame { from { scale: 1 1; rotate: -4deg } to { scale: .9 1.08; rotate: 4deg } }
@keyframes pa-glow { from { opacity: .75 } to { opacity: 1 } }
@keyframes pa-smoke { from { opacity: .5; translate: 0 0; scale: .6 } to { opacity: 0; translate: 5px -40px; scale: 1.8 } }
@keyframes pa-float { 0%,100% { translate: 0 0; rotate: -2deg } 50% { translate: 0 calc(-1.6*var(--p)); rotate: 2deg } }
.pa-idle-bob { animation: pa-bob var(--pace) ease-in-out infinite; }
.pa-idle-tilt { animation: pa-tilt var(--pace) ease-in-out infinite; transform-origin: 50% 90%; }
.pa-idle-squish { animation: pa-squish var(--pace) ease-in-out infinite; transform-origin: 50% 100%; }
.pa-float { animation: pa-float var(--pace, 6s) ease-in-out infinite; transform-origin: 50% 100%; }
.pa-flame { transform-box: fill-box; transform-origin: 50% 100%; animation: pa-flame .7s ease-in-out infinite alternate; }
.pa-glow { animation: pa-glow .9s ease-in-out infinite alternate; }
.pa-wick { transition: opacity .22s ease-out, scale .22s ease-in; transform-box: fill-box; transform-origin: 50% 100%; }
.pa-wick[data-out] { opacity: 0; scale: .15; }
.pa-smoke { transform-box: fill-box; transform-origin: 50% 50%; animation: pa-smoke 1.7s ease-out forwards; }
@media (prefers-reduced-motion: reduce) {
  .pa-idle-bob, .pa-idle-tilt, .pa-idle-squish, .pa-float, .pa-flame, .pa-glow { animation: none; }
  .pa-wick { transition: none; }
  .pa-smoke { animation: none; opacity: 0; }
}
`;

/* ------------------------------------------------------------------------------------------ */
/* The invitation                                                                              */
/* ------------------------------------------------------------------------------------------ */

/** The outside of the flap folding up to its hinge: slow off the mark, fastest as it goes edge-on. */
const FOLD_UP = [0.42, 0, 1, 1] as const;

/**
 * An invitation seen from the flap side, sealed with a hamster in a party hat. Opening it throws
 * the hamster off, lifts the flap on its fold and draws the card up out of the pocket. Sized in
 * `--o`, the opener's own unit, so it stays whole on a short phone held sideways.
 *
 * Drawn flat, as XOXO's envelope is: the flap's outside folds up to the hinge and its inside
 * unfolds above it, each a squash about the hinge, and every layer keeps the place it is written
 * in (inside of the flap, card, pocket, closed flap). A 3D flip painted the open flap over the card.
 */
export function Invitation({ look, name, to, card, opening, reduce }: { look: Look; name: string; to: string; card: string; opening: boolean; reduce: boolean }) {
  const { body, flap, lining, liningPrint, ink } = look.envelope;
  const ease = [0.6, 0, 0.3, 1] as const;
  const lift = reduce ? 0 : 0.12;
  const foldUp = reduce ? 0.06 : 0.16;
  const unfold = reduce ? 0.09 : 0.44;
  const stripes = `repeating-linear-gradient(-45deg, ${lining} 0 calc(1.7*var(--o)), ${liningPrint} calc(1.7*var(--o)) calc(3.4*var(--o)))`;
  const dots = `radial-gradient(${mix(lining, body, 0.72)} calc(.45*var(--o)), transparent calc(.55*var(--o)))`;
  return (
    // isolate: the layers' z-indexes stay inside the invitation, so it stacks as one piece.
    <div className="relative isolate w-full" style={{ aspectRatio: "1.42", filter: "drop-shadow(0 calc(2.6*var(--o)) calc(3.6*var(--o)) rgba(40,15,25,.34))" }}>
      {/* the inside, and the striped lining */}
      <span aria-hidden="true" className="absolute inset-0 rounded-[calc(1.2*var(--o))]" style={{ backgroundColor: flap, backgroundImage: PAPER_GRAIN }} />
      <span aria-hidden="true" className="absolute inset-x-[3%] top-[3%] h-[58%] rounded-[calc(.8*var(--o))]" style={{ background: stripes }} />
      {/* the inside of the flap, once it is open: it unfolds upwards from the hinge, behind the card */}
      <motion.div aria-hidden="true" className="absolute inset-x-0 bottom-full h-[62%]" style={{ transformOrigin: "50% 100%" }} initial={false} animate={opening ? { scaleY: 1, scaleX: 1 } : { scaleY: 0, scaleX: 1.05 }} transition={opening ? { delay: lift + foldUp, duration: unfold, ease } : { duration: 0 }}>
        <span className="absolute inset-0 rounded-b-[calc(1.2*var(--o))]" style={{ backgroundColor: flap, backgroundImage: PAPER_GRAIN, clipPath: "polygon(0 100%, 100% 100%, 50% 0)" }} />
        <span className="absolute inset-0" style={{ background: "linear-gradient(0deg, transparent 40%, rgba(0,0,0,.13))", clipPath: "polygon(0 100%, 100% 100%, 50% 0)" }} />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <path d="M0 100 L50 0 L100 100" fill="none" stroke={look.dark ? "rgba(255,255,255,.22)" : "rgba(60,30,20,.24)"} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        </svg>
      </motion.div>
      {/* the card, which rises */}
      <motion.div className="absolute inset-x-[7%] top-[8%] h-[84%] overflow-hidden rounded-[calc(.6*var(--o))] px-[7%] pt-[6%] text-center" style={{ backgroundColor: "#FFFDF8", backgroundImage: PAPER_GRAIN, color: "#2E2622", boxShadow: "0 0 calc(1.4*var(--o)) rgba(0,0,0,.2)" }} animate={opening ? { y: "-60%" } : { y: 0 }} transition={{ duration: reduce ? 0.15 : 0.75, delay: opening && !reduce ? 0.34 : 0, ease }}>
        <p className="text-[calc(2.3*var(--o))] leading-none font-semibold tracking-[0.34em] uppercase opacity-60">{card}</p>
        <p className="mt-[calc(1.4*var(--o))] truncate text-[calc(7*var(--o))] leading-[1.3]" style={{ fontFamily: SCRIPT_FONT }}>
          {name}
        </p>
        <span aria-hidden="true" className="mx-auto mt-[calc(1*var(--o))] flex w-[70%] justify-between">
          {look.confetti.slice(0, 5).map((c, i) => (
            <i key={i} className="block h-[calc(1.3*var(--o))] w-[calc(1.3*var(--o))] rounded-full" style={{ background: c === "#FFFFFF" ? look.tiles[0] : c }} />
          ))}
        </span>
      </motion.div>
      {/* the pocket, folded over the card */}
      <span aria-hidden="true" className="absolute inset-0 rounded-[calc(1.2*var(--o))]" style={{ backgroundColor: body, backgroundImage: `${PAPER_GRAIN}, ${dots}`, backgroundSize: "auto, calc(5*var(--o)) calc(5*var(--o))", clipPath: "polygon(0 0, 50% 56%, 100% 0, 100% 100%, 0 100%)" }} />
      <span aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.1), transparent 55%)", clipPath: "polygon(0 100%, 50% 52%, 100% 100%)" }} />
      <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
        <path d="M0 100 L50 52 L100 100" fill="none" stroke={look.dark ? "rgba(255,255,255,.18)" : "rgba(60,30,20,.2)"} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <p className="absolute inset-x-[8%] bottom-[6%] truncate text-center text-[calc(6*var(--o))] leading-[1.35]" style={{ fontFamily: SCRIPT_FONT, color: ink, opacity: 0.88 }}>
        {to} {name}
      </p>
      {/* the closed flap, hinged along the top: it folds up to the hinge, and the inside takes over */}
      <motion.div className="absolute inset-x-0 top-0 z-[3] h-[62%] origin-top" initial={false} animate={opening ? { scaleY: 0, scaleX: 1.05 } : { scaleY: 1, scaleX: 1 }} transition={opening ? { duration: foldUp, delay: lift, ease: FOLD_UP } : { duration: 0 }}>
        <span aria-hidden="true" className="absolute inset-0 rounded-t-[calc(1.2*var(--o))]" style={{ backgroundColor: flap, backgroundImage: PAPER_GRAIN, clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
        <span aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,.13))", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
        <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <path d="M0 0 L50 100 L100 0" fill="none" stroke={look.dark ? "rgba(255,255,255,.22)" : "rgba(60,30,20,.24)"} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        </svg>
      </motion.div>
      {/* the seal: a hamster in a party hat, holding the flap down */}
      <motion.div className="absolute top-[36%] left-1/2 z-[4] w-[27%]" style={{ x: "-50%", y: "-50%", rotate: -6 }} animate={opening ? { y: ["-50%", "-78%", "-190%"], rotate: [-6, -18, 24], scale: [1, 1.2, 0.9], opacity: [1, 1, 0] } : { y: "-50%", rotate: -6, scale: 1, opacity: 1 }} transition={{ duration: reduce ? 0.15 : 0.62, times: [0, 0.35, 1], ease: "easeOut" }}>
        <MemeSticker id="hamster-cake" width="100%" />
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Paper on the wall                                                                           */
/* ------------------------------------------------------------------------------------------ */

type Pt = [number, number];

/**
 * A length of twisted crepe paper, pinned at both ends and sagging between them. The strip turns
 * over on itself `twists` times, which shows as a narrowing and a change of shade, and the crepe's
 * fine creases run across it. Coordinates are the section's own `--p`.
 */
export function Streamer({ from, to, sag, bend = 0, width = 5, twists = 9, color, seed }: { from: Pt; to: Pt; sag: number; bend?: number; width?: number; twists?: number; color: string; seed: number }) {
  const [ax, ay] = from;
  const [bx, by] = to;
  const cx = (ax + bx) / 2 + bend * 2;
  const cy = (ay + by) / 2 + sag * 2;
  const phase = mulberry32(seed)();
  const shade = mix(color, "#3A2030", 0.16);
  const crease = mix(color, "#3A2030", 0.34);
  const steps = 150;
  const samples = Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * cx + t * t * bx;
    const y = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * cy + t * t * by;
    const dx = 2 * (1 - t) * (cx - ax) + 2 * t * (bx - cx);
    const dy = 2 * (1 - t) * (cy - ay) + 2 * t * (by - cy);
    const len = Math.hypot(dx, dy) || 1;
    const s = twists * t + phase;
    const half = (width / 2) * (0.2 + 0.8 * Math.abs(Math.cos(Math.PI * s)));
    return { x, y, nx: -dy / len, ny: dx / len, half, face: Math.floor(s + 0.5) };
  });
  const segments: { face: number; d: string; shine: string }[] = [];
  let start = 0;
  for (let i = 1; i <= steps; i++) {
    if (i === steps || samples[i].face !== samples[start].face) {
      const run = samples.slice(start, i + 1);
      const left = run.map((p) => `${r1(p.x + p.nx * p.half)} ${r1(p.y + p.ny * p.half)}`);
      const right = run.map((p) => `${r1(p.x - p.nx * p.half)} ${r1(p.y - p.ny * p.half)}`).reverse();
      const shine = run.map((p, k) => `${k ? "L" : "M"}${r1(p.x + p.nx * p.half * 0.45)} ${r1(p.y + p.ny * p.half * 0.45)}`).join(" ");
      segments.push({ face: samples[start].face, d: `M${left.join(" L")} L${right.join(" L")} Z`, shine });
      start = i;
    }
  }
  const creases = samples
    .map((p) => `M${r1(p.x + p.nx * p.half * 0.94)} ${r1(p.y + p.ny * p.half * 0.94)} L${r1(p.x - p.nx * p.half * 0.94)} ${r1(p.y - p.ny * p.half * 0.94)}`)
    .join(" ");
  return (
    <g>
      {segments.map((seg, i) => (
        <path key={i} d={seg.d} fill={seg.face % 2 ? shade : color} />
      ))}
      <path d={creases} stroke={crease} strokeWidth=".14" opacity=".32" />
      {segments.map((seg, i) => (seg.face % 2 ? null : <path key={`s${i}`} d={seg.shine} fill="none" stroke="#FFFFFF" strokeWidth=".35" strokeLinecap="round" opacity=".3" />))}
    </g>
  );
}

/** An SVG as big as its section, in the section's own units, for streamers and confetti to be drawn on. */
export function Layer({ height, shadow = false, className, children }: { height: number; shadow?: boolean; className?: string; children: ReactNode }) {
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true" className={cn("pointer-events-none absolute inset-0 h-full w-full overflow-hidden", className)} style={shadow ? { filter: "drop-shadow(0 calc(.5*var(--p)) calc(.7*var(--p)) rgba(40,15,25,.22))" } : undefined}>
      {children}
    </svg>
  );
}

/** Paper confetti lying flat on the page. */
export function Flecks({ flecks, colors }: { flecks: Fleck[]; colors: string[] }) {
  return (
    <>
      {flecks.map((f, i) => {
        const color = colors[f.color % colors.length];
        const at = `translate(${f.x} ${f.y}) rotate(${f.rotate})`;
        const s = f.size;
        if (f.kind === "dot") return <circle key={i} cx={f.x} cy={f.y} r={r1(0.62 * s)} fill={color} opacity=".95" />;
        if (f.kind === "strip") return <rect key={i} x={-1.4 * s} y={-0.38 * s} width={2.8 * s} height={0.76 * s} rx=".15" fill={color} transform={at} opacity=".95" />;
        if (f.kind === "curl") return <path key={i} d={`M${-2.2 * s} 0 q${0.55 * s} ${-1.3 * s} ${1.1 * s} 0 t${1.1 * s} 0 t${1.1 * s} 0 t${1.1 * s} 0`} fill="none" stroke={color} strokeWidth={0.42 * s} strokeLinecap="round" transform={at} />;
        return <path key={i} d={starPath(1.1 * s, 0.48 * s)} fill={color} transform={at} opacity=".95" />;
      })}
    </>
  );
}

/** A five-pointed star as a path round the origin. */
function starPath(outer: number, inner: number): string {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 ? inner : outer;
    return `${r1(Math.cos(a) * r)} ${r1(Math.sin(a) * r)}`;
  });
  return `M${pts.join(" L")} Z`;
}

/** A pleated paper fan, the kind taped behind the table at a party: folds in two shades and a button in the middle. */
export function PaperFan({ fan, pleats = 30, className, style }: { fan: Look["fan"]; pleats?: number; className?: string; style?: CSSProperties }) {
  const outer = 50;
  const valley = 45.5;
  const wedges = Array.from({ length: pleats }, (_, i) => {
    const a0 = (i / pleats) * Math.PI * 2;
    const a1 = ((i + 1) / pleats) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    const p = (a: number, r: number) => `${r1(50 + Math.cos(a) * r)} ${r1(50 + Math.sin(a) * r)}`;
    return { d: `M50 50 L${p(a0, valley)} L${p(am, outer)} L${p(a1, valley)} Z`, fold: `M50 50 L${p(am, outer)}`, i };
  });
  return (
    <svg viewBox="-2 -2 104 104" aria-hidden="true" className={className} style={{ overflow: "visible", filter: "drop-shadow(0 calc(.8*var(--p)) calc(1.2*var(--p)) rgba(40,15,25,.22))", ...style }}>
      {wedges.map((w) => (
        <path key={w.i} d={w.d} fill={w.i % 2 ? fan.dark : fan.light} />
      ))}
      {wedges.map((w) => (
        <path key={`f${w.i}`} d={w.fold} stroke={mix(fan.dark, "#3A2030", 0.3)} strokeWidth=".25" opacity=".4" />
      ))}
      <circle cx="50" cy="50" r="10" fill={fan.middle} stroke="#FFFFFF" strokeWidth="1.6" />
      <circle cx="50" cy="50" r="6.2" fill={mix(fan.middle, "#FFFFFF", 0.25)} opacity=".8" />
    </svg>
  );
}

/** A paper party hat, die-cut: dots, stripes or a zigzag round the cone, and a pompom on top. */
export function PartyHat({ hat, className, style }: { hat: Hat; className?: string; style?: CSSProperties }) {
  const uid = safeId(useId());
  const cone = "M30 12 L7 70 Q30 80 53 70 Z";
  return (
    <svg viewBox="0 0 60 84" aria-hidden="true" className={className} style={{ overflow: "visible", filter: "drop-shadow(0 calc(.5*var(--p)) calc(.8*var(--p)) rgba(40,15,25,.28))", ...style }}>
      <defs>
        <clipPath id={`${uid}-c`}>
          <path d={cone} />
        </clipPath>
        <linearGradient id={`${uid}-s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".28" />
          <stop offset=".45" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity=".16" />
        </linearGradient>
      </defs>
      {/* the white edge, then the cone */}
      <path d={cone} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="6" strokeLinejoin="round" />
      <circle cx="30" cy="9" r="9.5" fill="#FFFFFF" />
      <path d={cone} fill={hat.cone} />
      <g clipPath={`url(#${uid}-c)`}>
        {hat.kind === "dots"
          ? [
              [26, 30],
              [35, 38],
              [21, 46],
              [32, 54],
              [42, 60],
              [16, 62],
              [27, 68],
              [38, 72],
            ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" fill={hat.print} />)
          : hat.kind === "stripes"
            ? Array.from({ length: 7 }, (_, i) => <rect key={i} x="-10" y={18 + i * 10} width="80" height="4.4" fill={hat.print} transform={`rotate(-24 30 ${18 + i * 10})`} />)
            : [30, 46, 62].map((y, i) => <path key={i} d={`M0 ${y} l5 -4 l5 4 l5 -4 l5 4 l5 -4 l5 4 l5 -4 l5 4 l5 -4 l5 4 l5 -4 l5 4`} fill="none" stroke={hat.print} strokeWidth="2.6" strokeLinejoin="round" />)}
        <rect x="0" y="0" width="60" height="84" fill={`url(#${uid}-s)`} />
      </g>
      {/* the ruffle round the brim */}
      <path d="M7 70 Q30 80 53 70" fill="none" stroke="#FFFFFF" strokeWidth="4.2" strokeLinecap="round" strokeDasharray="0.1 4.4" />
      {/* the pompom */}
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <circle key={a} cx={30 + Math.cos((a * Math.PI) / 180) * 4.6} cy={9 + Math.sin((a * Math.PI) / 180) * 4.6} r="3.6" fill={hat.pompom} />
      ))}
      <circle cx="30" cy="9" r="4.4" fill={hat.pompom} />
      <circle cx="28" cy="7" r="1.6" fill="#FFFFFF" opacity=".55" />
    </svg>
  );
}

/** A latex balloon on a curled string: glossy, with a knot. */
export function Balloon({ tone, seed, className, style }: { tone: Tone; seed: number; className?: string; style?: CSSProperties }) {
  const uid = safeId(useId());
  const rng = mulberry32(seed);
  const curl = 0.8 + rng() * 0.5;
  const lean = (rng() - 0.5) * 10;
  const body = "M0 -36 C18 -36 29 -22 29 -5 C29 13 15 26 0 33 C-15 26 -29 13 -29 -5 C-29 -22 -18 -36 0 -36 Z";
  return (
    <svg viewBox="-32 -38 64 150" aria-hidden="true" className={className} style={{ overflow: "visible", filter: "drop-shadow(0 calc(.7*var(--p)) calc(1*var(--p)) rgba(40,15,25,.22))", ...style }}>
      <defs>
        <radialGradient id={`${uid}-b`} cx="36%" cy="28%" r="74%">
          <stop offset="0" stopColor={tone.light} />
          <stop offset=".5" stopColor={tone.mid} />
          <stop offset="1" stopColor={tone.deep} />
        </radialGradient>
      </defs>
      <path d={`M0 38 C${7 * curl} 52 ${-9 * curl} 64 ${lean * 0.2} 78 C${8 * curl} 90 ${-7 * curl} 100 ${2 + lean * 0.3} 110`} fill="none" stroke={mix(tone.deep, "#FFFFFF", 0.35)} strokeWidth="1.1" strokeLinecap="round" />
      <path d={body} fill={`url(#${uid}-b)`} />
      <ellipse cx="-11" cy="-19" rx="5.2" ry="10" transform="rotate(-24 -11 -19)" fill="#FFFFFF" opacity=".42" />
      <ellipse cx="-12" cy="-21" rx="2.4" ry="5.4" transform="rotate(-24 -12 -21)" fill="#FFFFFF" opacity=".75" />
      <path d="M19 -18 C24 -10 25 -1 22 8" fill="none" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity=".22" />
      <path d="M-4 33 L0 39 L4 33 Z" fill={tone.deep} />
    </svg>
  );
}

/** The x of each character of a number drawn as one text node, `pitch` apart round `center`. */
export const spread = (count: number, center: number, pitch: number): string => Array.from({ length: count }, (_, i) => r1(center + (i - (count - 1) / 2) * pitch)).join(" ");

/**
 * Their age in foil number balloons: a heavy soft digit filled with gold (or rose, or whatever the
 * page's foil is), shade at the rims, a crease or two and a shine, and a tail with a string under
 * each digit. The whole number is one text node placed a character at a time, so it reads as one
 * age to anything that reads the page, and each digit still hangs where a balloon would.
 */
export function FoilNumber({ value, foil, className, style }: { value: string; foil: Look["foil"]; className?: string; style?: CSSProperties }) {
  const uid = safeId(useId());
  const n = Math.max(1, [...value].length);
  const pitch = 70;
  const w = 88 + (n - 1) * pitch;
  const xs = spread(n, w / 2, pitch);
  const text = { x: xs, y: 98, textAnchor: "middle" as const, fontSize: 104, style: { fontFamily: "var(--font-gift-display), Georgia, serif", fontWeight: 900, fontVariationSettings: '"wght" 900, "SOFT" 100, "opsz" 144' } };
  return (
    <svg viewBox={`0 0 ${w} 150`} className={className} style={{ overflow: "visible", filter: "drop-shadow(0 calc(.7*var(--p)) calc(1*var(--p)) rgba(40,15,25,.25))", ...style }} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={foil.light} />
          <stop offset=".3" stopColor={foil.mid} />
          <stop offset=".55" stopColor={foil.deep} />
          <stop offset=".72" stopColor={foil.mid} />
          <stop offset=".9" stopColor={foil.light} />
          <stop offset="1" stopColor={foil.deep} />
        </linearGradient>
        <linearGradient id={`${uid}-sh`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset=".42" stopColor="#FFFFFF" stopOpacity=".22" />
          <stop offset=".5" stopColor="#FFFFFF" stopOpacity=".55" />
          <stop offset=".58" stopColor="#FFFFFF" stopOpacity=".2" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${uid}-t`}>
          <text {...text}>{value}</text>
        </clipPath>
      </defs>
      {xs.split(" ").map((x, i) => (
        <g key={i}>
          <path d={`M${x} 100 l-4 10 h8 Z`} fill={foil.deep} />
          <path d={`M${x} 110 C${Number(x) + 6} 120 ${Number(x) - 5} 128 ${Number(x) + (i % 2 ? -2 : 2)} 148`} fill="none" stroke={foil.deep} strokeWidth="1.4" strokeLinecap="round" opacity=".85" />
        </g>
      ))}
      <text {...text} fill={`url(#${uid}-f)`} stroke={foil.edge} strokeWidth="2.4" strokeOpacity=".85" paintOrder="stroke" strokeLinejoin="round">
        {value}
      </text>
      <g clipPath={`url(#${uid}-t)`}>
        <rect x="0" y="0" width={w} height="110" fill={`url(#${uid}-sh)`} />
        {xs.split(" ").map((x, i) => (
          <g key={i}>
            <path d={`M${Number(x) - 34} 44 C${Number(x) - 16} 50 ${Number(x) - 4} 38 ${Number(x) + 18} 46 M${Number(x) - 14} 78 C${Number(x) + 2} 70 ${Number(x) + 14} 84 ${Number(x) + 34} 76`} fill="none" stroke="#FFFFFF" strokeWidth="1.4" strokeOpacity=".5" strokeLinecap="round" />
            <ellipse cx={Number(x) - 18} cy="26" rx="4.5" ry="11" transform={`rotate(-18 ${Number(x) - 18} 26)`} fill="#FFFFFF" opacity=".7" />
          </g>
        ))}
      </g>
    </svg>
  );
}

/** A small present with a bow, die-cut. */
export function Present({ box, ribbon, className, style }: { box: string; ribbon: string; className?: string; style?: CSSProperties }) {
  const silhouette = "M6 26 h48 v30 a3 3 0 0 1 -3 3 h-42 a3 3 0 0 1 -3 -3 Z M3 17 h54 v10 h-54 Z";
  return (
    <svg viewBox="0 0 60 62" aria-hidden="true" className={className} style={{ overflow: "visible", filter: "drop-shadow(0 calc(.5*var(--p)) calc(.8*var(--p)) rgba(40,15,25,.28))", ...style }}>
      <path d={silhouette} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" strokeLinejoin="round" />
      <path d="M30 16 C22 2 8 5 13 13 C16 18 25 18 30 16 Z M30 16 C38 2 52 5 47 13 C44 18 35 18 30 16 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="5" strokeLinejoin="round" />
      <path d="M6 26 h48 v30 a3 3 0 0 1 -3 3 h-42 a3 3 0 0 1 -3 -3 Z" fill={box} />
      <path d="M3 17 h54 v10 h-54 Z" fill={mix(box, "#FFFFFF", 0.14)} />
      <path d="M6 27 h48" stroke="#000000" strokeOpacity=".12" strokeWidth="1.4" />
      <path d="M30 17 v42" stroke={ribbon} strokeWidth="7" />
      <path d="M30 16 C22 2 8 5 13 13 C16 18 25 18 30 16 Z M30 16 C38 2 52 5 47 13 C44 18 35 18 30 16 Z" fill={ribbon} />
      <circle cx="30" cy="16" r="3.4" fill={mix(ribbon, "#000000", 0.12)} />
    </svg>
  );
}

/** Pennants on a slack string, in the page's colours, a few of them dotted. */
export function Bunting({ colors, count = 11, sag = 4, seed, className }: { colors: string[]; count?: number; sag?: number; seed: number; className?: string }) {
  const rng = mulberry32(seed);
  const w = (100 / count) * 0.8;
  const h = w * 1.3;
  return (
    <svg viewBox="0 -2 100 18" aria-hidden="true" className={className} style={{ overflow: "visible", filter: "drop-shadow(0 calc(.4*var(--p)) calc(.6*var(--p)) rgba(40,15,25,.22))" }}>
      <path d={`M-2 0 Q50 ${2 * sag} 102 0`} fill="none" stroke="#3A2E2A" strokeOpacity=".55" strokeWidth=".45" />
      {Array.from({ length: count }, (_, i) => {
        const t = (i + 0.5) / count;
        const x = -2 + 104 * t;
        const y = 2 * t * (1 - t) * 2 * sag;
        const angle = (Math.atan2(2 * sag * (1 - 2 * t) * 2, 104) * 180) / Math.PI + (rng() - 0.5) * 6;
        const color = colors[i % colors.length];
        const light = color.toUpperCase() === "#FFFFFF" || color.toUpperCase() === "#FFFDF8" || color.toUpperCase() === "#FFFEF6";
        return (
          <g key={i} transform={`translate(${r1(x)} ${r1(y)}) rotate(${r1(angle)})`}>
            <path d={`M${-w / 2} 0 L${w / 2} 0 L0 ${h} Z`} fill={color} stroke="#FFFFFF" strokeWidth=".9" strokeLinejoin="round" paintOrder="stroke" />
            {i % 3 === 1 ? [0.28, 0.52].map((f, k) => <circle key={k} cx={(k ? 0.9 : -0.9) * (w / 6)} cy={h * f} r={w * 0.07} fill={light ? colors[(i + 1) % colors.length] : "#FFFFFF"} opacity=".8" />) : null}
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Marker                                                                                      */
/* ------------------------------------------------------------------------------------------ */

/** A felt-tip underline with a loop at the end, drawn as it scrolls into view. */
export function Swash({ color, still, className }: { color: string; still: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 160 30" className={className} aria-hidden="true" style={{ overflow: "visible" }}>
      <motion.path d="M4 20 C40 12 80 10 118 14 C136 16 150 20 146 26 C142 32 124 22 136 12 C144 6 152 8 156 4" fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" initial={still ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 1.1, delay: 0.7, ease: "easeInOut" }} />
    </svg>
  );
}

/** A curly marker arrow, pointing right; flip it with a scale. */
export function Arrow({ color, className, style }: { color: string; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 60 30" className={className} style={{ overflow: "visible", ...style }} aria-hidden="true">
      <path d="M3 22 C14 8 26 30 36 16 C42 8 48 10 55 12" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M47 5 L56 12 L47 19" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A four-pointed sparkle. */
export function Sparkle({ color, className, style }: { color: string; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 40 40" className={className} style={style} aria-hidden="true">
      <path d="M20 2c1.6 9.4 7.6 15.4 18 18-10.4 2.6-16.4 8.6-18 18-1.6-9.4-7.6-15.4-18-18 10.4-2.6 16.4-8.6 18-18Z" fill={color} />
    </svg>
  );
}

/** A tick in a box on the guest list, drawn in when the guest has said hi. */
export function Tick({ on, color, still }: { on: boolean; color: string; still: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full overflow-visible" aria-hidden="true">
      <rect x="2" y="3" width="19" height="18" rx="2.5" fill="none" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.8" transform="rotate(-3 12 12)" />
      {on ? <motion.path d="M5 12.5 L10.5 18 L23 1" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" initial={still ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, ease: "easeOut" }} /> : null}
    </svg>
  );
}

/** The little burst that marks a guest as greeted. */
export function Spark({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <path d="M12 1.5l2.6 6.9 7.4.4-5.8 4.6 2 7.1L12 16.4l-6.2 4.1 2-7.1L2 8.8l7.4-.4z" fill={color} stroke="#FFFFFF" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** A rubber stamp, pressed a little crooked. */
export function RubberStamp({ children, color, className }: { children: ReactNode; color: string; className?: string }) {
  return (
    <span className={cn("inline-block rounded-[calc(1.4*var(--p))] px-[calc(3.2*var(--p))] py-[calc(1.4*var(--p))] text-center text-[calc(5.6*var(--p))] leading-[1] whitespace-nowrap uppercase", className)} style={{ color, fontFamily: POSTER_FONT, border: `calc(.9*var(--p)) double ${color}`, background: "rgba(255,255,255,.55)", opacity: 0.92, letterSpacing: "0.06em" }}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* The cake                                                                                    */
/* ------------------------------------------------------------------------------------------ */

/** The drawing's box; the wrapper keeps this ratio. */
export const CAKE_BOX = { w: 200, h: 196 };

const NUMBER_FACE: CSSProperties = { fontFamily: "var(--font-gift-display), Georgia, serif", fontWeight: 900, fontVariationSettings: '"wght" 900, "SOFT" 100, "opsz" 144' };

/** Icing over a tier's top edge, dripping in rounded tongues of different lengths. */
function drips(x: number, y: number, w: number, rng: () => number): string {
  const n = Math.max(5, Math.round(w / 13));
  const step = w / n;
  let d = `M${x} ${y - 3} h${w} v5`;
  for (let i = n - 1; i >= 0; i--) {
    const cx = x + step * (i + 0.5);
    const len = 5 + rng() * 12;
    const r = step * 0.4;
    d += ` L${r1(cx + r)} ${y + 2} C${r1(cx + r)} ${r1(y + 2 + len)} ${r1(cx - r)} ${r1(y + 2 + len)} ${r1(cx - r)} ${y + 2}`;
  }
  return `${d} L${x} ${y + 2} Z`;
}

/**
 * The cake: two tiers on a plate, icing dripping over both, sprinkles, piped dots, the age in
 * number candles and thin striped candles round them. `out` puts the flames out left to right
 * and lets a curl of smoke off each wick; `still` holds the flames steady.
 */
export function Cake({ look, plan, out, still, seed, confetti }: { look: Look; plan: CandlePlan; out: boolean; still: boolean; seed: number; confetti: string[] }) {
  const uid = safeId(useId());
  const c = look.cake;
  const rng = mulberry32(seed);
  const candles = candleLayout(plan);
  const digits = candles.filter((k) => k.kind === "digit");
  const bottom = { x: 26, y: 120, w: 148, h: 58 };
  const top = { x: 56, y: 78, w: 88, h: 44 };
  const sprinkles = Array.from({ length: 30 }, (_, i) => {
    const tier = i % 3 === 0 ? top : bottom;
    return { x: tier.x + 8 + rng() * (tier.w - 16), y: tier.y + 18 + rng() * (tier.h - 26), rot: Math.round(rng() * 180), color: confetti[i % confetti.length] };
  });
  const dots = (tier: typeof top) => Array.from({ length: Math.round(tier.w / 8) }, (_, k) => tier.x + 4 + k * (tier.w - 8) / (Math.round(tier.w / 8) - 1));
  const ink = "rgba(70,30,40,.3)";
  return (
    <svg viewBox={`0 0 ${CAKE_BOX.w} ${CAKE_BOX.h}`} aria-hidden="true" className="h-full w-full" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`${uid}-b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={c.baseDeep} />
          <stop offset=".22" stopColor={c.base} />
          <stop offset=".72" stopColor={c.base} />
          <stop offset="1" stopColor={c.baseDeep} />
        </linearGradient>
        <linearGradient id={`${uid}-t`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={c.topDeep} />
          <stop offset=".22" stopColor={c.top} />
          <stop offset=".72" stopColor={c.top} />
          <stop offset="1" stopColor={c.topDeep} />
        </linearGradient>
        <radialGradient id={`${uid}-g`}>
          <stop offset="0" stopColor="#FFC56B" stopOpacity=".6" />
          <stop offset="1" stopColor="#FFB04A" stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-s`} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        {digits.length ? (
          <clipPath id={`${uid}-num`}>
            <text x={digits.map((k) => k.x).join(" ")} y="80" textAnchor="middle" fontSize={digits[0].size} style={NUMBER_FACE}>
              {digits.map((k) => k.digit).join("")}
            </text>
          </clipPath>
        ) : null}
        {candles.map((k, i) =>
          k.kind === "thin" ? (
            <clipPath key={i} id={`${uid}-d${i}`}>
              <rect x={k.x - 3.4} y={k.top} width="6.8" height="28" rx="2" />
            </clipPath>
          ) : null,
        )}
      </defs>

      {/* the plate, and the shadow under it */}
      <ellipse cx="100" cy="186" rx="88" ry="7" fill="#000000" opacity=".22" filter={`url(#${uid}-s)`} />
      <ellipse cx="100" cy="180" rx="94" ry="11" fill={c.plate} stroke="#FFFFFF" strokeWidth="5" paintOrder="stroke" />
      <ellipse cx="100" cy="180" rx="94" ry="11" fill="none" stroke={ink} strokeWidth=".8" />
      <ellipse cx="100" cy="178.5" rx="80" ry="7" fill="none" stroke="#000000" strokeOpacity=".06" strokeWidth="1.2" />

      {/* the white die-cut edge round both tiers */}
      {[bottom, top].map((t, i) => (
        <rect key={i} x={t.x} y={t.y - 4} width={t.w} height={t.h + 4} rx="7" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="6" />
      ))}

      {/* the tiers, bottom first */}
      {[
        { t: bottom, fill: `url(#${uid}-b)` },
        { t: top, fill: `url(#${uid}-t)` },
      ].map(({ t, fill }, i) => (
        <g key={i}>
          <rect x={t.x} y={t.y} width={t.w} height={t.h} rx="6" fill={fill} />
          <rect x={t.x} y={t.y + t.h - 9} width={t.w} height="9" rx="4" fill="#000000" opacity=".05" />
          {dots(t).map((x, k) => (
            <circle key={k} cx={r1(x)} cy={t.y + t.h - 1.5} r="3.6" fill={c.icing} stroke={ink} strokeWidth=".5" />
          ))}
          <path d={drips(t.x - 2, t.y + 1, t.w + 4, rng)} fill={c.drip} />
          <path d={`M${t.x + 5} ${t.y - 1} h${t.w - 10}`} stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
        </g>
      ))}
      {sprinkles.map((s, i) => (
        <rect key={i} x={r1(s.x)} y={r1(s.y)} width="4.4" height="1.6" rx=".8" fill={s.color === "#FFFFFF" ? c.drip : s.color} transform={`rotate(${s.rot} ${r1(s.x)} ${r1(s.y)})`} />
      ))}

      {/* the candles: the age as one number, and thin striped ones */}
      {digits.length ? (
        <g>
          <text x={digits.map((k) => k.x).join(" ")} y="80" textAnchor="middle" fontSize={digits[0].size} fill={c.candle} stroke="#FFFFFF" strokeWidth="3.6" strokeLinejoin="round" paintOrder="stroke" style={NUMBER_FACE}>
            {digits.map((k) => k.digit).join("")}
          </text>
          <g clipPath={`url(#${uid}-num)`}>
            {Array.from({ length: 16 }, (_, s) => (
              <rect key={s} x="20" y={digits[0].top - 16 + s * 8} width="160" height="3" fill={c.stripe} opacity=".55" transform={`rotate(-28 100 ${digits[0].top - 16 + s * 8})`} />
            ))}
          </g>
          {digits.map((k, i) => (
            <path key={i} d={`M${k.x} ${k.top + 1} v-6`} stroke="#3A2A24" strokeWidth="1.2" strokeLinecap="round" />
          ))}
        </g>
      ) : null}
      {candles.map((k, i) =>
        k.kind === "thin" ? (
          <g key={i}>
            <rect x={k.x - 3.4} y={k.top} width="6.8" height="28" rx="2" fill="#FFF8EF" stroke="#FFFFFF" strokeWidth="2.4" paintOrder="stroke" />
            <g clipPath={`url(#${uid}-d${i})`}>
              {Array.from({ length: 6 }, (_, s) => (
                <rect key={s} x={k.x - 8} y={k.top - 2 + s * 6} width="16" height="2.6" fill={c.candle} transform={`rotate(-30 ${k.x} ${k.top - 2 + s * 6})`} />
              ))}
            </g>
            <path d={`M${k.x} ${k.top} v-5`} stroke="#3A2A24" strokeWidth="1.1" strokeLinecap="round" />
          </g>
        ) : null,
      )}

      {/* the flames, and the smoke when they go */}
      {candles.map((k, i) => (
        <g key={`f${i}`} transform={`translate(${k.x} ${k.wick})`}>
          <g className="pa-wick" data-out={out ? "" : undefined} style={{ transitionDelay: out ? `${i * 70}ms` : "0ms" }}>
            <circle cx="0" cy="-8" r="15" fill={`url(#${uid}-g)`} className={still ? undefined : "pa-glow"} />
            <g className={still ? undefined : "pa-flame"} style={{ animationDelay: `${-i * 0.23}s` }}>
              <path d="M0 -19 C5.5 -12 7 -6 7 -2 C7 2.5 3.8 5 0 5 C-3.8 5 -7 2.5 -7 -2 C-7 -6 -5.5 -12 0 -19 Z" fill="#FF9A3D" />
              <path d="M0 -11 C3 -7 4 -4 4 -1.5 C4 1.4 2.2 3 0 3 C-2.2 3 -4 1.4 -4 -1.5 C-4 -4 -3 -7 0 -11 Z" fill="#FFD86B" />
              <ellipse cx="0" cy="1" rx="1.8" ry="2.4" fill="#FFF7DC" />
            </g>
          </g>
          {out
            ? [0, 1, 2].map((p) => <circle key={p} cx={p - 1} cy={-4 - p * 3} r={2.6 + p} fill="#9A948C" className="pa-smoke" style={{ animationDelay: `${i * 70 + p * 160}ms`, opacity: 0 }} />)
            : null}
        </g>
      ))}
    </svg>
  );
}
