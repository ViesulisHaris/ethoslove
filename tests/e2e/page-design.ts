import type { Page } from "@playwright/test";

/**
 * The ruler a redesigned page is held to (docs/marketing/growth-build/DESIGN-LESS-TEXT.md, "Tests
 * and proof"): the two helpers of tests/e2e/template-page-design.spec.ts, for the pages built from
 * a gift's page (the finder first). They are that spec's own `settle` and `measure`, counting
 * words and looking under them for art exactly as it does, kept here because that spec is the
 * approved gift page's and is not to be edited; a change to how words or art are counted belongs in
 * both. Three things are added for pages made of cards: art is looked for on a whole card
 * (`onCards`), not only under its words; the real pictures in the first view are counted
 * (`picturesInView`); and words only a screen reader gets are left out of the smallest type size.
 */

/** Scroll the page through once, so everything lazy has arrived and is laid out, and every picture is decoded. */
export async function settle(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.7) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
    // The page comes in on a short rise (the entrance animation on <main>): it is waited out, or a
    // section is read a pixel down on one load in fifteen.
    await Promise.all(
      (document.querySelector("main")?.getAnimations() ?? [])
        .filter((a) => Number.isFinite(Number(a.effect?.getComputedTiming().endTime)))
        .map((a) => a.finished.catch(() => {})),
    );
    // Only what is on show: a piece kept for another screen size is never fetched, and would be waited for for ever.
    await Promise.all(
      [...document.querySelectorAll<HTMLImageElement>("[data-decor] img")]
        .filter((img) => img.getClientRects().length > 0)
        .map(async (img) => {
          if (!img.complete) await new Promise((done) => ((img.onload = img.onerror = done), setTimeout(done, 4000)));
          if (img.complete && img.naturalWidth > 0) await Promise.race([img.decode().catch(() => {}), new Promise((done) => setTimeout(done, 2000))]);
        }),
    );
  });
}

/**
 * What the page looks like to a ruler: its sideways overflow, the words a visitor can read without
 * opening anything, and whether any of the art lies under one of them.
 *
 * "Under a word" is looked at, not boxed: most of each picture's box is empty air that words may
 * well stand in. So each picture is drawn to a canvas and, for every line of words, the pixels
 * under it are read (through the picture's own turn). A pixel that is more than a faint tail of
 * shadow counts. Words inside a closed <details> are not on the page until it is opened, and are
 * not counted; a card's handwriting (`data-line`) is counted by itself.
 */
export async function measure(page: Page, within = "[data-page-theme]") {
  return page.evaluate((within) => {
    const root = document.querySelector(within)!;
    const shown = (el: Element) => {
      for (let node: Element | null = el; node && node !== root.parentElement; node = node.parentElement) {
        const cs = getComputedStyle(node);
        if (cs.display === "none" || cs.visibility === "hidden") return false;
        if (node instanceof HTMLDetailsElement && !node.open && !(el.closest("summary")?.parentElement === node)) return false;
      }
      return true;
    };

    // Every piece of art on show, with a way to ask what it has at a point of the page.
    const SOLID = 40; // of 255: under this is the outer tail of a soft shadow
    const decor = [...root.querySelectorAll<HTMLElement>("[data-decor]")]
      .filter((el) => shown(el))
      .flatMap((el) => {
        const img = el.querySelector("img");
        if (!img || !img.complete || img.naturalWidth === 0) return [];
        const r = el.getBoundingClientRect();
        const w = el.offsetWidth,
          h = el.offsetHeight;
        if (w === 0 || h === 0) return [];
        const canvas = document.createElement("canvas");
        canvas.width = 240;
        canvas.height = Math.max(1, Math.round((240 * h) / w));
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const alpha = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const m = new DOMMatrix(getComputedStyle(el).transform);
        const turn = Math.atan2(m.b, m.a);
        const cx = r.left + r.width / 2,
          cy = r.top + r.height / 2;
        const at = (x: number, y: number) => {
          // Back through the piece's turn, into its own box.
          const dx = x - cx,
            dy = y - cy;
          const lx = dx * Math.cos(-turn) - dy * Math.sin(-turn) + w / 2;
          const ly = dx * Math.sin(-turn) + dy * Math.cos(-turn) + h / 2;
          if (lx < 0 || ly < 0 || lx >= w || ly >= h) return 0;
          return alpha[(Math.floor((ly / h) * canvas.height) * canvas.width + Math.floor((lx / w) * canvas.width)) * 4 + 3];
        };
        const inView = r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0;
        return [{ id: el.dataset.decor!, rect: r, at, inView }];
      });

    const overlaps = new Set<string>();
    const words: { size: number; label: boolean }[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let count = 0;
    let hand = 0;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim() ?? "";
      const parent = node.parentElement;
      if (!text || !parent || !shown(parent) || parent.closest("[data-flatlay], style, script")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      if (rects.length === 0) continue;
      if (parent.closest("[data-line]")) hand += text.split(/\s+/).length;
      else count += text.split(/\s+/).length;
      const cs = getComputedStyle(parent);
      // Words only a screen reader gets are a pixel square: they have no size on the page to hold to 14px.
      if (!parent.closest(".sr-only")) words.push({ size: parseFloat(cs.fontSize), label: cs.textTransform === "uppercase" });
      for (const r of rects)
        for (const d of decor) {
          if (d.rect.left > r.right || d.rect.right < r.left || d.rect.top > r.bottom || d.rect.bottom < r.top) continue;
          // A grid of points over the line of words, a little inside its box.
          let hit = false;
          for (let i = 0; i <= 12 && !hit; i++) for (let j = 0; j <= 3 && !hit; j++) hit = d.at(r.left + 1 + ((r.width - 2) * i) / 12, r.top + 1 + ((r.height - 2) * j) / 3) > SOLID;
          if (hit) overlaps.add(`${d.id} under “${text.slice(0, 32)}”`);
        }
    }
    // A card of the page (an answer, a pick's picture) is no place for a flower either, words or not.
    const onCards = new Set<string>();
    for (const card of root.querySelectorAll<HTMLElement>("[data-answer], [data-pick]")) {
      if (!shown(card)) continue;
      const r = card.getBoundingClientRect();
      for (const d of decor) {
        if (d.rect.left > r.right || d.rect.right < r.left || d.rect.top > r.bottom || d.rect.bottom < r.top) continue;
        let hit = false;
        for (let i = 0; i <= 12 && !hit; i++) for (let j = 0; j <= 12 && !hit; j++) hit = d.at(r.left + 1 + ((r.width - 2) * i) / 12, r.top + 1 + ((r.height - 2) * j) / 12) > SOLID;
        if (hit) onCards.add(`${d.id} on “${(card.textContent ?? "").trim().slice(0, 24)}”`);
      }
    }
    const targets = [...root.querySelectorAll<HTMLElement>("a, button, summary")]
      .filter((el) => shown(el) && !el.closest("[data-flatlay]"))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { what: (el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 30), width: Math.round(r.width), height: Math.round(r.height) };
      });
    const pictures = [...root.querySelectorAll<HTMLImageElement>("img:not([data-decor] img)")].filter((img) => shown(img) && img.complete && img.naturalWidth > 0);
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      height: document.documentElement.scrollHeight,
      overlaps: [...overlaps],
      onCards: [...onCards],
      pieces: decor.length,
      count,
      hand,
      decorInView: decor.filter((d) => d.inView).length,
      picturesInView: pictures.filter((img) => {
        const r = img.getBoundingClientRect();
        return r.width > 0 && r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0;
      }).length,
      smallest: words.filter((w) => !w.label).reduce((min, w) => Math.min(min, w.size), 99),
      smallestLabel: words.filter((w) => w.label).reduce((min, w) => Math.min(min, w.size), 99),
      small: targets.filter((t) => t.height < 44 || t.width < 44).map((t) => `${t.what} ${t.width}×${t.height}`),
      sections: [...root.querySelectorAll("section")].map((s) => Math.round(s.getBoundingClientRect().top + scrollY)),
    };
  }, within);
}
