import type { AmbienceKind } from "../_shared/Ambience";

export type SurfaceId = "mat" | "paper" | "holo" | "night";
export type Surface = {
  ground: string;
  pattern: string;
  /** Left out when the pattern carries its own sizes, as the mat's grid does. */
  patternSize?: string;
  ink: string;
  soft: string;
  confetti: string[];
  ambience: { kind: AmbienceKind; colors: string[]; count: number }[];
  dark: boolean;
};

/** A cutting mat's grid: a fine line every five units and a heavier one every twenty-five. */
const rule = (to: "right" | "bottom", colour: string, weight: number, every: number) =>
  `linear-gradient(to ${to}, ${colour} 0 calc(${weight}*var(--p)), transparent calc(${weight}*var(--p))) 0 0 / calc(${every}*var(--p)) calc(${every}*var(--p))`;
const grid = (line: string, bold: string) => [rule("right", bold, 0.35, 25), rule("bottom", bold, 0.35, 25), rule("right", line, 0.2, 5), rule("bottom", line, 0.2, 5)].join(", ");

export const SURFACES: Record<SurfaceId, Surface> = {
  mat: {
    ground: "#2E7D5B",
    pattern: grid("rgba(255,255,255,.13)", "rgba(255,255,255,.3)"),
    ink: "#F4FFF8",
    soft: "rgba(244,255,248,.7)",
    confetti: ["#FFFFFF", "#FFD23F", "#FF6FA5", "#8FE3C0", "#7FB6FF"],
    ambience: [{ kind: "dust", colors: ["#FFFFFF", "#D7FFE9"], count: 10 }],
    dark: true,
  },
  paper: {
    ground: "#F6F1E4",
    pattern: "radial-gradient(circle, rgba(60,50,40,.34) 0 calc(.32*var(--p)), transparent calc(.4*var(--p)))",
    patternSize: "calc(5*var(--p)) calc(5*var(--p))",
    ink: "#2A2622",
    soft: "rgba(42,38,34,.6)",
    confetti: ["#FF5C8A", "#FFD23F", "#57B8A0", "#6C8CF5", "#F58A4B"],
    ambience: [{ kind: "dust", colors: ["#FFFFFF", "#FFE9B8"], count: 10 }],
    dark: false,
  },
  holo: {
    ground: "linear-gradient(135deg, #FBC2EB 0%, #A6C1EE 28%, #C2FFD8 52%, #FFF1B5 76%, #FBC2EB 100%)",
    pattern: "repeating-linear-gradient(115deg, rgba(255,255,255,.34) 0 calc(2*var(--p)), transparent calc(2*var(--p)) calc(9*var(--p)))",
    ink: "#2A2340",
    soft: "rgba(42,35,64,.62)",
    confetti: ["#FFFFFF", "#FF8CC6", "#8FA8FF", "#8FE3C0", "#FFE27A"],
    ambience: [{ kind: "sparkles", colors: ["#FFFFFF", "#FFF3A8"], count: 18 }],
    dark: false,
  },
  night: {
    ground: "linear-gradient(160deg, #23252F 0%, #15161C 60%, #1B1C25 100%)",
    pattern: "repeating-linear-gradient(115deg, rgba(255,255,255,.035) 0 calc(14*var(--p)), transparent calc(14*var(--p)) calc(30*var(--p)))",
    ink: "#F4F1FF",
    soft: "rgba(244,241,255,.62)",
    confetti: ["#FF6FA5", "#FFD166", "#7FE0C3", "#8FA8FF", "#FFFFFF"],
    ambience: [{ kind: "sparkles", colors: ["#FFFFFF", "#BFD7FF"], count: 14 }],
    dark: true,
  },
};

/** A strip from a label maker: white capitals punched into black tape. */
export function LabelStrip({ children }: { children: string }) {
  return (
    <span
      className="block w-max max-w-[calc(44*var(--p))] truncate rounded-[calc(.5*var(--p))] px-[calc(1.8*var(--p))] py-[calc(.9*var(--p))] text-[calc(2.7*var(--p))] leading-none font-bold tracking-[0.2em] text-white uppercase"
      style={{ fontFamily: "'Courier New', ui-monospace, monospace", background: "linear-gradient(180deg, #2A2A2E, #0E0E10)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.22), 0 calc(.4*var(--p)) calc(.9*var(--p)) rgba(0,0,0,.45)", textShadow: "0 1px 0 rgba(0,0,0,.9), 0 -1px 0 rgba(255,255,255,.25)" }}
    >
      {children}
    </span>
  );
}

export const BOMB_KEYFRAMES = `
@keyframes sb-ring { from { scale: .2; opacity: .9 } to { scale: 1.6; opacity: 0 } }
@keyframes sb-pulse { 0%,100% { scale: 1; opacity: .55 } 50% { scale: 1.12; opacity: .9 } }
@keyframes sb-jiggle { 0%,100% { rotate: 0deg } 25% { rotate: -2.2deg } 75% { rotate: 2.2deg } }
.sb-ring { animation: sb-ring .5s ease-out forwards; }
.sb-pulse { animation: sb-pulse 1.8s ease-in-out infinite; }
.sb-jiggle { animation: sb-jiggle .42s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .sb-ring, .sb-pulse, .sb-jiggle { animation: none; } }
`;
