/**
 * Jar of Reasons: the jar as she finds it, then the first notes pulled one at a time, each on a
 * screen of its own, and — once the rest are out, off camera — the letter, read from its top.
 *
 * The jar is a button ("tap the jar"; shaking needs a phone); each note sits over a dim overlay that
 * folds it back when tapped; after the first, "Pull another" pulls the next. Which reason comes out
 * first is the template's own seeded order, so the log says what each note said (a closing chat that
 * names a note should name one of these).
 */
const SHOWN = 5; // enough to say "there are a lot", not enough to bore

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
  await page.waitForTimeout(2000);
  marks.jar = now();
  const clips = [{ name: "jar", from: marks.jar - 1.6, to: marks.jar + 0.2, stillAt: marks.jar - 0.1 }];

  // ── The first notes, one screen each ──────────────────────────────────────────────────────────
  const shown = Math.min(SHOWN, total);
  for (let n = 1; n <= shown; n++) {
    const from = now();
    if (n === 1) await jar.evaluate((b) => b.click());
    else await pullButton().evaluate((b) => b.click());
    await inGift(noteUp, null, 6);
    await page.waitForTimeout(1500); // it unfolds, the photo lands
    console.log(`  note ${n}: ${await noteText()}`);
    marks[`note${n}`] = now();
    clips.push({ name: `note-${n}`, from, to: marks[`note${n}`] + 0.2, stillAt: marks[`note${n}`] - 0.1 });
    await fold();
    await inGift(noteGone, null, 4);
    await page.waitForTimeout(250);
  }

  // ── The rest, quickly, off camera; then the letter from its top ───────────────────────────────
  for (let n = shown + 1; n <= total; n++) {
    await pullButton().evaluate((b) => b.click());
    await inGift(noteUp, null, 6);
    await page.waitForTimeout(120);
    await fold();
    await inGift(noteGone, null, 4);
  }
  const read = live.getByRole("button", { name: /read the letter/i });
  await read.waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  await read.evaluate((b) => b.click());
  await inGift((t) => document.querySelector('[data-mode="live"]')?.innerText.includes(t), spec.message.slice(0, 30), 8);
  await page.waitForTimeout(3000);
  marks.letter = now();
  clips.push({ name: "letter", from: marks.letter - 3, to: marks.letter + 0.2, stillAt: marks.letter - 0.1 });

  console.log("marks:", JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +(v - marks.jar).toFixed(2)]))));
  return clips;
}
