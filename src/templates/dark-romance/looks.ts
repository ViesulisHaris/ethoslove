import { mulberry32 } from "../_shared/random";
import type { AmbienceKind } from "../_shared/Ambience";
import type { ScrapId } from "../_shared/collage/scraps";

export type LookId = "bordeaux" | "noir" | "parchment";

/** Where a flower goes on the page; each look puts its own flower there. */
export type Slot = "rose" | "big" | "spray" | "accent" | "small" | "pale";

export type Look = {
  wall: string;
  /** Words written straight on the page: the tap line, the scroll hint. */
  wallInk: string;
  red: string;
  paper: string;
  paperInk: string;
  card: { card: string; ink: string; soft: string; bar: string };
  cardDark: boolean;
  /** The black polaroid's frame: charcoal on noir, where true black would vanish into the page. */
  darkPaper: string;
  /** The diary on the first screen: its leather, the stitching and gold foil, the ribbon. */
  diary: { leather: string; shade: string; foil: string; foilDeep: string; ribbon: string };
  /** The ransom letters' tiles. */
  tiles: string[];
  /** How strongly the red lace shows over the page. */
  lace: number;
  dark: boolean;
  flowers: Record<Slot, ScrapId>;
  /** What lies round the diary: top left, top right, bottom left, bottom right. Nothing black on noir's black. */
  cover: [ScrapId, ScrapId, ScrapId, ScrapId];
  /** What a tap on the page leaves. */
  roses: ScrapId[];
  ambience: { kind: AmbienceKind; colors: string[]; count: number }[];
  confetti: string[];
};

export const LOOKS: Record<LookId, Look> = {
  bordeaux: {
    wall: "#2B0C14",
    wallInk: "#F6E9E0",
    red: "#C21E3A",
    paper: "#FBF4EA",
    paperInk: "#2A1218",
    card: { card: "#3D111C", ink: "#F6E9E0", soft: "#D7A4AE", bar: "#C21E3A" },
    cardDark: true,
    darkPaper: "#131011",
    diary: { leather: "#1A0F12", shade: "#0C0708", foil: "#D9B46A", foilDeep: "#8C6A2C", ribbon: "#9B1B30" },
    tiles: ["#0E0B0C", "#FBF4EA", "#C21E3A", "#E9D9C6", "#4A0D1B", "#0E0B0C"],
    lace: 0.55,
    dark: true,
    flowers: { rose: "rose-oxblood", big: "dahlia-wine", spray: "orchid-spray-wine", accent: "hibiscus-wine", small: "rose-black-small", pale: "carnation-picotee" },
    cover: ["rose-black-large", "moth", "candles-melted", "rose-oxblood"],
    roses: ["rose-oxblood", "rose-black-small", "rose-ember", "poppy-wine"],
    ambience: [{ kind: "petals", colors: ["#7E0C1D", "#C21E3A", "#3D111C"], count: 10 }],
    confetti: ["#C21E3A", "#FBF4EA", "#7E0C1D", "#D9B46A"],
  },
  noir: {
    wall: "#0E0B0C",
    wallInk: "#F4ECE6",
    red: "#D4213D",
    paper: "#F7F1E8",
    paperInk: "#1E1416",
    card: { card: "#1F1A1B", ink: "#F4ECE6", soft: "#B9A9A6", bar: "#D4213D" },
    cardDark: true,
    darkPaper: "#2B2426",
    diary: { leather: "#2A0E15", shade: "#14060A", foil: "#E2C17A", foilDeep: "#9A7432", ribbon: "#0E0B0C" },
    tiles: ["#F7F1E8", "#D4213D", "#0B0809", "#3A3233", "#F7F1E8", "#D4213D"],
    lace: 0.45,
    dark: true,
    flowers: { rose: "rose-black", big: "rose-black-large", spray: "orchid-wine", accent: "rose-ember", small: "rose-black-small", pale: "lily-wine" },
    cover: ["rose-ember", "butterfly-wine", "candles-melted", "rose-oxblood"],
    roses: ["rose-black-small", "rose-black", "rose-ember", "rose-oxblood"],
    ambience: [
      { kind: "petals", colors: ["#D4213D", "#0E0B0C", "#5A0F1E"], count: 9 },
      { kind: "dust", colors: ["#F4ECE6"], count: 8 },
    ],
    confetti: ["#D4213D", "#F4ECE6", "#0B0809", "#E2C17A"],
  },
  parchment: {
    wall: "#EFE4D2",
    wallInk: "#2A1218",
    red: "#8E1426",
    paper: "#FFFBF4",
    paperInk: "#2A1218",
    card: { card: "#E6D7C1", ink: "#2A1218", soft: "#7C5A4E", bar: "#8E1426" },
    cardDark: false,
    darkPaper: "#131011",
    diary: { leather: "#3B0F18", shade: "#1F070C", foil: "#D9B46A", foilDeep: "#8C6A2C", ribbon: "#1A0F12" },
    tiles: ["#2A1218", "#FFFBF4", "#8E1426", "#D9C7AC", "#FFFBF4", "#2A1218"],
    lace: 0.6,
    dark: false,
    flowers: { rose: "rose-oxblood", big: "magnolia-wine", spray: "orchid-spray-wine", accent: "tulip-parrot-wine", small: "cosmos-chocolate", pale: "carnation-picotee" },
    cover: ["rose-black-large", "moth", "candles-melted", "rose-oxblood"],
    roses: ["rose-oxblood", "poppy-wine", "rose-black-small", "cosmos-chocolate"],
    ambience: [{ kind: "petals", colors: ["#8E1426", "#C21E3A", "#E9D9C6"], count: 10 }],
    confetti: ["#8E1426", "#FFFBF4", "#C21E3A", "#2A1218"],
  },
};

/** How many roses they can leave before the oldest goes. */
export const MAX_ROSES = 14;

export type Rose = { id: number; x: number; y: number; scrap: ScrapId; rotate: number; w: number };

/** The `n`th rose they leave: which one, how big, which way it lies. The same for the same two people. */
export function roseAt(n: number, x: number, y: number, seed: number, roses: ScrapId[]): Rose {
  const random = mulberry32(seed + n * 7919);
  return { id: n, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, scrap: roses[Math.floor(random() * roses.length)], rotate: Math.round((random() - 0.5) * 120), w: 13 + Math.round(random() * 8) };
}

/** A new rose joins the page; past the limit the oldest one goes. */
export const addRose = (roses: Rose[], rose: Rose): Rose[] => [...roses, rose].slice(-MAX_ROSES);

/** The looks in the order the editor offers them, each as its swatch: the page, the paper, the red. */
export const LOOK_ORDER: LookId[] = ["bordeaux", "noir", "parchment"];
export const SWATCHES = Object.fromEntries(LOOK_ORDER.map((id) => [id, { page: LOOKS[id].wall, paper: LOOKS[id].paper, accent: LOOKS[id].red }])) as Record<LookId, { page: string; paper: string; accent: string }>;
