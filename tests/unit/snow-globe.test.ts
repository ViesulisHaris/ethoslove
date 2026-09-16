import { describe, expect, it } from "vitest";
import { describeObjectSchema } from "@/lib/editor/zod-describe";
import { template } from "@/templates/snow-globe";
import { S } from "@/templates/snow-globe/Template";
import { MAX_LINES, MOODS, SCENES, blankFields, fieldsSchema, parseFields } from "@/templates/snow-globe/schema";
import {
  DEAD_ZONE,
  IDLE_STORM,
  SAMPLE_MS,
  SAMPLE_STALE_MS,
  SHAKE_COUNTS,
  SHAKE_REF,
  advanceStorm,
  burstLevel,
  isFlipped,
  revealPlan,
  sampleStrength,
  settleMs,
  shakesNeeded,
  stormReady,
  type Storm,
  type Vec,
} from "@/templates/snow-globe/storm";

/** Readings this far apart in m/s², summed over the axes, produce a given strength. */
const readingPair = (delta: number) => ({ prev: { x: 0, y: 0, z: 0 }, now: { x: delta, y: 0, z: 0 } });

/**
 * Feed the globe a run of readings and report what happened: how many shakes it decided were
 * real, and when the first one landed.
 */
function shakeFor(strengthAt: (seconds: number) => number, seconds: number, fps = 60) {
  const dt = 1 / fps;
  let storm: Storm = IDLE_STORM;
  let fired = 0;
  let firstAt: number | null = null;
  let peak = 0;
  for (let t = 0; t < seconds; t += dt) {
    storm = advanceStorm(storm, strengthAt(t), dt);
    peak = Math.max(peak, storm.level);
    if (stormReady(storm)) {
      fired += 1;
      if (firstAt === null) firstAt = t;
      storm = { level: storm.level, charge: 0 };
    }
  }
  return { fired, firstAt, peak, storm };
}

/**
 * The whole chain the way the hook runs it: a phone reporting acceleration at its own rate, the
 * 60 ms sampling gate on top of it, and the storm advanced once a frame. This is what decides
 * whether a real hand — or a road — sets the snow off, so it is tested end to end and not just
 * from strengths someone made up.
 */
function feel({ accel, seconds, deviceHz = 60, fps = 60 }: { accel: (t: number) => Vec; seconds: number; deviceHz?: number; fps?: number }) {
  const frame = 1 / fps;
  const reading = 1 / deviceHz;
  let storm: Storm = IDLE_STORM;
  let last: { vec: Vec; t: number } | null = null;
  let strength = 0;
  let strengthAt = -Infinity;
  let nextReading = 0;
  let fired = 0;
  let firstAt: number | null = null;
  let peak = 0;
  for (let t = 0; t < seconds; t += frame) {
    while (nextReading <= t) {
      const ms = nextReading * 1000;
      const vec = accel(nextReading);
      if (!last || ms - last.t >= SAMPLE_MS) {
        if (last) {
          strength = sampleStrength(vec, last.vec);
          strengthAt = ms;
        }
        last = { vec, t: ms };
      }
      nextReading += reading;
    }
    const fresh = t * 1000 - strengthAt < SAMPLE_STALE_MS;
    storm = advanceStorm(storm, fresh ? strength : 0, frame);
    peak = Math.max(peak, storm.level);
    if (stormReady(storm)) {
      fired += 1;
      if (firstAt === null) firstAt = t;
      storm = { level: storm.level, charge: 0 };
    }
  }
  return { fired, firstAt, peak, storm };
}

/** A hand shaking a phone: one swing back and forth, on top of gravity. */
const hand = (hz: number, amp: number) => (t: number): Vec => {
  const a = amp * Math.sin(2 * Math.PI * hz * t);
  return { x: a, y: 9.8 + a * 0.4, z: a * 0.25 };
};

describe("what the phone feels", () => {
  it("reads a phone sitting still as nothing at all", () => {
    const still = readingPair(0.4);
    expect(sampleStrength(still.now, still.prev)).toBe(0);
    expect(sampleStrength({ x: 0, y: 9.8, z: 0 }, { x: 0, y: 9.8, z: 0 })).toBe(0);
  });

  it("reads a deliberate shake as full strength", () => {
    const hard = readingPair(SHAKE_REF + 20);
    expect(sampleStrength(hard.now, hard.prev)).toBe(1);
    const firm = readingPair(SHAKE_REF);
    expect(sampleStrength(firm.now, firm.prev)).toBe(1);
  });

  it("climbs between carrying it and shaking it", () => {
    const mid = readingPair((DEAD_ZONE + SHAKE_REF) / 2);
    expect(sampleStrength(mid.now, mid.prev)).toBeCloseTo(0.5, 2);
  });

  it("feels a shake along any axis, not just the one it was written for", () => {
    const d = SHAKE_REF / 2 + DEAD_ZONE;
    const along = (axis: "x" | "y" | "z") =>
      sampleStrength({ x: 0, y: 0, z: 0, [axis]: d }, { x: 0, y: 0, z: 0 });
    expect(along("y")).toBeCloseTo(along("x"), 6);
    expect(along("z")).toBeCloseTo(along("x"), 6);
    // And the direction of the swing makes no difference: back is as good as forth.
    expect(sampleStrength({ x: -d, y: 0, z: 0 }, { x: 0, y: 0, z: 0 })).toBeCloseTo(along("x"), 6);
  });

  it("never returns nonsense for a reading that is nonsense", () => {
    expect(sampleStrength({ x: NaN, y: 0, z: 0 }, { x: 0, y: 0, z: 0 })).toBe(0);
    expect(sampleStrength({ x: Infinity, y: 0, z: 0 }, { x: 0, y: 0, z: 0 })).toBe(0);
  });
});

describe("when a shake counts", () => {
  it("takes about three quarters of a second of real shaking", () => {
    const { fired, firstAt } = shakeFor(() => 1, 2);
    expect(fired).toBeGreaterThanOrEqual(1);
    expect(firstAt).toBeGreaterThan(0.4);
    expect(firstAt).toBeLessThan(1.1);
  });

  it("lets them keep going: a long shake is several shakes", () => {
    expect(shakeFor(() => 1, 5).fired).toBeGreaterThanOrEqual(3);
  });

  it("ignores a single knock, however hard — a phone put down on a table", () => {
    for (const fps of [60, 30]) {
      const knock = shakeFor((t) => (t < 1 / fps ? 1 : 0), 4, fps);
      expect(knock.fired).toBe(0);
      expect(knock.storm.charge).toBe(0);
    }
  });

  it("ignores a walk: a jolt every half second, for a minute", () => {
    // Each step is one hard sample, then nothing until the next foot lands.
    const step = (t: number) => (t % 0.5 < 1 / 60 ? 1 : 0);
    for (const fps of [60, 30]) expect(shakeFor(step, 60, fps).fired).toBe(0);
  });

  it("ignores a bumpy train: constant rumble, well under a shake", () => {
    const rumble = (t: number) => 0.18 + 0.12 * Math.sin(t * 34);
    const ride = shakeFor(rumble, 120);
    expect(ride.fired).toBe(0);
    expect(ride.storm.charge).toBe(0);
  });

  it("forgets a half-hearted start: shaking, stopping, shaking again is not one shake", () => {
    // Bursts of a third of a second, with a second of stillness between them.
    const halfHearted = (t: number) => (t % 1.3 < 0.33 ? 1 : 0);
    expect(shakeFor(halfHearted, 20).fired).toBe(0);
  });

  it("drains what it had within a second of stopping", () => {
    let storm = IDLE_STORM;
    for (let t = 0; t < 0.5; t += 1 / 60) storm = advanceStorm(storm, 1, 1 / 60);
    expect(storm.charge).toBeGreaterThan(0.3);
    // The swing they already made still counts for a moment — then it is gone.
    for (let t = 0; t < 1; t += 1 / 60) storm = advanceStorm(storm, 0, 1 / 60);
    expect(storm.charge).toBe(0);
  });

  it("keeps a lively level while they shake, and calms down after", () => {
    const shaking = shakeFor(() => 1, 1);
    expect(shaking.peak).toBeGreaterThan(0.9);
    let storm = shaking.storm;
    for (let t = 0; t < 2; t += 1 / 60) storm = advanceStorm(storm, 0, 1 / 60);
    expect(storm.level).toBeLessThan(0.01);
  });

  it("answers a real hand, however fast they shake and whatever the phone reports at", () => {
    // Nobody shakes at one tidy frequency, so every speed a wrist manages has to work — and the
    // 60 ms sampling must not alias one of them down to nothing.
    for (const hz of [3, 4, 5, 6, 7, 8, 10]) {
      for (const deviceHz of [60, 30]) {
        const run = feel({ accel: hand(hz, 18), seconds: 2, deviceHz });
        expect.soft(run.fired, `${hz}Hz at ${deviceHz}Hz`).toBeGreaterThanOrEqual(1);
        expect.soft(run.firstAt, `${hz}Hz at ${deviceHz}Hz`).toBeLessThan(1.3);
      }
    }
  });

  it("ignores a car: a rumbling road with potholes in it, for two minutes", () => {
    const road = (t: number): Vec => {
      const rumble = 2.4 * Math.sin(t * 74) + 1.3 * Math.sin(t * 131);
      // A pothole every couple of seconds: one hard jolt, gone by the next reading.
      const pothole = t % 2.3 < 0.05 ? 14 : 0;
      return { x: rumble + pothole, y: 9.8 + rumble * 0.5, z: rumble * 0.3 - pothole * 0.4 };
    };
    for (const deviceHz of [60, 30]) {
      const ride = feel({ accel: road, seconds: 120, deviceHz });
      expect(ride.fired, `at ${deviceHz}Hz`).toBe(0);
      expect(ride.storm.charge, `at ${deviceHz}Hz`).toBe(0);
    }
  });

  it("ignores a phone swinging in the hand of someone walking, for a minute", () => {
    // Held, not shaken: the arm swings at walking pace and the phone rides it. It never stops,
    // which is exactly the case a simple "moved this much, fire" detector gets wrong.
    const swing = (t: number): Vec => {
      const a = 8 * Math.sin(2 * Math.PI * 2.5 * t);
      return { x: a * 0.35, y: 9.8 + a, z: 3.4 * Math.sin(2 * Math.PI * 5.1 * t + 0.7) };
    };
    for (const deviceHz of [60, 30]) {
      const walk = feel({ accel: swing, seconds: 60, deviceHz });
      expect(walk.fired, `at ${deviceHz}Hz`).toBe(0);
      expect(walk.storm.charge, `at ${deviceHz}Hz`).toBe(0);
    }
  });

  it("ignores a phone lying on a table by a loud speaker", () => {
    const buzz = (t: number): Vec => ({ x: 0.6 * Math.sin(t * 380), y: 9.8 + 0.4 * Math.sin(t * 260), z: 0.5 * Math.sin(t * 410) });
    const room = feel({ accel: buzz, seconds: 60 });
    expect(room.fired).toBe(0);
    expect(room.peak).toBe(0);
  });

  it("survives a stalled or silly clock", () => {
    expect(advanceStorm(IDLE_STORM, 1, 0)).toEqual(IDLE_STORM);
    expect(advanceStorm(IDLE_STORM, 1, -5)).toEqual(IDLE_STORM);
    const long = advanceStorm(IDLE_STORM, 1, 30);
    expect(long.level).toBeLessThanOrEqual(1);
    expect(long.charge).toBeLessThanOrEqual(1);
  });
});

describe("the storm it makes", () => {
  it("settles slower after a wilder shake", () => {
    expect(settleMs(0)).toBeLessThan(settleMs(0.5));
    expect(settleMs(0.5)).toBeLessThan(settleMs(1));
    expect(settleMs(0)).toBeGreaterThanOrEqual(1000);
    expect(settleMs(1)).toBeLessThanOrEqual(3200);
    expect(settleMs(NaN)).toBe(settleMs(0));
  });

  it("blows hardest at once and is gone by the time the snow has settled", () => {
    expect(burstLevel(0, 2000)).toBeCloseTo(1, 5);
    expect(burstLevel(2000, 2000)).toBe(0);
    expect(burstLevel(4000, 2000)).toBe(0);
    expect(burstLevel(400, 2000)).toBeGreaterThan(burstLevel(1400, 2000));
    expect(burstLevel(10, 0)).toBe(0);
  });

  it("gives the button the same storm as the phone, and ends it when the snow settles", () => {
    // Nothing on a laptop reports motion, so the button's storm is drawn entirely from these two.
    // If they ever disagree the snow either stops early or is still flying when the reveal lands.
    for (const level of [0, 0.4, 0.8, 1]) {
      const ms = settleMs(level);
      expect(burstLevel(0, ms)).toBeGreaterThan(0.9);
      expect(burstLevel(ms * 0.5, ms)).toBeLessThan(burstLevel(ms * 0.2, ms));
      expect(burstLevel(ms, ms)).toBe(0);
    }
  });
});

describe("turning it over", () => {
  it("takes a real flip, not a tilt on the sofa", () => {
    expect(isFlipped(false, 0)).toBe(false);
    expect(isFlipped(false, 90)).toBe(false);
    expect(isFlipped(false, 140)).toBe(false);
    expect(isFlipped(false, 170)).toBe(true);
    expect(isFlipped(false, -170)).toBe(true);
  });

  it("stays tipped until it comes most of the way back", () => {
    expect(isFlipped(true, 150)).toBe(true);
    expect(isFlipped(true, 120)).toBe(true);
    expect(isFlipped(true, 100)).toBe(false);
  });

  it("does not flicker when a hand rests right on the edge of it", () => {
    // The two angles have to be far enough apart that a wobbling hand cannot cross both. Held at
    // 130° — between them — the globe keeps whichever way up it already was, however long they hold.
    let up = false;
    for (let i = 0; i < 200; i += 1) up = isFlipped(up, 130 + Math.sin(i) * 12);
    expect(up).toBe(false);
    let over = true;
    for (let i = 0; i < 200; i += 1) over = isFlipped(over, 130 + Math.sin(i) * 12);
    expect(over).toBe(true);
  });

  it("does not change its mind when the phone stops reporting", () => {
    expect(isFlipped(true, null)).toBe(true);
    expect(isFlipped(false, undefined)).toBe(false);
    expect(isFlipped(true, NaN)).toBe(true);
  });
});

describe("what appears in the snow", () => {
  const lines = ["one", "two", "three"];

  it("takes turns: a line, then a photo, then a line", () => {
    expect(revealPlan(lines, 3, 4)).toEqual([
      { kind: "line", text: "one" },
      { kind: "photo", index: 0 },
      { kind: "line", text: "two" },
      { kind: "photo", index: 1 },
    ]);
  });

  it("stops at the number of shakes the sender asked for", () => {
    expect(revealPlan(lines, 3, 2)).toHaveLength(2);
    expect(revealPlan(lines, 3, 0)).toEqual([]);
  });

  it("carries on alone when one of them runs out", () => {
    expect(revealPlan(["only"], 3, 4)).toEqual([
      { kind: "line", text: "only" },
      { kind: "photo", index: 0 },
      { kind: "photo", index: 1 },
      { kind: "photo", index: 2 },
    ]);
    expect(revealPlan(lines, 1, 4)).toEqual([
      { kind: "line", text: "one" },
      { kind: "photo", index: 0 },
      { kind: "line", text: "two" },
      { kind: "line", text: "three" },
    ]);
  });

  it("never asks for a photo that isn't there, or shows a blank line", () => {
    expect(revealPlan([" ", "", "real"], 0, 4)).toEqual([{ kind: "line", text: "real" }]);
    expect(revealPlan([], 0, 4)).toEqual([]);
    expect(revealPlan([], 2.7, 4)).toEqual([
      { kind: "photo", index: 0 },
      { kind: "photo", index: 1 },
    ]);
    // A gift saved with a broken photo list must still open on a globe with the lines in it.
    expect(revealPlan(["real"], -3, 4)).toEqual([{ kind: "line", text: "real" }]);
    expect(revealPlan(["real"], Number.NaN, 4)).toEqual([{ kind: "line", text: "real" }]);
  });

  it("always asks for one shake, even with nothing to find", () => {
    expect(shakesNeeded([])).toBe(1);
    expect(shakesNeeded(revealPlan(lines, 3, 3))).toBe(3);
  });
});

describe("the settings", () => {
  it("starts a new gift on a complete, publishable globe", () => {
    const blank = fieldsSchema.parse({});
    expect(blank).toEqual({ scene: "homes", mood: "lamplit", shakes: "three", plaque: "", lines: [] });
  });

  it("only offers the scenes and rooms it can draw", () => {
    for (const scene of SCENES) expect(fieldsSchema.safeParse({ scene }).success).toBe(true);
    for (const mood of MOODS) expect(fieldsSchema.safeParse({ mood }).success).toBe(true);
    expect(fieldsSchema.safeParse({ scene: "castle" }).success).toBe(false);
    expect(fieldsSchema.safeParse({ mood: "neon" }).success).toBe(false);
    expect(fieldsSchema.safeParse({ shakes: "seven" }).success).toBe(false);
  });

  it("keeps the plaque short enough to engrave and the lines short enough to read", () => {
    expect(fieldsSchema.safeParse({ plaque: "x".repeat(44) }).success).toBe(true);
    expect(fieldsSchema.safeParse({ plaque: "x".repeat(45) }).success).toBe(false);
    expect(fieldsSchema.safeParse({ lines: ["x".repeat(91)] }).success).toBe(false);
    expect(fieldsSchema.safeParse({ lines: Array.from({ length: MAX_LINES + 1 }, () => "x") }).success).toBe(false);
  });

  it("uses the editor's usual controls: buttons for the looks, a list for the lines", () => {
    const described = Object.fromEntries(describeObjectSchema(fieldsSchema).map((f) => [f.key, f]));
    for (const key of ["scene", "mood", "shakes"]) {
      expect(described[key]?.widget).toBe("select");
      expect(described[key]?.options?.length).toBeLessThanOrEqual(4);
      for (const option of described[key]?.options ?? []) {
        expect(template.fieldMeta?.en[key]?.options?.[option]).toBeTruthy();
        expect(template.fieldMeta?.es[key]?.options?.[option]).toBeTruthy();
      }
    }
    expect(described.lines).toMatchObject({ widget: "list", maxItems: MAX_LINES });
    expect(template.fieldEditors).toBeUndefined();
  });

  it("labels every field in both languages", () => {
    for (const field of describeObjectSchema(fieldsSchema)) {
      expect(template.fieldMeta?.en[field.key]?.label).toBeTruthy();
      expect(template.fieldMeta?.es[field.key]?.label).toBeTruthy();
    }
  });

  it("asks for what is inside the globe first", () => {
    expect(template.leadFields?.keys).toEqual(["scene", "lines", "shakes"]);
    const keys = describeObjectSchema(fieldsSchema).map((f) => f.key);
    for (const key of template.leadFields?.keys ?? []) expect(keys).toContain(key);
  });

  it("sends a reply back to the same shelf, with its own words", () => {
    const gift = fieldsSchema.parse({ scene: "cabin", mood: "midnight", shakes: "four", plaque: "ours", lines: ["mine"] });
    const reply = template.replyFields?.(gift) ?? {};
    expect(reply).toEqual({ scene: "cabin", mood: "midnight", shakes: "four" });
    expect(fieldsSchema.safeParse({ ...fieldsSchema.parse({}), ...reply }).success).toBe(true);
  });

  it("opens a draft that no longer fits instead of crashing on it", () => {
    expect(parseFields(undefined)).toEqual(blankFields());
    expect(parseFields("nonsense")).toEqual(blankFields());
    expect(parseFields({ scene: "castle", mood: "neon" })).toEqual(blankFields());
    // One setting that has gone stale must not cost the sender the words they wrote.
    expect(parseFields({ scene: "castle", mood: "midnight", plaque: "ours", lines: ["mine"] })).toEqual({
      scene: "homes",
      mood: "midnight",
      shakes: "three",
      plaque: "ours",
      lines: ["mine"],
    });
    expect(parseFields(template.demoData.en.fields)).toEqual(fieldsSchema.parse(template.demoData.en.fields));
  });

  it("asks for as many shakes as the setting says", () => {
    expect(SHAKE_COUNTS).toEqual({ two: 2, three: 3, four: 4 });
    for (const key of Object.keys(SHAKE_COUNTS)) expect(fieldsSchema.safeParse({ shakes: key }).success).toBe(true);
  });
});

describe("the demo", () => {
  it("has a plan for every shake it asks for, in both languages", () => {
    for (const locale of ["en", "es"] as const) {
      const demo = template.demoData[locale];
      const fields = fieldsSchema.parse(demo.fields);
      const plan = revealPlan(fields.lines, Math.min(demo.photos.length, 4), SHAKE_COUNTS[fields.shakes]);
      expect(plan.length).toBe(SHAKE_COUNTS[fields.shakes]);
      expect(plan.some((r) => r.kind === "photo")).toBe(true);
      expect(plan.some((r) => r.kind === "line")).toBe(true);
      expect(fields.plaque).not.toBe("");
    }
  });

  it("says it needs the motion sensor, and is not one of the free two", () => {
    expect(template.manifest.features.needs).toContain("deviceMotion");
    expect(template.manifest.tier).toBe("premium");
  });

  it("has as many photos as the gallery card promises", () => {
    const { min, max } = template.manifest.features.photos;
    for (const locale of ["en", "es"] as const) {
      expect(template.demoData[locale].photos.length).toBeGreaterThanOrEqual(min);
      expect(template.demoData[locale].photos.length).toBeLessThanOrEqual(max);
      for (const photo of template.demoData[locale].photos) expect(photo.caption?.trim()).toBeTruthy();
    }
  });
});

describe("what it says", () => {
  it("says everything in Spanish too, and says something in both", () => {
    expect(Object.keys(S.es).sort()).toEqual(Object.keys(S.en).sort());
    for (const locale of ["en", "es"] as const) {
      for (const [key, line] of Object.entries(S[locale])) expect(line.trim(), `${locale}.${key}`).not.toBe("");
    }
    // The two placeholders the template fills in have to survive into the Spanish.
    expect(S.es.count).toContain("{n}");
    expect(S.es.count).toContain("{total}");
    expect(S.es.letter).toContain("{name}");
    // Nothing left as a copy of the English.
    for (const key of Object.keys(S.en) as (keyof typeof S.en)[]) expect(S.es[key], key).not.toBe(S.en[key]);
  });

  it("names both the gift and every option in both languages", () => {
    for (const locale of ["en", "es"] as const) {
      expect(template.manifest.name[locale].trim()).toBeTruthy();
      expect(template.manifest.tagline[locale].trim()).toBeTruthy();
      expect(template.manifest.description[locale].trim()).toBeTruthy();
      expect(template.leadFields?.title[locale].trim()).toBeTruthy();
      for (const scene of SCENES) expect(template.fieldMeta?.[locale].scene?.options?.[scene]).toBeTruthy();
      for (const mood of MOODS) expect(template.fieldMeta?.[locale].mood?.options?.[mood]).toBeTruthy();
    }
  });
});

