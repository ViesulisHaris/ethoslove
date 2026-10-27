import { describe, expect, it } from "vitest";
import { describeObjectSchema } from "@/lib/editor/zod-describe";
import { template } from "@/templates/seance";
import { BOARD, buildTour, GOODBYE, HOME, LETTERS, LEAD_MS, normalizeSpell, reachedAt, sampleTour, SPELLABLE } from "@/templates/seance/board";
import { fieldsSchema } from "@/templates/seance/schema";
import { LOOKS } from "@/templates/seance/looks";

describe("the board", () => {
  it("has every letter and number, each inside the board", () => {
    expect(SPELLABLE.sort()).toEqual([..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"].sort());
    for (const [ch, p] of Object.entries(LETTERS)) {
      expect(p.x, ch).toBeGreaterThan(2);
      expect(p.x, ch).toBeLessThan(BOARD.w - 2);
      expect(p.y, ch).toBeGreaterThan(2);
      expect(p.y, ch).toBeLessThan(BOARD.h - 2);
    }
  });

  it("keeps every letter clear of every other, so the window can only be over one", () => {
    const all = Object.entries(LETTERS);
    for (const [a, p] of all) for (const [b, q] of all) if (a < b) expect(Math.hypot(p.x - q.x, p.y - q.y), `${a} and ${b}`).toBeGreaterThan(4.5);
  });

  it("puts the starting place and the goodbye on the board, away from the letters", () => {
    for (const spot of [HOME, GOODBYE]) {
      expect(spot.x).toBeGreaterThan(0);
      expect(spot.y).toBeLessThan(BOARD.h);
    }
    for (const p of Object.values(LETTERS)) expect(Math.hypot(p.x - GOODBYE.x, p.y - GOODBYE.y)).toBeGreaterThan(6);
  });
});

describe("what the spirit can say", () => {
  it("writes capitals, folds accents and drops what the board cannot say", () => {
    expect(normalizeSpell("quédate conmigo", "X")).toBe("QUEDATE CONMIGO");
    expect(normalizeSpell("te quiero, Ñoño!", "X")).toBe("TE QUIERO NONO");
    expect(normalizeSpell("i'm   yours", "X")).toBe("IM YOURS");
    expect(normalizeSpell("so-so", "X")).toBe("SO SO");
    expect(normalizeSpell("Straße", "X")).toBe("STRASSE");
  });

  it("falls back to the template's own words when nothing can be spelled", () => {
    expect(normalizeSpell("", "I LOVE YOU")).toBe("I LOVE YOU");
    expect(normalizeSpell(undefined, "I LOVE YOU")).toBe("I LOVE YOU");
    expect(normalizeSpell("???  ♥", "I LOVE YOU")).toBe("I LOVE YOU");
    expect(normalizeSpell("   ", "TE QUIERO")).toBe("TE QUIERO");
  });

  it("never spells more than 22 characters, and never ends on a space", () => {
    const long = normalizeSpell("a".repeat(40), "X");
    expect(long).toHaveLength(22);
    expect(normalizeSpell("abcdefghijklmnopqrstu vwxyz", "X").endsWith(" ")).toBe(false);
  });
});

describe("the planchette's journey", () => {
  const text = "STAY WITH ME";
  const tour = buildTour(text, 7);

  it("has one stop per character, in order, each starting after the last has ended", () => {
    expect(tour.legs.map((l) => l.char).join("")).toBe(text);
    let at = LEAD_MS;
    for (const leg of tour.legs) {
      expect(leg.start).toBeGreaterThanOrEqual(at);
      at = leg.start + leg.move + leg.dwell;
    }
    expect(tour.goodbye.start).toBeGreaterThan(at - 1);
    expect(tour.total).toBe(tour.goodbye.start + tour.goodbye.move + tour.goodbye.dwell);
  });

  it("is the same for the same seed and different for another", () => {
    expect(buildTour(text, 7)).toEqual(tour);
    expect(buildTour(text, 8).legs[0].to).not.toEqual(tour.legs[0].to);
  });

  it("takes about a second a letter, so a short message is over in seconds and a long one in under twenty", () => {
    expect(tour.total).toBeGreaterThan(5000);
    expect(buildTour("A".repeat(22), 1).total).toBeLessThan(20000);
  });

  it("sits at its starting place before it begins, and on each letter when it gets there", () => {
    const first = sampleTour(tour, 0);
    expect(first.phase).toBe("idle");
    expect(Math.hypot(first.x - HOME.x, first.y - HOME.y)).toBeLessThan(0.2);
    for (const leg of tour.legs) {
      if (leg.char === " ") continue;
      const at = sampleTour(tour, leg.start + leg.move + leg.dwell - 1);
      const letter = LETTERS[leg.char];
      expect(Math.hypot(at.x - letter.x, at.y - letter.y), leg.char).toBeLessThan(0.7);
    }
  });

  it("ends on the goodbye, and stays there", () => {
    for (const t of [tour.total, tour.total + 5000]) {
      const at = sampleTour(tour, t);
      expect(at.phase).toBe("end");
      expect(Math.hypot(at.x - GOODBYE.x, at.y - GOODBYE.y)).toBeLessThan(0.01);
    }
  });

  it("never leaves the board on the way", () => {
    for (let t = 0; t <= tour.total; t += 25) {
      const at = sampleTour(tour, t);
      expect(at.x).toBeGreaterThan(0);
      expect(at.x).toBeLessThan(BOARD.w);
      expect(at.y).toBeGreaterThan(0);
      expect(at.y).toBeLessThan(BOARD.h);
      expect(Math.abs(at.tilt)).toBeLessThan(14);
    }
  });

  it("counts the letters reached, from none to all, and never backwards", () => {
    expect(reachedAt(tour, 0)).toBe(0);
    expect(reachedAt(tour, tour.total)).toBe(text.length);
    let last = 0;
    for (let t = 0; t <= tour.total; t += 40) {
      const n = reachedAt(tour, t);
      expect(n).toBeGreaterThanOrEqual(last);
      last = n;
    }
  });
});

describe("the séance as a template", () => {
  it("is a premium Halloween gift with a poster and a preview", () => {
    expect(template.manifest.tier).toBe("premium");
    expect(template.manifest.occasions[0]).toBe("halloween");
    expect(template.manifest.thumbnail.poster).toBe("/templates/seance/poster.jpg");
    expect(template.manifest.thumbnail.webm).toBe("/templates/seance/preview.webm");
  });

  it("makes a complete, publishable gift from no fields at all", () => {
    expect(fieldsSchema.parse({})).toEqual({ look: "candle" });
    expect(fieldsSchema.safeParse({ look: "plaid" }).success).toBe(false);
    expect(fieldsSchema.safeParse({ spell: "x".repeat(23) }).success).toBe(false);
  });

  it("asks for the words first, and labels every field and option in both languages", () => {
    expect(template.leadFields?.keys).toEqual(["spell", "look"]);
    const fields = describeObjectSchema(fieldsSchema);
    for (const locale of ["en", "es"] as const) {
      const meta = template.fieldMeta?.[locale] ?? {};
      for (const field of fields) expect(meta[field.key]?.label, `${locale}.${field.key}`).toBeTruthy();
      expect(Object.keys(meta.look?.options ?? {}).sort()).toEqual(Object.keys(LOOKS).sort());
    }
  });
});
