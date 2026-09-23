/**
 * XOXO: the envelope sealed with a kiss, then down the page the way she'd read it — the cut-out
 * letters and the first polaroid, the lines he'd underline, a few kisses left where she tapped,
 * the other polaroids, the letter, the end.
 *
 * "open it" is a button over the envelope; the page under it is one scroller, and a tap anywhere
 * on it that isn't a photo or a button leaves a kiss. The kiss lands where the tap's client
 * coordinates fall in the page's own units, so inside the zoomed box the click is dispatched in
 * those units, not the screen's.
 */
import { glide } from "./_scroll.mjs";

export async function film({ page, live, spec, inGift, now }) {
  const marks = {};
  const says = (s) => new RegExp(s, "i").test(document.querySelector('[data-mode="live"]')?.innerText ?? "");

  const open = live.getByRole("button", { name: /^open it$|^ábrelo$/i });
  await open.waitFor({ timeout: 60000 });
  await page.waitForTimeout(1800); // the envelope settles, "open it" pulses
  marks.envelope = now();

  // ── The page: the letters, the first polaroid, the card ───────────────────────────────────────
  await open.evaluate((b) => b.click());
  await inGift(says, "tap anywhere to leave a kiss|toca donde quieras", 8);
  await page.waitForTimeout(2800); // the pieces drop, stamp and bloom in
  marks.top = now();

  // ── The lines, and three kisses where she tapped ──────────────────────────────────────────────
  console.log("  lines:", await glide(page, { text: "tap anywhere to leave a kiss|toca donde quieras", leaf: true }, { offset: 610 }));
  await page.waitForTimeout(900);
  marks.lines = now();
  await page.evaluate(async () => {
    const gift = document.querySelector('[data-mode="live"]');
    const sc = gift.querySelector("[data-scroller]");
    const column = sc.firstElementChild;
    const box = column.getBoundingClientRect();
    const unit = Math.min(column.clientWidth / 100, 5.4);
    // In the page's units: the top of what's on screen, then three spots over the polaroid and the
    // lace — not the card, where a kiss would sit on the words.
    const top = sc.scrollTop / unit;
    for (const [x, y] of [[18, top + 14], [84, top + 40], [12, top + 78]]) {
      sc.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: box.left + x * unit, clientY: box.top + y * unit }));
      await new Promise((done) => setTimeout(done, 420));
    }
  });
  await page.waitForTimeout(1200);
  marks.kisses = now();

  // ── The other polaroids ───────────────────────────────────────────────────────────────────────
  console.log("  pair:", await glide(page, { selector: "[data-scroller] > div > section", nth: 1 }, { offset: 24 }));
  await page.waitForTimeout(2200); // they slide in from the sides
  marks.pair = now();
  console.log("  more:", await glide(page, { selector: "[data-scroller] > div > section", nth: 2 }, { offset: 30 }));
  await page.waitForTimeout(2200);
  marks.more = now();

  // ── The letter, then the end ──────────────────────────────────────────────────────────────────
  // The letter is the last section: with fewer photos the pair and the rest sections aren't there.
  console.log("  letter:", await glide(page, { selector: "[data-scroller] > div > section", nth: -1 }, { offset: 8 }));
  await inGift(says, spec.message.slice(0, 24).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), 10);
  await page.waitForTimeout(2600);
  marks.letter = now();
  console.log("  end:", await glide(page, "end", { offset: 0, ms: 1600 }));
  await page.waitForTimeout(1600);
  marks.end = now();

  console.log("marks:", JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +(v - marks.envelope).toFixed(2)]))));
  return [
    { name: "envelope", from: marks.envelope - 1.5, to: marks.top - 2.4, stillAt: marks.envelope - 0.1 }, // sealed with a kiss
    { name: "page", from: marks.top - 2.6, to: marks.top + 0.2, stillAt: marks.top - 0.1 }, // the letters and the first polaroid
    { name: "lines", from: marks.top, to: marks.kisses, stillAt: marks.kisses - 0.2 }, // the card, kisses left
    { name: "polaroids", from: marks.kisses, to: marks.pair, stillAt: marks.pair - 0.2 }, // the pair
    { name: "more", from: marks.pair, to: marks.more, stillAt: marks.more - 0.2 }, // the rest
    { name: "letter", from: marks.more, to: marks.letter, stillAt: marks.letter - 0.2 }, // the letter
    { name: "end", from: marks.letter, to: marks.end, stillAt: marks.end - 0.2 }, // the end. for now.
  ];
}
