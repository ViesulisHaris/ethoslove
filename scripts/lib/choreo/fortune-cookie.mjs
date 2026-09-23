/**
 * Fortune Cookie: the tray as she finds it, then every joke cookie cracked in turn with its slip on a
 * screen of its own, and finally the last cookie — the real one — and the letter that comes up.
 *
 * Every cookie is a button labelled "Crack it open <n>"; the slip that follows sits over a dim
 * overlay and goes away when the overlay is tapped. Tapping the last one's slip away brings up the
 * letter. One still per moment: the tray, each slip, the letter.
 */
export async function film({ page, live, spec, inGift, now }) {
  const marks = {};
  const cookie = (n) => live.getByRole("button", { name: new RegExp(`crack it open ${n}$`, "i") });
  const slipUp = (text) => document.querySelector('[data-mode="live"]')?.innerText.includes(text);
  const away = () => live.locator("div.z-30").first().evaluate((el) => el.click());
  const fortunes = spec.fields.fortunes;
  const last = fortunes.length + 1; // the real one sits after the jokes

  await cookie(1).waitFor({ timeout: 60000 });
  // The tray settles first: it springs in, and the cookies float.
  await page.waitForTimeout(2000);
  marks.tray = now();
  const clips = [{ name: "tray", from: marks.tray - 1.6, to: marks.tray + 0.2, stillAt: marks.tray - 0.1 }];

  // ── Every joke cookie, cracked, its slip on its own screen ────────────────────────────────────
  for (let i = 1; i <= fortunes.length; i++) {
    if (i > 1) {
      await away();
      await page.waitForTimeout(700);
    }
    const from = now();
    await cookie(i).evaluate((b) => b.click());
    await inGift(slipUp, fortunes[i - 1].slice(0, 30), 6);
    await page.waitForTimeout(1800); // the slip unfurls, the words settle
    marks[`slip${i}`] = now();
    clips.push({ name: `slip-${i}`, from, to: marks[`slip${i}`] + 0.2, stillAt: marks[`slip${i}`] - 0.1 });
  }

  // ── The last one, and the letter ──────────────────────────────────────────────────────────────
  await away();
  await page.waitForTimeout(700);
  marks.real = now();
  await cookie(last).evaluate((b) => b.click());
  await inGift(() => /the real one/i.test(document.querySelector('[data-mode="live"]')?.innerText ?? ""), null, 6);
  await page.waitForTimeout(1400);
  // Tapping this slip away is what brings the letter up.
  await away();
  await inGift(slipUp, spec.message.split("\n")[0].slice(0, 40), 8);
  await page.waitForTimeout(2800);
  marks.letter = now();
  clips.push({ name: "letter", from: marks.real, to: marks.letter + 0.2, stillAt: marks.letter - 0.1 });

  console.log("marks:", JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +(v - marks.tray).toFixed(2)]))));
  return clips;
}
