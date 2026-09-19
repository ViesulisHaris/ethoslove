"use client";

/**
 * The cake on the stage: three tiers on a footed stand, icing dripping over every edge, piped
 * dots along the bases, a ribbon in the sender's colour, sprinkles, striped candles and, past
 * twelve, their age on a topper. Painted the way the balloons are — a gradient with grain over
 * it and an ink line round it. The flames are drawn on a canvas over this, so `candleSpots`
 * says where each wick is, in the drawing's own units.
 */
import { useId } from "react";
import { mulberry32 } from "../_shared/random";

/** The drawing's size, in its own units; the wrapper keeps this ratio. */
export const CAKE_BOX = { w: 200, h: 170 };

const TOP = { x: 64, y: 42, w: 72 };
const MIDDLE = { x: 46, y: 76, w: 108 };

/**
 * Where the candles stand: up to six on the top tier, the rest along the front of the middle
 * one. With a topper on the top tier, they all stand on the middle one, six at most, so the
 * number is never behind a flame. Each spot is the wick's tip, where the flame sits.
 */
export function candleSpots(count: number, topper = false): { x: number; y: number; tier: number }[] {
  const n = Math.max(0, Math.min(topper ? 6 : 12, count));
  const spots: { x: number; y: number; tier: number }[] = [];
  const onTop = topper ? 0 : Math.min(6, n);
  const onMiddle = n - onTop;
  const row = (k: number, tier: { x: number; y: number; w: number }, level: number) => {
    const inset = 10;
    const span = tier.w - inset * 2;
    for (let i = 0; i < k; i++) {
      const t = k === 1 ? 0.5 : i / (k - 1);
      spots.push({ x: tier.x + inset + span * t, y: tier.y - 26 + (i % 2) * 1.5, tier: level });
    }
  };
  row(onTop, TOP, 0);
  row(onMiddle, MIDDLE, 1);
  return spots;
}

const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");

/** A run of icing drips along a tier's top edge: rounded tongues of different lengths. */
function drips(x: number, y: number, w: number, rng: () => number): string {
  const n = Math.max(4, Math.round(w / 12));
  const step = w / n;
  let d = `M${x} ${y - 3} h${w} v6`;
  for (let i = n - 1; i >= 0; i--) {
    const cx = x + step * (i + 0.5);
    const len = 6 + rng() * 9;
    const r = step * 0.42;
    d += ` L${(cx + r).toFixed(1)} ${y + 3} C${(cx + r).toFixed(1)} ${(y + 3 + len).toFixed(1)} ${(cx - r).toFixed(1)} ${(y + 3 + len).toFixed(1)} ${(cx - r).toFixed(1)} ${y + 3}`;
  }
  return `${d} L${x} ${y + 3} Z`;
}

type Tier = { x: number; y: number; w: number; h: number; light: string; deep: string };

export function CakeArt({ count, accent, topper, seed }: { count: number; accent: string; topper: string[]; seed: number }) {
  const uid = safeId(useId());
  const rng = mulberry32(seed);
  const tiers: Tier[] = [
    { x: 30, y: 110, w: 140, h: 38, light: "#F7DCD3", deep: "#E4B8AC" },
    { x: MIDDLE.x, y: MIDDLE.y, w: MIDDLE.w, h: 36, light: "#FAE6DE", deep: "#E9C4B8" },
    { x: TOP.x, y: TOP.y, w: TOP.w, h: 36, light: "#FCEEE8", deep: "#EECDC2" },
  ];
  const icing = "#FFF8F0";
  const ink = "#9E6558";
  const spots = candleSpots(count, topper.length > 0);
  const sprinkleColors = [accent, "#F2C879", "#8FC1B5", "#FFFFFF", "#E9A0B2"];
  const sprinkles = Array.from({ length: 34 }, (_, i) => {
    const tier = tiers[i % 3];
    return { x: tier.x + 8 + rng() * (tier.w - 16), y: tier.y + 14 + rng() * (tier.h - 22), rot: rng() * 180, color: sprinkleColors[i % sprinkleColors.length] };
  });

  return (
    <svg viewBox={`0 0 ${CAKE_BOX.w} ${CAKE_BOX.h}`} className="h-full w-full" style={{ overflow: "visible" }} aria-hidden="true">
      <defs>
        {tiers.map((t, i) => (
          <linearGradient key={i} id={`${uid}-t${i}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={t.deep} />
            <stop offset=".22" stopColor={t.light} />
            <stop offset=".7" stopColor={t.light} />
            <stop offset="1" stopColor={t.deep} />
          </linearGradient>
        ))}
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".35" />
          <stop offset=".5" stopColor="#FFFFFF" stopOpacity=".12" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity=".35" />
        </linearGradient>
        <filter id={`${uid}-g`} x="0" y="0" width="1" height="1">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed={seed % 100} />
          <feColorMatrix values="0 0 0 0 .25 0 0 0 0 .12 0 0 0 0 .08 0 0 0 .5 0" />
        </filter>
        <clipPath id={`${uid}-c`}>
          {tiers.map((t, i) => (
            <rect key={i} x={t.x} y={t.y} width={t.w} height={t.h} rx="5" />
          ))}
        </clipPath>
        <filter id={`${uid}-s`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* the stand: a glass plate on a stem */}
      <ellipse cx="100" cy="166" rx="42" ry="4.5" fill="#000" opacity=".35" filter={`url(#${uid}-s)`} />
      <path d="M86 150 L82 164 H118 L114 150 Z" fill="#E9E2D8" stroke={ink} strokeOpacity=".35" strokeWidth=".8" />
      <ellipse cx="100" cy="164" rx="20" ry="3.5" fill="#EDE6DC" stroke={ink} strokeOpacity=".3" strokeWidth=".8" />
      <ellipse cx="100" cy="150" rx="82" ry="9" fill="#F3EDE4" stroke={ink} strokeOpacity=".35" strokeWidth=".9" />
      <ellipse cx="100" cy="148" rx="74" ry="6" fill={`url(#${uid}-glass)`} />

      {/* the tiers, bottom to top */}
      {tiers.map((t, i) => (
        <g key={i}>
          <ellipse cx={t.x + t.w / 2} cy={t.y + t.h + 2} rx={t.w / 2} ry="4" fill="#000" opacity=".22" filter={`url(#${uid}-s)`} />
          <rect x={t.x} y={t.y} width={t.w} height={t.h} rx="5" fill={`url(#${uid}-t${i})`} />
          {i === 1 ? <rect x={t.x} y={t.y + t.h - 13} width={t.w} height="8" fill={accent} opacity=".85" /> : null}
          {i === 1 ? <rect x={t.x} y={t.y + t.h - 10} width={t.w} height="1.6" fill="#FFFFFF" opacity=".35" /> : null}
          {/* piped dots along the base */}
          {Array.from({ length: Math.round(t.w / 7) }, (_, k) => (
            <circle key={k} cx={t.x + 3.5 + k * 7 + (7 - ((t.w - 7) % 7)) / 2 - 3.5 + 3.5} cy={t.y + t.h - 1} r="2.6" fill={icing} stroke={ink} strokeOpacity=".25" strokeWidth=".5" />
          ))}
          {/* icing over the top edge, dripping */}
          <path d={drips(t.x - 2, t.y + 1, t.w + 4, rng)} fill={icing} stroke={ink} strokeOpacity=".28" strokeWidth=".7" strokeLinejoin="round" />
          <path d={`M${t.x + 6} ${t.y - 1} h${t.w - 12}`} stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity=".7" />
          <rect x={t.x} y={t.y} width={t.w} height={t.h} rx="5" fill="none" stroke={ink} strokeOpacity=".45" strokeWidth=".9" />
        </g>
      ))}
      <rect x="0" y="0" width="200" height="170" clipPath={`url(#${uid}-c)`} filter={`url(#${uid}-g)`} opacity=".2" style={{ mixBlendMode: "multiply" }} />
      {sprinkles.map((s, i) => (
        <rect key={i} x={s.x} y={s.y} width="3.4" height="1.3" rx=".6" fill={s.color} transform={`rotate(${s.rot.toFixed(0)} ${s.x.toFixed(1)} ${s.y.toFixed(1)})`} opacity=".9" />
      ))}

      {/* the candles: striped, with a wick the flame sits on */}
      {spots.map((c, i) => (
        <g key={i}>
          <rect x={c.x - 2.6} y={c.y + 4} width="5.2" height="22" rx="1.4" fill="#FFF6EE" stroke={ink} strokeOpacity=".4" strokeWidth=".6" />
          {[0, 1, 2, 3].map((k) => (
            <rect key={k} x={c.x - 2.6} y={c.y + 6.5 + k * 5.4} width="5.2" height="2.2" fill={i % 2 ? accent : "#F2879F"} opacity=".8" />
          ))}
          <path d={`M${c.x} ${c.y + 4} v-4`} stroke="#3A2A24" strokeWidth=".9" strokeLinecap="round" />
        </g>
      ))}

      {/* past twelve: the age on a topper */}
      {topper.length ? (
        <g>
          <path d="M92 42 v-16 M108 42 v-16" stroke="#3A2A24" strokeOpacity=".8" strokeWidth="1" />
          {topper.map((d, i) => (
            <text key={i} x={100 + (i - (topper.length - 1) / 2) * 17} y="26" textAnchor="middle" fontSize="27" fontWeight="900" fill={accent} stroke="#FFF8F0" strokeWidth="2.6" paintOrder="stroke" strokeLinejoin="round" style={{ fontFamily: "var(--font-gift-display), Georgia, serif", fontVariationSettings: '"wght" 900, "SOFT" 100, "opsz" 144' }}>
              {d}
            </text>
          ))}
        </g>
      ) : null}
    </svg>
  );
}
