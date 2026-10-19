import { describe, expect, it } from "vitest";
import { describeObjectSchema } from "@/lib/editor/zod-describe";
import { template } from "@/templates/bat-swarm";
import { heartPoints, maskArea, maskPoints, pickPoints, stepFor, type P } from "@/templates/bat-swarm/points";
import { buildScript, flapAt, IDLE_BATS, makeBats, moonFor, orbitAt, positionAt, scaleAt, stepAt, TIMING, type Flight } from "@/templates/bat-swarm/flight";
import { FRAMES, frameFor, upFor } from "@/templates/bat-swarm/sprites";
import { fieldsSchema } from "@/templates/bat-swarm/schema";
import { LOOKS } from "@/templates/bat-swarm/looks";

/** A mask like a canvas gives back: RGBA, with a filled rectangle where the word would be. */
function box(w: number, h: number, x0: number, y0: number, x1: number, y1: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) rgba[(y * w + x) * 4 + 3] = 255;
  return rgba;
}

describe("where the bats go", () => {
  const rgba = box(100, 60, 10, 10, 90, 50);

  it("reads the points of a mask, and only the points inside it", () => {
    const area = maskArea(rgba, 100, 60);
    expect(area).toBe(80 * 40);
    const points = maskPoints(rgba, 100, 60, 4);
    expect(points.length).toBeGreaterThan(150);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(10);
      expect(p.x).toBeLessThan(90);
      expect(p.y).toBeGreaterThanOrEqual(10);
      expect(p.y).toBeLessThan(50);
    }
  });

  it("finds a grid step that leaves at least about the bats asked for, never a flood of them", () => {
    // The step is a whole number of pixels, so a small shape can give a pool a little over twice the
    // size: fine, the extras are thinned. What matters is that there are enough, and not absurdly many.
    const area = maskArea(rgba, 100, 60);
    for (const count of [200, 320, 500]) {
      const points = maskPoints(rgba, 100, 60, stepFor(area, count));
      expect(points.length).toBeGreaterThan(count * 0.7);
      expect(points.length).toBeLessThan(count * 4);
    }
  });

  it("gives every bat a place: thins a big pool, tops up a small one, and is the same each time", () => {
    const pool: P[] = Array.from({ length: 50 }, (_, i) => ({ x: i, y: i % 7 }));
    const few = pickPoints(pool, 20, 3);
    expect(few).toHaveLength(20);
    expect(new Set(few.map((p) => `${p.x},${p.y}`)).size).toBe(20);
    const many = pickPoints(pool, 130, 3);
    expect(many).toHaveLength(130);
    expect(pickPoints(pool, 130, 3)).toEqual(many);
    expect(pickPoints(pool, 130, 4)).not.toEqual(many);
    expect(pickPoints([], 10, 1)).toEqual([]);
  });

  it("fills a heart: inside its box, centred where asked, and wider at the top than at the point", () => {
    const heart = heartPoints(600, 200, 150, 120, 5);
    expect(heart).toHaveLength(600);
    for (const p of heart) {
      expect(p.x).toBeGreaterThan(200 - 62);
      expect(p.x).toBeLessThan(200 + 62);
      expect(p.y).toBeGreaterThan(150 - 66);
      expect(p.y).toBeLessThan(150 + 66);
    }
    const upper = heart.filter((p) => p.y < 150 - 20);
    const lower = heart.filter((p) => p.y > 150 + 30);
    const width = (ps: P[]) => Math.max(...ps.map((p) => p.x)) - Math.min(...ps.map((p) => p.x));
    expect(width(upper)).toBeGreaterThan(width(lower));
    expect(heartPoints(600, 200, 150, 120, 5)).toEqual(heart);
  });
});

describe("the flight", () => {
  const moon = moonFor(390, 844);
  const bats = makeBats(120, 9);
  const script = buildScript(3);
  const targets = [0, 1, 2].map((k) => bats.map((_, i) => ({ x: 40 + ((i * 7 + k * 31) % 300), y: 300 + ((i * 13 + k * 17) % 120) })));
  const flight: Flight = { bats, script, moon, targets, idleClock: 4 };

  it("sizes the moon to the width of a phone and the height of a laptop", () => {
    expect(moonFor(390, 844).r).toBeCloseTo(390 * 0.43, 5);
    expect(moonFor(1280, 720).r).toBeCloseTo(720 * 0.27, 5);
    expect(moonFor(390, 844).cx).toBe(195);
  });

  it("runs emerge, orbit, then a form and a hold for each shape, then scatter", () => {
    expect(script.steps.map((s) => s.kind)).toEqual(["emerge", "orbit", "form", "hold", "form", "hold", "form", "hold", "scatter"]);
    for (let i = 1; i < script.steps.length; i++) expect(script.steps[i].t0).toBeCloseTo(script.steps[i - 1].t1, 9);
    expect(script.total).toBeCloseTo(TIMING.emerge + TIMING.orbit + 2 * (TIMING.gather + TIMING.hold) + TIMING.gather + TIMING.holdLast + TIMING.scatter, 9);
    expect(stepAt(script, 0).step.kind).toBe("emerge");
    expect(stepAt(script, script.total + 3).step.kind).toBe("scatter");
  });

  it("is a pure function of time: asked twice, it says the same", () => {
    for (const t of [0.3, 1.9, 4.2, 6.1, 9.9, 12.4]) for (const i of [0, 40, 119]) expect(positionAt(flight, i, t)).toEqual(positionAt(flight, i, t));
  });

  it("starts the idle bats circling at once, and keeps the rest hidden until they leave the moon", () => {
    expect(positionAt(flight, 0, 0).visible).toBe(true);
    expect(IDLE_BATS).toBeLessThan(bats.length);
    const late = bats.findIndex((b, i) => i >= IDLE_BATS && b.delay > 0.5);
    expect(late).toBeGreaterThan(-1);
    expect(positionAt(flight, late, 0.1).visible).toBe(false);
    expect(positionAt(flight, late, 1.7).visible).toBe(true);
  });

  it("joins up: a bat is where it was going when the orbit ends and the first shape begins", () => {
    const form = script.steps[2];
    for (const i of [0, 30, 90]) {
      const before = positionAt(flight, i, form.t0 - 1e-6);
      const after = positionAt(flight, i, form.t0 + 1e-6);
      expect(Math.hypot(before.x - after.x, before.y - after.y)).toBeLessThan(0.5);
    }
  });

  it("puts every bat on its point for a shape by the end of its form, and keeps it within a pixel or two while it holds", () => {
    for (const [k, form] of script.steps.filter((s) => s.kind === "form").entries()) {
      for (const i of [3, 44, 117]) {
        const at = positionAt(flight, i, form.t1);
        expect(Math.hypot(at.x - targets[k][i].x, at.y - targets[k][i].y), `shape ${k} bat ${i}`).toBeLessThan(1.8);
      }
    }
    const hold = script.steps[3];
    for (let t = hold.t0; t < hold.t1; t += 0.2) {
      const at = positionAt(flight, 44, t);
      expect(Math.hypot(at.x - targets[0][44].x, at.y - targets[0][44].y)).toBeLessThan(2.2);
    }
  });

  it("sends every bat off the edge of a phone by the time the scatter is over", () => {
    const end = script.total;
    for (let i = 0; i < bats.length; i++) {
      const at = positionAt(flight, i, end);
      const gone = at.x < -20 || at.x > 410 || at.y < -20 || at.y > 864;
      expect(gone, `bat ${i} at ${Math.round(at.x)},${Math.round(at.y)}`).toBe(true);
    }
  });

  it("circles the moon at its own distance, never closer than half its radius", () => {
    for (const bat of bats) for (const t of [0, 1.3, 2.7, 9]) expect(Math.hypot(orbitAt(bat, t, moon).x - moon.cx, orbitAt(bat, t, moon).y - moon.cy)).toBeGreaterThan(moon.r * 0.2);
  });

  it("draws bats big while they fly and small once they are letters", () => {
    expect(scaleAt(script.steps[1], 2)).toBeGreaterThan(1.5);
    const hold = script.steps[3];
    expect(scaleAt(hold, hold.t0 + 0.5)).toBe(1);
    const form = script.steps[2];
    expect(scaleAt(form, form.t0)).toBeGreaterThan(scaleAt(form, form.t1));
    expect(scaleAt(form, form.t1)).toBeCloseTo(1, 5);
    const heart = script.steps[6];
    expect(scaleAt(heart, heart.t0)).toBe(1);
    const scatter = script.steps[8];
    expect(scaleAt(scatter, scatter.t1)).toBeGreaterThan(2);
  });

  it("beats its wings between down and up, slower while it holds", () => {
    const bat = bats[5];
    const seen = Array.from({ length: 200 }, (_, i) => flapAt(bat, "orbit", i / 100));
    expect(Math.min(...seen)).toBeGreaterThan(-1.0001);
    expect(Math.max(...seen)).toBeLessThan(1.0001);
    expect(Math.max(...seen)).toBeGreaterThan(0.95);
    const crossings = (kind: "orbit" | "hold") => Array.from({ length: 400 }, (_, i) => flapAt(bat, kind, i / 100)).filter((v, i, a) => i && (v >= 0) !== (a[i - 1] >= 0)).length;
    expect(crossings("hold")).toBeLessThan(crossings("orbit"));
  });
});

describe("the bat's sprites", () => {
  it("has a frame for every beat, from wings down to wings up", () => {
    expect(upFor(0)).toBe(-1);
    expect(upFor(FRAMES - 1)).toBe(1);
    expect(frameFor(-1)).toBe(0);
    expect(frameFor(1)).toBe(FRAMES - 1);
    expect(frameFor(0)).toBe(Math.round((FRAMES - 1) / 2));
    expect(frameFor(9)).toBe(FRAMES - 1);
    expect(frameFor(-9)).toBe(0);
  });
});

describe("the swarm as a template", () => {
  it("is a premium Halloween gift with a poster and a preview", () => {
    expect(template.manifest.tier).toBe("premium");
    expect(template.manifest.occasions[0]).toBe("halloween");
    expect(template.manifest.thumbnail.poster).toBe("/templates/bat-swarm/poster.jpg");
    expect(template.manifest.heavy).toBe(false);
  });

  it("makes a complete gift from no fields, and holds the line to 14 characters", () => {
    expect(fieldsSchema.parse({})).toEqual({ look: "midnight" });
    expect(fieldsSchema.safeParse({ line: "x".repeat(15) }).success).toBe(false);
    expect(fieldsSchema.safeParse({ line: "be mine" }).success).toBe(true);
  });

  it("asks for the line first, and labels every field and option in both languages", () => {
    expect(template.leadFields?.keys).toEqual(["line", "look"]);
    const fields = describeObjectSchema(fieldsSchema);
    for (const locale of ["en", "es"] as const) {
      const meta = template.fieldMeta?.[locale] ?? {};
      for (const field of fields) expect(meta[field.key]?.label, `${locale}.${field.key}`).toBeTruthy();
      expect(Object.keys(meta.look?.options ?? {}).sort()).toEqual(Object.keys(LOOKS).sort());
    }
  });
});
