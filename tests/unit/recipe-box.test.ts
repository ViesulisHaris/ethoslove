import { describe, expect, it } from "vitest";
import { describeObjectSchema } from "@/lib/editor/zod-describe";
import { template } from "@/templates/recipe-box";
import { S } from "@/templates/recipe-box/Template";
import { SCENE, bowlColor, ingredientColor } from "@/templates/recipe-box/art";
import {
  IDLE_MOTION,
  IDLE_POUR,
  IDLE_STIR,
  MAX_INGREDIENTS,
  MAX_TIP,
  POUR_SECONDS,
  SHAKE_FORCE,
  SHAKE_GAP_MS,
  STEADY_MS,
  STIR_PER_TAP,
  STIR_WINDOW_MS,
  TILT_FLOOR,
  TILT_FULL,
  TILT_NUDGE,
  advancePour,
  cardSlots,
  ingredientLines,
  pourDone,
  pourTilt,
  promptFor,
  readShake,
  rateFor,
  shakeStir,
  stirDone,
  tapStir,
  tipFor,
  tipPoint,
  type Motion,
  type Pour,
  type Stir,
} from "@/templates/recipe-box/pour";
import { CLOTH_IDS, COUNTER_IDS, fieldsSchema } from "@/templates/recipe-box/schema";

const DT = 1 / 60;

/** Runs the jar under a tilt that changes over time, the way the template's frame loop does. */
function pourUnder(tilt: (t: number) => number, seconds: number): Pour & { seconds: number } {
  let state = IDLE_POUR;
  let t = 0;
  for (; t < seconds; t += DT) {
    state = advancePour(state, tilt(t), DT);
    if (pourDone(state)) break;
  }
  return { ...state, seconds: t };
}

/** Seconds until the jar is empty under that tilt, or Infinity if it never empties. */
const timeToPour = (tilt: (t: number) => number, limit = 30) => {
  const out = pourUnder(tilt, limit);
  return pourDone(out) ? out.seconds : Infinity;
};

describe("the settings", () => {
  it("starts a new gift complete, with the recipe left to the sender", () => {
    const blank = fieldsSchema.parse({});
    expect(blank).toEqual({ recipeName: "", ingredients: [], makes: "", counter: "oak", cloth: "tomato" });
  });

  it("only offers the counters and cloths it can draw", () => {
    expect(fieldsSchema.safeParse({ counter: "granite" }).success).toBe(false);
    expect(fieldsSchema.safeParse({ cloth: "teal" }).success).toBe(false);
    for (const counter of COUNTER_IDS) expect(fieldsSchema.safeParse({ counter }).success).toBe(true);
    for (const cloth of CLOTH_IDS) expect(fieldsSchema.safeParse({ cloth }).success).toBe(true);
  });

  it("takes as many ingredients as there are jars, and no blank ones", () => {
    const six = Array.from({ length: MAX_INGREDIENTS }, (_, i) => `line ${i}`);
    expect(fieldsSchema.safeParse({ ingredients: six }).success).toBe(true);
    expect(fieldsSchema.safeParse({ ingredients: [...six, "one too many"] }).success).toBe(false);
    expect(fieldsSchema.safeParse({ ingredients: ["  "] }).success).toBe(false);
    expect(fieldsSchema.safeParse({ ingredients: ["x".repeat(65)] }).success).toBe(false);
  });

  it("asks for the recipe first, with the editor's usual controls", () => {
    expect(template.leadFields?.keys).toEqual(["recipeName", "ingredients", "makes"]);
    expect(template.fieldEditors).toBeUndefined();
    const described = describeObjectSchema(fieldsSchema);
    const widget = (key: string) => described.find((d) => d.key === key);
    expect(widget("ingredients")?.widget).toBe("list");
    expect(widget("ingredients")?.maxItems).toBe(MAX_INGREDIENTS);
    expect(widget("recipeName")?.widget).toBe("text");
    for (const key of ["counter", "cloth"]) {
      const field = widget(key);
      // Four options or fewer render as the labelled button grid rather than a dropdown.
      expect(field?.widget).toBe("select");
      expect(field?.options?.length).toBeLessThanOrEqual(4);
      for (const option of field?.options ?? []) {
        expect(template.fieldMeta?.en[key]?.options?.[option]).toBeTruthy();
        expect(template.fieldMeta?.es[key]?.options?.[option]).toBeTruthy();
      }
    }
    for (const key of Object.keys(fieldsSchema.shape)) {
      expect(template.fieldMeta?.en[key]?.label).toBeTruthy();
      expect(template.fieldMeta?.es[key]?.label).toBeTruthy();
    }
  });

  it("keeps the kitchen when one is sent back, but not her ingredients", () => {
    const gift = fieldsSchema.parse({ counter: "walnut", cloth: "rosemary", ingredients: ["two cups of patience"], recipeName: "Mum" });
    const reply = template.replyFields?.(gift) ?? {};
    expect(reply).toEqual({ counter: "walnut", cloth: "rosemary" });
    expect(fieldsSchema.safeParse({ ...fieldsSchema.parse({}), ...reply }).success).toBe(true);
  });
});

describe("the ingredients on the card", () => {
  it("drops blanks and never asks for more jars than there are", () => {
    expect(ingredientLines([" two cups ", "", "   "], ["ours"])).toEqual(["two cups"]);
    expect(ingredientLines(Array.from({ length: 12 }, (_, i) => `line ${i}`), [])).toHaveLength(MAX_INGREDIENTS);
  });

  it("pours three of ours when the sender wrote none", () => {
    expect(ingredientLines([], ["one", "two", "three"])).toEqual(["one", "two", "three"]);
    expect(ingredientLines(undefined, ["one"])).toEqual(["one"]);
  });

  it("lays every line out inside the card, one or six", () => {
    const { top, bottom } = SCENE.lines;
    for (let n = 1; n <= MAX_INGREDIENTS; n++) {
      const slots = cardSlots(n, top, bottom);
      expect(slots.top).toBeGreaterThanOrEqual(top - 1e-9);
      expect(slots.top + slots.slot * n).toBeLessThanOrEqual(bottom + 1e-9);
      // The block sits in the middle of the space the card has.
      expect(slots.top - top).toBeCloseTo(bottom - (slots.top + slots.slot * n), 6);
      expect(slots.font).toBeGreaterThanOrEqual(2.9);
      expect(slots.font).toBeLessThanOrEqual(4.1);
      // Two wrapped lines of that size still fit in one slot.
      expect(slots.font * 2 * 1.05).toBeLessThanOrEqual(slots.slot);
    }
  });

  it("gives every jar a colour, and the bowl what's gone into it", () => {
    expect(ingredientColor(0)).toMatch(/^#[0-9a-f]{6}$/i);
    expect(ingredientColor(MAX_INGREDIENTS + 1)).toBe(ingredientColor(1));
    expect(bowlColor(0)).toMatch(/^#[0-9a-f]{6}$/i);
    expect(bowlColor(3)).not.toBe(bowlColor(1));
  });
});

describe("reading the tilt", () => {
  it("treats anything the sensor can't tell us as level", () => {
    expect(pourTilt({})).toBe(0);
    expect(pourTilt({ gamma: null })).toBe(0);
    expect(pourTilt({ gamma: Number.NaN })).toBe(0);
    expect(pourTilt({ gamma: 34 })).toBe(34);
    expect(pourTilt({ gamma: -34 })).toBe(-34);
    expect(pourTilt({ gamma: 400 })).toBe(90);
  });

  it("pours nothing while the phone is anywhere near level", () => {
    expect(rateFor(0)).toBe(0);
    expect(rateFor(TILT_FLOOR)).toBe(0);
    expect(rateFor(TILT_FLOOR - 5)).toBe(0);
    expect(rateFor(Number.NaN)).toBe(0);
  });

  it("pours faster the further it goes, either way, up to full", () => {
    expect(rateFor(30)).toBeGreaterThan(0);
    expect(rateFor(45)).toBeGreaterThan(rateFor(30));
    expect(rateFor(TILT_FULL)).toBe(1);
    expect(rateFor(80)).toBe(1);
    expect(rateFor(-45)).toBe(rateFor(45));
  });

  it("leans the jar with the phone long before anything comes out", () => {
    expect(tipFor(0)).toBe(0);
    expect(tipFor(10)).toBeGreaterThan(0);
    expect(rateFor(10)).toBe(0);
    expect(tipFor(-40)).toBe(tipFor(40));
    expect(tipFor(90)).toBe(MAX_TIP);
  });
});

describe("pouring one ingredient in", () => {
  it("takes a steady tilt about a second and a half", () => {
    const held = timeToPour(() => 70);
    expect(held).toBeGreaterThan(POUR_SECONDS);
    expect(held).toBeLessThan(POUR_SECONDS + STEADY_MS / 1000 + 0.2);
  });

  it("gets a half-hearted tilt there too, just slower", () => {
    const gentle = timeToPour(() => 30);
    expect(gentle).toBeGreaterThan(timeToPour(() => 70));
    expect(gentle).toBeLessThan(12);
  });

  it("ignores a bumpy train: jolts past the angle, but never held", () => {
    // 150ms thrown over, 250ms back — for a minute.
    const jolted = pourUnder((t) => (t % 0.4 < 0.15 ? 70 : 0), 60);
    expect(jolted.filled).toBe(0);
    expect(jolted.rate).toBe(0);
  });

  it("ignores a phone put down hard, and a single knock", () => {
    expect(pourUnder((t) => (t < STEADY_MS / 1000 - 0.02 ? 90 : 0), 5).filled).toBe(0);
    expect(advancePour(IDLE_POUR, 90, DT).filled).toBe(0);
  });

  it("stops the moment the phone is levelled, and keeps what went in", () => {
    let state = IDLE_POUR;
    for (let t = 0; t < 1; t += DT) state = advancePour(state, 70, DT);
    const poured = state.filled;
    expect(poured).toBeGreaterThan(0);
    expect(poured).toBeLessThan(1);
    for (let t = 0; t < 2; t += DT) state = advancePour(state, 4, DT);
    expect(state.filled).toBe(poured);
    expect(state.rate).toBe(0);
    expect(state.held).toBe(0);
  });

  it("carries on from where it stopped when they tip it again", () => {
    expect(timeToPour((t) => (t < 1 ? 70 : t < 3 ? 0 : 70))).toBeLessThan(6);
  });

  it("can't be emptied by a tab that was asleep for a minute", () => {
    const woken = advancePour({ held: 1000, filled: 0, rate: 1 }, 70, 60);
    expect(woken.filled).toBeLessThanOrEqual(0.05 / POUR_SECONDS + 1e-9);
  });

  it("never fills past the top", () => {
    expect(pourUnder(() => 90, 20).filled).toBe(1);
    expect(pourDone({ held: 999, filled: 1, rate: 1 })).toBe(true);
    expect(pourDone(IDLE_POUR)).toBe(false);
  });
});

describe("what the plaque says while they tip it", () => {
  it("asks for a tilt while the phone is flat on the table", () => {
    expect(promptFor(0, IDLE_POUR)).toBe("idle");
    expect(promptFor(TILT_NUDGE, IDLE_POUR)).toBe("idle");
    expect(promptFor(Number.NaN, IDLE_POUR)).toBe("idle");
  });

  it("eggs them on once the phone is tipping, either way", () => {
    expect(promptFor(12, IDLE_POUR)).toBe("more");
    expect(promptFor(-12, IDLE_POUR)).toBe("more");
    // Past the floor, but not yet held long enough to count as anything but a jolt.
    expect(promptFor(70, advancePour(IDLE_POUR, 70, DT))).toBe("holding");
  });

  it("says it's pouring only while something is actually coming out", () => {
    let state = IDLE_POUR;
    for (let t = 0; t < STEADY_MS / 1000 + 0.1; t += DT) state = advancePour(state, 70, DT);
    expect(promptFor(70, state)).toBe("pouring");
    expect(promptFor(0, advancePour(state, 0, DT))).toBe("idle");
  });
});

describe("where the jar pours", () => {
  const { jar, bowl } = SCENE;

  it("stands on the counter with its mouth up, before anything is tipped", () => {
    const mouth = tipPoint(jar.pivot, jar.mouth, 0);
    expect(mouth.y).toBeLessThan(jar.pivot.y);
    expect(mouth.x).toBeLessThan(jar.pivot.x);
  });

  it("puts the mouth over the bowl, and above its rim, at every angle that pours", () => {
    for (let tilt = TILT_FLOOR + 0.5; tilt <= 90; tilt += 0.5) {
      const mouth = tipPoint(jar.pivot, jar.mouth, tipFor(tilt));
      expect(mouth.x).toBeGreaterThan(bowl.cx - bowl.rx);
      expect(mouth.x).toBeLessThan(bowl.cx + bowl.rx);
      // Above the rim, or the stream would come out from behind the bowl.
      expect(mouth.y).toBeLessThan(bowl.rim - bowl.ry + 1);
    }
  });

  it("swings the mouth down and towards the bowl as it goes over", () => {
    const little = tipPoint(jar.pivot, jar.mouth, 20);
    const lots = tipPoint(jar.pivot, jar.mouth, MAX_TIP);
    expect(lots.x).toBeLessThan(little.x);
    expect(lots.y).toBeGreaterThan(little.y);
  });
});

describe("reading the accelerometer", () => {
  const at = (t: number, x: number, y = 0, z = 0): Motion => ({ x, y, z, t });

  it("takes the first reading as nothing but something to compare against", () => {
    expect(readShake(IDLE_MOTION, at(1_000, 99)).shook).toBe(false);
    expect(readShake(IDLE_MOTION, at(1_000, 99)).last).toEqual(at(1_000, 99));
  });

  it("ignores a phone lying still, and the hum of a car", () => {
    let last = at(1_000, 0, 0, 9.8);
    for (let i = 1; i < 40; i++) {
      const now = { x: Math.sin(i) * 0.6, y: 0.2, z: 9.8, t: 1_000 + i * 100 };
      const read = readShake(last, now);
      expect(read.shook).toBe(false);
      last = read.last;
    }
  });

  it("counts a proper shake", () => {
    const first = readShake(at(1_000, 0), at(1_100, SHAKE_FORCE + 6));
    expect(first.shook).toBe(true);
    expect(first.last.t).toBe(1_100);
  });

  it("reads one jolt once, however fast the sensor talks", () => {
    const last = at(1_000, 0);
    const tooSoon = readShake(last, at(1_000 + SHAKE_GAP_MS - 10, 60));
    expect(tooSoon.shook).toBe(false);
    // And the reading it threw away doesn't become the thing the next one is measured against.
    expect(tooSoon.last).toEqual(last);
  });

  it("wants a real change of direction, not a bigger number", () => {
    expect(readShake(at(1_000, 0), at(1_200, SHAKE_FORCE - 2)).shook).toBe(false);
    expect(readShake(at(1_000, 50), at(1_200, 50)).shook).toBe(false);
  });
});

describe("shaking it to stir", () => {
  /** Shakes `count` times, `gap` ms apart. */
  const shakeSeries = (count: number, gap: number, from: Stir = IDLE_STIR): Stir => {
    let state = from;
    for (let i = 0; i < count; i++) state = shakeStir(state, 1_000 + i * gap);
    return state;
  };

  it("does nothing for one knock", () => {
    const knocked = shakeStir(IDLE_STIR, 1_000);
    expect(knocked.progress).toBe(0);
    expect(knocked.combo).toBe(1);
  });

  it("does nothing on a bumpy train either: bumps too far apart to be hands", () => {
    expect(shakeSeries(40, STIR_WINDOW_MS + 200).progress).toBe(0);
  });

  it("stirs when the shakes come in quick succession", () => {
    expect(shakeSeries(2, 200).progress).toBeGreaterThan(0);
    expect(shakeSeries(6, 200).progress).toBeGreaterThan(shakeSeries(3, 200).progress);
    expect(stirDone(shakeSeries(20, 160))).toBe(true);
  });

  it("picks up again after a pause instead of starting over", () => {
    const paused = shakeSeries(6, 200);
    const later = shakeSeries(6, 200, { ...paused, last: paused.last });
    expect(later.progress).toBeGreaterThan(paused.progress);
  });

  it("gets there on the button alone, in about as many goes", () => {
    let state = IDLE_STIR;
    let taps = 0;
    while (!stirDone(state) && taps < 20) {
      state = tapStir(state);
      taps++;
    }
    expect(taps).toBe(Math.ceil(1 / STIR_PER_TAP));
    expect(state.progress).toBe(1);
    expect(tapStir(state).progress).toBe(1);
  });
});

describe("what it says", () => {
  const lines = (locale: "en" | "es") =>
    Object.entries(S[locale]).flatMap(([key, value]) =>
      Array.isArray(value) ? value.map((v, i) => [`${key}[${i}]`, v] as const) : [[key, value] as const],
    );

  it("says everything in Spanish too, and leaves nothing blank", () => {
    expect(Object.keys(S.es).sort()).toEqual(Object.keys(S.en).sort());
    for (const locale of ["en", "es"] as const) {
      for (const [key, line] of lines(locale)) expect(line.trim(), `${locale}.${key}`).not.toBe("");
    }
    // Nothing left sitting in English.
    for (const key of Object.keys(S.en) as (keyof typeof S.en)[]) {
      expect(JSON.stringify(S.es[key]), key).not.toBe(JSON.stringify(S.en[key]));
    }
  });

  it("keeps the names the template fills in", () => {
    for (const locale of ["en", "es"] as const) {
      expect(S[locale].recipeName).toContain("{name}");
      expect(S[locale].fromBox).toContain("{sender}");
      expect(S[locale].step).toContain("{i}");
      expect(S[locale].step).toContain("{n}");
    }
  });

  it("pours three of ours when the sender writes none, in either language", () => {
    for (const locale of ["en", "es"] as const) {
      expect(S[locale].starter).toHaveLength(3);
      expect(ingredientLines([], S[locale].starter)).toEqual(S[locale].starter);
    }
  });

  it("says out loud what each control does, and stays honest about the way out", () => {
    for (const locale of ["en", "es"] as const) {
      // Every button carries one word; the label read aloud has to say more than that.
      expect(S[locale].pourAria.length).toBeGreaterThan(S[locale].pourBtn.length);
      expect(S[locale].stirAria.length).toBeGreaterThan(S[locale].stirBtn.length);
      expect(S[locale].allowAria.length).toBeGreaterThan(S[locale].allowMotion.length);
      // The tap is offered whether the phone is being asked, is dead, or is answering.
      for (const key of ["tapPour", "tapStir", "orTap", "noTilt", "noShake"] as const) {
        expect(S[locale][key].trim(), `${locale}.${key}`).not.toBe("");
      }
      // Short enough for two lines on the plaque at 360 wide.
      for (const key of ["tilt", "shake", "noTilt", "noShake", "allIn", "pouring"] as const) {
        expect(S[locale][key].length, `${locale}.${key}`).toBeLessThanOrEqual(46);
      }
    }
  });
});

describe("the demo", () => {
  it("reads like a real kitchen in both languages", () => {
    for (const locale of ["en", "es"] as const) {
      const demo = template.demoData[locale];
      const fields = fieldsSchema.parse(demo.fields);
      expect(fields.ingredients.length).toBeGreaterThanOrEqual(3);
      expect(fields.recipeName.length).toBeGreaterThan(0);
      expect(fields.makes.length).toBeGreaterThan(0);
      expect(demo.photos.every((photo) => photo.caption)).toBe(true);
    }
    expect(template.demoData.en.message).not.toBe(template.demoData.es.message);
    expect(template.demoData.en.fields.ingredients).not.toEqual(template.demoData.es.fields.ingredients);
  });
});
