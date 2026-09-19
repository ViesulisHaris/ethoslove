import type { MemeId } from "../_shared/memes/catalogue";
import type { CouncilFields } from "./schema";

export type Seat = { id: MemeId; x: number; w: number; sink: number; rotate: number; voice: "squeak" | "chirp" | "boing" | "honk" };

/** The bench, left to right. `sink` is how far each cat sits below the top of the desk, in stage units. */
export const SEATS: Seat[] = [
  { id: "shades", x: 12.5, w: 27, sink: 5, rotate: -3, voice: "boing" },
  { id: "angry", x: 31, w: 25, sink: 7.5, rotate: 2, voice: "honk" },
  { id: "lawyer", x: 50.5, w: 37, sink: 6, rotate: 0, voice: "chirp" },
  { id: "shark", x: 71, w: 25, sink: 9, rotate: -2, voice: "chirp" },
  { id: "crying-phone", x: 88, w: 27, sink: 4.5, rotate: 3, voice: "squeak" },
];

/** Who speaks when: the chair opens, then the ends of the bench, working inwards. */
export const SPEAKING_ORDER = [2, 0, 4, 1, 3];
export const speakerFor = (finding: number): number => SPEAKING_ORDER[finding % SPEAKING_ORDER.length];

/** The sender's findings if they wrote any, otherwise the house ones. Blank rows are dropped. */
export function findingsFor(own: string[], house: string[]): string[] {
  const written = own.map((f) => f.trim()).filter(Boolean);
  return (written.length ? written : house).slice(0, 6);
}

/** EXHIBIT A, EXHIBIT B … for the photos entered as evidence. */
export const exhibitLetter = (i: number): string => String.fromCharCode(65 + (i % 26));

export type Verdict = CouncilFields["verdict"];

/** A case number that looks filed: the same for the same two people, different for everyone else. */
export function caseNumber(seed: number): string {
  const n = (seed % 9000) + 1000;
  return `${String.fromCharCode(65 + (seed % 23))}${String.fromCharCode(65 + ((seed >> 5) % 23))}-${n}`;
}
