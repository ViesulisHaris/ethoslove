import { describe, expect, it } from "vitest";
import { describeObjectSchema } from "@/lib/editor/zod-describe";
import { mulberry32 } from "@/templates/_shared/random";
import { template } from "@/templates/cap-toss";
import { CHEER, cheerLine, hear, openEars, powerOf, push, type Cheer, type CheerState } from "@/templates/cap-toss/cheer";
import { apexFor, capAt, flightMs, MIN_THROW, spinTurns, TAP_THROW, throwFrom } from "@/templates/cap-toss/toss";
import { fieldsSchema } from "@/templates/cap-toss/schema";

/** Feed the detector a room, one frame at a time, the way the microphone would. */
function listen(loudness: (t: number) => number, ms: number, step = 16) {
  let state: CheerState = openEars();
  const heard: Cheer[] = [];
  for (let t = 0; t <= ms; t += step) {
    const next = hear(state, loudness(t), t);
    state = next.state;
    if (next.cheer) heard.push(next.cheer);
  }
  return { state, heard };
}

/** Quiet for a second and a half, then a cheer of this size held for this long. */
const cheerAt = (peak: number, from = 1500, hold = 600) => (t: number) => (t >= from && t < from + hold ? peak : 0.06);

describe("what counts as a cheer", () => {
  it("never throws the cap in a quiet room", () => {
    expect(listen(() => 0.05, 6000).heard).toHaveLength(0);
  });

  it("treats a room that was already humming as the room, not as a cheer", () => {
    expect(listen(() => 0.55, 6000).heard).toHaveLength(0);
    // And it has learnt that hum, so the line it asks for has moved up with it.
    expect(listen(() => 0.55, 6000).state.room).toBeGreaterThan(0.5);
  });

  it("ignores a hum that creeps up over several seconds", () => {
    expect(listen((t) => 0.05 + (0.85 * t) / 5000, 5000).heard).toHaveLength(0);
  });

  it("ignores a room swelling back up after a lull, however far it swells", () => {
    // Not a ramp but the shape a room actually makes: fastest at the start, all the way up.
    const swell = (t: number) => 0.04 + 0.94 * (1 - Math.exp(-t / 1600));
    expect(listen(swell, 9000).heard).toHaveLength(0);
  });

  it("ignores a noisy room that keeps wobbling without ever bursting", () => {
    const rng = mulberry32(99);
    const wobble = Array.from({ length: 800 }, () => 0.4 + (rng() - 0.5) * 0.16);
    expect(listen((t) => wobble[Math.floor(t / 16)] ?? 0.4, 10000).heard).toHaveLength(0);
  });

  it("never throws the cap from a moving car", () => {
    // Road noise the whole way, a gear change that swells and falls, and two potholes.
    const rng = mulberry32(31);
    const car = (t: number) => {
      const road = 0.44 + Math.sin(t / 830) * 0.05 + (rng() - 0.5) * 0.07;
      const gear = t > 4200 && t < 5400 ? 0.16 * Math.sin(((t - 4200) / 1200) * Math.PI) : 0;
      const pothole = (t > 2600 && t < 2690) || (t > 7400 && t < 7480) ? 0.34 : 0;
      return road + gear + pothole;
    };
    expect(listen(car, 12000).heard).toHaveLength(0);
  });

  it("still hears a cheer over a room that is already loud", () => {
    const party = (t: number) => (t >= 2500 && t < 3200 ? 0.95 : 0.5);
    const { heard } = listen(party, 5000);
    expect(heard).toHaveLength(1);
    expect(heard[0].power).toBeGreaterThan(0);
  });

  it("hears a second cheer once the first has had its throw", () => {
    const twice = (t: number) => ((t >= 1500 && t < 2100) || (t >= 4000 && t < 4600) ? 0.9 : 0.06);
    expect(listen(twice, 6000).heard).toHaveLength(2);
  });

  it("throws the cap on one good cheer, once", () => {
    const { heard } = listen(cheerAt(0.85), 4000);
    expect(heard).toHaveLength(1);
    expect(heard[0].power).toBeGreaterThan(0.4);
    expect(heard[0].peak).toBeCloseTo(0.85, 5);
  });

  it("counts one long whoop as one throw, not three", () => {
    expect(listen(cheerAt(0.9, 1500, 3000), 5000).heard).toHaveLength(1);
  });

  it("does not hear a cheer in the microphone simply opening in a humming room", () => {
    // The level climbs off zero as the stream starts: the sharpest rise of the night, and meaningless.
    const opening = (t: number) => Math.min(0.62, (0.62 * t) / 120);
    expect(listen(opening, 6000).heard).toHaveLength(0);
  });

  it("does not hear a cheer in a stream that is granted now and only carries sound later", () => {
    // A real one: permission is given, the level sits at a flat nothing for the best part of a
    // second, and then the room arrives all at once. That arrival is the room, not a cheer.
    const late = (t: number) => (t < 750 ? 0 : 0.55);
    expect(listen(late, 8000).heard).toHaveLength(0);
  });

  it("still hears the cheer that comes after a stream started late", () => {
    const late = (t: number) => (t < 750 ? 0 : t >= 3000 && t < 3700 ? 0.92 : 0.55);
    const { heard } = listen(late, 6000);
    expect(heard).toHaveLength(1);
    expect(heard[0].power).toBeGreaterThan(0);
  });

  it("learns nothing from a stream that never carries sound", () => {
    const dead = listen(() => 0, 8000);
    expect(dead.heard).toHaveLength(0);
    expect(dead.state.wokeAt).toBeNull();
  });

  it("ignores one sharp knock, because a cheer has to last", () => {
    const knock = (t: number) => (t >= 1500 && t < 1500 + CHEER.holdMs - 60 ? 0.9 : 0.06);
    expect(listen(knock, 4000).heard).toHaveLength(0);
  });

  it("throws it higher the louder they are", () => {
    const soft = listen(cheerAt(0.5), 4000).heard;
    const loud = listen(cheerAt(0.98), 4000).heard;
    expect(soft).toHaveLength(1);
    expect(loud).toHaveLength(1);
    expect(loud[0].power).toBeGreaterThan(soft[0].power);
    expect(apexFor(throwFrom(loud[0].power))).toBeGreaterThan(apexFor(throwFrom(soft[0].power)));
  });

  it("asks for more in a loud room than in a silent one", () => {
    expect(cheerLine(0)).toBe(CHEER.floor);
    expect(cheerLine(0.5)).toBeCloseTo(0.64, 5);
    expect(cheerLine(0.5)).toBeGreaterThan(cheerLine(0.1));
    expect(cheerLine(2)).toBeLessThanOrEqual(0.98);
    expect(cheerLine(Number.NaN)).toBe(CHEER.floor);
  });

  it("spends its first moments learning the room instead of firing", () => {
    // Someone shouting before the microphone has settled teaches it the room; the next cheer counts.
    const early = (t: number) => (t < 100 ? 0.06 : t < 2000 ? 0.9 : 0.06);
    expect(listen(early, 1500).heard).toHaveLength(0);
    expect(CHEER.warmupMs).toBeGreaterThan(0);
  });

  it("survives a microphone that reports nonsense", () => {
    expect(listen(() => Number.NaN, 3000).heard).toHaveLength(0);
    expect(listen((t) => (t % 32 === 0 ? Number.POSITIVE_INFINITY : 12), 3000).state.room).toBeLessThanOrEqual(1);
  });

  it("shows a push only once the noise is over the room's own level", () => {
    expect(push(0.2, 0.2)).toBe(0);
    expect(push(0.1, 0.4)).toBe(0);
    expect(push(0.45, 0.2)).toBeGreaterThan(0);
    expect(push(0.9, 0.2)).toBeGreaterThan(push(0.45, 0.2));
    expect(push(1, 0)).toBe(1);
    expect(push(Number.NaN, 0)).toBe(0);
  });

  it("keeps the power of a cheer between nothing and everything", () => {
    expect(powerOf(0.2, 0.1)).toBe(0);
    expect(powerOf(1, 0)).toBe(1);
    expect(powerOf(0.7, 0.1)).toBeGreaterThan(0);
    expect(powerOf(0.7, 0.1)).toBeLessThan(1);
  });
});

describe("throwing the cap", () => {
  it("gives even the politest cheer a proper throw", () => {
    expect(throwFrom(0)).toBe(MIN_THROW);
    expect(throwFrom(1)).toBe(1);
    expect(throwFrom(-5)).toBe(MIN_THROW);
    expect(throwFrom(Number.NaN)).toBe(MIN_THROW);
    expect(throwFrom(0.5)).toBeGreaterThan(throwFrom(0.2));
  });

  it("starts and ends on the cushion, with the top of the arc in the middle", () => {
    for (const power of [MIN_THROW, 0.5, TAP_THROW, 1]) {
      const duration = flightMs(power);
      expect(capAt(power, 0).rise).toBeCloseTo(0, 6);
      expect(capAt(power, duration).rise).toBeCloseTo(0, 6);
      expect(capAt(power, duration / 2).rise).toBeCloseTo(apexFor(power), 6);
    }
  });

  it("goes higher and stays up longer the harder it is thrown", () => {
    expect(apexFor(1)).toBeGreaterThan(apexFor(0.3));
    expect(flightMs(1)).toBeGreaterThan(flightMs(0.3));
    expect(apexFor(0)).toBeGreaterThan(0);
    expect(apexFor(1)).toBeLessThanOrEqual(1);
  });

  it("turns over a whole number of times, so it lands flat", () => {
    for (const power of [0, 0.4, TAP_THROW, 1]) {
      expect(spinTurns(power) % 1).toBe(0);
      expect(spinTurns(power)).toBeGreaterThanOrEqual(1);
      expect(capAt(power, flightMs(power)).spin % 360).toBeCloseTo(0, 6);
    }
  });

  it("is over exactly once, however late the frame arrives", () => {
    const duration = flightMs(TAP_THROW);
    expect(capAt(TAP_THROW, duration * 0.4).done).toBe(false);
    expect(capAt(TAP_THROW, duration).done).toBe(true);
    expect(capAt(TAP_THROW, duration * 4).phase).toBe(1);
    expect(capAt(TAP_THROW, -200).phase).toBe(0);
    expect(capAt(TAP_THROW, Number.NaN).done).toBe(true);
  });

  it("gives the button a solid throw of its own", () => {
    // The fallback has to feel like a throw someone meant, not the smallest one that counts.
    expect(TAP_THROW).toBeGreaterThan(MIN_THROW);
    expect(TAP_THROW).toBeLessThan(1);
    expect(apexFor(TAP_THROW)).toBeGreaterThan(0.7);
  });

  it("freezes the editor's still frame with the cap off its mark", () => {
    const at = capAt(TAP_THROW, flightMs(TAP_THROW) * 0.07);
    expect(at.rise).toBeGreaterThan(0);
    expect(at.rise).toBeLessThan(apexFor(TAP_THROW));
    expect(at.done).toBe(false);
  });

  it("leans out and comes back over the cushion", () => {
    const duration = flightMs(TAP_THROW);
    expect(capAt(TAP_THROW, 0).drift).toBeCloseTo(0, 6);
    expect(capAt(TAP_THROW, duration).drift).toBeCloseTo(0, 6);
    expect(Math.abs(capAt(TAP_THROW, duration / 2).drift)).toBeGreaterThan(0);
    expect(Math.abs(capAt(TAP_THROW, duration / 2).drift)).toBeLessThanOrEqual(1);
  });
});

describe("the settings", () => {
  it("starts a new gift on a complete, publishable set", () => {
    expect(fieldsSchema.parse({})).toEqual({ year: "2026", school: "", awardedFor: "", tassel: "gold", gown: "navy" });
  });

  it("only offers the tassels and gowns it can draw", () => {
    expect(fieldsSchema.safeParse({ tassel: "chartreuse" }).success).toBe(false);
    expect(fieldsSchema.safeParse({ gown: "scarlet" }).success).toBe(false);
    for (const tassel of ["gold", "crimson", "sky", "white"]) expect(fieldsSchema.safeParse({ tassel }).success).toBe(true);
    for (const gown of ["navy", "black"]) expect(fieldsSchema.safeParse({ gown }).success).toBe(true);
  });

  it("keeps the written lines short enough to fit the banner and the diploma", () => {
    expect(fieldsSchema.safeParse({ year: "x".repeat(13) }).success).toBe(false);
    expect(fieldsSchema.safeParse({ school: "x".repeat(61) }).success).toBe(false);
    expect(fieldsSchema.safeParse({ awardedFor: "x".repeat(91) }).success).toBe(false);
    expect(fieldsSchema.parse({ school: "  Plymouth  " }).school).toBe("Plymouth");
  });

  it("asks for what they finished first, and uses the editor's usual controls for the rest", () => {
    expect(template.leadFields?.keys).toEqual(["year", "school", "awardedFor"]);
    expect(template.fieldEditors).toBeUndefined();
    const described = describeObjectSchema(fieldsSchema);
    for (const key of template.leadFields?.keys ?? []) expect(described.find((d) => d.key === key)?.widget).toBe("text");
    for (const key of ["tassel", "gown"]) {
      const field = described.find((d) => d.key === key);
      // Four options or fewer render as the labelled button grid rather than a dropdown.
      expect(field?.widget).toBe("select");
      expect(field?.options?.length).toBeLessThanOrEqual(4);
      for (const locale of ["en", "es"] as const) {
        for (const option of field?.options ?? []) expect(template.fieldMeta?.[locale][key]?.options?.[option]).toBeTruthy();
      }
    }
  });

  it("labels every field in both languages", () => {
    for (const locale of ["en", "es"] as const) {
      for (const key of Object.keys(fieldsSchema.shape)) expect(template.fieldMeta?.[locale][key]?.label).toBeTruthy();
    }
  });

  it("sends a reply from the same ceremony", () => {
    const gift = fieldsSchema.parse({ year: "2031", school: "Vet school", awardedFor: "putting up with me", tassel: "sky", gown: "black" });
    expect(template.replyFields?.(gift)).toEqual({ year: "2031", school: "Vet school", tassel: "sky", gown: "black" });
  });

  it("needs the microphone, and says so", () => {
    expect(template.manifest.features.needs).toContain("microphone");
    expect(template.manifest.occasions).toContain("graduation");
    for (const locale of ["en", "es"] as const) {
      expect(template.manifest.description[locale].length).toBeGreaterThan(80);
      expect(template.demoData[locale].fields.awardedFor.length).toBeGreaterThan(0);
    }
  });
});
