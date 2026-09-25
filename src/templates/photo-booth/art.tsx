"use client";
/* eslint-disable @next/next/no-img-element */

/**
 * The booth and everything it prints, drawn from scratch: a lacquered cabinet with a lit sign, a
 * velvet curtain, a coin slot, the camera panel inside with its mirror and big red button, and
 * the strip itself. The booth is drawn in its own units, one `--k` each (76 wide, 156 tall with
 * its sign), so the whole thing scales with the gift and the camera can move in on any part of it.
 */
import { useId, type CSSProperties, type Ref } from "react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import { PAPER_GRAIN, POSTER_FONT } from "../_shared/cover-kit";
import type { Booth } from "./looks";
import { framing, signSize, stripFilter, type FilterId, type Frame } from "./plan";

export const TYPE_FONT = 'var(--font-type), "Courier New", ui-monospace, monospace';

const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");
/** A length in the booth's units. */
export const k = (n: number) => `calc(${n} * var(--k))`;
/** A box in the booth's units: left, top, width, height. */
export const at = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: k(x), top: k(y), width: k(w), height: k(h) });

export const BOOTH_KEYFRAMES = `
@keyframes pb-chase { 0%, 49% { opacity: 1 } 50%, 100% { opacity: .38 } }
.pb-bulb-a { animation: pb-chase 1.1s steps(1) infinite; }
.pb-bulb-b { animation: pb-chase 1.1s steps(1) infinite -.55s; }
@keyframes pb-live { from { transform: scale(1.07) translate(-1.2%, .6%) } to { transform: scale(1.11) translate(1%, -.8%) } }
.pb-live { animation: pb-live 3.4s ease-in-out infinite alternate; }
@keyframes pb-ready { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,86,96,.55) } 50% { box-shadow: 0 0 0 calc(1.3*var(--k)) rgba(255,86,96,0) } }
.pb-ready { animation: pb-ready 1.6s ease-out infinite; }
@keyframes pb-blink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: .25 } }
.pb-blink { animation: pb-blink .36s steps(1) infinite; }
@keyframes pb-sway { 0%, 100% { rotate: -1.6deg } 50% { rotate: 1.6deg } }
.pb-sway { animation: pb-sway 4.6s ease-in-out infinite; transform-origin: 50% 0; }
@media (prefers-reduced-motion: reduce) { .pb-bulb-a, .pb-bulb-b, .pb-live, .pb-ready, .pb-blink, .pb-sway { animation: none; } }
`;

/**
 * The room the booth stands in: cream wallpaper with a red pinstripe, a light over the booth, a
 * skirting board and a red carpet. It sits inside the camera, so it keeps its place round the
 * booth however close the camera goes.
 */
export function Room() {
  const stripe = `linear-gradient(90deg, transparent 0 ${k(3.4)}, rgba(160,28,44,.09) ${k(3.4)} ${k(3.62)}, transparent ${k(3.62)} ${k(4.3)}, rgba(160,28,44,.09) ${k(4.3)} ${k(4.52)}, transparent ${k(4.52)})`;
  const floorTop = `calc(var(--top) + ${k(137)})`;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0" style={{ backgroundColor: "#EFE2CE", backgroundImage: stripe, backgroundSize: `${k(8)} 100%`, backgroundPosition: "50% 0" }} />
      <div className="absolute inset-0" style={{ background: `radial-gradient(${k(92)} ${k(118)} at 50% calc(var(--top) + ${k(62)}), rgba(255,244,222,.92), rgba(255,244,222,0) 72%)` }} />
      {/* the rail at chair height, and the skirting where the carpet starts */}
      <div className="absolute inset-x-0" style={{ top: `calc(var(--top) + ${k(96)})`, height: k(1.6), background: "linear-gradient(#FFF8EC, #DCC9AA)", boxShadow: `0 ${k(0.4)} ${k(0.6)} rgba(90,40,30,.18)` }} />
      <div className="absolute inset-x-0" style={{ top: `calc(var(--top) + ${k(97.6)})`, height: k(39.4), background: "rgba(160,28,44,.05)" }} />
      <div className="absolute inset-x-0" style={{ top: `calc(${floorTop} - ${k(3)})`, height: k(3), background: "linear-gradient(#FFF8EC, #D4BF9C)", boxShadow: `0 ${k(0.3)} ${k(0.5)} rgba(60,20,20,.3)` }} />
      <div className="absolute inset-x-0 bottom-0" style={{ top: floorTop, background: "linear-gradient(180deg, #4E0A12 0%, #6E121C 22%, #5A0D16 70%, #3E070D 100%)" }}>
        <div className="absolute inset-0 mix-blend-overlay opacity-40" style={{ backgroundImage: PAPER_GRAIN }} />
        <div className="absolute inset-0" style={{ background: `radial-gradient(${k(70)} ${k(14)} at 50% ${k(13)}, rgba(255,200,170,.28), transparent 75%)` }} />
      </div>
      <div className="absolute inset-0" style={{ background: "radial-gradient(130% 90% at 50% 45%, transparent 55%, rgba(60,14,18,.28))" }} />
      <div className="absolute inset-0 mix-blend-multiply opacity-50" style={{ backgroundImage: PAPER_GRAIN }} />
    </div>
  );
}

/** Four couples in miniature, for the sample strips in the window: two heads and shoulders, leaning. */
function SampleStrip({ x, y, tilt, tone }: { x: number; y: number; tilt: number; tone: string }) {
  const frames = [0, 1, 2, 3];
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt})`}>
      <rect x="0" y="0" width="4.6" height="21" rx=".2" fill="#FBF7EE" />
      {frames.map((i) => (
        <g key={i} transform={`translate(.45 ${0.5 + i * 4.75})`}>
          <rect width="3.7" height="4.25" fill={tone} />
          <circle cx={1.25 + (i % 2) * 0.15} cy={1.7 - (i === 2 ? 0.2 : 0)} r=".62" fill="#3A2E2E" opacity=".75" />
          <circle cx={2.45 - (i === 3 ? 0.25 : 0)} cy="1.8" r=".6" fill="#3A2E2E" opacity=".75" />
          <path d="M.25 4.25c.2-1.2.7-1.7 1-1.7s.8.5 1.1 1.7M1.6 4.25c.3-1.2.8-1.6 1.1-1.6s.7.4.9 1.6" fill="#3A2E2E" opacity=".75" />
        </g>
      ))}
    </g>
  );
}

/**
 * The cabinet: a lacquered front lit from the left, the side panel turning away into shadow, the
 * doorway with the stool inside, and down the right the sample window, a "smile" plate, the coin
 * slot and the slot the strip comes out of. The curtain, the camera panel and the sign are laid
 * over it as their own pieces.
 */
export function Cabinet({ booth, photosLabel, smileLabel }: { booth: Booth; photosLabel: string; smileLabel: string }) {
  const id = safeId(useId());
  const b = booth.body;
  const m = booth.metal;
  return (
    <svg viewBox="0 0 76 156" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-front`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={b.deep} />
          <stop offset=".07" stopColor={b.mid} />
          <stop offset=".3" stopColor={b.light} />
          <stop offset=".72" stopColor={b.mid} />
          <stop offset="1" stopColor={b.deep} />
        </linearGradient>
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".2" />
          <stop offset=".22" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset=".78" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity=".24" />
        </linearGradient>
        <linearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={b.side} />
          <stop offset="1" stopColor={b.sideDeep} />
        </linearGradient>
        <linearGradient id={`${id}-chrome`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={m.hi} />
          <stop offset=".42" stopColor={m.mid} />
          <stop offset=".55" stopColor={m.lo} />
          <stop offset="1" stopColor={m.hi} />
        </linearGradient>
        <linearGradient id={`${id}-chromeX`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={m.hi} />
          <stop offset=".5" stopColor={m.mid} />
          <stop offset="1" stopColor={m.lo} />
        </linearGradient>
        <linearGradient id={`${id}-inside`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#140709" />
          <stop offset=".5" stopColor="#2B1216" />
          <stop offset="1" stopColor="#0C0405" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3A2D30" />
          <stop offset=".45" stopColor="#1B1315" />
          <stop offset="1" stopColor="#0B0708" />
        </linearGradient>
        <linearGradient id={`${id}-seat`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={booth.curtain.light} />
          <stop offset="1" stopColor={booth.curtain.deep} />
        </linearGradient>
      </defs>

      {/* its shadow on the carpet */}
      <ellipse cx="37" cy="152.6" rx="45" ry="3.2" fill="rgba(25,3,6,.5)" />

      {/* the side, turning away */}
      <path d="M66 28.6 L75.4 31.8 L75.4 141.4 L66 146 Z" fill={`url(#${id}-side)`} />
      <path d="M67.9 36.4 L73.7 38.3 L73.7 85.6 L67.9 86.9 Z" fill="none" stroke={booth.trimDeep} strokeOpacity=".4" strokeWidth=".35" />
      <path d="M67.9 91.2 L73.7 92.2 L73.7 136.9 L67.9 139.6 Z" fill="none" stroke={booth.trimDeep} strokeOpacity=".4" strokeWidth=".35" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M68.9 ${41.6 + i * 2.1} L72.7 ${42.9 + i * 2.1}`} stroke="rgba(0,0,0,.5)" strokeWidth=".62" strokeLinecap="round" />
      ))}

      {/* the front */}
      <rect x="0" y="28" width="66" height="118" fill={`url(#${id}-front)`} />
      <rect x="0" y="28" width="66" height="118" fill={`url(#${id}-gloss)`} />
      <rect x="1.3" y="29.8" width="63.4" height="114.6" rx="1.4" fill="none" stroke={booth.trim} strokeWidth=".42" opacity=".9" />

      {/* the cornice, and the brackets that hold the sign */}
      <path d="M67.4 24.4 L76.8 27.8 L76.8 31.9 L67.4 28.7 Z" fill={booth.trimDeep} />
      <rect x="-1.4" y="24.4" width="68.8" height="4.3" rx=".5" fill={booth.trim} />
      <rect x="-1.4" y="27.7" width="68.8" height="1" fill="rgba(0,0,0,.16)" />
      <rect x="-1.4" y="24.4" width="68.8" height=".6" fill="#FFFFFF" opacity=".45" />
      <rect x="12.6" y="20.6" width="2.6" height="4" fill={`url(#${id}-chromeX)`} />
      <rect x="50.8" y="20.6" width="2.6" height="4" fill={`url(#${id}-chromeX)`} />

      {/* the doorway: the inside of the booth, the floor and the stool */}
      <rect x="4" y="33" width="39" height="101" fill={`url(#${id}-inside)`} />
      <rect x="4" y="127" width="39" height="7" fill="#0A0304" />
      <path d="M4 127 H43" stroke="rgba(255,255,255,.07)" strokeWidth=".4" />
      <g>
        <path d="M18.6 117.2 L17.4 133.6 M29.8 117.2 L31 133.6 M24.2 118 V133.8" stroke={m.mid} strokeWidth=".75" strokeLinecap="round" />
        <path d="M18.2 127.6 Q24.2 129.4 30.2 127.6" fill="none" stroke={m.lo} strokeWidth=".6" />
        <path d="M16.9 113.4 V116.4 Q24.2 119.2 31.5 116.4 V113.4 Z" fill={`url(#${id}-seat)`} />
        <ellipse cx="24.2" cy="113.4" rx="7.3" ry="1.9" fill={booth.curtain.light} />
        <ellipse cx="22.6" cy="113" rx="3.8" ry=".7" fill="#FFFFFF" opacity=".16" />
      </g>
      <rect x="3.4" y="32.4" width="40.2" height="102.2" fill="none" stroke={booth.trim} strokeWidth="1.2" />
      <rect x="2.6" y="133.8" width="41.8" height="1.6" fill={`url(#${id}-chrome)`} />

      {/* the kick panel under the doorway */}
      <rect x="3.4" y="137.4" width="59.6" height="6" rx=".8" fill="rgba(0,0,0,.08)" stroke={booth.trim} strokeWidth=".35" strokeOpacity=".6" />
      <path d="M4.2 143 H62.2" stroke="#FFFFFF" strokeOpacity=".12" strokeWidth=".3" />

      {/* the column beside the curtain */}
      <rect x="46.4" y="33" width="16.8" height="101" rx=".8" fill="rgba(0,0,0,.07)" stroke={booth.trim} strokeWidth=".42" strokeOpacity=".75" />

      {/* the window of sample strips */}
      <rect x="48.2" y="35.6" width="13.2" height="27.6" rx=".9" fill={`url(#${id}-chromeX)`} />
      <rect x="48.9" y="36.3" width="11.8" height="26.2" rx=".5" fill={`url(#${id}-glass)`} />
      <SampleStrip x={49.8} y={38.4} tilt={-3} tone="#CFC4BE" />
      <SampleStrip x={55.2} y={38.2} tilt={2.5} tone="#D9C2B8" />
      <path d="M49.4 57 L60.2 38 M51.6 62 L60.4 46.4" stroke="#FFFFFF" strokeOpacity=".16" strokeWidth="1.3" />

      {/* "smile!" on an enamel plate */}
      <rect x="48.2" y="65.4" width="13.2" height="5.4" rx=".7" fill={booth.trim} stroke={booth.trimDeep} strokeWidth=".3" />
      <text x="54.8" y="69.2" textAnchor="middle" fontSize="2.7" fill={booth.stamp} style={{ fontFamily: POSTER_FONT, letterSpacing: ".04em" }}>
        {smileLabel}
      </text>

      {/* the coin slot */}
      <rect x="49" y="73.2" width="11.6" height="17.4" rx="1.2" fill={`url(#${id}-chromeX)`} />
      <rect x="49" y="73.2" width="11.6" height="17.4" rx="1.2" fill="none" stroke={m.lo} strokeWidth=".3" />
      <rect x="53.95" y="75.6" width="1.7" height="6.4" rx=".85" fill={m.lo} />
      <rect x="54.35" y="76.1" width=".9" height="5.4" rx=".45" fill="#0B0708" />
      <circle cx="54.8" cy="86.2" r="1.9" fill={m.lo} />
      <circle cx="54.8" cy="85.9" r="1.55" fill={`url(#${id}-chrome)`} />
      {[
        [50.2, 74.4],
        [59.4, 74.4],
        [50.2, 89.4],
        [59.4, 89.4],
      ].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r=".45" fill={m.lo} />
          <path d={`M${cx - 0.3} ${cy} H${cx + 0.3}`} stroke={m.hi} strokeWidth=".14" />
        </g>
      ))}

      {/* "photos" over the slot, with the arrow down to it */}
      <rect x="48.2" y="93.4" width="13.2" height="5.2" rx=".6" fill={booth.trim} stroke={booth.trimDeep} strokeWidth=".3" />
      <text x="53.6" y="96.95" textAnchor="middle" fontSize="2" fill={booth.stamp} style={{ fontFamily: TYPE_FONT, letterSpacing: ".06em" }}>
        {photosLabel}
      </text>
      <path d="M59.3 94.9 V97.2 M58.4 96.4 L59.3 97.3 L60.2 96.4" fill="none" stroke={booth.stamp} strokeWidth=".38" strokeLinecap="round" strokeLinejoin="round" />

      {/* the slot the strip comes out of */}
      <rect x="48" y="99.8" width="13.6" height="3.6" rx="1" fill={`url(#${id}-chrome)`} />
      <rect x="49" y="101.1" width="11.6" height="1.1" rx=".5" fill="#070304" />

      {/* the plinth, and the feet it stands on */}
      <path d="M66.5 146 L75.8 141.4 L75.8 146.2 L66.5 151.4 Z" fill={m.lo} />
      <rect x="-.6" y="146" width="67.1" height="5.4" fill={`url(#${id}-chrome)`} />
      {[147.3, 148.7, 150.1].map((y) => (
        <path key={y} d={`M.4 ${y} H65.5`} stroke={m.lo} strokeOpacity=".45" strokeWidth=".22" />
      ))}
      <rect x="3" y="151.3" width="5.2" height="1.8" rx=".6" fill="#1A1414" />
      <rect x="58" y="151.3" width="5.2" height="1.8" rx=".6" fill="#1A1414" />
      <path d="M71 148.4 L74 146.7 L74 148.3 L71 150.1 Z" fill="#1A1414" />
    </svg>
  );
}

/** The lip of the slot, drawn again over the strip so the paper comes out from under it. */
export function SlotLip({ booth }: { booth: Booth }) {
  const id = safeId(useId());
  const m = booth.metal;
  return (
    <svg viewBox="0 0 13.6 2.2" className="pointer-events-none absolute" style={at(48, 101.6, 13.6, 2.2)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-lip`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={m.lo} />
          <stop offset=".4" stopColor={m.mid} />
          <stop offset="1" stopColor={m.hi} />
        </linearGradient>
      </defs>
      <path d="M0 0.2 H13.6 V1.4 Q13.6 1.8 12.6 1.8 H1 Q0 1.8 0 1.4 Z" fill={`url(#${id}-lip)`} />
      <path d="M1 .3 H12.6" stroke="#050203" strokeWidth=".5" strokeOpacity=".6" />
    </svg>
  );
}

/** The valance over the doorway, scalloped along its bottom with a braid, hiding the curtain's rail. */
export function Pelmet({ booth }: { booth: Booth }) {
  const id = safeId(useId());
  const b = booth.body;
  const scallops = Array.from({ length: 8 }, () => "q2.5625 3 5.125 0").join(" ");
  return (
    <svg viewBox="0 0 41 8" className="pointer-events-none absolute overflow-visible" style={at(3, 30.4, 41, 8)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-v`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={b.deep} />
          <stop offset=".3" stopColor={b.light} />
          <stop offset=".75" stopColor={b.mid} />
          <stop offset="1" stopColor={b.deep} />
        </linearGradient>
      </defs>
      <path d={`M0 0 H41 V5.2 H0 Z`} fill={`url(#${id}-v)`} />
      <path d={`M41 5.2 ${Array.from({ length: 8 }, () => "q-2.5625 3 -5.125 0").join(" ")} Z`} fill={`url(#${id}-v)`} />
      <path d={`M0 5.2 ${scallops}`} fill="none" stroke={booth.curtain.fringe} strokeWidth=".45" />
      <path d="M0 4.4 H41" stroke={booth.curtain.fringe} strokeWidth=".5" strokeDasharray=".7 .45" />
      <rect x="0" y="0" width="41" height=".7" fill="#FFFFFF" opacity=".25" />
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i} transform={`translate(${i * 5.125} 5.2)`}>
          <path d="M0 0 V1.9" stroke={booth.curtain.fringe} strokeWidth=".38" />
          <ellipse cx="0" cy="2.4" rx=".45" ry=".75" fill={booth.curtain.fringe} />
        </g>
      ))}
    </svg>
  );
}

/**
 * The lit sign on top: a box in the booth's colour with a ring of bulbs that chase, and the words on
 * a cream face. Two lines at most; each is set as large as its length allows.
 */
export function Marquee({ booth, lines, still }: { booth: Booth; lines: [string, string?]; still: boolean }) {
  const id = safeId(useId());
  const s = booth.sign;
  const bulbs: [number, number][] = [];
  for (let i = 0; i < 19; i++) bulbs.push([2.4 + i * 2.84, 1.6]);
  for (let i = 0; i < 19; i++) bulbs.push([2.4 + i * 2.84, 19.2]);
  for (let i = 0; i < 5; i++) bulbs.push([1.6, 4.5 + i * 2.95], [54.4, 4.5 + i * 2.95]);
  const [first, second] = lines;
  const big = signSize(first, 44, second ? 8.2 : 9.4);
  const small = second ? signSize(second, 38, 3.1) : 0;
  return (
    <div className="absolute" style={at(5, 0, 56, 21.6)}>
      <svg viewBox="0 0 56 21.6" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-frame`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={s.frame} />
            <stop offset="1" stopColor={s.frameDeep} />
          </linearGradient>
          <radialGradient id={`${id}-bulb`}>
            <stop offset="0" stopColor="#FFFDF2" />
            <stop offset=".45" stopColor="#FFF1C4" />
            <stop offset="1" stopColor={s.glow} />
          </radialGradient>
          <radialGradient id={`${id}-halo`}>
            <stop offset="0" stopColor={s.glow} stopOpacity=".75" />
            <stop offset="1" stopColor={s.glow} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity=".5" />
            <stop offset=".5" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="-.2" y="1.2" width="56.4" height="20.4" rx="3" fill={s.frameDeep} />
        <rect x="0" y="0" width="56" height="20.6" rx="3" fill={`url(#${id}-frame)`} />
        <rect x="0" y="0" width="56" height="20.6" rx="3" fill="none" stroke={booth.trim} strokeOpacity=".7" strokeWidth=".35" />
        <rect x="3.3" y="3.3" width="49.4" height="14" rx="1.3" fill={s.face} stroke={booth.trim} strokeWidth=".45" />
        <rect x="3.3" y="3.3" width="49.4" height="14" rx="1.3" fill={`url(#${id}-face)`} />
        {bulbs.map(([cx, cy], i) => (
          <g key={i} className={still ? undefined : i % 2 ? "pb-bulb-a" : "pb-bulb-b"}>
            <circle cx={cx} cy={cy} r="1.35" fill={`url(#${id}-halo)`} />
            <circle cx={cx} cy={cy} r=".68" fill={`url(#${id}-bulb)`} />
          </g>
        ))}
      </svg>
      <div className="absolute flex flex-col items-center justify-center overflow-hidden text-center uppercase" style={{ ...at(3.3, 3.3, 49.4, 14), color: s.ink }}>
        <span className="block leading-none whitespace-nowrap" style={{ fontFamily: POSTER_FONT, fontSize: k(big), letterSpacing: "0.06em", textShadow: `0 0 ${k(1.2)} ${s.glow}` }}>
          {first}
        </span>
        {second ? (
          <span className="mt-[calc(1.1*var(--k))] block leading-none whitespace-nowrap" style={{ fontFamily: TYPE_FONT, fontSize: k(small), letterSpacing: "0.3em", paddingLeft: "0.3em" }}>
            {second}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Velvet: pleats that catch the light on their ridges, darker towards the hem. `pleat` is one pleat's width. */
export function velvet(booth: Booth, pleat: string): CSSProperties {
  const c = booth.curtain;
  return {
    backgroundColor: c.mid,
    backgroundImage: `linear-gradient(180deg, rgba(255,255,255,.1), rgba(255,255,255,0) 28%, rgba(0,0,0,0) 62%, rgba(0,0,0,.38)), linear-gradient(90deg, ${c.deep} 0%, ${c.mid} 16%, ${c.light} 40%, ${c.mid} 60%, ${c.deep} 86%, ${c.deep} 100%)`,
    backgroundSize: `100% 100%, ${pleat} 100%`,
    backgroundRepeat: "no-repeat, repeat-x",
  };
}

/** The gold fringe along the curtain's hem. */
export function fringe(booth: Booth): CSSProperties {
  const f = booth.curtain.fringe;
  return {
    backgroundImage: `linear-gradient(180deg, ${f} 0 26%, transparent 26%), repeating-linear-gradient(90deg, ${f} 0 ${k(0.28)}, transparent ${k(0.28)} ${k(0.62)})`,
  };
}

/** Handwriting as large as `max` while its longest word still fits `room`: Caveat runs about 0.46em a letter. */
function handSize(text: string, room: number, max: number): number {
  const longest = Math.max(1, ...text.split(/\s+/).map((w) => [...w].length));
  return Math.min(max, room / (longest * 0.46));
}

/** A card pinned to the curtain, the way a booth is kept for someone. */
export function ReservedCard({ name, label, booth }: { name: string; label: string; booth: Booth }) {
  // Sized by its longest word, so a first name stays big and a second one wraps under it.
  const size = handSize(name, 19.4, 5.4);
  return (
    <div className="relative px-[calc(2.2*var(--k))] pt-[calc(3.2*var(--k))] pb-[calc(2*var(--k))] text-center" style={{ backgroundColor: "#FFF8EC", backgroundImage: PAPER_GRAIN, boxShadow: `0 ${k(0.8)} ${k(1.6)} rgba(20,2,6,.45)`, color: "#3A1A1E" }}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-[calc(.8*var(--k))] border" style={{ borderColor: `${booth.stamp}55` }} />
      {/* the brass pin it hangs from */}
      <svg viewBox="0 0 10 5" className="absolute -top-[calc(1.6*var(--k))] left-1/2 w-[calc(7*var(--k))] -translate-x-1/2" aria-hidden="true">
        <path d="M1 3.6 H8.2 Q9.4 3.6 9.4 2.5 Q9.4 1.4 8.2 1.4 H2.6" fill="none" stroke="#C9A15B" strokeWidth=".7" strokeLinecap="round" />
        <circle cx="1.4" cy="3.6" r=".9" fill="#B08742" />
      </svg>
      <p className="leading-none tracking-[0.28em] uppercase" style={{ fontFamily: TYPE_FONT, fontSize: k(1.75), color: booth.stamp }}>
        {label}
      </p>
      <p className="mt-[calc(.9*var(--k))] leading-[1.05] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: k(size) }}>
        {name}
      </p>
      <svg viewBox="0 0 20 18" className="mx-auto mt-[calc(.6*var(--k))] w-[calc(2.4*var(--k))]" aria-hidden="true">
        <path d="M10 16.5S1.5 11 1.5 5.6C1.5 2.9 3.6 1.3 5.8 1.3c1.8 0 3.2 1 4.2 2.6 1-1.6 2.4-2.6 4.2-2.6 2.2 0 4.3 1.6 4.3 4.3 0 5.4-8.5 10.9-8.5 10.9Z" fill={booth.stamp} />
      </svg>
    </div>
  );
}

/** The frosted flash over the mirror, with "look here" and two arrows printed on it. It glows while they count, and whites out on the flash. */
export function FlashPanel({ label, ink, lit, firing }: { label: string; ink: string; lit: boolean; firing: boolean }) {
  return (
    <div
      className="absolute flex items-center justify-center gap-[calc(1.4*var(--k))] rounded-[calc(.8*var(--k))] transition-[background-color,box-shadow] duration-200"
      style={{
        ...at(3, 1.4, 24, 6),
        backgroundColor: firing ? "#FFFFFF" : lit ? "#FFF6DF" : "#E9E1D2",
        backgroundImage: `repeating-linear-gradient(180deg, rgba(255,255,255,.55) 0 ${k(0.28)}, rgba(0,0,0,.04) ${k(0.28)} ${k(0.56)})`,
        boxShadow: firing ? `0 0 ${k(6)} ${k(2.4)} rgba(255,255,255,.95)` : lit ? `0 0 ${k(2.4)} rgba(255,236,190,.8), inset 0 0 0 ${k(0.3)} rgba(0,0,0,.08)` : `inset 0 0 0 ${k(0.3)} rgba(0,0,0,.12), inset 0 ${k(0.5)} ${k(0.9)} rgba(0,0,0,.18)`,
      }}
    >
      <Arrow ink={ink} lit={lit} />
      <span className={cn("leading-none font-semibold tracking-[0.24em] uppercase", lit && "pb-blink")} style={{ fontFamily: TYPE_FONT, fontSize: k(1.9), color: ink, paddingLeft: "0.24em" }}>
        {label}
      </span>
      <Arrow ink={ink} lit={lit} />
    </div>
  );
}

function Arrow({ ink, lit }: { ink: string; lit: boolean }) {
  return (
    <svg viewBox="0 0 10 10" className="w-[calc(1.9*var(--k))]" aria-hidden="true" style={{ opacity: lit ? 1 : 0.7 }}>
      <path d="M5 1 V8 M1.6 5 L5 8.6 L8.4 5" fill="none" stroke={ink} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Four lamps under the mirror, one for each pose: lit once taken, blinking while it counts down. */
export function PoseLamps({ taken, counting, ink }: { taken: number; counting: number | null; ink: string }) {
  return (
    <div className="absolute flex items-center justify-center gap-[calc(1.9*var(--k))]" style={at(3, 29.6, 24, 4.2)}>
      {[0, 1, 2, 3].map((i) => {
        const on = i < taken;
        const now = counting === i;
        return (
          <span
            key={i}
            data-lamp={on ? "on" : "off"}
            className={cn("grid place-items-center rounded-full", now && "pb-blink")}
            style={{
              width: k(2.6),
              height: k(2.6),
              background: on || now ? "radial-gradient(circle at 40% 35%, #FFFBEA, #FFD66E 45%, #E08A1E)" : "radial-gradient(circle at 40% 35%, #7A2A30, #3E0D12 70%)",
              boxShadow: on || now ? `0 0 ${k(1.4)} rgba(255,196,90,.9)` : `inset 0 0 0 ${k(0.25)} rgba(0,0,0,.35)`,
              color: on || now ? "#6A2A08" : ink,
              fontFamily: TYPE_FONT,
              fontSize: k(1.35),
            }}
          >
            {i + 1}
          </span>
        );
      })}
    </div>
  );
}

/** The big red button: a chrome bezel, a glossy dome, and a ring that pulses while it waits for a thumb. */
export function RedButton({ label, ready, pressed, onPress, buttonRef }: { label: string; ready: boolean; pressed: boolean; onPress: () => void; buttonRef?: Ref<HTMLButtonElement> }) {
  const id = safeId(useId());
  return (
    <button
      ref={buttonRef}
      type="button"
      data-booth-button=""
      aria-label={label}
      aria-disabled={!ready}
      onClick={onPress}
      className={cn("absolute rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white/80", ready ? "cursor-pointer" : "cursor-default")}
      style={at(7.8, 38.8, 14.4, 14.4)}
    >
      {ready ? <span aria-hidden="true" className="pb-ready absolute inset-[5%] rounded-full" /> : null}
      <svg viewBox="-10 -10 20 20" className="relative h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset=".45" stopColor="#B7BBC0" />
            <stop offset=".62" stopColor="#6C7076" />
            <stop offset="1" stopColor="#E6E8EA" />
          </linearGradient>
          <radialGradient id={`${id}-dome`} cx="38%" cy="32%" r="75%">
            <stop offset="0" stopColor="#FF8A8C" />
            <stop offset=".42" stopColor="#E3192C" />
            <stop offset="1" stopColor="#7E0611" />
          </radialGradient>
        </defs>
        <circle r="10" cy=".7" fill="rgba(0,0,0,.35)" />
        <circle r="10" fill={`url(#${id}-ring)`} />
        <circle r="8.5" fill="#240306" />
        <g style={{ transform: pressed ? "translateY(.55px) scale(.95)" : "none", transformOrigin: "0 0", transition: "transform .12s ease-out" }}>
          <circle r="7.7" fill={`url(#${id}-dome)`} />
          <ellipse cx="-2.3" cy="-3.3" rx="3.5" ry="2.1" fill="#FFFFFF" opacity={pressed ? 0.25 : 0.5} />
          <circle r="7.7" fill="none" stroke="#FFFFFF" strokeOpacity=".18" strokeWidth=".5" />
        </g>
        {!ready ? <circle r="7.7" fill="rgba(20,0,4,.28)" /> : null}
      </svg>
    </button>
  );
}

/** One frame of a strip: the photo, cropped to the pose, or an empty frame while the editor waits for one. */
function FramePhoto({ frame, onOpen }: { frame: Frame<GiftPhoto>; onOpen?: (photo: GiftPhoto) => void }) {
  const f = framing(frame.pose);
  const photo = frame.photo;
  const img = photo ? (
    <img src={photo.url} alt="" draggable={false} className="h-full w-full object-cover" style={{ objectPosition: `${f.x}% ${f.y}%`, transform: f.zoom === 1 ? undefined : `scale(${f.zoom})`, transformOrigin: `${f.x}% ${f.y}%` }} />
  ) : (
    <span className="grid h-full w-full place-items-center">
      <svg viewBox="0 0 24 24" className="h-[34%] w-[34%] opacity-40" aria-hidden="true">
        <path d="M4 7h3l2-2.5h6L17 7h3v12H4z M12 10a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" fill="none" stroke="#FFFFFF" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </span>
  );
  const box = "relative block w-full overflow-hidden bg-[#1C1718] [aspect-ratio:4/3]";
  if (photo && onOpen)
    return (
      <button type="button" onClick={() => onOpen(photo)} aria-label={photo.caption || photo.alt || "photo"} className={cn(box, "outline-none focus-visible:ring-4 focus-visible:ring-black/40")}>
        {img}
      </button>
    );
  return <span className={box}>{img}</span>;
}

/**
 * A photo-booth strip: four frames on glossy paper, the names and the date stamped along its foot.
 * It is its own container and every size inside is a share of its width, so the same strip prints
 * ten units wide in the slot and forty on the wall. `developed` flips it from wet grey to its grade;
 * `develop` is how long that takes.
 */
export function Strip({ frames, filter, developed, develop = 0, names, date, ink, onOpen, className, style }: { frames: Frame<GiftPhoto>[]; filter: FilterId; developed: boolean; develop?: number; names: string; date: string; ink: string; onOpen?: (photo: GiftPhoto) => void; className?: string; style?: CSSProperties }) {
  const fade = develop ? `${develop}ms cubic-bezier(.3,.1,.3,1)` : undefined;
  // The typewriter face runs about 0.72em a letter with its spacing: long names are stamped smaller, not cut.
  const nameSize = Math.min(7.4, 84 / (Math.max(1, [...names].length) * 0.72));
  return (
    <div className={cn("relative w-full [container-type:inline-size]", className)} style={style}>
      <div className="relative overflow-hidden rounded-[1cqw]" style={{ padding: "7cqw 7cqw 0", backgroundColor: "#FCFAF4", backgroundImage: PAPER_GRAIN }}>
        <div className="flex flex-col gap-[4.5cqw]" style={{ filter: stripFilter(filter, developed), transition: fade ? `filter ${fade}` : undefined }}>
          {frames.map((frame, i) => (
            <FramePhoto key={i} frame={frame} onOpen={onOpen} />
          ))}
        </div>
        <div className="flex h-[23cqw] flex-col items-center justify-center" style={{ color: ink }}>
          {/* A tall line: `truncate` clips to the line box, and a strip printed ten units wide rounds its tiny type a pixel high. */}
          <p className="max-w-full truncate leading-[1.35] uppercase" style={{ fontFamily: TYPE_FONT, fontSize: `${nameSize.toFixed(2)}cqw`, letterSpacing: "0.12em" }}>
            {names}
          </p>
          <p className="mt-[0.6cqw] leading-none opacity-75" style={{ fontFamily: TYPE_FONT, fontSize: "5.2cqw", letterSpacing: "0.08em" }}>
            {date}
          </p>
        </div>
        {/* the sheen of a print still wet from the machine */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(115deg, rgba(255,255,255,0) 30%, rgba(255,255,255,.34) 44%, rgba(255,255,255,0) 58%)", opacity: developed ? 0 : 1, transition: fade ? `opacity ${fade}` : undefined }} />
      </div>
    </div>
  );
}

/** A heart drawn twice over in red felt-tip, the way sheet music and letters get marked. */
export function MarkerHeart({ color = "#C0142C", className, style }: { color?: string; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 40 36" className={className} style={style} aria-hidden="true">
      <path d="M20 32C14 27 4 21 4.5 12 5 6 10 3.5 14 5c3 1 5 4 6 6 1.5-3 4-6.5 8.5-6.5 5 0 8 4 7 9-1.2 7-9.5 13-15.5 18.5" fill={color} opacity=".9" />
      <path d="M19 31C13 26 3.5 19.5 5 11.5 6 6.5 11 4.5 14.5 6.2M21 11c2-4 5.5-6 9-5.2 4.5 1.2 5.8 5.4 4.4 9.6-2 5.8-8 10.4-13.2 15" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

/** A felt-tip arrow that curls round and points at something. */
export function CurlArrow({ color = "#C0142C", className }: { color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 60 70" className={className} aria-hidden="true">
      <path d="M48 4C58 18 52 34 38 38 26 41 20 30 28 26c8-4 14 8 8 20-4 8-12 14-24 18" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 55L11.5 65 21 62" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A postmark to go over a stamp: two rings, a date, and the wavy cancel lines. */
export function Postmark({ date, color = "#2E2521", className }: { date: string; color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 96 44" className={className} aria-hidden="true">
      <circle cx="22" cy="22" r="18" fill="none" stroke={color} strokeWidth="1.7" />
      <circle cx="22" cy="22" r="12.5" fill="none" stroke={color} strokeWidth="1" />
      <text x="22" y="25" textAnchor="middle" fontSize="6.4" fill={color} style={{ fontFamily: TYPE_FONT }}>
        {date}
      </text>
      <path d="M44 14c6-4 11 4 17 0s11 4 17 0 11 4 16 1M44 22c6-4 11 4 17 0s11 4 17 0 11 4 16 1M44 30c6-4 11 4 17 0s11 4 17 0 11 4 16 1" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/** A pin-back button, cream with a red rim, with two words and a heart on it. */
export function Badge({ top, bottom, color = "#B3122A" }: { top: string; bottom: string; color?: string }) {
  const id = safeId(useId());
  return (
    <svg viewBox="0 0 100 100" className="block h-auto w-full" aria-hidden="true" style={{ filter: "drop-shadow(0 calc(.5*var(--p)) calc(.9*var(--p)) rgba(40,10,15,.35))" }}>
      <defs>
        <radialGradient id={`${id}-shine`} cx="34%" cy="28%" r="80%">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".55" />
          <stop offset=".5" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <path id={`${id}-arc-top`} d="M20 52 A30 30 0 0 1 80 52" />
        <path id={`${id}-arc-bottom`} d="M17 50 A33 33 0 0 0 83 50" />
      </defs>
      <circle cx="50" cy="50" r="48" fill={color} />
      <circle cx="50" cy="50" r="40" fill="#FFF6E8" />
      <circle cx="50" cy="50" r="36.5" fill="none" stroke={color} strokeWidth="1.2" strokeDasharray="2 2.4" />
      <text fontSize="11.5" fill={color} letterSpacing="1.5" style={{ fontFamily: POSTER_FONT }}>
        <textPath href={`#${id}-arc-top`} startOffset="50%" textAnchor="middle">
          {top}
        </textPath>
      </text>
      <path d="M50 70C42 64 32 57.5 32.6 48.6 33 43 37.4 40.2 41.6 41.4c3.6 1 6.4 3.9 8.4 7.2 2-3.3 4.8-6.2 8.4-7.2 4.2-1.2 8.6 1.6 9 7.2.6 8.9-9.4 15.4-17.4 21.4Z" fill={color} />
      <text fontSize="9" fill={color} letterSpacing="2.4" style={{ fontFamily: TYPE_FONT }}>
        <textPath href={`#${id}-arc-bottom`} startOffset="50%" textAnchor="middle">
          {bottom}
        </textPath>
      </text>
      <circle cx="50" cy="50" r="48" fill={`url(#${id}-shine)`} />
    </svg>
  );
}

/** A heart for inside a stamp: flat, with a paler heart printed over it. */
export function StampHeart({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 36" className="block w-[70%]" aria-hidden="true">
      <path d="M20 33S3 22.5 3 11.5C3 5.8 7.2 2.6 11.6 2.6c3.6 0 6.5 2 8.4 5.1 1.9-3.1 4.8-5.1 8.4-5.1C32.8 2.6 37 5.8 37 11.5 37 22.5 20 33 20 33Z" fill={color} />
      <path d="M20 25S11 19.4 11 13.6c0-3 2.2-4.7 4.5-4.7 1.9 0 3.4 1 4.5 2.7 1.1-1.6 2.6-2.7 4.5-2.7 2.3 0 4.5 1.7 4.5 4.7C29 19.4 20 25 20 25Z" fill="#FFFFFF" opacity=".35" />
    </svg>
  );
}
