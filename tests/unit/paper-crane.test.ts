import { describe, expect, it } from "vitest";
import { describeObjectSchema } from "@/lib/editor/zod-describe";
import { template } from "@/templates/paper-crane";
import {
  AUTO_SECONDS,
  BREATH_FLOOR,
  BREATH_FULL,
  BREATH_MIN_RUN,
  FOLD_SECONDS,
  LIFT_FADE,
  LIFT_HOLD,
  LIFT_MIN,
  LIFT_SECONDS,
  SPRING_BACK,
  STILL,
  type Breath,
  breathPush,
  foldStep,
  liftStep,
} from "@/templates/paper-crane/fold";
import {
  FOLDS,
  SHEETS,
  SHEET_SHADOW,
  SHEET_SHIFT,
  STEPS,
  creaseMid,
  foldPlan,
  lerpPts,
  polyPath,
  shadowX,
  sheetPoints,
  sheetShadow,
  sheetShift,
  usableLines,
} from "@/templates/paper-crane/origami";
import {
  MAX_LINES,
  MIN_LINES,
  PAPER_IDS,
  fieldsSchema,
  readFields,
} from "@/templates/paper-crane/schema";
import { PAPERS } from "@/templates/paper-crane/art";
import { TEMPLATE_MANIFESTS } from "@/templates/registry";

/** One frame at 60fps, the rate every loop in the template runs at. */
const FRAME = 1 / 60;

/** Presses a crease for `ms`, then lets go for `after` ms, and says where the fold got to. */
function press(ms: number, after = 0) {
  let t = 0;
  for (let elapsed = 0; elapsed < ms; elapsed += FRAME * 1000) t = foldStep(t, true, FRAME);
  for (let elapsed = 0; elapsed < after; elapsed += FRAME * 1000) t = foldStep(t, false, FRAME);
  return t;
}

/** Runs the microphone rule over a stream of loudness readings and returns where the crane got to. */
function listen(levels: (frame: number) => number, seconds: number, from: Breath = STILL): Breath {
  let breath = from;
  const frames = Math.round(seconds / FRAME);
  for (let i = 0; i < frames; i++) breath = liftStep(breath, breathPush(levels(i)), FRAME);
  return breath;
}

/** A full breath, for `seconds`. */
const blow = (seconds: number, from: Breath = STILL) => listen(() => 1, seconds, from);
/** Silence, for `seconds`. */
const hush = (seconds: number, from: Breath) => listen(() => 0, seconds, from);

describe("pressing a crease", () => {
  it("takes a steady press, not a tap", () => {
    expect(press(120)).toBeLessThan(0.2);
    expect(press(120, 200)).toBe(0);
    expect(press(FOLD_SECONDS * 1000 + 100)).toBe(1);
  });

  it("springs back faster than it folded, so letting go early costs the fold", () => {
    const half = press(FOLD_SECONDS * 500);
    expect(half).toBeGreaterThan(0.4);
    expect(half).toBeLessThan(0.6);
    // Back to nothing in well under the time it took to get there.
    expect(press(FOLD_SECONDS * 500, (FOLD_SECONDS * 500) / SPRING_BACK + 60)).toBe(0);
  });

  it("never goes past a full fold, or behind a flat sheet", () => {
    expect(foldStep(1, true, 1)).toBe(1);
    expect(foldStep(0, false, 1)).toBe(0);
  });

  it("ignores a frame the phone slept through, so waking up never folds the paper", () => {
    expect(foldStep(0, true, 30)).toBeLessThanOrEqual(0.05 / FOLD_SECONDS);
    expect(foldStep(0.5, true, Number.NaN)).toBe(0.5);
    expect(foldStep(Number.NaN, true, FRAME)).toBeGreaterThan(0);
  });

  it("folds on its own, once, for whoever taps instead of holding", () => {
    let t = 0;
    for (let elapsed = 0; elapsed < AUTO_SECONDS * 1000 + 50; elapsed += FRAME * 1000) {
      t = Math.min(1, t + FRAME / AUTO_SECONDS);
    }
    expect(t).toBe(1);
    expect(AUTO_SECONDS).toBeLessThan(FOLD_SECONDS);
  });
});

describe("the breath that lifts the crane", () => {
  it("hears a room as silence and a mouth as breath", () => {
    expect(breathPush(0)).toBe(0);
    expect(breathPush(BREATH_FLOOR)).toBe(0);
    expect(breathPush(BREATH_FLOOR - 0.01)).toBe(0);
    expect(breathPush((BREATH_FLOOR + BREATH_FULL) / 2)).toBeCloseTo(0.5, 5);
    expect(breathPush(BREATH_FULL)).toBe(1);
    expect(breathPush(4)).toBe(1);
    expect(breathPush(Number.NaN)).toBe(0);
  });

  it("lifts on a breath held about as long as a breath lasts", () => {
    expect(listen(() => 0.9, LIFT_SECONDS * 0.6).lift).toBeLessThan(1);
    expect(listen(() => 0.9, LIFT_SECONDS + 0.2).lift).toBe(1);
  });

  it("counts a breath from the moment it started, not from the moment it was believed", () => {
    // The crane waits to be sure a sound is a breath, but it does not charge anyone for the wait.
    expect(blow(BREATH_MIN_RUN + 0.2).lift).toBeCloseTo((BREATH_MIN_RUN + 0.2) / LIFT_SECONDS, 1);
  });

  it("never moves on a sound too short to be a breath, however loud it was", () => {
    // A shout, a door, a laugh: full volume, over before a breath would have got going.
    expect(blow(BREATH_MIN_RUN - 0.06).lift).toBe(0);
    expect(listen((i) => (i < 6 ? 1 : 0), 3).lift).toBe(0);
  });

  it("never lifts on a noisy room: clatter that comes and goes drains away", () => {
    // A café: bursts over the floor every few frames, quiet in between.
    expect(listen((i) => (i % 9 < 3 ? 0.55 : 0.08), 12).lift).toBe(0);
    // One loud bang.
    expect(listen((i) => (i === 40 ? 1 : 0.05), 4).lift).toBe(0);
    // Talking near the phone, loud but never as loud as a blow.
    expect(listen(() => BREATH_FLOOR - 0.02, 20).lift).toBe(0);
  });

  it("never lifts in a moving car: a room that sits just over the floor still loses height", () => {
    // A rumble a hair above the floor, for a minute. It must never add up to a take-off.
    const car = listen((i) => 0.3 + 0.06 * Math.abs(Math.sin(i / 37)) + 0.02 * ((i * 7) % 11) * 0.05, 60);
    expect(car.lift).toBe(0);
    // Anything below the smallest breath the crane accepts drains, however long it goes on.
    const justUnder = BREATH_FLOOR + (BREATH_FULL - BREATH_FLOOR) * (LIFT_MIN - 0.02);
    expect(breathPush(justUnder)).toBeLessThan(LIFT_MIN);
    expect(listen(() => justUnder, 40).lift).toBe(0);
    // And a breath that only just counts still gets there, so the rule is a floor, not a wall.
    const justOver = BREATH_FLOOR + (BREATH_FULL - BREATH_FLOOR) * (LIFT_MIN + 0.02);
    expect(listen(() => justOver, 8).lift).toBe(1);
  });

  it("lets you take the next breath without losing the last one", () => {
    // The whole point: blow, stop to breathe in, blow again — and get there. Nobody should have
    // to hold one breath for the entire flight.
    const first = blow(0.6);
    expect(first.lift).toBeGreaterThan(0.5);
    // A pause the length of an inhale costs nothing at all.
    expect(hush(LIFT_HOLD - 0.05, first).lift).toBeCloseTo(first.lift, 5);
    // Four breaths with a pause to inhale after each still gets the crane off the table.
    let breath = STILL;
    for (let i = 0; i < 4; i++) {
      breath = blow(0.45, breath);
      if (breath.lift >= 1) break;
      breath = hush(0.5, breath);
    }
    expect(breath.lift).toBe(1);
  });

  it("settles back slowly once the breathing stops for good", () => {
    const up = blow(LIFT_SECONDS);
    expect(up.lift).toBe(1);
    // Half a second later it has barely moved — that pause was paid for.
    expect(hush(0.5, up).lift).toBe(1);
    // A second of silence costs a little; it is still most of the way up.
    expect(hush(1, up).lift).toBeGreaterThan(0.8);
    // It takes the better part of four seconds to reach the table, and it does reach it.
    expect(hush(2, up).lift).toBeGreaterThan(0.4);
    expect(hush(LIFT_HOLD + LIFT_FADE + 0.2, up).lift).toBe(0);
    // Falling is far gentler than rising, which is what stops it feeling like a lung test.
    expect(LIFT_FADE).toBeGreaterThan(LIFT_SECONDS * 3);
  });

  it("stays between the table and the air whatever the microphone reports", () => {
    expect(liftStep({ lift: 1, run: 9, held: 0, pause: 9 }, 1, 5).lift).toBe(1);
    expect(liftStep(STILL, 0, 5).lift).toBe(0);
    expect(liftStep(STILL, Number.NaN, FRAME).lift).toBe(0);
    expect(liftStep({ lift: Number.NaN, run: Number.NaN, held: Number.NaN, pause: Number.NaN }, 1, FRAME).lift).toBe(0);
    // A frame the phone slept through never launches the crane on its own.
    expect(liftStep(STILL, 1, 30).lift).toBeLessThanOrEqual(0.05 / LIFT_SECONDS);
    expect(liftStep(STILL, 1, Number.NaN)).toEqual(STILL);
  });
});

describe("sharing six folds out between the sender's lines", () => {
  it("gives every line a press, and uses every fold", () => {
    for (let lines = 1; lines <= STEPS; lines++) {
      const plan = foldPlan(lines);
      expect(plan).toHaveLength(lines);
      expect(plan.flat()).toEqual(Array.from({ length: STEPS }, (_, i) => i));
      for (const group of plan) expect(group.length).toBeGreaterThan(0);
    }
  });

  it("puts the folds that follow on by themselves early, so the last lines land one by one", () => {
    expect(foldPlan(6)).toEqual([[0], [1], [2], [3], [4], [5]]);
    expect(foldPlan(4)).toEqual([[0, 1], [2, 3], [4], [5]]);
    expect(foldPlan(3)).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });

  it("copes with a line count no editor should ever produce", () => {
    expect(foldPlan(0)).toEqual([[0, 1, 2, 3, 4, 5]]);
    expect(foldPlan(99)).toHaveLength(STEPS);
    expect(foldPlan(Number.NaN)).toEqual([[0, 1, 2, 3, 4, 5]]);
  });

  it("tidies the sender's lines and falls back when they wrote none", () => {
    expect(usableLines(["  one  ", "", "two"])).toEqual(["one", "two"]);
    expect(usableLines([], ["a", "b"])).toEqual(["a", "b"]);
    expect(usableLines(undefined, ["a"])).toEqual(["a"]);
    expect(usableLines(Array.from({ length: 12 }, (_, i) => `l${i}`))).toHaveLength(STEPS);
  });
});

describe("the paper's geometry", () => {
  it("has a silhouette for the sheet and for every fold", () => {
    expect(SHEETS).toHaveLength(STEPS + 1);
    for (const d of SHEETS) expect(d).toMatch(/^M[\d.\- LZ]+Z$/);
  });

  it("moves every flap between two positions with the same corners", () => {
    for (const fold of FOLDS) {
      expect(fold.flaps.length).toBeGreaterThan(0);
      for (const flap of fold.flaps) {
        expect(flap.to).toHaveLength(flap.from.length);
        expect(flap.from).not.toEqual(flap.to);
      }
      const [a, b] = fold.crease;
      expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThan(10);
    }
  });

  it("starts a flap where it was and ends it where it lands", () => {
    const { from, to } = FOLDS[0].flaps[0];
    expect(lerpPts(from, to, 0)).toEqual(from);
    expect(lerpPts(from, to, 1)).toEqual(to);
    expect(lerpPts(from, to, 2)).toEqual(to);
    const mid = lerpPts(from, to, 0.5);
    expect(mid[1]).toEqual([(from[1][0] + to[1][0]) / 2, (from[1][1] + to[1][1]) / 2]);
  });

  it("keeps every shape on the middle of the table, with a shadow its own size", () => {
    expect(SHEET_SHIFT).toHaveLength(STEPS + 1);
    expect(SHEET_SHADOW).toHaveLength(STEPS + 1);
    expect(sheetShift(0)).toEqual(SHEET_SHIFT[0]);
    expect(sheetShift(STEPS)).toEqual([0, 0]);
    // A half-size sheet casts a half-size shadow, and the crane's is smaller than the sheet's.
    expect(sheetShadow(3)).toBeLessThan(sheetShadow(0) / 1.8);
    expect(sheetShadow(STEPS)).toBeLessThan(sheetShadow(0));
    // Out of range, on either side, still lands on a real stage.
    expect(sheetShift(-4)).toEqual(SHEET_SHIFT[0]);
    expect(sheetShift(99)).toEqual(SHEET_SHIFT[STEPS]);
    expect(sheetShadow(Number.NaN)).toBe(SHEET_SHADOW[0]);
  });

  it("puts the shadow under the paper, not under the middle of the table", () => {
    for (let done = 0; done <= STEPS; done++) {
      const xs = sheetPoints(done).map(([x]) => x);
      const x = shadowX(done);
      // Inside the silhouette's own width, every stage — including the half folded to one side.
      expect(x, `stage ${done}`).toBeGreaterThan(Math.min(...xs));
      expect(x, `stage ${done}`).toBeLessThan(Math.max(...xs));
    }
    // A square sits over its own middle; a corner folded away drags the weight with it.
    expect(shadowX(0)).toBe(70);
    expect(shadowX(1)).toBeLessThan(65);
    expect(shadowX(3)).toBeGreaterThan(75);
    expect(shadowX(Number.NaN)).toBe(shadowX(0));
  });

  it("reads a silhouette's corners back out of its path", () => {
    expect(sheetPoints(0)).toEqual([
      [28, 26],
      [112, 26],
      [112, 110],
      [28, 110],
    ]);
    expect(sheetPoints(99)).toEqual(sheetPoints(STEPS));
  });

  it("draws corners as a closed path, and finds the middle of a crease", () => {
    expect(
      polyPath([
        [0, 0],
        [10, 0],
        [10, 10],
        [10, 10],
      ]),
    ).toBe("M0 0 L10 0 L10 10 L10 10 Z");
    expect(polyPath([])).toBe("");
    expect(
      creaseMid([
        [0, 0],
        [10, 20],
      ]),
    ).toEqual([5, 10]);
  });
});

describe("the settings", () => {
  it("starts a new gift on paper it can draw, with no words put in the sender's mouth", () => {
    const blank = fieldsSchema.parse({});
    expect(blank).toEqual({ paper: "ivory", lines: [], closing: "" });
    expect(PAPER_IDS).toHaveLength(4);
    for (const id of PAPER_IDS) expect(PAPERS[id]).toBeDefined();
  });

  it("asks for between three and six lines, each short enough to read on a fold", () => {
    expect(fieldsSchema.safeParse({ lines: ["a", "b"] }).success).toBe(false);
    expect(fieldsSchema.safeParse({ lines: ["a", "b", "c"] }).success).toBe(true);
    expect(
      fieldsSchema.safeParse({ lines: Array.from({ length: MAX_LINES + 1 }, () => "x") }).success,
    ).toBe(false);
    expect(fieldsSchema.safeParse({ lines: ["a", "b", "x".repeat(73)] }).success).toBe(false);
    expect(fieldsSchema.safeParse({ paper: "gold" }).success).toBe(false);
    expect(MIN_LINES).toBeLessThanOrEqual(MAX_LINES);
    expect(MAX_LINES).toBe(STEPS);
  });

  it("keeps what is written while the rest is still being written", () => {
    // The editor draws the gift live, so between the first line and the third it is invalid.
    // The paper they picked and the line they typed must survive that.
    expect(readFields({ paper: "sage", lines: ["just the one so far"], closing: "  wait  " })).toEqual(
      { paper: "sage", lines: ["just the one so far"], closing: "wait" },
    );
    // Only the key that is wrong falls back.
    expect(readFields({ paper: "gold", lines: ["a", "b", "c"], closing: "x" })).toEqual({
      paper: "ivory",
      lines: ["a", "b", "c"],
      closing: "x",
    });
    expect(readFields({ paper: "slate", lines: "not a list" })).toEqual({
      paper: "slate",
      lines: [],
      closing: "",
    });
    // Nothing at all, and nonsense, both give a complete gift instead of throwing.
    expect(readFields(undefined)).toEqual(fieldsSchema.parse({}));
    expect(readFields(null)).toEqual(fieldsSchema.parse({}));
    expect(readFields(42)).toEqual(fieldsSchema.parse({}));
    // A valid gift comes back exactly as the schema parses it.
    const good = { paper: "blush" as const, lines: ["a", "b", "c"], closing: "z" };
    expect(readFields(good)).toEqual(fieldsSchema.parse(good));
    // Never more lines than there are folds, whatever an old draft holds.
    expect(readFields({ lines: Array.from({ length: 20 }, (_, i) => `l${i}`) }).lines).toHaveLength(
      MAX_LINES,
    );
  });

  it("sits in its own place in the gallery, not on top of another template", () => {
    const mine = TEMPLATE_MANIFESTS.filter((m) => m.sortOrder === template.manifest.sortOrder);
    expect(mine.map((m) => m.slug)).toEqual(["paper-crane"]);
  });

  it("renders as buttons and a list in the editor, and is labelled in both languages", () => {
    const fields = describeObjectSchema(fieldsSchema);
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
    expect(byKey.paper.widget).toBe("select");
    expect(byKey.paper.options).toHaveLength(4);
    expect(byKey.lines.widget).toBe("list");
    expect(byKey.lines.maxItems).toBe(MAX_LINES);
    expect(byKey.lines.minItems).toBe(MIN_LINES);
    expect(byKey.closing.widget).toBe("text");
    for (const locale of ["en", "es"] as const) {
      const meta = template.fieldMeta?.[locale] ?? {};
      for (const field of fields)
        expect(meta[field.key]?.label, `${locale}.${field.key}`).toBeTruthy();
      expect(Object.keys(meta[`paper`]?.options ?? {}).sort()).toEqual([...PAPER_IDS].sort());
    }
  });

  it("asks for the lines first, and keeps the paper when a reply is sent back", () => {
    expect(template.leadFields?.keys).toEqual(["lines", "closing"]);
    const reply = template.replyFields?.({ paper: "sage", lines: ["x"], closing: "y" });
    expect(reply).toEqual({ paper: "sage" });
  });

  it("needs the microphone, and says so, because the crane leaves on a breath", () => {
    expect(template.manifest.features.needs).toContain("microphone");
    expect(template.manifest.tier).toBe("premium");
  });
});

describe("the demo", () => {
  for (const locale of ["en", "es"] as const) {
    it(`${locale}: writes between three and six lines, and they all fit a fold`, () => {
      const demo = template.demoData[locale];
      const parsed = fieldsSchema.safeParse(demo.fields);
      expect(parsed.success).toBe(true);
      expect(demo.fields.lines.length).toBeGreaterThanOrEqual(MIN_LINES);
      expect(demo.fields.lines.length).toBeLessThanOrEqual(MAX_LINES);
      expect(demo.fields.closing).not.toBe("");
      expect(foldPlan(demo.fields.lines.length).flat()).toHaveLength(STEPS);
    });
  }

  it("says something different in each language, not the same sentence twice", () => {
    expect(template.demoData.en.fields.lines).not.toEqual(template.demoData.es.fields.lines);
    expect(template.demoData.en.message).not.toBe(template.demoData.es.message);
  });
});
