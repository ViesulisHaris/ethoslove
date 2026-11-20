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
    if (isMobile) {
      await page.getByRole("button", { name: "Open menu" }).click();
      const rooms = page.getByRole("navigation", { name: "Menu" }).getByRole("link");
      await expect(rooms.first()).toHaveAttribute("href", "/gifts");
      expect(await rooms.evaluateAll((links) => links.map((a) => a.getAttribute("href")))).toEqual(["/gifts", "/dates", "/trips", "/long-distance", "/games", "/pricing"]);
      await page.keyboard.press("Escape");
    } else {
      const rooms = page.getByRole("navigation", { name: "Main" }).getByRole("link");
      expect(await rooms.evaluateAll((links) => links.map((a) => a.getAttribute("href")))).toEqual(["/gifts", "/dates", "/trips", "/long-distance", "/games", "/pricing"]);
    }
    // The four doors on the page: Gifts is the first of them.
    const doors = page.locator("section", { has: page.getByRole("heading", { level: 2, name: "Whatever kind of couple you are this week." }) }).locator("ul > li > a");
    expect(await doors.evaluateAll((links) => links.map((a) => a.getAttribute("href")))).toEqual(["/gifts", "/dates", "/long-distance", "/games"]);
    // And the footer's list of what there is to explore.
    const explore = page.locator("footer ul").first().getByRole("link");
    expect((await explore.evaluateAll((links) => links.map((a) => a.getAttribute("href")))).slice(0, 4)).toEqual(["/gifts", "/templates", "/dates", "/trips"]);
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
