/**
 * What comes out of the basket, in what order, and where on the blanket each thing is set down.
 * Pure: no React, no DOM, so the layout can be checked for overlaps in a unit test.
 *
 * Everything is measured in `k`, the scene's unit. A phone held upright gets the tall stage
 * (100 × 166, which always fits: `--k` is at most 0.6 of a hundredth of the height); anything wider
 * than it is tall gets the wide stage (200 × 108), so a phone on its side still has readable tags.
 */

export const THINGS = ["strawberries", "cherries", "lemonade", "tulips", "ticket", "sandwiches", "jam", "macarons"] as const;
export type ThingId = (typeof THINGS)[number];

export const MIN_LABELS = 3;
export const MAX_LABELS = THINGS.length;
/** Polaroids on the pile. More would bury the first ones completely. */
export const MAX_PHOTOS = 6;

export type Piece = { kind: "thing"; thing: ThingId; label: string; slot: number } | { kind: "photo"; photo: number } | { kind: "parcel" } | { kind: "note" };

/**
 * The sender's lines, tidied: blanks dropped, eight at most, and topped up to three from the
 * house lines, so a draft with one line (the editor's still frame) still lays out a whole picnic.
 */
export function fillLabels(own: readonly string[], house: readonly string[]): string[] {
  const mine = own.map((line) => line.trim()).filter(Boolean).slice(0, MAX_LABELS);
  const extra = house.filter((line) => !mine.includes(line)).slice(0, Math.max(0, MIN_LABELS - mine.length));
  return [...mine, ...extra];
}

/**
 * The order things come out: one thing per line, the photos spread evenly between them (never
 * first: the strawberries open every picnic), then the parcel with the date in it, then the note.
 */
export function sequence(labels: readonly string[], photos: number, parcel: boolean): Piece[] {
  const things: Piece[] = labels.slice(0, MAX_LABELS).map((label, i) => ({ kind: "thing", thing: THINGS[i], label, slot: i }));
  const shots = Math.max(0, Math.min(MAX_PHOTOS, Math.floor(photos)));
  const total = things.length + shots;
  // Photo j goes at an even step through the whole run, rounded so the last lands near the end.
  const at = new Set(Array.from({ length: shots }, (_, j) => Math.min(total - 1, Math.max(1, Math.round(((j + 1) * total) / (shots + 1))))));
  const out: Piece[] = [];
  let thing = 0;
  let photo = 0;
  for (let i = 0; i < total; i++) {
    const wantPhoto = at.has(i) && photo < shots;
    if ((wantPhoto || thing >= things.length) && photo < shots) out.push({ kind: "photo", photo: photo++ });
    else out.push(things[thing++]);
  }
  if (parcel) out.push({ kind: "parcel" });
  out.push({ kind: "note" });
  return out;
}

/** How many pieces the editor's still frame shows: half the things and photos, the basket open. */
export function halfway(pieces: readonly Piece[]): number {
  const content = pieces.filter((p) => p.kind === "thing" || p.kind === "photo").length;
  return Math.max(1, Math.ceil(content / 2));
}

/* ------------------------------------------------------------------------------------------ */
/* Where things go                                                                             */
/* ------------------------------------------------------------------------------------------ */

export type Point = { x: number; y: number };
/** A place for a thing: the middle of its drawing, and which way it lies. */
export type Slot = Point & { rotate: number };

/** Each drawing's width in k, and its height as a share of that width. */
export const ART: Record<ThingId, { w: number; ratio: number }> = {
  strawberries: { w: 26, ratio: 0.8 },
  cherries: { w: 22, ratio: 1.02 },
  lemonade: { w: 31, ratio: 0.465 },
  tulips: { w: 33, ratio: 0.58 },
  ticket: { w: 29, ratio: 1 / 1.78 },
  sandwiches: { w: 26, ratio: 0.75 },
  jam: { w: 19, ratio: 1.15 },
  macarons: { w: 27, ratio: 0.667 },
};

/** The tag every thing carries: its width, the size of the writing and the room one line takes. */
export const TAG = { w: 29, size: 3.6, line: 3.75, pad: 2.2, chars: 18 } as const;

/** How many lines a label wraps to on a tag, roughly: used for the layout checks, not the drawing. */
export const tagLines = (label: string): number => Math.max(1, Math.ceil(label.length / TAG.chars));
export const tagHeight = (label: string): number => tagLines(label) * TAG.line + TAG.pad * 2;
/** How far the tag's top sits below the middle of the drawing: it hangs off the bottom edge. */
export const tagDrop = (thing: ThingId): number => (ART[thing].w * ART[thing].ratio) / 2 - 1.5;

export type Stage = {
  /** The canvas, in k. */
  w: number;
  h: number;
  /** The blanket: its middle, size and tilt. */
  blanket: Point & { w: number; h: number; rotate: number };
  /** The basket's box: its top edge and width. The open lid fills the top of the box. */
  basket: { x: number; top: number; w: number };
  /** Where a new thing is held up big, and how big. */
  spot: Point & { scale: number };
  /** Eight places for things, in the order they fill: a zigzag, so any count looks deliberate. */
  slots: Slot[];
  pile: Point;
  /** How wide a polaroid on the pile is. */
  polaroid: number;
  note: Slot;
  parcel: Slot;
  /** The words at the top before it opens. */
  header: Point;
  /** The pill's middle. */
  pill: number;
  /** Where the butterflies wait before anything is out. */
  perches: Point[];
};

/** The basket's drawing: 240 × 250, lid open above a rim at 92–126, the body to 226. */
export const BASKET_VIEW = { w: 240, h: 250, hinge: 92, rim: 126, mouth: 108, foot: 226 } as const;
export const basketHeight = (w: number) => (w * BASKET_VIEW.h) / BASKET_VIEW.w;
/** The middle of the basket's open top, where things come out of. */
export const mouthOf = (s: Stage): Point => ({ x: s.basket.x, y: s.basket.top + (s.basket.w * BASKET_VIEW.mouth) / BASKET_VIEW.w });

const TALL: Stage = {
  w: 100,
  h: 166,
  blanket: { x: 50, y: 85, w: 95, h: 150, rotate: -1.4 },
  basket: { x: 50, top: 53, w: 36 },
  spot: { x: 50, y: 25, scale: 1.6 },
  slots: [
    { x: 18, y: 21, rotate: -8 },
    { x: 82, y: 58, rotate: 7 },
    { x: 18, y: 95, rotate: 6 },
    { x: 82, y: 132, rotate: -6 },
    { x: 81, y: 21, rotate: 6 },
    { x: 18, y: 58, rotate: -5 },
    { x: 82, y: 95, rotate: -8 },
    { x: 18, y: 132, rotate: 7 },
  ],
  pile: { x: 50, y: 30 },
  polaroid: 23,
  note: { x: 50, y: 109, rotate: -4 },
  parcel: { x: 50, y: 133, rotate: 5 },
  header: { x: 50, y: 31 },
  pill: 161.5,
  perches: [
    { x: 22, y: 52 },
    { x: 78, y: 46 },
    { x: 64, y: 118 },
  ],
};

const WIDE: Stage = {
  w: 200,
  h: 108,
  blanket: { x: 100, y: 52, w: 188, h: 98, rotate: -1 },
  basket: { x: 100, top: 37, w: 38 },
  spot: { x: 100, y: 22, scale: 1.4 },
  slots: [
    { x: 21, y: 25, rotate: -8 },
    { x: 148, y: 67, rotate: 7 },
    { x: 52, y: 67, rotate: 6 },
    { x: 177, y: 25, rotate: -6 },
    { x: 145, y: 25, rotate: 9 },
    { x: 52, y: 25, rotate: -5 },
    { x: 179, y: 67, rotate: -8 },
    { x: 21, y: 67, rotate: 7 },
  ],
  pile: { x: 100, y: 19 },
  polaroid: 20,
  note: { x: 82, y: 87, rotate: -4 },
  parcel: { x: 120, y: 82, rotate: 5 },
  header: { x: 100, y: 17 },
  pill: 104,
  perches: [
    { x: 64, y: 46 },
    { x: 136, y: 42 },
    { x: 120, y: 80 },
  ],
};

export const stageFor = (wide: boolean): Stage => (wide ? WIDE : TALL);

/** Where polaroid `i` of `n` lies on the pile: fanned a little, the newest on top. */
export function pileSpot(pile: Point, i: number, n: number, seed: number): Slot {
  const spread = n > 1 ? i / (n - 1) - 0.5 : 0;
  const wobble = (((seed >> (i * 3)) & 7) - 3.5) * 0.9;
  return { x: pile.x + spread * 10 + wobble * 0.3, y: pile.y + (i % 2 ? -1.2 : 1.2) + spread * 2, rotate: spread * 22 + wobble };
}

/**
 * A rough box round each placed thing and its tag, in k: what the layout checks look at.
 * `[left, top, right, bottom]`.
 */
export type Box = [number, number, number, number];

export function thingBox(slot: Slot, thing: ThingId, label: string): Box {
  const art = ART[thing];
  const h = art.w * art.ratio;
  const top = slot.y - h / 2;
  const bottom = slot.y + tagDrop(thing) + tagHeight(label);
  const half = Math.max(art.w, TAG.w) / 2;
  return [slot.x - half, top, slot.x + half, bottom];
}

export const overlap = (a: Box, b: Box): number => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
