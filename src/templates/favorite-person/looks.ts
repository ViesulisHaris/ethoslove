import type { AmbienceKind } from "../_shared/Ambience";

export type LookId = "blush" | "lilac" | "peach";

export type Look = {
  /** The paper the whole page is, and the handwriting straight on it. */
  wall: string;
  wallInk: string;
  /** The two watercolour washes behind the photos. */
  washes: [string, string];
  /** Polaroids, notes and cards, and their ink. */
  paper: string;
  ink: string;
  /** Pen doodles, the hearts a tap draws, the bars and buttons. */
  accent: string;
  washi: { gingham: string; hearts: string; heartsInk: string; dots: string };
  card: { card: string; ink: string; soft: string; bar: string };
  /** Turns the pink flower cut-outs to this look's colour; none on blush. */
  tone?: string;
  ambience: { kind: AmbienceKind; colors: string[]; count: number }[];
  confetti: string[];
};

export const LOOKS: Record<LookId, Look> = {
  blush: {
    wall: "#FBF4EE",
    wallInk: "#6B3F4C",
    washes: ["#F3A9BC", "#D8B4DC"],
    paper: "#FFFDF9",
    ink: "#5A3A44",
    accent: "#E07A98",
    washi: { gingham: "#F6B9C8", hearts: "#FCE6EC", heartsInk: "#EC86A3", dots: "#F8D3DE" },
    card: { card: "#FCE4EA", ink: "#5A3A44", soft: "#B07686", bar: "#E07A98" },
    ambience: [{ kind: "petals", colors: ["#F6B9C8", "#F3A9BC", "#FFFFFF"], count: 10 }],
    confetti: ["#F3A9BC", "#FFFFFF", "#E07A98", "#D8B4DC"],
  },
  lilac: {
    wall: "#F7F3F8",
    wallInk: "#4F3E66",
    washes: ["#C9B5E6", "#F2B7CB"],
    paper: "#FFFDFE",
    ink: "#45385A",
    accent: "#A27BD9",
    washi: { gingham: "#CDB9EC", hearts: "#F1E8FA", heartsInk: "#A27BD9", dots: "#E3D6F5" },
    card: { card: "#EFE6FA", ink: "#45385A", soft: "#8E7AAE", bar: "#A27BD9" },
    tone: "hue-rotate(-38deg) saturate(.85)",
    ambience: [{ kind: "petals", colors: ["#CDB9EC", "#E3D6F5", "#FFFFFF"], count: 10 }],
    confetti: ["#C9B5E6", "#FFFFFF", "#A27BD9", "#F2B7CB"],
  },
  peach: {
    wall: "#FCF5EC",
    wallInk: "#6E4532",
    washes: ["#F8C1A2", "#F6D7A7"],
    paper: "#FFFCF7",
    ink: "#5E3D2E",
    accent: "#EE8E66",
    washi: { gingham: "#F7C4AA", hearts: "#FDEADF", heartsInk: "#EE8E66", dots: "#FAD9C5" },
    card: { card: "#FDE9DC", ink: "#5E3D2E", soft: "#B07A60", bar: "#EE8E66" },
    tone: "hue-rotate(16deg) saturate(1.05)",
    ambience: [{ kind: "petals", colors: ["#F8C1A2", "#F6D7A7", "#FFFFFF"], count: 10 }],
    confetti: ["#F8C1A2", "#FFFFFF", "#EE8E66", "#F6D7A7"],
  },
};

/** How many hearts a tap can draw before the oldest goes. */
export const MAX_HEARTS = 14;

export type Heart = { id: number; x: number; y: number; size: number; rotate: number };

/** The `n`th heart a tap draws: how big and which way it leans, the same for the same two people. */
export function heartAt(n: number, x: number, y: number, seed: number): Heart {
  const a = Math.sin((seed + n * 7919) * 12.9898) * 43758.5453;
  const b = Math.sin((seed + n * 104729) * 78.233) * 43758.5453;
  const r1 = a - Math.floor(a);
  const r2 = b - Math.floor(b);
  return { id: n, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, size: 7 + Math.round(r1 * 5), rotate: Math.round((r2 - 0.5) * 40) };
}

export const addHeart = (hearts: Heart[], heart: Heart): Heart[] => [...hearts, heart].slice(-MAX_HEARTS);

/** The looks in the order the editor offers them, each as its swatch: the page, the paper, the accent. */
export const LOOK_ORDER: LookId[] = ["blush", "lilac", "peach"];
export const SWATCHES = Object.fromEntries(LOOK_ORDER.map((id) => [id, { page: LOOKS[id].washes[0], paper: LOOKS[id].wall, accent: LOOKS[id].accent }])) as Record<LookId, { page: string; paper: string; accent: string }>;
