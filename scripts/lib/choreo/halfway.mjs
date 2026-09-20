/**
 * Halfway: the postcard at rest, the flight to the halfway note (held a moment), the rest of the way
 * to the heart, then the postcard turning over to the letter — and down to the photos if it has any.
 */
export async function film({ page, live, spec, breathe, inGift, now, pictures }) {
  const marks = {};
  const km = () => live.locator("p.tabular-nums").first().innerText().then((t) => Number(t.replace(/[^\d]/g, "")));

  const blowButton = page.getByRole("button", { name: new RegExp(`blow the .* to ${spec.recipientName}`, "i") });
  await blowButton.waitFor({ timeout: 60000 });
  await page.waitForTimeout(1200);
  console.log(`the postcard says ${await km()} km`);

  // The microphone first, so the clip opens on the postcard asking to be blown, not on a permission.
  await blowButton.evaluate((b) => b.click());
  await live.getByText(/blow into your phone/i).first().waitFor({ timeout: 15000 });
  marks.rest = now();
  await page.waitForTimeout(350);

  // Ease off before the middle: the plane glides on after the breath stops, so letting go at the note
  // overshoots, and "halfway" reads wrong over "148 km to go". How far it glides depends on how fast
  // it is going, so let go when, at its current speed, a third of a second more would bring it just past
  // the middle. The glide carries it over and the note comes up; a short puff if it falls short.
  const noteUp = (note) => document.querySelector('[data-mode="live"]')?.innerText.includes(note);
  const total = await km();
  const kmBelow = (limit) => Number((document.querySelector('[data-mode="live"] p.tabular-nums')?.innerText ?? "").replace(/[^\d]/g, "")) < limit;
  // A steady blow, not the hardest: flat out (0.35 and up) the plane is over the middle in just over a
  // second; at 0.25 it takes about two, long enough to watch the kilometres fall.
  await breathe(0.25);
  // The clip opens a beat before the plane moves, not on the whole wait for a breath to register.
  await inGift(kmBelow, total, 6);
  marks.rest = Math.max(marks.rest, now() - 0.6);
  await inGift(
    ({ total, target, glide }) => {
      const left = Number((document.querySelector('[data-mode="live"] p.tabular-nums')?.innerText ?? "").replace(/[^\d]/g, ""));
      const t = performance.now() / 1000;
      const seen = (window.__kmSeen ??= []);
      seen.push([t, left]);
      while (seen.length > 2 && t - seen[0][0] > 0.3) seen.shift();
      const [t0, k0] = seen[0];
      const rate = t > t0 ? (k0 - left) / (t - t0) : 0;
      return left - rate * glide <= total * target;
    },
    { total, target: 0.47, glide: 0.3 },
    8,
  );
  await breathe(0);
  if (!(await page.waitForFunction(noteUp, spec.fields.halfwayNote, { timeout: 2500, polling: 25 }).then(() => true, () => false))) {
    await breathe(0.5);
    await inGift(noteUp, spec.fields.halfwayNote, 4);
    await breathe(0);
  }
  marks.note = now();
  await page.waitForTimeout(1600);
  marks.noteEnd = now();
  console.log(`let go, and it stopped at ${await km()} of ${total} km`);

  // The rest of the way: the path becomes a heart.
  marks.resume = now();
  await breathe(0.25);
  await inGift(() => /together/i.test(document.querySelector('[data-mode="live"]')?.innerText ?? ""), null, 8);
  await breathe(0);
  marks.together = now();
  await page.waitForTimeout(1600);
  marks.heart = now();

  // The postcard turns over and the letter comes up, signed.
  await inGift(() => /a postcard from/i.test(document.querySelector('[data-mode="live"]')?.innerText ?? ""), null, 12);
  await page.waitForTimeout(3400);

  // With photos, carry on down to them, the way a thumb would. They only arrive once the letter has
  // finished, so wait for them rather than scrolling to where they are going to be.
  if (pictures.length) {
    await inGift(() => [...(document.querySelector('[data-mode="live"]')?.querySelectorAll("img") ?? [])].some((i) => i.complete && i.getBoundingClientRect().width > 0 && !i.closest("[aria-hidden=true]")), null, 8);
    await page.waitForTimeout(400);
    await page.evaluate(async () => {
      const gift = document.querySelector('[data-mode="live"]');
      const sc = [...gift.querySelectorAll("div")].find((d) => /overflow-y-auto/.test(d.className));
      const heading = [...gift.querySelectorAll("p,h2,h3,span,div")].find((e) => /^\s*along the way\s*$/i.test(e.textContent ?? ""));
      if (!sc) return;
      // Where the photos start, in the page's own units: inside the zoomed box a bounding rectangle is
      // 2.5 times the size of a scroll position, and mixing the two lands on the end card.
      let y = 0;
      for (let e = heading; e && e !== sc; e = e.offsetParent) y += e.offsetTop;
      const target = Math.min(sc.scrollHeight - sc.clientHeight, heading ? y - 24 : Infinity);
      const from = sc.scrollTop;
      const start = performance.now();
      await new Promise((done) => {
        const step = (t) => {
          const k = Math.min(1, (t - start) / 2600);
          sc.scrollTop = from + (target - from) * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
          if (k < 1) requestAnimationFrame(step);
          else done();
        };
        requestAnimationFrame(step);
      });
    });
    await page.waitForTimeout(1300);
  }
  marks.end = now();

  // Three clips: the flight to the note, the rest of the way to the heart, and the postcard turning
  // over to the letter (and down to the photos, when there are some).
  return [
    { name: "flight", from: marks.rest, to: marks.noteEnd, stillAt: marks.noteEnd - 0.2 }, // the note up
    { name: "home", from: marks.resume, to: marks.heart, stillAt: marks.together + 0.9 }, // the heart
    { name: "letter", from: marks.heart, to: marks.end, stillAt: marks.end - 0.1 }, // the letter, signed
  ];
}
