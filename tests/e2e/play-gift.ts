import type { Page } from "@playwright/test";

/**
 * Plays a gift on the development-only /gift-preview page to its end screen, the way a recipient
 * would: the buttons that move on, taps across the gift, a swipe up, scrolls. A cut-down copy of
 * the robot in template-sweep.spec.ts, for the specs that need a real gift's end screen and have no
 * gift to open (a worktree has no database). (Not a spec file: Playwright doesn't run it.)
 */
const GO = /start|open|next|continue|tap|read|reveal|unwrap|skip|play|begin|enter|let'?s|show|see|yes|done|finish|light|blow|shake|pour|flip|turn|pulsa|abr|siguiente|continuar|toca|leer|ver|empez|saltar/i;
/** Never pressed on the way: what leaves the gift, replays it or opens something over it. */
const NEVER = /replay|again|otra vez|previous|\bprev\b|anterior|make (one|your)|send (one|it|a)|react|share|sound|mute|unmute|music|audio|volume|crt|back|keep|download|copy|save|reply|responder|volver|compartir|sonido|música|guardar|hazle|envía|voice|voz|song|canci|listen|escucha|close|cerrar|someone else|otra persona|watch/i;

export type PreviewGift = { template: string; lang?: "en" | "es"; paid?: boolean; full?: boolean };

export function previewUrl({ template, lang = "en", paid = false, full = false }: PreviewGift): string {
  const query = new URLSearchParams({ template });
  if (lang === "es") query.set("lang", "es");
  if (paid) query.set("paid", "1");
  if (full) query.set("full", "1");
  return `/gift-preview?${query}`;
}

/** The end screen's "Keep this gift": only a real gift page shows it, so it marks the end screen there. */
const END = '[data-testid="keep-gift"]';

export type Seen = { height: number; inside: boolean; hit: boolean };

/**
 * What the helpers below run inside the page, put on `window.__thumb` once per page.
 *
 * - `scroll` moves only the boxes a thumb can move (overflow auto or scroll). `scrollIntoView` also
 *   moves overflow:hidden boxes, which no recipient can do, and would call a button reachable that
 *   isn't. "end" goes to the foot of everything that scrolls around the element.
 * - `still` waits until the element has stopped moving: a scroller that scrolls smoothly (The
 *   Letter's does), an entrance that slides it in. A fixed wait measured some controls mid-flight.
 * - `see` says whether the element sits wholly inside everything that can cut it: the gift, the
 *   screen, and every box around it that clips (overflow other than visible). A card that clips
 *   without scrolling hides a button as surely as the edge of the screen does, and comparing with
 *   the gift's own box alone never saw that. And whether the element is the thing under a finger
 *   at its middle.
 */
type Thumb = {
  scroll(el: Element | null, block?: "center" | "end"): void;
  still(el: Element, ms?: number): Promise<boolean>;
  see(el: Element, gift: Element): Seen;
};

async function withThumb(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __thumb?: Thumb };
    if (w.__thumb) return;
    const scrolls = (p: Element) => p.scrollHeight > p.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(p).overflowY);
    w.__thumb = {
      scroll(el, block = "center") {
        if (!el) return;
        for (let p = el.parentElement; p; p = p.parentElement) {
          if (!scrolls(p)) continue;
          if (block === "end") {
            p.scrollTop = p.scrollHeight;
            continue;
          }
          const r = el.getBoundingClientRect();
          const b = p.getBoundingClientRect();
          p.scrollTop += r.top + r.height / 2 - (b.top + b.height / 2);
        }
      },
      async still(el, ms = 4000) {
        const frame = () => new Promise<void>((done) => requestAnimationFrame(() => done()));
        const where = () => {
          const r = el.getBoundingClientRect();
          return [r.left, r.top, r.width, r.height].map((n) => Math.round(n * 2) / 2).join(",");
        };
        // A smooth scroll has not moved yet on the frame it was asked for.
        await frame();
        await frame();
        const deadline = performance.now() + ms;
        let last = where();
        let same = 0;
        while (performance.now() < deadline) {
          await frame();
          const now = where();
          if (now === last) same++;
          else same = 0;
          last = now;
          // A tenth of a second in one place.
          if (same >= 6) return true;
        }
        return false;
      },
      see(el, gift) {
        const r = el.getBoundingClientRect();
        const g = gift.getBoundingClientRect();
        const through = { top: Math.max(g.top, 0), left: Math.max(g.left, 0), bottom: Math.min(g.bottom, innerHeight), right: Math.min(g.right, innerWidth) };
        for (let p = el.parentElement; p && p !== gift.parentElement; p = p.parentElement) {
          const style = getComputedStyle(p);
          const b = p.getBoundingClientRect();
          if (style.overflowX !== "visible") {
            through.left = Math.max(through.left, b.left);
            through.right = Math.min(through.right, b.right);
          }
          if (style.overflowY !== "visible") {
            through.top = Math.max(through.top, b.top);
            through.bottom = Math.min(through.bottom, b.bottom);
          }
        }
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return {
          height: Math.round(r.height),
          inside: r.top >= through.top - 0.5 && r.bottom <= through.bottom + 0.5 && r.left >= through.left - 0.5 && r.right <= through.right + 0.5,
          hit: Boolean(top && (top === el || el.contains(top))),
        };
      },
    };
  });
}

/**
 * Whether the recipient is at the end screen: its keep link, scrolled to as a thumb would, is the
 * thing under a finger. Being in the page is not enough: Gingerbread House draws its next page
 * under the one being read, so its end screen exists a page before anyone can see it.
 */
async function atEnd(page: Page): Promise<boolean> {
  if (!(await page.locator(END).count())) return false;
  await withThumb(page);
  return page.evaluate(async (selector) => {
    const { __thumb: thumb } = window as unknown as { __thumb: Thumb };
    const keep = document.querySelector(selector);
    const gift = keep?.closest("[data-template]");
    if (!keep || !gift) return false;
    thumb.scroll(keep);
    await thumb.still(keep, 2500);
    return thumb.see(keep, gift).hit;
  }, END);
}

/** Opens the gift and plays it until its end screen is in front of the recipient. False when it never got there in time. */
export async function playToEnd(page: Page, gift: PreviewGift, ms = 150_000): Promise<boolean> {
  await page.goto(previewUrl(gift), { waitUntil: "domcontentloaded" });
  const root = page.locator(`[data-template="${gift.template}"][data-mode="live"]`);
  const deadline = Date.now() + ms;
  const tries = new Map<string, number>();
  for (let step = 1; Date.now() < deadline; step++) {
    if (await atEnd(page)) return true;
    const box = (await root.count()) ? await root.first().boundingBox().catch(() => null) : null;
    if (!box) {
      // The plain gate ("Tap to open") covers the stage until the gift is mounted.
      const gate = page.getByRole("button", { name: /tap to open|toca para abrir/i });
      if (await gate.count()) await gate.first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(400);
      continue;
    }
    // A reader scrolls: a long message, and the end screen below it.
    if (step % 2 === 1)
      await page.evaluate((slug) => {
        const rootEl = document.querySelector(`[data-template="${slug}"][data-mode="live"]`);
        for (const el of rootEl?.querySelectorAll<HTMLElement>("*") ?? []) {
          if (el.scrollHeight <= el.clientHeight + 4) continue;
          const o = getComputedStyle(el).overflowY;
          if (o === "auto" || o === "scroll") el.scrollBy({ top: el.clientHeight * 0.8 });
        }
      }, gift.template);
    const candidates = await page.evaluate(
      ({ slug, go, never }) => {
        const rootEl = document.querySelector(`[data-template="${slug}"][data-mode="live"]`);
        if (!rootEl) return [];
        const goRe = new RegExp(go, "i");
        const neverRe = new RegExp(never, "i");
        const area = rootEl.getBoundingClientRect();
        return [...rootEl.querySelectorAll<HTMLElement>('button, [role="button"]')]
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { el, name: (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim(), r, x: r.left + r.width / 2, y: r.top + r.height / 2 };
          })
          .filter(({ el, name, r, x, y }) => {
            if (r.width < 6 || r.height < 6) return false;
            if (x < area.left || x > area.right || y < area.top || y > area.bottom || x > innerWidth || y > innerHeight) return false;
            const top = document.elementFromPoint(x, y);
            if (!top || !(top === el || el.contains(top))) return false;
            const s = getComputedStyle(el);
            if (s.visibility === "hidden" || s.pointerEvents === "none" || Number(s.opacity) < 0.05) return false;
            if ((el as HTMLButtonElement).disabled) return false;
            return !neverRe.test(name);
          })
          .map(({ name, x, y }) => ({ name: name.slice(0, 40), go: name.length <= 30 && goRe.test(name), x, y }));
      },
      { slug: gift.template, go: GO.source, never: NEVER.source },
    );
    const triesOf = (name: string) => tries.get(name) ?? 0;
    const target = candidates.filter((c) => triesOf(c.name) < 8).sort((a, b) => Number(b.go) - Number(a.go) || triesOf(a.name) - triesOf(b.name))[0];
    const at = (fx: number, fy: number) => [box.x + box.width * fx, box.y + box.height * fy] as const;
    if (step % 6 === 5) {
      // A swipe up: Birthday Cinema's candles go out with one.
      await page.mouse.move(...at(0.5, 0.82));
      await page.mouse.down();
      for (let i = 1; i <= 8; i++) await page.mouse.move(...at(0.5, 0.82 - 0.5 * (i / 8)));
      await page.mouse.up();
    } else if (target && step % 4 !== 3) {
      await page.mouse.click(target.x, target.y);
      tries.set(target.name, triesOf(target.name) + 1);
    } else {
      const grid = [0.22, 0.36, 0.5, 0.64, 0.78].flatMap((fy) => [0.2, 0.5, 0.8].map((fx) => [fx, fy] as const));
      const [x, y] = at(...grid[step % grid.length]);
      // A tap across the gift lands on the gift, never on a link or on a button the robot must not
      // press: a stepped gift's last page is in front a moment before its end screen answers, and a
      // blind tap there would send one back or leave the gift.
      const free = await page.evaluate(
        ({ x, y, never }) => {
          const control = document.elementFromPoint(x, y)?.closest('a[href], button, [role="button"]');
          if (!control) return true;
          return control.tagName !== "A" && !new RegExp(never, "i").test((control.getAttribute("aria-label") || control.textContent || "").replace(/\s+/g, " ").trim());
        },
        { x, y, never: NEVER.source },
      );
      if (free) await page.mouse.click(x, y);
    }
    await page.waitForTimeout(300);
  }
  return false;
}

/** Scrolls to `selector` the way a thumb can, and waits until it has stopped moving. */
export async function bring(page: Page, selector: string, block: "center" | "end" = "center"): Promise<void> {
  await withThumb(page);
  await page.evaluate(
    async ({ selector, block }) => {
      const { __thumb: thumb } = window as unknown as { __thumb: Thumb };
      const el = document.querySelector(selector);
      if (!el) return;
      thumb.scroll(el, block);
      await thumb.still(el);
    },
    { selector, block },
  );
}

export type EndControl = Seen & { name: string };

/**
 * Every link and button on the end screen, each scrolled to as a thumb would and measured once it
 * has stopped moving: its height, whether it then sits wholly inside everything that can cut it
 * (the gift, the screen, any card around it that clips), and whether it is the thing under a finger
 * at its middle.
 */
export async function endControls(page: Page, template: string): Promise<{ sideways: boolean; controls: EndControl[] }> {
  await withThumb(page);
  return page.evaluate(
    async ({ slug, endSelector }) => {
      const { __thumb: thumb } = window as unknown as { __thumb: Thumb };
      const gift = document.querySelector(`[data-template="${slug}"][data-mode="live"]`)!;
      const end = gift.querySelector(endSelector)!.parentElement!.parentElement!;
      const controls: (Seen & { name: string })[] = [];
      for (const el of end.querySelectorAll<HTMLElement>("a[href], button")) {
        thumb.scroll(el);
        await thumb.still(el);
        controls.push({ name: (el.getAttribute("data-testid") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40), ...thumb.see(el, gift) });
      }
      return { sideways: document.documentElement.scrollWidth > innerWidth || gift.scrollWidth > gift.clientWidth + 1, controls };
    },
    { slug: template, endSelector: END },
  );
}
