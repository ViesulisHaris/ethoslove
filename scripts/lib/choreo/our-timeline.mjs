/**
 * Our Timeline: the garland and the title card, then down the road one milestone at a time — each
 * pin centred on its own screen with the road drawn up to it — and the ending: the closing line
 * and the letter under it.
 *
 * "scroll to begin" is a button over the title card. Every milestone is a full-height section, so
 * a still per pin is a stop at each section's top; the road is drawn by a spring on scroll, so
 * each stop waits for it to catch up and the card to light.
 */
import { glide } from "./_scroll.mjs";

export async function film({ page, live, spec, inGift, now }) {
  const marks = {};
  const says = (s) => new RegExp(s, "i").test(document.querySelector('[data-mode="live"]')?.innerText ?? "");
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const begin = live.getByRole("button", { name: /scroll to begin|desliza para empezar/i });
  await begin.waitFor({ timeout: 60000 });
  await page.waitForTimeout(2400); // the garland swings in, the card lands
  marks.card = now();
  const clips = [{ name: "card", from: marks.card - 2.2, to: marks.card + 0.3, stillAt: marks.card - 0.1 }];

  // ── The pins, one screen each ─────────────────────────────────────────────────────────────────
  await begin.evaluate((b) => b.click());
  const n = (spec.photos ?? []).length;
  for (let i = 0; i < n; i++) {
    console.log(`  pin ${i + 1}:`, await glide(page, { selector: '[class*="h-[100cqh]"]', nth: i }, { offset: 0, ms: 1400 }));
    await page.waitForTimeout(2000); // the road catches up and the card lights
    marks[`pin${i + 1}`] = now();
    clips.push({ name: `pin-${i + 1}`, from: marks[`pin${i + 1}`] - 2.2, to: marks[`pin${i + 1}`] + 0.3, stillAt: marks[`pin${i + 1}`] - 0.1 });
  }

  // ── The ending: the line, and the letter under it ─────────────────────────────────────────────
  console.log("  letter:", await glide(page, { selector: "section", nth: 1 }, { offset: 0, ms: 1400 }));
  await inGift(says, escape(spec.message.slice(0, 24)), 10);
  await page.waitForTimeout(2800); // the words fade in, the sign-off follows
  marks.letter = now();
  clips.push({ name: "letter", from: marks.letter - 3, to: marks.letter + 0.3, stillAt: marks.letter - 0.1 });

  console.log("marks:", JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +(v - marks.card).toFixed(2)]))));
  return clips;
}
