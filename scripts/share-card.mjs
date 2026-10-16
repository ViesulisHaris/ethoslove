/**
 * Draws a gift's share card exactly as /g/<id>/card.jpg does, from src/lib/gift/card-art.ts, without
 * a server: for checking the looks, and for the TikTok slides, which show the real card.
 *   node scripts/share-card.mjs <out.jpg> <blush|rouge|pressed|noir> <name> [en|es]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createJiti } from "jiti";
import { ImageResponse } from "next/og.js";
import sharp from "sharp";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
const jiti = createJiti(import.meta.url, { alias: { "@/": join(root, "src") + "/" } });
const { cardArt, cardFiles } = await jiti.import(join(root, "src/lib/gift/card-art.ts"));
const { SHARE_CARD } = await jiti.import(join(root, "src/lib/gift/share-card.ts"));

const [out, look = "blush", name = "Maya", locale = "en"] = process.argv.slice(2);
if (!out) {
  console.error("usage: node scripts/share-card.mjs <out.jpg> <look> <name> [en|es]");
  process.exit(1);
}
const art = Object.fromEntries(cardFiles(look).map((file) => [file, `data:image/png;base64,${readFileSync(join(root, "src/share-card", `${file}.png`)).toString("base64")}`]));
const png = await new ImageResponse(cardArt({ name, look, locale, art }), {
  ...SHARE_CARD,
  fonts: [
    { name: "Newsreader", data: readFileSync(join(root, "src/fonts/newsreader-regular.ttf")), weight: 400, style: "normal" },
    { name: "Newsreader Italic", data: readFileSync(join(root, "src/fonts/newsreader-italic.ttf")), weight: 400, style: "normal" },
  ],
}).arrayBuffer();
writeFileSync(out, await sharp(Buffer.from(png)).flatten({ background: "#F7F1E7" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer());
console.log("wrote", out);
