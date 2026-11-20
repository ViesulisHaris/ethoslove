import { expect, test } from "@playwright/test";

/**
 * A directory that lists Ethos for free only while tryethos.io links back to it, and keeps checking
 * that it does. The link sits on the home page alone, small, but there to be read and followed: a
 * hidden link, or one marked nofollow, is one its checker turns down. The address is the one the
 * directory's own badge code gives, to the letter.
 */
const DIRECTORIES = [{ name: "SaaSTool", href: "https://saastool.site/item/ethos?utm_source=tryethos.io" }];
const ANY_DIRECTORY = 'a[href*="saastool.site"]';

for (const home of ["/", "/es"]) {
  test(`the home page ${home} links to the directory, small but readable`, async ({ page }) => {
    await page.goto(home);
    const line = page.getByTestId("directory-links");
    await line.scrollIntoViewIfNeeded();
    await expect(line).toBeVisible();
    for (const { name, href } of DIRECTORIES) {
      const link = line.getByRole("link", { name, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", href);
      expect((await link.getAttribute("rel")) ?? "").not.toContain("nofollow");
    }
    await expect(line.getByRole("link")).toHaveCount(DIRECTORIES.length);
    const look = await line.evaluate((el) => {
      const style = getComputedStyle(el);
      return { size: parseFloat(style.fontSize), opacity: parseFloat(style.opacity) };
    });
    expect(look.size).toBeGreaterThanOrEqual(11);
    expect(look.opacity).toBe(1);
  });
}

test("no other page carries the directory link", async ({ page }) => {
  for (const path of ["/templates", "/about", "/es/templates", "/pricing"]) {
    await page.goto(path);
    await expect(page.locator(ANY_DIRECTORY)).toHaveCount(0);
  }
});
