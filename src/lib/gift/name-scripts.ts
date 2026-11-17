/**
 * Which names the share card draws itself, and with which font. The card's image generator
 * (next/og) is fine for Latin, Cyrillic, Greek, Chinese, Japanese and Korean, but not for the rest:
 * it fetches no font for Georgian, Armenian, Khmer, Myanmar, Sinhala, Gujarati and others (the name
 * came out blank), it can't shape the scripts whose letters join or reorder (Arabic, the Indian
 * scripts, Thai, Khmer), and a name in Arabic with "ال" in it broke the card outright. A name in any
 * of these is drawn by sharp (Pango and HarfBuzz) from the Noto fonts in src/fonts/noto instead
 * (name-art.ts). Pure, so the share card's URL can use it too.
 */
export const NAME_SCRIPTS = [
  { script: /\p{Script=Arabic}/u, family: "Noto Naskh Arabic", file: "NotoNaskhArabic-Regular.ttf" },
  { script: /\p{Script=Hebrew}/u, family: "Noto Serif Hebrew", file: "NotoSerifHebrew-Regular.ttf" },
  { script: /\p{Script=Syriac}/u, family: "Noto Sans Syriac", file: "NotoSansSyriac-Regular.ttf" },
  { script: /\p{Script=Thaana}/u, family: "Noto Sans Thaana", file: "NotoSansThaana-Regular.ttf" },
  { script: /\p{Script=Devanagari}/u, family: "Noto Serif Devanagari", file: "NotoSerifDevanagari-Regular.ttf" },
  { script: /\p{Script=Bengali}/u, family: "Noto Serif Bengali", file: "NotoSerifBengali-Regular.ttf" },
  { script: /\p{Script=Gurmukhi}/u, family: "Noto Serif Gurmukhi", file: "NotoSerifGurmukhi-Regular.ttf" },
  { script: /\p{Script=Gujarati}/u, family: "Noto Serif Gujarati", file: "NotoSerifGujarati-Regular.ttf" },
  { script: /\p{Script=Oriya}/u, family: "Noto Serif Oriya", file: "NotoSerifOriya-Regular.ttf" },
  { script: /\p{Script=Tamil}/u, family: "Noto Serif Tamil", file: "NotoSerifTamil-Regular.ttf" },
  { script: /\p{Script=Telugu}/u, family: "Noto Serif Telugu", file: "NotoSerifTelugu-Regular.ttf" },
  { script: /\p{Script=Kannada}/u, family: "Noto Serif Kannada", file: "NotoSerifKannada-Regular.ttf" },
  { script: /\p{Script=Malayalam}/u, family: "Noto Serif Malayalam", file: "NotoSerifMalayalam-Regular.ttf" },
  { script: /\p{Script=Sinhala}/u, family: "Noto Serif Sinhala", file: "NotoSerifSinhala-Regular.ttf" },
  { script: /\p{Script=Thai}/u, family: "Noto Serif Thai", file: "NotoSerifThai-Regular.ttf" },
  { script: /\p{Script=Lao}/u, family: "Noto Serif Lao", file: "NotoSerifLao-Regular.ttf" },
  { script: /\p{Script=Tibetan}/u, family: "Noto Serif Tibetan", file: "NotoSerifTibetan-Regular.ttf" },
  { script: /\p{Script=Myanmar}/u, family: "Noto Serif Myanmar", file: "NotoSerifMyanmar-Regular.ttf" },
  { script: /\p{Script=Khmer}/u, family: "Noto Serif Khmer", file: "NotoSerifKhmer-Regular.ttf" },
  { script: /\p{Script=Georgian}/u, family: "Noto Serif Georgian", file: "NotoSerifGeorgian-Regular.ttf" },
  { script: /\p{Script=Armenian}/u, family: "Noto Serif Armenian", file: "NotoSerifArmenian-Regular.ttf" },
  { script: /\p{Script=Ethiopic}/u, family: "Noto Serif Ethiopic", file: "NotoSerifEthiopic-Regular.ttf" },
] as const;

export type NameScript = (typeof NAME_SCRIPTS)[number];

/** The scripts in `name` that the card draws itself, in the order above. */
export function nameScripts(name: string): NameScript[] {
  return NAME_SCRIPTS.filter((s) => s.script.test(name));
}

/** Whether the card draws `name` itself rather than leaving it to the image generator. */
export function drawsNameItself(name: string): boolean {
  return nameScripts(name).length > 0;
}

/**
 * "𝓜𝓪𝔂𝓪", "𝐌𝐚𝐲𝐚" and the other styled letters people copy from Instagram are Unicode's
 * mathematical letters, which no font on the card has (the name came out blank): the card writes
 * them as the plain letters they stand for.
 */
export function plainLetters(name: string): string {
  return name.replace(/[\u{1D400}-\u{1D7FF}]/gu, (c) => c.normalize("NFKC"));
}

/**
 * Part of the share card's URL: names drawn differently since 17 Nov 2026 get a new address, so a
 * chat that kept the old (blank or "for you") card fetches the new one. Empty for every other name,
 * whose address stays as it was.
 */
export function nameDrawingTag(name: string): string {
  if (drawsNameItself(name)) return ":drawn1";
  return plainLetters(name) === name ? "" : ":plain1";
}
