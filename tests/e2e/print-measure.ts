import type { Page } from "@playwright/test";

/**
 * The print card as a person would check it by eye: its words, and where each part sits inside the
 * first card on the sheet, in CSS pixels rounded to a tenth. Used by tree-tag.spec.ts against
 * print-card-before.json, measured on the commit before The Tree Tag went in. (Not a spec file.)
 */
export async function measureCard(page: Page) {
  return page.evaluate(() => {
    const card = document.querySelector(".sheet .card") as HTMLElement;
    const at = card.getBoundingClientRect();
    const r = (n: number) => Math.round(n * 10) / 10;
    const parts: Record<string, number[]> = { card: [r(at.width), r(at.height)] };
    for (const name of ["head", "name", "line", "qr", "cta", "url", "sound"]) {
      const el = card.querySelector(`.${name}`);
      if (!el) continue;
      const b = el.getBoundingClientRect();
      parts[name] = [r(b.left - at.left), r(b.top - at.top), r(b.width), r(b.height)];
    }
    return { text: card.innerText, cards: document.querySelectorAll(".sheet .card").length, parts };
  });
}
