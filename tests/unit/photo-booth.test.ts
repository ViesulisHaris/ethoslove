import { describe, expect, it } from "vitest";
import { createGiftSchema } from "@/lib/gift/schema";
import { SCRAPS } from "@/templates/_shared/collage/scraps";
import { BOOTHS } from "@/templates/photo-booth/looks";
import { fieldMeta } from "@/templates/photo-booth/field-meta";
import { fieldsSchema } from "@/templates/photo-booth/schema";
import { demoData } from "@/templates/photo-booth/demo-data";
import { BOOTH_W, POSES, SHOTS, TIMING, boothProgress, cameraTransform, extraPhotos, framing, poseBeats, signLines, signSize, stampDate, stripFilter, stripFrames } from "@/templates/photo-booth/plan";

describe("Photo Booth: the strip", () => {
  it("always prints four frames, repeating fewer photos in new poses", () => {
    expect(stripFrames([])).toEqual(Array.from({ length: 4 }, () => ({ photo: undefined, pose: 0 })));
    expect(stripFrames(["a"])).toEqual([0, 1, 2, 3].map((pose) => ({ photo: "a", pose })));
    expect(stripFrames(["a", "b"]).map((f) => `${f.photo}${f.pose}`)).toEqual(["a0", "b0", "a1", "b1"]);
    expect(stripFrames(["a", "b", "c"]).map((f) => `${f.photo}${f.pose}`)).toEqual(["a0", "b0", "c0", "a1"]);
    expect(stripFrames(["a", "b", "c", "d", "e", "f"]).map((f) => `${f.photo}${f.pose}`)).toEqual(["a0", "b0", "c0", "d0"]);
  });

  it("frames the first pose as the photo is, and every later one closer, each differently", () => {
    expect(framing(0).zoom).toBe(1);
    const later = [1, 2, 3].map(framing);
    for (const f of later) expect(f.zoom).toBeGreaterThan(1);
    expect(new Set(later.map((f) => `${f.x},${f.y}`)).size).toBe(3);
    expect(framing(4)).toEqual(framing(0));
  });

  it("prints a second strip from four more photos and pins up the rest", () => {
    const photos = Array.from({ length: 10 }, (_, i) => i);
    expect(extraPhotos(photos.slice(0, 4))).toEqual({ second: [], pinned: [] });
    expect(extraPhotos(photos.slice(0, 5))).toEqual({ second: [], pinned: [4] });
    expect(extraPhotos(photos.slice(0, 7))).toEqual({ second: [], pinned: [4, 5, 6] });
    expect(extraPhotos(photos.slice(0, 8))).toEqual({ second: [4, 5, 6, 7], pinned: [] });
    expect(extraPhotos(photos)).toEqual({ second: [4, 5, 6, 7], pinned: [8, 9] });
  });

  it("develops from one grade to another through the same five filter functions", () => {
    const shape = (f: string) => f.replace(/\([^)]*\)/g, "()");
    const wet = stripFilter("color", false);
    for (const filter of ["color", "bw", "sepia"] as const) {
      const dry = stripFilter(filter, true);
      expect(shape(dry)).toBe(shape(wet));
      expect(dry).not.toBe(wet);
    }
    expect(stripFilter("bw", false)).toBe(wet);
    expect(stripFilter("bw", true)).toContain("grayscale(1)");
    expect(stripFilter("color", true)).toContain("grayscale(0)");
    expect(stripFilter("sepia", true)).toMatch(/sepia\(0\.[5-9]/);
  });

  it("stamps the day it prints, the same way in every language", () => {
    expect(stampDate(new Date(2027, 1, 14))).toBe("14 · 02 · 2027");
    expect(stampDate(new Date(2026, 10, 3))).toBe("03 · 11 · 2026");
  });
});

describe("Photo Booth: the camera", () => {
  // A phone 390 wide with 796 of gift under the demo bar: 1cqw = 3.9px, 1cqh = 7.96px, --k = 3.9px.
  const phone = { cqw: 3.9, cqh: 7.96, k: 3.9 };
  const top = Math.max(9 * phone.k, (100 * phone.cqh - 178 * phone.k) / 2);

  /** Where a point of the booth lands on screen once the camera's transform is applied. */
  function onScreen(transform: string, x: number, y: number) {
    const match = transform.match(/calc\(([-\d.]+) \* 50cqw \+ ([-\d.]+) \* var\(--k\)\), calc\(47cqh - ([-\d.]+) \* var\(--top\) - ([-\d.]+) \* var\(--k\)\)\) scale\(([-\d.]+)\)/);
    expect(match).not.toBeNull();
    const [a, b, c, d, zoom] = match!.slice(1).map(Number);
    const tx = a * 50 * phone.cqw + b * phone.k;
    const ty = 47 * phone.cqh - c * top - d * phone.k;
    const left = 50 * phone.cqw - (BOOTH_W / 2) * phone.k;
    return { x: tx + zoom * (left + x * phone.k), y: ty + zoom * (top + y * phone.k) };
  }

  it("rests at the full shot and moves in with the same two functions, so it can travel between shots", () => {
    expect(cameraTransform("full")).toBe("translate(0px, 0px) scale(1)");
    for (const shot of ["inside", "print"] as const) {
      const t = cameraTransform(shot);
      expect(t).toMatch(/^translate\(.+\) scale\([\d.]+\)$/);
      expect(t).toContain(`scale(${SHOTS[shot].zoom})`);
    }
  });

  it("puts what each shot looks at in the middle of the screen, a little above centre", () => {
    for (const shot of ["inside", "print"] as const) {
      const { x, y } = SHOTS[shot];
      const p = onScreen(cameraTransform(shot), x, y);
      expect(p.x).toBeCloseTo(50 * phone.cqw, 3);
      expect(p.y).toBeCloseTo(47 * phone.cqh, 3);
    }
  });

  it("keeps the whole camera panel on a phone when it goes inside", () => {
    const t = cameraTransform("inside");
    const panelTop = onScreen(t, 11, 38);
    const panelBottom = onScreen(t, 41, 110);
    expect(panelTop.x).toBeGreaterThan(0);
    expect(panelTop.y).toBeGreaterThan(0);
    expect(panelBottom.x).toBeLessThan(100 * phone.cqw);
    expect(panelBottom.y).toBeLessThan(100 * phone.cqh);
  });
});

describe("Photo Booth: the beats", () => {
  it("counts three, two, one, flashes, then lights the button again", () => {
    const beats = poseBeats(false);
    expect(beats.filter((b) => b.beat === "count").map((b) => b.n)).toEqual([3, 2, 1]);
    expect(beats.map((b) => b.beat).slice(-2)).toEqual(["flash", "ready"]);
    for (let i = 1; i < beats.length; i++) expect(beats[i].at).toBeGreaterThan(beats[i - 1].at);
    expect(beats.find((b) => b.beat === "flash")!.at).toBe(3 * TIMING.step);
  });

  it("without motion, takes the picture the moment the button goes down", () => {
    const beats = poseBeats(true);
    expect(beats.some((b) => b.beat === "count")).toBe(false);
    expect(beats[0]).toEqual({ at: 0, beat: "flash" });
    expect(beats.at(-1)!.beat).toBe("ready");
  });

  it("reports progress that only goes forward, and leaves the last third for reading", () => {
    const steps = [boothProgress("curtain"), ...[1, 2, 3, 4].map((n) => boothProgress("shot", n)), boothProgress("printed"), boothProgress("wall")];
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeGreaterThan(steps[i - 1]);
    expect(steps.at(-1)).toBeLessThanOrEqual(70);
    expect(boothProgress("shot", 9)).toBe(boothProgress("shot", POSES));
  });
});

describe("Photo Booth: the sign", () => {
  it("breaks at the middle dot into two lines at most", () => {
    expect(signLines("PHOTOS · 4 POSES")).toEqual(["PHOTOS", "4 POSES"]);
    expect(signLines("kissing booth")).toEqual(["kissing booth"]);
    expect(signLines("a · b · c")).toEqual(["a", "b · c"]);
    expect(signLines("  ·  ")).toEqual([""]);
  });

  it("sets a longer line smaller, never above its largest size", () => {
    expect(signSize("PHOTOS", 44, 9.4)).toBe(9.4);
    expect(signSize("KISSING BOOTH", 44, 9.4)).toBeLessThan(9.4);
    expect(signSize("a".repeat(24), 44, 9.4)).toBeLessThan(signSize("a".repeat(12), 44, 9.4));
    // 24 letters, the field's limit, still fit the sign's face.
    expect(24 * 0.74 * signSize("a".repeat(24), 44, 9.4)).toBeLessThanOrEqual(44.01);
  });
});

describe("Photo Booth: fields and demo", () => {
  it("has a look for every booth, and labels for every option in both languages", () => {
    const shape = fieldsSchema.shape;
    expect(Object.keys(BOOTHS).sort()).toEqual([...shape.booth.unwrap().options].sort());
    for (const locale of ["en", "es"] as const) {
      const meta = fieldMeta[locale];
      expect(Object.keys(meta).sort()).toEqual(Object.keys(shape).sort());
      for (const id of shape.booth.unwrap().options) expect(meta.booth.options?.[id]).toBeTruthy();
      for (const id of shape.filter.unwrap().options) expect(meta.filter.options?.[id]).toBeTruthy();
    }
  });

  it("publishes with no fields at all, and keeps the sign short enough to light", () => {
    expect(fieldsSchema.parse({})).toEqual({ booth: "cherry", filter: "color" });
    expect(fieldsSchema.safeParse({ sign: "x".repeat(25) }).success).toBe(false);
  });

  it("is the same gift in both languages: the same photos, the same booth", () => {
    const schema = createGiftSchema(fieldsSchema);
    const [en, es] = [demoData.en, demoData.es];
    expect(schema.safeParse(en).success).toBe(true);
    expect(schema.safeParse(es).success).toBe(true);
    expect(es.photos.map((p) => p.id)).toEqual(en.photos.map((p) => p.id));
    expect({ ...es.fields, line: undefined }).toEqual({ ...en.fields, line: undefined });
    expect(es.message).not.toBe(en.message);
  });

  it("uses cut-outs that are in the catalogue", () => {
    for (const id of ["teddy-hug", "penguins-plush", "wax-seal-heart", "envelopes-pair", "heart-puffy", "heart-gingham", "tulips-wrapped", "sunflowers-kraft"] as const) {
      expect(SCRAPS[id]?.id).toBe(id);
    }
  });
});
