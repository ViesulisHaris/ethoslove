import { expect, test } from "@playwright/test";

test.describe("the front page by arrival link", () => {
  for (const ref of ["tt-couple", "tt-ideas", "tt-him", "watermark"]) {
    test(`?ref=${ref} leads with the gift, in the first HTML`, async ({ page }) => {
      // Scripts off: the hero has to be chosen on the server, not swapped in after hydration.
      await page.route("**/*.js", (route) => route.abort());
      await page.goto(`/?ref=${ref}`);
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Make them a gift");
      await expect(page.locator("main").getByRole("link", { name: "Make a gift" }).first()).toHaveAttribute("href", "/templates");
    });
  }

  test("the gallery comes straight after the gift hero, and after the date ideas otherwise", async ({ page }) => {
    const order = async () => {
      const titles = await page.locator("main h2").allTextContents();
      const at = (s: string) => titles.findIndex((t) => t.includes(s));
      return { gallery: at("Every template is a whole experience."), doors: at("Whatever kind of couple you are") };
    };
    await page.goto("/?ref=tt-couple");
    const gift = await order();
    expect(gift.gallery).toBeGreaterThanOrEqual(0);
    expect(gift.gallery).toBeLessThan(gift.doors);
    await page.goto("/");
    const dates = await order();
    expect(dates.gallery).toBeGreaterThan(dates.doors);
  });

  test("everyone else still gets Dates first", async ({ page }) => {
    await page.goto("/?ref=newsletter");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Find the date.");
  });

  test("in Spanish too", async ({ page }) => {
    await page.goto("/es?ref=tt-couple");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Hazle un regalo");
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
