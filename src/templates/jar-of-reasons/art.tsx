"use client";

/**
 * The jar: a mason jar with a gingham cap tied in twine, folded notes piled inside with a string of
 * fairy lights through them, glass highlights and an embossed heart, and a tag with their name. All
 * SVG in a 200 × 260 box, so it stays sharp from a phone to a laptop and a poster.
 */
import { useId, useMemo } from "react";
import { motion } from "motion/react";
import { mulberry32 } from "../_shared/random";
import { NameTag } from "../_shared/cover-kit";

const BODY = "M52 70 C52 84 20 88 18 112 L18 228 C18 246 32 254 50 254 L150 254 C168 254 182 246 182 228 L182 112 C180 88 148 84 148 70 Z";
const INNER = "M57 76 C57 89 26 93 25 114 L25 227 C25 241 35 247 51 247 L149 247 C165 247 175 241 175 227 L175 114 C174 93 143 89 143 76 Z";
/** The heart pressed into the glass. */
const EMBOSS = "M100 142 C85 131 82 120 90 115 C95 112 99 115 100 119 C101 115 105 112 110 115 C118 120 115 131 100 142 Z";

export const JAR_KEYFRAMES = `
.jr-bulb{animation:jr-bulb 2.6s ease-in-out infinite alternate}
@keyframes jr-bulb{from{opacity:.5}to{opacity:1}}
.jr-tag{transform-origin:50% 0;animation:jr-tag 5.5s ease-in-out infinite alternate}
@keyframes jr-tag{from{rotate:-9deg}to{rotate:-2deg}}
@media (prefers-reduced-motion: reduce){.jr-bulb,.jr-tag{animation:none}}
`;

type Note = { x: number; y: number; w: number; h: number; rot: number; tone: number };

/** A pile that fills about two thirds of the jar whatever the count: few reasons get big notes, many get small ones. */
function pile(count: number, seed: number): Note[] {
  const rng = mulberry32(seed);
  const shown = Math.max(1, Math.min(count, 44));
  const perRow = Math.max(3, Math.min(7, Math.ceil(Math.sqrt(shown * 1.6))));
  const rows = Math.ceil(shown / perRow);
  const rowH = Math.min(30, 112 / rows);
  const w = Math.min(46, (150 / perRow) * 1.45);
  const h = Math.max(12, Math.min(22, rowH * 0.85));
  return Array.from({ length: shown }, (_, k) => {
    const row = Math.floor(k / perRow);
    const col = k % perRow;
    const x = 30 + ((col + (row % 2 ? 0.55 : 0.1)) / perRow) * 140 - w / 2 + (rng() - 0.5) * 12;
    const y = 240 - (row + 1) * rowH + (rng() - 0.5) * 8;
    return { x: Math.max(22, Math.min(178 - w, x)), y, w, h, rot: (rng() - 0.5) * 56, tone: Math.floor(rng() * 16) };
  });
}

/** Gingham cap with a pinked edge, gathered under the twine. */
function capPath(): string {
  const pts: string[] = ["M44 40", "Q100 20 156 40", "L168 64"];
  for (let x = 168, i = 0; x >= 32; x -= 8, i++) pts.push(`L${x} ${i % 2 ? 70 : 64}`);
  pts.push("L44 40 Z");
  return pts.join(" ");
}

export function Jar({
  total,
  pulled,
  papers,
  seed,
  cap,
  twine,
  tagPaper,
  name,
  forLabel,
}: {
  total: number;
  /** How many notes have come out so far. */
  pulled: number;
  papers: string[];
  seed: number;
  cap: string;
  twine: string;
  tagPaper: string;
  name: string;
  forLabel: string;
}) {
  const id = useId().replace(/:/g, "");
  const notes = useMemo(() => pile(total, seed), [total, seed]);
  // Notes leave from the top of the pile; with more reasons than fit, the hidden ones go first.
  const gone = Math.max(0, pulled - (total - notes.length));
  const top = notes.length ? Math.min(...notes.map((n) => n.y)) : 200;
  const bulbs = useMemo(
    () => Array.from({ length: 9 }, (_, i) => ({ x: 34 + i * 16.5, y: Math.min(236, Math.max(top + 10, top + 34 + Math.sin(i * 1.35 + seed) * 20 + (i % 2) * 8)) })),
    [top, seed],
  );
  const wire = bulbs.reduce((d, b, i) => (i === 0 ? `M${b.x} ${b.y}` : `${d} Q${(bulbs[i - 1].x + b.x) / 2} ${Math.max(bulbs[i - 1].y, b.y) + 9} ${b.x} ${b.y}`), "");
  const paper = (n: Note) => papers[n.tone % papers.length];

  return (
    <div className="relative w-full" style={{ aspectRatio: "200 / 260", filter: "drop-shadow(0 calc(1.4*var(--k)) calc(2.2*var(--k)) rgba(90,50,60,.22))" }}>
      <svg viewBox="0 0 200 260" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <clipPath id={`${id}-in`}>
            <path d={INNER} />
          </clipPath>
          <linearGradient id={`${id}-glass`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity=".42" />
            <stop offset=".2" stopColor="#fff" stopOpacity=".1" />
            <stop offset=".62" stopColor="#fff" stopOpacity=".03" />
            <stop offset=".88" stopColor="#fff" stopOpacity=".18" />
            <stop offset="1" stopColor="#fff" stopOpacity=".38" />
          </linearGradient>
          <radialGradient id={`${id}-halo`}>
            <stop offset="0" stopColor="#FFE9A8" stopOpacity=".95" />
            <stop offset=".35" stopColor="#FFD37A" stopOpacity=".45" />
            <stop offset="1" stopColor="#FFD37A" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-inner`} cx=".5" cy=".7" r=".7">
            <stop offset="0" stopColor="#FFF4D6" stopOpacity=".55" />
            <stop offset="1" stopColor="#FFF4D6" stopOpacity="0" />
          </radialGradient>
          <pattern id={`${id}-ging`} width="9" height="9" patternUnits="userSpaceOnUse">
            <rect width="9" height="9" fill="#fff" />
            <rect width="4.5" height="9" fill={cap} opacity=".55" />
            <rect width="9" height="4.5" fill={cap} opacity=".55" />
          </pattern>
        </defs>

        {/* glass back and the warm light the fairy lights throw inside */}
        <path d={BODY} fill="rgba(226,240,242,.5)" />
        <path d={INNER} fill={`url(#${id}-inner)`} />

        <g clipPath={`url(#${id}-in)`}>
          {notes.map((n, k) => {
            const out = k >= notes.length - gone;
            return (
              <g key={k} transform={`translate(${n.x} ${n.y}) rotate(${n.rot} ${n.w / 2} ${n.h / 2})`}>
                <motion.g initial={false} animate={{ opacity: out ? 0 : 1, scale: out ? 0.3 : 1, y: out ? -40 : 0 }} transition={{ duration: 0.45 }} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                  <rect x="1.2" y="1.8" width={n.w} height={n.h} rx="2.5" fill="rgba(60,40,30,.16)" />
                  <rect width={n.w} height={n.h} rx="2.5" fill={paper(n)} />
                  <path d={`M${n.w * 0.52} 0 L${n.w * 0.48} ${n.h}`} stroke="rgba(60,40,30,.12)" strokeWidth=".9" />
                  <rect width={n.w * 0.48} height={n.h} rx="2.5" fill="rgba(255,255,255,.28)" />
                </motion.g>
              </g>
            );
          })}
          <path d={wire} fill="none" stroke="rgba(70,60,45,.55)" strokeWidth=".9" />
          {bulbs.map((b, i) => (
            <g key={i} className="jr-bulb" style={{ animationDelay: `${(i * 0.37) % 2.6}s` }}>
              <circle cx={b.x} cy={b.y} r="11" fill={`url(#${id}-halo)`} />
              <circle cx={b.x} cy={b.y} r="2.6" fill="#FFF6D8" />
            </g>
          ))}
        </g>

        {/* the glass over everything: tint, highlights, the embossed heart, the rim */}
        <path d={BODY} fill={`url(#${id}-glass)`} />
        <path d={EMBOSS} fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1.7" />
        <path d={EMBOSS} transform="translate(.8 1.2)" fill="none" stroke="rgba(60,50,40,.12)" strokeWidth="1.2" />
        <rect x="29" y="116" width="8" height="104" rx="4" fill="#fff" opacity=".5" />
        <rect x="42" y="120" width="3" height="58" rx="1.5" fill="#fff" opacity=".35" />
        <rect x="163" y="128" width="4.5" height="76" rx="2.2" fill="#fff" opacity=".28" />
        <ellipse cx="100" cy="247" rx="70" ry="5" fill="#fff" opacity=".22" />
        <path d={BODY} fill="none" stroke="#fff" strokeOpacity=".95" strokeWidth="3" />
        <path d={BODY} fill="none" stroke="rgba(74,48,56,.3)" strokeWidth="1.2" />

        {/* threaded neck */}
        <rect x="53" y="56" width="94" height="18" rx="4" fill="rgba(255,255,255,.3)" stroke="#fff" strokeOpacity=".85" strokeWidth="1.6" />
        {[61, 66, 71].map((y) => (
          <path key={y} d={`M57 ${y} L143 ${y}`} stroke="rgba(60,50,40,.12)" strokeWidth="1" />
        ))}

        {/* gingham cap, twine and bow */}
        <path d={capPath()} fill={`url(#${id}-ging)`} stroke="rgba(60,40,30,.18)" strokeWidth="1" />
        <path d="M46 42 Q100 24 154 42" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="3" />
        <path d="M36 56 Q100 64 164 56" fill="none" stroke={twine} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M36 59 Q100 67 164 59" fill="none" stroke={twine} strokeWidth="1.4" strokeOpacity=".7" strokeLinecap="round" />
        <g transform="translate(70 60)">
          <ellipse cx="-9" cy="-3" rx="10" ry="5.5" transform="rotate(-22)" fill="none" stroke={twine} strokeWidth="2.6" />
          <ellipse cx="9" cy="-3" rx="10" ry="5.5" transform="rotate(22)" fill="none" stroke={twine} strokeWidth="2.6" />
          <path d="M0 0 C-4 8 -8 14 -12 20 M0 0 C3 8 5 13 9 21" fill="none" stroke={twine} strokeWidth="2.2" strokeLinecap="round" />
          <circle r="3" fill={twine} />
        </g>
        {/* the tag's string, from the twine to its hole */}
        <path d="M158 58 C176 62 185 68 187 80" fill="none" stroke={twine} strokeWidth="1.6" strokeLinecap="round" />
      </svg>

      <div className="absolute" style={{ left: "93.5%", top: "30.5%", width: "36%" }}>
        <div className="jr-tag -translate-x-1/2">
          <NameTag name={name} eyebrow={forLabel} paper={tagPaper} />
        </div>
      </div>
    </div>
  );
}
