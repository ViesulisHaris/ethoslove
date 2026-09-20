/**
 * Pop-up Card: the card closed with her name on it, the tap that opens it and the cake rising out of
 * the fold; the candles lit one by one, the wish, the breath that puts them out; and the letter in
 * the lid.
 *
 * Closed, the whole card is one button ("open the card"). Each candle is a button ("Light candle").
 * The flames go out on a breath (the fake microphone) and "Read the letter" turns the lid.
 */
export async function film({ page, live, spec, breathe, inGift, now }) {
  const marks = {};
  const says = (text) => new RegExp(text, "i").test(document.querySelector('[data-mode="live"]')?.innerText ?? "");

  const card = live.getByRole("button", { name: /open the card/i });
  await card.waitFor({ timeout: 60000 });
  await page.waitForTimeout(1600);

  // ── The card opens ────────────────────────────────────────────────────────────────────────────
  marks.closed = now() - 0.8;
  await card.evaluate((b) => b.click());
  // Open when the candles can be lit. (Waits inside the gift: its seconds, not real ones — the card
  // takes 1.7 of them to open, which is a long time when it's filmed slowed down.)
  await inGift(() => !!document.querySelector('[data-mode="live"] [data-candle]'), null, 12);
  await inGift(says, "tap the candles", 8);
  await page.waitForTimeout(1200);
  marks.open = now();

  // ── The candles, the wish, the breath ─────────────────────────────────────────────────────────
  marks.candles = now() - 0.4;
  // The candles are drawn in SVG: no click() to call, and the cake's drawing is hidden from role
  // queries, so find them by their attribute and send the event, which React hears.
  const candles = live.locator("[data-candle]");
  const n = await candles.count();
  console.log(`  ${n} candles`);
  for (let i = 0; i < n; i++) {
    await candles.nth(i).dispatchEvent("click");
    await page.waitForTimeout(380);
  }
  await inGift(says, "make a wish", 6);
  await page.waitForTimeout(900);
  // The card asks before it listens; then the breath, and the smoke says they're out.
  const mic = live.getByRole("button", { name: /use microphone/i });
  if (await mic.count()) await mic.first().evaluate((b) => b.click());
  await inGift(says, "blow into your phone", 6);
  await page.waitForTimeout(500);
  marks.blow = now();
  await breathe(0.6);
  await inGift(() => !!document.querySelector('[data-mode="live"] .pc-smoke'), null, 8);
  await breathe(0);
  marks.out = now();
  await page.waitForTimeout(1500);
  marks.candlesEnd = now();

  // ── The letter in the lid ─────────────────────────────────────────────────────────────────────
  // The lid's button is inside a drawing hidden from role queries too: by its label attribute.
  const read = live.locator('button[aria-label="Read the letter"], [aria-label="Read the letter"]').first();
  await inGift(() => /read the letter/i.test(document.querySelector('[data-mode="live"]')?.innerText ?? ""), null, 10);
  await page.waitForTimeout(400);
  marks.letter = now() - 0.6;
  await read.evaluate((b) => b.click());
  await inGift(says, "so this is a card", 8);
  marks.reading = now();
  await page.waitForTimeout(3200);
  marks.end = now();

  console.log("marks:", JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +(v - marks.closed).toFixed(2)]))));
  return [
    { name: "open", from: marks.closed, to: marks.open, stillAt: marks.open - 0.2 }, // the cake up
    { name: "candles", from: marks.candles, to: marks.candlesEnd, stillAt: marks.blow - 0.3 }, // all lit, the wish
    { name: "letter", from: marks.letter, to: marks.end, stillAt: marks.end - 0.3 }, // the letter
  ];
}
