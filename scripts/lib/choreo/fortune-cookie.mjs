/**
 * Fortune Cookie: the tray as she finds it, a cookie cracked open and its slip, then another one a
 * few cookies along, and finally the last cookie — the real one — and the letter that comes up.
 *
 * Every cookie is a button labelled "Crack it open <n>"; the slip that follows sits over a dim
 * overlay and goes away when the overlay is tapped. Tapping the last one's slip away brings up the
 * letter.
 */
export async function film({ page, live, spec, inGift, now }) {
  const marks = {};
  const cookie = (n) => live.getByRole("button", { name: new RegExp(`crack it open ${n}$`, "i") });
  const slipUp = (text) => document.querySelector('[data-mode="live"]')?.innerText.includes(text);
  const fortunes = spec.fields.fortunes;
  const last = fortunes.length + 1; // the real one sits after the jokes

  await cookie(1).waitFor({ timeout: 60000 });
  // The tray settles first: it springs in, and the cookies float.
  await page.waitForTimeout(1500);

  // ── The first cookie: the tray, the crack, the joke ───────────────────────────────────────────
  marks.tray = now() - 0.7;
  await cookie(1).evaluate((b) => b.click());
  await inGift(slipUp, fortunes[0], 6);
  marks.joke = now();
  await page.waitForTimeout(2400);
  marks.jokeEnd = now();

  // ── The one that says it: put the slip away, then the fourth cookie ───────────────────────────
  const away = () => live.locator("div.z-30").first().evaluate((el) => el.click());
  await away();
  await page.waitForTimeout(700);
  marks.news = now() - 0.5;
  await cookie(4).evaluate((b) => b.click());
  await inGift(slipUp, fortunes[3], 6);
  await page.waitForTimeout(2600);
  marks.newsEnd = now();

  // ── The last one, and the letter ──────────────────────────────────────────────────────────────
  await away();
  await page.waitForTimeout(700);
  marks.real = now() - 0.5;
  await cookie(last).evaluate((b) => b.click());
  await inGift(() => /the real one/i.test(document.querySelector('[data-mode="live"]')?.innerText ?? ""), null, 6);
  await page.waitForTimeout(1400);
  // Tapping this slip away is what brings the letter up.
  await away();
  await inGift(slipUp, spec.message.split("\n")[0].slice(0, 40), 8);
  marks.letter = now();
  await page.waitForTimeout(2800);
  marks.end = now();

  console.log("marks:", JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +(v - marks.tray).toFixed(2)]))));

  return [
    { name: "cookies", from: marks.tray, to: marks.jokeEnd, stillAt: marks.joke + 1.1 }, // the joke slip
    { name: "news", from: marks.news, to: marks.newsEnd, stillAt: marks.newsEnd - 0.6 }, // "ok. i got the job."
    { name: "letter", from: marks.real, to: marks.end, stillAt: marks.end - 0.3 }, // the letter, signed
  ];
}
