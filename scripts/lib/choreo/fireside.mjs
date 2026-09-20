/**
 * Fireside: the room at dusk with the candle unlit, the tap that lights it and the room warming up
 * around it, then the letter coming up in the candlelight.
 *
 * One button ("light the candle"); the template takes it from there — lighting, then reading — and
 * the letter's words fade in.
 */
export async function film({ page, live, spec, inGift, now }) {
  const marks = {};
  const says = (text) => (document.querySelector('[data-mode="live"]')?.innerText ?? "").includes(text);

  const light = live.getByRole("button", { name: /light the candle/i });
  await light.waitFor({ timeout: 60000 });
  await page.waitForTimeout(1800);

  // ── The candle ────────────────────────────────────────────────────────────────────────────────
  marks.dusk = now() - 1.0;
  await light.evaluate((b) => b.click());
  // Lit when the words start to arrive; the room has warmed by then.
  await inGift(says, spec.message.slice(0, 24), 12);
  marks.reading = now();
  marks.lit = marks.reading - 0.4;

  // ── The letter ────────────────────────────────────────────────────────────────────────────────
  await page.waitForTimeout(4200);
  marks.end = now();

  console.log("marks:", JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +(v - marks.dusk).toFixed(2)]))));
  return [
    { name: "window", from: marks.dusk, to: marks.reading + 0.7, stillAt: marks.reading + 0.4 }, // lit, the room warm
    { name: "letter", from: marks.reading - 0.4, to: marks.end, stillAt: marks.end - 0.3 }, // the letter, in
  ];
}
