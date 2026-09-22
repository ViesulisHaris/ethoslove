/**
 * Bloom: the flower shut, a finger held on the screen while it opens petal by petal, the moment it
 * says it's open with the pollen still drifting, and the note inside.
 *
 * Holding is a real press: the flower only opens while a pointer is down on it, so the mouse goes to
 * the middle of the phone and stays there. Everything else is waiting for what the gift says.
 */
export async function film({ page, live, spec, inGift, now, slow }) {
  const marks = {};
  const says = (text) => document.querySelector('[data-mode="live"]')?.innerText.includes(text);

  const hold = live.locator("[data-hold]");
  await hold.waitFor({ timeout: 60000 });
  // The flower settles, the pill breathes "hold to bloom".
  await page.waitForTimeout(1600);

  // ── The hold: the petals come open while the finger is down ───────────────────────────────────
  const box = await live.boundingBox();
  const at = [box.x + box.width / 2, box.y + box.height * 0.42];
  marks.bud = now() - 0.7;
  await page.mouse.move(at[0], at[1]);
  await page.mouse.down();
  // It's open when the gift says so; the ring fills while the finger stays down.
  await inGift(says, "It's open", 20);
  marks.open = now();
  // A beat with the finger still down, then let go: the flower stays open.
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.waitForTimeout(1500);
  marks.openEnd = now();

  // ── Open, in the light ────────────────────────────────────────────────────────────────────────
  marks.still = now() - 3.6;

  // ── The note inside ───────────────────────────────────────────────────────────────────────────
  marks.note = now() - 0.5;
  const read = live.getByRole("button", { name: /read|note/i }).first();
  await read.evaluate((b) => b.click());
  await inGift(says, spec.message.slice(0, 24), 8);
  marks.reading = now();
  await page.waitForTimeout(3800); // long enough to read all of it
  marks.end = now();

  console.log("marks:", JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +(v - marks.bud).toFixed(2)]))), `(${slow}x)`);

  return [
    { name: "bloom", from: marks.bud, to: marks.open + 1.2, stillAt: marks.open + 0.9 }, // opening
    { name: "open", from: marks.still, to: marks.openEnd, stillAt: marks.openEnd - 0.4 }, // open, pollen
    { name: "note", from: marks.note, to: marks.end, stillAt: marks.end - 0.3 }, // the note
  ];
}
