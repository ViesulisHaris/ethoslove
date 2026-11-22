import { describe, expect, it } from "vitest";
import { getManifest } from "@/templates/manifests";
import { parseRichText } from "@/lib/gift/rich-text";
import { breakBlock, edgeFade, MOST_PARTS, noteSteps, partLimit, splitWords } from "@/templates/_shared/holiday/steps";
import { frostGrid, REVEAL_AT, strokePoints, wipeAt, wiped, wipedIn } from "@/templates/frosted-window/frost";
import { fieldsSchema as windowSchema } from "@/templates/frosted-window/schema";
import { candleAt, CANDLES, CATCH, nextUnlit, wickAt } from "@/templates/light-the-candles/wicks";
import { DEFAULT_THANKS, fieldsSchema as candlesSchema } from "@/templates/light-the-candles/schema";
import { hooksNear, nextHooks, PER_KEY, REACH, wires } from "@/templates/string-the-lights/string";
import { fieldsSchema as lightsSchema } from "@/templates/string-the-lights/schema";
import { ENOUGH, inside, readyMade } from "@/templates/gingerbread-house/decorate";
import { fieldsSchema as houseSchema } from "@/templates/gingerbread-house/schema";

describe("Frosted Window", () => {
  const board = { u0: 0.4, v0: 0.3, u1: 0.75, v1: 0.5 };

  it("clears only what the finger passes over, and a stroke leaves no gaps", () => {
    const grid = frostGrid(30, 40);
    expect(wiped(grid)).toBe(0);
    for (const p of strokePoints({ u: 0, v: 0.8 }, { u: 1, v: 0.8 }, 0.1, 1.3)) wipeAt(grid, p.u, p.v, 0.1, 1.3);
    // a band right across the glass near its foot: every cell along its middle row is clear
    const row = Math.floor(0.8 * 40);
    for (let c = 0; c < 30; c++) expect(grid.cells[row * 30 + c]).toBe(1);
    // and nothing anywhere else has melted by itself: the snowman's board is still under frost
    expect(wipedIn(grid, board)).toBe(0);
    expect(wiped(grid)).toBeLessThan(0.3);
  });

  it("knows when the snowman's board shows through", () => {
    const grid = frostGrid();
    for (const v of [0.34, 0.42, 0.48]) for (const p of strokePoints({ u: 0.35, v }, { u: 0.8, v }, 0.1, 1.3)) wipeAt(grid, p.u, p.v, 0.1, 1.3);
    expect(wipedIn(grid, board)).toBeGreaterThanOrEqual(REVEAL_AT);
    // the rest of the glass is still frosted
    expect(wiped(grid)).toBeLessThan(0.5);
  });

  it("defaults to the cottage, and keeps the sign short enough for the board", () => {
    expect(windowSchema.parse({})).toEqual({ look: "cottage" });
    expect(windowSchema.safeParse({ sign: "x".repeat(37) }).success).toBe(false);
    expect(getManifest("frosted-window")?.occasions).toEqual(["christmas"]);
  });
});

describe("Light the Candles", () => {
  const wicks = [10, 30, 50, 70, 90].map((x, i) => ({ x, y: 60 + (i % 2) * 10 }));
  const feet = wicks.map((w) => ({ x: w.x, y: 110 }));

  it("lights the wick the flame touches, and no other", () => {
    expect(wickAt({ x: 50, y: 61 }, wicks, [])).toBe(2);
    expect(wickAt({ x: 50, y: 60 + CATCH + 0.5 }, wicks, [])).toBe(-1);
    expect(wickAt({ x: 40, y: 65 }, wicks, [])).toBe(-1);
    // a candle already burning is not lit twice
    expect(wickAt({ x: 50, y: 61 }, wicks, [2])).toBe(-1);
  });

  it("takes a tap anywhere on a candle to mean that candle", () => {
    expect(candleAt({ x: 31, y: 100 }, wicks, feet, [])).toBe(1);
    expect(candleAt({ x: 31, y: 100 }, wicks, feet, [1])).toBe(-1);
    expect(candleAt({ x: 20, y: 30 }, wicks, feet, [])).toBe(-1);
  });

  it("lights them left to right from the keyboard", () => {
    expect(nextUnlit([])).toBe(0);
    expect(nextUnlit([0, 2])).toBe(1);
    expect(nextUnlit([0, 1, 2, 3, 4])).toBe(-1);
    expect(CANDLES).toBe(5);
  });

  it("starts with five things to be thankful for, and keeps no more", () => {
    expect(candlesSchema.parse({})).toEqual({ thanks: DEFAULT_THANKS, look: "harvest" });
    expect(candlesSchema.safeParse({ thanks: Array(6).fill("x") }).success).toBe(false);
    expect(getManifest("light-the-candles")?.occasions[0]).toBe("thanksgiving");
  });
});

describe("String the Lights", () => {
  const hooks = Array.from({ length: 10 }, (_, i) => [10 + i * 8, 50] as const);

  it("hangs a bulb on each hook the finger passes, once", () => {
    expect(hooksNear({ x: 10, y: 50 }, hooks, new Set())).toEqual([0]);
    expect(hooksNear({ x: 14, y: 50 }, hooks, new Set())).toEqual([0, 1]);
    expect(hooksNear({ x: 14, y: 50 }, hooks, new Set([0]))).toEqual([1]);
    expect(hooksNear({ x: 14, y: 50 + REACH + 1 }, hooks, new Set())).toEqual([]);
  });

  it("runs wire only between neighbours that are both up, and not from one string to the next", () => {
    expect(wires(10, new Set([0, 1, 3]), [])).toEqual([[0, 1]]);
    expect(wires(10, new Set([4, 5, 6]), [5])).toEqual([[5, 6]]);
  });

  it("hangs the next few from the keyboard until none are left", () => {
    const hung = new Set<number>();
    let presses = 0;
    for (; hung.size < 46 && presses < 20; presses++) for (const i of nextHooks(46, hung)) hung.add(i);
    expect(hung.size).toBe(46);
    expect(presses).toBe(Math.ceil(46 / PER_KEY));
  });

  it("defaults to the red house, and keeps the sign short enough for the board", () => {
    expect(lightsSchema.parse({})).toEqual({ look: "red" });
    expect(lightsSchema.safeParse({ sign: "x".repeat(29) }).success).toBe(false);
    expect(getManifest("string-the-lights")?.occasions).toEqual(["christmas"]);
  });
});

describe("Gingerbread House", () => {
  const corners = { bl: { x: 20, y: 120 }, br: { x: 80, y: 120 }, tl: { x: 20, y: 80 }, tr: { x: 80, y: 80 }, peak: { x: 50, y: 45 }, doorTop: { x: 50, y: 98 } };
  const shape = [corners.bl, corners.br, corners.tr, corners.peak, corners.tl];

  it("knows the house's front from the kitchen round it", () => {
    expect(inside({ x: 50, y: 100 }, shape)).toBe(true);
    expect(inside({ x: 50, y: 60 }, shape)).toBe(true);
    expect(inside({ x: 22, y: 60 }, shape)).toBe(false);
    expect(inside({ x: 50, y: 130 }, shape)).toBe(false);
  });

  it("can dress a house by itself, every mark on the house and enough of them to open the door", () => {
    const marks = readyMade(corners);
    expect(marks.length).toBeGreaterThanOrEqual(ENOUGH);
    for (const m of marks) for (const p of m.kind === "sweet" ? [m.at] : m.path) expect(inside(p, shape), JSON.stringify(p)).toBe(true);
  });

  it("defaults to the cream kitchen", () => {
    expect(houseSchema.parse({})).toEqual({ look: "cosy" });
    expect(getManifest("gingerbread-house")?.occasions).toEqual(["christmas"]);
  });
});

describe("A note gone through a step at a time", () => {
  const para = (n: number) => "word ".repeat(n / 5).trim();

  it("keeps whole paragraphs together up to the limit", () => {
    const blocks = parseRichText([para(100), para(100), para(100), para(200), para(50)].join("\n\n"));
    const parts = splitWords(blocks, 230);
    expect(parts.map((p) => p.length)).toEqual([2, 1, 1, 1]);
    expect(parts.flat()).toEqual(blocks);
  });

  it("breaks a paragraph too long for one screen after a sentence, losing no words and no bold", () => {
    const text = "One short sentence here. **A second one that is bold, all of it.** A third, plain again, to finish with! And a fourth?";
    const [block] = parseRichText(text);
    const pieces = breakBlock(block, 60);
    expect(pieces.length).toBeGreaterThan(1);
    for (const piece of pieces) expect(piece.reduce((n, r) => n + r.text.length, 0)).toBeLessThanOrEqual(60);
    expect(pieces[0].map((r) => r.text).join("")).toBe("One short sentence here.");
    expect(pieces.flat().filter((r) => r.bold).map((r) => r.text).join("").trim()).toBe("A second one that is bold, all of it.");
    const words = (s: string) => s.split(/\s+/).filter(Boolean);
    expect(words(pieces.map((p) => p.map((r) => r.text).join("")).join(" "))).toEqual(words(block.map((r) => r.text).join("")));
    // one endless sentence is broken between words
    const endless = breakBlock(parseRichText(para(400))[0], 230);
    expect(endless.length).toBe(2);
    for (const piece of endless) expect(piece[0].text.endsWith(" ")).toBe(false);
  });

  it("goes through the longest letter in a dozen parts or so, not thirty", () => {
    const long = Array.from({ length: 30 }, () => para(130)).join("\n\n");
    const steps = noteSteps({ message: long, photos: [], countdown: undefined, surprise: undefined }, 170);
    expect(steps.filter((s) => s.kind === "words").length).toBeLessThanOrEqual(MOST_PARTS + 4);
    expect(partLimit(parseRichText("short"), 170)).toBe(170);
  });

  it("goes words, then every photo, the countdown, the surprise, and always ends on the end", () => {
    const photo = (id: string) => ({ id, url: `/demo/${id}.jpg`, width: 1, height: 1 });
    const steps = noteSteps({ message: `${para(200)}\n\n${para(200)}`, photos: [photo("a"), photo("b")] as never, countdown: undefined, surprise: { text: "x", reveal: "tap" } as never }, 230);
    expect(steps.map((s) => s.kind)).toEqual(["words", "words", "photo", "photo", "surprise", "end"]);
    expect(steps[0]).toMatchObject({ first: true, last: false });
    expect(steps[1]).toMatchObject({ first: false, last: true });
  });

  // The end step scrolls inside its page (Gingerbread House, String the Lights): on a small phone it
  // is taller than the page, and its last buttons were cut off and out of reach. A page often cuts
  // it between two rows, which looks finished, so the edge that more lies past fades.
  it("fades the edge of the end that more lies past, and nothing when it all fits", () => {
    expect(edgeFade(false, false)).toBeUndefined();
    expect(edgeFade(false, true)).toBe("linear-gradient(to bottom, #000, #000 calc(100% - 3rem), transparent)");
    expect(edgeFade(true, false)).toBe("linear-gradient(to bottom, transparent, #000 2rem, #000)");
    expect(edgeFade(true, true)).toBe("linear-gradient(to bottom, transparent, #000 2rem, #000 calc(100% - 3rem), transparent)");
  });

  it("still greets and signs when there is no message at all", () => {
    const steps = noteSteps({ message: "", photos: [], countdown: undefined, surprise: undefined });
    expect(steps.map((s) => s.kind)).toEqual(["words", "end"]);
    expect(steps[0]).toMatchObject({ first: true, last: true, blocks: [] });
  });
});
