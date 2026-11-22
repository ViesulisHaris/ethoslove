import { hashString, mulberry32 } from "../_shared/random";

/**
 * What is behind each of the house's twenty-four doors. A note from each person who signed the card,
 * spread over the doors, and a sweet behind every door nobody wrote for. Worked out from the gift's
 * two names alone, so the server's HTML, the browser and a replay all open the same house.
 */

export const DOOR_COUNT = 24;

export const SWEETS = ["gingerbread", "starcookie", "cane", "bauble", "bell", "orange"] as const;
export type Sweet = (typeof SWEETS)[number];

export type Door =
  /** `index` is the note's place in `data.contributions`. */
  | { number: number; kind: "note"; index: number }
  | { number: number; kind: "sweet"; sweet: Sweet };

function shuffled<T>(items: readonly T[], rnd: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The seed every scattered thing in one gift is drawn from. */
export const seedOf = (recipientName: string, senderName: string) => hashString(`${recipientName}|${senderName}|advent-calendar`);

/**
 * The doors by number, 1 to 24. `notes` is how many people signed: each gets a door (the first
 * twenty-four, should a card ever hold more), picked by one shuffle of the numbers, so a note added
 * later opens one more door to a note and shuts none. Whoever is first in the list has the
 * lowest of the chosen numbers, and so on up: the chosen numbers are handed out afresh, in order,
 * each time. So a note added later does move people. Everyone whose door has a higher number than
 * the new one moves up to the next chosen door, and the sweets after it change places. Whoever gets
 * the card never sees that (it is sent with its notes in it); the sender does, in the editor's still
 * frame, as notes are approved. The sweets go round in a shuffled order of their own, so no kind
 * runs out before the others have had a turn.
 */
export function doorsFor(seed: number, notes: number): Door[] {
  const count = Math.max(0, Math.min(DOOR_COUNT, Math.floor(notes)));
  const order = shuffled(
    Array.from({ length: DOOR_COUNT }, (_, i) => i + 1),
    mulberry32(seed),
  );
  const chosen = order.slice(0, count).sort((a, b) => a - b);
  const sweetRnd = mulberry32(seed ^ 0x5eed);
  let bag: Sweet[] = [];
  let last: Sweet | null = null;
  return Array.from({ length: DOOR_COUNT }, (_, i): Door => {
    const number = i + 1;
    const index = chosen.indexOf(number);
    if (index >= 0) return { number, kind: "note", index };
    if (!bag.length) {
      bag = shuffled(SWEETS, sweetRnd);
      // never the same sweet behind two doors in a row of numbers
      if (bag[bag.length - 1] === last) bag.unshift(bag.pop()!);
    }
    last = bag.pop()!;
    return { number, kind: "sweet", sweet: last };
  });
}

/**
 * The doors the editor's still frame shows open: one with a note still sealed, one whose note has
 * been read, and one with a sweet, where the card has them. With no notes yet, two sweets.
 */
export function previewDoors(doors: readonly Door[]): { open: number[]; read: number[] } {
  const notes = doors.filter((d) => d.kind === "note").map((d) => d.number);
  const sweets = doors.filter((d) => d.kind === "sweet").map((d) => d.number);
  // spread over the house: a door from the first third, the middle and the last third of the numbers
  const pick = (from: number[], share: number) => from[Math.min(from.length - 1, Math.floor(from.length * share))];
  const open: number[] = [];
  const read: number[] = [];
  if (notes.length) open.push(pick(notes, 0.15));
  if (notes.length > 1) {
    const second = pick(notes, 0.7);
    if (!open.includes(second)) {
      open.push(second);
      read.push(second);
    }
  }
  for (const share of [0.5, 0.9]) {
    if (open.length >= 3 || !sweets.length) break;
    const sweet = pick(sweets, share);
    if (!open.includes(sweet)) open.push(sweet);
  }
  return { open, read };
}

/** How far through the gift someone is, 0 to 90: the last tenth is the sender's letter, read to its end. */
export function progressOf(opened: number, read: number, notes: number): number {
  const doors = Math.min(1, opened / DOOR_COUNT);
  const reading = notes ? Math.min(1, read / notes) : 1;
  return Math.round(5 + 45 * doors + 40 * reading);
}
