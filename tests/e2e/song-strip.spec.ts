import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * The song strip (src/templates/_shared/SongStrip.tsx): the real song, once, on a tap. A sound
 * button on the screen a gift opens from, then a small pill in the opened gift's top corner. It
 * ships switched off. Run against a dev server started with NEXT_PUBLIC_SONG_STRIP=1 for the tests
 * that need it on; without it they are skipped and the last test (nothing is drawn) runs instead.
 *
 * Apple's preview is answered here with one of the site's own library tracks: nothing is fetched
 * from Apple, and the test browser can play it.
 */
const GIFT = "/gift-preview?template=the-letter&song=1&paid=1";
const TRACK = readFileSync(join(process.cwd(), "public/audio/library/golden-hour.mp3"));

async function load(page: Page, url = GIFT) {
  await page.route("https://audio-ssl.itunes.apple.com/**", (route) => route.fulfill({ status: 200, contentType: "audio/mpeg", body: TRACK }));
  await page.route("https://*.mzstatic.com/**", (route) => route.fulfill({ status: 200, contentType: "image/gif", body: Buffer.from("R0lGODlhAQABAAAAACwAAAAAAQABAAA=", "base64") }));
  await page.goto(url);
  await expect(page.getByRole("button", { name: /tap to open/i })).toBeVisible();
}

const strip = (page: Page) => page.locator("[data-song-strip]");
const openGift = (page: Page) => page.getByRole("button", { name: /tap to open/i }).click();

async function switchedOn(page: Page, url = GIFT): Promise<boolean> {
  await load(page, url);
  // A cover waits for the gift to load before it shows anything on top of itself.
  await strip(page).first().waitFor({ timeout: 8000 }).catch(() => {});
  return (await strip(page).count()) > 0;
}

test.describe("the song strip", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const [name, url] of [
    ["the gift page's own gate", GIFT],
    ["a cover", `${GIFT}&cover=pressed`],
  ] as const) {
    test(`is a sound button on ${name}, under “Tap to open”, and the same song plays on in the corner once the gift opens`, async ({ page }) => {
      test.skip(!(await switchedOn(page, url)), "NEXT_PUBLIC_SONG_STRIP is not 1 on this server");
      const pill = strip(page);
      await expect(pill).toHaveAttribute("data-place", "cover");
      await expect(pill).toHaveAttribute("data-song-strip", "idle");
      // Under the button that opens the gift, in the middle, and not on it.
      const button = (await page.getByText(/tap to open/i).first().boundingBox())!;
      const box = (await pill.boundingBox())!;
      expect(box.y).toBeGreaterThan(button.y + button.height);
      expect(Math.abs(box.x + box.width / 2 - 195)).toBeLessThan(4);
      // Nothing was asked of Apple before the tap, and the tap does not open the gift.
      const asked: string[] = [];
      page.on("request", (r) => void (r.url().includes("audio-ssl.itunes.apple.com") && asked.push(r.url())));
      await page.waitForTimeout(600);
      expect(asked).toEqual([]);
      await pill.getByRole("button", { name: /play 30 seconds/i }).click();
      await expect(pill).toHaveAttribute("data-song-strip", "playing");
      await expect(page.getByText(/tap to open/i).first()).toBeVisible();
      await expect.poll(() => asked.length).toBe(1);
      // Opened: the pill is in the top corner, small, still playing the one request's song.
      await openGift(page);
      await expect(strip(page)).toHaveAttribute("data-place", "corner", { timeout: 20000 });
      await expect(strip(page)).toHaveAttribute("data-song-strip", "playing");
      await page.waitForTimeout(700);
      const corner = (await strip(page).boundingBox())!;
      expect(corner.height).toBeLessThanOrEqual(28);
      expect(corner.width).toBeLessThanOrEqual(390 * 0.27 + 1);
      expect(corner.x).toBeLessThan(20);
      expect(corner.y).toBeLessThan(20);
      const link = strip(page).getByRole("link");
      await expect(link).toHaveAttribute("href", /^https:\/\/music\.apple\.com\//);
      await expect(link).toHaveAttribute("target", "_blank");
      expect(asked.length).toBe(1);
    });
  }

  test("left alone on the opening screen, it waits in the corner, and plays from there", async ({ page }) => {
    test.skip(!(await switchedOn(page)), "NEXT_PUBLIC_SONG_STRIP is not 1 on this server");
    await openGift(page);
    const pill = strip(page);
    await expect(pill).toHaveAttribute("data-place", "corner", { timeout: 20000 });
    await expect(pill).toHaveAttribute("data-song-strip", "idle");
    await pill.getByRole("button", { name: /play 30 seconds/i }).click();
    await expect(pill).toHaveAttribute("data-song-strip", "playing");
    await expect(pill).toContainText("Clair");
  });

  test("goes away with the first tap on the gift once the song plays", async ({ page }) => {
    test.skip(!(await switchedOn(page)), "NEXT_PUBLIC_SONG_STRIP is not 1 on this server");
    await openGift(page);
    const pill = strip(page);
    await pill.getByRole("button", { name: /play 30 seconds/i }).click({ timeout: 20000 });
    await expect(pill).toHaveAttribute("data-song-strip", "playing");
    await page.waitForTimeout(1100);
    await page.getByRole("button", { name: /seal/i }).first().click({ force: true });
    await expect(pill).toHaveCount(0);
  });

  test("leaves the end screen's own song card as it was", async ({ page }) => {
    test.skip(!(await switchedOn(page)), "NEXT_PUBLIC_SONG_STRIP is not 1 on this server");
    await openGift(page);
    await page.getByRole("button", { name: /seal/i }).first().click({ force: true, timeout: 20000 });
    const card = page.locator('[data-testid="song-preview"]');
    await card.first().scrollIntoViewIfNeeded({ timeout: 30000 });
    await expect(card.first()).toBeVisible();
    await expect(card.first().getByRole("link", { name: /apple music/i })).toBeVisible();
    // On the end screen the pill has stood down: the card is the song's place there.
    await expect(strip(page)).toHaveCount(0);
  });

  test("a gift with a library track, or none, never shows it", async ({ page }) => {
    await page.goto("/gift-preview?template=the-letter&paid=1");
    await expect(page.getByRole("button", { name: /tap to open/i })).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(strip(page)).toHaveCount(0);
    await openGift(page);
    await page.waitForTimeout(2500);
    await expect(strip(page)).toHaveCount(0);
  });

  test("with the switch off, a gift with a real song is as it was: no button, no pill", async ({ page }) => {
    test.skip(await switchedOn(page), "NEXT_PUBLIC_SONG_STRIP is 1 on this server");
    await expect(strip(page)).toHaveCount(0);
    await openGift(page);
    await page.waitForTimeout(2500);
    await expect(strip(page)).toHaveCount(0);
  });
});
