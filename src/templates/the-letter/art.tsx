"use client";

/**
 * The things stuck to the envelope on the cover: a postage stamp with a tiny night scene under a
 * smudged postmark, and the twine and pressed sprig tucked under the wax seal. Both are drawn in
 * the envelope's own box (3 : 2), so they scale with it from the 390 x 600 poster crop to a laptop.
 */
import { useId } from "react";

/** Petals, leaves and knots are placed by hand rather than by a loop: a sprig is not symmetrical. */
const LEAVES: { x: number; y: number; rx: number; ry: number; rot: number; fill: string }[] = [
  { x: -13, y: -3, rx: 6.4, ry: 2.7, rot: -28, fill: "#96A576" },
  { x: -17, y: 3, rx: 5.6, ry: 2.4, rot: 22, fill: "#7F8F64" },
  { x: -26, y: -8, rx: 6, ry: 2.5, rot: -34, fill: "#A6B489" },
  { x: -29, y: -1, rx: 5.2, ry: 2.2, rot: 16, fill: "#8B9B6D" },
  { x: -39, y: -13, rx: 5.4, ry: 2.2, rot: -40, fill: "#9FAE82" },
  { x: -41, y: -6, rx: 4.6, ry: 2, rot: 8, fill: "#7F8F64" },
];

const BUDS: { x: number; y: number; s: number; petal: string }[] = [
  { x: -52, y: -19, s: 1, petal: "#DFAFB6" },
  { x: -45, y: -25, s: 0.8, petal: "#E9C6C6" },
  { x: -33, y: -17, s: 0.72, petal: "#D79BA6" },
];

/** A five-petal dried flower, small enough to read as a bud at thumbnail size. */
function Bud({ x, y, s, petal }: { x: number; y: number; s: number; petal: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <ellipse key={i} cx="0" cy="-3.2" rx="1.9" ry="3" fill={petal} transform={`rotate(${i * 72})`} />
      ))}
      <circle r="1.5" fill="#F3DFB8" />
    </g>
  );
}

/**
 * The postage stamp: a perforated edge bitten out with a mask, a dusk scene with a crescent moon
 * and one lit window, and a postmark that runs off its corner onto the envelope.
 */
export function Stamp() {
  const id = useId().replace(/:/g, "");
  const holes: { cx: number; cy: number }[] = [];
  for (let x = 6; x <= 94; x += 8.8) holes.push({ cx: x, cy: 0 }, { cx: x, cy: 122 });
  for (let y = 6; y <= 116; y += 8.5) holes.push({ cx: 0, cy: y }, { cx: 100, cy: y });

  return (
    <svg
      viewBox="0 0 100 122"
      className="h-full w-full overflow-visible"
      aria-hidden="true"
      style={{ filter: "drop-shadow(0 calc(.35*var(--k)) calc(.7*var(--k)) rgba(40,20,10,.4))" }}
    >
      <defs>
        <mask id={`${id}-perf`}>
          <rect width="100" height="122" fill="#fff" />
          {holes.map((h, i) => (
            <circle key={i} cx={h.cx} cy={h.cy} r="3.1" fill="#000" />
          ))}
        </mask>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A4467" />
          <stop offset="0.52" stopColor="#8C6B84" />
          <stop offset="1" stopColor="#EBA478" />
        </linearGradient>
        <radialGradient id={`${id}-lamp`}>
          <stop offset="0" stopColor="#FFDF9E" stopOpacity=".8" />
          <stop offset="1" stopColor="#FFDF9E" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g mask={`url(#${id}-perf)`}>
        <rect width="100" height="122" fill="#FCF3E1" />
        <rect x="8" y="9" width="84" height="88" fill={`url(#${id}-sky)`} />
        {/* the scene: a crescent, three stars, two hills and one window still awake */}
        <path d="M72 19.5 A8.5 8.5 0 1 0 72 36.5 A7 7 0 1 1 72 19.5Z" fill="#FFF2CE" />
        {[
          [24, 21],
          [40, 16],
          [55, 25],
        ].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y - 2.6} L${x + 0.9} ${y - 0.9} L${x + 2.6} ${y} L${x + 0.9} ${y + 0.9} L${x} ${y + 2.6} L${x - 0.9} ${y + 0.9} L${x - 2.6} ${y} L${x - 0.9} ${y - 0.9}Z`} fill="#FFF6DC" />
        ))}
        <path d="M8 76 C24 61 38 65 52 73 C66 81 78 71 92 65 L92 97 L8 97Z" fill="#4C4468" />
        <path d="M8 87 C26 77 44 83 60 89 C72 93 84 89 92 85 L92 97 L8 97Z" fill="#2C2944" />
        <circle cx="34" cy="86" r="9" fill={`url(#${id}-lamp)`} />
        <path d="M24 86 L34 76 L44 86Z" fill="#1E1B30" />
        <rect x="26" y="85" width="16" height="12" fill="#1E1B30" />
        <rect x="31.5" y="88" width="5" height="5" fill="#FFD98A" />
        <path d="M46 40 q3 -2.6 6 0 M57 45 q2.4 -2.1 4.8 0" fill="none" stroke="#FFF1D6" strokeWidth="1.2" strokeLinecap="round" opacity=".8" />
        <rect x="8" y="9" width="84" height="88" fill="none" stroke="#FCF3E1" strokeWidth="2.4" />
        <rect x="8" y="9" width="84" height="88" fill="none" stroke="rgba(70,45,28,.28)" strokeWidth="0.8" />
        {/* the value: a heart instead of a number, so it needs no language */}
        <path d="M50 113 C43 107.5 40 104 42 101 C43.4 98.8 47.4 99 50 102 C52.6 99 56.6 98.8 58 101 C60 104 57 107.5 50 113Z" fill="#B8483A" />
        <circle cx="26" cy="107" r="1.6" fill="rgba(70,45,28,.4)" />
        <circle cx="74" cy="107" r="1.6" fill="rgba(70,45,28,.4)" />
      </g>

      {/* The postmark straddles the left edge: dark ink disappears on the stamp's night sky, so
          the half that has to read is the half that lands on the envelope. */}
      <g transform="rotate(-8 0 60)" opacity=".38" stroke="#3E2A1A" fill="none" strokeLinecap="round">
        <circle cx="0" cy="60" r="15.5" strokeWidth="1.7" />
        <circle cx="0" cy="60" r="11" strokeWidth="0.9" />
        <path d="M-18 51 c-7 -3.4 -12 3.4 -19 0 s-12 3.4 -19 0 M-18 60 c-7 -3.4 -12 3.4 -19 0 s-12 3.4 -19 0 M-18 69 c-7 -3.4 -12 3.4 -19 0 s-12 3.4 -19 0" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

/**
 * The twine tied around the envelope with the pressed sprig tucked under it. Drawn across the
 * whole envelope so the cord runs off both edges; the wax seal is pressed over the knot.
 */
export function SealDressing({ twine = "#B48A5C" }: { twine?: string }) {
  const cord = "M-6 112 Q150 122 306 110";
  return (
    <svg viewBox="0 0 300 200" className="h-full w-full overflow-visible" aria-hidden="true">
      <path d={cord} transform="translate(0 2.4)" fill="none" stroke="rgba(40,20,10,.22)" strokeWidth="3.4" />
      <path d={cord} fill="none" stroke={twine} strokeWidth="2.8" strokeLinecap="round" />
      <path d={cord} fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1" strokeDasharray="2 3.4" />

      {/* the loose ends, coming out from under the seal */}
      <g fill="none" stroke={twine} strokeWidth="2.1" strokeLinecap="round">
        <path d="M155 117 C167 129 173 139 169 151" />
        <path d="M147 119 C151 133 145 141 135 147" />
      </g>
      <path d="M169 151 l2.6 3.4 M135 147 l-3.4 2" fill="none" stroke={twine} strokeWidth="1.4" strokeLinecap="round" opacity=".75" />

      {/* the sprig, its cut stem hidden under the wax */}
      <g transform="translate(150 111) rotate(-13) scale(1.18)" opacity=".94">
        <path d="M2 4 C-16 1 -33 -6 -52 -18" fill="none" stroke="#7E8C62" strokeWidth="1.9" strokeLinecap="round" />
        {LEAVES.map((l, i) => (
          <ellipse key={i} cx={l.x} cy={l.y} rx={l.rx} ry={l.ry} fill={l.fill} transform={`rotate(${l.rot} ${l.x} ${l.y})`} />
        ))}
        {BUDS.map((b, i) => (
          <Bud key={i} {...b} />
        ))}
      </g>
    </svg>
  );
}
