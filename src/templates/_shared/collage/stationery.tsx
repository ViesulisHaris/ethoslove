"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { mulberry32 } from "../random";

/**
 * The desk drawer the newer collages share: washi tape in a few prints, a gold binder clip, a heart
 * paperclip, pearls, pen doodles, a sprig of baby's breath, watercolour washes and grid paper. All of
 * it is drawn here, so none of it belongs to anyone's illustration, and every size is in `--p`.
 */

export type WashiPattern = "gingham" | "hearts" | "dots" | "stripes" | "grid" | "plain";

/** The torn ends of a strip of tape: a little zigzag down each short side. */
const TAPE_ENDS = (() => {
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= 8; i++) {
    const y = (i / 8) * 100;
    left.push(`${i % 2 ? 2.6 : 0}% ${y}%`);
    right.unshift(`${i % 2 ? 97.4 : 100}% ${y}%`);
  }
  return `polygon(${[...left, ...right].join(", ")})`;
})();

const heartTile = (ink: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><path d='M10 15.6s-4.8-2.9-6.1-5.8C3 7.6 4.1 5.2 6.5 5.2c1.3 0 2.3.7 3.5 2.1 1.2-1.4 2.2-2.1 3.5-2.1 2.4 0 3.5 2.4 2.6 4.6-1.3 2.9-6.1 5.8-6.1 5.8Z' fill='${ink}'/></svg>`)}")`;

/** The print on a strip of washi tape. */
function washiPrint(pattern: WashiPattern, color: string, ink: string): CSSProperties {
  switch (pattern) {
    case "gingham":
      return { backgroundColor: color, backgroundImage: `repeating-linear-gradient(0deg, ${ink} 0 calc(.8*var(--p)), transparent calc(.8*var(--p)) calc(1.6*var(--p))), repeating-linear-gradient(90deg, ${ink} 0 calc(.8*var(--p)), transparent calc(.8*var(--p)) calc(1.6*var(--p)))` };
    case "hearts":
      return { backgroundColor: color, backgroundImage: heartTile(ink), backgroundSize: "calc(3*var(--p)) calc(3*var(--p))" };
    case "dots":
      return { backgroundColor: color, backgroundImage: `radial-gradient(circle, ${ink} 0 calc(.32*var(--p)), transparent calc(.36*var(--p)))`, backgroundSize: "calc(1.6*var(--p)) calc(1.6*var(--p))" };
    case "stripes":
      return { backgroundColor: color, backgroundImage: `repeating-linear-gradient(135deg, ${ink} 0 calc(.7*var(--p)), transparent calc(.7*var(--p)) calc(1.6*var(--p)))` };
    case "grid":
      return { backgroundColor: color, backgroundImage: `linear-gradient(${ink} 1px, transparent 1px), linear-gradient(90deg, ${ink} 1px, transparent 1px)`, backgroundSize: "calc(1.4*var(--p)) calc(1.4*var(--p))" };
    default:
      return { backgroundColor: color };
  }
}

/**
 * A strip of washi tape, laid over whatever it holds down. `width` is in `--p`. It is see-through the
 * way real washi is, and has torn ends; place it with `className`/`style` like any absolute piece.
 */
export function Washi({ pattern = "plain", color, ink = "rgba(255,255,255,.55)", width = 18, className, style }: { pattern?: WashiPattern; color: string; ink?: string; width?: number; className?: string; style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute z-[2] block", className)}
      style={{ width: `calc(${width} * var(--p))`, height: "calc(4.6*var(--p))", clipPath: TAPE_ENDS, opacity: 0.88, ...washiPrint(pattern, color, ink), ...style }}
    >
      <span className="absolute inset-0 block" style={{ background: "linear-gradient(180deg, rgba(255,255,255,.28), transparent 45%, rgba(0,0,0,.06))" }} />
    </span>
  );
}

/** A gold binder clip, clamped over an edge, its two wire handles folded up. */
export function BinderClip({ className, style, metal = "gold" }: { className?: string; style?: CSSProperties; metal?: "gold" | "silver" }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [light, mid, dark] = metal === "gold" ? ["#FBE7A8", "#D9A84E", "#8C6221"] : ["#FFFFFF", "#C9CCD2", "#7D828C"];
  return (
    <svg viewBox="0 0 60 64" aria-hidden="true" className={cn("pointer-events-none absolute block", className)} style={{ filter: "drop-shadow(0 calc(.4*var(--p)) calc(.6*var(--p)) rgba(40,25,10,.35))", ...style }}>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset=".45" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
      </defs>
      <path d="M17 33 L13 6 Q12.5 2.5 16 2.5 L22 2.5 Q25 2.5 24.5 6 L23 33" fill="none" stroke={mid} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M43 33 L47 6 Q47.5 2.5 44 2.5 L38 2.5 Q35 2.5 35.5 6 L37 33" fill="none" stroke={mid} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M6 30 L54 30 Q57 30 56.4 33 L52 56 Q51.3 59 48 59 L12 59 Q8.7 59 8 56 L3.6 33 Q3 30 6 30 Z" fill={`url(#${id}b)`} />
      <path d="M7 31.6 L53 31.6" stroke="rgba(255,255,255,.65)" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="9" y="56" width="42" height="6" rx="2" fill={dark} opacity=".85" />
    </svg>
  );
}

/** A paperclip bent into a heart at the top, in coloured metal. */
export function HeartClip({ color = "#F28DB2", className, style }: { color?: string; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 40 90" aria-hidden="true" className={cn("pointer-events-none absolute block", className)} style={{ filter: "drop-shadow(0 calc(.4*var(--p)) calc(.5*var(--p)) rgba(60,20,40,.3))", ...style }}>
      <path d="M20 34 C11 27 4 21 4 13.5 C4 8 8 4 13 4 C16.4 4 18.6 6 20 8.4 C21.4 6 23.6 4 27 4 C32 4 36 8 36 13.5 C36 21 29 27 20 34 Z" fill="none" stroke={color} strokeWidth="4.4" strokeLinejoin="round" />
      <path d="M17 32 L17 84 Q17 88 20.5 88 Q24 88 24 84 L24 40" fill="none" stroke={color} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M8 12 C9 8 12 6.6 15 7.4" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** One pearl: a little lustre on the top left and a pink-grey shade underneath. `size` is in `--p`. */
export function Pearl({ size = 2.2, className, style }: { size?: number; className?: string; style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute block rounded-full", className)}
      style={{ width: `calc(${size} * var(--p))`, height: `calc(${size} * var(--p))`, background: "radial-gradient(circle at 32% 28%, #FFFFFF 0 16%, #F7EFEA 34%, #E6D6CF 68%, #CBB7B0 100%)", boxShadow: "0 calc(.25*var(--p)) calc(.45*var(--p)) rgba(80,50,50,.32), inset calc(-.2*var(--p)) calc(-.3*var(--p)) calc(.5*var(--p)) rgba(150,115,110,.35)", ...style }}
    />
  );
}

export type DoodleKind = "heart" | "heart-fill" | "sparkle" | "sparkles" | "arrow" | "lines" | "swirl" | "star";

const DOODLES: Record<DoodleKind, { box: string; path: string; fill?: boolean }> = {
  heart: { box: "0 0 24 24", path: "M12 20.4s-7.4-4.5-9.4-9C1.2 8.2 2.9 4.6 6.6 4.6c2.1 0 3.6 1.2 5.4 3.3 1.8-2.1 3.3-3.3 5.4-3.3 3.7 0 5.4 3.6 4 6.8-2 4.5-9.4 9-9.4 9Z" },
  "heart-fill": { box: "0 0 24 24", path: "M12 20.4s-7.4-4.5-9.4-9C1.2 8.2 2.9 4.6 6.6 4.6c2.1 0 3.6 1.2 5.4 3.3 1.8-2.1 3.3-3.3 5.4-3.3 3.7 0 5.4 3.6 4 6.8-2 4.5-9.4 9-9.4 9Z", fill: true },
  sparkle: { box: "0 0 24 24", path: "M12 1.5 13.6 10.4 22.5 12 13.6 13.6 12 22.5 10.4 13.6 1.5 12 10.4 10.4Z", fill: true },
  sparkles: { box: "0 0 40 32", path: "M14 4 15.3 11.2 22.5 12.5 15.3 13.8 14 21 12.7 13.8 5.5 12.5 12.7 11.2Z M30 17 30.8 21.2 35 22 30.8 22.8 30 27 29.2 22.8 25 22 29.2 21.2Z M32 3 32.5 5.5 35 6 32.5 6.5 32 9 31.5 6.5 29 6 31.5 5.5Z", fill: true },
  arrow: { box: "0 0 60 30", path: "M3 22 C14 8 32 4 50 12 M43 5 L51 12.5 L42 17" },
  lines: { box: "0 0 30 24", path: "M4 4 L8 12 M13 2 L14 11 M22 4 L19 12" },
  swirl: { box: "0 0 50 30", path: "M3 20 C10 5 22 5 24 13 C26 21 16 23 15 16 C14 9 26 4 34 9 C40 13 44 17 47 15" },
  star: { box: "0 0 24 24", path: "M12 2.5 14.6 8.9 21.5 9.4 16.2 13.8 17.9 20.5 12 16.8 6.1 20.5 7.8 13.8 2.5 9.4 9.4 8.9Z" },
};

/**
 * A pen doodle: a heart, a sparkle, an arrow. It draws itself once in view unless `still`, the way
 * the ink would go down. `className` sizes it.
 */
export function Doodle({ kind, color, still = true, className, style, delay = 0 }: { kind: DoodleKind; color: string; still?: boolean; className?: string; style?: CSSProperties; delay?: number }) {
  const d = DOODLES[kind];
  return (
    <svg viewBox={d.box} aria-hidden="true" className={cn("pointer-events-none block overflow-visible", className)} style={style}>
      {d.fill ? (
        <motion.path d={d.path} fill={color} initial={still ? false : { opacity: 0, scale: 0.4 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.4, delay }} style={{ transformOrigin: "center" }} />
      ) : (
        <motion.path d={d.path} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" initial={still ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, amount: 0.8 }} transition={{ duration: 0.9, delay, ease: "easeInOut" }} />
      )}
    </svg>
  );
}

/**
 * A sprig of baby's breath: thin stems that fork, and at every tip a cloud of tiny florets. The same
 * seed gives the same sprig. `tint` is the florets' colour and `heart` their middles.
 */
export function BabyBreath({ seed, tint = "#F6C6D3", heart = "#E58FA9", stem = "#9A8466", className, style }: { seed: number; tint?: string; heart?: string; stem?: string; className?: string; style?: CSSProperties }) {
  const random = mulberry32(seed);
  const stems: string[] = [];
  const florets: { x: number; y: number; r: number }[] = [];
  const grow = (x: number, y: number, angle: number, length: number, depth: number) => {
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    const bend = (random() - 0.5) * 6;
    stems.push(`M${x.toFixed(1)} ${y.toFixed(1)} Q${((x + x2) / 2 + bend).toFixed(1)} ${((y + y2) / 2).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`);
    if (depth === 0) {
      const count = 5 + Math.floor(random() * 5);
      for (let i = 0; i < count; i++) florets.push({ x: x2 + (random() - 0.5) * 9, y: y2 + (random() - 0.5) * 8, r: 1.5 + random() * 1.4 });
      return;
    }
    const branches = 2 + (random() > 0.6 ? 1 : 0);
    for (let b = 0; b < branches; b++) grow(x2, y2, angle + (b - (branches - 1) / 2) * (0.45 + random() * 0.25), length * (0.62 + random() * 0.12), depth - 1);
  };
  grow(50, 138, -Math.PI / 2 + (random() - 0.5) * 0.2, 46, 3);
  return (
    <svg viewBox="0 0 100 140" aria-hidden="true" className={cn("pointer-events-none block overflow-visible", className)} style={{ filter: "drop-shadow(0 calc(.3*var(--p)) calc(.4*var(--p)) rgba(60,30,30,.18))", ...style }}>
      <g fill="none" stroke={stem} strokeWidth="0.9" strokeLinecap="round">
        {stems.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      {florets.map((f, i) => (
        <g key={i}>
          <circle cx={f.x} cy={f.y} r={f.r} fill={tint} />
          <circle cx={f.x} cy={f.y} r={f.r * 0.38} fill={heart} opacity=".85" />
        </g>
      ))}
    </svg>
  );
}

/**
 * A watercolour wash: a few soft blots of one colour, their edges pushed about by paper noise and a
 * darker rim where the pigment dried. Decorative; it fills its box.
 */
export function Watercolor({ color, seed, className, style, strength = 1 }: { color: string; seed: number; className?: string; style?: CSSProperties; strength?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const random = mulberry32(seed);
  const blots = Array.from({ length: 4 }, () => ({ cx: 25 + random() * 50, cy: 25 + random() * 50, rx: 22 + random() * 18, ry: 18 + random() * 16, o: (0.28 + random() * 0.22) * strength }));
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className={cn("pointer-events-none absolute block", className)} style={{ mixBlendMode: "multiply", ...style }}>
      <defs>
        <filter id={`${id}w`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed={seed % 97} />
          <feDisplacementMap in="SourceGraphic" scale="9" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>
      <g filter={`url(#${id}w)`}>
        {blots.map((b, i) => (
          <ellipse key={i} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={color} fillOpacity={b.o} stroke={color} strokeOpacity={b.o * 0.9} strokeWidth="1.4" />
        ))}
      </g>
    </svg>
  );
}

/** A sheet of grid paper with a dashed border stitched round it, for a note. */
export function GridPaper({ color, line, children, className, style }: { color: string; line: string; children?: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn("relative rounded-[calc(1.6*var(--p))]", className)}
      style={{ backgroundColor: color, backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`, backgroundSize: "calc(3.2*var(--p)) calc(3.2*var(--p))", boxShadow: "0 calc(1*var(--p)) calc(2.4*var(--p)) rgba(80,30,50,.2)", ...style }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-[calc(1.4*var(--p))] rounded-[calc(1*var(--p))]" style={{ border: `calc(.3*var(--p)) dashed ${line.replace(/[\d.]+\)$/, ".9)")}` }} />
      {children}
    </div>
  );
}

/**
 * A handwritten label on a scrap of paper, its ends torn: "sweetest memories", "my fave". The words
 * are the template's to choose; `font` is the hand they are written in.
 */
export function HandLabel({ children, paper, ink, font, size = 4.4, className, style }: { children: ReactNode; paper: string; ink: string; font: string; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <span
      className={cn("inline-block max-w-full px-[calc(3*var(--p))] py-[calc(1*var(--p))] text-center leading-[1.05]", className)}
      style={{ background: paper, color: ink, fontFamily: font, fontSize: `calc(${size} * var(--p))`, clipPath: TAPE_ENDS, filter: "drop-shadow(0 calc(.4*var(--p)) calc(.6*var(--p)) rgba(60,30,30,.18))", ...style }}
    >
      {children}
    </span>
  );
}
