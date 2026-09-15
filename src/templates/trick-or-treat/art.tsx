/**
 * Halloween night, drawn cute rather than scary: a moon, a crooked little house, a
 * jack-o'-lantern, and the three hosts who can answer the door. All original SVG.
 */

export type Palette = {
  /** The night sky, top to horizon. */
  sky: [string, string];
  ground: string;
  /** The house's walls, roof and door. */
  wall: string;
  roof: string;
  door: string;
  trim: string;
  /** Light spilling from the windows and the pumpkin. */
  glow: string;
  accent: string;
  /** The scroll and the frames inside. */
  paper: string;
  ink: string;
  frame: string;
  /** The room behind the scroll. */
  room: string;
  candy: string[];
};

export const PALETTES: Record<"midnight" | "pumpkin" | "witch" | "candy", Palette> = {
  midnight: {
    sky: ["#150C2E", "#3B1F66"],
    ground: "#100822",
    wall: "#3B2868",
    roof: "#2A1850",
    door: "#4B2C7F",
    trim: "#A98BF0",
    glow: "#FFB347",
    accent: "#F28C28",
    paper: "#F3E6C8",
    ink: "#2B1B3D",
    frame: "#C99A3F",
    room: "radial-gradient(120% 80% at 50% 40%, #2B1A4C 0%, #170D2C 55%, #0B0616 100%)",
    candy: ["#F28C28", "#9B6BFF", "#FFFFFF", "#8BE04A", "#FF6FB5"],
  },
  pumpkin: {
    sky: ["#1E0C06", "#5A2A12"],
    ground: "#160A05",
    wall: "#4E2616",
    roof: "#321509",
    door: "#7A3A1A",
    trim: "#E0904A",
    glow: "#FFC15C",
    accent: "#FF8C1A",
    paper: "#FBEAD0",
    ink: "#3A2012",
    frame: "#D9A441",
    room: "radial-gradient(120% 80% at 50% 40%, #4A2210 0%, #2A1208 55%, #120704 100%)",
    candy: ["#FF8C1A", "#FFFFFF", "#FFD166", "#2A1208", "#F25C2A"],
  },
  witch: {
    sky: ["#0A1C18", "#1D4A3A"],
    ground: "#07130F",
    wall: "#1E4E3E",
    roof: "#133529",
    door: "#2E6A4F",
    trim: "#8BE0A6",
    glow: "#C8FF7A",
    accent: "#8BE04A",
    paper: "#EDF3DA",
    ink: "#18301F",
    frame: "#A9B85A",
    room: "radial-gradient(120% 80% at 50% 40%, #1C4A3A 0%, #0F2A20 55%, #06130E 100%)",
    candy: ["#8BE04A", "#FFFFFF", "#F2C94C", "#6A3FA0", "#FF6FB5"],
  },
  candy: {
    sky: ["#2A1240", "#7A2E9A"],
    ground: "#1E0C30",
    wall: "#51257A",
    roof: "#381658",
    door: "#A83A9A",
    trim: "#FFB3E6",
    glow: "#FFC0E0",
    accent: "#FF6FB5",
    paper: "#FBE8F5",
    ink: "#3A1A4A",
    frame: "#E28ACF",
    room: "radial-gradient(120% 80% at 50% 40%, #4A1E66 0%, #2A1040 55%, #14081F 100%)",
    candy: ["#FF6FB5", "#FFFFFF", "#9B6BFF", "#FFD166", "#8BE04A"],
  },
};

export function Moon({ p }: { p: Palette }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id="tt-moon" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#FFF6DA" />
          <stop offset="1" stopColor="#F2D28C" />
        </radialGradient>
        <radialGradient id="tt-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0.55" stopColor={p.glow} stopOpacity="0.35" />
          <stop offset="1" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#tt-halo)" />
      <circle cx="50" cy="50" r="30" fill="url(#tt-moon)" />
      <circle cx="40" cy="42" r="5" fill="#E8C57A" opacity="0.55" />
      <circle cx="58" cy="58" r="3.5" fill="#E8C57A" opacity="0.5" />
      <circle cx="61" cy="40" r="2.2" fill="#E8C57A" opacity="0.45" />
    </svg>
  );
}

/** A jack-o'-lantern. Unlit it's just a pumpkin with a face cut; lit, the face glows and flickers. */
export function Pumpkin({ p, lit, face = true }: { p: Palette; lit: boolean; face?: boolean }) {
  return (
    <svg viewBox="0 0 100 90" className="h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="tt-pk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFA24A" />
          <stop offset="1" stopColor="#E0651A" />
        </linearGradient>
        <radialGradient id="tt-pkglow" cx="50%" cy="60%" r="50%">
          <stop offset="0" stopColor={p.glow} stopOpacity="0.7" />
          <stop offset="1" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      {lit ? <ellipse cx="50" cy="56" rx="62" ry="44" fill="url(#tt-pkglow)" className="tt-glow" /> : null}
      <path d="M47 22 C45 12 49 6 57 4 C61 10 59 18 55 24Z" fill="#5E8A3A" />
      <ellipse cx="50" cy="54" rx="44" ry="33" fill="url(#tt-pk)" />
      <ellipse cx="28" cy="54" rx="15" ry="31" fill="none" stroke="#C85A18" strokeWidth="2.5" opacity="0.6" />
      <ellipse cx="72" cy="54" rx="15" ry="31" fill="none" stroke="#C85A18" strokeWidth="2.5" opacity="0.6" />
      <ellipse cx="50" cy="54" rx="16" ry="33" fill="none" stroke="#FFC98A" strokeWidth="2.5" opacity="0.55" />
      {face ? (
        <g fill={lit ? "#FFE28A" : "#3A1508"} className={lit ? "tt-flicker" : undefined}>
          <path d="M30 44 L42 52 L28 54Z" />
          <path d="M70 44 L58 52 L72 54Z" />
          <path d="M28 64 C36 74 64 74 72 64 L66 62 L62 68 L56 62 L50 68 L44 62 L38 68 L34 62Z" />
        </g>
      ) : null}
    </svg>
  );
}

/** The house: a crooked gable, a round attic window, an arched door with a sign, and a step. */
export function House({ p, doorOpen, lit, sign }: { p: Palette; doorOpen: boolean; lit: boolean; sign: string }) {
  return (
    <svg viewBox="0 0 160 190" className="h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="tt-spill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.glow} stopOpacity="0.9" />
          <stop offset="1" stopColor={p.glow} stopOpacity="0.15" />
        </linearGradient>
      </defs>
      {/* chimney */}
      <rect x="112" y="22" width="14" height="34" fill={p.roof} />
      <rect x="110" y="20" width="18" height="6" fill={p.trim} opacity="0.7" />
      {/* walls */}
      <path d="M20 78 H140 V180 H20Z" fill={p.wall} />
      <path d="M20 78 H140 V84 H20Z" fill="rgba(0,0,0,0.25)" />
      <path d="M20 180 V84 M140 84 V180" stroke={p.trim} strokeOpacity="0.4" strokeWidth="1.6" />
      <path d="M20 128 H140 M20 152 H140" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
      {/* roof, a little crooked */}
      <path d="M8 84 L80 14 L154 82 L142 88 L80 30 L20 92Z" fill={p.roof} />
      <path d="M44 62 H116 M60 46 H100 M28 76 H132" stroke={p.trim} strokeOpacity="0.2" strokeWidth="1.2" />
      <path d="M14 86 L80 22 L148 84" fill="none" stroke={p.trim} strokeWidth="2.5" opacity="0.75" />
      {/* attic window */}
      <circle cx="80" cy="60" r="11" fill={lit ? p.glow : "#1A1030"} className={lit ? "tt-glow" : undefined} />
      <circle cx="80" cy="60" r="11" fill="none" stroke={p.trim} strokeWidth="2.5" />
      <path d="M80 49 V71 M69 60 H91" stroke={p.trim} strokeWidth="2" />
      {/* side windows */}
      {[34, 112].map((x) => (
        <g key={x}>
          <rect x={x} y="100" width="16" height="22" rx="2" fill={lit ? p.glow : "#1A1030"} opacity={lit ? 0.9 : 1} />
          <rect x={x} y="100" width="16" height="22" rx="2" fill="none" stroke={p.trim} strokeWidth="2" />
          <path d={`M${x + 8} 100 V122 M${x} 111 H${x + 16}`} stroke={p.trim} strokeWidth="1.4" />
        </g>
      ))}
      {/* light spilling from the open door */}
      {doorOpen ? <path d="M60 178 L100 178 L124 210 L36 210Z" fill="url(#tt-spill)" opacity="0.9" /> : null}
      {/* the door */}
      <path d="M60 178 V118 A20 20 0 0 1 100 118 V178Z" fill={doorOpen ? p.glow : p.door} />
      {doorOpen ? (
        <path d="M60 178 V118 A20 20 0 0 1 100 118 V178Z" fill="rgba(255,255,255,0.25)" />
      ) : (
        <g>
          <path d="M60 178 V118 A20 20 0 0 1 100 118 V178Z" fill="none" stroke={p.trim} strokeWidth="2.5" />
          <path d="M80 100 V178 M66 140 H94" stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
          <circle cx="90" cy="150" r="2.6" fill={p.trim} />
        </g>
      )}
      {/* the sign, hanging on two nails */}
      <path d="M62 110 L74 100 M98 110 L86 100" stroke={p.trim} strokeWidth="1.2" opacity="0.7" />
      <rect x="50" y="106" width="60" height="16" rx="3" fill="#E9D2AE" stroke="#8A5A2B" strokeWidth="1.4" />
      <text
        x="80"
        y="118"
        textAnchor="middle"
        fontSize={sign.length > 10 ? 8 : 9.5}
        fill="#5A3A1E"
        style={{ fontFamily: "var(--gift-font-hand), cursive" }}
        {...(sign.length > 10 ? { textLength: 52, lengthAdjust: "spacingAndGlyphs" as const } : {})}
      >
        {sign}
      </text>
      {/* the step */}
      <path d="M46 178 H114 V186 H46Z" fill="rgba(0,0,0,0.35)" />
      <path d="M40 186 H120 V190 H40Z" fill="rgba(0,0,0,0.45)" />
    </svg>
  );
}

/** A sheet ghost. `mood` changes the eyes: shy at the door, happy with the treat, wide for boo. */
export function Ghost({ mood }: { mood: "shy" | "happy" | "boo" }) {
  return (
    <svg viewBox="0 0 100 110" className="h-full w-full overflow-visible" aria-hidden="true">
      <path d="M50 8 C28 8 18 28 18 48 V92 L29 84 L40 94 L50 84 L60 94 L71 84 L82 92 V48 C82 28 72 8 50 8Z" fill="#FBF8FF" />
      <path d="M28 48 C28 36 34 24 45 19" stroke="#E5DCF5" strokeWidth="4" strokeLinecap="round" fill="none" />
      {mood === "boo" ? (
        <g>
          <ellipse cx="40" cy="48" rx="6.5" ry="9" fill="#2A2140" />
          <ellipse cx="60" cy="48" rx="6.5" ry="9" fill="#2A2140" />
          <ellipse cx="50" cy="66" rx="7" ry="9" fill="#2A2140" />
        </g>
      ) : mood === "happy" ? (
        <g stroke="#2A2140" strokeWidth="3.6" strokeLinecap="round" fill="none">
          <path d="M34 48 q6 -7 12 0" />
          <path d="M54 48 q6 -7 12 0" />
          <path d="M42 62 q8 8 16 0" />
        </g>
      ) : (
        <g>
          <ellipse cx="40" cy="48" rx="4.5" ry="6.5" fill="#2A2140" />
          <ellipse cx="60" cy="48" rx="4.5" ry="6.5" fill="#2A2140" />
          <circle cx="41.5" cy="45.5" r="1.6" fill="#fff" />
          <circle cx="61.5" cy="45.5" r="1.6" fill="#fff" />
          <ellipse cx="50" cy="60" rx="3" ry="3.6" fill="#2A2140" />
        </g>
      )}
      <circle cx="31" cy="58" r="4.5" fill="#F7A6B8" opacity="0.75" />
      <circle cx="69" cy="58" r="4.5" fill="#F7A6B8" opacity="0.75" />
    </svg>
  );
}

/** A black cat, sitting, tail curled. */
export function Cat({ mood }: { mood: "shy" | "happy" | "boo" }) {
  const eye = mood === "boo" ? 7 : 4.5;
  return (
    <svg viewBox="0 0 100 110" className="h-full w-full overflow-visible" aria-hidden="true">
      <path d="M78 96 C96 96 100 76 88 70 C84 68 80 74 84 78 C90 84 84 90 76 90Z" fill="#1C1728" />
      <ellipse cx="50" cy="82" rx="26" ry="22" fill="#1C1728" />
      <circle cx="50" cy="48" r="24" fill="#1C1728" />
      <path d="M30 34 L28 10 L46 26Z M70 34 L72 10 L54 26Z" fill="#1C1728" />
      <path d="M33 30 L32 16 L43 27Z M67 30 L68 16 L57 27Z" fill="#F7A6B8" opacity="0.8" />
      {mood === "happy" ? (
        <g stroke="#C8FF7A" strokeWidth="3.4" strokeLinecap="round" fill="none">
          <path d="M36 48 q6 -6 12 0" />
          <path d="M52 48 q6 -6 12 0" />
        </g>
      ) : (
        <g>
          <ellipse cx="41" cy="48" rx={eye} ry={eye + 1.5} fill="#C8FF7A" />
          <ellipse cx="59" cy="48" rx={eye} ry={eye + 1.5} fill="#C8FF7A" />
          <ellipse cx="41" cy="48" rx={mood === "boo" ? 3.5 : 1.4} ry={eye} fill="#1C1728" />
          <ellipse cx="59" cy="48" rx={mood === "boo" ? 3.5 : 1.4} ry={eye} fill="#1C1728" />
        </g>
      )}
      <path d="M47 58 q3 3 6 0" stroke="#F7A6B8" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M22 54 L38 56 M22 60 L38 59 M78 54 L62 56 M78 60 L62 59" stroke="#E5DCF5" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      <path d="M40 104 h20" stroke="#1C1728" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

/** Cobwebs for the corners of the haunted frames. */
export function Cobweb({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <g stroke="rgba(255,255,255,0.55)" strokeWidth="0.9" fill="none">
        <path d="M0 0 L40 0 M0 0 L0 40 M0 0 L34 20 M0 0 L20 34 M0 0 L38 8 M0 0 L8 38" />
        <path d="M10 0 Q9 6 0 10 M20 0 Q18 12 0 20 M30 0 Q27 18 0 30 M40 0 Q36 24 0 40" />
      </g>
    </svg>
  );
}

/** The rolled ends of the scroll the message is written on. */
export function ScrollRoll({ p, flip = false }: { p: Palette; flip?: boolean }) {
  return (
    <svg viewBox="0 0 100 10" preserveAspectRatio="none" className={flip ? "h-full w-full -scale-y-100" : "h-full w-full"} aria-hidden="true">
      <defs>
        <linearGradient id={`tt-roll-${flip ? "b" : "t"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(0,0,0,0.05)" />
          <stop offset="0.5" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.35)" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="10" rx="5" fill={p.paper} />
      <rect x="0" y="0" width="100" height="10" rx="5" fill={`url(#tt-roll-${flip ? "b" : "t"})`} />
      <ellipse cx="2" cy="5" rx="2" ry="5" fill="rgba(0,0,0,0.25)" />
      <ellipse cx="98" cy="5" rx="2" ry="5" fill="rgba(0,0,0,0.25)" />
    </svg>
  );
}
