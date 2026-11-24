/**
 * The Christmas e-mails' picture of The Tree Tag (docs/marketing/holiday-emails/): one tag drawn by the
 * print page's own shape on the cream paper, for Mia from Leo, tilted three degrees on white with a
 * soft shadow, 1040 × 880 (shown at 520 or less). Its code opens the home page in the e-mail's
 * language with ?ref=email-xmas-tag, so scans of the picture are counted apart from the button.
 *
 * Needs the development server (the picture comes from /print-preview, a 404 in production):
 *   PORT=3430 npm run dev
 *   node scripts/email-tree-tag-picture.mjs http://localhost:3430
 * Writes public/email/tree-tag.png and public/email/tree-tag-es.png.
 */
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const pictures = [
  { path: "/print-preview?shape=tree-tag&to=email", out: "public/email/tree-tag.png" },
  { path: "/es/print-preview?shape=tree-tag&lang=es&to=email", out: "public/email/tree-tag-es.png" },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 520, height: 440 }, deviceScaleFactor: 2 });
for (const { path, out } of pictures) {
  await page.goto(base + path);
  await page.locator('[data-testid="tree-tag"] .tag-qr img').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    const tag = document.querySelector('[data-testid="tree-tag"]').cloneNode(true);
    tag.removeAttribute("aria-hidden");
    // A cut tag, not a sheet to cut: a solid hairline edge in place of the dashed cut line.
    const edge = tag.querySelector(".tag-edge polygon");
    edge.removeAttribute("stroke-dasharray");
    edge.setAttribute("stroke", "#D9CFBF");
    tag.style.transform = "rotate(3deg) scale(.94)";
    tag.style.filter = "drop-shadow(0 14px 22px rgba(26,22,20,.13)) drop-shadow(0 2px 4px rgba(26,22,20,.08))";
    const stage = document.createElement("div");
    stage.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:#fff;display:grid;place-items:center";
    stage.append(tag);
    document.body.append(stage);
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 520, height: 440 } });
  console.log("wrote", out);
}
await browser.close();
