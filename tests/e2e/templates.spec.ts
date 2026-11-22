import { expect, test } from "@playwright/test";

test.describe("template engine", () => {
  test("gallery lists both launch templates with live demos", async ({ page }) => {
    await page.goto("/templates");
    await expect(page.getByRole("heading", { name: "The Letter" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Constellations" })).toBeVisible();
  });

  test("The Letter opens from the seal to the signed letter", async ({ page }) => {
    // ~24 s from the page to the signature even on an idle machine: the default 30 s budget left
    // no room under load, and the 60 s wait for the signature below could never run its course.
    test.setTimeout(90_000);
    await page.goto("/demo/the-letter");
    // The intro screen shows the line and the recipient's name as separate elements.
    const loading = page.getByText(/someone made this for you/i);
    await expect(loading).toBeVisible();
    await expect(page.getByText("Ana", { exact: true }).first()).toBeVisible();
    await expect(loading).toBeHidden({ timeout: 20000 });
    const seal = page.getByRole("button", { name: /tap the seal/i });
    await expect(seal).toBeVisible();
    // The seal "breathes" forever, so Playwright never sees it as stable; force is intended here.
    await seal.click({ force: true });
    await expect(page.getByText(/dear ana/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Marco", { exact: true })).toBeVisible({ timeout: 60000 });
  });

  test("Constellations completes when every star is visited", async ({ page }) => {
    await page.goto("/demo/constellations");
    const stars = page.locator("[data-star]");
    await expect(stars.first()).toBeVisible({ timeout: 15000 });
    const count = await stars.count();
    expect(count).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < count; i++) {
      await page.locator(`[data-star="${i}"]`).click();
      await page.waitForTimeout(600);
      await page.getByTestId("close-photo").click();
      await page.waitForTimeout(600);
    }
    await expect(page.getByRole("button", { name: /continue/i })).toBeVisible({ timeout: 15000 });
  });
});

test.describe("who a template suits", () => {
  // The sentence sits in the page's closed block under the questions ("More about …"), beside the
  // days it is made for: the redesigned page shows no rows of chips. It is in the server's HTML
  // whether or not the block is ever opened: found as elements, since a closed block's links have no role to be found by.
  const suits = (page: import("@playwright/test").Page) => page.locator("details[data-more-about] [data-suits] a");

  test("a couples' template names partners only, each linking to that person's gift ideas", async ({ page }) => {
    await page.goto("/templates/xoxo");
    const block = page.locator("details[data-more-about]");
    // Closed until asked for: nothing of it is on the page a visitor first sees.
    await expect(suits(page).first()).toBeHidden();
    await block.locator("summary").click();
    await expect(block.locator("[data-suits]")).toHaveText("A gift for your boyfriend, your girlfriend, your husband, your wife.");
    await expect(suits(page)).toHaveText(["your boyfriend", "your girlfriend", "your husband", "your wife"]);
    expect(await suits(page).evaluateAll((links) => links.map((a) => a.getAttribute("href")))).toEqual(["/gifts/for-boyfriend", "/gifts/for-girlfriend", "/gifts/for-husband", "/gifts/for-wife"]);
    // It sits with the occasions, after them.
    const days = await block.locator('a[href*="/occasions/"]').first().boundingBox();
    const who = await suits(page).first().boundingBox();
    expect(who!.y).toBeGreaterThan(days!.y);
  });

  test("one for a partner or a parent says so, and one for anyone lists everyone, in the server's HTML", async ({ page, isMobile }) => {
    await page.route("**/*.js", (route) => route.abort());
    await page.goto("/templates/keepsake");
    await expect(suits(page)).toHaveText(["your boyfriend", "your girlfriend", "your husband", "your wife", "your mom", "your dad"]);
    // Each person is a thumb's target once the block is open (a native <details> opens without scripts).
    if (isMobile) {
      await page.locator("details[data-more-about] summary").click();
      const heights = await suits(page).evaluateAll((links) => links.map((a) => a.getBoundingClientRect().height));
      expect(heights).toHaveLength(6);
      for (const height of heights) expect(height).toBeGreaterThanOrEqual(43.5);
    }
    // Flowers and a recipe card are kept from nobody.
    for (const slug of ["recipe-box", "bouquet"]) {
      await page.goto(`/templates/${slug}`);
      await expect(suits(page), slug).toHaveCount(7);
    }
    await page.goto("/templates/the-letter");
    await expect(suits(page)).toHaveCount(7);
    await page.goto("/es/templates/front-page");
    await expect(page.locator("details[data-more-about] [data-suits]")).toContainText("Un regalo para tu novio");
    await expect(suits(page).last()).toHaveText("tu padre");
    await expect(suits(page).last()).toHaveAttribute("href", "/es/gifts/for-dad");
  });
});

test.describe("later batch demos", () => {
  for (const slug of ["birthday-cinema", "jar-of-reasons", "scratch-card", "midnight-countdown", "our-timeline", "vinyl", "museum", "front-page", "fortune-cookie", "text-thread", "arcade", "passport", "bloom", "bouquet", "kawaii", "fireside", "trick-or-treat", "scrapbook", "halfway", "garden", "snow-globe", "recipe-box", "cap-toss", "paper-crane", "the-toast", "balloons", "popup-card", "sketchbook", "party-animals", "the-council", "sticker-bomb", "coquette", "xoxo", "keepsake", "pack-your-bags", "digicam", "photo-booth", "picnic", "music-box", "spooky-season", "dark-romance", "favorite-person", "on-repeat", "evergreen", "seance", "bat-swarm", "cauldron", "jack-o-lantern", "haunted-house", "nice-list", "unwrapped", "wishbone", "frosted-window", "light-the-candles", "string-the-lights", "gingerbread-house"]) {
    test(`${slug} demo loads past the loading screen`, async ({ page }) => {
      await page.goto(`/demo/${slug}`);
      const loading = page.getByText(/someone made this for you/i);
      await expect(loading).toBeVisible();
      await expect(loading).toBeHidden({ timeout: 25000 });
      await expect(page.locator("[data-template]").first()).toHaveAttribute("data-template", slug);
    });
  }
});

test.describe("gift covers", () => {
  test("a cover shows the name, then opens into the gift", async ({ page }) => {
    await page.goto("/demo/constellations?cover=starry");
    const cover = page.locator("[data-cover=starry]");
    await expect(cover).toBeVisible({ timeout: 20000 });
    await expect(cover.getByText(/for sof/i)).toBeVisible();
    // The hint only appears once the gift's photos and music have loaded.
    const open = page.getByRole("button", { name: /tap to open/i });
    await expect(page.getByText(/tap to open/i)).toBeVisible({ timeout: 25000 });
    await open.click();
    await expect(cover).toBeHidden({ timeout: 5000 });
    await expect(page.locator("[data-star]").first()).toBeVisible({ timeout: 15000 });
  });

  test("a collage cover, made of real cut-outs, opens into the gift too", async ({ page }) => {
    await page.goto("/demo/constellations?cover=cats");
    const cover = page.locator("[data-cover=cats]");
    await expect(cover).toBeVisible({ timeout: 20000 });
    await expect(cover.getByText(/for sof/i)).toBeVisible();
    // The cats are pictures: every one of them has to have arrived.
    await expect(cover.locator("img").first()).toBeVisible();
    const broken = await cover.locator("img").evaluateAll((imgs) => imgs.filter((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth === 0).length);
    expect(broken).toBe(0);
    await expect(page.getByText(/tap to open/i)).toBeVisible({ timeout: 25000 });
    await page.getByRole("button", { name: /tap to open/i }).click();
    await expect(cover).toBeHidden({ timeout: 5000 });
    await expect(page.locator("[data-star]").first()).toBeVisible({ timeout: 15000 });
  });

  test("a tap before the gift has loaded is remembered, and it opens by itself", async ({ page }) => {
    await page.goto("/demo/constellations?cover=lilies");
    const cover = page.locator("[data-cover=lilies]");
    await expect(cover).toBeVisible({ timeout: 20000 });
    // No waiting for the hint: tap straight away, once.
    await page.getByRole("button", { name: /tap to open/i }).click({ force: true });
    await expect(cover).toBeHidden({ timeout: 30000 });
    await expect(page.locator("[data-star]").first()).toBeVisible({ timeout: 15000 });
  });

  test("with motion turned down a cover still opens", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/demo/constellations?cover=kisses");
    const cover = page.locator("[data-cover=kisses]");
    await expect(cover).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/tap to open/i)).toBeVisible({ timeout: 25000 });
    await page.getByRole("button", { name: /tap to open/i }).click();
    await expect(cover).toBeHidden({ timeout: 5000 });
  });
});
