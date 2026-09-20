import type { ScrapId } from "../_shared/collage/scraps";

export type LookId = "kraft" | "ivory" | "rose";
export type Look = {
  wall: string;
  ink: string;
  soft: string;
  paper: string;
  paperInk: string;
  parcel: string;
  scrapPaper: string;
  ticket: string;
  twine: string;
  tape: string;
  confetti: string[];
};

export const LOOKS: Record<LookId, Look> = {
  kraft: { wall: "#D8C3A0", ink: "#2E2218", soft: "rgba(46,34,24,.62)", paper: "#F7EFDE", paperInk: "#2E2218", parcel: "#C6A878", scrapPaper: "#C9AB80", ticket: "#E2B5AE", twine: "#7A5A38", tape: "#EDE1C6", confetti: ["#8E2B2B", "#F7EFDE", "#D9B25C", "#7A5A38"] },
  ivory: { wall: "#EFE8DA", ink: "#2B2521", soft: "rgba(43,37,33,.6)", paper: "#FFFBF2", paperInk: "#2B2521", parcel: "#E2D6BF", scrapPaper: "#D7C6A4", ticket: "#E6BDB6", twine: "#9A7B55", tape: "#DCCDB0", confetti: ["#8E2B2B", "#FFFFFF", "#D9B25C", "#B59A72"] },
  rose: { wall: "#E3C4C1", ink: "#3A1F22", soft: "rgba(58,31,34,.62)", paper: "#FBF1EA", paperInk: "#3A1F22", parcel: "#D3A9A5", scrapPaper: "#D9B9A0", ticket: "#F3D9CF", twine: "#7C4A4A", tape: "#F1DAD3", confetti: ["#8E2B2B", "#FBF1EA", "#D9B25C", "#B8787A"] },
};

/** What sits beside each pressed photo, in turn. */
const COMPANIONS: { scrap: ScrapId; w: number; rotate: number }[] = [
  { scrap: "peony-kraft", w: 40, rotate: 10 },
  { scrap: "roses-kraft", w: 38, rotate: -8 },
  { scrap: "plaid-heart", w: 34, rotate: 12 },
  { scrap: "paper-couple", w: 30, rotate: -10 },
  { scrap: "heart-anatomical", w: 26, rotate: 8 },
  { scrap: "teddy", w: 32, rotate: -6 },
  { scrap: "columbine", w: 32, rotate: 14 },
];

export type Pressed = { x: number; y: number; w: number; rotate: number; side: "left" | "right"; companion: { scrap: ScrapId; x: number; y: number; w: number; rotate: number } };

/** How far apart the pressed photos sit, top to top, in `--p`. */
export const PRESSED_PITCH = 92;

/**
 * Where the pressed photos go: down the page, left then right, each with something kept next to
 * it on the other side.
 */
export function pressedSpots(count: number): Pressed[] {
  return Array.from({ length: count }, (_, i) => {
    const left = i % 2 === 0;
    const y = 46 + i * PRESSED_PITCH;
    const c = COMPANIONS[i % COMPANIONS.length];
    return { x: left ? 37 : 63, y, w: 64, rotate: left ? -3 : 3, side: left ? "left" : "right", companion: { scrap: c.scrap, x: left ? 85 : 15, y: y + 22, w: c.w, rotate: left ? c.rotate : -c.rotate } };
  });
}

export const pressedHeight = (count: number): number => (count === 0 ? 0 : count * PRESSED_PITCH + 8);
