"use client";

/**
 * The rooftop: a string of warm bulbs swagged across the top, a banner with their name, the lit
 * marquee the countdown sits in, and the rail with two glasses someone left out. All SVG and CSS,
 * sized in --k, so the scene holds together on a phone, a laptop and a 390 × 600 poster.
 */
import type { ReactNode } from "react";
import { POSTER_FONT } from "../_shared/cover-kit";

export const MIDNIGHT_KEYFRAMES = `
.mc-bulb{animation:mc-bulb 3.2s ease-in-out infinite alternate}
@keyframes mc-bulb{from{opacity:.5}to{opacity:1}}
.mc-sway{transform-origin:50% 0;animation:mc-sway 6.5s ease-in-out infinite alternate}
@keyframes mc-sway{from{rotate:-1.4deg}to{rotate:1.4deg}}
@media (prefers-reduced-motion: reduce){.mc-bulb,.mc-sway{animation:none}}
`;

/** Two swags of wire across the top; the bulbs hang wherever the curve puts them. */
const SWAGS: [number, number][][] = [
  [
    [0, 2],
    [25, 20],
    [50, 4],
  ],
  [
    [50, 4],
    [75, 20],
    [100, 2],
  ],
];
const WIRE_H = 24;

function onCurve(seg: [number, number][], t: number): { x: number; y: number } {
  const u = 1 - t;
  const [p0, p1, p2] = seg;
  return {
    x: u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    y: u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  };
}

const STRING_BULBS = SWAGS.flatMap((seg) => [0.12, 0.3, 0.5, 0.7, 0.88].map((t) => onCurve(seg, t)));

export function BulbString() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0" style={{ height: `calc(${WIRE_H} * var(--k))` }}>
      <svg viewBox={`0 0 100 ${WIRE_H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path d="M0 2 Q 25 20 50 4 Q 75 20 100 2" fill="none" stroke="rgba(255,226,180,.45)" strokeWidth="0.5" />
      </svg>
      {STRING_BULBS.map((b, i) => (
        <span
          key={i}
          className="mc-bulb absolute block size-[calc(2.6*var(--k))] rounded-full"
          style={{
            left: `${b.x}%`,
            top: `${(b.y / WIRE_H) * 100}%`,
            transform: "translate(-50%, -10%)",
            backgroundColor: "#FFE3A6",
            boxShadow: "0 0 calc(3.4*var(--k)) rgba(255,203,120,.95), 0 0 calc(7*var(--k)) rgba(255,180,90,.45)",
            animationDelay: `${(i * 0.31) % 3.2}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Their name on a cloth banner, hung from its own string. */
export function Banner({ name }: { name: string }) {
  return (
    <div className="mc-sway relative w-[calc(54*var(--k))] max-w-full">
      <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="absolute inset-x-0 h-[calc(3.6*var(--k))] w-full" style={{ top: "calc(-3*var(--k))" }} aria-hidden="true">
        <path d="M2 1 Q 50 9 98 1" fill="none" stroke="rgba(255,226,180,.45)" strokeWidth="0.7" />
      </svg>
      <div
        className="relative px-[calc(4*var(--k))] pt-[calc(2.6*var(--k))] pb-[calc(6.5*var(--k))] text-center"
        style={{
          backgroundColor: "#B93E58",
          backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.24), rgba(0,0,0,.26))",
          clipPath: "polygon(0 0, 100% 0, 100% 72%, 50% 100%, 0 72%)",
          filter: "drop-shadow(0 calc(1*var(--k)) calc(1.8*var(--k)) rgba(0,0,0,.5))",
        }}
      >
        <p
          className="text-[calc(6.6*var(--k))] leading-[1.05] text-balance break-words text-[#FFF4E4] italic"
          style={{ fontFamily: POSTER_FONT, textShadow: "0 calc(.3*var(--k)) calc(.8*var(--k)) rgba(0,0,0,.35)" }}
        >
          {name}
        </p>
      </div>
    </div>
  );
}

/** Bulbs straddling the sign's frame: seven along the top and bottom, two down each side. */
const FRAME_BULBS: { x: number; y: number }[] = [
  ...Array.from({ length: 7 }, (_, i) => ({ x: 7 + i * 14.3, y: 0 })),
  ...Array.from({ length: 7 }, (_, i) => ({ x: 7 + i * 14.3, y: 100 })),
  ...Array.from({ length: 2 }, (_, i) => ({ x: 0, y: 34 + i * 32 })),
  ...Array.from({ length: 2 }, (_, i) => ({ x: 100, y: 34 + i * 32 })),
];

/** The lit sign the countdown is set into. */
export function MarqueeSign({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative w-full rounded-[calc(4*var(--k))] p-[calc(2.6*var(--k))]"
      style={{
        backgroundColor: "#B98E3F",
        backgroundImage: "linear-gradient(180deg, rgba(255,240,205,.6), rgba(58,34,10,.45))",
        boxShadow: "0 calc(2.4*var(--k)) calc(7*var(--k)) rgba(0,0,0,.55), 0 0 calc(12*var(--k)) rgba(242,200,121,.22)",
      }}
    >
      <div
        className="relative rounded-[calc(2.4*var(--k))] px-[calc(4*var(--k))] py-[calc(3.2*var(--k))] text-center"
        style={{
          backgroundColor: "#090E28",
          backgroundImage: "radial-gradient(80% 70% at 50% 38%, rgba(96,116,224,.24), transparent 72%)",
          boxShadow: "inset 0 0 calc(5*var(--k)) rgba(0,0,0,.85)",
        }}
      >
        {children}
      </div>
      {FRAME_BULBS.map((b, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="mc-bulb absolute block size-[calc(1.8*var(--k))] rounded-full"
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            transform: "translate(-50%, -50%)",
            backgroundColor: "#FFE7B4",
            boxShadow: "0 0 calc(2.4*var(--k)) rgba(255,214,140,.9)",
            animationDelay: `${(i * 0.23) % 3.2}s`,
          }}
        />
      ))}
    </div>
  );
}

function Glass({ coupe = false }: { coupe?: boolean }) {
  const bowl = coupe
    ? "M4 4 C4 16 9 23 15 23 C21 23 26 16 26 4 Z"
    : "M8.5 3 C8.5 20 11 34 13.4 40 L16.6 40 C19 34 21.5 20 21.5 3 Z";
  const drink = coupe
    ? "M6.4 11 C7.6 18 11 21.5 15 21.5 C19 21.5 22.4 18 23.6 11 Z"
    : "M10.6 23 C11.3 31 12.6 36.5 13.5 40 L16.5 40 C17.4 36.5 18.7 31 19.4 23 Z";
  const stemTop = coupe ? 23 : 40;
  return (
    <svg viewBox="0 0 30 70" className="w-full overflow-visible" aria-hidden="true">
      <path d={bowl} fill="rgba(214,232,255,.2)" stroke="rgba(255,236,200,.65)" strokeWidth="0.9" />
      <path d={drink} fill="rgba(255,196,110,.62)" />
      <rect x="14.2" y={stemTop} width="1.7" height={63 - stemTop} fill="rgba(214,232,255,.26)" stroke="rgba(255,236,200,.45)" strokeWidth="0.5" />
      <ellipse cx="15" cy="64" rx="6.6" ry="1.9" fill="rgba(214,232,255,.24)" stroke="rgba(255,236,200,.55)" strokeWidth="0.8" />
      <path d={coupe ? "M6.6 6 C7 13 9 18 11.6 20.4" : "M10.4 6 C10.6 20 12 31 13.2 36"} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="0.8" strokeLinecap="round" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={13 + i * 1.7} cy={(coupe ? 17 : 32) - i * 3.4} r="0.6" fill="rgba(255,240,210,.8)" />
      ))}
    </svg>
  );
}

/** The rail along the roof edge, with two glasses left standing on it. */
export function Rooftop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0" style={{ top: "74%" }}>
      <span className="absolute inset-x-0 top-0 block h-[calc(.9*var(--k))] rounded-full" style={{ backgroundColor: "#1C2238", boxShadow: "0 calc(-.25*var(--k)) 0 rgba(255,214,150,.4)" }} />
      <span className="absolute inset-x-0 block h-[calc(.6*var(--k))]" style={{ top: "calc(5.5*var(--k))", backgroundColor: "#151A2C" }} />
      {[6, 28, 50, 72, 94].map((x) => (
        <span key={x} className="absolute top-0 block h-[calc(12*var(--k))] w-[calc(.8*var(--k))]" style={{ left: `${x}%`, backgroundColor: "#151A2C" }} />
      ))}
      <span
        className="absolute bottom-0 block rounded-[50%]"
        style={{ left: "16%", width: "calc(22*var(--k))", height: "calc(4*var(--k))", background: "radial-gradient(closest-side, rgba(255,200,120,.3), transparent)" }}
      />
      <div className="absolute bottom-0 block w-[calc(10*var(--k))]" style={{ left: "19%" }}>
        <Glass />
      </div>
      <div className="absolute bottom-0 block w-[calc(11*var(--k))]" style={{ left: "29%" }}>
        <Glass coupe />
      </div>
    </div>
  );
}
