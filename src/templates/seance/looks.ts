import type { LookSwatch } from "../_shared/look-swatches";

export type LookId = "candle" | "moon" | "blood" | "toxic";

export type Look = {
  /** The table the board sits on: the light in the middle, the dark at the edges. */
  table: [string, string];
  /** The board: its lit edge and its shadow. */
  board: [string, string];
  /** The planchette's wood: lit side and shadow side. */
  wood: [string, string];
  /** What is printed on it. */
  ink: string;
  /** The same, when the spirit has touched it. */
  lit: string;
  /** The light that comes off a lit letter, and the candles. */
  glow: string;
  flame: [string, string];
  /** The paper the message is written on, and everything on it. */
  paper: string;
  paperInk: string;
  paperSoft: string;
  paperEdge: string;
  /** The accent the message's emphasis and signature take. */
  accent: string;
};

export const LOOKS: Record<LookId, Look> = {
  candle: {
    table: ["#3a2113", "#0b0503"],
    board: ["#5a3a1f", "#2a170a"],
    wood: ["#d8aa68", "#7d5326"],
    ink: "#d6ad66",
    lit: "#fff3cf",
    glow: "#ffae3d",
    flame: ["#ff9526", "#fff1b5"],
    paper: "#eadcbf",
    paperInk: "#2c1b0e",
    paperSoft: "#7a5a37",
    paperEdge: "rgba(90,58,31,.35)",
    accent: "#9c5a1c",
  },
  moon: {
    table: ["#1c2540", "#05070f"],
    board: ["#33425f", "#141b30"],
    wood: ["#c5d0e6", "#69789a"],
    ink: "#b4c4e6",
    lit: "#f2f8ff",
    glow: "#8fcbff",
    flame: ["#9fd4ff", "#ffffff"],
    paper: "#dfe6f2",
    paperInk: "#17203a",
    paperSoft: "#56648a",
    paperEdge: "rgba(60,80,130,.32)",
    accent: "#3f5da8",
  },
  blood: {
    table: ["#3a0f16", "#080204"],
    board: ["#561a24", "#240709"],
    wood: ["#d49a88", "#7a3338"],
    ink: "#e7c3b4",
    lit: "#fff0ea",
    glow: "#ff4a5c",
    flame: ["#ff5a4a", "#ffe0a0"],
    paper: "#ecd8cf",
    paperInk: "#2b0f12",
    paperSoft: "#7d4a4c",
    paperEdge: "rgba(120,40,50,.32)",
    accent: "#a1202f",
  },
  toxic: {
    table: ["#10321f", "#030b06"],
    board: ["#1f4a31", "#0a1d12"],
    wood: ["#b6d196", "#587a44"],
    ink: "#a9d68c",
    lit: "#f0ffe4",
    glow: "#73ff9a",
    flame: ["#7dff9b", "#f4ffd0"],
    paper: "#dde8d0",
    paperInk: "#10261a",
    paperSoft: "#4f7a5a",
    paperEdge: "rgba(50,100,70,.32)",
    accent: "#2f8a52",
  },
};

export const SWATCHES: Record<LookId, LookSwatch> = {
  candle: { page: LOOKS.candle.board[0], paper: LOOKS.candle.paper, accent: LOOKS.candle.glow },
  moon: { page: LOOKS.moon.board[0], paper: LOOKS.moon.paper, accent: LOOKS.moon.glow },
  blood: { page: LOOKS.blood.board[0], paper: LOOKS.blood.paper, accent: LOOKS.blood.glow },
  toxic: { page: LOOKS.toxic.board[0], paper: LOOKS.toxic.paper, accent: LOOKS.toxic.glow },
};
