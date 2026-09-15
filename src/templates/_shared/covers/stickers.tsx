/**
 * Die-cut stickers for the gift covers. Every one is drawn with a thick white outline and a
 * soft shadow (see `.sticker` in globals.css), which is what makes them read as stickers
 * stuck on paper rather than clip art floating on a page.
 */
import type { ReactNode } from "react";

export type StickerId =
  | "daisy"
  | "bouquet"
  | "tulip"
  | "star"
  | "moon"
  | "planet"
  | "balloons"
  | "bow"
  | "cherries"
  | "strawberry"
  | "butterfly"
  | "sparkle"
  | "heart"
  | "cloud"
  | "kiss"
  | "squiggle"
  | "pumpkin"
  | "leaf"
  | "acorn"
  | "mug"
  | "ghost"
  | "bat"
  | "candy";

const Svg = ({ children, vb = "0 0 100 100" }: { children: ReactNode; vb?: string }) => (
  <svg viewBox={vb} className="sticker h-full w-full overflow-visible" aria-hidden="true">
    {children}
  </svg>
);

/** Outline stroke shared by every sticker body. */
const cut = { stroke: "#fff", strokeWidth: 7, strokeLinejoin: "round" as const, paintOrder: "stroke" as const };

const STICKERS: Record<StickerId, () => ReactNode> = {
  daisy: () => (
    <Svg>
      <defs>
        <radialGradient id="dz-c" cx="40%" cy="35%"><stop offset="0" stopColor="#ffe28a" /><stop offset="1" stopColor="#f0a92e" /></radialGradient>
      </defs>
      <g {...cut}>
        {Array.from({ length: 10 }, (_, i) => (
          <ellipse key={i} cx="50" cy="24" rx="10" ry="22" fill="#fffdf7" transform={`rotate(${i * 36} 50 50)`} />
        ))}
      </g>
      {Array.from({ length: 10 }, (_, i) => (
        <ellipse key={i} cx="50" cy="24" rx="10" ry="22" fill="#fffdf7" stroke="#efe4d2" strokeWidth="1.2" transform={`rotate(${i * 36} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="13" fill="url(#dz-c)" />
      <circle cx="46" cy="45" r="3.5" fill="#fff5c9" opacity=".8" />
    </Svg>
  ),
  bouquet: () => (
    <Svg vb="0 0 100 120">
      <g {...cut} fill="#6d9b5a">
        <path d="M50 118 L44 70 M50 118 L56 72 M50 118 L50 66" stroke="#fff" />
      </g>
      <path d="M50 116 L44 70 M50 116 L56 72 M50 116 L50 66" stroke="#5e8c4c" strokeWidth="3" strokeLinecap="round" />
      <path d="M40 92 C28 86 26 76 30 70 C38 74 42 82 40 92Z" fill="#7aab66" {...cut} />
      <path d="M60 94 C72 88 74 78 70 72 C62 76 58 84 60 94Z" fill="#7aab66" {...cut} />
      {[
        [34, 46, "#f7b3c2"],
        [62, 42, "#ffd66b"],
        [50, 30, "#fbe7ee"],
        [44, 58, "#f59a8e"],
        [66, 60, "#f7b3c2"],
      ].map(([x, y, c], i) => (
        <g key={i}>
          {Array.from({ length: 6 }, (_, k) => (
            <circle key={k} cx={(x as number) + Math.cos((k * Math.PI) / 3) * 7} cy={(y as number) + Math.sin((k * Math.PI) / 3) * 7} r="7" fill={c as string} {...cut} />
          ))}
          {Array.from({ length: 6 }, (_, k) => (
            <circle key={`f${k}`} cx={(x as number) + Math.cos((k * Math.PI) / 3) * 7} cy={(y as number) + Math.sin((k * Math.PI) / 3) * 7} r="7" fill={c as string} />
          ))}
          <circle cx={x as number} cy={y as number} r="4.5" fill="#f2b441" />
        </g>
      ))}
    </Svg>
  ),
  tulip: () => (
    <Svg vb="0 0 80 120">
      <path d="M40 116 V58" stroke="#fff" strokeWidth="11" strokeLinecap="round" />
      <path d="M40 116 V58" stroke="#5e8c4c" strokeWidth="4" strokeLinecap="round" />
      <path d="M40 100 C22 94 16 80 20 70 C32 76 38 86 40 100Z" fill="#7aab66" {...cut} />
      <path d="M20 30 C20 52 28 62 40 62 C52 62 60 52 60 30 L50 40 L40 22 L30 40Z" fill="#f47c8c" {...cut} />
      <path d="M30 40 L40 22 L50 40 C48 54 44 60 40 62 C36 60 32 54 30 40Z" fill="#f9a3ae" />
    </Svg>
  ),
  star: () => (
    <Svg>
      <defs>
        <radialGradient id="st-g" cx="38%" cy="32%"><stop offset="0" stopColor="#fff6b8" /><stop offset=".6" stopColor="#ffd84d" /><stop offset="1" stopColor="#f2b21c" /></radialGradient>
      </defs>
      <path d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36Z" fill="url(#st-g)" {...cut} />
      <path d="M40 30 Q46 22 52 26" stroke="#fffbe0" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".85" />
    </Svg>
  ),
  moon: () => (
    <Svg>
      <defs>
        <radialGradient id="mn-g" cx="35%" cy="30%"><stop offset="0" stopColor="#fff7c4" /><stop offset="1" stopColor="#f3c948" /></radialGradient>
      </defs>
      <path d="M62 8 A42 42 0 1 0 92 70 A34 34 0 1 1 62 8Z" fill="url(#mn-g)" {...cut} />
      <circle cx="38" cy="40" r="4" fill="#e9b93a" opacity=".5" />
      <circle cx="30" cy="62" r="6" fill="#e9b93a" opacity=".4" />
    </Svg>
  ),
  planet: () => (
    <Svg vb="0 0 120 90">
      <defs>
        <radialGradient id="pl-g" cx="38%" cy="32%"><stop offset="0" stopColor="#fff4b0" /><stop offset="1" stopColor="#f0c23e" /></radialGradient>
      </defs>
      <ellipse cx="60" cy="48" rx="56" ry="15" fill="none" stroke="#fff" strokeWidth="13" transform="rotate(-14 60 48)" />
      <circle cx="60" cy="45" r="28" fill="url(#pl-g)" {...cut} />
      <ellipse cx="60" cy="48" rx="56" ry="15" fill="none" stroke="#f5d35c" strokeWidth="6" transform="rotate(-14 60 48)" />
      <path d="M34 50 A28 28 0 0 0 86 44" fill="none" stroke="#f5d35c" strokeWidth="0" />
    </Svg>
  ),
  balloons: () => (
    <Svg vb="0 0 110 130">
      <defs>
        {[
          ["bl-a", "#ff8fa3", "#d8324f"],
          ["bl-b", "#ffd3dc", "#f28ba1"],
          ["bl-c", "#ffffff", "#e8dfe3"],
          ["bl-d", "#ff5d73", "#a3122c"],
        ].map(([id, a, b]) => (
          <radialGradient key={id} id={id} cx="35%" cy="30%"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></radialGradient>
        ))}
      </defs>
      <path d="M55 126 C52 110 40 96 34 78 M55 126 C56 108 60 92 58 72 M55 126 C60 110 72 98 78 80" stroke="#fff" strokeWidth="6" fill="none" />
      <path d="M55 126 C52 110 40 96 34 78 M55 126 C56 108 60 92 58 72 M55 126 C60 110 72 98 78 80" stroke="#c98f99" strokeWidth="1.6" fill="none" />
      {[
        ["bl-c", 30, 58, 0.8],
        ["bl-b", 80, 56, 0.9],
        ["bl-d", 42, 38, 1],
        ["bl-a", 66, 32, 1.05],
      ].map(([id, x, y, s], i) => (
        <path
          key={i}
          d="M0 -22 C-9 -34 -30 -30 -30 -12 C-30 4 -10 16 0 26 C10 16 30 4 30 -12 C30 -30 9 -34 0 -22Z"
          transform={`translate(${x} ${y}) scale(${s})`}
          fill={`url(#${id})`}
          {...cut}
        />
      ))}
      <path d="M58 20 q4 -6 10 -4" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".8" />
    </Svg>
  ),
  bow: () => (
    <Svg vb="0 0 120 90">
      <defs>
        <linearGradient id="bw-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ffc2d1" /><stop offset="1" stopColor="#f07f9c" /></linearGradient>
      </defs>
      <path d="M58 40 C40 10 8 12 12 38 C16 60 44 56 58 44Z" fill="url(#bw-g)" {...cut} />
      <path d="M62 40 C80 10 112 12 108 38 C104 60 76 56 62 44Z" fill="url(#bw-g)" {...cut} />
      <path d="M56 46 L40 86 L50 80 L56 88 L60 50Z M64 46 L80 86 L70 80 L64 88 L60 50Z" fill="#f07f9c" {...cut} />
      <rect x="50" y="32" width="20" height="20" rx="7" fill="#e8607f" {...cut} />
    </Svg>
  ),
  cherries: () => (
    <Svg vb="0 0 100 110">
      <defs>
        <radialGradient id="ch-g" cx="35%" cy="30%"><stop offset="0" stopColor="#ff7a86" /><stop offset="1" stopColor="#b5122a" /></radialGradient>
      </defs>
      <path d="M30 76 C34 40 52 18 70 10 M70 76 C66 46 66 24 70 10" stroke="#fff" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M30 76 C34 40 52 18 70 10 M70 76 C66 46 66 24 70 10" stroke="#6b8e3e" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M70 12 C84 4 96 12 94 24 C82 26 74 20 70 12Z" fill="#7aab66" {...cut} />
      <circle cx="28" cy="82" r="18" fill="url(#ch-g)" {...cut} />
      <circle cx="70" cy="82" r="18" fill="url(#ch-g)" {...cut} />
      <circle cx="22" cy="76" r="4" fill="#fff" opacity=".7" />
      <circle cx="64" cy="76" r="4" fill="#fff" opacity=".7" />
    </Svg>
  ),
  strawberry: () => (
    <Svg vb="0 0 100 110">
      <defs>
        <radialGradient id="sb-g" cx="40%" cy="30%"><stop offset="0" stopColor="#ff8a8a" /><stop offset="1" stopColor="#d61f3b" /></radialGradient>
      </defs>
      <path d="M50 104 C22 90 10 60 16 40 C24 26 76 26 84 40 C90 60 78 90 50 104Z" fill="url(#sb-g)" {...cut} />
      {[[34, 52], [50, 48], [66, 52], [40, 68], [60, 68], [50, 84], [30, 70], [70, 70]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="2.2" ry="3.2" fill="#ffe28a" />
      ))}
      <path d="M50 34 L36 20 L46 28 L42 12 L52 26 L60 12 L58 28 L68 20 Z" fill="#6fa25a" {...cut} />
    </Svg>
  ),
  butterfly: () => (
    <Svg vb="0 0 120 100">
      <defs>
        <linearGradient id="bf-g" x1="0" x2="1"><stop offset="0" stopColor="#b9d8ff" /><stop offset="1" stopColor="#d7c6ff" /></linearGradient>
      </defs>
      <path d="M58 48 C40 10 6 12 12 38 C16 54 40 56 58 50Z M58 52 C40 58 20 80 34 90 C46 96 56 74 58 56Z" fill="url(#bf-g)" {...cut} />
      <path d="M62 48 C80 10 114 12 108 38 C104 54 80 56 62 50Z M62 52 C80 58 100 80 86 90 C74 96 64 74 62 56Z" fill="url(#bf-g)" {...cut} />
      <rect x="56" y="30" width="8" height="46" rx="4" fill="#4a3f5c" {...cut} />
      <circle cx="30" cy="34" r="5" fill="#fff" opacity=".7" />
      <circle cx="90" cy="34" r="5" fill="#fff" opacity=".7" />
    </Svg>
  ),
  sparkle: () => (
    <Svg>
      <path d="M50 4 C54 36 64 46 96 50 C64 54 54 64 50 96 C46 64 36 54 4 50 C36 46 46 36 50 4Z" fill="#fff4c2" {...cut} />
      <path d="M50 20 C52 40 60 48 80 50 C60 52 52 60 50 80 C48 60 40 52 20 50 C40 48 48 40 50 20Z" fill="#ffd95e" />
    </Svg>
  ),
  heart: () => (
    <Svg>
      <defs>
        <radialGradient id="ht-g" cx="35%" cy="30%"><stop offset="0" stopColor="#ff9bb0" /><stop offset="1" stopColor="#e0305a" /></radialGradient>
      </defs>
      <path d="M50 88 C20 66 6 48 10 30 C14 12 38 8 50 28 C62 8 86 12 90 30 C94 48 80 66 50 88Z" fill="url(#ht-g)" {...cut} />
      <path d="M26 30 q4 -10 14 -8" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" opacity=".8" />
    </Svg>
  ),
  cloud: () => (
    <Svg vb="0 0 120 70">
      <path d="M28 62 C10 62 6 40 22 34 C22 16 44 10 54 22 C62 6 90 8 92 28 C110 26 116 50 100 60 C94 64 34 64 28 62Z" fill="#fbf7ff" {...cut} />
      <path d="M36 34 q6 -8 16 -4" stroke="#e5dcf5" strokeWidth="3" fill="none" strokeLinecap="round" />
    </Svg>
  ),
  kiss: () => (
    <Svg vb="0 0 120 70">
      <path d="M8 34 C24 12 44 10 60 22 C76 10 96 12 112 34 C94 60 74 66 60 64 C46 66 26 60 8 34Z" fill="#d61f3b" {...cut} />
      <path d="M12 34 C34 30 48 34 60 38 C72 34 86 30 108 34" stroke="#8f0f24" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M40 22 q8 -4 14 0" stroke="#ff8a98" strokeWidth="3" fill="none" strokeLinecap="round" />
    </Svg>
  ),
  squiggle: () => (
    <Svg vb="0 0 90 120">
      <path d="M20 10 C60 14 60 34 30 40 C0 46 10 70 50 66 C84 62 70 96 30 104" stroke="currentColor" strokeWidth="7" fill="none" strokeLinecap="round" />
    </Svg>
  ),
  pumpkin: () => (
    <Svg>
      <defs>
        <linearGradient id="pk-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffa74d" /><stop offset="1" stopColor="#e8701c" /></linearGradient>
      </defs>
      <path d="M46 26 C44 16 48 10 56 8 C60 14 58 22 54 28Z" fill="#6f8f3c" {...cut} />
      <g {...cut}>
        <ellipse cx="50" cy="60" rx="43" ry="33" fill="url(#pk-g)" />
      </g>
      <ellipse cx="50" cy="60" rx="43" ry="33" fill="url(#pk-g)" />
      <ellipse cx="29" cy="60" rx="15" ry="31" fill="none" stroke="#d4631a" strokeWidth="2.5" opacity=".7" />
      <ellipse cx="71" cy="60" rx="15" ry="31" fill="none" stroke="#d4631a" strokeWidth="2.5" opacity=".7" />
      <ellipse cx="50" cy="60" rx="15" ry="33" fill="none" stroke="#ffc98a" strokeWidth="2.5" opacity=".7" />
      <path d="M36 56 q5 -6 10 0" stroke="#4a2a12" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M54 56 q5 -6 10 0" stroke="#4a2a12" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M44 67 q6 6 12 0" stroke="#4a2a12" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <circle cx="31" cy="66" r="4.5" fill="#ff8a8a" opacity=".55" />
      <circle cx="69" cy="66" r="4.5" fill="#ff8a8a" opacity=".55" />
    </Svg>
  ),
  leaf: () => (
    <Svg>
      <defs>
        <linearGradient id="lf-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f5a341" /><stop offset="1" stopColor="#c8401f" /></linearGradient>
      </defs>
      <path d="M50 6 C76 26 88 54 50 94 C12 54 24 26 50 6Z" fill="url(#lf-g)" {...cut} />
      <path d="M50 14 V88" stroke="#8a2f14" strokeWidth="2.4" strokeLinecap="round" opacity=".65" />
      <path d="M50 34 L66 44 M50 34 L34 44 M50 52 L68 64 M50 52 L32 64 M50 68 L62 78 M50 68 L38 78" stroke="#8a2f14" strokeWidth="1.8" strokeLinecap="round" opacity=".5" />
    </Svg>
  ),
  acorn: () => (
    <Svg>
      <path d="M50 24 C50 18 54 14 60 12" stroke="#fff" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d="M50 24 C50 18 54 14 60 12" stroke="#6b4423" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M26 46 C26 78 40 92 50 92 C60 92 74 78 74 46Z" fill="#d49a5a" {...cut} />
      <path d="M26 46 C26 78 40 92 50 92 C60 92 74 78 74 46Z" fill="#d49a5a" />
      <path d="M36 52 C36 70 42 80 46 84" stroke="#f0c48f" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".8" />
      <path d="M20 46 C20 28 80 28 80 46 C80 50 76 52 70 52 H30 C24 52 20 50 20 46Z" fill="#8a5a2b" {...cut} />
      <path d="M20 46 C20 28 80 28 80 46 C80 50 76 52 70 52 H30 C24 52 20 50 20 46Z" fill="#8a5a2b" />
      {[[32, 40], [44, 36], [56, 36], [68, 40], [38, 46], [50, 44], [62, 46]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.6" fill="#6b4423" />
      ))}
    </Svg>
  ),
  mug: () => (
    <Svg>
      <path d="M40 30 c-5 -7 3 -9 -1 -16 M52 30 c-5 -7 3 -9 -1 -16" stroke="#fff" strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M40 30 c-5 -7 3 -9 -1 -16 M52 30 c-5 -7 3 -9 -1 -16" stroke="#d9c6b0" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M70 46 a11 11 0 0 1 0 24" stroke="#fff" strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d="M70 46 a11 11 0 0 1 0 24" stroke="#fff3e0" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M70 46 a11 11 0 0 1 0 24" stroke="#e8cfae" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M22 38 H70 V76 a12 12 0 0 1 -12 12 H34 a12 12 0 0 1 -12 -12Z" fill="#fff3e0" {...cut} />
      <path d="M22 38 H70 V76 a12 12 0 0 1 -12 12 H34 a12 12 0 0 1 -12 -12Z" fill="#fff3e0" />
      <ellipse cx="46" cy="38" rx="24" ry="6.5" fill="#7a4a2a" />
      <ellipse cx="46" cy="38" rx="24" ry="6.5" fill="none" stroke="#fff" strokeWidth="2.5" />
      <path d="M28 52 H64" stroke="#f0b0b8" strokeWidth="5" strokeLinecap="round" />
      <path d="M28 62 H64" stroke="#f0b0b8" strokeWidth="5" strokeLinecap="round" opacity=".7" />
    </Svg>
  ),
  ghost: () => (
    <Svg>
      <path d="M50 10 C29 10 20 28 20 46 V88 L30 80 L40 90 L50 80 L60 90 L70 80 L80 88 V46 C80 28 71 10 50 10Z" fill="#fbf8ff" {...cut} />
      <path d="M50 10 C29 10 20 28 20 46 V88 L30 80 L40 90 L50 80 L60 90 L70 80 L80 88 V46 C80 28 71 10 50 10Z" fill="#fbf8ff" />
      <path d="M30 46 C30 34 36 24 46 20" stroke="#e5dcf5" strokeWidth="4" strokeLinecap="round" fill="none" />
      <ellipse cx="40" cy="48" rx="4.5" ry="6.5" fill="#2a2140" />
      <ellipse cx="60" cy="48" rx="4.5" ry="6.5" fill="#2a2140" />
      <circle cx="41.5" cy="45.5" r="1.6" fill="#fff" />
      <circle cx="61.5" cy="45.5" r="1.6" fill="#fff" />
      <ellipse cx="50" cy="60" rx="3.5" ry="4.5" fill="#2a2140" />
      <circle cx="31" cy="58" r="4.5" fill="#f7a6b8" opacity=".75" />
      <circle cx="69" cy="58" r="4.5" fill="#f7a6b8" opacity=".75" />
    </Svg>
  ),
  bat: () => (
    <Svg vb="0 0 120 80">
      <path d="M60 30 C52 12 30 8 8 22 C18 24 22 32 20 40 C30 34 40 36 46 46 C50 40 56 38 60 38 C64 38 70 40 74 46 C80 36 90 34 100 40 C98 32 102 24 112 22 C90 8 68 12 60 30Z" fill="#2b2140" {...cut} />
      <path d="M60 30 C52 12 30 8 8 22 C18 24 22 32 20 40 C30 34 40 36 46 46 C50 40 56 38 60 38 C64 38 70 40 74 46 C80 36 90 34 100 40 C98 32 102 24 112 22 C90 8 68 12 60 30Z" fill="#2b2140" />
      <path d="M50 24 L54 12 L58 24Z M62 24 L66 12 L70 24Z" fill="#2b2140" {...cut} />
      <path d="M50 24 L54 12 L58 24Z M62 24 L66 12 L70 24Z" fill="#2b2140" />
      <ellipse cx="60" cy="38" rx="11" ry="14" fill="#2b2140" />
      <circle cx="55" cy="34" r="2.4" fill="#fff" />
      <circle cx="65" cy="34" r="2.4" fill="#fff" />
      <circle cx="55.6" cy="34.4" r="1.1" fill="#2b2140" />
      <circle cx="65.6" cy="34.4" r="1.1" fill="#2b2140" />
      <path d="M57 42 q3 3 6 0" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </Svg>
  ),
  candy: () => (
    <Svg vb="0 0 120 80">
      <path d="M30 26 L6 14 L12 40 L6 66 L30 54Z" fill="#ffb1c8" {...cut} />
      <path d="M90 26 L114 14 L108 40 L114 66 L90 54Z" fill="#ffb1c8" {...cut} />
      <path d="M30 26 L6 14 L12 40 L6 66 L30 54Z M90 26 L114 14 L108 40 L114 66 L90 54Z" fill="#ffb1c8" />
      <path d="M14 22 L26 34 M14 58 L26 46 M106 22 L94 34 M106 58 L94 46" stroke="#f07aa0" strokeWidth="2.2" strokeLinecap="round" opacity=".8" />
      <ellipse cx="60" cy="40" rx="30" ry="21" fill="#ff8fab" {...cut} />
      <ellipse cx="60" cy="40" rx="30" ry="21" fill="#ff8fab" />
      <path d="M46 20 C40 34 40 46 46 60 M60 19 C54 34 54 46 60 61 M74 20 C68 34 68 46 74 60" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" opacity=".9" />
      <ellipse cx="50" cy="30" rx="8" ry="4" fill="#fff" opacity=".55" />
    </Svg>
  ),
};

export function Sticker({ id }: { id: StickerId }) {
  return <>{STICKERS[id]()}</>;
}
