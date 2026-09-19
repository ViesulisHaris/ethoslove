import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MEME_IDS, MEMES, memeSrc, withTag } from "@/templates/_shared/memes/catalogue";
import { bannerRows, letterSize, planFrames, planGuests, shoutFor, stripHeight } from "@/templates/party-animals/scene";
import { caseNumber, exhibitLetter, findingsFor, SEATS, SPEAKING_ORDER, speakerFor } from "@/templates/the-council/hearing";
import { DROPS, packIds, planDrops, restingSpot, sideMargin, stickerWidth } from "@/templates/sticker-bomb/plan";

describe("the meme stickers", () => {
  it("has a file on disk for every sticker in the catalogue", () => {
    expect(MEME_IDS.length).toBeGreaterThanOrEqual(24);
    for (const id of MEME_IDS) {
      expect(existsSync(join(process.cwd(), "public", memeSrc(id))), id).toBe(true);
      expect(MEMES[id].w).toBeGreaterThan(100);
      expect(MEMES[id].name.es.length).toBeGreaterThan(3);
    }
  });

  it("has enough of each kind to fill a page", () => {
    expect(withTag("party").length).toBeGreaterThanOrEqual(10);
    expect(withTag("soft").length).toBeGreaterThanOrEqual(8);
    expect(withTag("cat").length).toBeGreaterThanOrEqual(12);
  });
});

describe("party animals: the collage", () => {
  it("fills the big polaroid first, then the wide one, then the strip", () => {
    expect(planFrames(0)).toEqual([]);
    expect(planFrames(1).map((f) => f.kind)).toEqual(["big"]);
    expect(planFrames(2).map((f) => f.kind)).toEqual(["big", "wide"]);
    expect(planFrames(3).map((f) => f.kind)).toEqual(["big", "wide", "small"]);
    expect(planFrames(4).map((f) => f.kind)).toEqual(["big", "wide", "strip"]);
    expect(planFrames(7).map((f) => f.kind)).toEqual(["big", "wide", "strip", "small"]);
  });

  it("shows every photo exactly once, whatever the count", () => {
    for (let n = 1; n <= 7; n++) {
      const used = planFrames(n).flatMap((f) => f.photos).sort((a, b) => a - b);
      expect(used).toEqual(Array.from({ length: n }, (_, i) => i));
    }
    expect(planFrames(12).flatMap((f) => f.photos)).toHaveLength(7);
  });

  it("keeps a strip of four inside the page", () => {
    expect(23.5 + stripHeight(4)).toBeLessThan(80);
    expect(stripHeight(2)).toBeLessThan(stripHeight(3));
  });

  it("invites at least nine guests, no one twice, all on the page, the same every time", () => {
    for (let n = 1; n <= 7; n++) {
      const guests = planGuests(n, 1234);
      expect(guests.length).toBeGreaterThanOrEqual(9);
      expect(new Set(guests.map((g) => g.id)).size).toBe(guests.length);
      for (const g of guests) {
        expect(g.x).toBeGreaterThan(4);
        expect(g.x).toBeLessThan(96);
        expect(g.y).toBeGreaterThan(12);
        expect(g.y).toBeLessThan(94);
        expect(MEMES[g.id].tags).toContain("party");
      }
      expect(planGuests(n, 1234)).toEqual(guests);
    }
  });

  it("breaks the banner by word and shrinks the letters to fit", () => {
    expect(bannerRows("happy birthday")).toEqual(["happy", "birthday"]);
    expect(bannerRows("we did it")).toEqual(["we did it"]);
    expect(bannerRows("  ")).toEqual([]);
    expect(letterSize(["happy", "birthday"])).toBeLessThanOrEqual(8.8);
    expect(letterSize(["congratulations"]) * 15).toBeLessThan(90);
  });

  it("lets the sender's lines go first, then the house ones, with one about their age", () => {
    const house = ["a", "b", "c"];
    expect(shoutFor(0, ["mine", " "], house)).toBe("mine");
    expect(shoutFor(1, ["mine", " "], house)).toBe("a");
    expect(shoutFor(1, [], house, 30, "{age}?? already")).toBe("30?? already");
    expect(shoutFor(1, [], house, undefined, "{age}?? already")).toBe("b");
    expect(shoutFor(7, [], house)).toBe("b");
  });
});

describe("the council: the hearing", () => {
  it("seats five cats across the bench, left to right", () => {
    expect(SEATS).toHaveLength(5);
    const xs = SEATS.map((s) => s.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    expect(SEATS[2].id).toBe("lawyer");
    for (const seat of SEATS) expect(MEMES[seat.id]).toBeDefined();
  });

  it("opens with the chair and hears from everyone before anyone speaks twice", () => {
    expect(speakerFor(0)).toBe(2);
    expect(new Set(SPEAKING_ORDER).size).toBe(5);
    expect(speakerFor(5)).toBe(speakerFor(0));
  });

  it("reads the sender's findings, or the house ones when there are none", () => {
    const house = ["h1", "h2", "h3"];
    expect(findingsFor([], house)).toEqual(house);
    expect(findingsFor(["  ", ""], house)).toEqual(house);
    expect(findingsFor([" stole my chips ", ""], house)).toEqual(["stole my chips"]);
    expect(findingsFor(Array(9).fill("x"), house)).toHaveLength(6);
  });

  it("letters the exhibits and files the case under a stable number", () => {
    expect([0, 1, 2].map(exhibitLetter)).toEqual(["A", "B", "C"]);
    expect(caseNumber(99)).toMatch(/^[A-W]{2}-\d{4}$/);
    expect(caseNumber(99)).toBe(caseNumber(99));
    expect(caseNumber(100)).not.toBe(caseNumber(99));
  });
});

describe("sticker bomb: what lands", () => {
  it("plans twelve drops, the same for the same seed", () => {
    const drops = planDrops("chaos", 3, ["one", "two"], 77);
    expect(drops).toHaveLength(DROPS);
    expect(planDrops("chaos", 3, ["one", "two"], 77)).toEqual(drops);
    expect(planDrops("chaos", 3, ["one", "two"], 78)).not.toEqual(drops);
  });

  it("puts the sender's photos on every other tap, each once", () => {
    const drops = planDrops("cats", 4, [], 5);
    const photos = drops.flatMap((d, i) => (d.kind === "photo" ? [{ i, photo: d.photo }] : []));
    expect(photos.map((p) => p.photo)).toEqual([0, 1, 2, 3]);
    expect(photos.every((p) => p.i % 2 === 1)).toBe(true);
    expect(planDrops("cats", 20, [], 5).filter((d) => d.kind === "photo")).toHaveLength(6);
    expect(planDrops("cats", 0, [], 5).every((d) => d.kind === "meme")).toBe(true);
  });

  it("never lands the same sticker twice in a row, and stays inside its pack", () => {
    for (const pack of ["chaos", "cats", "party", "soft"] as const) {
      const allowed = new Set(packIds(pack));
      const memes = planDrops(pack, 0, [], 11).flatMap((d) => (d.kind === "meme" ? [d.meme] : []));
      expect(memes).toHaveLength(DROPS);
      memes.forEach((id, i) => {
        expect(allowed.has(id)).toBe(true);
        if (i > 0) expect(id).not.toBe(memes[i - 1]);
      });
    }
    expect(packIds("cats").some((id) => MEMES[id].tags.includes("party"))).toBe(false);
  });

  it("sticks the labels on in order, skipping blanks, and gives them room", () => {
    const drops = planDrops("chaos", 0, ["first", " ", "second"], 3);
    const labelled = drops.flatMap((d) => (d.kind === "meme" && d.label ? [d] : []));
    expect(labelled.map((d) => d.label)).toEqual(["first", "second"]);
    expect(sideMargin(labelled[0])).toBeGreaterThan(sideMargin(drops.find((d) => d.kind === "meme" && !d.label)!));
  });

  it("rests every drop on the page, and draws tall stickers narrower", () => {
    for (let i = 0; i < DROPS; i++) {
      const spot = restingSpot(i, DROPS, 9);
      expect(spot.x).toBeGreaterThanOrEqual(12);
      expect(spot.x).toBeLessThanOrEqual(88);
      expect(spot.y).toBeGreaterThanOrEqual(9);
      expect(spot.y).toBeLessThanOrEqual(86);
    }
    expect(stickerWidth("tulips", 30)).toBeLessThan(stickerWidth("rat", 30));
  });
});
