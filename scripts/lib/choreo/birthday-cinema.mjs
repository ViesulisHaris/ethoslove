/**
 * Birthday Cinema: the curtains parting on the marquee and the cake; the breath that puts the
 * candles out, a gust at a time, and the confetti; then the message.
 *
 * "tap to start the show" opens the curtains. The cake asks before it listens ("Use microphone");
 * every stretch of breath the detector hears takes a few candles, so one held breath clears six.
 * With no photos the film strip has nothing to roll, and the message follows the confetti.
 */
export async function film({ page, live, spec, breathe, inGift, now }) {
  const marks = {};
  const text = () => document.querySelector('[data-mode="live"]')?.innerText ?? "";
  const says = (s) => new RegExp(s, "i").test(document.querySelector('[data-mode="live"]')?.innerText ?? "");

  const start = live.getByRole("button", { name: /tap to start the show/i });
  await start.waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);

  // ── The curtains ──────────────────────────────────────────────────────────────────────────────
  marks.closed = now() - 1.4; // the marquee, before the tap
  await start.evaluate((b) => b.click());
  await inGift(says, "use microphone|blow into your phone|swipe up to blow", 10);
  await page.waitForTimeout(1600);
  marks.cake = now();

  // ── The candles ───────────────────────────────────────────────────────────────────────────────
  const mic = live.getByRole("button", { name: /use microphone/i });
  if (await mic.count()) await mic.first().evaluate((b) => b.click());
  await inGift(says, "blow into your phone", 6);
  await page.waitForTimeout(600);
  marks.blow = now() - 0.5;
  await breathe(0.6);
  // Out when the cake stops asking for breath.
  await inGift(() => !/blow into your phone/i.test(document.querySelector('[data-mode="live"]')?.innerText ?? ""), null, 10);
  await breathe(0);
  marks.out = now();
  await page.waitForTimeout(2200); // the smoke, the confetti
  marks.candlesEnd = now();

  // ── The message ───────────────────────────────────────────────────────────────────────────────
  const roll = live.getByRole("button", { name: /roll the film/i });
  const opening = spec.message.slice(0, 20);
  await inGift((t) => new RegExp("roll the film|" + t, "i").test(document.querySelector('[data-mode="live"]')?.innerText ?? ""), opening, 10);
  if (await roll.count()) await roll.first().evaluate((b) => b.click());
  await inGift(says, opening, 10);
  marks.message = now() - 0.5;
  await page.waitForTimeout(2600); // the words come in
  // The message runs past the bottom of the screen, so ease it up, the way a thumb would, until the
  // sign-off sits clear of the foot of the phone — in the page's own units, since inside the zoomed
  // box a bounding rectangle is 2.5 times a scroll position.
  await page.evaluate(async (signOff) => {
    const gift = document.querySelector('[data-mode="live"]');
    const sc = [...gift.querySelectorAll("div")].find((d) => /overflow-y-auto/.test(d.className));
    const last = [...gift.querySelectorAll("p,span,div")].filter((e) => !e.children.length && e.textContent.toLowerCase().includes(signOff)).pop();
    if (!sc || !last) return;
    let y = 0;
    for (let e = last; e && e !== sc; e = e.offsetParent) y += e.offsetTop;
    const target = Math.max(0, Math.min(sc.scrollHeight - sc.clientHeight, y + last.offsetHeight - sc.clientHeight + 110));
    const from = sc.scrollTop;
    const start = performance.now();
    await new Promise((done) => {
      const step = (t) => {
        const k = Math.min(1, (t - start) / 1400);
        sc.scrollTop = from + (target - from) * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
        if (k < 1) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    });
  }, "from ollie");
  await page.waitForTimeout(1500);
  marks.end = now();

  console.log("marks:", JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +(v - marks.closed).toFixed(2)]))));
  return [
    { name: "curtains", from: marks.closed, to: marks.cake + 1.3, stillAt: marks.cake + 0.6 }, // the cake, lit
    { name: "candles", from: marks.blow, to: marks.candlesEnd, stillAt: marks.out + 1.2 }, // out, confetti
    { name: "message", from: marks.message, to: marks.end, stillAt: marks.end - 0.3 }, // the message
  ];
}
