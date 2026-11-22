import { expect, test } from "@playwright/test";

/**
 * The flowers round a section never lie under its words (RULES.md, "never behind words"; the review
 * of 22 Nov 2026 found leaves under the landing page's headline at laptop widths and a lily under
 * the gifts page's at 320px). Every piece of every frame on a page (FloralFrame, cutouts.tsx) is
 * compared with the boxes of the text lines in its own section, at a small phone, a phone, a small
 * laptop, a laptop, a desk and a wide desk.
 *
 * A render is mostly air round a flower, so the flower is taken as the middle 60% of its picture,
 * clipped to the frame it is drawn in. A piece hidden at a width is not drawn and is not counted.
 */
const PAGES = ["/", "/es", "/gifts", "/es/gifts", "/trips", "/trips/amalfi-coast", "/dates/amsterdam", "/creators", "/long-distance"];
const SIZES: [number, number][] = [
  [320, 568],
  [375, 812],
  [1024, 768],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
];

// One browser is enough for a layout that sets its own sizes; the phone project would only repeat it.
test.skip(({ isMobile }) => isMobile, "sets its own screen sizes");

for (const path of PAGES) {
  test(`no flower of a frame lies under words on ${path}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: SIZES[0][0], height: SIZES[0][1] });
    await page.goto(path);
    await expect(page.locator("[data-floral-frame]").first()).toBeAttached();
    await page.evaluate(() => document.fonts.ready);
    for (const [width, height] of SIZES) {
      await page.setViewportSize({ width, height });
      // Two frames: the layout of the new width, and the words set in it.
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(null)))));
      const found = await page.evaluate(() => {
        const hits: string[] = [];
        let pieces = 0;
        for (const frame of document.querySelectorAll<HTMLElement>("[data-floral-frame]")) {
          const section = frame.parentElement!;
          const clip = frame.getBoundingClientRect();
          const lines: { box: DOMRect; text: string }[] = [];
          const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const owner = node.parentElement;
            if (!owner || !node.textContent?.trim() || frame.contains(node) || owner.closest("[aria-hidden=true]")) continue;
            const style = getComputedStyle(owner);
            if (style.visibility === "hidden" || style.display === "none") continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const box of range.getClientRects()) if (box.width > 2 && box.height > 2) lines.push({ box, text: node.textContent.trim().slice(0, 30) });
          }
          for (const img of frame.querySelectorAll("img")) {
            if (getComputedStyle(img).display === "none") continue;
            pieces += 1;
            const b = img.getBoundingClientRect();
            const flower = {
              left: Math.max(b.left + b.width * 0.2, clip.left),
              right: Math.min(b.right - b.width * 0.2, clip.right),
              top: Math.max(b.top + b.height * 0.2, clip.top),
              bottom: Math.min(b.bottom - b.height * 0.2, clip.bottom),
            };
            if (flower.right <= flower.left || flower.bottom <= flower.top) continue;
            for (const { box, text } of lines) {
              const over = Math.max(0, Math.min(flower.right, box.right) - Math.max(flower.left, box.left)) * Math.max(0, Math.min(flower.bottom, box.bottom) - Math.max(flower.top, box.top));
              if (over > 60) hits.push(`${frame.dataset.floralFrame}: ${img.getAttribute("src")!.split("/").pop()} over "${text}" (${Math.round(over)}px²)`);
            }
          }
        }
        return { hits: [...new Set(hits)], pieces, sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      expect(found.hits, `${path} at ${width}px`).toEqual([]);
      // The check is not passing on an empty page: a frame draws at least one flower at every width.
      expect(found.pieces, `${path} at ${width}px draws flowers`).toBeGreaterThan(0);
      expect(found.sideways, `${path} at ${width}px scrolls sideways`).toBeLessThanOrEqual(0);
    }
  });
}
