/**
 * Scrapbook: the closed book with the polaroid tucked in the top, then page by page the way
 * she'd scroll it — the cut-out title and the first polaroid developing, the torn note, the
 * photo-booth strip and the stamp, the roll of film, the letter, the end.
 *
 * "open the scrapbook" is the cover; the page is one scroller and every piece sticks itself down
 * as it scrolls into view, so each stop waits for that.
 */
import { glide } from "./_scroll.mjs";

export async function film({ page, live, spec, inGift, now }) {
  const marks = {};
  const says = (s) => new RegExp(s, "i").test(document.querySelector('[data-mode="live"]')?.innerText ?? "");
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const open = live.getByRole("button", { name: /open the scrapbook|abre el álbum/i });
  await open.waitFor({ timeout: 60000 });
  await page.waitForTimeout(2000); // the book lands, the hint pulses
  marks.closed = now();

  // ── The first page ────────────────────────────────────────────────────────────────────────────
  await open.evaluate((b) => b.click());
  await inGift(says, escape((spec.fields?.quote ?? "").slice(0, 16)) || "photo booth", 8);
  await page.waitForTimeout(3400); // the title, the polaroid develops
  marks.page = now();

  // ── The torn note, the booth strip and the stamp, the film ────────────────────────────────────
  console.log("  note:", await glide(page, { text: escape((spec.fields?.quote ?? "").slice(0, 16)), leaf: true }, { offset: 250 }));
  await page.waitForTimeout(1800);
  marks.note = now();
  console.log("  booth:", await glide(page, { selector: "section.grid" }, { offset: 40 }));
  await page.waitForTimeout(2000);
  marks.booth = now();
  console.log("  film:", await glide(page, { selector: "figure", nth: 1 }, { offset: 210 }));
  await page.waitForTimeout(1800);
  marks.film = now();

  // ── The letter, then the end ──────────────────────────────────────────────────────────────────
  console.log("  letter:", await glide(page, { selector: "article" }, { offset: 36 }));
  await inGift(says, escape(spec.message.slice(0, 24)), 10);
  await page.waitForTimeout(2400);
  marks.letter = now();
  console.log("  end:", await glide(page, "end", { offset: 0, ms: 1600 }));
  await page.waitForTimeout(1800);
  marks.end = now();

  console.log("marks:", JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +(v - marks.closed).toFixed(2)]))));
  return [
    { name: "closed", from: marks.closed - 1.6, to: marks.page - 3.2, stillAt: marks.closed - 0.1 }, // the book, closed
    { name: "page", from: marks.page - 3.4, to: marks.page + 0.2, stillAt: marks.page - 0.1 }, // the first page
    { name: "note", from: marks.page, to: marks.note, stillAt: marks.note - 0.2 }, // the torn note
    { name: "booth", from: marks.note, to: marks.booth, stillAt: marks.booth - 0.2 }, // the strip and the stamp
    { name: "film", from: marks.booth, to: marks.film, stillAt: marks.film - 0.2 }, // the roll of film
    { name: "letter", from: marks.film, to: marks.letter, stillAt: marks.letter - 0.2 }, // the letter
    { name: "end", from: marks.letter, to: marks.end, stillAt: marks.end - 0.2 }, // the end
  ];
}
