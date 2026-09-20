/**
 * Jar of Reasons: the jar as she finds it, the first note tumbling out and unfolding, then a run of
 * them one after another — the point is how many there are — and, once the jar is empty, the letter.
 *
 * The jar is a button ("tap the jar"; shaking needs a phone); each note sits over a dim overlay that
 * folds it back when tapped; after the first, "Pull another" pulls the next. Which reason comes out
 * first is the template's own seeded order, so the log says what each note said and the stills can
 * be picked afterwards.
 */
export async function film({ page, live, spec, inGift, now }) {
  const marks = {};
  const total = spec.fields.reasons.length;
  const noteUp = () => !!document.querySelector('[data-mode="live"] .z-30');
  const noteGone = () => !document.querySelector('[data-mode="live"] .z-30');
  const noteText = () => live.locator(".z-30 p").nth(1).innerText().catch(() => "");
  const pullButton = () => live.getByRole("button", { name: /pull another/i });
  const fold = () => live.locator("div.z-30").first().evaluate((el) => el.click());

  const jar = live.getByRole("button", { name: /tap the jar|shake or tap the jar/i });
  await jar.waitFor({ timeout: 60000 });
  // The cover is still fading out when the jar first exists underneath it.
  await inGift(() => !/tap to open/i.test(document.querySelector('[data-mode="live"]')?.innerText ?? ""), null, 8);
  await page.waitForTimeout(1800);

  // ── The first note ────────────────────────────────────────────────────────────────────────────
  marks.jar = now() - 0.8;
  await jar.evaluate((b) => b.click());
  await inGift(noteUp, null, 6);
  await page.waitForTimeout(700); // it unfolds
  const first = await noteText();
  console.log(`  note 1: ${first}`);
  await page.waitForTimeout(2000);
  marks.jarEnd = now();

  // ── One after another: fold, pull, read, fold… ────────────────────────────────────────────────
  await fold();
  await inGift(noteGone, null, 4);
  await page.waitForTimeout(500);
  marks.run = now() - 0.2;
  const said = [first];
  const shown = 5; // enough to say "there are a lot", not enough to bore
  for (let n = 2; n <= shown; n++) {
    await pullButton().evaluate((b) => b.click());
    await inGift(noteUp, null, 6);
    await page.waitForTimeout(450);
    said.push(await noteText());
    console.log(`  note ${n}: ${said.at(-1)}`);
    await page.waitForTimeout(n === shown ? 1500 : 350);
    if (n < shown) {
      await fold();
      await inGift(noteGone, null, 4);
      await page.waitForTimeout(100);
    }
  }
  marks.runEnd = now();

  // ── The rest, quickly, off camera; then the empty jar and the letter ─────────────────────────
  await fold();
  await inGift(noteGone, null, 4);
  for (let n = shown + 1; n <= total; n++) {
    await pullButton().evaluate((b) => b.click());
    await inGift(noteUp, null, 6);
    await page.waitForTimeout(120);
    await fold();
    await inGift(noteGone, null, 4);
  }
  const read = live.getByRole("button", { name: /read the letter/i });
  await read.waitFor({ timeout: 15000 });
  await page.waitForTimeout(1200);
  marks.empty = now() - 1.0;
  await read.evaluate((b) => b.click());
  await inGift((t) => document.querySelector('[data-mode="live"]')?.innerText.includes(t), spec.message.slice(0, 30), 8);
  marks.letter = now();
  await page.waitForTimeout(3200);
  marks.end = now();

  console.log("marks:", JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +(v - marks.jar).toFixed(2)]))));
  return [
    { name: "jar", from: marks.jar, to: marks.jarEnd, stillAt: marks.jarEnd - 0.3 }, // the first note
    { name: "notes", from: marks.run, to: marks.runEnd, stillAt: marks.runEnd - 0.4 }, // the last of the run
    { name: "letter", from: marks.empty, to: marks.end, stillAt: marks.end - 0.3 }, // the letter
  ];
}
