"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import { PAPER_GRAIN } from "../_shared/cover-kit";
import type { Look, LookId, PumpkinPaint } from "./looks";
import { LOOKS } from "./looks";

/**
 * Be My Boo's own drawings: a little sheet ghost, a black cat lying over a photo, watercolour
 * pumpkins, bats and stars, and the print the page is papered with. All drawn here from scratch,
 * in the soft, round style of the Halloween photo frames people make on Pinterest; no character or
 * brand artwork. Strings for the print (it is a CSS background, painted once), components for the
 * pieces that move.
 */

// ---------------------------------------------------------------- the print on the page

const PUMPKIN_RIBS = [
  { cx: 34, cy: 62, rx: 22, ry: 31, tone: "deep" },
  { cx: 86, cy: 62, rx: 22, ry: 31, tone: "deep" },
  { cx: 47, cy: 61, rx: 23, ry: 34, tone: "body" },
  { cx: 73, cy: 61, rx: 23, ry: 34, tone: "body" },
  { cx: 60, cy: 60, rx: 20, ry: 36, tone: "light" },
] as const;

const GHOST_BODY =
  "M60 6C31 6 15 28 15 58L15 116C15 124 22 128 28 122C34 116 40 116 45 123C50 130 57 130 62 123C67 116 73 116 78 123C83 130 90 130 95 123C100 116 105 118 105 112L105 58C105 28 89 6 60 6Z";

const BAT_WINGS = {
  left: "M43 27C33 15 17 12 4 20C10 22 12 28 10 33C16 30 21 32 23 38C27 34 32 34 36 38C38 34 40 31 43 31Z",
  right: "M57 27C67 15 83 12 96 20C90 22 88 28 90 33C84 30 79 32 77 38C73 34 68 34 64 38C62 34 60 31 57 31Z",
};

function pumpkinMarkup(p: PumpkinPaint, filter: string): string {
  const fill = (tone: string) => (tone === "deep" ? p.deep : tone === "light" ? p.light : p.body);
  const ribs = PUMPKIN_RIBS.map((r) => `<ellipse cx="${r.cx}" cy="${r.cy}" rx="${r.rx}" ry="${r.ry}" fill="${fill(r.tone)}" stroke="${p.deep}" stroke-opacity=".45" stroke-width="1.6"/>`).join("");
  return `<g filter="url(#${filter})">${ribs}<ellipse cx="52" cy="44" rx="6" ry="12" fill="#fff" opacity=".22" transform="rotate(-12 52 44)"/></g><path d="M57 28C56 20 58 13 62 9C64 8 66 9 66 11C63 15 62 21 63 28Z" fill="${p.stem}"/><path d="M64 18C72 10 84 10 88 16C82 22 72 23 64 18Z" fill="${p.leaf}"/>`;
}

function ghostMarkup(body: string, line: string, eye: string): string {
  return `<path d="${GHOST_BODY}" fill="${body}" stroke="${line}" stroke-width="3"/><ellipse cx="46" cy="58" rx="6" ry="8.5" fill="${eye}"/><ellipse cx="74" cy="58" rx="6" ry="8.5" fill="${eye}"/>`;
}

const batMarkup = (color: string) => `<path d="${BAT_WINGS.left}" fill="${color}"/><path d="${BAT_WINGS.right}" fill="${color}"/><ellipse cx="50" cy="30" rx="8" ry="11" fill="${color}"/><path d="M43 18L44 6L49 13L51 13L56 6L57 18C57 24 43 24 43 18Z" fill="${color}"/>`;

const starMarkup = (color: string) => `<path d="M10 2.5V17.5M3.5 6.2L16.5 13.8M3.5 13.8L16.5 6.2" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>`;

/** One element of the print: a drawing in its own box, placed by its centre on the 100 × 124 tile. */
function place(markup: string, viewW: number, viewH: number, x: number, y: number, w: number, rotate = 0): string {
  const h = (w * viewH) / viewW;
  return `<g transform="rotate(${rotate} ${x} ${y})"><svg x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" viewBox="0 0 ${viewW} ${viewH}" overflow="visible">${markup}</svg></g>`;
}

/** The tile the page is papered with, 100 × 124 `--p`: nothing crosses its top or bottom, so it repeats clean. */
function printSvg(look: Look): string {
  const { print } = look;
  const pumpkin = pumpkinMarkup(print.pumpkin, "wc");
  const ghost = ghostMarkup(print.ghost, print.ghostLine, look.dark ? "#2A2233" : "#3B3340");
  const bat = batMarkup(print.bat);
  const star = starMarkup(print.star);
  const items = [
    place(pumpkin, 120, 104, 15, 20, 25, -6),
    place(pumpkin, 120, 104, 87, 52, 27, 8),
    place(pumpkin, 120, 104, 23, 97, 22, 4),
    place(pumpkin, 120, 104, 71, 109, 17, -10),
    place(ghost, 120, 140, 50, 15, 12, -8),
    place(ghost, 120, 140, 45, 66, 15, 6),
    place(ghost, 120, 140, 93, 92, 11, -4),
    place(bat, 100, 56, 77, 18, 17, -8),
    place(bat, 100, 56, 12, 57, 15, 10),
    place(bat, 100, 56, 55, 93, 13, -14),
    place(star, 20, 20, 33, 40, 4.4),
    place(star, 20, 20, 64, 33, 3.6),
    place(star, 20, 20, 28, 74, 3.8),
    place(star, 20, 20, 89, 76, 4),
    place(star, 20, 20, 8, 117, 3.6),
    place(star, 20, 20, 96, 118, 3.4),
    place(star, 20, 20, 44, 118, 3.2),
  ].join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 124" width="400" height="496"><defs><filter id="wc" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="3" xChannelSelector="R" yChannelSelector="G"/></filter></defs><g opacity="${print.opacity}">${items}</g></svg>`;
}

const PRINTS = new Map<LookId, string>();

/** The page's print for a look, as a CSS background image (built once per look). */
export function printFor(id: LookId): string {
  let url = PRINTS.get(id);
  if (!url) {
    url = `url("data:image/svg+xml,${encodeURIComponent(printSvg(LOOKS[id]))}")`;
    PRINTS.set(id, url);
  }
  return url;
}

/** The wall: the look's colour, its print, and paper grain over both. */
export const wallStyle = (id: LookId): CSSProperties => ({
  backgroundColor: LOOKS[id].wall,
  backgroundImage: `${PAPER_GRAIN}, ${printFor(id)}`,
  backgroundSize: "auto, calc(100*var(--p)) calc(124*var(--p))",
  backgroundPosition: "0 0, 50% calc(-6*var(--p))",
});

// ---------------------------------------------------------------- the pieces

/** A watercolour pumpkin: five ribs, each lit from the top left, a stem and a leaf. */
export function Pumpkin({ paint, className, style }: { paint: PumpkinPaint; className?: string; style?: CSSProperties }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 120 104" className={className} style={{ display: "block", width: "100%", overflow: "visible", ...style }} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}l`} cx="38%" cy="32%" r="78%">
          <stop offset="0" stopColor={paint.light} />
          <stop offset=".55" stopColor={paint.body} />
          <stop offset="1" stopColor={paint.deep} />
        </radialGradient>
        <filter id={`${id}w`} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="4" />
          <feDisplacementMap in="SourceGraphic" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <ellipse cx="60" cy="98" rx="40" ry="4.5" fill="rgba(40,20,10,.12)" />
      <g filter={`url(#${id}w)`}>
        {PUMPKIN_RIBS.map((r, i) => (
          <ellipse key={i} cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry} fill={`url(#${id}l)`} stroke={paint.deep} strokeOpacity={0.5} strokeWidth={1.5} />
        ))}
      </g>
      <ellipse cx="51" cy="44" rx="5.5" ry="12" fill="#fff" opacity=".28" transform="rotate(-12 51 44)" />
      <path d="M57 28C56 20 58 13 62 9C64 8 66 9 66 11C63 15 62 21 63 28Z" fill={paint.stem} />
      <path d="M64 18C72 10 84 10 88 16C82 22 72 23 64 18Z" fill={paint.leaf} />
      <path d="M66 17C72 14 78 14 84 16" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1" strokeLinecap="round" />
      <path d="M65 13C69 5 79 6 77 12C75 16 70 14 73 10" fill="none" stroke={paint.stem} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The ghost: a sheet with two dark eyes and pink cheeks. `boo` opens its mouth. `arms` gives it two
 * little nubs at its sides; the cover's ghost holds its sign with GhostHands drawn over the sign.
 */
export function Ghost({ c, mood = "idle", arms = true, className, style }: { c: Look["ghost"]; mood?: "idle" | "boo"; arms?: boolean; className?: string; style?: CSSProperties }) {
  const id = useId().replace(/:/g, "");
  const boo = mood === "boo";
  return (
    <svg viewBox="0 0 120 140" className={className} style={{ display: "block", width: "100%", overflow: "visible", ...style }} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0.35">
          <stop offset=".45" stopColor={c.shade} stopOpacity="0" />
          <stop offset="1" stopColor={c.shade} stopOpacity="1" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="136" rx="30" ry="3.5" fill="rgba(30,20,40,.1)" />
      {arms ? (
        <g fill={c.body} stroke={c.line} strokeWidth="2.2">
          <path d="M18 70C9 69 3 76 5 82C7 88 14 87 18 82Z" />
          <path d="M102 70C111 69 117 76 115 82C113 88 106 87 102 82Z" />
        </g>
      ) : null}
      <path d={GHOST_BODY} fill={c.body} stroke={c.line} strokeWidth="2.2" strokeLinejoin="round" />
      <path d={GHOST_BODY} fill={`url(#${id}s)`} />
      <ellipse cx="44" cy="30" rx="10" ry="6" fill="#fff" opacity=".7" transform="rotate(-24 44 30)" />
      <g>
        <ellipse cx="45" cy={boo ? 56 : 58} rx={boo ? 5.6 : 5.2} ry={boo ? 7.8 : 7.4} fill={c.eye} />
        <ellipse cx="75" cy={boo ? 56 : 58} rx={boo ? 5.6 : 5.2} ry={boo ? 7.8 : 7.4} fill={c.eye} />
        <circle cx="46.8" cy={boo ? 53 : 55} r="1.8" fill="#fff" />
        <circle cx="76.8" cy={boo ? 53 : 55} r="1.8" fill="#fff" />
      </g>
      <ellipse cx="34" cy="72" rx="7" ry="4.2" fill={c.blush} opacity=".7" />
      <ellipse cx="86" cy="72" rx="7" ry="4.2" fill={c.blush} opacity=".7" />
      {boo ? <ellipse cx="60" cy="78" rx="5.4" ry="7" fill={c.eye} /> : <path d="M55 74Q60 79 65 74" fill="none" stroke={c.eye} strokeWidth="2.2" strokeLinecap="round" />}
    </svg>
  );
}

/** The cover ghost's two hands, drawn in the ghost's own box over the top of the sign it holds. */
export function GhostHands({ c, className }: { c: Look["ghost"]; className?: string }) {
  return (
    <svg viewBox="0 0 120 140" className={className} style={{ display: "block", width: "100%", overflow: "visible" }} aria-hidden="true">
      <g fill={c.body} stroke={c.line} strokeWidth="2.2">
        <ellipse cx="34" cy="90" rx="7.4" ry="6.2" transform="rotate(-18 34 90)" />
        <ellipse cx="86" cy="90" rx="7.4" ry="6.2" transform="rotate(18 86 90)" />
      </g>
    </svg>
  );
}

/** A small ghost for the page's taps: no arms, just the sheet and a face. */
export function TinyGhost({ c, className }: { c: Look["ghost"]; className?: string }) {
  return <Ghost c={c} mood="boo" arms={false} className={className} />;
}

/**
 * The black cat, lying along the top edge of a photo with its front paws hanging over the picture
 * and its tail hanging down the side. The photo's top edge is at 68 of the drawing's 150: place the
 * cat with `catTop` so it lies on it. Its tail swishes and it blinks, unless the page is still.
 */
export function Cat({ c, still, className, style }: { c: Look["cat"]; still: boolean; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 220 150" className={className} style={{ display: "block", width: "100%", overflow: "visible", ...style }} aria-hidden="true">
      <ellipse cx="120" cy="71" rx="66" ry="4" fill="rgba(20,10,20,.16)" />
      {/* the tail, hanging down the photo's side */}
      <motion.g style={{ transformBox: "view-box", transformOrigin: "180px 58px" }} animate={still ? undefined : { rotate: [-5, 9, -5] }} transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}>
        <path d="M178 56C196 66 200 88 192 108C188 118 192 128 200 125" fill="none" stroke={c.fur} strokeWidth="11" strokeLinecap="round" />
      </motion.g>
      {/* the back paw */}
      <path d="M156 60L158 92C158 99 170 99 170 92L170 60Z" fill={c.fur} />
      {/* the body, a loaf on the edge of the photo */}
      <path d="M60 66C57 44 76 29 106 27C142 25 172 31 185 45C193 54 191 66 183 69L66 71C62 71 60 69 60 66Z" fill={c.fur} />
      <path d="M92 33C118 28 150 30 170 40" fill="none" stroke={c.sheen} strokeWidth="5" strokeLinecap="round" opacity=".6" />
      {/* the head */}
      <path d="M27 50C25 35 31 24 39 18L35 3L52 13C56 12 61 12 65 13L80 3L77 19C84 27 85 41 81 51C77 65 63 72 52 72C39 72 29 63 27 50Z" fill={c.fur} />
      <path d="M40 9L45 15L39 17Z M74 9L69 15L75 17Z" fill={c.nose} opacity=".55" />
      <motion.g style={{ transformBox: "view-box", transformOrigin: "55px 44px" }} animate={still ? undefined : { scaleY: [1, 1, 0.12, 1, 1] }} transition={{ duration: 4.6, repeat: Infinity, times: [0, 0.9, 0.93, 0.96, 1] }}>
        <ellipse cx="45" cy="43" rx="8.4" ry="9.2" fill={c.eye} />
        <ellipse cx="65" cy="43" rx="8.4" ry="9.2" fill={c.eye} />
        <ellipse cx="46.5" cy="44" rx="3.8" ry="7" fill={c.pupil} />
        <ellipse cx="63.5" cy="44" rx="3.8" ry="7" fill={c.pupil} />
        <circle cx="48" cy="40.5" r="1.7" fill="#fff" />
        <circle cx="65" cy="40.5" r="1.7" fill="#fff" />
      </motion.g>
      <path d="M53 55L57 55L55 58Z" fill={c.nose} />
      <g stroke="#CFC8D6" strokeWidth="1" strokeLinecap="round" opacity=".55">
        <path d="M38 56L22 53M38 59L22 61M72 56L88 53M72 59L88 61" />
      </g>
      {/* the front paws, hanging over the picture */}
      <path d="M56 60L56 98C56 105 67 105 67 98L67 60Z" fill={c.fur} />
      <path d="M73 62L73 94C73 101 84 101 84 94L84 62Z" fill={c.fur} />
      <path d="M59 99L59 102M64 99L64 102M76 95L76 98M81 95L81 98" stroke={c.sheen} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/** Where the cat's box goes so it lies on an edge at `edgeY` (in `--p`): its centre, for a cat `w` wide. */
export const catCentreY = (edgeY: number, w: number): number => edgeY + (w * 150) / 220 * (0.5 - 68 / 150);

/** A bat. Its wings beat slowly unless the page is still. */
export function Bat({ color, still, className, style }: { color: string; still: boolean; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 100 56" className={className} style={{ display: "block", width: "100%", overflow: "visible", ...style }} aria-hidden="true">
      <motion.g style={{ transformBox: "view-box", transformOrigin: "50px 28px" }} animate={still ? undefined : { scaleY: [1, 0.55, 1] }} transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}>
        <path d={BAT_WINGS.left} fill={color} />
        <path d={BAT_WINGS.right} fill={color} />
      </motion.g>
      <ellipse cx="50" cy="30" rx="8" ry="11" fill={color} />
      <path d="M43 18L44 6L49 13L51 13L56 6L57 18C57 24 43 24 43 18Z" fill={color} />
      <circle cx="47" cy="18" r="1.2" fill="#fff" opacity=".85" />
      <circle cx="53" cy="18" r="1.2" fill="#fff" opacity=".85" />
    </svg>
  );
}

/** A little painted star, the kind scattered over a Halloween print. */
export function Star({ color, className, style }: { color: string; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 20 20" className={className} style={{ display: "block", width: "100%", overflow: "visible", ...style }} aria-hidden="true">
      <path d="M10 2.5V17.5M3.5 6.2L16.5 13.8M3.5 13.8L16.5 6.2" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** What the ghost says: a round white bubble with a tail. */
export function Bubble({ children, ink, className, style }: { children: ReactNode; ink: string; className?: string; style?: CSSProperties }) {
  return (
    <span className={className} style={{ position: "relative", display: "inline-block", ...style }}>
      <span className="relative z-[1] block rounded-[999px] bg-white px-[0.7em] pt-[0.18em] pb-[0.28em] leading-[1.15] font-bold whitespace-nowrap" style={{ color: ink, boxShadow: "0 0.12em 0.4em rgba(40,20,30,.18)", fontFamily: "var(--gift-font-hand)" }}>
        {children}
      </span>
      <svg viewBox="0 0 20 16" aria-hidden="true" className="absolute -bottom-[0.42em] left-[0.7em] z-0 w-[0.9em]">
        <path d="M2 0L18 0L3 15Z" fill="#fff" />
      </svg>
    </span>
  );
}
