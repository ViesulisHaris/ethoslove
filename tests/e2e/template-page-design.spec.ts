import { devices, expect, test, webkit, type Page } from "@playwright/test";
import { templateFilmStart } from "../../src/content/template-film-starts";

/**
 * A gift's page as the owner's mock-up lays it out (docs/marketing/growth-build/
 * DESIGN-LESS-TEXT.md), held to "on no device will it break": at every size on the owner's list
 * the page does not scroll sideways, no flower lies over or under words, the words on it stay
 * within the budget, the first screen has a flower and a real picture, a thumb can hit what is
 * meant to be pressed, and the page is the same height whether or not its pictures arrive.
 * Screenshots someone looked at are the other half of the proof (shots/guides/v3-*.png).
 */
const PAGE = "/templates/the-letter";

/** The owner's list: phones, tablets, laptops and a wide desk; a phone on its side; a short laptop. */
const SIZES: [number, number][] = [
  [320, 568],
  [360, 740],
  [375, 812],
  [390, 844],
  [414, 896],
  // A 1440 px laptop zoomed to 200% lays the page out at this width.
  [720, 450],
  [768, 1024],
  [820, 1180],
  [1024, 768],
  [1100, 800],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
  [812, 375],
  [1280, 620],
];

// One browser is enough for a layout that sets its own sizes; the phone project would only repeat it.
test.skip(({ isMobile }) => isMobile, "sets its own screen sizes");

/** Scroll the page through once, so everything lazy has arrived and is laid out, and every picture is decoded. */
async function settle(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.7) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
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
 * What the page looks like to a ruler: its sideways overflow, the words a visitor can read
 * without opening anything, and whether any of the art lies under one of them.
 *
 * "Under a word" is looked at, not boxed: the art is a tall stem, a phone on a spray of leaves, a
 * lily with a stalk, and most of each picture's box is empty air that words may well stand in. So
 * each picture is drawn to a canvas and, for every line of words, the pixels under it are read
 * (through the picture's own turn). A pixel that is more than a faint tail of shadow counts. What
 * is laid into a picture (a phone's screen, a line on the note card) is the picture's, not words.
 */
async function measure(page: Page, within = "[data-page-theme]") {
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
        const w = el.offsetWidth, h = el.offsetHeight;
        if (w === 0 || h === 0) return [];
        const canvas = document.createElement("canvas");
        canvas.width = 240;
        canvas.height = Math.max(1, Math.round((240 * h) / w));
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const alpha = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const m = new DOMMatrix(getComputedStyle(el).transform);
        const turn = Math.atan2(m.b, m.a);
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const at = (x: number, y: number) => {
          // Back through the piece's turn, into its own box.
          const dx = x - cx, dy = y - cy;
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
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim() ?? "";
      const parent = node.parentElement;
      if (!text || !parent || !shown(parent) || parent.closest("[data-flatlay], style, script")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      if (rects.length === 0) continue;
      count += text.split(/\s+/).length;
      const cs = getComputedStyle(parent);
      words.push({ size: parseFloat(cs.fontSize), label: cs.textTransform === "uppercase" });
      for (const r of rects)
        for (const d of decor) {
          if (d.rect.left > r.right || d.rect.right < r.left || d.rect.top > r.bottom || d.rect.bottom < r.top) continue;
          // A grid of points over the line of words, a little inside its box.
          let hit = false;
          for (let i = 0; i <= 12 && !hit; i++) for (let j = 0; j <= 3 && !hit; j++) hit = d.at(r.left + 1 + ((r.width - 2) * i) / 12, r.top + 1 + ((r.height - 2) * j) / 3) > SOLID;
          if (hit) overlaps.add(`${d.id} under “${text.slice(0, 32)}”`);
        }
    }
    const targets = [...root.querySelectorAll<HTMLElement>("a, button, summary")]
      .filter((el) => shown(el) && !el.closest("[data-flatlay]"))
      .map((el) => {
        // A card's summary is pressed anywhere on the card: its ::after covers it.
        const r = (el.tagName === "SUMMARY" && getComputedStyle(el, "::after").position === "absolute" ? el.parentElement! : el).getBoundingClientRect();
        return { what: (el.textContent ?? "").trim().slice(0, 30), width: Math.round(r.width), height: Math.round(r.height) };
      });
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      height: document.documentElement.scrollHeight,
      overlaps: [...overlaps],
      pieces: decor.length,
      count,
      decorInView: decor.filter((d) => d.inView).length,
      smallest: words.filter((w) => !w.label).reduce((min, w) => Math.min(min, w.size), 99),
      smallestLabel: words.filter((w) => w.label).reduce((min, w) => Math.min(min, w.size), 99),
      small: targets.filter((t) => t.height < 44 || t.width < 44).map((t) => `${t.what} ${t.width}×${t.height}`),
      sections: [...root.querySelectorAll("section")].map((s) => Math.round(s.getBoundingClientRect().top + scrollY)),
    };
  }, within);
}

for (const [width, height] of SIZES) {
  test(`${width}×${height}: no sideways scroll, no flower under words, words within the budget`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(PAGE);
    await settle(page);
    const m = await measure(page);
    expect(m.overflow, "the page scrolls sideways").toBeLessThanOrEqual(0);
    expect(m.overlaps, "a piece of the art lies under words").toEqual([]);
    // The check has something to check: the two phones on their flowers, the three steps, and what lies round them.
    expect(m.pieces).toBeGreaterThanOrEqual(6);
    // 300 words at most without opening anything, the header and the footer aside.
    expect(m.count).toBeLessThanOrEqual(300);
    expect(m.count).toBeGreaterThan(120);
    // Sentences never under 14 px; the small mono labels over a heading are 12 px capitals.
    expect(m.smallest).toBeGreaterThanOrEqual(14);
    expect(m.smallestLabel).toBeGreaterThanOrEqual(12);
    // What is meant to be pressed is at least 44 px each way, for a thumb.
    expect(m.small).toEqual([]);
    // The first screen has the art in it, and the gift's own cover on the lying phone. Not on the
    // shortest screens (a 320×568 phone, a phone on its side), where the first screen is the name,
    // the buttons and the price, and the phone comes with the first flick.
    if (height >= 740 || width >= 1280) {
      expect(m.decorInView).toBeGreaterThanOrEqual(1);
      await expect(page.locator("[data-flatlay=hero]")).toBeInViewport();
    }
  });
}

/**
 * The layout is every template's. A long name, a long description, a page without a guide, a
 * premium one, each colourway of the art, and both languages: each on a desk, a laptop and a phone.
 */
const OTHERS = ["/templates/birthday-cinema", "/templates/scratch-card", "/templates/snow-globe", "/templates/vinyl", "/templates/coquette", "/templates/constellations", "/templates/gingerbread-house", "/es/templates/the-letter", "/es/templates/string-the-lights"];

for (const path of OTHERS) {
  test(`${path} holds the same layout, on a desk and on a phone`, async ({ page }) => {
    for (const [width, height] of [[1440, 900], [1280, 800], [1024, 768], [375, 812]] as const) {
      await page.setViewportSize({ width, height });
      await page.goto(path);
      await settle(page);
      const m = await measure(page);
      expect(m.overflow, `${width}: the page scrolls sideways`).toBeLessThanOrEqual(0);
      expect(m.overlaps, `${width}: a piece of the art lies under words`).toEqual([]);
      expect(m.count, `${width}: words on the page`).toBeLessThanOrEqual(300);
      expect(m.smallest, `${width}`).toBeGreaterThanOrEqual(14);
      expect(m.small, `${width}: too small for a thumb`).toEqual([]);
    }
    // One h1, and the page says what it is to a search engine.
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator('script[type="application/ld+json"]')).not.toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  });
}

test("the footer's lily leans in beside the last column and lies under none of the footer's words", async ({ page }) => {
  for (const [width, height] of [[1024, 768], [1280, 800], [1440, 900], [1920, 1080]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(PAGE);
    await settle(page);
    const m = await measure(page, "[data-site-footer]");
    expect(m.pieces, `${width}: the lily is there`).toBe(1);
    expect(m.overlaps, `${width}`).toEqual([]);
  }
  // Not on a phone, where the footer is all links; and on no page that is not a gift's.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(PAGE);
  await expect(page.locator("[data-footer-flower]")).toBeHidden();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/pricing");
  await expect(page.locator("[data-footer-flower]")).toBeHidden();
});

test("La carta's hero says the whole of its two sentences, not the first five words", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/es/templates/the-letter");
  const hero = page.locator("[data-page-theme] > section").first();
  await expect(hero.getByText("Toca para romper el sello. La carta sale del sobre", { exact: false })).toBeVisible();
});

test("the page is whole, and the same height, when no picture arrives", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PAGE);
  await settle(page);
  const withPictures = await measure(page);

  // Every picture fails: the art, the posters, the sample photo. Boxes are reserved, so nothing moves.
  await page.route(/\.(webp|jpg|jpeg|png|avif)(\?|$)|\/_next\/image/, (route) => route.abort());
  await page.reload();
  await settle(page);
  const without = await measure(page);
  expect(without.sections).toEqual(withPictures.sections);
  expect(without.height).toBe(withPictures.height);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Make this gift" })).toBeVisible();
});

/** Whether an element is drawn upright and unscaled: its box on the page is its own size. */
async function upright(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return Math.abs(r.width - (el as HTMLElement).offsetWidth) < 1 && Math.abs(r.height - (el as HTMLElement).offsetHeight) < 1;
  });
}

test("the cover lies in the phone's screen, and a tap picks the phone up to play the gift upright", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PAGE);
  const hero = page.locator("[data-flatlay=hero]");
  // At rest: the gift's cover laid into the lying phone by the render's matrix, so it is turned with it.
  const play = hero.getByRole("button", { name: /try the live demo/i });
  await expect(play).toBeVisible();
  expect(await play.evaluate((el) => new DOMMatrix(getComputedStyle(el.parentElement!).transform).b)).not.toBeCloseTo(0, 2);
  await play.click();
  await expect(hero.locator("[data-upright] [data-template=the-letter]")).toBeVisible({ timeout: 25000 });
  // Upright once it has come up: a gift reads where a finger is from an upright box.
  await expect.poll(() => upright(page, "[data-flatlay=hero] [data-upright] [data-template=the-letter]")).toBe(true);
  // And it plays: the seal breaks under a tap.
  await expect(page.getByText(/someone made this for you/i)).toBeHidden({ timeout: 20000 });
  await hero.getByRole("button", { name: /tap the seal/i }).click({ force: true });
  await expect(hero.getByText(/dear ana/i)).toBeVisible({ timeout: 10000 });
});

/** What the film in the lying phone is doing. */
async function film(page: Page) {
  return page.locator("[data-flatlay=hero] video").evaluate((v: HTMLVideoElement) => {
    const still = v.parentElement!.querySelector<HTMLImageElement>("img:last-of-type")!;
    const a = v.getBoundingClientRect();
    const b = still.getBoundingClientRect();
    return { src: v.getAttribute("src") ?? "", on: v.hasAttribute("data-on"), paused: v.paused, at: v.currentTime, opacity: Number(getComputedStyle(v).opacity), sameBox: Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1, stillShown: still.complete && still.naturalWidth > 0 };
  });
}

test("the gift's film plays in the lying phone while it is on screen, and moves nothing", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const films: string[] = [];
  page.on("request", (request) => void (request.url().endsWith("preview.webm") && films.push(request.url())));
  await page.goto(PAGE);
  await settle(page);
  const hero = page.locator("[data-flatlay=hero]");
  const box = async () => JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("[data-flatlay=hero], [data-flatlay=hero] video, h1, section[aria-labelledby=template-how]")].map((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height)]; })));
  const before = await box();
  // It is this gift's own film, laid where the cover is, turned with the phone, and shown once it is really playing.
  await expect(hero.locator("video[data-on]")).toHaveCount(1, { timeout: 20000 });
  const f = await film(page);
  expect(f.src).toBe("/templates/the-letter/preview.webm");
  expect(f.paused).toBe(false);
  expect(f.sameBox).toBe(true);
  expect(f.stillShown).toBe(true);
  await expect.poll(async () => (await film(page)).opacity).toBe(1);
  const t0 = f.at;
  await expect.poll(async () => (await film(page)).at).toBeGreaterThan(t0);
  expect(await hero.locator("video").evaluate((v: HTMLVideoElement) => [v.muted, v.playsInline, v.controls])).toEqual([true, true, false]);
  // The recording opens on the demo page's own bar ("All templates … Use this template"). The film
  // is first seen past it, and comes back to the same point when it has gone round, never to the bar.
  const from = templateFilmStart("the-letter");
  expect(from).toBeGreaterThan(1);
  expect(t0).toBeGreaterThanOrEqual(from);
  await hero.locator("video").evaluate((v: HTMLVideoElement) => void (v.currentTime = v.duration - 0.4));
  await expect.poll(async () => (await film(page)).at, { timeout: 10000 }).toBeLessThan(from + 2);
  const round = await film(page);
  expect(round.at).toBeGreaterThanOrEqual(from);
  expect(round.paused).toBe(false);
  expect(round.on).toBe(true);
  // Nothing on the page moved when it arrived.
  expect(await box()).toBe(before);
  // It stops when the phone has scrolled away, and picks up again when it is back.
  await page.locator("section[aria-labelledby=template-questions]").scrollIntoViewIfNeeded();
  await expect.poll(async () => (await film(page)).paused).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(async () => (await film(page)).paused).toBe(false);
  // One film, asked for once; and a tap still goes through it to the button under it.
  expect(new Set(films).size).toBe(1);
  await hero.getByRole("button", { name: /try the live demo/i }).click();
  await expect(hero.locator("[data-upright]")).toBeVisible();
  await expect.poll(async () => (await film(page)).paused).toBe(true);
});

test("no film for someone who asked for less motion or less data: the still cover is the whole of it", async ({ browser, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const storageState = { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] };
  for (const kind of ["motion", "data"] as const) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL, storageState, reducedMotion: kind === "motion" ? "reduce" : "no-preference" });
    if (kind === "data") await context.addInitScript(() => Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true } }));
    const page = await context.newPage();
    const films: string[] = [];
    page.on("request", (request) => void (/\.(webm|mp4)$/.test(new URL(request.url()).pathname) && films.push(request.url())));
    await page.goto(PAGE);
    await settle(page);
    await page.waitForTimeout(1500);
    const f = await film(page);
    expect(f.src, kind).toBe("");
    expect(f.on, kind).toBe(false);
    expect(f.opacity, kind).toBe(0);
    expect(f.stillShown, kind).toBe(true);
    expect(films, kind).toEqual([]);
    await context.close();
  }
});

test("a gift whose title sat at the cover's edge keeps it in the lying phone", async ({ page }) => {
  // content/template-page-themes.ts, `cover`: held to one side, or drawn smaller over a soft copy of itself.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/templates/coquette");
  const held = page.locator("[data-flatlay=hero] video");
  expect(await held.evaluate((v) => getComputedStyle(v).objectPosition)).toBe("22% 50%");
  await page.goto("/templates/evergreen");
  const small = await page.locator("[data-flatlay=hero] video").evaluate((v: HTMLVideoElement) => {
    const screen = v.parentElement!;
    return { share: v.offsetHeight / screen.offsetHeight, stills: screen.querySelectorAll("img").length, position: getComputedStyle(v).objectPosition };
  });
  expect(small.share).toBeCloseTo(0.8, 2);
  expect(small.stills).toBe(2);
  expect(small.position).toBe("0% 50%");
});

test("a gift played by dragging works from the hero: a scratch card scratches where the pointer is", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/templates/scratch-card");
  const hero = page.locator("[data-flatlay=hero]");
  await hero.getByRole("button", { name: /try the live demo/i }).click();
  await expect(hero.locator("[data-upright] [data-template=scratch-card]")).toBeVisible({ timeout: 25000 });
  await expect(page.getByText(/someone made this for you/i)).toBeHidden({ timeout: 20000 });
  // The start button breathes for ever, so it is never "stable"; force is intended here.
  await hero.getByRole("button", { name: "scratch here" }).click({ force: true });
  // The foil is a canvas that works out where the pointer is from its own box: it has to be upright.
  const foil = hero.locator("canvas[role=img]");
  await expect(foil).toBeVisible();
  await expect.poll(() => upright(page, "[data-flatlay=hero] canvas[role=img]")).toBe(true);
  const box = (await foil.boundingBox())!;
  // Scratch the left half only, in rows. If the strokes landed where the pointer is, the right half is still foil.
  await page.mouse.move(box.x + 6, box.y + 6);
  await page.mouse.down();
  for (let y = 6; y < box.height - 4; y += 9) {
    await page.mouse.move(box.x + 6, box.y + y, { steps: 2 });
    await page.mouse.move(box.x + box.width * 0.46, box.y + y, { steps: 4 });
  }
  await page.mouse.up();
  const cleared = await foil.evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d")!;
    const share = (x0: number, x1: number) => {
      const data = ctx.getImageData(Math.round(canvas.width * x0), 0, Math.round(canvas.width * (x1 - x0)), canvas.height).data;
      let clear = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] < 32) clear += 1;
      return clear / (data.length / 4);
    };
    return { left: share(0.04, 0.4), right: share(0.62, 0.96) };
  });
  expect(cleared.left).toBeGreaterThan(0.6);
  expect(cleared.right).toBeLessThan(0.1);
});

test("with motion turned down and the type turned up, nothing breaks", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  // The system's largest type: the page is set in rem, so this is what a 200% text size does to it.
  await page.addStyleTag({ content: "html { font-size: 200% !important }" });
  await settle(page);
  const m = await measure(page);
  expect(m.overflow).toBeLessThanOrEqual(0);
  expect(m.overlaps).toEqual([]);
  // A card still opens, at once.
  const card = page.locator("section[aria-labelledby=template-guide] details").first();
  await card.locator("summary").click();
  await expect(card.locator("[data-reveal]")).toBeVisible();
});

test("each gift's page wears that gift's colours and flowers, and the footer follows", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const seen = new Set<string>();
  const flowers = new Set<string>();
  for (const slug of ["the-letter", "constellations", "coquette", "birthday-cinema"]) {
    await page.goto(`/templates/${slug}`);
    const look = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>("[data-page-theme]")!;
      return {
        ground: getComputedStyle(root).backgroundColor,
        body: getComputedStyle(document.body).backgroundColor,
        footer: getComputedStyle(document.querySelector("footer")!).backgroundColor,
        art: root.querySelector<HTMLImageElement>("[data-decor=hero-flatlay] img")!.currentSrc.split("/").pop()!,
      };
    });
    expect(look.body, slug).toBe(look.ground);
    expect(look.footer, slug).not.toBe(look.ground);
    seen.add(look.ground);
    flowers.add(look.art.replace(/-1x|\.webp/g, ""));
  }
  expect(seen.size).toBe(4);
  // Ivory, moonlight, blush and wine: each of the four colourways of the art.
  expect([...flowers].sort()).toEqual(["hero-flatlay-blush", "hero-flatlay-ivory", "hero-flatlay-moonlight", "hero-flatlay-wine"]);
  // And it leaves with the page: the homepage keeps the site's own paper.
  await page.goto("/templates/the-letter");
  const themed = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.goto("/");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(themed);
});

test("a phone's first screen is light: the lying phone, its rim and the gift's cover", async ({ browser, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const context = await browser.newContext({ ...devices["Pixel 7"], baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
  const page = await context.newPage();
  const fetched = new Map<string, number>();
  const films = new Map<string, number>();
  page.on("response", async (response) => {
    // The film in the lying phone comes in pieces; the last piece's Content-Range says how long the whole is.
    if (new URL(response.url()).pathname.endsWith(".webm")) films.set(response.url(), Number((response.headers()["content-range"] ?? "").split("/")[1] ?? response.headers()["content-length"] ?? 0));
    if (!(response.headers()["content-type"] ?? "").startsWith("image/")) return;
    fetched.set(response.url(), await response.body().then((b) => b.length, () => 0));
  });
  await page.goto(PAGE, { waitUntil: "networkidle" });
  // What is on the first screen, by where each picture is, and what each of those weighed on the wire.
  const onScreen = await page.evaluate(() => [...document.images].filter((img) => { const r = img.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; }).map((img) => img.currentSrc));
  const first = [...new Set(onScreen)].map((url) => ({ name: new URL(url).pathname.split("/").pop()!, bytes: fetched.get(url) ?? 0 }));
  const firstKb = Math.round(first.reduce((n, p) => n + p.bytes, 0) / 1024);
  const allKb = Math.round([...fetched.values()].reduce((n, b) => n + b, 0) / 1024);
  console.log(`a phone's first screen: ${firstKb} KB in ${first.length} pictures (${first.map((p) => `${p.name} ${Math.round(p.bytes / 1024)} KB`).join(", ")}); ${allKb} KB of pictures fetched before any scroll, the browser's own look-ahead for lazy ones included`);
  expect(first.map((p) => p.name).sort()).toEqual(["hero-flatlay-ivory-bezel.webp", "hero-flatlay-ivory.webp", "poster.jpg"]);
  // The film is not part of a phone's first screen: under two fifths of the lying phone is on it, so the film has not been asked for.
  expect([...films.keys()]).toEqual([]);
  expect(firstKb).toBeLessThan(360);
  // Lower down, a phone is given the half-size files where they are enough: the band's picture and the loose pieces.
  const names = [...fetched.keys()].map((url) => new URL(url).pathname.split("/").pop()!);
  expect(names).not.toContain("experience-flatlay-ivory.webp");
  expect(allKb).toBeLessThan(620);
  // One flick down and the phone is on screen: the film is asked for then, one file, this gift's own.
  await page.locator("[data-flatlay=hero] video").evaluate((v) => v.scrollIntoView({ block: "center" }));
  await expect(page.locator("[data-flatlay=hero] video[data-on]")).toHaveCount(1, { timeout: 20000 });
  console.log(`the film in the lying phone, asked for once the phone is on screen: ${[...films].map(([url, bytes]) => `${new URL(url).pathname} ${Math.round(bytes / 1024)} KB`).join(", ")}`);
  expect([...films.keys()].map((url) => new URL(url).pathname)).toEqual(["/templates/the-letter/preview.webm"]);
  await context.close();
});

test("WebKit as an iPhone 13: no sideways scroll, no flower under words, the gift plays", async ({ baseURL }) => {
  const browser = await webkit.launch();
  try {
    const origin = new URL(baseURL!).origin;
    const context = await browser.newContext({ ...devices["iPhone 13"], baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
    const page = await context.newPage();
    const thrown: string[] = [];
    page.on("pageerror", (error) => thrown.push(error.message));
    await page.goto(PAGE);
    await settle(page);
    const m = await measure(page);
    expect(m.overflow).toBeLessThanOrEqual(0);
    expect(m.overlaps).toEqual([]);
    expect(m.small).toEqual([]);
    // The film: this WebKit either plays it or cannot, and where it cannot the still cover is what shows. Never a black screen, never an error.
    await page.locator("[data-flatlay=hero]").scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000);
    const f = await film(page);
    const can = await page.evaluate(() => document.createElement("video").canPlayType("video/webm"));
    console.log(`WebKit as an iPhone 13: canPlayType("video/webm") = "${can}", film ${f.on ? "playing" : "not shown"}, still cover ${f.stillShown ? "shown" : "MISSING"}`);
    expect(f.stillShown).toBe(true);
    expect(f.on ? f.opacity : 0).toBe(f.on ? 1 : 0);
    if (!f.on) expect(await page.locator("[data-flatlay=hero] video").evaluate((v) => Number(getComputedStyle(v).opacity))).toBe(0);
    if (can === "") expect(f.src).toBe("");
    expect(thrown).toEqual([]);
    await page.locator("[data-flatlay=hero]").getByRole("button", { name: /try the live demo/i }).tap();
    await expect(page.locator("[data-flatlay=hero] [data-upright] [data-template=the-letter]")).toBeVisible({ timeout: 30000 });
  } finally {
    await browser.close();
  }
});
