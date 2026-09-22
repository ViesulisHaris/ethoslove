/**
 * The Council: the case on the wall and the cats behind the bench; each finding read out by its
 * cat, one still per finding; the gavel and the stamp; then the ruling sheet — the evidence, the
 * letter, the end.
 *
 * "all rise" starts the hearing, the same pill then says "next finding · n/N" and "hear the
 * verdict"; a cat's line is a role=status bubble. The stamp comes down 1.75s after the verdict is
 * called and only then does "read the full ruling" appear; the sheet under it is its own scroller.
 */
import { glide } from "./_scroll.mjs";

export async function film({ page, live, spec, inGift, now }) {
  const marks = {};
  const says = (s) => new RegExp(s, "i").test(document.querySelector('[data-mode="live"]')?.innerText ?? "");
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pill = (re) => live.getByRole("button", { name: re }).first();

  const rise = pill(/^all rise$|^en pie$/i);
  await rise.waitFor({ timeout: 60000 });
  await page.waitForTimeout(2200); // the council files in and settles
  marks.intro = now();

  // ── The findings, one cat each ────────────────────────────────────────────────────────────────
  const findings = spec.fields?.findings?.length ? spec.fields.findings : [];
  const clips = [];
  await rise.evaluate((b) => b.click());
  for (let i = 0; i < findings.length; i++) {
    if (i > 0) {
      await inGift(says, "next finding|siguiente conclusión", 6);
      await pill(/next finding|siguiente conclusión/i).evaluate((b) => b.click());
    }
    await inGift((t) => (document.querySelector('[data-mode="live"] [role="status"]')?.textContent ?? "").includes(t), findings[i].slice(0, 18), 8);
    await page.waitForTimeout(1600); // the cat leans over and the bubble springs up
    marks[`finding${i + 1}`] = now();
    clips.push({ name: `finding-${i + 1}`, from: marks[`finding${i + 1}`] - 1.8, to: marks[`finding${i + 1}`] + 0.4, stillAt: marks[`finding${i + 1}`] - 0.1 });
    await page.waitForTimeout(500);
  }

  // ── The verdict: three bangs and the stamp ────────────────────────────────────────────────────
  await inGift(says, "hear the verdict|oír el veredicto", 6);
  await pill(/hear the verdict|oír el veredicto/i).evaluate((b) => b.click());
  await inGift(says, "read the full ruling|leer la sentencia completa", 10); // the stamp is down
  await page.waitForTimeout(1300);
  marks.ruling = now();

  // ── The sheet: the evidence, the letter, the end ──────────────────────────────────────────────
  await pill(/read the full ruling|leer la sentencia completa/i).evaluate((b) => b.click());
  await inGift(says, escape(spec.message.slice(0, 24)), 10);
  await page.waitForTimeout(2200); // it springs up, the exhibits settle
  marks.evidence = now();
  console.log("  letter:", await glide(page, { selector: "article" }, { offset: 70 }));
  await page.waitForTimeout(2000);
  marks.letter = now();
  console.log("  end:", await glide(page, "end", { offset: 0, ms: 1600 }));
  await page.waitForTimeout(1600);
  marks.end = now();

  console.log("marks:", JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +(v - marks.intro).toFixed(2)]))));
  return [
    { name: "case", from: marks.intro - 2, to: marks.intro + 0.3, stillAt: marks.intro - 0.1 }, // the case on the wall
    ...clips,
    { name: "ruling", from: marks.ruling - 3.2, to: marks.ruling + 0.2, stillAt: marks.ruling - 0.1 }, // stamped
    { name: "evidence", from: marks.ruling, to: marks.evidence, stillAt: marks.evidence - 0.2 }, // the exhibits
    { name: "letter", from: marks.evidence, to: marks.letter, stillAt: marks.letter - 0.2 }, // the letter
    { name: "end", from: marks.letter, to: marks.end, stillAt: marks.end - 0.2 }, // the end
  ];
}
