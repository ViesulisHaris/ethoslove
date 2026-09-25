import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MEME_IDS, MEMES, memeSrc, withTag } from "@/templates/_shared/memes/catalogue";
import { addPop, ageDigits, arrangePhotos, bannerRows, candleLayout, candlePlan, GUESTS, letterSize, listHeight, MAX_POPS, nameSize, photosHeight, planGuests, popAt, scatter, shoutFor, stripCellY, stripHeight, wordFace, type Pop } from "@/templates/party-animals/scene";
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

describe("party animals: the page", () => {
  it("puts every photo in exactly one frame, the first under the headline", () => {
    for (let n = 0; n <= 7; n++) {
      const plan = arrangePhotos(n);
      const used = [plan.hero, plan.word, ...plan.strip, ...plan.loose].filter((i) => i !== undefined).sort((a, b) => a! - b!);
      expect(used, `${n} photos`).toEqual(Array.from({ length: n }, (_, i) => i));
      expect(plan.strip.length === 0 || plan.strip.length >= 2).toBe(true);
    }
    expect(arrangePhotos(1).hero).toBe(0);
    expect(arrangePhotos(3).loose).toEqual([2]);
    expect(arrangePhotos(6).strip).toEqual([2, 3, 4, 5]);
    expect(arrangePhotos(12).loose).toEqual([6]);
  });

  it("makes room for the strip, and nothing for a second photo that isn't there", () => {
    expect(stripHeight(0)).toBe(0);
    expect(stripHeight(3)).toBeGreaterThan(stripHeight(2));
    expect(stripCellY(1)).toBeGreaterThan(stripCellY(0));
    expect(photosHeight(arrangePhotos(1))).toBe(0);
    for (let n = 4; n <= 7; n++) {
      const plan = arrangePhotos(n);
      expect(photosHeight(plan)).toBeGreaterThan(stripCellY(plan.strip.length - 1) + 10);
    }
  });

  it("invites the same ten guests to every party, once each, spread down the page", () => {
    for (let n = 1; n <= 7; n++) {
      for (const song of [true, false]) {
        const guests = planGuests(n, song, 1234);
        expect(guests.map((g) => g.id)).toEqual(GUESTS);
        expect(new Set(guests.map((g) => g.id)).size).toBe(10);
        guests.forEach((g, i) => {
          expect(g.index).toBe(i);
          expect(MEMES[g.id].tags).toContain("party");
          expect(g.x - g.w / 2).toBeGreaterThan(-3);
          expect(g.x + g.w / 2).toBeLessThan(103);
        });
        expect(new Set(guests.map((g) => g.section)).size).toBeGreaterThanOrEqual(4);
        expect(planGuests(n, song, 1234)).toEqual(guests);
      }
    }
  });

  it("sends the guests of a missing section to the guest list instead", () => {
    const bare = planGuests(1, false, 7);
    for (const id of ["hamster-cake", "sad-hamster", "balloon-cat"]) expect(bare.find((g) => g.id === id)?.section).toBe("list");
    const full = planGuests(6, true, 7);
    expect(full.find((g) => g.id === "hamster-cake")?.section).toBe("photos");
    expect(full.find((g) => g.id === "balloon-cat")?.section).toBe("song");
    expect(listHeight(bare)).toBeGreaterThan(listHeight(full));
  });

  it("breaks the banner by word, and sizes the letters and the name to fit", () => {
    expect(bannerRows("happy birthday")).toEqual(["happy", "birthday"]);
    expect(bannerRows("we did it")).toEqual(["we did it"]);
    expect(bannerRows("  ")).toEqual([]);
    for (const rows of [["happy", "birthday"], ["congratulations"], ["feliz", "cumple"]]) expect(letterSize(rows) * Math.max(...rows.map((r) => r.length)) * 0.95).toBeLessThanOrEqual(66.01);
    expect(nameSize("Ana")).toBe(14);
    expect(nameSize("Maximiliano")).toBeLessThan(nameSize("Ana"));
    expect(nameSize("a name far too long to ever fit on one line")).toBe(5.2);
  });

  it("writes a short word in script and a long one in plain handwriting", () => {
    expect(wordFace("happiness.")).toMatchObject({ script: true });
    expect(wordFace("happiness.").size).toBeLessThanOrEqual(9);
    expect(wordFace("the best year yet!")).toMatchObject({ script: false });
  });

  it("lets the sender's lines go first, then the house ones, with one about their age", () => {
    const house = ["a", "b", "c"];
    expect(shoutFor(0, ["mine", " "], house)).toBe("mine");
    expect(shoutFor(1, ["mine", " "], house)).toBe("a");
    expect(shoutFor(1, [], house, 30, "{age}?? already")).toBe("30?? already");
    expect(shoutFor(1, [], house, undefined, "{age}?? already")).toBe("b");
    expect(shoutFor(7, [], house)).toBe("b");
  });

  it("puts the age in number candles, with thin ones where they don't crowd the number", () => {
    expect(ageDigits(30)).toEqual(["3", "0"]);
    expect(ageDigits(undefined)).toEqual([]);
    expect(ageDigits(400)).toEqual(["1", "2", "0"]);
    expect(candlePlan(undefined)).toEqual({ digits: [], small: 5 });
    for (const age of [undefined, 1, 7, 30, 99, 104]) {
      const candles = candleLayout(candlePlan(age));
      expect(candles.filter((c) => c.kind === "digit").map((c) => c.digit)).toEqual(ageDigits(age));
      // Every flame has room: no two wicks closer than a flame is wide.
      const xs = candles.map((c) => c.x).sort((a, b) => a - b);
      xs.slice(1).forEach((x, i) => expect(x - xs[i], `age ${age}`).toBeGreaterThanOrEqual(14));
      for (const c of candles) {
        expect(c.x).toBeGreaterThan(20);
        expect(c.x).toBeLessThan(180);
        expect(c.wick).toBeGreaterThan(20);
      }
    }
  });

  it("throws the same handful of confetti for the same tap, and sweeps up the oldest past the limit", () => {
    const pop = popAt(3, 40.26, 120.04, 9);
    expect(pop).toMatchObject({ id: 3, x: 40.3, y: 120 });
    expect(pop.bits).toHaveLength(12);
    expect(popAt(3, 40.26, 120.04, 9)).toEqual(pop);
    expect(popAt(4, 40.26, 120.04, 9)).not.toEqual(pop);
    let page: Pop[] = [];
    for (let i = 1; i <= MAX_POPS + 3; i++) page = addPop(page, popAt(i, i, i, 9));
    expect(page).toHaveLength(MAX_POPS);
    expect(page[0].id).toBe(4);
  });

  it("scatters paper on the page inside the stretch it's given, the same way every time", () => {
    const flecks = scatter(5, 30, 120);
    expect(flecks).toHaveLength(30);
    expect(scatter(5, 30, 120)).toEqual(flecks);
    for (const f of flecks) {
      expect(f.x).toBeGreaterThanOrEqual(2);
      expect(f.x).toBeLessThanOrEqual(98);
      expect(f.y).toBeGreaterThanOrEqual(2);
      expect(f.y).toBeLessThanOrEqual(118);
    }
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
