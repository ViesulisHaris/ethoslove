/**
 * Coquette: the page still tied — the satin bow and the tag — then, once the bow is untied, the
 * collage a screen at a time from the top of each part: the first polaroid in the flowers with the
 * ticket and the postcard, the gingham strip, the scattered polaroids, the letter.
 *
 * "untie the bow" is a button over the whole page; underneath is one scroller made of sections,
 * so every still is a stop at a section's top, never half way down one.
 */
import { glide } from "./_scroll.mjs";

export async function film({ page, live, spec, inGift, now }) {
  const marks = {};
  const says = (s) => new RegExp(s, "i").test(document.querySelector('[data-mode="live"]')?.innerText ?? "");
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const untie = live.getByRole("button", { name: /untie the bow|desata el lazo/i });
  await untie.waitFor({ timeout: 60000 });
  await page.waitForTimeout(2200); // the bow springs in, the tag swings
  marks.bow = now();

  // ── The first screen ──────────────────────────────────────────────────────────────────────────
  await untie.evaluate((b) => b.click());
  await inGift(says, escape(spec.fields?.ticket?.slice(0, 12) || "ticket to happiness"), 8);
  await page.waitForTimeout(3000); // the pieces drop and bloom in
  marks.page = now();

  // ── The strip, the rest, the letter ───────────────────────────────────────────────────────────
  console.log("  strip:", await glide(page, { selector: "[data-scroller] > div > section", nth: 1 }, { offset: 12 }));
  await page.waitForTimeout(2200);
  marks.strip = now();
  console.log("  more:", await glide(page, { selector: "[data-scroller] > div > section", nth: 2 }, { offset: 12 }));
  await page.waitForTimeout(2200);
  marks.more = now();
  console.log("  letter:", await glide(page, { selector: "[data-scroller] > div > section", nth: 3 }, { offset: 0 }));
  await inGift(says, escape(spec.message.slice(0, 24)), 10);
  await page.waitForTimeout(2600);
  marks.letter = now();

  console.log("marks:", JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +(v - marks.bow).toFixed(2)]))));
  return [
    { name: "bow", from: marks.bow - 2, to: marks.page - 3, stillAt: marks.bow - 0.1 }, // tied, with the tag
    { name: "page", from: marks.page - 3.2, to: marks.page + 0.3, stillAt: marks.page - 0.1 }, // the first screen
    { name: "strip", from: marks.page, to: marks.strip, stillAt: marks.strip - 0.2 }, // the gingham strip
    { name: "more", from: marks.strip, to: marks.more, stillAt: marks.more - 0.2 }, // the rest
    { name: "letter", from: marks.more, to: marks.letter, stillAt: marks.letter - 0.2 }, // the letter
  ];
}
