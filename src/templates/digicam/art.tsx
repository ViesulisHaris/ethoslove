"use client";

import { useId } from "react";
import { mulberry32 } from "../_shared/random";

/** The heart's outline, in a 100 × 90 box. */
const HEART = "M50 87C21 66 3 49 3 29 3 13 15 3 29 3c9 0 17 5 21 13 4-8 12-13 21-13 14 0 26 10 26 26 0 20-18 37-47 58Z";
const TILE_PINKS = ["#FFE4EE", "#FBC6D8", "#F7A9C4", "#F18DB1", "#E8729C", "#FFFFFF"];

/**
 * A disco heart like the one on the owner's birthday sheet, drawn rather than cut (on the sheet it
 * sits on a busy page, and it's too small there to cut cleanly): a puffy heart of pink mirror
 * tiles, lit from the top left, with a few sparkles. `seed` shuffles the tiles.
 */
export function DiscoHeart({ seed = 11, className }: { seed?: number; className?: string }) {
  const id = `dh${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const rand = mulberry32(seed);
  const tiles: { x: number; y: number; fill: string }[] = [];
  const size = 6.4;
  for (let row = 0; row * size < 92; row++)
    for (let col = 0; col * size < 102; col++) {
      const x = col * size - 1;
      const y = row * size - 1;
      // Brighter towards the top left, where the light is; now and then a tile catches it outright.
      const light = 1 - (x / 100) * 0.55 - (y / 90) * 0.6;
      const pick = Math.max(0, Math.min(TILE_PINKS.length - 2, Math.floor((1 - light) * 4 + rand() * 2.2)));
      tiles.push({ x, y, fill: rand() < 0.07 + light * 0.08 ? "#FFFFFF" : TILE_PINKS[pick] });
    }
  return (
    <svg viewBox="-4 -4 108 98" className={className} aria-hidden="true">
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={HEART} />
        </clipPath>
        <radialGradient id={`${id}-light`} cx="0.32" cy="0.26" r="0.75">
          <stop offset="0" stopColor="#FFF" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#FFF" stopOpacity="0" />
          <stop offset="1" stopColor="#7A1E45" stopOpacity="0.45" />
        </radialGradient>
      </defs>
      <path d={HEART} fill="#B4466F" transform="translate(0 2)" opacity="0.35" />
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="0" y="0" width="100" height="90" fill="#C9557F" />
        {tiles.map((t, i) => (
          <rect key={i} x={t.x + 0.5} y={t.y + 0.5} width={size - 1} height={size - 1} rx="0.6" fill={t.fill} />
        ))}
        <rect x="0" y="0" width="100" height="90" fill={`url(#${id}-light)`} />
      </g>
      <path d={HEART} fill="none" stroke="#FFF" strokeOpacity="0.55" strokeWidth="1.2" />
      {[
        { x: 28, y: 18, s: 7 },
        { x: 70, y: 13, s: 4.5 },
        { x: 40, y: 44, s: 3.5 },
      ].map((p, i) => (
        <path key={i} d={`M${p.x} ${p.y - p.s}Q${p.x + p.s * 0.16} ${p.y - p.s * 0.16} ${p.x + p.s} ${p.y}Q${p.x + p.s * 0.16} ${p.y + p.s * 0.16} ${p.x} ${p.y + p.s}Q${p.x - p.s * 0.16} ${p.y + p.s * 0.16} ${p.x - p.s} ${p.y}Q${p.x - p.s * 0.16} ${p.y - p.s * 0.16} ${p.x} ${p.y - p.s}Z`} fill="#FFF" />
      ))}
    </svg>
  );
}
