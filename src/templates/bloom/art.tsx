"use client";

/**
 * The room the flower stands in: a sunlit windowsill, the ceramic pot the WebGL stem rises out
 * of, and the ribbon tag tied round it. All of it is drawn over the canvas and never takes a
 * pointer, so the hold-to-bloom gesture still has the whole screen to itself.
 */
import { useId } from "react";
import { NameTag, PAPER_GRAIN } from "../_shared/cover-kit";

/** The ledge, the pot on it and the tag above it, measured up from the bottom edge in --k. */
export const SILL_H = 30;
const POT_BASE = 27;
/** The stem and the feet of both leaves stand behind it: that is what makes the plant look potted. */
const POT_W = 48;
/** Without a pot, the bottom of the bow-and-tag's box: the bow lands about 27k above this. */
const STEM_TAG_BASE = 31;

export const BLOOM_KEYFRAMES = `
.bl-tag{transform-origin:50% 0;animation:bl-tag 6.2s ease-in-out infinite alternate}
@keyframes bl-tag{from{rotate:-7deg}to{rotate:-1deg}}
@media (prefers-reduced-motion: reduce){.bl-tag{animation:none;rotate:-4deg}}
`;

export type SillColors = { top: string; face: string; edge: string };
export type PotColors = { body: string; rim: string; shade: string; soil: string };

/** The ledge: its top catching the light edge-on, its front face falling into shadow. */
export function Windowsill({ colors }: { colors: SillColors }) {
  return (
    <div aria-hidden="true" className="absolute inset-x-0 bottom-0" style={{ height: `calc(${SILL_H} * var(--k))` }}>
      <div
        className="absolute inset-x-0 top-0"
        style={{ height: `calc(6 * var(--k))`, backgroundImage: `linear-gradient(180deg, ${colors.top}, ${colors.face})` }}
      />
      <div
        className="absolute inset-x-0 top-[calc(6*var(--k))] bottom-0"
        style={{ backgroundColor: colors.face, backgroundImage: PAPER_GRAIN }}
      />
      {/* The bullnose along the front lip, and the shadow the ledge throws under itself. */}
      <div className="absolute inset-x-0 top-[calc(5.4*var(--k))]" style={{ height: `calc(.7 * var(--k))`, backgroundColor: colors.edge }} />
      <div
        className="absolute inset-x-0 top-[calc(6.1*var(--k))]"
        style={{ height: `calc(3 * var(--k))`, backgroundImage: "linear-gradient(180deg, rgba(0,0,0,.22), transparent)" }}
      />
    </div>
  );
}

/** The pot, and the shadow it presses into the ledge. The stem meets the soil behind the rim. */
export function Pot({ colors }: { colors: PotColors }) {
  const id = useId().replace(/:/g, "");
  return (
    <div
      aria-hidden="true"
      className="absolute left-1/2 -translate-x-1/2"
      style={{ bottom: `calc(${POT_BASE} * var(--k))`, width: `calc(${POT_W} * var(--k))` }}
    >
      <span
        className="absolute left-1/2 h-[calc(4*var(--k))] w-[128%] -translate-x-1/2 rounded-[50%]"
        style={{ bottom: `calc(-2.2 * var(--k))`, backgroundColor: colors.shade, filter: "blur(calc(1.4*var(--k)))" }}
      />
      <svg viewBox="0 0 140 104" className="relative w-full" style={{ filter: "drop-shadow(0 calc(.8*var(--k)) calc(1.2*var(--k)) rgba(40,20,10,.28))" }}>
        <defs>
          <linearGradient id={`${id}-glaze`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity=".22" />
            <stop offset=".16" stopColor="#fff" stopOpacity=".34" />
            <stop offset=".52" stopColor="#fff" stopOpacity=".05" />
            <stop offset="1" stopColor="#000" stopOpacity=".28" />
          </linearGradient>
        </defs>
        {/* A sliver of soil above the collar, then the collar, then the body tapering under it. */}
        <path d="M18 11 Q70 -1 122 11 Z" fill={colors.soil} />
        <path d="M9 30 L19 92 Q21 100 33 100 H107 Q119 100 121 92 L131 30 Z" fill={colors.body} />
        <path d="M9 30 L19 92 Q21 100 33 100 H107 Q119 100 121 92 L131 30 Z" fill={`url(#${id}-glaze)`} />
        <path d="M2 10 H138 L131 31 H9 Z" fill={colors.rim} />
        <path d="M2 10 H138 L131 31 H9 Z" fill={`url(#${id}-glaze)`} />
        <path d="M9 31 H131" stroke="rgba(0,0,0,.16)" strokeWidth="2.2" />
        <path d="M14 14 H44" stroke="rgba(255,255,255,.42)" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M26 40 C24 58 25 76 30 90" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/**
 * How big the name can be written on a tag `widthK` wide before it has to wrap. The tag hangs in
 * a fixed place with something underneath it, so a long name gets smaller, not taller.
 */
function nameSizeFor(name: string, widthK: number) {
  const chars = Math.max(1, [...name.trim()].length);
  // 6.4k of padding; handwriting runs at about 0.46em a letter.
  const fit = (widthK - 6.4) / (chars * 0.46);
  return `calc(${Math.max(3, Math.min(5.4, fit)).toFixed(2)} * var(--k))`;
}

/**
 * The ribbon tied round the pot's collar, its bow, and the name tag hanging from it.
 *
 * It lives on the pot because the pot is the one thing here that holds still. It used to be tied
 * "round the stem" — but the stem is inside a WebGL flower that turns, and the bow was a flat
 * drawing pinned over it: on the peony it sat on the petals and stayed put while they span past.
 * This is drawn in the pot's own box and the pot's own viewBox, so the two cannot drift apart.
 */
export function PotTag({
  name,
  forLabel,
  ribbon,
  ribbonDeep,
  paper,
  ink,
}: {
  name: string;
  forLabel: string;
  ribbon: string;
  ribbonDeep: string;
  paper: string;
  ink: string;
}) {
  const id = useId().replace(/:/g, "");
  // A longer name gets a wider tag first, then smaller writing.
  const chars = [...name.trim()].length;
  const widthPct = Math.min(60, Math.max(42, 28 + chars * 2.6));
  const widthK = (POT_W * widthPct) / 100;
  return (
    <div
      aria-hidden="true"
      className="absolute left-1/2 -translate-x-1/2"
      style={{ bottom: `calc(${POT_BASE} * var(--k))`, width: `calc(${POT_W} * var(--k))`, aspectRatio: "140 / 104" }}
    >
      <svg viewBox="0 0 140 104" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <linearGradient id={`${id}-sheen`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity=".2" />
            <stop offset=".16" stopColor="#fff" stopOpacity=".3" />
            <stop offset=".52" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".26" />
          </linearGradient>
        </defs>
        {/* The band, following the collar's taper, lit the way the glaze under it is. */}
        <path d="M4.2 16.5 H135.8 L133 25 H7 Z" fill={ribbon} />
        <path d="M4.2 16.5 H135.8 L133 25 H7 Z" fill={`url(#${id}-sheen)`} />
        <path d="M6.9 24.6 H133.1" stroke={ribbonDeep} strokeWidth="1.2" strokeOpacity=".75" />
        <path d="M4.6 17.4 H135.4" stroke="#fff" strokeWidth="1" strokeOpacity=".35" />
        {/* the strand from the knot to the tag's hole */}
        <path d="M52 23 C62 25 74 27 84 34.5" fill="none" stroke={ribbon} strokeWidth="2.4" strokeLinecap="round" />
        <g transform="translate(48 20.5) scale(1.46)">
          <ellipse cx="-7" cy="-1" rx="7.4" ry="4.4" transform="rotate(-20)" fill={ribbon} />
          <ellipse cx="7" cy="-1" rx="7.4" ry="4.4" transform="rotate(20)" fill={ribbon} />
          <ellipse cx="-7" cy="-1" rx="7.4" ry="4.4" transform="rotate(-20)" fill="none" stroke={ribbonDeep} strokeWidth="1" />
          <ellipse cx="7" cy="-1" rx="7.4" ry="4.4" transform="rotate(20)" fill="none" stroke={ribbonDeep} strokeWidth="1" />
          <path d="M-1.5 3 C-4 9 -6 13 -9 17 M1.5 3 C4 9 5 13 8 18" fill="none" stroke={ribbon} strokeWidth="2.6" strokeLinecap="round" />
          <circle r="3.2" fill={ribbonDeep} />
        </g>
      </svg>
      {/* Hangs from its hole, which sits where the strand ends: 84 across, 27 down, in the viewBox. */}
      <div className="absolute" style={{ left: "60%", top: "26%", width: `${widthPct}%` }}>
        <div className="bl-tag -translate-x-1/2">
          <NameTag name={name} eyebrow={forLabel} paper={paper} ink={ink} nameSize={nameSizeFor(name, widthK)} />
        </div>
      </div>
    </div>
  );
}

/**
 * With the pot turned off there is nothing still to tie it to but the stem, so the bow goes on
 * the bare stem well under the flower head — low enough that no petal of the widest flower, the
 * peony, hangs over it. A stem turning on its own axis looks the same from every side, so a bow
 * that holds still on it reads as tied; a bow over turning petals did not.
 */
export function StemTag({
  name,
  forLabel,
  ribbon,
  ribbonDeep,
  paper,
  ink,
}: {
  name: string;
  forLabel: string;
  ribbon: string;
  ribbonDeep: string;
  paper: string;
  ink: string;
}) {
  return (
    <div
      aria-hidden="true"
      className="absolute left-1/2 -translate-x-1/2"
      style={{ bottom: `calc(${STEM_TAG_BASE} * var(--k))`, width: `calc(48 * var(--k))`, aspectRatio: "48 / 34" }}
    >
      <svg viewBox="0 0 96 68" className="absolute inset-0 h-full w-full overflow-visible">
        {/* the strand running from the knot out to the tag's hole */}
        <path d="M52 17 C60 20 66 25 69 32" fill="none" stroke={ribbon} strokeWidth="2.2" strokeLinecap="round" />
        <g transform="translate(48 14)">
          <ellipse cx="-7" cy="-1" rx="7.4" ry="4.4" transform="rotate(-20)" fill={ribbon} />
          <ellipse cx="7" cy="-1" rx="7.4" ry="4.4" transform="rotate(20)" fill={ribbon} />
          <ellipse cx="-7" cy="-1" rx="7.4" ry="4.4" transform="rotate(-20)" fill="none" stroke={ribbonDeep} strokeWidth="1" />
          <ellipse cx="7" cy="-1" rx="7.4" ry="4.4" transform="rotate(20)" fill="none" stroke={ribbonDeep} strokeWidth="1" />
          <path d="M-1.5 3 C-4 9 -6 13 -9 17 M1.5 3 C4 9 5 13 8 18" fill="none" stroke={ribbon} strokeWidth="2.6" strokeLinecap="round" />
          <circle r="3.2" fill={ribbonDeep} />
        </g>
      </svg>
      <div className="absolute" style={{ left: "72%", top: "47%", width: "44%" }}>
        <div className="bl-tag -translate-x-1/2">
          <NameTag name={name} eyebrow={forLabel} paper={paper} ink={ink} nameSize={nameSizeFor(name, 48 * 0.44)} />
        </div>
      </div>
    </div>
  );
}
