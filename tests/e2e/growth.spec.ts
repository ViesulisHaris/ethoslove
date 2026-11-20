import { expect, test } from "@playwright/test";

test.describe("the front page by arrival link", () => {
  for (const ref of ["", "tt-couple", "tt-ideas", "tt-him", "watermark", "newsletter"]) {
    test(`${ref ? `?ref=${ref}` : "no ref"} leads with the gift, in the first HTML`, async ({ page }) => {
      // Scripts off: the hero has to be chosen on the server, not swapped in after hydration.
      await page.route("**/*.js", (route) => route.abort());
      await page.goto(ref ? `/?ref=${ref}` : "/");
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Make them a gift");
      await expect(page.locator("main").getByRole("link", { name: "Make a gift" }).first()).toHaveAttribute("href", "/templates");
    });
  }

  test("the gallery comes straight after the gift hero, and after the date ideas on a Dates link", async ({ page }) => {
    const order = async () => {
      const titles = await page.locator("main h2").allTextContents();
      const at = (s: string) => titles.findIndex((t) => t.includes(s));
      return { gallery: at("Every template is a whole experience."), doors: at("Whatever kind of couple you are") };
    };
    await page.goto("/");
    const gift = await order();
    expect(gift.gallery).toBeGreaterThanOrEqual(0);
    expect(gift.gallery).toBeLessThan(gift.doors);
    await page.goto("/?ref=dates");
    const dates = await order();
    expect(dates.gallery).toBeGreaterThan(dates.doors);
  });

  test("a link made for Dates still opens on the date ideas", async ({ page }) => {
    await page.goto("/?ref=dates-lisbon");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Find the date.");
  });

  test("in Spanish too", async ({ page }) => {
    await page.goto("/es");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Hazle un regalo");
  });
});

test.describe("gifts come first in the rooms", () => {
  test("the header, the menu and the doors all start with Gifts", async ({ page, isMobile }) => {
    await page.goto("/");
    // The four doors on the page: Gifts is the first of them.
    const doors = page.locator("section", { has: page.locator("h2", { hasText: "Whatever kind of couple you are this week." }) }).locator("ul > li > a");
    await expect(doors).toHaveCount(4);
    expect(await doors.evaluateAll((links) => links.map((a) => a.getAttribute("href")))).toEqual(["/gifts", "/dates", "/long-distance", "/games"]);
    // And the footer's list of what there is to explore.
    const explore = page.locator("footer ul").first().locator("a");
    expect((await explore.evaluateAll((links) => links.map((a) => a.getAttribute("href")))).slice(0, 4)).toEqual(["/gifts", "/templates", "/dates", "/trips"]);

    const order = ["/gifts", "/dates", "/trips", "/long-distance", "/games", "/pricing"];
    if (isMobile) {
      await page.getByRole("button", { name: "Open menu" }).click();
      const rooms = page.getByRole("navigation", { name: "Menu" }).getByRole("link");
      await expect(rooms).toHaveCount(order.length);
      expect(await rooms.evaluateAll((links) => links.map((a) => a.getAttribute("href")))).toEqual(order);
    } else {
      const rooms = page.getByRole("navigation", { name: "Main" }).locator("a");
      expect(await rooms.evaluateAll((links) => links.map((a) => a.getAttribute("href")))).toEqual(order);
    }
  });
});

test.describe("the category line, set like a maker's mark", () => {
  test("heads the front page's headline, in both languages", async ({ page }) => {
    await page.goto("/");
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toContainText("Digital cards by Tryethos");
    await expect(h1).toContainText("Make them a gift");
    await page.goto("/es");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Tarjetas digitales de Tryethos");
  });

  test("is one small line under the footer's wordmark on an ordinary page, and nowhere else on it", async ({ page }) => {
    for (const [path, line] of [["/pricing", "Digital cards by Tryethos"], ["/es/templates/bouquet", "Tarjetas digitales de Tryethos"]] as const) {
      await page.goto(path);
      await expect(page.getByText(line), path).toHaveCount(1);
      await expect(page.locator("footer").getByText(line), path).toBeVisible();
      // Not in the header, and not in the page's title.
      await expect(page.locator("header").getByText(line), path).toHaveCount(0);
      expect(await page.title(), path).not.toMatch(/Tryethos|Digital cards|Tarjetas digitales/);
    }
  });

  test("is in what machines read: the Organization's slogan and the first words of /llms.txt", async ({ page, request }) => {
    await page.goto("/");
    const data = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("");
    expect(data).toContain('"slogan":"Digital cards by Tryethos"');
    expect(data).toMatch(/"alternateName":\["[^"]+","Tryethos"\]/);
    const llms = await (await request.get("/llms.txt")).text();
    expect(llms.split("\n").slice(0, 3)).toEqual(["# Ethos", "", expect.stringMatching(/^> Digital cards by Tryethos\. /)]);
    // The share card's site name is still the brand alone.
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "Ethos");
  });
});

test.describe("the creator programme", () => {
  test("says the deal and applies by email with the subject filled in", async ({ page }) => {
    await page.goto("/creators");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Share Ethos.");
    await expect(page.getByText("#ad", { exact: false }).first()).toBeVisible();
    // Link only: no code, no follower discount, and the creator's own purchases don't count.
    await expect(page.getByText("tryethos.io/?ref=c-maya").first()).toBeVisible();
    await expect(page.getByText("Your own purchases don't count", { exact: false })).toBeVisible();
    await expect(page.getByText("% off", { exact: false })).toHaveCount(0);
    const apply = page.locator("main").getByRole("link", { name: "Apply by email" }).first();
    await expect(apply).toHaveAttribute("href", /^mailto:[^?]+\?subject=Creator%20programme%20application&body=/);
  });

  test("in Spanish", async ({ page }) => {
    await page.goto("/es/creators");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Comparte Ethos.");
    await expect(page.locator("main").getByRole("link", { name: "Solicitar por correo" }).first()).toHaveAttribute("href", /subject=Solicitud%20para%20el%20programa%20de%20creadores/);
  });
});
