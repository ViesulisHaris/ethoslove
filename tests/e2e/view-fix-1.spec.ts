import { expect, test, type Page } from "@playwright/test";
import { occasionRow } from "../../src/components/templates/gallery-occasions";
import { templateFilmStart } from "../../src/content/template-film-starts";

/**
 * The first fix round on the preview (docs/marketing/growth-build/reports/view-fix-1-brief.md): each
 * test holds one finding of the four user walks of 23 Nov 2026 (view-walk-*.md), named by its number.
 */

/** Hovers a card and follows its film: every moment it is visible, and after one loop. */
async function hoverFilm(page: Page, card: string, slug: string) {
  const from = templateFilmStart(slug);
  expect(from, slug).toBeGreaterThan(0);
  const box = page.locator(card);
  await box.scrollIntoViewIfNeeded();
  const video = box.locator("video[data-card-film]");
  // Watch the film from before the hover: the lowest time at which it was ever visible.
  await video.evaluate((v: HTMLVideoElement) => {
    const w = window as unknown as { seenAt: number[] };
    w.seenAt = [];
    const note = () => {
      if (v.hasAttribute("data-on")) w.seenAt.push(v.currentTime);
    };
    v.addEventListener("timeupdate", note);
    new MutationObserver(note).observe(v, { attributes: true, attributeFilter: ["data-on"] });
  });
  await box.hover();
  await expect(video).toHaveAttribute("data-on", "", { timeout: 20_000 });
  expect(await video.evaluate((v: HTMLVideoElement) => v.currentTime), slug).toBeGreaterThanOrEqual(from);
  // To the end of the film and round once more.
  await video.evaluate((v: HTMLVideoElement) => {
    v.currentTime = Math.max(0, v.duration - 0.4);
  });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 10_000 }).toBeLessThan(from + 1.2);
  await page.waitForTimeout(400);
  const after = await video.evaluate((v: HTMLVideoElement) => ({ t: v.currentTime, on: v.hasAttribute("data-on"), paused: v.paused }));
  expect(after.paused, slug).toBe(false);
  expect(after.t, slug).toBeGreaterThanOrEqual(from);
  const seen = await page.evaluate(() => (window as unknown as { seenAt: number[] }).seenAt);
  expect(seen.length, slug).toBeGreaterThan(0);
  expect(Math.min(...seen), `${slug}: never seen before ${from}s`).toBeGreaterThanOrEqual(from);
}

test.describe("front-3: a card's hover film skips the recording's opening", () => {
  for (const slug of ["popup-card", "xoxo", "the-letter"]) {
    test(`gallery card, ${slug}`, async ({ page }) => {
      await page.goto("/templates");
      await hoverFilm(page, `[data-gallery-card="${slug}"]`, slug);
    });
  }

  test("the front page's strip, popup-card", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("[data-template-strip] article", { has: page.locator('a[href="/templates/popup-card"]') });
    await card.evaluate((el) => el.setAttribute("data-test-card", ""));
    await hoverFilm(page, "[data-template-strip] article[data-test-card] > div:first-child", "popup-card");
  });
});

for (const [width, height] of [
  [1440, 900],
  [390, 844],
] as const) {
  test.describe(`the front page's rows at ${width}`, () => {
    test.use({ viewport: { width, height } });

    test("front-2: the strip's first card starts under the section's heading", async ({ page }) => {
      await page.goto("/");
      const strip = page.locator("[data-template-strip]");
      await strip.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      const heading = page.locator("h2", { hasText: "Every template is a whole experience." });
      const first = strip.locator(":scope > div").first();
      const [h, c] = [(await heading.boundingBox())!, (await first.boundingBox())!];
      expect(Math.abs(h.x - c.x)).toBeLessThanOrEqual(2);
      expect(await strip.evaluate((el) => el.scrollLeft)).toBeLessThanOrEqual(1);
    });

    test("front-15: no line on the front page ends in an ellipsis", async ({ page }) => {
      for (const path of ["/", "/es"]) {
        await page.goto(path);
        const cut = await page.evaluate(() =>
          [...document.querySelectorAll("main *")]
            .filter((el) => {
              const s = getComputedStyle(el);
              const clamped = s.webkitLineClamp !== "none" && s.webkitLineClamp !== "" ? true : s.textOverflow === "ellipsis";
              return clamped && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
            })
            .map((el) => (el.textContent ?? "").slice(0, 60)),
        );
        expect(cut, path).toEqual([]);
      }
    });
  });
}

test.describe("front-15 at 1280 too", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test("no line on the front page ends in an ellipsis, and a row of cards keeps its buttons level", async ({ page }) => {
    for (const path of ["/", "/es"]) {
      await page.goto(path);
      const cut = await page.evaluate(() =>
        [...document.querySelectorAll("main [data-card-line], main [data-idea-line]")].filter((el) => el.scrollHeight > el.clientHeight + 1).map((el) => el.textContent),
      );
      expect(cut, path).toEqual([]);
    }
    // The first four cards never fade in (the others rise 16px as they come into view): their buttons stand on one line.
    const tops = await page.locator("[data-template-strip] article a[href^='/es/create/'], [data-template-strip] article a[href^='/create/']").evaluateAll((links) => links.slice(0, 4).map((a) => Math.round(a.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    // And every card fills its row's height.
    const fills = await page.locator("[data-template-strip] > div").evaluateAll((cells) => cells.every((c) => Math.abs((c.firstElementChild as HTMLElement).offsetHeight - (c as HTMLElement).offsetHeight) <= 1));
    expect(fills).toBe(true);
  });
});

test.describe("front-5: a mouse can move the front page's rows", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  for (const row of ["[data-template-strip]", "[data-ideas-row]"]) {
    test(row, async ({ page }) => {
      await page.goto("/");
      const scroller = page.locator(row);
      await scroller.scrollIntoViewIfNeeded();
      const frame = scroller.locator("xpath=..");
      const previous = frame.locator("[data-row-previous]");
      const next = frame.locator("[data-row-next]");
      await expect(previous).toBeDisabled();
      await expect(previous).toHaveAttribute("aria-label", /Earlier/);
      await expect(next).toBeEnabled();
      await next.click();
      await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
      await expect(previous).toBeEnabled();
    });
  }

  test("in Spanish the buttons have Spanish names, and they are not there on a phone", async ({ page }) => {
    await page.goto("/es");
    await expect(page.locator("[data-row-next]").first()).toHaveAttribute("aria-label", "Más regalos");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("[data-row-next]").first()).toBeHidden();
  });
});

/** An answer card's words are whole and clear of the card's edges. */
async function answersFit(page: Page) {
  return page.$$eval("[data-answer]", (cards) =>
    cards
      .map((card) => {
        const label = card.lastElementChild as HTMLElement;
        const range = document.createRange();
        range.selectNodeContents(label);
        const t = range.getBoundingClientRect();
        const c = card.getBoundingClientRect();
        const ok = label.scrollWidth <= label.clientWidth + 1 && c.right - t.right >= 4 && t.left - c.left >= 4 && t.top - c.top >= 3 && c.bottom - t.bottom >= 3;
        return ok ? null : label.textContent;
      })
      .filter(Boolean),
  );
}

test.describe("the finder's second question", () => {
  for (const lang of ["", "/es"]) {
    test(`agreed-1: an even number of answers for every person, before and after More (${lang || "/"})`, async ({ page }) => {
      for (const who of ["girlfriend", "boyfriend", "wife", "husband", "mom", "dad", "best-friend", "any"]) {
        await page.goto(`${lang}/gifts/finder?for=${who}`);
        const cards = page.locator("[data-answer]");
        await expect(cards.first()).toBeVisible();
        expect((await cards.count()) % 2, who).toBe(0);
        expect(await cards.count(), who).toBe(8);
        await page.locator("button[aria-controls=finder-answers]").click();
        await expect(cards).toHaveCount(14);
      }
    });
  }

  for (const width of [320, 360, 390]) {
    test.describe(`at ${width}`, () => {
      test.use({ viewport: { width, height: 740 } });
      test("agreed-6: no answer is cut or touches its card's edge, in either language", async ({ page }) => {
        for (const lang of ["", "/es"]) {
          await page.goto(`${lang}/gifts/finder`);
          await expect(page.locator("[data-answer]").first()).toBeVisible();
          expect(await answersFit(page), `${lang} q1`).toEqual([]);
          await page.goto(`${lang}/gifts/finder?for=best-friend`);
          await page.locator("button[aria-controls=finder-answers]").click();
          await expect(page.locator("[data-answer]")).toHaveCount(14);
          expect(await answersFit(page), `${lang} q2`).toEqual([]);
        }
      });
    });
  }
});

test.describe("the finder's results on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("choose-9: past nine picks the place is a count, and the list ends by saying these are the gifts for the two answers", async ({ page }) => {
    await page.goto("/es/gifts/finder?for=mom&occasion=christmas&more=30");
    await expect(page.getByText("Esos son todos los regalos para estas dos respuestas.")).toBeVisible();
    const count = page.locator("[data-dots][data-count]");
    await expect(count).toBeVisible();
    await expect(count).toHaveText(/^1 \/ \d{2}$/);
    await page.goto("/gifts/finder?for=mom&occasion=christmas");
    // Three picks: still dots.
    await expect(page.locator("[data-dots] > span")).toHaveCount(3);
  });

  test("agreed-14: the pause button sits right after the last feeling pill", async ({ page }) => {
    await page.goto("/es/gifts/finder?for=girlfriend&occasion=christmas");
    // The button comes once a film really moves, and a film plays once its card is on screen.
    await page.locator("#finder-row").scrollIntoViewIfNeeded();
    const pause = page.locator("[data-films-toggle]");
    await expect(pause).toBeVisible({ timeout: 20_000 });
    const last = page.locator("[data-feel]").last();
    const [p, l] = [(await pause.boundingBox())!, (await last.boundingBox())!];
    expect(Math.abs(p.y + p.height / 2 - (l.y + l.height / 2))).toBeLessThanOrEqual(4);
    expect(p.x).toBeGreaterThanOrEqual(l.x + l.width - 1);
    expect(p.x - (l.x + l.width)).toBeLessThan(16);
  });
});

test.describe("agreed-7 and agreed-11: pictures that looked wrong on their cards", () => {
  test("Frosted Window's poster fills its card, in the gallery and in the finder", async ({ page }) => {
    await page.goto("/templates");
    const card = page.locator('[data-gallery-card="frosted-window"] [data-card-page] > div').first();
    await card.scrollIntoViewIfNeeded();
    const widths = await card.evaluate((box) => ({ box: box.getBoundingClientRect().width, img: box.querySelector("img")!.getBoundingClientRect().width }));
    // The poster's own beige bars are an eighth of its width each: drawn 1.3 times as wide, they fall outside the card.
    expect(widths.img / widths.box).toBeGreaterThanOrEqual(1.29);
    await page.goto("/gifts/finder?for=girlfriend&occasion=christmas");
    const pick = page.locator("[data-pick]").first();
    await expect(pick.locator("h3")).toHaveText("Frosted Window");
    const film = await pick.locator("[data-watch]").evaluate((box) => ({ box: box.getBoundingClientRect().width, img: box.querySelector("img")!.getBoundingClientRect().width }));
    expect(film.img / film.box).toBeGreaterThanOrEqual(1.29);
    // Zoomed past its frame, the film still plays (the frame is what is watched for being on screen).
    await expect(pick.locator("video")).toHaveAttribute("data-on", "", { timeout: 20_000 });
  });

  test("the finder's Saying sorry answer is not Paper Crane's dark poster", async ({ page }) => {
    for (const who of ["girlfriend", "wife", "mom"]) {
      await page.goto(`/gifts/finder?for=${who}`);
      const sorry = page.locator("[data-answer]", { hasText: "Saying sorry" });
      await expect(sorry).toBeVisible();
      expect(await sorry.locator("img").getAttribute("src"), who).not.toContain("paper-crane");
    }
  });
});

test.describe("small front-door fixes", () => {
  test("front-9: the 404 page has its own tab title, in both languages", async ({ page }) => {
    await page.goto("/this-page-is-not-here");
    await expect(page).toHaveTitle("Page not found · Ethos");
    await page.goto("/es/esta-pagina-no-existe");
    await expect(page).toHaveTitle("Página no encontrada · Ethos");
  });
});

const WHITE = "rgb(255, 255, 255)";

test.describe("cream, not white", () => {
  test("front-4: /pricing's comparison table has no white top row", async ({ page }) => {
    await page.goto("/pricing");
    const heads = page.locator("table thead th");
    await heads.first().scrollIntoViewIfNeeded();
    for (const bg of await heads.evaluateAll((cells) => cells.map((c) => getComputedStyle(c).backgroundColor))) expect(bg).not.toBe(WHITE);
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test("front-14: the menu's Log in button is not pure white", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Open menu" }).click();
      const login = page.getByRole("dialog").getByRole("link", { name: "Log in" });
      await expect(login).toBeVisible();
      expect(await login.evaluate((a) => getComputedStyle(a).backgroundColor)).not.toBe(WHITE);
    });

    test("rooms-4: the menu's current room and its cards are neither the old cool pink nor white", async ({ page }) => {
      await page.goto("/trips");
      await page.getByRole("button", { name: "Open menu" }).click();
      const nav = page.getByRole("dialog").getByRole("navigation");
      await expect(nav.locator("a[aria-current=page]")).toBeVisible();
      expect(await offPalette(nav)).toEqual([]);
    });
  });

  // The second fix round (view-fix-2-brief.md): rooms-4 and rooms-5 outside the Dates folders.
  test("rooms-4: a trip's Evening lines and its hero's buttons are on the cream", async ({ page }) => {
    await page.goto("/trips/baltic-coast");
    const evenings = page.locator("[data-testid=trip-plan] li li", { has: page.locator("strong") });
    await expect(evenings.first()).toBeAttached();
    expect(await offPalette(page.locator("[data-testid=trip-plan]"))).toEqual([]);
    expect(await offPalette(page.locator("main section").first())).toEqual([]);
  });

  test("rooms-5: the trips search form's fields and pills are cream", async ({ page }) => {
    await page.goto("/trips");
    const finder = page.getByTestId("flight-finder");
    await expect(finder).toBeVisible();
    expect(await offPalette(finder)).toEqual([]);
    const pills = page.locator("[role=group]", { has: page.locator("button[aria-pressed]") });
    await expect(pills.first()).toBeVisible();
    expect(await offPalette(pills)).toEqual([]);
  });

  test("rooms-5: the long-distance town boxes and the front page's iPhone card are cream", async ({ page }) => {
    await page.goto("/long-distance");
    const box = page.getByRole("combobox", { name: "Where they are" }).locator("xpath=ancestor::div[contains(@class,'rounded-[32px]')][1]");
    await expect(box).toBeVisible();
    expect(await offPalette(box)).toEqual([]);
    await page.goto("/");
    const app = page.locator("[data-app-soon]").first();
    expect(await app.evaluate((p) => getComputedStyle(p).backgroundColor)).not.toMatch(/^rgba?\(255, 255, 255/);
  });
});

test("rooms-5: a plan's Open in Maps button is cream", async ({ page }) => {
  const plan = {
    v: 1,
    date: "2030-06-15",
    where: "Lisbon",
    stops: [
      { id: "node/107", name: "Museu do Fado Pequeno", kind: "museum", lat: 38.7118, lng: -9.1284, time: "17:00" },
      { id: "node/104", name: "Gelados Santini", kind: "dessert", lat: 38.713, lng: -9.137, time: "18:30" },
    ],
  };
  await page.addInitScript((p) => window.localStorage.setItem("ethos.dates.plan.v1", p), JSON.stringify(plan));
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.route("**/api/dates/weather*", (route) => route.fulfill({ json: { days: [], utcOffsetSeconds: 3600, timezone: "Europe/Lisbon" } }));
  await page.goto("/plan");
  const maps = page.locator("[data-testid=maps-locked], [data-testid=maps-menu]").first();
  await expect(maps).toBeVisible();
  expect(await maps.evaluate((b) => getComputedStyle(b).backgroundColor)).not.toBe(WHITE);
});

/** Visible things in `scope` (and `scope` itself) drawn pure white or in the old cool pink rose-mist (#fff0f4). */
async function offPalette(scope: import("@playwright/test").Locator) {
  return (
    await scope.evaluateAll((roots) =>
      roots.flatMap((root) =>
        [root, ...root.querySelectorAll("*")]
          .filter((el) => (el as HTMLElement).offsetParent !== null || el === root)
          .filter((el) => ["rgb(255, 255, 255)", "rgb(255, 240, 244)"].includes(getComputedStyle(el).backgroundColor))
          .map((el) => `${el.tagName.toLowerCase()} ${(el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 40)}`),
      ),
    )
  );
}

test.describe("choose-5: with Free or Premium on, the gallery says what it shows", () => {
  for (const [path, title, eyebrow] of [
    ["/templates?tier=free", "Free gifts", /^\d+ gifts?$/],
    ["/templates?tier=premium&sort=new", "Premium gifts", /^\d+ gifts$/],
    ["/es/templates?tier=free&sort=az", "Regalos gratis", /^\d+ regalos?$/],
    ["/es/templates?tier=premium", "Regalos premium", /^\d+ regalos$/],
  ] as const) {
    test(path, async ({ page }) => {
      await page.goto(path);
      const shelves = page.locator("[data-shelf]");
      await expect(shelves).toHaveCount(1);
      await expect(shelves.locator("h2")).toHaveText(title);
      await expect(shelves.locator("header p").first()).toHaveText(eyebrow);
      const count = Number((await shelves.locator("header p").first().textContent())!.match(/\d+/)![0]);
      await expect(shelves.locator("[data-gallery-card]")).toHaveCount(count);
    });
  }
});

test.describe("the front page's hero and close", () => {
  test("front-6: a Dates link's hero carries the brand line too, in both languages", async ({ page }) => {
    for (const [path, line] of [
      ["/?ref=dates-test", "Digital cards by Tryethos"],
      ["/es?ref=dates-test", "Tarjetas digitales de Tryethos"],
    ] as const) {
      await page.goto(path);
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1.locator("[data-brand-line]"), path).toHaveText(line);
      expect((await h1.locator("[data-brand-line]").boundingBox())!.y, path).toBeLessThan((await h1.locator("em").boundingBox())!.y);
    }
  });

  test("agreed-3: the closing band's first, filled button makes a gift, in both languages", async ({ page }) => {
    for (const [path, gallery] of [
      ["/", "/templates"],
      ["/es", "/es/templates"],
    ] as const) {
      await page.goto(path);
      await expect(page.locator("[data-closing-buttons] a").first(), path).toHaveAttribute("href", gallery);
      await expect(page.locator("[data-closing-buttons] a").nth(1), path).toHaveAttribute("href", /\/dates$/);
    }
  });

  test("front-8: the games band's two ways to play are labels, and the app card answers no pointer", async ({ page }) => {
    await page.goto("/");
    const ways = page.locator("[data-games-ways] > span");
    await expect(ways).toHaveCount(2);
    for (const style of await ways.evaluateAll((spans) => spans.map((s) => ({ radius: getComputedStyle(s).borderRadius, bg: getComputedStyle(s).backgroundColor })))) {
      expect(style.radius).toBe("0px");
      expect(style.bg).toBe("rgba(0, 0, 0, 0)");
    }
    const app = page.locator("[data-app-soon]").first();
    expect(await app.evaluate((p) => ({ cursor: getComputedStyle(p).cursor, events: getComputedStyle(p).pointerEvents, inControl: p.closest("a, button") !== null }))).toEqual({ cursor: "default", events: "none", inControl: false });
  });

  test("agreed-13: the long-distance band's pieces at its foot lie whole inside it", async ({ page }) => {
    for (const width of [1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const frame = page.locator('[data-floral-frame="bandInside"]');
      await frame.scrollIntoViewIfNeeded();
      const out = await frame.evaluate((box) => {
        const band = box.getBoundingClientRect();
        return [...box.querySelectorAll("img")]
          .map((img) => ({ r: img.getBoundingClientRect(), shown: getComputedStyle(img).display !== "none" }))
          .filter(({ r, shown }) => shown && r.left < band.left + band.width / 2)
          .filter(({ r }) => r.bottom > band.bottom + 1 || r.top < band.top - 1)
          .map(({ r }) => Math.round(r.bottom - band.bottom));
      });
      expect(out, `${width}`).toEqual([]);
    }
  });
});

test.describe("choose-8: the footer's occasions", () => {
  test("are the first six of the gallery's row today, then All occasions", async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    await page.goto("/pricing");
    const column = page.locator("footer div", { has: page.locator("p", { hasText: /^Occasions$/ }) }).last();
    const hrefs = await column.locator("a").evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(hrefs).toEqual([...occasionRow(today).slice(0, 6).map((o) => `/occasions/${o}`), "/templates"]);
    await expect(column.locator("a").last()).toHaveText("All occasions");
  });
});

test.describe("giftpages-4: the demo bar's way back says where it goes", () => {
  test("Back to the gift, in both languages, and Back alone under 360px", async ({ page }) => {
    await page.goto("/demo/bouquet");
    const back = page.locator("[data-demo-chrome] a").first();
    await expect(back).toHaveAttribute("href", "/templates/bouquet");
    await expect(back).toHaveText("Back to Bouquet", { useInnerText: true });
    await page.goto("/es/demo/bouquet");
    await expect(page.locator("[data-demo-chrome] a").first()).toHaveText(/^Volver a /, { useInnerText: true });
    // The site now remembers Spanish: under 360px the way back is "Volver" alone.
    await page.setViewportSize({ width: 340, height: 700 });
    await page.goto("/es/demo/bouquet");
    await expect(page.locator("[data-demo-chrome] a").first()).toHaveText("Volver", { useInnerText: true });
  });
});

test.describe("agreed-15: an idea card on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("holds its words in its middle, the row's cards one height", async ({ page }) => {
    await page.goto("/templates/the-letter");
    const cards = page.locator('[id^="ideas-"] > li');
    await cards.first().scrollIntoViewIfNeeded();
    const boxes = await cards.evaluateAll((lis) =>
      lis.map((li) => {
        const r = li.getBoundingClientRect();
        const first = li.firstElementChild!.getBoundingClientRect();
        const last = li.lastElementChild!.getBoundingClientRect();
        return { h: Math.round(r.height), above: Math.round(first.top - r.top), below: Math.round(r.bottom - last.bottom) };
      }),
    );
    expect(new Set(boxes.map((b) => b.h)).size).toBe(1);
    // The padding is 16px above and 20px below: what is left over is shared, not all at the foot.
    for (const b of boxes) expect(Math.abs(b.above - 16 - (b.below - 20)), JSON.stringify(b)).toBeLessThanOrEqual(2);
  });
});

test.describe("agreed-2: a phone sees the photograph on the front page before the three facts", () => {
  test("the picture comes straight after the buttons, and most of it is on the first screen of a 390 by 844 phone", async ({ page }) => {
    // The user walk of 23 Nov 2026: the first screen was a headline, a paragraph, two buttons and three facts, and the photograph began under it.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const words = (await page.locator("[data-hero-words]").boundingBox())!;
    const picture = (await page.locator("[data-hero-picture] img").first().boundingBox())!;
    const facts = (await page.locator("[data-hero-facts]").boundingBox())!;
    expect(picture.y).toBeGreaterThan(words.y + words.height);
    expect(facts.y).toBeGreaterThan(picture.y + picture.height - 60);
    // At least four fifths of the photograph is above the foot of the first screen.
    expect(844 - picture.y).toBeGreaterThan(picture.height * 0.8);
    // On a desk the facts are back under the buttons, beside the picture.
    await page.setViewportSize({ width: 1440, height: 900 });
    const deskWords = (await page.locator("[data-hero-words]").boundingBox())!;
    const deskFacts = (await page.locator("[data-hero-facts]").boundingBox())!;
    const deskPicture = (await page.locator("[data-hero-picture] img").first().boundingBox())!;
    expect(Math.abs(deskFacts.x - deskWords.x)).toBeLessThan(2);
    expect(deskPicture.x).toBeGreaterThan(deskWords.x + 400);
  });
});
