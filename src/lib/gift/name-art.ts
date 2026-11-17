import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { nameScripts, type NameScript } from "@/lib/gift/name-scripts";

/**
 * A recipient's name drawn as a picture for the share card, for the scripts the card's image
 * generator can't draw (name-scripts.ts). sharp draws text with Pango and HarfBuzz, the same shaping
 * a phone does: Arabic and Hebrew right to left with their letters joined, the Indian scripts with
 * their vowel signs where they belong, Thai and Khmer marks stacked. Server only.
 *
 * Each font is spelled out so the bundler ships it, the same way as the card's own fonts.
 */
const FONT: Record<NameScript["file"] | "newsreader", URL> = {
  newsreader: new URL("../../fonts/newsreader-regular.ttf", import.meta.url),
  "NotoNaskhArabic-Regular.ttf": new URL("../../fonts/noto/NotoNaskhArabic-Regular.ttf", import.meta.url),
  "NotoSerifHebrew-Regular.ttf": new URL("../../fonts/noto/NotoSerifHebrew-Regular.ttf", import.meta.url),
  "NotoSansSyriac-Regular.ttf": new URL("../../fonts/noto/NotoSansSyriac-Regular.ttf", import.meta.url),
  "NotoSansThaana-Regular.ttf": new URL("../../fonts/noto/NotoSansThaana-Regular.ttf", import.meta.url),
  "NotoSerifDevanagari-Regular.ttf": new URL("../../fonts/noto/NotoSerifDevanagari-Regular.ttf", import.meta.url),
  "NotoSerifBengali-Regular.ttf": new URL("../../fonts/noto/NotoSerifBengali-Regular.ttf", import.meta.url),
  "NotoSerifGurmukhi-Regular.ttf": new URL("../../fonts/noto/NotoSerifGurmukhi-Regular.ttf", import.meta.url),
  "NotoSerifGujarati-Regular.ttf": new URL("../../fonts/noto/NotoSerifGujarati-Regular.ttf", import.meta.url),
  "NotoSerifOriya-Regular.ttf": new URL("../../fonts/noto/NotoSerifOriya-Regular.ttf", import.meta.url),
  "NotoSerifTamil-Regular.ttf": new URL("../../fonts/noto/NotoSerifTamil-Regular.ttf", import.meta.url),
  "NotoSerifTelugu-Regular.ttf": new URL("../../fonts/noto/NotoSerifTelugu-Regular.ttf", import.meta.url),
  "NotoSerifKannada-Regular.ttf": new URL("../../fonts/noto/NotoSerifKannada-Regular.ttf", import.meta.url),
  "NotoSerifMalayalam-Regular.ttf": new URL("../../fonts/noto/NotoSerifMalayalam-Regular.ttf", import.meta.url),
  "NotoSerifSinhala-Regular.ttf": new URL("../../fonts/noto/NotoSerifSinhala-Regular.ttf", import.meta.url),
  "NotoSerifThai-Regular.ttf": new URL("../../fonts/noto/NotoSerifThai-Regular.ttf", import.meta.url),
  "NotoSerifLao-Regular.ttf": new URL("../../fonts/noto/NotoSerifLao-Regular.ttf", import.meta.url),
  "NotoSerifTibetan-Regular.ttf": new URL("../../fonts/noto/NotoSerifTibetan-Regular.ttf", import.meta.url),
  "NotoSerifMyanmar-Regular.ttf": new URL("../../fonts/noto/NotoSerifMyanmar-Regular.ttf", import.meta.url),
  "NotoSerifKhmer-Regular.ttf": new URL("../../fonts/noto/NotoSerifKhmer-Regular.ttf", import.meta.url),
  "NotoSerifGeorgian-Regular.ttf": new URL("../../fonts/noto/NotoSerifGeorgian-Regular.ttf", import.meta.url),
  "NotoSerifArmenian-Regular.ttf": new URL("../../fonts/noto/NotoSerifArmenian-Regular.ttf", import.meta.url),
  "NotoSerifEthiopic-Regular.ttf": new URL("../../fonts/noto/NotoSerifEthiopic-Regular.ttf", import.meta.url),
};

/** The card's own serif first, for any Latin letters in the name ("Maya ნინო"), by the family name inside the file. */
const LATIN_FAMILY = "Newsreader 16pt 16pt";

/**
 * Pango looks fonts up through fontconfig. The server has no fonts and no fontconfig file, so
 * fontconfig complains on every cold start; an empty file of our own keeps it quiet, and the fonts
 * we hand it are then the only ones it knows.
 */
let configured = false;
function quietFontconfig() {
  if (configured) return;
  configured = true;
  if (process.env.FONTCONFIG_FILE) return;
  try {
    const dir = join(tmpdir(), "ethos-fontconfig");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, "fonts.conf");
    writeFileSync(file, `<?xml version="1.0"?>\n<fontconfig><cachedir>${dir}</cachedir></fontconfig>\n`);
    process.env.FONTCONFIG_FILE = file;
  } catch {
    // Read-only and no temp folder: fontconfig only warns.
  }
}

/** vips hands a font file to Pango the first time a render names it, for the rest of the process. */
const registered = new Set<string>();
async function register(url: URL, family: string) {
  const file = fileURLToPath(url);
  if (registered.has(file)) return;
  await sharp({ text: { text: ".", font: `${family} 8`, fontfile: file, rgba: true } }).png().toBuffer();
  registered.add(file);
}

const escapeMarkup = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * `name` as a transparent PNG in `color`, at `size` px if it fits in `width` on at most `maxHeight`
 * (smaller if not). Emoji are left out: there is no emoji font here, and they'd show as boxes.
 */
export async function drawName(
  name: string,
  { size, color, width, maxHeight }: { size: number; color: string; width: number; maxHeight: number },
): Promise<{ src: string; width: number; height: number }> {
  quietFontconfig();
  const text = name.replace(/\p{Extended_Pictographic}|️|‍/gu, "").replace(/\s+/g, " ").trim() || name;
  const scripts = nameScripts(text);
  await register(FONT.newsreader, LATIN_FAMILY);
  for (const s of scripts) await register(FONT[s.file], s.family);
  const families = [LATIN_FAMILY, ...scripts.map((s) => s.family)].join(", ");
  const markup = `<span foreground="${color}">${escapeMarkup(text)}</span>`;
  let px = Math.round(size);
  for (;;) {
    const { data, info } = await sharp({ text: { text: markup, font: `${families} ${px}`, rgba: true, dpi: 72, width, wrap: "word" } })
      .png()
      .toBuffer({ resolveWithObject: true });
    if (info.height <= maxHeight || px <= 64) return { src: `data:image/png;base64,${data.toString("base64")}`, width: info.width, height: info.height };
    px = Math.max(64, Math.floor(px * 0.85));
  }
}
