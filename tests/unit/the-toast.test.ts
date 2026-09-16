import { describe, expect, it } from "vitest";
import { describeObjectSchema } from "@/lib/editor/zod-describe";
import { template } from "@/templates/the-toast";
import { GLASSES, LIGHTS, POURS, fieldsSchema } from "@/templates/the-toast/schema";
import {
  AFTER_SPILL,
  BUTTON_TILT,
  LEVEL_MAX,
  POUR_FULL,
  SPILL_AT,
  TILT_FLOOR,
  TILT_FULL,
  TOP_RATE,
  BOTTLE_OVER,
  BOTTLE_REST,
  bottleAngle,
  fill,
  isLevel,
  pourRate,
  pourStatus,
  settled,
} from "@/templates/the-toast/pour";
import {
  CALM_CEILING,
  KNOCK_JERK,
  REFRACTORY_MS,
  WARMUP,
  hasReading,
  magnitude,
  newKnock,
  stepKnock,
  type KnockState,
} from "@/templates/the-toast/knock";
import { SENSE_GRACE_MS, senseOf, sensorGate } from "@/templates/the-toast/sense";
import { LEFT_X, RIGHT_X, baseFor, fallPath, glassesAt, leanOf, mouthOf, rimOf } from "@/templates/the-toast/art";

describe("tipping the bottle", () => {
  it("pours nothing from a phone lying still, or barely moved", () => {
    for (const angle of [0, 3, -7, TILT_FLOOR]) expect(pourRate(angle)).toBe(0);
  });

  it("starts past the floor and is flat out at the full angle", () => {
    expect(pourRate(TILT_FLOOR + 0.5)).toBeGreaterThan(0);
    expect(pourRate(30)).toBeLessThan(TOP_RATE);
    expect(pourRate(TILT_FULL)).toBeCloseTo(TOP_RATE, 10);
    expect(pourRate(89)).toBeCloseTo(TOP_RATE, 10);
  });

  it("pours the same tipped either way, and ignores a reading that isn't a number", () => {
    expect(pourRate(-40)).toBeCloseTo(pourRate(40), 10);
    expect(pourRate(Number.NaN)).toBe(0);
    expect(pourRate(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("the fallback button pours at an angle that really would", () => {
    expect(pourRate(BUTTON_TILT)).toBeGreaterThan(0);
    expect(pourRate(BUTTON_TILT)).toBeLessThan(TOP_RATE);
  });

  it("never sinks back, and a stalled tab can't fill the glasses in one frame", () => {
    expect(fill(0.5, 0, 1)).toBe(0.5);
    expect(fill(0.5, 4, 10)).toBe(0.5);
    expect(fill(0, TILT_FULL, 5)).toBeCloseTo(fill(0, TILT_FULL, 0.1), 10);
    expect(fill(1.25, TILT_FULL, 1)).toBeLessThanOrEqual(1.3);
    expect(fill(Number.NaN, TILT_FULL, 0.016)).toBeGreaterThanOrEqual(0);
  });

  it("takes a couple of seconds of full tilt to fill from empty", () => {
    let level = 0;
    let frames = 0;
    while (level < POUR_FULL && frames < 600) {
      level = fill(level, TILT_FULL, 1 / 60);
      frames++;
    }
    const seconds = frames / 60;
    expect(seconds).toBeGreaterThan(1);
    expect(seconds).toBeLessThan(2.5);
  });

  it("is level only near flat", () => {
    expect(isLevel(0)).toBe(true);
    expect(isLevel(LEVEL_MAX)).toBe(true);
    expect(isLevel(-LEVEL_MAX)).toBe(true);
    expect(isLevel(LEVEL_MAX + 1)).toBe(false);
    expect(isLevel(-40)).toBe(false);
  });

  it("reads the glasses the way the prompt does", () => {
    expect(pourStatus(0, 0)).toBe("empty");
    expect(pourStatus(0, 40)).toBe("pouring");
    expect(pourStatus(0.5, 40)).toBe("pouring");
    expect(pourStatus(0.5, 0)).toBe("part");
    expect(pourStatus(POUR_FULL, 40)).toBe("full");
    expect(pourStatus(POUR_FULL, 0)).toBe("full");
    expect(pourStatus(1.05, 40)).toBe("brimming");
    expect(pourStatus(SPILL_AT, 40)).toBe("spilled");
  });

  it("finishes only when they are full and the phone comes back level", () => {
    expect(settled(POUR_FULL, 0)).toBe(true);
    expect(settled(1.1, 4)).toBe(true);
    // still tipped, so they are not done pouring
    expect(settled(1, 40)).toBe(false);
    // not enough in them yet
    expect(settled(POUR_FULL - 0.01, 0)).toBe(false);
    expect(settled(0, 0)).toBe(false);
    // over the side: that is a spill, not a pour
    expect(settled(SPILL_AT, 0)).toBe(false);
  });

  it("leaves enough in the glasses after a spill to be worth pouring again", () => {
    expect(AFTER_SPILL).toBeGreaterThan(0);
    expect(AFTER_SPILL).toBeLessThan(POUR_FULL);
    expect(pourStatus(AFTER_SPILL, 0)).toBe("part");
  });

  it("leans the bottle further the further the phone rolls, and no further", () => {
    expect(bottleAngle(0)).toBe(BOTTLE_REST);
    expect(bottleAngle(40)).toBeGreaterThan(bottleAngle(20));
    expect(bottleAngle(-40)).toBeCloseTo(bottleAngle(40), 10);
    expect(bottleAngle(90)).toBeLessThanOrEqual(BOTTLE_OVER);
    expect(bottleAngle(Number.NaN)).toBe(BOTTLE_REST);
    // It is always a lean, never a direction: the scene turns it towards the glass being filled.
    expect(bottleAngle(-90)).toBeGreaterThan(0);
  });
});

/** Feeds a run of readings to the detector, 16ms apart, and reports every clink it accepted. */
function play(mags: number[], from = 4000, gap = 16) {
  let state: KnockState = newKnock();
  const knocks: number[] = [];
  let busy = 0;
  let peak = 0;
  mags.forEach((mag, i) => {
    const at = from + i * gap;
    const step = stepKnock(state, mag, at);
    state = step.state;
    peak = Math.max(peak, step.strength);
    if (step.tooBusy) busy++;
    if (step.knocked) knocks.push(at);
  });
  return { state, knocks, busy, peak };
}

/** A phone held still: gravity, plus the wobble of a hand. */
const still = (n: number, from = 0) => Array.from({ length: n }, (_, i) => 9.81 + Math.sin((i + from) * 1.7) * 0.05);

describe("knocking the phone", () => {
  it("learns what still looks like before it will accept anything", () => {
    // The very first reading has nothing to compare against.
    const first = stepKnock(newKnock(), 9.81, 4000);
    expect(first.knocked).toBe(false);
    expect(first.state.lastMag).toBe(9.81);
    // A knock inside the warm-up is ignored, however sharp.
    expect(play([...still(3), 9.81 + 14, ...still(3)]).knocks).toHaveLength(0);
  });

  it("takes one sharp knock on a phone that was sitting still", () => {
    const { knocks } = play([...still(WARMUP + 6), 9.81 + 14, ...still(20, 60)]);
    expect(knocks).toHaveLength(1);
  });

  it("ignores a phone that is being jostled the whole time — a bumpy train, a room dancing", () => {
    // Every reading is a hard jolt, so there is never a quiet moment to knock into.
    const shaken = Array.from({ length: 80 }, (_, i) => 9.81 + (i % 2 ? 7 : -7));
    const { knocks, busy } = play(shaken);
    expect(knocks).toHaveLength(0);
    // And it can say why, rather than looking broken.
    expect(busy).toBeGreaterThan(0);
  });

  it("rides in a car without toasting: road hum, and a bump every second or so", () => {
    // A phone in a hand in a moving car: the road never stops, and the bumps are real but blunt
    // next to a knock. Nothing here should start the speech on its own.
    const road = Array.from({ length: 300 }, (_, i) => {
      const hum = Math.sin(i * 2.3) * 0.6 + Math.sin(i * 0.7) * 0.4;
      const bump = i % 61 === 0 ? 3.4 : 0;
      return 9.81 + hum + bump;
    });
    const { knocks, peak } = play(road);
    expect(knocks).toHaveLength(0);
    // It still shows them trying, so a real knock on top of this reads as one.
    expect(peak).toBeLessThan(1);
  });

  it("ignores a gentle shake as well, where nothing is sharp enough", () => {
    const rocking = Array.from({ length: 80 }, (_, i) => 9.81 + Math.sin(i / 3) * 2.2);
    expect(play(rocking).knocks).toHaveLength(0);
  });

  it("counts a double tap as one clink, and a second knock later as another", () => {
    const soon = play([...still(WARMUP + 4), 9.81 + 14, 9.81, 9.81 + 14, ...still(20, 40)]);
    expect(soon.knocks).toHaveLength(1);

    const gap = Math.ceil(REFRACTORY_MS / 16) + 8;
    const later = play([...still(WARMUP + 4), 9.81 + 14, ...still(gap, 40), 9.81 + 14, ...still(10, 90)]);
    expect(later.knocks).toHaveLength(2);
    expect(later.knocks[1] - later.knocks[0]).toBeGreaterThanOrEqual(REFRACTORY_MS);
  });

  it("shows a soft tap on the meter without letting it count", () => {
    const soft = play([...still(WARMUP + 4), 9.81 + KNOCK_JERK * 0.6, ...still(10, 40)]);
    expect(soft.knocks).toHaveLength(0);
    expect(soft.peak).toBeGreaterThan(0);
    expect(soft.peak).toBeLessThan(1);
  });

  it("keeps the background reading honest", () => {
    expect(play(still(40)).state.ema).toBeLessThan(CALM_CEILING);
    expect(play(Array.from({ length: 40 }, (_, i) => 9.81 + (i % 2 ? 7 : -7))).state.ema).toBeGreaterThan(CALM_CEILING);
  });

  it("doesn't count an empty reading as a phone that can feel a knock", () => {
    // What a laptop reports: the event fires, every axis is null.
    expect(hasReading(null, null, null)).toBe(false);
    expect(hasReading(undefined, undefined, undefined)).toBe(false);
    expect(hasReading(Number.NaN, Number.NaN, Number.NaN)).toBe(false);
    // What a phone reports, including one lying perfectly flat on a table.
    expect(hasReading(0, 0, 9.81)).toBe(true);
    expect(hasReading(0, 0, 0)).toBe(true);
    expect(hasReading(null, null, 9.81)).toBe(true);
  });

  it("shrugs off readings that aren't numbers", () => {
    const state = newKnock();
    expect(stepKnock(state, Number.NaN, 4000).state).toBe(state);
    expect(stepKnock(state, 9.8, Number.NaN).state).toBe(state);
    expect(magnitude(3, 4, 0)).toBeCloseTo(5, 10);
    expect(magnitude(null, undefined, Number.NaN)).toBe(0);
  });
});

describe("what the gift may say about a sensor", () => {
  const ios = { requestPermission: () => Promise.resolve("granted" as const) };

  it("only calls a sensor gated on something held in a hand", () => {
    // The trap: Chrome answers requestPermission on a laptop, so the API alone proves nothing.
    expect(sensorGate(ios, false)).toBe(false);
    expect(sensorGate(ios, true)).toBe(true);
    // Android: no prompt to put to them at all.
    expect(sensorGate({}, true)).toBe(false);
    expect(sensorGate(null, true)).toBe(false);
    expect(sensorGate(undefined, false)).toBe(false);
  });

  it("a phone that is reporting is asked for the gesture, and never for permission", () => {
    for (const gated of [true, false]) {
      for (const quiet of [true, false]) {
        expect(senseOf({ gated, reading: true, answer: null, quiet })).toEqual({
          supported: true,
          expected: true,
          needsPermission: false,
        });
      }
    }
  });

  it("a laptop is never asked to tilt, and never offered a sensor it hasn't got", () => {
    expect(senseOf({ gated: false, reading: false, answer: null, quiet: true })).toEqual({
      supported: false,
      expected: false,
      needsPermission: false,
    });
  });

  it("waits a moment before offering the permission link, so a phone isn't pestered", () => {
    const early = senseOf({ gated: true, reading: false, answer: null, quiet: false });
    expect(early.needsPermission).toBe(false);
    // Still worth asking for the gesture while we wait — this is a phone.
    expect(early.expected).toBe(true);
    expect(senseOf({ gated: true, reading: false, answer: null, quiet: true }).needsPermission).toBe(true);
    expect(SENSE_GRACE_MS).toBeGreaterThan(200);
    expect(SENSE_GRACE_MS).toBeLessThan(1500);
  });

  it("gives a phone that has just said yes its moment before writing it off", () => {
    const justGranted = senseOf({ gated: true, reading: false, answer: "granted", quiet: false });
    expect(justGranted).toEqual({ supported: false, expected: true, needsPermission: false });
    // Said yes and still silent: a touchscreen with no sensor behind it. The button is the way.
    expect(senseOf({ gated: true, reading: false, answer: "granted", quiet: true }).expected).toBe(false);
  });

  it("takes no for an answer", () => {
    for (const quiet of [true, false]) {
      expect(senseOf({ gated: true, reading: false, answer: "denied", quiet })).toEqual({
        supported: false,
        expected: false,
        needsPermission: false,
      });
    }
  });
});

describe("the settings", () => {
  it("lays a complete table for a brand new gift", () => {
    const blank = fieldsSchema.parse({});
    expect(blank).toEqual({
      pour: "champagne",
      glasses: "flute",
      opening: "",
      venue: "",
      dateLine: "",
      light: "candlelit",
    });
  });

  it("only offers what it can draw", () => {
    for (const pour of POURS) expect(fieldsSchema.safeParse({ pour }).success).toBe(true);
    for (const glasses of GLASSES) expect(fieldsSchema.safeParse({ glasses }).success).toBe(true);
    for (const light of LIGHTS) expect(fieldsSchema.safeParse({ light }).success).toBe(true);
    expect(fieldsSchema.safeParse({ pour: "absinthe" }).success).toBe(false);
    expect(fieldsSchema.safeParse({ glasses: "mug" }).success).toBe(false);
    expect(fieldsSchema.safeParse({ light: "noon" }).success).toBe(false);
  });

  it("keeps the printed lines short enough for the card", () => {
    expect(fieldsSchema.safeParse({ opening: "x".repeat(70) }).success).toBe(true);
    expect(fieldsSchema.safeParse({ opening: "x".repeat(71) }).success).toBe(false);
    expect(fieldsSchema.safeParse({ venue: "x".repeat(61) }).success).toBe(false);
    expect(fieldsSchema.safeParse({ dateLine: "x".repeat(41) }).success).toBe(false);
  });

  it("uses the editor's usual controls, with a label for every option in both languages", () => {
    const described = describeObjectSchema(fieldsSchema);
    for (const key of ["pour", "glasses", "light"]) {
      const field = described.find((d) => d.key === key);
      expect(field?.widget).toBe("select");
      // Four options or fewer render as the labelled button grid rather than a dropdown.
      expect(field?.options?.length).toBeLessThanOrEqual(4);
      for (const option of field?.options ?? []) {
        expect(template.fieldMeta?.en[key]?.options?.[option]).toBeTruthy();
        expect(template.fieldMeta?.es[key]?.options?.[option]).toBeTruthy();
      }
    }
    for (const key of ["opening", "venue", "dateLine"]) {
      expect(described.find((d) => d.key === key)?.widget).toBe("text");
    }
    // Nothing here needs an editor of its own.
    expect(template.fieldEditors).toBeUndefined();
  });

  it("asks for the words on the card first, and labels every field in both languages", () => {
    expect(template.leadFields?.keys).toEqual(["opening", "venue", "dateLine"]);
    const keys = describeObjectSchema(fieldsSchema).map((d) => d.key);
    for (const key of template.leadFields?.keys ?? []) expect(keys).toContain(key);
    for (const key of keys) {
      expect(template.fieldMeta?.en[key]?.label).toBeTruthy();
      expect(template.fieldMeta?.es[key]?.label).toBeTruthy();
    }
  });

  it("sends a toast back from the same table, with a new opening line", () => {
    const gift = fieldsSchema.parse({
      pour: "red",
      glasses: "coupe",
      opening: "To Ana and Marco",
      venue: "Quinta da Boa Vista",
      dateLine: "14 June 2026",
      light: "midnight",
    });
    const reply = template.replyFields?.(gift) ?? {};
    expect(reply).toEqual({
      pour: "red",
      glasses: "coupe",
      venue: "Quinta da Boa Vista",
      dateLine: "14 June 2026",
      light: "midnight",
    });
    expect(reply.opening).toBeUndefined();
  });
});

describe("one bottle, two glasses", () => {
  it("fills the near glass first, then the far one — never both at once", () => {
    for (let at = 0; at <= 1; at += 0.01) {
      const { left, right } = glassesAt(at);
      const rising = [left, right].filter((v) => v > 0.001 && v < 0.999);
      expect(rising.length, `at ${at.toFixed(2)}`).toBeLessThanOrEqual(1);
      // And the far glass never starts before the near one is full.
      if (right > 0.001) expect(left, `at ${at.toFixed(2)}`).toBeCloseTo(1, 5);
    }
  });

  it("empties into nothing while the bottle crosses between them", () => {
    const mid = glassesAt(0.5);
    expect(mid.crossing).toBe(true);
    expect(mid.left).toBeCloseTo(1, 5);
    expect(mid.right).toBe(0);
    expect(mid.travel).toBeGreaterThan(0);
    expect(mid.travel).toBeLessThan(1);
    // Either side of the crossing it is over one glass or the other, and pouring.
    expect(glassesAt(0.3).crossing).toBe(false);
    expect(glassesAt(0.8).crossing).toBe(false);
    expect(glassesAt(0.3).travel).toBe(0);
    expect(glassesAt(0.8).travel).toBe(1);
  });

  it("hands over from one glass to the other without either jumping", () => {
    const before = glassesAt(0.999);
    const after = glassesAt(1.001);
    expect(after.left - before.left).toBeLessThan(0.01);
    expect(after.right - before.right).toBeLessThan(0.01);
    // Both full at a full pour, and both over the brim past it, so the spill happens to the pair.
    expect(glassesAt(1)).toMatchObject({ left: 1, right: 1 });
    expect(glassesAt(SPILL_AT).left).toBeCloseTo(SPILL_AT, 5);
    expect(glassesAt(SPILL_AT).right).toBeCloseTo(SPILL_AT, 5);
    // Both stand full enough to drink at the mark, the second a shade under the first.
    const full = glassesAt(POUR_FULL);
    expect(full.left).toBe(1);
    expect(full.right).toBeGreaterThan(0.88);
    expect(full.right).toBeLessThan(1);
  });

  it("copes with a level no pour should ever reach", () => {
    expect(glassesAt(Number.NaN)).toMatchObject({ left: 0, right: 0, travel: 0 });
    expect(glassesAt(-3)).toMatchObject({ left: 0, right: 0 });
  });

  it("leans the bottle towards the glass it is filling, and stands it up in between", () => {
    const over = bottleAngle(BUTTON_TILT);
    expect(leanOf(over, 0)).toBeCloseTo(-over, 10);
    expect(leanOf(over, 1)).toBeCloseTo(over, 10);
    expect(leanOf(over, 0.5)).toBeCloseTo(0, 10);
    expect(leanOf(over, 9)).toBeCloseTo(over, 10);
  });

  it("puts the mouth directly over the glass, so the wine falls straight down", () => {
    for (const aim of [LEFT_X, RIGHT_X]) {
      for (const roll of [20, 30, BUTTON_TILT, TILT_FULL, 80]) {
        const deg = leanOf(bottleAngle(roll), aim === LEFT_X ? 0 : 1);
        const mouth = mouthOf(deg, baseFor(deg, aim, 1), 47);
        expect(mouth.x, `aim ${aim} roll ${roll}`).toBeCloseTo(aim, 6);
        // And above the lip it is pouring into, never below it.
        expect(mouth.y).toBeLessThan(rimOf("flute"));
      }
    }
  });

  it("stands the bottle between the glasses until it is brought to one", () => {
    const deg = leanOf(bottleAngle(BUTTON_TILT), 0);
    expect(baseFor(deg, LEFT_X, 0)).toBe(50);
    // Half-way there is half-way there, not all or nothing.
    const half = baseFor(deg, LEFT_X, 0.5);
    expect(half).toBeGreaterThan(Math.min(50, baseFor(deg, LEFT_X, 1)));
    expect(half).toBeLessThan(Math.max(50, baseFor(deg, LEFT_X, 1)));
    expect(baseFor(Number.NaN, LEFT_X, 1)).toBeCloseTo(LEFT_X, 6);
  });

  it("draws the fall as one closed shape that starts at the mouth", () => {
    const d = fallPath(26, 30, 26, 60, 2, 1);
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    // Two edges, so it can narrow on the way down rather than being a ruled line.
    expect(d.split("C").length - 1).toBe(2);
    // It is a fall: nothing in it sits wider than the mouth or lower than the lip.
    const ys = [...d.matchAll(/-?\d+\.?\d*\s+(-?\d+\.?\d*)/g)].map((m) => Number(m[1]));
    expect(Math.max(...ys)).toBeLessThanOrEqual(60);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(30);
  });
});
