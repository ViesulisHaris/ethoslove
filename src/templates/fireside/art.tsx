/**
 * The room: a window at dusk, a candle, a mug, a blanket, wooden pegs on a string. All original,
 * drawn as SVG so it scales from a phone to a laptop without a single image.
 */

export type Palette = {
  /** The room before the candle is lit: cold dusk. */
  cold: string;
  /** The room after: lamplight on wood. */
  warm: string;
  paper: string;
  ink: string;
  accent: string;
  glow: string;
  blanket: string;
  stripe: string;
  wood: string;
  woodDeep: string;
  /** Top, middle and horizon of the sky in the window. */
  sky: [string, string, string];
  hills: string;
  hillsFar: string;
  /** The leaves (or snow) outside. */
  weather: string[];
};

export const PALETTES: Record<"amber" | "maple" | "moss", Palette> = {
  amber: {
    cold: "radial-gradient(120% 80% at 50% 30%, #253247 0%, #182234 55%, #0e1420 100%)",
    warm: "radial-gradient(120% 80% at 50% 62%, #5a3418 0%, #3a2114 50%, #1c1009 100%)",
    paper: "#F7EAD3",
    ink: "#3B2A1E",
    accent: "#D9822B",
    glow: "#FFB35C",
    blanket: "#8C3B2E",
    stripe: "#F1D9B5",
    wood: "#7A4B2A",
    woodDeep: "#4E2D18",
    sky: ["#1B2540", "#3C3A6E", "#C46A4B"],
    hills: "#151B2C",
    hillsFar: "#2A2E4E",
    weather: ["#E8892E", "#C8401F", "#F2B63C", "#8A3A1E"],
  },
  maple: {
    cold: "radial-gradient(120% 80% at 50% 30%, #2A2438 0%, #1C1828 55%, #100D18 100%)",
    warm: "radial-gradient(120% 80% at 50% 62%, #66261A 0%, #3F1A12 50%, #1E0D09 100%)",
    paper: "#F6E7D8",
    ink: "#3A2420",
    accent: "#C7471F",
    glow: "#FF9E5C",
    blanket: "#5B2B2B",
    stripe: "#F3D7C2",
    wood: "#6E3A26",
    woodDeep: "#432115",
    sky: ["#231A3A", "#5A2F5E", "#D9704A"],
    hills: "#1A1224",
    hillsFar: "#3A2444",
    weather: ["#D8442A", "#F08A2E", "#A82E1C", "#F5B24A"],
  },
  moss: {
    cold: "radial-gradient(120% 80% at 50% 30%, #1F2E2A 0%, #16221E 55%, #0C1411 100%)",
    warm: "radial-gradient(120% 80% at 50% 62%, #4F4322 0%, #332C16 50%, #17140A 100%)",
    paper: "#F1EBD6",
    ink: "#2F2E1F",
    accent: "#8F8A32",
    glow: "#E9D27A",
    blanket: "#4C5A35",
    stripe: "#E8E2C4",
    wood: "#6A4A2E",
    woodDeep: "#3F2B1A",
    sky: ["#16262A", "#2F4A4A", "#B08A4A"],
    hills: "#101A17",
    hillsFar: "#25352F",
    weather: ["#C9A227", "#A8641F", "#7C8A3A", "#E1B04A"],
  },
};

/** The view through the glass: dusk sky, a moon, far hills, near hills. */
export function WindowScene({ p }: { p: Palette }) {
  return (
    <svg viewBox="0 0 72 84" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="fs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="0.55" stopColor={p.sky[1]} />
          <stop offset="1" stopColor={p.sky[2]} />
        </linearGradient>
      </defs>
      <rect width="72" height="84" fill="url(#fs-sky)" />
      {[[10, 12], [22, 6], [40, 9], [58, 14], [66, 5], [30, 20], [52, 24]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 0.55 : 0.4} fill="#FFF6DC" opacity={0.5 + (i % 2) * 0.35} />
      ))}
      <circle cx="53" cy="19" r="6.5" fill="#FFF1C9" />
      <circle cx="55.6" cy="17.6" r="6" fill="url(#fs-sky)" />
      <path d="M0 62 C12 56 22 60 32 55 C44 49 56 58 72 52 V84 H0Z" fill={p.hillsFar} />
      <path d="M0 70 C10 66 18 71 30 66 C42 61 52 70 72 64 V84 H0Z" fill={p.hills} />
      <path d="M12 66 l1.2 -6 l1.2 6Z M16 68 l1 -5 l1 5Z M58 62 l1.4 -7 l1.4 7Z M62 64 l1 -5 l1 5Z" fill={p.hills} />
    </svg>
  );
}

/** The frame sits above the weather so the leaves fall behind the glazing bars. */
export function WindowFrame({ p }: { p: Palette }) {
  return (
    <svg viewBox="0 0 72 84" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <path d="M36 42 V84 M2 44 H70" stroke={p.wood} strokeWidth="2.6" />
      <path d="M2 84 V36 A34 34 0 0 1 70 36 V84" fill="none" stroke={p.woodDeep} strokeWidth="5" />
      <path d="M2 84 V36 A34 34 0 0 1 70 36 V84" fill="none" stroke={p.wood} strokeWidth="2.8" />
      <rect x="0" y="0" width="72" height="84" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
    </svg>
  );
}

/** A candle on a brass dish. `lit` adds the flame and its glow; the flicker is a CSS animation. */
export function Candle({ p, lit }: { p: Palette; lit: boolean }) {
  return (
    <svg viewBox="0 0 44 96" className="h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <radialGradient id="fs-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={p.glow} stopOpacity="0.55" />
          <stop offset="1" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fs-wax" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F3E3C4" />
          <stop offset="0.5" stopColor="#FBF1DC" />
          <stop offset="1" stopColor="#E4D0AC" />
        </linearGradient>
      </defs>
      {lit ? <circle cx="22" cy="28" r="34" fill="url(#fs-glow)" className="fs-glow" /> : null}
      <ellipse cx="22" cy="88" rx="17" ry="5" fill="#8B6A2C" />
      <ellipse cx="22" cy="86" rx="17" ry="5" fill="#C99A3F" />
      <ellipse cx="22" cy="85" rx="11" ry="3.2" fill="#A97F2E" />
      <path d="M14 34 H30 V82 a8 4 0 0 1 -16 0Z" fill="url(#fs-wax)" />
      <path d="M14 34 c2 2 3 6 2 10 c-1 3 -1 6 0 9" stroke="#E7D3AC" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M30 34 c-2 3 -2 8 -1 12" stroke="#E7D3AC" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <ellipse cx="22" cy="34" rx="8" ry="2.6" fill="#F7EBD3" />
      <path d="M22 33 V26" stroke="#3B2A1E" strokeWidth="1.4" strokeLinecap="round" />
      {lit ? (
        <g className="fs-flame">
          <path d="M22 4 C28 12 30 18 26 26 C24 29 20 29 18 26 C14 18 16 12 22 4Z" fill="#FFB03A" opacity="0.95" />
          <path d="M22 12 C25 17 26 21 24 25 C23 27 21 27 20 25 C18 21 19 17 22 12Z" fill="#FFF3B0" />
          <path d="M22 18 C23.5 21 23.5 24 22 25.5 C20.5 24 20.5 21 22 18Z" fill="#6FB7FF" opacity="0.55" />
        </g>
      ) : null}
    </svg>
  );
}

/** The mug, with what they drink in it, and steam once the room is warm. */
export function Mug({ p, drink, lit }: { p: Palette; drink: "cocoa" | "tea" | "coffee"; lit: boolean }) {
  const fill = drink === "cocoa" ? "#5A3A2A" : drink === "tea" ? "#B8752A" : "#3B241A";
  return (
    <svg viewBox="0 0 56 60" className="h-full w-full overflow-visible" aria-hidden="true">
      {lit ? (
        <g stroke="rgba(255,250,240,0.7)" strokeWidth="2.2" strokeLinecap="round" fill="none">
          <path className="fs-steam" style={{ animationDelay: "0s" }} d="M18 22 c-4 -6 3 -8 -1 -14" />
          <path className="fs-steam" style={{ animationDelay: "1.1s" }} d="M28 20 c-4 -6 3 -8 -1 -14" />
          <path className="fs-steam" style={{ animationDelay: "2.2s" }} d="M38 22 c-4 -6 3 -8 -1 -14" />
        </g>
      ) : null}
      <path d="M44 31 a9 9 0 0 1 0 20" stroke={p.stripe} strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M44 31 a9 9 0 0 1 0 20" stroke="rgba(0,0,0,0.12)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M10 26 H46 V50 a8 8 0 0 1 -8 8 H18 a8 8 0 0 1 -8 -8Z" fill={p.stripe} />
      <path d="M10 40 H46" stroke={p.accent} strokeWidth="3.5" opacity="0.85" />
      <path d="M10 46 H46" stroke={p.accent} strokeWidth="2" opacity="0.55" />
      <ellipse cx="28" cy="26" rx="18" ry="4.6" fill={fill} />
      <ellipse cx="28" cy="26" rx="18" ry="4.6" fill="none" stroke={p.stripe} strokeWidth="2.2" />
      {drink === "cocoa" ? (
        <g fill="#FFF7EA">
          <ellipse cx="22" cy="25.5" rx="3.2" ry="1.6" />
          <ellipse cx="30" cy="26.5" rx="3.2" ry="1.6" />
          <ellipse cx="26" cy="24" rx="2.6" ry="1.3" />
        </g>
      ) : drink === "tea" ? (
        <g>
          <path d="M40 27 c4 2 6 6 6 10" stroke="#E7D3AC" strokeWidth="1" fill="none" />
          <rect x="44" y="36" width="6" height="7" rx="1" fill="#F7EBD3" stroke="#C9A06A" strokeWidth="0.8" />
        </g>
      ) : (
        <path d="M28 29.5 c-3 -3 -6 -1 -4 1.5 c1 1.2 2.6 2.2 4 3 c1.4 -0.8 3 -1.8 4 -3 c2 -2.5 -1 -4.5 -4 -1.5Z" fill="#F3E2CC" />
      )}
    </svg>
  );
}

/** The blanket along the bottom of the screen, folded, with its stripes following the fold. */
export function Blanket({ p }: { p: Palette }) {
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      <path d="M0 14 C14 6 26 18 40 10 C56 1 70 16 86 8 C92 5 97 6 100 8 V40 H0Z" fill={p.blanket} />
      <path d="M0 20 C14 12 26 24 40 16 C56 7 70 22 86 14 C92 11 97 12 100 14" stroke={p.stripe} strokeWidth="1.6" fill="none" opacity="0.85" />
      <path d="M0 25 C14 17 26 29 40 21 C56 12 70 27 86 19 C92 16 97 17 100 19" stroke={p.stripe} strokeWidth="0.8" fill="none" opacity="0.6" />
      <path d="M0 31 C14 23 26 35 40 27 C56 18 70 33 86 25 C92 22 97 23 100 25" stroke={p.stripe} strokeWidth="1.6" fill="none" opacity="0.85" />
      <path d="M0 14 C14 6 26 18 40 10 C56 1 70 16 86 8 C92 5 97 6 100 8 V12 C97 10 92 9 86 12 C70 20 56 5 40 14 C26 22 14 10 0 18Z" fill="rgba(0,0,0,0.18)" />
    </svg>
  );
}

/** A wooden clothes peg, drawn hanging over a string. */
export function Peg() {
  return (
    <svg viewBox="0 0 14 34" className="h-full w-full" aria-hidden="true">
      <rect x="1" y="2" width="5" height="30" rx="2" fill="#D7B07A" />
      <rect x="8" y="2" width="5" height="30" rx="2" fill="#C9A06A" />
      <rect x="0.5" y="11" width="13" height="4" rx="1" fill="#8E8E8E" />
      <rect x="1" y="2" width="12" height="30" rx="2" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.8" />
    </svg>
  );
}

/** The string the photos hang from: a little sag between two nails. */
export function StringLine({ p }: { p: Palette }) {
  return (
    <svg viewBox="0 0 100 12" preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden="true">
      <path d="M0 2 Q50 13 100 2" stroke={p.woodDeep} strokeWidth="1.1" fill="none" vectorEffect="non-scaling-stroke" />
      <circle cx="0" cy="2" r="1.6" fill="#8E8E8E" />
      <circle cx="100" cy="2" r="1.6" fill="#8E8E8E" />
    </svg>
  );
}
