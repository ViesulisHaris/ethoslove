/**
 * Museum: the entrance — the first work hung and roped off, the plaque, "enter" — then a still in
 * every room as the camera dollies to it, and the wall text at the end: the letter.
 *
 * The rooms are a horizontal snap scroller; "enter" and each room's "Next room" button scroll it
 * one screen, so there is no half-way frame to avoid. The wall text is its own vertical scroller
 * and is read from its top.
 */
export async function film({ page, live, spec, inGift, now }) {
  const marks = {};
  const says = (s) => new RegExp(s, "i").test(document.querySelector('[data-mode="live"]')?.innerText ?? "");
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // One room along: the same smooth scroll the "Next room" button does, without needing the button.
  const walk = () =>
    page.evaluate(() => {
      const gift = document.querySelector('[data-mode="live"]');
      const sc = [...gift.querySelectorAll("div")].find((d) => /overflow-x-auto/.test(d.className) && /snap-x/.test(d.className));
      sc?.scrollBy({ left: sc.clientWidth, behavior: "smooth" });
      return sc ? `${Math.round(sc.scrollLeft / sc.clientWidth)} → ${Math.round(sc.scrollLeft / sc.clientWidth) + 1}` : "no scroller";
    });

  const enter = live.getByRole("button", { name: /^enter$|^entrar$/i });
  await enter.waitFor({ timeout: 60000 });
  await page.waitForTimeout(2400); // the frame lands, the light settles
  marks.entrance = now();
  const clips = [{ name: "entrance", from: marks.entrance - 2.2, to: marks.entrance + 0.3, stillAt: marks.entrance - 0.1 }];

  // ── The rooms ─────────────────────────────────────────────────────────────────────────────────
  const n = (spec.photos ?? []).length;
  await enter.evaluate((b) => b.click());
  for (let i = 0; i < n; i++) {
    if (i > 0) console.log(`  room ${i + 1}:`, await walk());
    await page.waitForTimeout(2000); // the dolly, and the frame scaling up to meet you
    marks[`room${i + 1}`] = now();
    clips.push({ name: `room-${i + 1}`, from: marks[`room${i + 1}`] - 1.8, to: marks[`room${i + 1}`] + 0.3, stillAt: marks[`room${i + 1}`] - 0.1 });
  }

  // ── The wall text ─────────────────────────────────────────────────────────────────────────────
  console.log("  wall:", await walk());
  await inGift(says, escape(spec.message.slice(0, 24)), 10);
  await page.waitForTimeout(3000); // the paragraphs come in, then the sign-off
  marks.wall = now();
  clips.push({ name: "wall", from: marks.wall - 3.2, to: marks.wall + 0.3, stillAt: marks.wall - 0.1 });

  console.log("marks:", JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +(v - marks.entrance).toFixed(2)]))));
  return clips;
}
