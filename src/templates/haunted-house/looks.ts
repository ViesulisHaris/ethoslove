import type { LookSwatch } from "../_shared/look-swatches";

export type LookId = "storm" | "blood" | "swamp" | "violet";

export type Look = {
  /** The sky, top to bottom. */
  sky: [string, string, string];
  /** The moon behind the cloud: its lit face and its edge. */
  moon: [string, string];
  /** The light in a window: the middle, and the edge. */
  window: [string, string];
  /** The flash of a strike, and the rain. */
  bolt: string;
  rain: string;
  /** The walls and roofs. */
  wall: [string, string];
  roof: string;
  /** Words written on the night. */
  ink: string;
  /** The paper the letter is on. */
  paper: string;
  paperInk: string;
  paperSoft: string;
  paperEdge: string;
  accent: string;
};

export const LOOKS: Record<LookId, Look> = {
  storm: {
    sky: ["#060a1c", "#16244a", "#34477f"],
    moon: ["#e8f0ff", "#9db3d8"],
    window: ["#ffe08a", "#ff9f3a"],
    bolt: "#dbe8ff",
    rain: "rgba(190,208,255,.24)",
    wall: ["#0a0916", "#05040c"],
    roof: "#04030a",
    ink: "#e9eeff",
    paper: "#e9dfc9",
    paperInk: "#1a2038",
    paperSoft: "#66709a",
    paperEdge: "rgba(70,80,130,.34)",
    accent: "#3d56b8",
  },
  blood: {
    sky: ["#12040a", "#34101c", "#6e2034"],
    moon: ["#ff7b6b", "#a8182a"],
    window: ["#ffd27a", "#ff7a3a"],
    bolt: "#ffd9d0",
    rain: "rgba(255,170,170,.2)",
    wall: ["#12060b", "#07030a"],
    roof: "#050105",
    ink: "#ffe8e4",
    paper: "#ecdcd0",
    paperInk: "#33121a",
    paperSoft: "#8a5058",
    paperEdge: "rgba(130,50,60,.34)",
    accent: "#b0213a",
  },
  swamp: {
    sky: ["#04100c", "#0e3226", "#226352"],
    moon: ["#e8ffd2", "#97c67e"],
    window: ["#eaff9a", "#8bdd48"],
    bolt: "#eaffdc",
    rain: "rgba(190,255,200,.2)",
    wall: ["#08120d", "#040a07"],
    roof: "#030705",
    ink: "#e6ffec",
    paper: "#dde5cd",
    paperInk: "#112a1c",
    paperSoft: "#52785a",
    paperEdge: "rgba(50,100,70,.34)",
    accent: "#2f8a52",
  },
  violet: {
    sky: ["#0c061c", "#24164f", "#4e3198"],
    moon: ["#f4e8ff", "#b39be0"],
    window: ["#ffd2f4", "#c46aff"],
    bolt: "#f0e2ff",
    rain: "rgba(215,190,255,.24)",
    wall: ["#0e0820", "#06030f"],
    roof: "#04020a",
    ink: "#f3ebff",
    paper: "#e6dcee",
    paperInk: "#241440",
    paperSoft: "#7a5ea0",
    paperEdge: "rgba(110,70,170,.34)",
    accent: "#7a3fc4",
  },
};

export const SWATCHES: Record<LookId, LookSwatch> = {
  storm: { page: LOOKS.storm.sky[1], paper: LOOKS.storm.paper, accent: LOOKS.storm.window[1] },
  blood: { page: LOOKS.blood.sky[1], paper: LOOKS.blood.paper, accent: LOOKS.blood.moon[0] },
  swamp: { page: LOOKS.swamp.sky[1], paper: LOOKS.swamp.paper, accent: LOOKS.swamp.window[1] },
  violet: { page: LOOKS.violet.sky[1], paper: LOOKS.violet.paper, accent: LOOKS.violet.window[1] },
};
