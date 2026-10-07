import { expect, test, type Page } from "@playwright/test";

/**
 * Two things buyers saw on real gifts: a name cut short ("Maya …", the tail of the "y" shaved off)
 * and a Coquette with a real song showing no player at all. Both are driven through the editor,
 * the way a sender makes the gift, with a song from Apple's catalogue put in the saved draft.
 */

const SONG = {
  source: "catalog",
  url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/30/02/8c/30028c8a-a125-5466-bcc6-27a83b1c0135/mzaf_16911571635366913039.plus.aac.p.m4a",
  trackId: "1640157165",
  title: "golden hour",
  artist: "JVKE",
  provider: "itunes",
  externalUrl: "https://music.apple.com/us/album/golden-hour/1640157064?i=1640157165",
  startAt: 0,
};

async function draft(page: Page, slug: string, name: string, music?: typeof SONG) {
  await page.goto(`/create/${slug}`);
  await expect(page.getByLabel("Their name")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Their name").fill(name);
  await page.getByLabel("Your name").fill("Leo");
  const key = `ethos:draft:${slug}`;
  // The editor saves a moment after typing; patch the draft before that and its own save writes over the song.
  await expect.poll(() => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null")?.data?.senderName, key)).toBe("Leo");
  if (music) {
    await page.evaluate(
      ({ k, song }) => {
        const saved = JSON.parse(localStorage.getItem(k) ?? "{}");
        saved.data.music = song;
        localStorage.setItem(k, JSON.stringify(saved));
      },
      { k: key, song: music },
    );
    await page.reload();
    await expect(page.getByLabel("Their name")).toBeVisible({ timeout: 30_000 });
  }
}

/** Phones show the editor's preview on a tab of its own. */
async function playFromStart(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole("tab", { name: "Preview" }).click();
  await page.getByRole("button", { name: "Play from the start" }).first().click();
}

/** Every fitted name on screen sits inside its own box: nothing hangs past the edge, nothing is cut. */
async function namesFit(page: Page) {
  return page.locator("[data-fit-name]:visible").evaluateAll((els) =>
    els.map((el) => {
      const inner = el.firstElementChild as HTMLElement;
      const box = getComputedStyle(el);
      const room = (el as HTMLElement).clientWidth - parseFloat(box.paddingLeft) - parseFloat(box.paddingRight);
      return { text: el.textContent, fits: inner.offsetWidth <= room + 1, clipped: box.overflow === "hidden" || box.textOverflow === "ellipsis" };
    }),
  );
}

test.describe("names are never cut short", () => {
  for (const slug of ["coquette", "xoxo", "the-council", "birthday-cinema", "spooky-season", "dark-romance"]) {
    test(`${slug}: a long name fits its line whole`, async ({ page, isMobile }) => {
      test.setTimeout(90_000);
      await draft(page, slug, "Mariangela Josephine");
      await playFromStart(page, isMobile);
      // A gift cover first if it has one; Classic opens straight on the template's own first screen.
      const cover = page.getByRole("button", { name: /tap to open/i });
      if (await cover.first().isVisible({ timeout: 6_000 }).catch(() => false)) await cover.first().click({ force: true });
      // Wait for the long name itself: the editor's still page can have other fitted lines on it first.
      await expect.poll(async () => (await namesFit(page)).some((n) => n.text?.includes("Mariangela")), { timeout: 20_000 }).toBe(true);
      for (const name of await namesFit(page)) {
        expect(name.fits, `${name.text} fits`).toBe(true);
        expect(name.clipped, `${name.text} is not clipped`).toBe(false);
      }
    });
  }
});

test.describe("a real song on Coquette", () => {
  test("shows as the player card, plays only on a tap, and the end screen doesn't offer it twice", async ({ page, isMobile }) => {
    test.setTimeout(90_000);
    await draft(page, "coquette", "Maya", SONG);
    await playFromStart(page, isMobile);
    await page.getByRole("button", { name: /untie the bow/i }).first().click({ force: true, timeout: 25_000 });

    const card = page.locator('[data-testid="song-preview-card"]:visible');
    await expect(card).toContainText("golden hour", { timeout: 15_000 });
    await expect(card).toContainText("Preview courtesy of Apple Music");
    await expect(card.getByRole("link", { name: "Listen on Apple Music" })).toHaveAttribute("href", /^https:\/\/music\.apple\.com\//);
    // Apple's rule: nothing plays until the recipient taps the song itself.
    await expect(card.getByRole("button", { name: /Play 30 seconds of/ })).toBeVisible();

    const scroller = page.locator("[data-scroller]:visible").first();
    await scroller.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(1500);
    await expect(page.locator('[data-testid="song-preview"]:visible')).toHaveCount(0);
  });
});
