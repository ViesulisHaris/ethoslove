import { describe, expect, it } from "vitest";
import { canDraw, cellsOf, outline, pathOf, pitchOf, rasterize, wrap, ADVANCE, CAP } from "@/templates/digicam/pixel-font";
import { countdownDay, fileName, localDay, rollProgress, stampDay, stampText, stepRoll, validDay } from "@/templates/digicam/roll";
import { ransomSeed, scriptAt, titleRows } from "@/templates/digicam/title";
import { fieldsSchema } from "@/templates/digicam/schema";
import { typedLines } from "@/templates/digicam/screen";

describe("the camera screen's pixel type", () => {
  it("draws every printable ASCII character, five pixels wide", () => {
    for (let code = 32; code < 127; code++) {
      const ch = String.fromCharCode(code);
      const cells = cellsOf(ch);
      expect(cells, JSON.stringify(ch)).not.toBeNull();
      for (const row of cells![0].glyph) expect(row, JSON.stringify(ch)).toHaveLength(5);
      expect([CAP, CAP + 2]).toContain(cells![0].glyph.length);
    }
  });

  it("builds accented letters from a letter and a mark, in both languages and beyond", () => {
    for (const text of ["¡hola, Ñandú!", "¿qué año?", "Élodie à Noël", "Łucja Mārtiņš", "Zoë Çelik ß", "♥ ❤️ ★"]) expect(canDraw(text), text).toBe(true);
    const [n] = cellsOf("ñ")!;
    expect(n.above).toHaveLength(1);
    // An accent on i sits on a dotless i.
    const [i] = cellsOf("í")!;
    expect(i.glyph[0]).toBe(".....");
    // ¡ hangs below the line, so it never reads as an i.
    expect(cellsOf("¡")![0].glyph).not.toEqual(cellsOf("i")![0].glyph);
    expect(cellsOf("¡")![0].glyph).toHaveLength(CAP + 2);
  });

  it("says so when a line holds something it can't draw, so the screen can set it another way", () => {
    expect(canDraw("our first coffee ☕")).toBe(false);
    expect(canDraw("Привет")).toBe(false);
    expect(rasterize(["東京"])).toBeNull();
  });

  it("wraps by words, breaks a word too long for a line, and ends a cut caption with an ellipsis", () => {
    expect(wrap("lisbon, missed the tram", 14, 2)).toEqual(["lisbon, missed", "the tram"]);
    expect(wrap("supercalifragilistic", 8, 3)).toEqual(["supercal", "ifragili", "stic"]);
    const cut = wrap("you left this in my book on the train home", 12, 2);
    expect(cut).toHaveLength(2);
    expect(cut[1].endsWith("…")).toBe(true);
    expect([...cut[1]].length).toBeLessThanOrEqual(12);
    expect(wrap("   ", 10, 2)).toEqual([]);
  });

  it("sizes the bitmap to the text, with room for tails and capital accents only when needed", () => {
    const plain = rasterize(["IMG_0001.JPG"])!;
    expect(plain.width).toBe(12 * ADVANCE - 1);
    expect(plain.height).toBe(CAP);
    expect(rasterize(["gypsy"])!.height).toBe(CAP + 2);
    expect(rasterize(["Élan"])!.height).toBe(CAP + 2);
    expect(rasterize(["a", "b"])!.height).toBe(pitchOf() + CAP);
    // Centred lines sit in the middle of the widest.
    const centred = rasterize(["ab", "abcd"], "center")!;
    expect(Math.min(...centred.runs.filter(([, y]) => y < CAP).map(([x]) => x))).toBeGreaterThanOrEqual(ADVANCE);
  });

  it("draws the dark edge all round the lit pixels and never on them", () => {
    const bitmap = rasterize(["I"])!;
    const ring = outline(bitmap);
    expect(ring.width).toBe(bitmap.width + 2);
    const lit = new Set(bitmap.runs.flatMap(([x, y, n]) => Array.from({ length: n }, (_, i) => `${x + i + 1},${y + 1}`)));
    const edge = ring.runs.flatMap(([x, y, n]) => Array.from({ length: n }, (_, i) => `${x + i},${y}`));
    expect(edge.length).toBeGreaterThan(lit.size);
    expect(edge.some((p) => lit.has(p))).toBe(false);
    expect(pathOf(bitmap)).toMatch(/^M\d+ \d+h\d+v1h-\d+z/);
  });

  it("types a hello across its lines without reflowing them", () => {
    expect(typedLines(["happy", "birthday,"], 7)).toEqual(["happy", "bi"]);
    expect(typedLines(["¡hola,", "ñu!"], 8)).toEqual(["¡hola,", "ñu"]);
    expect(typedLines(["ab"], 0)).toEqual([""]);
  });
});

describe("the camera roll", () => {
  it("knows a real day from a string that only looks like one", () => {
    expect(validDay("2026-09-25")).toBe("2026-09-25");
    expect(validDay("2026-02-31")).toBeNull();
    expect(validDay("25/09/2026")).toBeNull();
    expect(validDay("")).toBeNull();
    expect(validDay(undefined)).toBeNull();
    expect(localDay(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("stamps the sender's day, else the countdown's day where it ends, else today", () => {
    const countdown = { targetAt: "2026-10-02T23:30:00+00:00", timezone: "Europe/Madrid" };
    // 23:30 UTC is already the 3rd in Madrid.
    expect(countdownDay(countdown)).toBe("2026-10-03");
    expect(countdownDay({ ...countdown, timezone: "Not/AZone" })).toBeNull();
    expect(stampDay("2026-09-25", countdown, "2026-01-01")).toBe("2026-09-25");
    expect(stampDay("", countdown, "2026-01-01")).toBe("2026-10-03");
    expect(stampDay(undefined, undefined, "2026-01-01")).toBe("2026-01-01");
  });

  it("prints the date the way cameras sold in each place did", () => {
    expect(stampText("2026-09-25", "en")).toBe("'26 09 25");
    expect(stampText("2026-09-25", "es")).toBe("25 09 '26");
    expect(stampText("2006-01-07", "en")).toBe("'06 01 07");
  });

  it("names the photos like a camera and stops at both ends of the roll", () => {
    expect(fileName(0)).toBe("IMG_0001.JPG");
    expect(fileName(11)).toBe("IMG_0012.JPG");
    expect(stepRoll(0, -1, 6)).toBe(0);
    expect(stepRoll(0, 1, 6)).toBe(1);
    expect(stepRoll(5, 1, 6)).toBe(5);
    expect(stepRoll(0, 1, 0)).toBe(0);
    expect(rollProgress(0, 6)).toBe(20);
    expect(rollProgress(5, 6)).toBe(70);
    expect(rollProgress(0, 1)).toBe(70);
  });
});

describe("the cut-out title", () => {
  it("keeps to three rows, as even as the words allow", () => {
    expect(titleRows("happy birthday")).toEqual(["happy", "birthday"]);
    expect(titleRows("Elena")).toEqual(["Elena"]);
    expect(titleRows("you are my favourite person").length).toBeLessThanOrEqual(3);
    expect(titleRows("a b c d e f g h").length).toBeLessThanOrEqual(3);
    expect(titleRows("  ")).toEqual([]);
  });

  it("chooses the letters' faces so the script one never lands on a letter it would make unreadable", () => {
    for (const title of ["feliz cumple", "happy birthday", "FIFI", "just jess", "te quiero", "Rosario Durán"]) {
      const rows = titleRows(title);
      const seed = ransomSeed(rows, 41);
      let index = 0;
      rows.forEach((row, r) => {
        for (const ch of row) {
          if (ch === " ") continue;
          if ("DFGIJLQRSTZ".includes(ch.toUpperCase())) expect(scriptAt(seed, index, r), `${title}: ${ch}`).toBe(false);
          index += 1;
        }
      });
      expect(ransomSeed(rows, 41)).toBe(seed);
    }
  });
});

describe("the fields", () => {
  it("makes a whole birthday gift from nothing, and takes only real-looking dates", () => {
    expect(fieldsSchema.parse({})).toEqual({ birthday: true, body: "pink", stamp: true });
    expect(fieldsSchema.safeParse({ stampDate: "2026-09-25" }).success).toBe(true);
    expect(fieldsSchema.safeParse({ stampDate: "" }).success).toBe(true);
    expect(fieldsSchema.safeParse({ stampDate: "next friday" }).success).toBe(false);
    expect(fieldsSchema.safeParse({ body: "gold" }).success).toBe(false);
  });
});
