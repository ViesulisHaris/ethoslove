import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { drawName } from "@/lib/gift/name-art";
import { drawsNameItself, NAME_SCRIPTS, nameDrawingTag, nameScripts, plainLetters } from "@/lib/gift/name-scripts";
import { shareCardUrl } from "@/lib/gift/share-card";

/** A name in each script the card draws itself, as people write them. */
const NAMES: Record<string, string> = {
  "Noto Naskh Arabic": "عبد الله",
  "Noto Serif Hebrew": "שרה",
  "Noto Sans Syriac": "ܡܪܝܡ",
  "Noto Sans Thaana": "އާމިނަތު",
  "Noto Serif Devanagari": "प्रिया",
  "Noto Serif Bengali": "প্রিয়া",
  "Noto Serif Gurmukhi": "ਪ੍ਰੀਤ",
  "Noto Serif Gujarati": "પ્રિયા",
  "Noto Serif Oriya": "ପ୍ରିୟା",
  "Noto Serif Tamil": "ப்ரியா",
  "Noto Serif Telugu": "ప్రియ",
  "Noto Serif Kannada": "ಪ್ರಿಯಾ",
  "Noto Serif Malayalam": "പ്രിയ",
  "Noto Serif Sinhala": "සඳුනි",
  "Noto Serif Thai": "สมชาย",
  "Noto Serif Lao": "ສົມໃຈ",
  "Noto Serif Tibetan": "བཀྲ་ཤིས",
  "Noto Serif Myanmar": "မြတ်",
  "Noto Serif Khmer": "សុភា",
  "Noto Serif Georgian": "ნინო",
  "Noto Serif Armenian": "Անի",
  "Noto Serif Ethiopic": "ሰላም",
};

/** The family a TrueType font calls itself (name ID 16, else 1), which is how Pango finds it. */
function familyOf(file: string): string {
  const b = readFileSync(file);
  let name = 0;
  for (let i = 0, off = 12; i < b.readUInt16BE(4); i++, off += 16) if (b.toString("ascii", off, off + 4) === "name") name = b.readUInt32BE(off + 8);
  const strings = name + b.readUInt16BE(name + 4);
  const found: Record<number, string> = {};
  for (let i = 0; i < b.readUInt16BE(name + 2); i++) {
    const r = name + 6 + i * 12;
    if (b.readUInt16BE(r) !== 3) continue;
    const id = b.readUInt16BE(r + 6);
    const s = b.subarray(strings + b.readUInt16BE(r + 10), strings + b.readUInt16BE(r + 10) + b.readUInt16BE(r + 8));
    found[id] = Array.from({ length: s.length / 2 }, (_, k) => String.fromCharCode(s.readUInt16BE(k * 2))).join("");
  }
  return found[16] ?? found[1];
}

describe("names the share card draws itself", () => {
  it("knows each script by its name, and leaves Latin, Cyrillic, Greek, Chinese, Japanese and Korean alone", () => {
    for (const s of NAME_SCRIPTS) expect(nameScripts(NAMES[s.family]).map((x) => x.family), s.family).toEqual([s.family]);
    for (const name of ["Maya", "Zoë Ångström", "Маша", "Ελένη", "小明", "さくら", "민지", "Maya ❤️", "Leo ★"]) expect(drawsNameItself(name), name).toBe(false);
    expect(nameScripts("Maya ნინო").map((s) => s.family)).toEqual(["Noto Serif Georgian"]);
  });

  it("ships every font, under the family name it is asked for", () => {
    for (const s of NAME_SCRIPTS) expect(familyOf(join(process.cwd(), "src/fonts/noto", s.file)), s.file).toBe(s.family);
    expect(familyOf(join(process.cwd(), "src/fonts/newsreader-regular.ttf"))).toBe("Newsreader 16pt 16pt");
  });

  it("writes Instagram's styled letters as the plain ones they stand for", () => {
    expect(plainLetters("𝓜𝓪𝔂𝓪")).toBe("Maya");
    expect(plainLetters("𝐌𝐚𝐲𝐚 ❤️")).toBe("Maya ❤️");
    expect(plainLetters("Zoë")).toBe("Zoë");
  });

  it("gives a card a new address only when its name is now drawn differently", () => {
    expect(nameDrawingTag("Maya")).toBe("");
    expect(nameDrawingTag("عبد الله")).not.toBe("");
    expect(nameDrawingTag("𝓜𝓪𝔂𝓪")).not.toBe("");
    const before = (name: string) => shareCardUrl("abc123", { recipientName: name, locale: "en" });
    expect(before("عبد الله")).not.toBe(before("عبد الله ")); // still keyed by the name itself
  });

  it("draws a name in every one of those scripts as a picture with something on it", async () => {
    for (const s of NAME_SCRIPTS) {
      const art = await drawName(NAMES[s.family], { size: 200, color: "#3E0D17", width: 960, maxHeight: 620 });
      expect(art.src.startsWith("data:image/png;base64,"), s.family).toBe(true);
      expect(art.width, s.family).toBeGreaterThan(60);
      expect(art.height, s.family).toBeGreaterThan(60);
    }
  }, 60_000);

  it("keeps a long name inside its room, and leaves emoji out", async () => {
    const long = await drawName("عبد الرحمن بن عبد العزيز آل سعود", { size: 300, color: "#3E0D17", width: 960, maxHeight: 620 });
    expect(long.width).toBeLessThanOrEqual(960);
    expect(long.height).toBeLessThanOrEqual(620);
    const withEmoji = await drawName("سارة ❤️", { size: 200, color: "#3E0D17", width: 960, maxHeight: 620 });
    const without = await drawName("سارة", { size: 200, color: "#3E0D17", width: 960, maxHeight: 620 });
    expect(withEmoji.width).toBe(without.width);
  }, 60_000);
});
