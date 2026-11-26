import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * The song strip (src/templates/_shared/SongStrip.tsx): the real song, once, on a tap, in a small
 * pill in the gift's top corner. It ships switched off. Run against a dev server started with
 * NEXT_PUBLIC_SONG_STRIP=1 for the tests that need it on; without it they are skipped and the
 * last test (nothing is drawn) runs instead.
 *
 * Apple's preview is answered here with one of the site's own library tracks: nothing is fetched
 * from Apple, and the test browser can play it.
 */
const GIFT = "/gift-preview?template=the-letter&song=1&paid=1";
const TRACK = readFileSync(join(process.cwd(), "public/audio/library/golden-hour.mp3"));

async function open(page: Page, url = GIFT) {
  await page.route("https://audio-ssl.itunes.apple.com/**", (route) => route.fulfill({ status: 200, contentType: "audio/mpeg", body: TRACK }));
  await page.route("https://*.mzstatic.com/**", (route) => route.fulfill({ status: 200, contentType: "image/gif", body: Buffer.from("R0lGODlhAQABAAAAACwAAAAAAQABAAA=", "base64") }));
  await page.goto(url);
  await page.getByRole("button", { name: /tap to open/i }).click();
  await expect(page.locator(".gift-root [data-template], .gift-root")).not.toHaveCount(0);
}

const strip = (page: Page) => page.locator("[data-song-strip]");

async function switchedOn(page: Page): Promise<boolean> {
  await open(page);
  await page.waitForTimeout(2500);
  return (await strip(page).count()) > 0;
}

test.describe("the song strip", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("is a small pill that plays nothing until it is tapped, then names the song beside its Apple Music link", async ({ page }) => {
    test.skip(!(await switchedOn(page)), "NEXT_PUBLIC_SONG_STRIP is not 1 on this server");
    const pill = strip(page);
    await expect(pill).toHaveAttribute("data-song-strip", "idle");
    const box = (await pill.boundingBox())!;
    expect(box.height).toBeLessThanOrEqual(28);
    expect(box.width).toBeLessThanOrEqual(390 * 0.27 + 1);
    // Nothing was asked of Apple before the tap.
    const asked: string[] = [];
    page.on("request", (r) => void (r.url().includes("audio-ssl.itunes.apple.com") && asked.push(r.url())));
    await page.waitForTimeout(800);
    expect(asked).toEqual([]);
    await pill.getByRole("button", { name: /play 30 seconds/i }).click();
    await expect(pill).toHaveAttribute("data-song-strip", "playing");
    const link = pill.getByRole("link");
    await expect(link).toHaveAttribute("href", /^https:\/\/music\.apple\.com\//);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(pill).toContainText("Clair De Lune");
    expect(asked.length).toBe(1);
  });

  test("goes away with the first tap on the gift once the song plays, and never sits on the end screen", async ({ page }) => {
    test.skip(!(await switchedOn(page)), "NEXT_PUBLIC_SONG_STRIP is not 1 on this server");
    const pill = strip(page);
    // Before it is tapped, a tap on the gift leaves it where it is.
    await pill.getByRole("button", { name: /play 30 seconds/i }).click();
    await expect(pill).toHaveAttribute("data-song-strip", "playing");
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: /seal/i }).first().click({ force: true });
    await expect(pill).toHaveCount(0);
  });

  test("leaves the end screen's own song card as it was", async ({ page }) => {
    test.skip(!(await switchedOn(page)), "NEXT_PUBLIC_SONG_STRIP is not 1 on this server");
    await page.getByRole("button", { name: /seal/i }).first().click({ force: true });
    const card = page.locator('[data-testid="song-preview"]');
    await card.first().scrollIntoViewIfNeeded({ timeout: 30000 });
    await expect(card.first()).toBeVisible();
    await expect(card.first().getByRole("link", { name: /apple music/i })).toBeVisible();
    // On the end screen the pill has stood down: the card is the song's place there.
    await expect(strip(page)).toHaveCount(0);
  });

  test("a gift with a library track, or none, never shows it", async ({ page }) => {
    await page.goto("/gift-preview?template=the-letter&paid=1");
    await page.getByRole("button", { name: /tap to open/i }).click();
    await page.waitForTimeout(2500);
    await expect(strip(page)).toHaveCount(0);
  });

  test("with the switch off, a gift with a real song is as it was: no pill", async ({ page }) => {
    test.skip(await switchedOn(page), "NEXT_PUBLIC_SONG_STRIP is 1 on this server");
    await expect(strip(page)).toHaveCount(0);
  });
});
