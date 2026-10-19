"use client";

import { useId } from "react";
import type { Look } from "./looks";

/** The three things that can sit in a jar: a heart, a star, a crescent. Drawn in a 12 × 12 box about the origin. */
export type IconId = "heart" | "star" | "moon";
export const ICONS: IconId[] = ["heart", "star", "moon"];
const ICON_PATH: Record<IconId, string> = {
  heart: "M0 4.6 C -5 1 -5 -3.2 -2.4 -3.8 C -1 -4 0 -3.2 0 -2.2 C 0 -3.2 1 -4 2.4 -3.8 C 5 -3.2 5 1 0 4.6 Z",
  star: "M0 -5 L1.5 -1.6 L5 -1.5 L2.3 0.8 L3.2 4.4 L0 2.4 L-3.2 4.4 L-2.3 0.8 L-5 -1.5 L-1.5 -1.6 Z",
  moon: "M2 -5 A 5 5 0 1 0 2 5 A 4 4 0 1 1 2 -5 Z",
};

/** The heart the steam draws as it leaves the pot, in a 100 × 90 box. */
export const STEAM_HEART = "M50 84 C 8 54 4 24 28 14 C 40 9 50 17 50 25 C 50 17 60 9 72 14 C 96 24 92 54 50 84 Z";

/** The window over the shelf: a moon, two bats, and a black cat on the sill with its eyes on the pot. */
export function WindowArt({ look }: { look: Look }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 30 36" className="block h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}n`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look.night[0]} />
          <stop offset="1" stopColor={look.night[1]} />
        </linearGradient>
        <radialGradient id={`${id}m`}>
          <stop offset="0" stopColor="#fff8dc" />
          <stop offset="1" stopColor="#fff8dc" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}c`}>
          <path d="M3 34 V12 A12 11 0 0 1 27 12 V34 Z" />
        </clipPath>
      </defs>
      <path d="M1.5 35 V12 A13.5 12.5 0 0 1 28.5 12 V35 Z" fill="#2a1a10" />
      <g clipPath={`url(#${id}c)`}>
        <rect x="0" y="0" width="30" height="36" fill={`url(#${id}n)`} />
        <circle cx="20" cy="13" r="9" fill={`url(#${id}m)`} opacity=".55" />
        <circle cx="20" cy="13" r="4.3" fill="#fff6d6" />
        <circle cx="21.6" cy="12" r="3.7" fill={look.night[1]} opacity=".55" />
        {[[6, 8], [11, 5], [24, 22], [8, 17]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r=".35" fill="#fff" opacity=".8" />
        ))}
        <path d="M8 14 q1.4 -1.6 2.8 0 q1.4 -1.6 2.8 0 q-1.4 1 -2.8 2 q-1.4 -1 -2.8 -2 Z" fill="#05040c" opacity=".9" />
        <path d="M17 24 q1 -1.2 2 0 q1 -1.2 2 0 q-1 .8 -2 1.5 q-1 -.7 -2 -1.5 Z" fill="#05040c" opacity=".9" />
      </g>
      {/* the mullions and the sill */}
      <path d="M15 1 V35 M3 17 H27" stroke="#2a1a10" strokeWidth="1.1" />
      <path d="M3 34 V12 A12 11 0 0 1 27 12 V34" fill="none" stroke="#3b2616" strokeWidth="1.1" />
      <rect x="0" y="34" width="30" height="2.4" rx=".6" fill="#3b2616" />
      {/* the cat */}
      <g transform="translate(3.2 20.4)" fill="#05040a">
        <path d="M2.2 13.6 C 1.2 8.6 4 6.8 7 7.4 C 10.4 6.8 12.6 9 11.8 13.6 Z" />
        <circle cx="7.2" cy="5" r="3.1" />
        <path d="M4.6 3.4 L5.1 0.5 L7 2.4 Z M9.8 3.4 L9.3 0.5 L7.4 2.4 Z" />
        <path d="M11.8 13 C 15 13.2 15.8 9.4 13.8 8" fill="none" stroke="#05040a" strokeWidth="1.3" strokeLinecap="round" className="cb-tail" />
        <g fill="#ffe36b" className="cb-blink">
          <ellipse cx="5.9" cy="5.1" rx=".75" ry="1" />
          <ellipse cx="8.5" cy="5.1" rx=".75" ry="1" />
        </g>
      </g>
    </svg>
  );
}

/** Three bunches of dried herbs hanging from a beam, swaying a little at different speeds. */
export function Herbs() {
  const bunches = [
    { x: 30, len: 12, leaf: "#566b2e", dur: 5.2 },
    { x: 74, len: 22, leaf: "#6b7f3a", dur: 6.4 },
  ];
  return (
    <svg viewBox="0 0 100 40" className="block h-full w-full overflow-visible" aria-hidden="true">
      <rect x="-10" y="0" width="120" height="3" fill="#2a1a10" />
      {bunches.map((b, i) => (
        <g key={i} className="cb-sway" style={{ transformOrigin: `${b.x}px 3px`, animationDuration: `${b.dur}s`, animationDelay: `${-i * 1.3}s` }}>
          <path d={`M${b.x} 3 V${b.len}`} stroke="#c9b48a" strokeWidth=".7" />
          <g transform={`translate(${b.x} ${b.len})`} fill={b.leaf}>
            {[-5, -2.4, 0, 2.4, 5].map((dx, j) => (
              <ellipse key={j} cx={dx * 0.9} cy={7 + (j % 2) * 2} rx="1.7" ry={7 - (j % 2)} transform={`rotate(${dx * 4})`} />
            ))}
            <rect x="-2" y="-.4" width="4" height="1.6" rx=".8" fill="#c9b48a" />
          </g>
        </g>
      ))}
    </svg>
  );
}

/** The back of the pot: the far half of its rim and the dark inside. The liquid is a layer of its own, above this. */
export function PotBack() {
  return (
    <svg viewBox="0 0 100 80" className="block h-full w-full overflow-visible" aria-hidden="true">
      <path d="M9 13 A41 10 0 0 1 91 13 L86 13.6 A36 7.2 0 0 0 14 13.6 Z" fill="#323a41" />
      <ellipse cx="50" cy="13.6" rx="36" ry="7.2" fill="#070a09" />
    </svg>
  );
}

/** The front of the pot: its belly, the near half of the rim, the handles and the legs. */
export function PotFront({ look }: { look: Look }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 100 80" className="block h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b444b" />
          <stop offset=".45" stopColor="#1f262b" />
          <stop offset="1" stopColor="#0a0d10" />
        </linearGradient>
        <radialGradient id={`${id}h`} cx="26%" cy="38%" r="55%">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}f`} cx="50%" cy="100%" r="70%">
          <stop offset="0" stopColor={look.fire[0]} stopOpacity=".5" />
          <stop offset="1" stopColor={look.fire[0]} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="21" y="70" width="10" height="9" rx="3.4" fill="#0b0e11" />
      <rect x="69" y="70" width="10" height="9" rx="3.4" fill="#0b0e11" />
      <circle cx="5" cy="25" r="4.2" fill="none" stroke="#161b1f" strokeWidth="2.2" />
      <circle cx="95" cy="25" r="4.2" fill="none" stroke="#161b1f" strokeWidth="2.2" />
      <path d="M10 13.5 C 0 38, 6 66, 30 74 C 40 77.6, 60 77.6, 70 74 C 94 66, 100 38, 90 13.5 A41 10 0 0 1 10 13.5 Z" fill={`url(#${id}b)`} />
      <path d="M10 13.5 C 0 38, 6 66, 30 74 C 40 77.6, 60 77.6, 70 74 C 94 66, 100 38, 90 13.5 A41 10 0 0 1 10 13.5 Z" fill={`url(#${id}h)`} />
      <path d="M10 13.5 C 0 38, 6 66, 30 74 C 40 77.6, 60 77.6, 70 74 C 94 66, 100 38, 90 13.5 A41 10 0 0 1 10 13.5 Z" fill={`url(#${id}f)`} />
      <path d="M9 13 A41 10 0 0 0 91 13 L86 13.6 A36 7.2 0 0 1 14 13.6 Z" fill="#454f57" />
      <path d="M9 13 A41 10 0 0 0 91 13" fill="none" stroke="#0a0d0f" strokeWidth=".7" />
      <path d="M14 13.6 A36 7.2 0 0 0 86 13.6" fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth=".5" />
      <path d="M15 27 C 9 42, 13 58, 25 67" fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth="2.2" strokeLinecap="round" />
      {[24, 37, 50, 63, 76].map((x) => (
        <circle key={x} cx={x} cy="21.6" r=".95" fill="#fff" opacity=".13" />
      ))}
    </svg>
  );
}

/** The fire under the pot: two logs and five tongues of flame that never agree about their height. */
export function Fire({ look }: { look: Look }) {
  const flames = [
    { x: 22, h: 22, w: 8, d: 1.1 },
    { x: 38, h: 30, w: 10, d: 0.9 },
    { x: 54, h: 34, w: 11, d: 1.3 },
    { x: 70, h: 28, w: 10, d: 1.0 },
    { x: 84, h: 20, w: 7, d: 1.2 },
  ];
  return (
    <svg viewBox="0 0 100 40" className="block h-full w-full overflow-visible" aria-hidden="true">
      <rect x="14" y="33" width="46" height="6" rx="3" fill="#2a160a" transform="rotate(-5 37 36)" />
      <rect x="40" y="33" width="46" height="6" rx="3" fill="#35200f" transform="rotate(5 63 36)" />
      {flames.map((f, i) => (
        <g key={i} className="cb-flame" style={{ transformOrigin: `${f.x}px 36px`, animationDuration: `${f.d}s`, animationDelay: `${-i * 0.27}s` }}>
          <path d={`M${f.x} ${36 - f.h} C ${f.x + f.w * 0.9} ${36 - f.h * 0.55}, ${f.x + f.w * 0.8} ${36}, ${f.x} 36 C ${f.x - f.w * 0.8} 36, ${f.x - f.w * 0.9} ${36 - f.h * 0.55}, ${f.x} ${36 - f.h} Z`} fill={look.fire[0]} opacity=".92" />
          <path d={`M${f.x} ${36 - f.h * 0.6} C ${f.x + f.w * 0.5} ${36 - f.h * 0.3}, ${f.x + f.w * 0.4} 36, ${f.x} 36 C ${f.x - f.w * 0.4} 36, ${f.x - f.w * 0.5} ${36 - f.h * 0.3}, ${f.x} ${36 - f.h * 0.6} Z`} fill={look.fire[1]} />
        </g>
      ))}
    </svg>
  );
}

/**
 * A jar from the shelf: glass, a cork, and, while it is full, a glowing heart, star or moon inside.
 * Emptied, it stays on the shelf, dull. The label with their words is the template's, laid over it.
 */
export function Jar({ look, icon, full, hint, tint }: { look: Look; icon: IconId; full: boolean; hint: boolean; tint: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 44 56" className="block h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}g`}>
          <stop offset="0" stopColor={tint} stopOpacity=".7" />
          <stop offset=".6" stopColor={tint} stopOpacity=".18" />
          <stop offset="1" stopColor={tint} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}w`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".2" />
          <stop offset="1" stopColor="#fff" stopOpacity=".05" />
        </linearGradient>
      </defs>
      <ellipse cx="22" cy="55" rx="17" ry="1.6" fill="#000" opacity=".45" />
      {full ? <circle cx="22" cy="24" r="19" fill={`url(#${id}g)`} className="cb-glow" /> : null}
      <path d="M8 14 C 2 18, 2 24, 2 30 V46 C 2 52, 6 54, 12 54 H32 C 38 54, 42 52, 42 46 V30 C 42 24, 42 18, 36 14 Z" fill={`url(#${id}w)`} stroke="#fff" strokeOpacity=".42" strokeWidth=".8" />
      <rect x="13" y="8" width="18" height="6.5" rx="1.6" fill="#fff" fillOpacity=".1" stroke="#fff" strokeOpacity=".35" strokeWidth=".7" />
      <rect x="11" y="1.5" width="22" height="8" rx="2.4" fill="#8a6038" />
      <path d="M14 4.4 H30 M14 6.6 H28" stroke="#5a3b1e" strokeWidth=".5" opacity=".7" />
      {full ? (
        <g transform="translate(22 23)">
          <g className="cb-bob">
            <path d={ICON_PATH[icon]} fill={tint} transform="scale(1.7)" />
            <path d={ICON_PATH[icon]} fill="#fff" opacity=".45" transform="scale(1.05)" />
          </g>
        </g>
      ) : null}
      <path d="M7 20 C 4 24, 4 34, 5 44" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.2" strokeLinecap="round" />
      {hint && full ? <circle cx="22" cy="28" r="22" fill="none" stroke={look.liquid[1]} strokeWidth=".9" className="cb-hint" /> : null}
    </svg>
  );
}

/** The finished potion: a round flask with the brew in it, glowing. The cork is the template's, so it can fly. */
export function Bottle({ color, corked = true }: { color: string; corked?: boolean }) {
  const id = useId().replace(/:/g, "");
  const BODY = "M25 26 C 14 30, 4 42, 4 57 C 4 73, 16 81, 30 81 C 44 81, 56 73, 56 57 C 56 42, 46 30, 35 26 Z";
  return (
    <svg viewBox="0 0 60 88" className="block h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}g`}>
          <stop offset="0" stopColor={color} stopOpacity=".75" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".95" />
          <stop offset="1" stopColor={color} stopOpacity=".65" />
        </linearGradient>
        <clipPath id={`${id}c`}>
          <path d={BODY} />
        </clipPath>
      </defs>
      <circle cx="30" cy="58" r="42" fill={`url(#${id}g)`} className="cb-glow" />
      <path d={BODY} fill="#fff" fillOpacity=".08" />
      <g clipPath={`url(#${id}c)`}>
        <rect x="0" y="40" width="60" height="50" fill={`url(#${id}l)`} />
        <path d="M0 40 C 10 36, 20 44, 30 40 S 50 36, 60 40 V44 H0 Z" fill={color} opacity=".55" className="cb-wave" />
        {[[18, 62, 2.4], [38, 56, 1.8], [30, 70, 2.8], [44, 68, 1.5], [14, 74, 1.6]].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity=".28" className="cb-fizz" style={{ animationDelay: `${-i * 0.6}s` }} />
        ))}
      </g>
      <path d={BODY} fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1" />
      <rect x="24.5" y="12" width="11" height="15" rx="2" fill="#fff" fillOpacity=".12" stroke="#fff" strokeOpacity=".5" strokeWidth=".9" />
      <rect x="22" y="22" width="16" height="3.2" rx="1.4" fill="#fff" fillOpacity=".22" />
      <path d="M11 44 C 7 50, 7 62, 9 71" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round" />
      {corked ? (
        <g>
          <rect x="23.5" y="3" width="13" height="11" rx="2.6" fill="#a47a48" />
          <path d="M26 6 H34 M26 9 H33" stroke="#6f4d28" strokeWidth=".6" opacity=".7" />
        </g>
      ) : null}
    </svg>
  );
}

/** A cork on its own, for the moment it leaves the bottle. */
export function Cork() {
  return (
    <svg viewBox="0 0 13 11" className="block h-full w-full" aria-hidden="true">
      <rect x="0" y="0" width="13" height="11" rx="2.6" fill="#a47a48" />
      <path d="M2.5 3 H10.5 M2.5 6 H9.5" stroke="#6f4d28" strokeWidth=".6" opacity=".7" />
    </svg>
  );
}

/** A glowing heart, an orb or a star as a flying ingredient. */
export function Essence({ icon, tint }: { icon: IconId; tint: string }) {
  return (
    <svg viewBox="-9 -9 18 18" className="block h-full w-full overflow-visible" aria-hidden="true">
      <circle r="8.4" fill={tint} opacity=".3" />
      <circle r="5.4" fill={tint} opacity=".35" />
      <path d={ICON_PATH[icon]} fill={tint} transform="scale(1.1)" />
      <path d={ICON_PATH[icon]} fill="#fff" opacity=".55" transform="scale(.6)" />
    </svg>
  );
}
