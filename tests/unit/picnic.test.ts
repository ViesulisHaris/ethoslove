import { describe, expect, it } from "vitest";
import { createGiftSchema, GIFT_LOCALES } from "@/lib/gift/schema";
import { demoData } from "@/templates/picnic/demo-data";
import { fieldsSchema, LABEL_MAX } from "@/templates/picnic/schema";
import { ART, basketHeight, BASKET_VIEW, fillLabels, halfway, MAX_PHOTOS, overlap, pileSpot, sequence, stageFor, TAG, tagLines, THINGS, thingBox, type Box, type Stage } from "@/templates/picnic/spread";

const HOUSE = ["one", "two", "three", "four"];

describe("the lines on the tags", () => {
  it("keeps the sender's own lines, tidied, and tops a short list up to three", () => {
    expect(fillLabels(["  a  ", "", "b"], HOUSE)).toEqual(["a", "b", "one"]);
    expect(fillLabels([], HOUSE)).toEqual(["one", "two", "three"]);
    // Never the same line twice, even when a sender wrote one of the house lines.
    expect(fillLabels(["two"], HOUSE)).toEqual(["two", "one", "three"]);
    expect(fillLabels(Array.from({ length: 12 }, (_, i) => `line ${i}`), HOUSE)).toHaveLength(8);
  });

  it("asks for three to eight lines, each short enough for a tag", () => {
    expect(fieldsSchema.safeParse({ labels: ["a", "b"] }).success).toBe(false);
    expect(fieldsSchema.safeParse({ labels: ["a", "b", "c"] }).success).toBe(true);
    expect(fieldsSchema.safeParse({ labels: Array(9).fill("a") }).success).toBe(false);
    expect(fieldsSchema.safeParse({ labels: ["a", "b", "x".repeat(LABEL_MAX + 1)] }).success).toBe(false);
    expect(fieldsSchema.parse({})).toEqual({ labels: [], blanket: "pink" });
  });
});

describe("what comes out of the basket", () => {
  const labels = (n: number) => Array.from({ length: n }, (_, i) => `line ${i}`);

  it("takes out one thing per line, in order, with the photos spread between them and the note last", () => {
    const run = sequence(labels(5), 3, false);
    expect(run.map((p) => p.kind)).toEqual(["thing", "thing", "photo", "thing", "photo", "thing", "photo", "thing", "note"]);
    const things = run.filter((p) => p.kind === "thing");
    expect(things.map((p) => (p.kind === "thing" ? p.thing : null))).toEqual(THINGS.slice(0, 5));
    expect(things.map((p) => (p.kind === "thing" ? p.label : null))).toEqual(labels(5));
  });

  it("never opens with a photo, keeps every count, and caps the pile", () => {
    for (let n = 3; n <= 8; n++)
      for (let photos = 0; photos <= 9; photos++) {
        const run = sequence(labels(n), photos, false);
        expect(run[0].kind, `${n} lines, ${photos} photos`).toBe("thing");
        expect(run.filter((p) => p.kind === "thing")).toHaveLength(n);
        const shots = run.filter((p) => p.kind === "photo");
        expect(shots).toHaveLength(Math.min(photos, MAX_PHOTOS));
        expect(shots.map((p) => (p.kind === "photo" ? p.photo : -1))).toEqual(shots.map((_, i) => i));
        expect(run.at(-1)?.kind).toBe("note");
      }
  });

  it("puts a wrapped date in the basket, just before the note", () => {
    const run = sequence(labels(3), 1, true);
    expect(run.slice(-2).map((p) => p.kind)).toEqual(["parcel", "note"]);
    expect(run.filter((p) => p.kind === "parcel")).toHaveLength(1);
  });

  it("shows the editor's still frame half unpacked", () => {
    expect(halfway(sequence(labels(6), 3, true))).toBe(5);
    expect(halfway(sequence(labels(3), 0, false))).toBe(2);
    expect(halfway(sequence(labels(8), 6, false))).toBe(7);
  });
});

/** A box round the open basket: the lid standing up behind, down to its foot. */
function basketBox(stage: Stage): Box {
  const { x, top, w } = stage.basket;
  return [x - w / 2, top + (w * 10) / BASKET_VIEW.w, x + w / 2, top + (w * BASKET_VIEW.foot) / BASKET_VIEW.w];
}

function pileBox(stage: Stage): Box {
  const spots = Array.from({ length: MAX_PHOTOS }, (_, i) => pileSpot(stage.pile, i, MAX_PHOTOS, 0x5bd1e995));
  const half = stage.polaroid / 2;
  const tall = (stage.polaroid * 1.3) / 2;
  return [Math.min(...spots.map((s) => s.x)) - half, Math.min(...spots.map((s) => s.y)) - tall, Math.max(...spots.map((s) => s.x)) + half, Math.max(...spots.map((s) => s.y)) + tall];
}

const around = (x: number, y: number, w: number, h: number): Box => [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
const area = (b: Box) => (b[2] - b[0]) * (b[3] - b[1]);

describe("where things are set down", () => {
  // The longest line there can be, in the widest letters: three lines on a tag.
  const longest = "m".repeat(LABEL_MAX);

  it("wraps the longest line to three lines at most", () => {
    expect(tagLines(longest)).toBe(3);
    expect(tagLines("short")).toBe(1);
    expect(TAG.w).toBeGreaterThanOrEqual(ART.cherries.w);
  });

  for (const wide of [false, true]) {
    const stage = stageFor(wide);
    const name = wide ? "the wide stage" : "the tall stage";

    it(`${name}: every place is on the blanket`, () => {
      const b = stage.blanket;
      const blanket: Box = [b.x - b.w / 2 - 1, b.y - b.h / 2 - 1, b.x + b.w / 2 + 1, b.y + b.h / 2 + 1];
      const inside = (box: Box) => box[0] >= blanket[0] && box[1] >= blanket[1] && box[2] <= blanket[2] && box[3] <= blanket[3];
      stage.slots.forEach((slot, i) => expect(inside(thingBox(slot, THINGS[i], longest)), `slot ${i}`).toBe(true));
      expect(inside(pileBox(stage)), "the pile").toBe(true);
      expect(inside(basketBox(stage)), "the basket").toBe(true);
      expect(inside(around(stage.note.x, stage.note.y, 26, 18)), "the note").toBe(true);
      expect(inside(around(stage.parcel.x, stage.parcel.y + 2, 20, 23)), "the parcel").toBe(true);
      expect(stage.pill).toBeLessThan(stage.h - 3);
    });

    it(`${name}: nothing lands on anything else`, () => {
      const boxes: [string, Box][] = [
        ...stage.slots.map((slot, i): [string, Box] => [`${THINGS[i]} in slot ${i}`, thingBox(slot, THINGS[i], longest)]),
        ["the pile", pileBox(stage)],
        ["the basket", basketBox(stage)],
        ["the note", around(stage.note.x, stage.note.y, 26, 18)],
        ["the parcel", around(stage.parcel.x, stage.parcel.y + 2, 20, 23)],
      ];
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const [a, boxA] = boxes[i];
          const [b, boxB] = boxes[j];
          // A tag's corner may just lap the basket's rim; nothing may cover anything.
          const share = overlap(boxA, boxB) / Math.min(area(boxA), area(boxB));
          expect(share, `${a} and ${b}`).toBeLessThan(0.06);
        }
    });

    it(`${name}: a thing held up to be read leaves the basket's front in view`, () => {
      const art = Math.max(...THINGS.map((t) => ART[t].w * ART[t].ratio));
      const top = stage.spot.y - (art / 2) * stage.spot.scale;
      expect(top).toBeGreaterThan(0);
      // The bottom of the tag, three lines deep, stays above the basket's foot.
      const tag = stage.spot.y + (art / 2 - 1.5 + 3 * TAG.line + 2 * TAG.pad) * stage.spot.scale;
      expect(tag).toBeLessThan(stage.basket.top + basketHeight(stage.basket.w) * 0.8);
    });
  }
});

describe("the demo", () => {
  it("is a whole picnic in both languages, with a date in the basket", () => {
    for (const locale of GIFT_LOCALES) {
      const demo = demoData[locale];
      expect(createGiftSchema(fieldsSchema).safeParse(demo).success).toBe(true);
      expect(demo.fields.labels.length).toBeGreaterThanOrEqual(3);
      expect(demo.fields.labels.every((line) => line.length <= LABEL_MAX)).toBe(true);
      expect(demo.unwrap?.kind).toBe("date");
      // "This Saturday", not a day: a demo must never show a date in the past.
      expect(demo.unwrap?.date).toBeUndefined();
    }
  });
});
