/**
 * Scrolling a gift the way a thumb would, for the templates that are a page: ease the gift's
 * scroller until something sits near the top of the phone.
 *
 * `find` is "end" for the bottom of the page, or { selector?, nth?, text?, leaf? }: the nth match of
 * a CSS selector inside the gift, narrowed to the ones whose text matches `text` (a regex source),
 * taking the innermost — a text match on "div" would otherwise be the whole page. `offset` is how
 * far below the top of the phone it lands, in the page's own units (the phone is 432×768 inside
 * its zoomed box; a bounding rectangle is 2.5 times a scroll position, so never mix the two).
 */
export async function glide(page, find, { offset = 40, ms = 1200 } = {}) {
  return page.evaluate(
    async ({ find, offset, ms }) => {
      const gift = document.querySelector('[data-mode="live"]');
      const sc = [...gift.querySelectorAll("div")].find((d) => /overflow-y-auto/.test(d.className));
      if (!sc) return "no scroller";
      let target;
      if (find === "end") target = sc.scrollHeight - sc.clientHeight;
      else {
        let all = [...gift.querySelectorAll(find.selector ?? "p,span,h1,h2,h3,figcaption,article,section,div")];
        if (find.text) {
          const re = new RegExp(find.text, "i");
          all = all.filter((e) => re.test(e.textContent ?? ""));
          if (find.leaf) all = all.filter((e) => !e.children.length);
          all = all.filter((e) => !all.some((o) => o !== e && e.contains(o)));
        }
        const el = all[find.nth ?? 0];
        if (!el) return `nothing for ${JSON.stringify(find)}`;
        let y = 0;
        for (let e = el; e && e !== sc; e = e.offsetParent) y += e.offsetTop;
        target = Math.max(0, Math.min(sc.scrollHeight - sc.clientHeight, y - offset));
      }
      const from = sc.scrollTop;
      const start = performance.now();
      await new Promise((done) => {
        const step = (t) => {
          const k = Math.min(1, (t - start) / ms);
          sc.scrollTop = from + (target - from) * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
          if (k < 1) requestAnimationFrame(step);
          else done();
        };
        requestAnimationFrame(step);
      });
      return `${Math.round(from)} → ${Math.round(sc.scrollTop)} of ${sc.scrollHeight - sc.clientHeight}`;
    },
    { find, offset, ms },
  );
}
