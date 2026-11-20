import { expect, test } from "@playwright/test";

/**
 * A directory that lists Ethos for free only while tryethos.io shows its badge, and keeps checking
 * that it does. The badge sits on the home page alone, small and quiet (the owner's pick, 20 Nov
 * 2026), but there to be seen and followed: a hidden badge, or a link marked nofollow, is one the
 * directory turns down. The address is the one the directory's own badge code gives, to the letter,
 * and the picture is served from here, so opening the home page tells the directory nothing.
 */
const DIRECTORIES = [{ name: "SaaSTool", href: "https://saastool.site/item/ethos?utm_source=tryethos.io", badge: "/badges/saastool-dark.svg" }];
const ANY_DIRECTORY = 'a[href*="saastool.site"]';

for (const home of ["/", "/es"]) {
  test(`the home page ${home} shows the directory's badge, small but there to see`, async ({ page }) => {
    await page.goto(home);
    const line = page.getByTestId("directory-links");
    await line.scrollIntoViewIfNeeded();
    await expect(line).toBeVisible();
    for (const { name, href, badge } of DIRECTORIES) {
      const link = line.getByRole("link", { name: new RegExp(name) });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", href);
      expect((await link.getAttribute("rel")) ?? "").not.toContain("nofollow");

      const picture = link.locator("img");
      await expect(picture).toBeVisible();
      await expect.poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      const src = new URL(await picture.evaluate((img: HTMLImageElement) => img.currentSrc));
      expect(src.origin).toBe(new URL(page.url()).origin);
      expect(src.pathname).toBe(badge);

      // Small is fine; hidden is not. The site fades every picture in as it loads, so the look that
      // counts is the one it settles at.
      expect((await picture.boundingBox())?.height).toBeGreaterThanOrEqual(20);
      const opacity = () =>
        picture.evaluate((img) => {
          let seen = 1;
          for (let el: Element | null = img; el; el = el.parentElement) seen *= parseFloat(getComputedStyle(el).opacity);
          return seen;
        });
      await expect.poll(opacity).toBeGreaterThanOrEqual(0.6);
    }
    await expect(line.getByRole("link")).toHaveCount(DIRECTORIES.length);
  });
}

test("no other page carries the directory link", async ({ page }) => {
  for (const path of ["/templates", "/about", "/es/templates", "/pricing"]) {
    await page.goto(path);
    await expect(page.locator(ANY_DIRECTORY)).toHaveCount(0);
  }
});
