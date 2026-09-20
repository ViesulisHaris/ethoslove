/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from "react";
import type { GiftPhoto } from "@/lib/gift/schema";
import type { AmbienceKind } from "../_shared/Ambience";

export type LookId = "linen" | "bubblegum" | "lime" | "midnight";
export type Look = {
  ground: string;
  /** A repeating CSS background drawn over the ground: the weave, the checks, the dots. */
  pattern: string;
  patternSize: string;
  ink: string;
  paper: string;
  paperInk: string;
  tiles: string[];
  confetti: string[];
  ambience: { kind: AmbienceKind; colors: string[]; count: number }[];
  dark: boolean;
};

export const LOOKS: Record<LookId, Look> = {
  linen: {
    ground: "#E7DFCF",
    pattern: "repeating-linear-gradient(0deg, rgba(120,98,70,.10) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(120,98,70,.09) 0 1px, transparent 1px 3px)",
    patternSize: "auto",
    ink: "#2E2622",
    paper: "#FFFDF8",
    paperInk: "#2E2622",
    tiles: ["#F0588C", "#FFC93C", "#57B8A0", "#6C8CF5", "#F58A4B", "#FFFDF8"],
    confetti: ["#F0588C", "#FFC93C", "#57B8A0", "#6C8CF5", "#F58A4B"],
    ambience: [{ kind: "dust", colors: ["#FFFFFF", "#FFE9B8"], count: 14 }],
    dark: false,
  },
  bubblegum: {
    ground: "#FBD3E2",
    pattern: "linear-gradient(90deg, rgba(255,255,255,.55) 50%, transparent 50%), linear-gradient(0deg, rgba(255,255,255,.55) 50%, transparent 50%)",
    patternSize: "calc(9*var(--p)) calc(9*var(--p))",
    ink: "#4A2030",
    paper: "#FFFFFF",
    paperInk: "#3E1F2B",
    tiles: ["#E8407A", "#FFFFFF", "#FFB3CC", "#B48CF2", "#FFD166", "#7FD6C2"],
    confetti: ["#E8407A", "#FFFFFF", "#B48CF2", "#FFD166"],
    ambience: [{ kind: "hearts", colors: ["#FFFFFF", "#F36A9B"], count: 9 }],
    dark: false,
  },
  lime: {
    ground: "#DDE9A6",
    pattern: "radial-gradient(circle at 50% 50%, rgba(255,255,255,.75) 0 16%, transparent 17%)",
    patternSize: "calc(8*var(--p)) calc(8*var(--p))",
    ink: "#2F3B1E",
    paper: "#FFFEF6",
    paperInk: "#2B3320",
    tiles: ["#2F8F5B", "#FF7A59", "#FFFEF6", "#FFD23F", "#EE6FA9", "#4F7DF0"],
    confetti: ["#2F8F5B", "#FF7A59", "#FFD23F", "#EE6FA9", "#4F7DF0"],
    ambience: [{ kind: "sparkles", colors: ["#FFFFFF", "#FFF3A8"], count: 12 }],
    dark: false,
  },
  midnight: {
    ground: "#1E2040",
    pattern: "radial-gradient(circle at 20% 30%, rgba(255,255,255,.5) 0 1.5%, transparent 2%), radial-gradient(circle at 70% 60%, rgba(255,233,184,.5) 0 1.2%, transparent 1.8%), radial-gradient(circle at 45% 85%, rgba(255,255,255,.35) 0 1%, transparent 1.6%)",
    patternSize: "calc(26*var(--p)) calc(26*var(--p))",
    ink: "#FFF6E8",
    paper: "#FFFDF8",
    paperInk: "#2A2340",
    tiles: ["#FF6FA5", "#FFD166", "#7FE0C3", "#8FA8FF", "#FFFDF8", "#C79BFF"],
    confetti: ["#FF6FA5", "#FFD166", "#7FE0C3", "#8FA8FF", "#FFFFFF"],
    ambience: [{ kind: "sparkles", colors: ["#FFFFFF", "#FFE9B8", "#BFD7FF"], count: 22 }],
    dark: true,
  },
};

const FRAME_SHADOW = "0 calc(1.2*var(--p)) calc(2.6*var(--p)) rgba(40,22,18,.34), 0 0 0 1px rgba(60,40,30,.06)";

function Shot({ photo, onOpen, style }: { photo: GiftPhoto; onOpen?: () => void; style: CSSProperties }) {
  return (
    <button type="button" onClick={onOpen} aria-label={photo.caption || photo.alt || "photo"} className="block w-full overflow-hidden bg-[#1A1716] outline-none focus-visible:ring-4 focus-visible:ring-black/40" style={style}>
      <img src={photo.url} alt="" draggable={false} className="h-full w-full object-cover" />
    </button>
  );
}

/** A polaroid: the picture, and a lip to write on. */
export function Polaroid({ photo, width, aspect, lip, onOpen, children }: { photo: GiftPhoto; width: number; aspect: number; lip: number; onOpen?: () => void; children?: ReactNode }) {
  return (
    <div className="relative" style={{ width: `calc(${width} * var(--p))`, padding: "calc(2.2*var(--p)) calc(2.2*var(--p)) 0", background: "#FFFDF8", boxShadow: FRAME_SHADOW }}>
      <Shot photo={photo} onOpen={onOpen} style={{ aspectRatio: String(aspect) }} />
      <div className="grid place-items-center overflow-hidden text-center text-[#2E2622]" style={{ height: `calc(${lip} * var(--p))` }}>
        {children}
      </div>
    </div>
  );
}

/** A photo-booth strip, two to four frames tall. */
export function BoothStrip({ photos, width, onOpen }: { photos: GiftPhoto[]; width: number; onOpen?: (index: number) => void }) {
  return (
    <div className="relative flex flex-col" style={{ width: `calc(${width} * var(--p))`, padding: "calc(2.2*var(--p)) calc(2.2*var(--p)) calc(7*var(--p))", gap: "calc(1.6*var(--p))", background: "#FBF7EE", boxShadow: FRAME_SHADOW }}>
      {photos.map((photo, i) => (
        <Shot key={photo.id} photo={photo} onOpen={onOpen ? () => onOpen(i) : undefined} style={{ height: "calc(20*var(--p))" }} />
      ))}
    </div>
  );
}

/** The little burst that marks a guest as greeted. */
export function Spark({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <path d="M12 1.5l2.6 6.9 7.4.4-5.8 4.6 2 7.1L12 16.4l-6.2 4.1 2-7.1L2 8.8l7.4-.4z" fill={color} stroke="#FFFFFF" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export const PARTY_KEYFRAMES = `
@keyframes pa-bob { 0%,100% { translate: 0 0 } 50% { translate: 0 calc(-1.3*var(--p)) } }
@keyframes pa-tilt { 0%,100% { rotate: -3.5deg } 50% { rotate: 3.5deg } }
@keyframes pa-squish { 0%,100% { scale: 1 1 } 45% { scale: 1.05 .95 } 70% { scale: .97 1.04 } }
.pa-idle-bob { animation: pa-bob var(--pace) ease-in-out infinite; }
.pa-idle-tilt { animation: pa-tilt var(--pace) ease-in-out infinite; transform-origin: 50% 90%; }
.pa-idle-squish { animation: pa-squish var(--pace) ease-in-out infinite; transform-origin: 50% 100%; }
@media (prefers-reduced-motion: reduce) { .pa-idle-bob, .pa-idle-tilt, .pa-idle-squish { animation: none; } }
`;
