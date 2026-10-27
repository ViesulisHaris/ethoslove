/**
 * The download each Etsy listing hands its buyer (docs/marketing/ETSY.md): one page with the gift's
 * poster, a link and a QR code to tryethos.io/etsy/<slug>, and the three steps. Written to
 * docs/marketing/etsy/<slug>.pdf, ready to upload as the listing's digital file.
 *
 *   node scripts/etsy-pdfs.mjs [origin=https://tryethos.io]
 */
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import QRCode from "qrcode";

const origin = (process.argv[2] ?? "https://tryethos.io").replace(/\/$/, "");
const OUT = "docs/marketing/etsy";
const LISTINGS = [
  ["popup-card", "Pop-up Card"],
  ["bouquet", "Bouquet"],
  ["xoxo", "XOXO"],
  ["birthday-cinema", "Birthday Cinema"],
  ["coquette", "Coquette"],
  ["digicam", "Digicam"],
  ["scrapbook", "Scrapbook"],
  ["museum", "Museum"],
];

const page = ({ name, link, qr, poster }) => `<!doctype html>
<html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Schibsted+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 0 }
  * { box-sizing: border-box }
  body { margin: 0; background: #fdf7f3; color: #24121b; font: 15px/1.5 "Schibsted Grotesk", system-ui, sans-serif }
  .sheet { width: 210mm; height: 297mm; padding: 18mm 20mm; display: flex; flex-direction: column }
  .brand { font: 500 22px "Newsreader", Georgia, serif; letter-spacing: .01em }
  h1 { font: 400 40px/1.1 "Newsreader", Georgia, serif; margin: 14mm 0 4mm }
  .lead { color: #5d4652; font-size: 17px; margin: 0 }
  .row { display: flex; gap: 12mm; margin-top: 12mm; align-items: center }
  .poster { width: 74mm; height: 120mm; border-radius: 6mm; object-fit: cover; box-shadow: 0 2mm 8mm rgba(36,18,27,.18) }
  .go { flex: 1 }
  .button { display: block; background: #d6336c; color: #fff; text-decoration: none; text-align: center; border-radius: 999px; padding: 5mm 6mm; font-weight: 600; font-size: 18px }
  .url { margin-top: 3mm; text-align: center; font-size: 13px; color: #5d4652; word-break: break-all }
  .qr { display: block; width: 42mm; height: 42mm; margin: 9mm auto 2mm }
  .scan { text-align: center; font-size: 13px; color: #5d4652 }
  ol { margin: 12mm 0 0; padding: 0; list-style: none; display: grid; gap: 4mm }
  li { display: flex; gap: 4mm; font-size: 16px }
  li b { flex: none; width: 8mm; height: 8mm; border-radius: 50%; background: #24121b; color: #fdf7f3; display: grid; place-items: center; font-size: 13px }
  .note { margin-top: auto; padding: 5mm 6mm; border-radius: 4mm; background: #f9cdd8; font-size: 14px }
</style></head>
<body><div class="sheet">
  <div class="brand">Ethos</div>
  <h1>Your ${name} is ready to make</h1>
  <p class="lead">Thank you for your order. It takes a few minutes, on your phone.</p>
  <div class="row">
    <img class="poster" src="${poster}" alt="">
    <div class="go">
      <a class="button" href="${link}">Make my ${name}</a>
      <div class="url">${link.replace(/^https:\/\//, "")}</div>
      <img class="qr" src="${qr}" alt="">
      <div class="scan">On a computer? Scan this with your phone.</div>
    </div>
  </div>
  <ol>
    <li><b>1</b><span>Open the link and fill it in: names, photos, your words.</span></li>
    <li><b>2</b><span>Press Send when it looks right.</span></li>
    <li><b>3</b><span>Type your Etsy order number. Your gift's link is ready to share.</span></li>
  </ol>
  <div class="note">Your Etsy order number is in your Etsy receipt email and under You → Purchases on Etsy. Stuck? Message us on Etsy and we'll sort it out.</div>
</div></body></html>`;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 794, height: 1123 } });
for (const [slug, name] of LISTINGS) {
  const link = `${origin}/etsy/${slug}`;
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 600, color: { dark: "#24121b", light: "#fdf7f3" } });
  const poster = `data:image/jpeg;base64,${readFileSync(join("public/templates", slug, "poster.jpg")).toString("base64")}`;
  await tab.setContent(page({ name, link, qr, poster }), { waitUntil: "networkidle" });
  await tab.evaluate(() => document.fonts.ready);
  await tab.pdf({ path: join(OUT, `${slug}.pdf`), format: "A4", printBackground: true });
  // ETSY_PDF_PREVIEW=<folder>: a picture of each page too, to check them without a PDF viewer.
  if (process.env.ETSY_PDF_PREVIEW) await tab.screenshot({ path: join(process.env.ETSY_PDF_PREVIEW, `${slug}.png`), fullPage: true });
  console.log(`${OUT}/${slug}.pdf`);
}
await browser.close();
