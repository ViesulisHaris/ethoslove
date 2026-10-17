/**
 * The four booths. The room around them stays red velvet and cream whichever one is chosen; the
 * booth's lacquer, its sign, its metal and the tape the strip is stuck up with change.
 */
export type BoothId = "cherry" | "blush" | "noir" | "mint";

export type Booth = {
  /** Lacquered front, lit from the left, and the side panel turning away into shadow. */
  body: { light: string; mid: string; deep: string; side: string; sideDeep: string };
  /** Pinstripes, mouldings and the enamel plates. */
  trim: string;
  trimDeep: string;
  /** Chrome, or brass on the black booth. */
  metal: { hi: string; mid: string; lo: string };
  /** The velvet: a pleat's lit ridge, its middle and its fold, and the fringe along the hem. */
  curtain: { light: string; mid: string; deep: string; fringe: string };
  /** The marquee: its box, its face, the lettering and the bulbs. */
  sign: { frame: string; frameDeep: string; face: string; ink: string; glow: string };
  /** The camera panel inside, and the words printed on it. */
  panel: string;
  panelInk: string;
  /** The ink the strip's foot is stamped with, and the washi tape on the wall. */
  stamp: string;
  tape: string;
  confetti: string[];
};

const CHROME = { hi: "#FBFBFA", mid: "#B9BCC0", lo: "#6E7277" };
const RED_VELVET = { light: "#B21E33", mid: "#86101F", deep: "#4C0610", fringe: "#E2BD6A" };

export const BOOTHS: Record<BoothId, Booth> = {
  cherry: {
    body: { light: "#DA2A40", mid: "#B8142C", deep: "#8C0E20", side: "#7C0B1B", sideDeep: "#4E0610" },
    trim: "#F6EAD6",
    trimDeep: "#D9C7A8",
    metal: CHROME,
    curtain: { light: "#8E1426", mid: "#650A18", deep: "#34040B", fringe: "#E2BD6A" },
    sign: { frame: "#B8142C", frameDeep: "#7C0B1B", face: "#FFF4DE", ink: "#B8142C", glow: "#FFE2A0" },
    panel: "#8C0E20",
    panelInk: "#F6EAD6",
    stamp: "#B8142C",
    tape: "#E0485C",
    confetti: ["#B8142C", "#FFFFFF", "#F4B9C2", "#E2BD6A"],
  },
  blush: {
    body: { light: "#F9D2DB", mid: "#F1B6C4", deep: "#DB93A6", side: "#C98096", sideDeep: "#9E5A70" },
    trim: "#FFF7EF",
    trimDeep: "#EAD5C8",
    metal: CHROME,
    curtain: { light: "#C23A62", mid: "#931F46", deep: "#560C26", fringe: "#F3D9A4" },
    sign: { frame: "#E9899F", frameDeep: "#B8627A", face: "#FFF7EF", ink: "#C2185B", glow: "#FFE4EC" },
    panel: "#D88DA1",
    panelInk: "#FFF7EF",
    stamp: "#C2185B",
    tape: "#F2A7BA",
    confetti: ["#E9899F", "#FFFFFF", "#FFD6E0", "#C2185B"],
  },
  noir: {
    body: { light: "#3D3537", mid: "#241E20", deep: "#151112", side: "#100C0D", sideDeep: "#060405" },
    trim: "#D2AE66",
    trimDeep: "#9C7A38",
    metal: { hi: "#FBEBB8", mid: "#CDA75C", lo: "#7E5F24" },
    curtain: RED_VELVET,
    sign: { frame: "#1E1819", frameDeep: "#0A0708", face: "#221B1C", ink: "#F7E6C4", glow: "#FFD98A" },
    panel: "#1E1819",
    panelInk: "#D2AE66",
    stamp: "#1E1819",
    tape: "#2A2224",
    confetti: ["#D2AE66", "#FFFFFF", "#B21E33", "#2A2224"],
  },
  mint: {
    body: { light: "#C4EBDC", mid: "#A3DBC6", deep: "#80C4AB", side: "#6EAE96", sideDeep: "#4A8670" },
    trim: "#FFF9EE",
    trimDeep: "#E3D8C3",
    metal: CHROME,
    curtain: RED_VELVET,
    sign: { frame: "#80C4AB", frameDeep: "#57967E", face: "#FFF9EE", ink: "#C21E3A", glow: "#FFEAB2" },
    panel: "#7FC3AA",
    panelInk: "#FFF9EE",
    stamp: "#C21E3A",
    tape: "#8FD3BA",
    confetti: ["#80C4AB", "#FFFFFF", "#C21E3A", "#FFEAB2"],
  },
};

/** The love-letter wall the strip lands on: cream paper, red ink, blue rules. */
export const WALL = {
  paper: "#F2E7D6",
  ink: "#3A1A1E",
  red: "#B3122A",
  sheet: "#FCF8EF",
  rule: "rgba(88,118,168,.30)",
  margin: "rgba(196,40,62,.42)",
  script: "rgba(160,24,44,.2)",
  pink: "#F4D9D6",
};
