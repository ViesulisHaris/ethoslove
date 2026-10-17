"use client";

/**
 * Where the box stands: striped wallpaper in the lacquer's family, a vanity dressed in lace, and
 * the things on it that are drawn rather than cut out of a photograph: a strand of pearls and a
 * cut-glass scent bottle with its atomizer. The vanity runs the full width of the screen; the
 * composition above it is centred and sized in --k, the same as the box.
 */
import type { CSSProperties } from "react";
import { PAPER_GRAIN } from "../_shared/cover-kit";
import { GOLD, LACE, PEARL, type Finish } from "./looks";

const k = (n: number): string => `calc(${n} * var(--k))`;

/** Wallpaper: a Regency stripe with a thread of gold, lamplight from the top left, and grain. */
export function Wall({ finish }: { finish: Finish }) {
  const [a, b] = finish.wall;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundColor: a }}>
      <div className="absolute inset-0" style={{ background: `repeating-linear-gradient(90deg, ${a} 0 ${k(5.2)}, rgba(217,178,92,.35) ${k(5.2)} ${k(5.45)}, ${b} ${k(5.45)} ${k(10.4)}, rgba(217,178,92,.35) ${k(10.4)} ${k(10.65)})` }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(70% 55% at 22% 12%, rgba(255,248,232,.75), transparent 70%), radial-gradient(90% 70% at 50% 100%, rgba(90,40,50,.16), transparent 70%)" }} />
      <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: 0.7 }} />
    </div>
  );
}

/** A band of lace edging: straight along the top, scalloped below, pierced with eyelets. */
const LACE_EDGE = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 18'><path fill='${LACE}' fill-rule='evenodd' d='M0 0H24V5C24 12 19 17 12 17C5 17 0 12 0 5ZM12 5.2a1.5 1.5 0 1 0 .01 0ZM7.2 8.6a1.05 1.05 0 1 0 .01 0ZM16.8 8.6a1.05 1.05 0 1 0 .01 0ZM12 12.9a1.05 1.05 0 1 0 .01 0ZM9.1 11.6a.7 .7 0 1 0 .01 0ZM14.9 11.6a.7 .7 0 1 0 .01 0ZM3.5 2.2a.75 .75 0 1 0 .01 0ZM8.5 2.2a.75 .75 0 1 0 .01 0ZM15.5 2.2a.75 .75 0 1 0 .01 0ZM20.5 2.2a.75 .75 0 1 0 .01 0Z'/><path d='M1.6 5.8C2.2 11 6 15.2 12 15.2S21.8 11 22.4 5.8' fill='none' stroke='#E6D6C0' stroke-width='.45' stroke-dasharray='.7 .7'/><path d='M0 4.2H24' stroke='#E6D6C0' stroke-width='.35'/></svg>`,
)}")`;

/**
 * The vanity: its top from `back` to `front` (in --k from the top of the composition) and its
 * painted front below, with a lace cloth over the top whose scalloped edge hangs over the front.
 */
export function Vanity({ finish, back, front }: { finish: Finish; back: number; front: number }) {
  const y = (n: number): string => `calc(var(--top) + ${n} * var(--k))`;
  const top: CSSProperties = {
    top: y(back),
    height: k(front - back),
    background: `linear-gradient(180deg, rgba(70,40,40,.22) 0%, transparent 22%), radial-gradient(circle, rgba(196,172,150,.28) 0 ${k(0.22)}, transparent ${k(0.3)}) 0 0 / ${k(2.2)} ${k(1.3)}, linear-gradient(180deg, #EFE3D4 0%, #F9F1E6 55%, #FFFAF2 100%)`,
  };
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute inset-x-0" style={top} />
      {/* the painted front of the vanity, down to the floor */}
      <div className="absolute inset-x-0 bottom-0" style={{ top: y(front), background: `linear-gradient(180deg, ${finish.shade} 0%, ${finish.lacquer} 18%, ${finish.shade} 100%)` }}>
        <div className="absolute inset-x-0 top-0" style={{ height: k(1.2), background: `linear-gradient(180deg, ${GOLD.light}, ${GOLD.deep})` }} />
        <div className="absolute inset-x-0" style={{ top: k(3.2), height: k(0.5), background: `linear-gradient(180deg, ${GOLD.mid}, ${GOLD.deep})`, opacity: 0.55 }} />
        <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: 0.5 }} />
      </div>
      {/* the lace cloth's edge, hanging over */}
      <div className="absolute inset-x-0" style={{ top: y(front - 3.2), height: k(9), backgroundImage: LACE_EDGE, backgroundSize: `${k(12)} ${k(9)}`, backgroundRepeat: "repeat-x", backgroundPosition: "center top", filter: `drop-shadow(0 ${k(0.6)} ${k(0.7)} rgba(70,30,40,.3))` }} />
    </div>
  );
}

/** A strand of pearls lying in a loose loop, drawn in `w` × `h` --k. */
export function Pearls({ className, style }: { className?: string; style?: CSSProperties }) {
  // Pearls strung along two curves: the loop on the cloth, and the tail running off it.
  const curve = (t: number): [number, number] => {
    const x = 4 + 92 * t;
    const y = 14 + Math.sin(t * Math.PI) * 13 - Math.sin(t * Math.PI * 2.2) * 5;
    return [x, y];
  };
  const pearls = Array.from({ length: 26 }, (_, i) => curve(i / 25));
  return (
    <svg viewBox="0 0 100 34" className={className} style={style} aria-hidden="true">
      <defs>
        <radialGradient id="mb-pearl" cx=".36" cy=".32" r=".7">
          <stop offset="0" stopColor={PEARL.light} />
          <stop offset=".55" stopColor={PEARL.mid} />
          <stop offset="1" stopColor={PEARL.deep} />
        </radialGradient>
      </defs>
      <polyline points={pearls.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="#CDBEA8" strokeWidth=".5" />
      {pearls.map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x + 0.4} cy={y + 1.4} rx="2" ry="1" fill="rgba(60,30,40,.18)" />
          <circle cx={x} cy={y} r="2.1" fill="url(#mb-pearl)" />
          <circle cx={x - 0.7} cy={y - 0.7} r=".55" fill="#FFFFFF" opacity=".9" />
        </g>
      ))}
      <circle cx="96.5" cy={curve(1)[1] + 0.2} r="1.3" fill={GOLD.mid} stroke={GOLD.deep} strokeWidth=".3" />
    </svg>
  );
}

/** A cut-glass scent bottle with a gold collar and a silk atomizer bulb on a tube. */
export function ScentBottle({ tint, className, style }: { tint: string; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 40 64" className={className} style={style} aria-hidden="true">
      <defs>
        <radialGradient id="mb-glass" cx=".38" cy=".35" r=".75">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".95" />
          <stop offset=".45" stopColor={tint} stopOpacity=".55" />
          <stop offset="1" stopColor={tint} stopOpacity=".95" />
        </radialGradient>
        <radialGradient id="mb-bulb" cx=".4" cy=".35" r=".7">
          <stop offset="0" stopColor="#FFE3EA" />
          <stop offset=".6" stopColor="#F0A3B8" />
          <stop offset="1" stopColor="#C9637F" />
        </radialGradient>
      </defs>
      <ellipse cx="17" cy="61.5" rx="13" ry="2.2" fill="rgba(60,30,40,.22)" />
      {/* the tube and the bulb, with its tassel */}
      <path d="M20.6 23.4 C23.4 21 27.2 21.4 29.4 18.2" fill="none" stroke={GOLD.deep} strokeWidth="2" strokeLinecap="round" />
      <path d="M20.6 23.4 C23.4 21 27.2 21.4 29.4 18.2" fill="none" stroke={GOLD.light} strokeWidth=".7" strokeLinecap="round" />
      <ellipse cx="32.5" cy="13" rx="5.6" ry="7.4" transform="rotate(28 32.5 13)" fill="url(#mb-bulb)" />
      <path d="M29 9 L36 17 M31 7 L37 14 M28.5 12 L34 18.5" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".5" />
      <path d="M36.4 19 L37.6 26 M37.2 19 L39 25.4 M35.8 19.4 L36.4 26.4" stroke={GOLD.mid} strokeWidth=".5" />
      <circle cx="36.6" cy="18.8" r=".9" fill={GOLD.deep} />
      {/* the collar */}
      <rect x="12.6" y="22" width="8.8" height="4.6" rx="1.2" fill={GOLD.mid} stroke={GOLD.deep} strokeWidth=".5" />
      <rect x="13.6" y="20" width="6.8" height="2.6" rx="1" fill={GOLD.light} stroke={GOLD.deep} strokeWidth=".4" />
      {/* the body: faceted glass */}
      <path d="M17 26 C6 27 2 36 3 45 C4 54 10 60 17 60 C24 60 30 54 31 45 C32 36 28 27 17 26 Z" fill="url(#mb-glass)" stroke="rgba(120,60,80,.35)" strokeWidth=".6" />
      <path d="M17 26 L17 60 M6 34 L28 34 M3.4 46 L30.6 46 M8 57 L26 57 M9 28.8 L4.4 44 M25 28.8 L29.6 44" stroke="#FFFFFF" strokeOpacity=".45" strokeWidth=".5" />
      <path d="M8.5 33 C7 38 7 44 9 48" fill="none" stroke="#FFFFFF" strokeOpacity=".85" strokeWidth="1.3" strokeLinecap="round" />
      <ellipse cx="17" cy="49" rx="10" ry="6" fill={tint} opacity=".35" />
    </svg>
  );
}
