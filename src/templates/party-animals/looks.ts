import type { AmbienceKind } from "../_shared/Ambience";

export type LookId = "linen" | "bubblegum" | "lime" | "midnight";

export type Tone = { light: string; mid: string; deep: string };
export type Hat = { cone: string; print: string; pompom: string; kind: "dots" | "stripes" | "zigzag" };

/**
 * The party's colours, one set per page. The sender's accent still comes in through the CSS
 * variables for everything they touch; these paint the world round it.
 */
export type Look = {
  /** The wall, and a repeating print over it: the weave, the checks, the dots, the stars. */
  wall: string;
  pattern: string;
  patternSize: string;
  ink: string;
  soft: string;
  /** Polaroids, cards and the letter. */
  paper: string;
  paperInk: string;
  /** The cut-out letters. */
  tiles: string[];
  confetti: string[];
  /** Crepe paper, three rolls. */
  streamers: [string, string, string];
  /** The pleated paper fans behind the first photo: a big one and a small one in another colour. */
  fan: { light: string; dark: string; middle: string };
  fan2: { light: string; dark: string; middle: string };
  hats: Hat[];
  balloons: Tone[];
  foil: { light: string; mid: string; deep: string; edge: string };
  cake: { base: string; baseDeep: string; top: string; topDeep: string; icing: string; drip: string; candle: string; stripe: string; plate: string };
  envelope: { body: string; flap: string; lining: string; liningPrint: string; ink: string };
  /** The song card. */
  card: { card: string; ink: string; soft: string; bar: string };
  tape: string;
  gift: { box: string; ribbon: string };
  ambience: { kind: AmbienceKind; colors: string[]; count: number }[];
  dark: boolean;
};

const GOLD = { light: "#FFEBC6", mid: "#E8B866", deep: "#B37A28", edge: "#7A4E12" };

export const LOOKS: Record<LookId, Look> = {
  linen: {
    wall: "#EAE2D1",
    pattern: "repeating-linear-gradient(0deg, rgba(120,98,70,.09) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(120,98,70,.08) 0 1px, transparent 1px 3px)",
    patternSize: "auto",
    ink: "#2E2622",
    soft: "rgba(46,38,34,.62)",
    paper: "#FFFDF8",
    paperInk: "#2E2622",
    tiles: ["#F0588C", "#FFC93C", "#57B8A0", "#6C8CF5", "#F58A4B", "#FFFDF8"],
    confetti: ["#F0588C", "#FFC93C", "#57B8A0", "#6C8CF5", "#F58A4B", "#FFFFFF"],
    streamers: ["#F59DB9", "#FFD363", "#86D0BE"],
    fan: { light: "#FFD3DF", dark: "#F6A9C0", middle: "#FFC93C" },
    fan2: { light: "#FFF1BF", dark: "#FFD865", middle: "#57B8A0" },
    hats: [
      { cone: "#F0588C", print: "#FFFFFF", pompom: "#FFD363", kind: "dots" },
      { cone: "#57B8A0", print: "#FFFDF8", pompom: "#F59DB9", kind: "stripes" },
      { cone: "#6C8CF5", print: "#FFC93C", pompom: "#FFFFFF", kind: "zigzag" },
    ],
    balloons: [
      { light: "#FFD9E4", mid: "#F27FA4", deep: "#BF3F69" },
      { light: "#FFF2C6", mid: "#FFC93C", deep: "#C38B14" },
      { light: "#D9F2EA", mid: "#6EC4AE", deep: "#2C846D" },
      { light: "#DFE7FF", mid: "#8AA4F4", deep: "#465FBE" },
    ],
    foil: GOLD,
    cake: { base: "#FFE1EA", baseDeep: "#F1B3C6", top: "#FFF6E4", topDeep: "#EDD5AE", icing: "#FFFFFF", drip: "#F27FA4", candle: "#57B8A0", stripe: "#FFFFFF", plate: "#FFFDF8" },
    envelope: { body: "#FFF8EC", flap: "#F6E8D2", lining: "#F27FA4", liningPrint: "#FFFFFF", ink: "#2E2622" },
    card: { card: "#FFFDF8", ink: "#2E2622", soft: "rgba(46,38,34,.55)", bar: "#F0588C" },
    tape: "#F59DB9",
    gift: { box: "#6C8CF5", ribbon: "#FFC93C" },
    ambience: [{ kind: "sparkles", colors: ["#FFFFFF", "#FFE9B8"], count: 10 }],
    dark: false,
  },
  bubblegum: {
    wall: "#FBD3E2",
    pattern: "linear-gradient(90deg, rgba(255,255,255,.5) 50%, transparent 50%), linear-gradient(0deg, rgba(255,255,255,.5) 50%, transparent 50%)",
    patternSize: "calc(9*var(--p)) calc(9*var(--p))",
    ink: "#4A2030",
    soft: "rgba(74,32,48,.62)",
    paper: "#FFFFFF",
    paperInk: "#3E1F2B",
    tiles: ["#E8407A", "#FFFFFF", "#FFB3CC", "#B48CF2", "#FFD166", "#7FD6C2"],
    confetti: ["#E8407A", "#FFFFFF", "#B48CF2", "#FFD166", "#7FD6C2"],
    streamers: ["#E8407A", "#B48CF2", "#FFFFFF"],
    fan: { light: "#FFFFFF", dark: "#FFE0EA", middle: "#E8407A" },
    fan2: { light: "#F1E7FF", dark: "#D9C5FB", middle: "#FFD166" },
    hats: [
      { cone: "#E8407A", print: "#FFFFFF", pompom: "#FFFFFF", kind: "dots" },
      { cone: "#B48CF2", print: "#FFD166", pompom: "#FFD166", kind: "stripes" },
      { cone: "#FFD166", print: "#E8407A", pompom: "#E8407A", kind: "zigzag" },
    ],
    balloons: [
      { light: "#FFD2E1", mid: "#EE5E90", deep: "#B42A5C" },
      { light: "#EFE4FF", mid: "#B48CF2", deep: "#7A55C0" },
      { light: "#FFFFFF", mid: "#F7EEF2", deep: "#CDB6C0" },
      { light: "#FFF1CC", mid: "#FFD166", deep: "#C99A26" },
    ],
    foil: { light: "#FFE6E2", mid: "#E9A69E", deep: "#B1655C", edge: "#763731" },
    cake: { base: "#FFFFFF", baseDeep: "#F2D9E2", top: "#FFE3EE", topDeep: "#F4B9CE", icing: "#FFFFFF", drip: "#E8407A", candle: "#B48CF2", stripe: "#FFFFFF", plate: "#FFFFFF" },
    envelope: { body: "#FFFFFF", flap: "#FFEEF4", lining: "#E8407A", liningPrint: "#FFFFFF", ink: "#4A2030" },
    card: { card: "#FFFFFF", ink: "#3E1F2B", soft: "rgba(62,31,43,.55)", bar: "#E8407A" },
    tape: "#B48CF2",
    gift: { box: "#B48CF2", ribbon: "#FFFFFF" },
    ambience: [{ kind: "hearts", colors: ["#FFFFFF", "#F36A9B"], count: 7 }],
    dark: false,
  },
  lime: {
    wall: "#DDE9A6",
    pattern: "radial-gradient(circle at 50% 50%, rgba(255,255,255,.72) 0 16%, transparent 17%)",
    patternSize: "calc(8*var(--p)) calc(8*var(--p))",
    ink: "#2F3B1E",
    soft: "rgba(47,59,30,.62)",
    paper: "#FFFEF6",
    paperInk: "#2B3320",
    tiles: ["#2F8F5B", "#FF7A59", "#FFFEF6", "#FFD23F", "#EE6FA9", "#4F7DF0"],
    confetti: ["#FF7A59", "#FFD23F", "#EE6FA9", "#4F7DF0", "#2F8F5B", "#FFFFFF"],
    streamers: ["#FF7A59", "#EE6FA9", "#4F7DF0"],
    fan: { light: "#FFB9A6", dark: "#FF8C6E", middle: "#FFD23F" },
    fan2: { light: "#FFD3E6", dark: "#F6A2C7", middle: "#4F7DF0" },
    hats: [
      { cone: "#FF7A59", print: "#FFFEF6", pompom: "#FFD23F", kind: "stripes" },
      { cone: "#4F7DF0", print: "#FFD23F", pompom: "#EE6FA9", kind: "dots" },
      { cone: "#EE6FA9", print: "#FFFEF6", pompom: "#4F7DF0", kind: "zigzag" },
    ],
    balloons: [
      { light: "#FFD7CB", mid: "#FF7A59", deep: "#C4462A" },
      { light: "#FFDCEC", mid: "#EE6FA9", deep: "#B23A73" },
      { light: "#DCE6FF", mid: "#6E93F2", deep: "#3355B8" },
      { light: "#FFF3C4", mid: "#FFD23F", deep: "#C29B12" },
    ],
    foil: GOLD,
    cake: { base: "#FFF3D6", baseDeep: "#EDD3A0", top: "#FFE2EE", topDeep: "#F2B7CF", icing: "#FFFFFF", drip: "#FF7A59", candle: "#4F7DF0", stripe: "#FFFFFF", plate: "#FFFEF6" },
    envelope: { body: "#FFFEF4", flap: "#F1F4D8", lining: "#FF7A59", liningPrint: "#FFFEF6", ink: "#2F3B1E" },
    card: { card: "#FFFEF6", ink: "#2B3320", soft: "rgba(43,51,32,.55)", bar: "#FF7A59" },
    tape: "#EE6FA9",
    gift: { box: "#EE6FA9", ribbon: "#FFD23F" },
    ambience: [{ kind: "sparkles", colors: ["#FFFFFF", "#FFF3A8"], count: 12 }],
    dark: false,
  },
  midnight: {
    wall: "#1E2040",
    pattern: "radial-gradient(circle at 20% 30%, rgba(255,255,255,.5) 0 1.5%, transparent 2%), radial-gradient(circle at 70% 60%, rgba(255,233,184,.5) 0 1.2%, transparent 1.8%), radial-gradient(circle at 45% 85%, rgba(255,255,255,.35) 0 1%, transparent 1.6%)",
    patternSize: "calc(26*var(--p)) calc(26*var(--p))",
    ink: "#FFF6E8",
    soft: "rgba(255,246,232,.7)",
    paper: "#FFFDF8",
    paperInk: "#2A2340",
    tiles: ["#FF6FA5", "#FFD166", "#7FE0C3", "#8FA8FF", "#FFFDF8", "#C79BFF"],
    confetti: ["#FF6FA5", "#FFD166", "#7FE0C3", "#8FA8FF", "#FFFFFF", "#C79BFF"],
    streamers: ["#FFD166", "#FF6FA5", "#8FA8FF"],
    fan: { light: "#FFE39B", dark: "#F0C155", middle: "#FF6FA5" },
    fan2: { light: "#FFC9DD", dark: "#FF93BB", middle: "#FFD166" },
    hats: [
      { cone: "#FF6FA5", print: "#FFD166", pompom: "#FFFFFF", kind: "dots" },
      { cone: "#FFD166", print: "#1E2040", pompom: "#FF6FA5", kind: "stripes" },
      { cone: "#7FE0C3", print: "#FFFFFF", pompom: "#C79BFF", kind: "zigzag" },
    ],
    balloons: [
      { light: "#FFD1E3", mid: "#FF6FA5", deep: "#C23A70" },
      { light: "#FFF0C2", mid: "#FFD166", deep: "#C9971F" },
      { light: "#D6F7EC", mid: "#7FE0C3", deep: "#3A9C80" },
      { light: "#E3E9FF", mid: "#8FA8FF", deep: "#4C62C4" },
    ],
    foil: GOLD,
    cake: { base: "#FFFFFF", baseDeep: "#E1DCEF", top: "#FFE4EF", topDeep: "#F1B3CB", icing: "#FFFFFF", drip: "#FFD166", candle: "#FF6FA5", stripe: "#FFFFFF", plate: "#FFFDF8" },
    envelope: { body: "#2C305F", flap: "#363B71", lining: "#FFD166", liningPrint: "#2C305F", ink: "#FFF6E8" },
    card: { card: "#2C305F", ink: "#FFF6E8", soft: "rgba(255,246,232,.62)", bar: "#FFD166" },
    tape: "#FFD166",
    gift: { box: "#FF6FA5", ribbon: "#FFD166" },
    ambience: [{ kind: "sparkles", colors: ["#FFFFFF", "#FFE9B8", "#BFD7FF"], count: 22 }],
    dark: true,
  },
};
