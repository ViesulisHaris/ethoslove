import type { AmbienceKind } from "../_shared/Ambience";
import type { ScrapId } from "../_shared/collage/scraps";

export type LookId = "sunset" | "lilac" | "night";

export type Look = {
  /** The sky at the top of the page and on the first screen, top to horizon. */
  sky: [string, string, string, string];
  /** Cloud tops in the light, their undersides in the sky's colour, and the thin streaks low down. */
  clouds: { top: string; under: string; streak: string };
  /** The page below the sky, and the words written straight on it. */
  wall: string;
  wallInk: string;
  dark: boolean;
  /** The big player card, and its ink. */
  player: string;
  playerInk: string;
  /** Pen doodles, the play button's ring, bars. */
  accent: string;
  /** Notes and the letter: grid paper and its lines. */
  paper: string;
  ink: string;
  gridLine: string;
  washi: { gingham: string; dots: string };
  card: { card: string; ink: string; soft: string; bar: string };
  ambience: { kind: AmbienceKind; colors: string[]; count: number }[];
  confetti: string[];
};

export const LOOKS: Record<LookId, Look> = {
  sunset: {
    sky: ["#AFA2E4", "#E3A6D6", "#F7B5C6", "#FBD5C4"],
    clouds: { top: "#FFFFFF", under: "rgba(244,170,200,.95)", streak: "rgba(255,236,226,.9)" },
    wall: "#F6D1DA",
    wallInk: "#5B2238",
    dark: false,
    player: "#F5BACA",
    playerInk: "#2B1520",
    accent: "#E2557F",
    paper: "#FFF6F8",
    ink: "#3A1F2B",
    gridLine: "rgba(226,85,127,.2)",
    washi: { gingham: "#F59AB4", dots: "#FBD0DC" },
    card: { card: "#FBE3EA", ink: "#3A1F2B", soft: "#B0657F", bar: "#E2557F" },
    ambience: [{ kind: "sparkles", colors: ["#FFFFFF", "#FFD6E2"], count: 12 }],
    confetti: ["#E2557F", "#FFFFFF", "#F7B5C6", "#AFA2E4"],
  },
  lilac: {
    sky: ["#9486DB", "#BFA6EC", "#E4C1EA", "#F6DAE7"],
    clouds: { top: "#FFFFFF", under: "rgba(208,178,236,.95)", streak: "rgba(255,240,248,.9)" },
    wall: "#E6DDF6",
    wallInk: "#3F2E6B",
    dark: false,
    player: "#D9C8F3",
    playerInk: "#241A3D",
    accent: "#8B67D6",
    paper: "#FBF8FF",
    ink: "#2E2347",
    gridLine: "rgba(139,103,214,.2)",
    washi: { gingham: "#BBA2EC", dots: "#E4D8F8" },
    card: { card: "#EFE8FB", ink: "#2E2347", soft: "#8E7AAE", bar: "#8B67D6" },
    ambience: [{ kind: "sparkles", colors: ["#FFFFFF", "#E4D8F8"], count: 12 }],
    confetti: ["#8B67D6", "#FFFFFF", "#E4C1EA", "#F6DAE7"],
  },
  night: {
    sky: ["#141A3A", "#2E2A5C", "#7E4F8E", "#F09DB4"],
    clouds: { top: "rgba(255,214,228,.8)", under: "rgba(126,79,142,.7)", streak: "rgba(255,170,190,.7)" },
    wall: "#241D38",
    wallInk: "#F8E6EE",
    dark: true,
    player: "#F5BACA",
    playerInk: "#2B1520",
    accent: "#F27DA0",
    paper: "#FFF6F8",
    ink: "#3A1F2B",
    gridLine: "rgba(242,125,160,.24)",
    washi: { gingham: "#F59AB4", dots: "#FBD0DC" },
    card: { card: "#2F2648", ink: "#F8E6EE", soft: "#C9A9C8", bar: "#F27DA0" },
    ambience: [{ kind: "sparkles", colors: ["#FFFFFF", "#F09DB4"], count: 16 }],
    confetti: ["#F27DA0", "#FFFFFF", "#F09DB4", "#7E4F8E"],
  },
};

/** What a tap on the page sticks down, in turn. */
export const TAP_STICKERS: ScrapId[] = ["heart-puffy", "star-glossy-small", "heart-gingham", "plumeria-pink", "bow-satin-mini"];

/** How many stickers a tap can add before the oldest comes off. */
export const MAX_STICKERS = 14;

export type Stuck = { id: number; x: number; y: number; scrap: ScrapId; w: number; rotate: number };

/** The `n`th sticker a tap adds: which one, how big, which way it leans, the same for the same two people. */
export function stickerAt(n: number, x: number, y: number, seed: number): Stuck {
  const a = Math.sin((seed + n * 7919) * 12.9898) * 43758.5453;
  const r = a - Math.floor(a);
  return { id: n, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, scrap: TAP_STICKERS[(n - 1) % TAP_STICKERS.length], w: 10 + Math.round(r * 5), rotate: Math.round((r - 0.5) * 50) };
}

export const addSticker = (list: Stuck[], stuck: Stuck): Stuck[] => [...list, stuck].slice(-MAX_STICKERS);

/** A song's length on the playlist, made up but the same each time: 2:14 to 4:05. */
export const trackLength = (seed: number, i: number): string => {
  const s = 134 + ((seed + i * 97) % 112);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** The looks in the order the editor offers them, each as its swatch: the sky, the card, the accent. */
export const LOOK_ORDER: LookId[] = ["sunset", "lilac", "night"];
export const SWATCHES = Object.fromEntries(LOOK_ORDER.map((id) => [id, { page: LOOKS[id].sky[1], paper: LOOKS[id].player, accent: LOOKS[id].accent }])) as Record<LookId, { page: string; paper: string; accent: string }>;
