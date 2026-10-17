import { expect, test, type Page } from "@playwright/test";

/** Presses the template's own opener and waits for the page to be there to scroll. */
async function openPage(page: Page, path: string, opener: RegExp) {
  await page.goto(path);
  await page.getByRole("button", { name: opener }).click({ force: true, timeout: 25000 });
  const scroller = page.locator("[data-scroller]");
  await scroller.waitFor({ timeout: 10000 });
  // The first screen arrives a piece at a time.
  await page.waitForTimeout(2200);
  return scroller;
}

/** Scrolls the collage to its foot, a screen at a time, the way a thumb does. */
async function scrollToEnd(page: Page) {
  const scroller = page.locator("[data-scroller]");
  for (let i = 0; i < 14; i++) {
    const done = await scroller.evaluate((el) => {
      el.scrollBy({ top: el.clientHeight * 0.85 });
      return el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    });
    await page.waitForTimeout(220);
    if (done) break;
  }
}

test.describe("Coquette", () => {
  test("unties the bow, shows the collage, and scrolls down to the letter", async ({ page }) => {
    await openPage(page, "/demo/coquette", /untie the bow/i);
    await expect(page.getByText("Elena").first()).toBeVisible();
    await expect(page.getByText(/ticket to happiness/i)).toBeVisible();
    await expect(page.getByText(/every good day i've had since/i)).toBeVisible();
    await expect(page.getByText("Golden Hour").first()).toBeVisible();
    await scrollToEnd(page);
    await expect(page.getByText(/dear elena/i)).toBeAttached();
    await expect(page.getByRole("button", { name: /send sam a reaction/i })).toBeVisible({ timeout: 20000 });
  });

  test("the song on the card really pauses, and a photo opens large", async ({ page }) => {
    await openPage(page, "/demo/coquette", /untie the bow/i);
    await page.getByRole("button", { name: /pause the song/i }).click({ force: true });
    await expect(page.getByRole("button", { name: /play the song/i })).toBeVisible();
    await page.getByRole("button", { name: /our first coffee/i }).click({ force: true });
    await expect(page.locator("figure img")).toBeVisible();
    await page.getByRole("button", { name: /^close$/i }).click({ force: true });
    await expect(page.locator("figure img")).toBeHidden();
  });

  test("speaks Spanish, and works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPage(page, "/es/demo/coquette", /desata el lazo/i);
    await expect(page.getByText(/billete a la felicidad/i)).toBeVisible();
    await expect(page.getByText(/mi persona favorita/i)).toBeAttached();
  });
});

test.describe("XOXO", () => {
  test("opens the envelope and scrolls from the headline to the letter", async ({ page }) => {
    await openPage(page, "/demo/xoxo", /open it/i);
    await expect(page.getByText(/you walked in like it was nothing/i)).toBeVisible();
    await expect(page.locator("[data-mark]").first()).toBeVisible();
    await scrollToEnd(page);
    await expect(page.getByText(/dear dani/i)).toBeAttached();
    await expect(page.getByRole("button", { name: /send sam a reaction/i })).toBeVisible({ timeout: 20000 });
  });

  test("a tap on the page leaves a kiss, a tap on a photo opens it instead", async ({ page }) => {
    const scroller = await openPage(page, "/demo/xoxo", /open it/i);
    const box = (await scroller.boundingBox())!;
    // Top middle of the first screen: lace and wall, nothing to press.
    await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.12);
    await expect(page.locator("[data-kiss]")).toHaveCount(1);
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.16);
    await expect(page.locator("[data-kiss]")).toHaveCount(2);
    await page.getByRole("button", { name: /us, 4pm, no plans/i }).click({ force: true });
    await expect(page.locator("figure img")).toBeVisible();
    await expect(page.locator("[data-kiss]")).toHaveCount(2);
  });

  test("speaks Spanish, and works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPage(page, "/es/demo/xoxo", /ábrelo/i);
    await expect(page.getByText(/entraste como si nada/i)).toBeVisible();
    await expect(page.getByText(/toca donde quieras para dejar un beso/i)).toBeAttached();
  });
});

// The demo opens in any look with ?look=, so each can be seen and recorded without making a gift;
// the last three of each template bring cut-outs the others don't use at all.
test.describe("Looks with their own cut-outs", () => {
  const pieces = (page: Page) => page.locator("img[src*='/scraps/']").evaluateAll((imgs) => imgs.map((img) => (img as HTMLImageElement).src));

  test("XOXO's Black roses has black roses and a wax seal where the red set was", async ({ page }) => {
    await openPage(page, "/demo/xoxo?look=gothic", /open it/i);
    const srcs = (await pieces(page)).join(" ");
    expect(srcs).toContain("rose-black");
    expect(srcs).toContain("bow-lace-black");
    expect(srcs).not.toContain("bow-red");
  });

  test("Coquette's Burgundy roses has wine flowers and no Blush lily", async ({ page }) => {
    await openPage(page, "/demo/coquette?look=rouge", /untie the bow/i);
    const srcs = (await pieces(page)).join(" ");
    expect(srcs).toContain("rose-oxblood");
    expect(srcs).not.toContain("lily-pink");
  });

  test("an unknown look opens on the template's first", async ({ page }) => {
    await openPage(page, "/demo/xoxo?look=tartan", /open it/i);
    expect((await pieces(page)).join(" ")).toContain("bow-red");
  });
});

test.describe("Keepsake", () => {
  test("breaks the seal, opens the locket, and scrolls to the letter", async ({ page }) => {
    await openPage(page, "/demo/keepsake", /break the seal/i);
    await expect(page.getByText("My dearest,").first()).toBeVisible();
    await expect(page.getByText("Happiness", { exact: true })).toBeAttached();
    const locket = page.locator("[data-locket]");
    await locket.scrollIntoViewIfNeeded();
    await expect(locket).toHaveAttribute("aria-expanded", "false");
    await locket.click({ force: true });
    await expect(locket).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("since 2021")).toBeAttached();
    await expect(page.getByRole("button", { name: /close the locket/i })).toBeVisible();
    await scrollToEnd(page);
    await expect(page.getByText(/dear elena/i)).toBeAttached();
    await expect(page.getByRole("button", { name: /send sam a reaction/i })).toBeVisible({ timeout: 20000 });
  });

  test("the locket works from the keyboard", async ({ page }) => {
    await openPage(page, "/demo/keepsake", /break the seal/i);
    const locket = page.locator("[data-locket]");
    await locket.focus();
    await page.keyboard.press("Enter");
    await expect(locket).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Enter");
    await expect(locket).toHaveAttribute("aria-expanded", "false");
  });

  test("speaks Spanish, and works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPage(page, "/es/demo/keepsake", /rompe el sello/i);
    await expect(page.getByText("Mi vida,").first()).toBeVisible();
    await expect(page.getByText("Felicidad", { exact: true })).toBeAttached();
  });
});

test.describe("Spooky Season", () => {
  test("blows the leaves away and scrolls from the film to the letter", async ({ page }) => {
    await openPage(page, "/demo/spooky-season", /blow the leaves/i);
    await expect(page.getByText("Maya").first()).toBeVisible();
    await expect(page.getByText(/admit two: haunted house/i)).toBeVisible();
    await expect(page.getByText("All Hallows").first()).toBeVisible();
    await scrollToEnd(page);
    await expect(page.getByText(/be my boo/i)).toBeAttached();
    await expect(page.getByText(/dear maya/i)).toBeAttached();
    await expect(page.getByRole("button", { name: /send leo a reaction/i })).toBeVisible({ timeout: 20000 });
  });

  test("speaks Spanish, and works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPage(page, "/es/demo/spooky-season", /soplar las hojas/i);
    await expect(page.getByText(/pase: casa del terror/i)).toBeVisible();
    await expect(page.getByText(/mi calabacita/i)).toBeAttached();
  });
});

test.describe("Be My Boo", () => {
  test("the ghost says boo and flies off, and the collage scrolls from the polaroids to the letter", async ({ page }) => {
    await openPage(page, "/demo/be-my-boo", /tap the ghost/i);
    await expect(page.getByText("Maya").first()).toBeVisible();
    await expect(page.getByText(/be my boo\?/i).first()).toBeVisible();
    await expect(page.getByText(/our first coffee/i)).toBeVisible();
    await expect(page.getByText(/tap anywhere for a boo/i)).toBeAttached();
    await scrollToEnd(page);
    await expect(page.getByText("All Hallows").first()).toBeAttached();
    await expect(page.getByText(/dear maya/i)).toBeAttached();
    await expect(page.getByRole("button", { name: /send leo a reaction/i })).toBeVisible({ timeout: 20000 });
  });

  test("speaks Spanish, and works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPage(page, "/es/demo/be-my-boo", /toca el fantasma/i);
    await expect(page.getByText(/¿serás mi boo\?/i).first()).toBeVisible();
    await expect(page.getByText(/nuestro primer café/i)).toBeVisible();
  });
});

test.describe("Fall for You", () => {
  test("lights the candle, spells their name in blocks, and scrolls to the letter", async ({ page }) => {
    await openPage(page, "/demo/fall-for-you", /light the candle/i);
    await expect(page.getByRole("img", { name: "Maya" })).toBeVisible();
    await expect(page.getByText(/fall for you/i).first()).toBeVisible();
    await expect(page.getByText(/lisbon in october/i)).toBeVisible();
    await scrollToEnd(page);
    await expect(page.getByText(/recipe for us/i)).toBeAttached();
    await expect(page.getByText("Fireside").first()).toBeAttached();
    await expect(page.getByText(/dear maya/i)).toBeAttached();
    await expect(page.getByRole("button", { name: /send leo a reaction/i })).toBeVisible({ timeout: 20000 });
  });

  test("speaks Spanish, and works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPage(page, "/es/demo/fall-for-you", /encender la vela/i);
    await expect(page.getByText(/otoño contigo/i).first()).toBeVisible();
    await expect(page.getByText(/lisboa en octubre/i)).toBeVisible();
  });
});

test.describe("Autumn Reel", () => {
  test("develops the prints, and scrolls from the film and the book page to the letter", async ({ page }) => {
    await openPage(page, "/demo/autumn-reel", /tap to develop/i);
    await expect(page.getByText("MAYA AND LEO.")).toBeVisible();
    await expect(page.getByText("wishes", { exact: true })).toBeVisible();
    await scrollToEnd(page);
    await expect(page.getByText(/admit two: autumn matinee/i)).toBeAttached();
    await expect(page.getByText("Golden Hour").first()).toBeAttached();
    await expect(page.getByText(/dear maya/i)).toBeAttached();
    await expect(page.getByRole("button", { name: /send leo a reaction/i })).toBeVisible({ timeout: 20000 });
  });

  test("speaks Spanish, and works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPage(page, "/es/demo/autumn-reel", /toca para revelar/i);
    await expect(page.getByText("MAYA Y LEO.")).toBeVisible();
    await expect(page.getByText("deseos", { exact: true })).toBeVisible();
  });
});

test.describe("Dark Romance", () => {
  test("turns the key, opens the diary, and scrolls from the tarot card to the letter", async ({ page }) => {
    await openPage(page, "/demo/dark-romance", /turn the key/i);
    await expect(page.getByText("Slow Dance").first()).toBeVisible();
    await expect(page.getByText(/tap anywhere to leave a rose/i)).toBeAttached();
    await expect(page.getByText(/the lovers/i)).toBeAttached();
    await expect(page.getByText(/i'd bet on us/i)).toBeAttached();
    await scrollToEnd(page);
    await expect(page.getByText(/dear maya/i)).toBeAttached();
    await expect(page.getByRole("button", { name: /send leo a reaction/i })).toBeVisible({ timeout: 20000 });
  });

  test("a tap on the page leaves a rose, a tap on a photo opens it instead", async ({ page }) => {
    const scroller = await openPage(page, "/demo/dark-romance", /turn the key/i);
    const box = (await scroller.boundingBox())!;
    // Top middle of the first screen, right of the cut-out letters: lace and wall, nothing to press.
    await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.12);
    await expect(page.locator("[data-rose]")).toHaveCount(1);
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.16);
    await expect(page.locator("[data-rose]")).toHaveCount(2);
    await page.getByRole("button", { name: /the 23:40 to you/i }).click({ force: true });
    await expect(page.locator("figure img")).toBeVisible();
    await expect(page.locator("[data-rose]")).toHaveCount(2);
  });

  test("speaks Spanish, and works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPage(page, "/es/demo/dark-romance", /gira la llave/i);
    await expect(page.getByText(/los enamorados/i)).toBeAttached();
    await expect(page.getByText(/toca donde quieras para dejar una rosa/i)).toBeAttached();
  });
});

test.describe("Favorite Person", () => {
  test("lifts the tissue paper and scrolls from the polaroids to the letter", async ({ page }) => {
    await openPage(page, "/demo/favorite-person", /lift the tissue paper/i);
    await expect(page.getByText("Sunday Slowly").first()).toBeVisible();
    await expect(page.getByText(/favorite person/i).first()).toBeAttached();
    await expect(page.getByText(/tap anywhere to doodle a heart/i)).toBeAttached();
    await scrollToEnd(page);
    await expect(page.getByText(/dear maya/i)).toBeAttached();
    await expect(page.getByRole("button", { name: /send leo a reaction/i })).toBeVisible({ timeout: 20000 });
  });

  test("a tap on the page doodles a heart, a tap on a photo opens it instead", async ({ page }) => {
    const scroller = await openPage(page, "/demo/favorite-person", /lift the tissue paper/i);
    const box = (await scroller.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.04, box.y + box.height * 0.5);
    await expect(page.locator("[data-heart]")).toHaveCount(1);
    await page.mouse.click(box.x + box.width * 0.97, box.y + box.height * 0.55);
    await expect(page.locator("[data-heart]")).toHaveCount(2);
    await page.getByRole("button", { name: /our first coffee/i }).first().click({ force: true });
    await expect(page.locator("figure img")).toBeVisible();
    await expect(page.locator("[data-heart]")).toHaveCount(2);
  });

  test("speaks Spanish, and works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPage(page, "/es/demo/favorite-person", /levanta el papel de seda/i);
    await expect(page.getByText(/mi persona favorita/i).first()).toBeAttached();
    await expect(page.getByText(/toca donde quieras para dibujar un corazón/i)).toBeAttached();
  });
});

test.describe("On Repeat", () => {
  test("presses play and scrolls from the player and the playlist to the letter", async ({ page }) => {
    await openPage(page, "/demo/on-repeat", /press play/i);
    await expect(page.getByText("First Light").first()).toBeVisible();
    await expect(page.getByText(/you're my favorite song/i)).toBeAttached();
    await expect(page.getByText(/our playlist/i)).toBeAttached();
    await scrollToEnd(page);
    await expect(page.getByText(/dear maya/i)).toBeAttached();
    await expect(page.getByRole("button", { name: /send leo a reaction/i })).toBeVisible({ timeout: 20000 });
  });

  test("the song really pauses, a tap adds a sticker, and a song on the playlist opens its photo", async ({ page }) => {
    const scroller = await openPage(page, "/demo/on-repeat", /press play/i);
    await page.getByRole("button", { name: /pause the song/i }).click({ force: true });
    await expect(page.getByRole("button", { name: /play the song/i })).toBeVisible();
    const box = (await scroller.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.04, box.y + box.height * 0.5);
    await expect(page.locator("[data-sticker]")).toHaveCount(1);
    await page.getByRole("button", { name: /lost in lisbon/i }).first().click({ force: true });
    await expect(page.locator("figure img")).toBeVisible();
  });

  test("speaks Spanish, and works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPage(page, "/es/demo/on-repeat", /dale play/i);
    await expect(page.getByText(/eres mi canción favorita/i)).toBeAttached();
    await expect(page.getByText(/nuestra playlist/i)).toBeAttached();
  });
});

test.describe("Evergreen", () => {
  test("unwraps the newspaper and scrolls from the record to the letter", async ({ page }) => {
    await openPage(page, "/demo/evergreen", /unwrap the newspaper/i);
    await expect(page.getByText("Home").first()).toBeVisible();
    await expect(page.getByText(/my evergreen/i).first()).toBeAttached();
    await expect(page.getByText(/tap anywhere to let a butterfly go/i)).toBeAttached();
    await scrollToEnd(page);
    await expect(page.getByText(/dear maya/i)).toBeAttached();
    await expect(page.getByRole("button", { name: /send leo a reaction/i })).toBeVisible({ timeout: 20000 });
  });

  test("a tap lets a butterfly go, a tap on a photo opens it instead", async ({ page }) => {
    const scroller = await openPage(page, "/demo/evergreen", /unwrap the newspaper/i);
    const box = (await scroller.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.04, box.y + box.height * 0.5);
    await expect(page.locator("[data-butterfly]").first()).toBeAttached();
    await page.getByRole("button", { name: /slow july/i }).first().click({ force: true });
    await expect(page.locator("figure img")).toBeVisible();
  });

  test("speaks Spanish, and works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPage(page, "/es/demo/evergreen", /desenvuelve el periódico/i);
    await expect(page.getByText(/siempre tú/i).first()).toBeAttached();
    await expect(page.getByText(/toca donde quieras para soltar una mariposa/i)).toBeAttached();
  });
});
