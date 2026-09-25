import { describe, expect, it } from "vitest";
import { beatAt, midiOf, photoAt, secondsAt, speedAt, TUNE_IDS, TUNES, tuneSeconds, turnAt, turnsIn } from "@/templates/music-box/tunes";
import { clicksOf, CLICK_STEP, drag, FULL, fold, isWound, KEY_STEP, lift, nudge, turnsOf, WIND_START, WOUND, type Wind } from "@/templates/music-box/wind";
import { ballerina, facing, heartness, swans } from "@/templates/music-box/pose";
import { fieldsSchema, parseFields } from "@/templates/music-box/schema";
import { fieldMeta } from "@/templates/music-box/field-meta";
import { manifest } from "@/templates/music-box/manifest";
import { demoData } from "@/templates/music-box/demo-data";
import { SCRAPS } from "@/templates/_shared/collage/scraps";

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const pitch = (midi: number) => NAMES[midi % 12];
/** The tune's own line: its loudest pins, the melody, in order. */
const melody = (id: keyof typeof TUNES) => {
  const pins = TUNES[id].pins;
  const top = Math.max(...pins.map((p) => p.vel));
  return pins.filter((p) => p.vel === top);
};

describe("the tunes", () => {
  it("names notes the way a score does", () => {
    expect(midiOf("C4")).toBe(60);
    expect(midiOf("A4")).toBe(69);
    expect(midiOf("F#5")).toBe(78);
    expect(midiOf("Bb3")).toBe(58);
    expect(() => midiOf("H2")).toThrow();
  });

  it("opens each piece on its own famous notes", () => {
    expect(melody("swan-lake").slice(0, 6).map((p) => pitch(p.midi))).toEqual(["F#", "B", "C#", "D", "E", "F#"]);
    expect(melody("fur-elise").slice(0, 9).map((p) => pitch(p.midi))).toEqual(["E", "D#", "E", "D#", "E", "B", "D", "C", "A"]);
    // Brahms in F: "Gu-ten A-bend, gut' Nacht" is mi mi sol, mi mi sol.
    expect(melody("lullaby").slice(0, 6).map((p) => pitch(p.midi))).toEqual(["A", "A", "C", "A", "A", "C"]);
    expect(pitch(melody("lullaby").at(-1)!.midi)).toBe("F");
    expect(pitch(melody("swan-lake").at(-1)!.midi)).toBe("B");
    expect(pitch(melody("fur-elise").at(-1)!.midi)).toBe("A");
  });

  it("keeps every pin in order, inside the piece, and on a comb's range", () => {
    for (const id of TUNE_IDS) {
      const tune = TUNES[id];
      expect(tune.id).toBe(id);
      tune.pins.forEach((pin, i) => {
        if (i) expect(pin.at).toBeGreaterThanOrEqual(tune.pins[i - 1].at);
        expect(pin.at).toBeGreaterThanOrEqual(0);
        expect(pin.at).toBeLessThan(tune.length);
        expect(pin.midi).toBeGreaterThanOrEqual(48);
        expect(pin.midi).toBeLessThanOrEqual(96);
        expect(pin.vel).toBeGreaterThan(0);
        expect(pin.vel).toBeLessThanOrEqual(1);
      });
      expect(tune.chord).toHaveLength(3);
    }
  });

  it("runs down like a spring: full speed, then slower to the last note, in about half a minute", () => {
    for (const id of TUNE_IDS) {
      const tune = TUNES[id];
      expect(speedAt(tune, 0)).toBe(1);
      expect(speedAt(tune, tune.slowFrom)).toBe(1);
      expect(speedAt(tune, tune.length)).toBeCloseTo(tune.slowTo, 6);
      const seconds = tuneSeconds(tune);
      expect(seconds).toBeGreaterThan(20);
      expect(seconds).toBeLessThan(40);
      // Slower means each beat takes longer than the one before it, and never less than at full speed.
      let last = 0;
      for (let b = 0.5; b <= tune.length; b += 0.5) {
        const step = secondsAt(tune, b) - secondsAt(tune, b - 0.5);
        expect(step).toBeGreaterThanOrEqual(last - 1e-9);
        last = step;
      }
    }
  });

  it("turns seconds back into the place in the score", () => {
    for (const id of TUNE_IDS) {
      const tune = TUNES[id];
      for (let b = -2; b <= tune.length + 3; b += 0.37) expect(beatAt(tune, secondsAt(tune, b))).toBeCloseTo(b, 6);
    }
  });

  it("lets the figurine finish where she started, facing you", () => {
    for (const id of TUNE_IDS) {
      const tune = TUNES[id];
      const turns = turnsIn(tune);
      expect(Number.isInteger(turns)).toBe(true);
      expect(turns).toBeGreaterThanOrEqual(6);
      expect(turnAt(tune, 0)).toBe(0);
      expect(turnAt(tune, -3)).toBe(0);
      expect(turnAt(tune, tune.length)).toBe(turns);
      expect(turnAt(tune, tune.length + 10)).toBe(turns);
    }
  });

  it("shows every photo in the mirror, changing only as a turn comes round", () => {
    for (const id of TUNE_IDS) {
      const tune = TUNES[id];
      for (let n = 1; n <= 8; n++) {
        const seen = new Set<number>();
        let last = 0;
        for (let b = 0; b <= tune.length; b += 0.05) {
          const i = photoAt(tune, b, n);
          expect(i).toBeGreaterThanOrEqual(last);
          if (i !== last) {
            // A change lands on a whole turn: just past it, not halfway round.
            const turn = turnAt(tune, b);
            expect(turn - Math.floor(turn)).toBeLessThan(0.05);
          }
          last = i;
          seen.add(i);
        }
        expect([...seen].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i));
      }
      expect(photoAt(tune, 5, 0)).toBe(0);
    }
  });
});

describe("winding the key", () => {
  /** A finger going round in steps of `step` radians, `count` times. */
  const circle = (state: Wind, from: number, step: number, count: number) => {
    let s = state;
    for (let i = 0; i <= count; i++) s = drag(s, fold(from + i * step));
    return s;
  };

  it("winds as far as the finger goes round, whichever way it chooses", () => {
    const clockwise = circle(WIND_START, 0, 0.1, 63);
    expect(clockwise.dir).toBe(1);
    expect(clockwise.wound).toBeCloseTo(6.3, 5);
    const anti = circle(WIND_START, 1, -0.1, 63);
    expect(anti.dir).toBe(-1);
    expect(anti.wound).toBeCloseTo(6.3, 5);
  });

  it("does nothing going backwards, like the ratchet inside", () => {
    const forward = circle(WIND_START, 0, 0.1, 30);
    const back = circle(lift(forward), 3, -0.1, 30);
    expect(back.wound).toBeCloseTo(forward.wound, 9);
    expect(back.dir).toBe(1);
  });

  it("ignores a trembling thumb and a finger that jumps", () => {
    let s = WIND_START;
    for (let i = 0; i < 20; i++) s = drag(s, i % 2 ? 0.05 : -0.05);
    expect(s.wound).toBe(0);
    expect(s.dir).toBe(0);
    const jumped = drag(drag(WIND_START, 0), 2.5);
    expect(jumped.wound).toBe(0);
  });

  it("never winds past full, and counts its clicks and turns", () => {
    expect(nudge(WIND_START, 100).wound).toBe(WOUND);
    expect(isWound(nudge(WIND_START, WOUND))).toBe(true);
    expect(isWound(nudge(WIND_START, WOUND - 0.01))).toBe(false);
    expect(clicksOf(CLICK_STEP * 5 + 0.001)).toBe(5);
    expect(turnsOf(FULL * 2 - 0.001)).toBe(1);
    expect(turnsOf(FULL * 2)).toBe(2);
    // Twelve presses of a key wind it all the way.
    let s = WIND_START;
    for (let i = 0; i < 12; i++) s = nudge(s, KEY_STEP);
    expect(isWound(s)).toBe(true);
  });
});

describe("the figurines", () => {
  it("knows which way she faces", () => {
    const front = facing(0);
    expect(front.f.z).toBeCloseTo(1);
    expect(front.r.x).toBeCloseTo(-1);
    const side = facing(0.25);
    expect(side.f.x).toBeCloseTo(1);
    expect(side.r.z).toBeCloseTo(1);
  });

  it("turns the ballerina: bun, face and bodice come round, the pleats slide", () => {
    const front = ballerina(0);
    const back = ballerina(0.5);
    expect(front.bun.z).toBeLessThan(0);
    expect(back.bun.z).toBeGreaterThan(0);
    expect(front.face.o).toBe(1);
    expect(back.face.o).toBe(0);
    expect(front.seam.o).toBe(1);
    expect(front.lacing.o).toBe(0);
    expect(back.lacing.o).toBe(1);
    // Facing you she's symmetrical; side on she's narrower across the shoulders.
    expect(front.seam.x).toBeCloseTo(0);
    expect(ballerina(0.25).shoulders).toBeLessThan(front.shoulders);
    expect(ballerina(0.1).rim).not.toBe(front.rim);
    expect(ballerina(1).rim).toBe(front.rim);
    // The raised knee swings towards you and away.
    expect(ballerina(0.25).passe.front).not.toBe(ballerina(0.75).passe.front);
  });

  it("brings the swans together as a heart twice a turn", () => {
    for (const turn of [0, 0.5, 1]) {
      const [a, b] = swans(turn);
      expect(a.profile).toBe(1);
      expect(b.profile).toBe(1);
      expect(Math.sign(a.x)).toBe(-Math.sign(b.x));
      // Each faces the other: the one on the left looks right.
      const left = a.x < b.x ? a : b;
      const right = a.x < b.x ? b : a;
      expect(left.side).toBeGreaterThan(0);
      expect(right.side).toBeLessThan(0);
      expect(heartness(turn)).toBe(1);
    }
    const quarter = swans(0.25);
    expect(quarter.every((s) => s.profile === 0)).toBe(true);
    expect(quarter.map((s) => (s.front ? "front" : "back")).sort()).toEqual(["back", "front"]);
    // The nearer swan draws last.
    expect(quarter[0].z).toBeLessThan(quarter[1].z);
    expect(heartness(0.25)).toBe(0);
  });
});

describe("the fields and the gift", () => {
  it("opens on its defaults, and shrugs off a broken draft", () => {
    expect(fieldsSchema.parse({})).toEqual({ figurine: "ballerina", tune: "swan-lake", box: "blush" });
    expect(parseFields({ figurine: "unicorn" })).toEqual({ figurine: "ballerina", tune: "swan-lake", box: "blush" });
    expect(parseFields(undefined).tune).toBe("swan-lake");
  });

  it("labels every option in both languages", () => {
    const shape = fieldsSchema.shape;
    for (const locale of ["en", "es"] as const) {
      for (const [key, field] of Object.entries(shape)) {
        const meta = fieldMeta[locale][key];
        expect(meta?.label, `${locale}.${key}`).toBeTruthy();
        for (const option of field.removeDefault().options) expect(meta.options?.[option], `${locale}.${key}.${option}`).toBeTruthy();
      }
    }
  });

  it("is a premium template for anniversaries first, with a demo in each language", () => {
    expect(manifest.tier).toBe("premium");
    expect(manifest.occasions).toEqual(["anniversary", "mothers-day", "valentines", "wedding"]);
    expect(manifest.name).toEqual({ en: "Music Box", es: "Caja de música" });
    for (const locale of ["en", "es"] as const) {
      const demo = demoData[locale];
      expect(demo.photos.length).toBeLessThanOrEqual(manifest.features.photos.max);
      expect(demo.photos.every((p) => p.caption)).toBe(true);
      expect(fieldsSchema.safeParse(demo.fields).success).toBe(true);
    }
  });

  it("has every cut-out it uses in the catalogue", () => {
    for (const id of ["wax-seal-swans", "wax-seal-hibiscus", "bow-satin-pink", "bow-satin-mini", "fan-lace", "paper-roses", "paper-script", "paper-blossom"] as const) expect(SCRAPS[id]).toBeDefined();
  });
});
