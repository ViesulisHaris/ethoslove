import { expect, test, type Page } from "@playwright/test";

/**
 * Halfway, end to end: what a recipient sees and does on the demo, the microphone flight with a
 * breath the test controls, the fallbacks, and what a sender can set in the editor.
 */

const PLACES = {
  lisbon: { name: "Lisbon", lat: 38.7223, lng: -9.1393 },
  boston: { name: "Boston", lat: 42.3601, lng: -71.0589 },
};

/** Fails the test on any uncaught error in the page. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return () => expect(errors, errors.join("\n")).toEqual([]);
}

/** The big distance on the map, as a number. */
async function kmLeft(page: Page) {
  const text = await page.locator("p.tabular-nums").first().innerText();
  return Number(text.replace(/[^\d]/g, ""));
}

/**
 * Replaces the microphone with a square wave whose loudness the test sets through window.__breath:
 * 0 is silence, 0.5 is a hard blow. The template's own detector listens to it exactly as it
 * would to a real microphone.
 */
async function fakeBreath(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __breath: number };
    w.__breath = 0;
    if (!navigator.mediaDevices) return;
    navigator.mediaDevices.getUserMedia = async () => {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = 160;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const out = ctx.createMediaStreamDestination();
      osc.connect(gain).connect(out);
      osc.start();
      await ctx.resume();
      window.setInterval(() => {
        gain.gain.value = w.__breath;
      }, 30);
      return out.stream;
    };
  });
}

const breathe = (page: Page, level: number) => page.evaluate((v) => ((window as unknown as { __breath: number }).__breath = v), level);

async function openDemo(page: Page, path = "/demo/halfway") {
  await page.goto(path);
  await expect(page.getByRole("button", { name: /^(fly to|volar hasta) clara$/i })).toBeVisible({ timeout: 30_000 });
}

test.describe("Halfway: the recipient", () => {
  test("the postcard map shows both homes, both towns and the real distance", async ({ page }) => {
    const noErrors = watchErrors(page);
    await openDemo(page);
    await expect(page.getByText("6,863", { exact: true })).toBeVisible();
    await expect(page.getByText("km between you", { exact: true })).toBeVisible();
    await expect(page.getByText("LISBON", { exact: true })).toBeVisible();
    await expect(page.getByText("BOSTON", { exact: true })).toBeVisible();
    await expect(page.getByText("Iván", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "blow the plane to Clara" })).toBeVisible();
    await expect(page.getByText("or tap the plane", { exact: true })).toBeVisible();
    noErrors();
  });

  test("tapping the plane flies it home, turns the postcard over and plays the whole gift", async ({ page }) => {
    test.setTimeout(120_000);
    const noErrors = watchErrors(page);
    await openDemo(page);

    await page.getByRole("button", { name: "Fly to Clara" }).click({ force: true });
    await expect(page.getByText("together", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("you made it", { exact: true })).toBeVisible();
    expect(await kmLeft(page)).toBe(0);

    // The back of the postcard.
    await expect(page.getByText("a postcard from Iván", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("via Reykjavík", { exact: true })).toBeVisible();
    await expect(page.getByText("LISBON · BOSTON", { exact: true })).toBeAttached();
    await expect(page.getByText("6,863 KM", { exact: true })).toBeAttached();
    await expect(page.getByRole("heading", { name: "Dear Clara," })).toBeVisible();
    await expect(page.getByText("That is what March is going to feel like.")).toBeVisible({ timeout: 60_000 });

    // Photos, countdown, the P.S. and the ending.
    for (const caption of ["the 23:40, the wrong way again", "lisbon, lost on purpose", "no signal, no plans", "you leave notes. I keep every one"]) {
      await expect(page.getByText(caption, { exact: true })).toBeVisible();
    }
    await expect(page.getByText("Until I land", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Tap to reveal" }).click({ force: true });
    await expect(page.getByText(/Look at the date on that countdown/)).toBeVisible();
    await expect(page.getByText("The end. For now.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Send Iván a reaction/ })).toBeVisible();

    // And back to the start.
    await page.getByRole("button", { name: "Watch again" }).click();
    await expect(page.getByText("6,863", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Fly to Clara" })).toBeVisible();
    noErrors();
  });

  test("the plane can be flown from the keyboard", async ({ page }) => {
    await openDemo(page);
    await page.getByRole("button", { name: "Fly to Clara" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("together", { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test("blowing flies the plane, stopping lets it drift back, and blowing again gets it home", async ({ page }) => {
    test.setTimeout(90_000);
    const noErrors = watchErrors(page);
    await fakeBreath(page);
    await openDemo(page);

    // The button breathes forever, so Playwright never sees it as stable; force is intended here.
    await page.getByRole("button", { name: "blow the plane to Clara" }).click({ force: true });
    await expect(page.getByText("blow into your phone", { exact: true })).toBeVisible({ timeout: 5_000 });
    const start = await kmLeft(page);
    expect(start).toBe(6863);

    // Quiet: nothing moves.
    await page.waitForTimeout(1_500);
    expect(await kmLeft(page)).toBe(start);

    // A hard blow: the distance drops.
    await breathe(page, 0.5);
    await expect(page.getByText("keep blowing", { exact: true })).toBeVisible({ timeout: 5_000 });
    await expect.poll(() => kmLeft(page), { timeout: 5_000 }).toBeLessThan(start - 1_000);

    // Stop: after a short coast it slides back, and the distance climbs again, slowly.
    await breathe(page, 0);
    await page.waitForTimeout(1_500);
    const coasted = await kmLeft(page);
    await expect(page.getByText("don't stop!", { exact: true })).toBeVisible();
    await page.waitForTimeout(3_000);
    const drifted = await kmLeft(page);
    expect(drifted).toBeGreaterThan(coasted);
    expect(drifted - coasted).toBeLessThan(start * 0.2);

    // Blow again all the way.
    await breathe(page, 0.5);
    await expect(page.getByText("together", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("a postcard from Iván", { exact: true })).toBeVisible({ timeout: 10_000 });
    noErrors();
  });

  test("without a microphone it says to tap, and tapping still works", async ({ page }) => {
    await page.addInitScript(() => {
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => Promise.reject(new DOMException("denied", "NotAllowedError"));
    });
    await openDemo(page);
    // The button breathes forever, so Playwright never sees it as stable; force is intended here.
    await page.getByRole("button", { name: "blow the plane to Clara" }).click({ force: true });
    await expect(page.getByText("tap the plane to fly", { exact: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("or tap the plane", { exact: true })).toBeHidden();
    await page.getByRole("button", { name: "Fly to Clara" }).click({ force: true });
    await expect(page.getByText("together", { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test("the Spanish demo speaks Spanish, with its own towns and distance", async ({ page }) => {
    const noErrors = watchErrors(page);
    await openDemo(page, "/es/demo/halfway");
    await expect(page.getByText("10.045", { exact: true })).toBeVisible();
    await expect(page.getByText("km entre vosotros", { exact: true })).toBeVisible();
    await expect(page.getByText("MADRID", { exact: true })).toBeVisible();
    await expect(page.getByText("BUENOS AIRES", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "sopla el avión hasta Clara" })).toBeVisible();
    await page.getByRole("button", { name: "Volar hasta Clara" }).click({ force: true });
    await expect(page.getByText("una postal de Iván", { exact: true })).toBeVisible({ timeout: 12_000 });
    await expect(page.getByRole("heading", { name: "Querida Clara," })).toBeVisible();
    noErrors();
  });
});

test.describe("Halfway: reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the flight is instant and the letter is there at once", async ({ page }) => {
    await openDemo(page);
    await page.getByRole("button", { name: "Fly to Clara" }).click({ force: true });
    await expect(page.getByText("a postcard from Iván", { exact: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("That is what March is going to feel like.")).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("Halfway: the editor", () => {
  test.skip(({ isMobile }) => isMobile, "the side-by-side preview is the desktop layout");
  // Tall enough that the preview's play button fits under the phone frame.
  test.use({ viewport: { width: 1280, height: 1000 } });

  const placeSearch = (page: Page, label: string) => page.getByRole("combobox", { name: label });

  test("the places come first, right under the names", async ({ page }) => {
    const noErrors = watchErrors(page);
    await page.goto("/create/halfway");
    const group = page.getByText("Where you both are", { exact: true });
    await expect(group).toBeVisible({ timeout: 30_000 });
    const groupBox = await group.boundingBox();
    const wordsBox = await page.getByRole("heading", { name: "Your words" }).boundingBox();
    const namesBox = await page.getByRole("heading", { name: "Who is it for?" }).boundingBox();
    expect(groupBox!.y).toBeGreaterThan(namesBox!.y);
    expect(groupBox!.y).toBeLessThan(wordsBox!.y);
    await expect(placeSearch(page, "Your town or city")).toHaveValue("Lisbon");
    await expect(placeSearch(page, "Their town or city")).toHaveValue("Boston");
    noErrors();
  });

  test("any town can be searched and picked, and the distance follows it", async ({ page }) => {
    await page.route("**/api/places**", (route) =>
      route.fulfill({ json: { results: [{ name: "Ventspils", kind: "city", lat: 57.3904, lng: 21.5636, region: "Kurzeme", country: "Latvia" }] } }),
    );
    await page.goto("/create/halfway");
    const from = placeSearch(page, "Your town or city");
    await expect(from).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("spinbutton", { name: "Distance" })).toHaveAttribute("placeholder", "5131");

    await from.fill("Ventspils");
    const option = page.getByRole("option", { name: /Ventspils/ });
    await expect(option).toBeVisible();
    await expect(option).toContainText("Kurzeme, Latvia");
    await expect(page.getByText("Places © OpenStreetMap contributors")).toBeVisible();
    await from.press("Enter");
    await expect(from).toHaveValue("Ventspils");
    await expect(page.getByRole("option")).toHaveCount(0);
    await expect(page.getByRole("spinbutton", { name: "Distance" })).toHaveAttribute("placeholder", "6302");
  });

  test("with the place search down, the built-in cities still answer", async ({ page }) => {
    await page.route("**/api/places**", (route) => route.abort());
    await page.goto("/create/halfway");
    const to = placeSearch(page, "Their town or city");
    await expect(to).toBeVisible({ timeout: 30_000 });
    await to.fill("Toky");
    await expect(page.getByRole("option", { name: /Tokyo/ })).toBeVisible();
    await expect(page.getByText(/Couldn't search just now/)).toBeVisible();
    await page.getByRole("option", { name: /Tokyo/ }).click();
    await expect(to).toHaveValue("Tokyo");
  });

  test("a search with no answer says so", async ({ page }) => {
    await page.route("**/api/places**", (route) => route.fulfill({ json: { results: [] } }));
    await page.goto("/create/halfway");
    const to = placeSearch(page, "Their town or city");
    await expect(to).toBeVisible({ timeout: 30_000 });
    await to.fill("Zzqxv");
    await expect(page.getByText("Nothing found. Try the nearest bigger town.")).toBeVisible();
    await to.press("Escape");
    await expect(to).toHaveValue("Boston");
  });

  test("the distance can be typed over, and put back", async ({ page }) => {
    await page.goto("/create/halfway");
    const distance = page.getByRole("spinbutton", { name: "Distance" });
    await expect(distance).toBeVisible({ timeout: 30_000 });
    await distance.fill("7000");
    const reset = page.getByRole("button", { name: "Use 5,131 km" });
    await expect(reset).toBeVisible();
    await reset.click();
    await expect(distance).toHaveValue("");
    await expect(reset).toBeHidden();
  });

  test("stops can be added and removed", async ({ page }) => {
    await page.route("**/api/places**", (route) => route.fulfill({ json: { results: [] } }));
    await page.goto("/create/halfway");
    await expect(page.getByText("0 / 4")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Add a place" }).click();
    const stop = placeSearch(page, "Where you've met in the middle 1");
    await expect(stop).toBeFocused();
    await stop.fill("Reykj");
    await page.getByRole("option", { name: /Reykjavik/ }).click();
    await expect(page.getByText("1 / 4")).toBeVisible();
    await expect(page.getByRole("spinbutton", { name: "Distance" })).toHaveAttribute("placeholder", "6863");
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("0 / 4")).toBeVisible();
  });

  test("the look is chosen with the usual buttons, and the preview follows", async ({ page }) => {
    const noErrors = watchErrors(page);
    await page.goto("/create/halfway");
    await expect(page.getByLabel("Their name")).toBeVisible({ timeout: 30_000 });
    await page.getByLabel("Their name").fill("Clara");
    await page.getByLabel("Your name").fill("Iván");

    const groups: [string, string[]][] = [
      ["What flies", ["Paper plane", "Balloon", "Little bird"]],
      ["Your island", ["Pink", "Peach", "Mint", "Lilac"]],
      ["Their island", ["Pink", "Peach", "Mint", "Lilac"]],
      ["Background", ["Blush", "Sea glass", "Butter", "Night flight"]],
    ];
    for (const [name, options] of groups) {
      const group = page.getByRole("radiogroup", { name });
      await expect(group.getByRole("radio")).toHaveCount(options.length);
      for (const option of options) await expect(group.getByRole("radio", { name: option })).toBeVisible();
    }

    // The editor keeps a second, hidden preview for phones; only the one on screen counts.
    const preview = page.locator("p:visible").filter({ hasText: /^blow the (plane|balloon|bird) to Clara$/ });
    await expect(preview).toHaveText("blow the plane to Clara");
    await page.getByRole("radiogroup", { name: "What flies" }).getByRole("radio", { name: "Balloon" }).click();
    await expect(preview).toHaveText("blow the balloon to Clara");
    await page.getByRole("radiogroup", { name: "What flies" }).getByRole("radio", { name: "Little bird" }).click();
    await expect(preview).toHaveText("blow the bird to Clara");

    // Every background and island renders.
    for (const background of ["Sea glass", "Butter", "Night flight", "Blush"]) {
      await page.getByRole("radiogroup", { name: "Background" }).getByRole("radio", { name: background }).click();
      await expect(page.getByRole("radiogroup", { name: "Background" }).getByRole("radio", { name: background })).toHaveAttribute("aria-checked", "true");
    }
    for (const island of ["Mint", "Lilac"]) {
      await page.getByRole("radiogroup", { name: "Your island" }).getByRole("radio", { name: island }).click();
      await page.getByRole("radiogroup", { name: "Their island" }).getByRole("radio", { name: island }).click();
    }
    await expect(preview).toBeVisible();
    noErrors();
  });

  test("the title becomes the postcard's greeting", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/create/halfway");
    await expect(page.getByLabel("Their name")).toBeVisible({ timeout: 30_000 });
    await page.getByLabel("Their name").fill("Clara");
    await page.getByLabel("Title", { exact: true }).fill("To my favourite person");
    await page.getByRole("button", { name: "Play from the start" }).click();
    // Playing from the start opens on the gift's cover first, as the recipient would see it.
    const cover = page.getByRole("button", { name: /tap to open/i });
    await cover.waitFor({ timeout: 30_000 });
    await cover.click({ force: true });
    // Let the cover finish leaving and the postcard land, or the tap lands on the cover instead.
    await expect(cover).toBeHidden({ timeout: 10_000 });
    const plane = page.getByRole("button", { name: "Fly to Clara" });
    await expect(plane).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1_200);
    await plane.click({ force: true });
    await expect(page.getByText("together", { exact: true }).locator("visible=true")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "To my favourite person" })).toBeVisible({ timeout: 15_000 });
  });

  test("sending one back flips the places and islands", async ({ page }) => {
    await page.addInitScript((places) => {
      window.sessionStorage.setItem(
        "ethos:reply",
        JSON.stringify({
          slug: "halfway",
          recipientName: "Iván",
          senderName: "Clara",
          fields: { from: places.lisbon, to: places.boston, stops: [], yourIsland: "mint", theirIsland: "lilac", vehicle: "bird", palette: "blush" },
          savedAt: Date.now(),
        }),
      );
    }, PLACES);
    await page.goto("/create/halfway");
    await expect(placeSearch(page, "Your town or city")).toHaveValue("Boston", { timeout: 30_000 });
    await expect(placeSearch(page, "Their town or city")).toHaveValue("Lisbon");
    await expect(page.getByLabel("Their name")).toHaveValue("Iván");
    await expect(page.getByLabel("Your name")).toHaveValue("Clara");
    await expect(page.getByRole("radiogroup", { name: "Your island" }).getByRole("radio", { name: "Lilac" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radiogroup", { name: "Their island" }).getByRole("radio", { name: "Mint" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radiogroup", { name: "What flies" }).getByRole("radio", { name: "Little bird" })).toHaveAttribute("aria-checked", "true");
  });
});

test.describe("Halfway: the place search endpoint", () => {
  test.skip(({ isMobile }) => isMobile, "one run is enough for an API");

  test("ignores a query too short to mean anything", async ({ request }) => {
    const res = await request.get("/api/places?q=a");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ results: [] });
  });

  test("finds a real town with its coordinates", async ({ request }) => {
    const res = await request.get("/api/places?q=ventspils&lang=en");
    expect(res.status()).toBe(200);
    const { results } = (await res.json()) as { results: { name: string; lat: number; lng: number; country?: string }[] };
    const town = results.find((r) => r.name === "Ventspils");
    expect(town).toBeDefined();
    expect(town!.lat).toBeCloseTo(57.39, 1);
    expect(town!.lng).toBeCloseTo(21.56, 1);
  });
});
