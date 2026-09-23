import { expect, test, type Page } from "@playwright/test";

/**
 * "A surprise inside": a planned date or a trip, wrapped as a present at the end of any gift. From
 * /plan through the gift chooser into The Letter, played to the end and unwrapped from the
 * keyboard; a trip put inside Vinyl, in Spanish, opened from the editor's still frame with motion
 * turned down; and the editor's own section. The stops' photographs are replaced (one stop has
 * one, the other is drawn by its kind), the map's tiles are refused, and nothing is published.
 */

const PLAN_KEY = "ethos.dates.plan.v1";
const PLAN = {
  v: 1,
  date: "2030-06-15",
  where: "Lisbon",
  stops: [
    { id: "node/107", name: "Museu do Fado Pequeno", kind: "museum", lat: 38.7118, lng: -9.1284, time: "17:00" },
    { id: "node/104", name: "Gelados Santini", kind: "dessert", lat: 38.713, lng: -9.137, time: "18:30" },
  ],
};
const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

/** Fails the test on any uncaught error in the page. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return () => expect(errors, errors.join("\n")).toEqual([]);
}

async function quietWorld(page: Page) {
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.route("**/api/dates/weather*", (route) => route.fulfill({ json: { days: [], utcOffsetSeconds: 3600, timezone: "Europe/Lisbon" } }));
  // The museum has been photographed by somebody generous; nobody has photographed the ice cream.
  await page.route("**/api/dates/photo?*", (route) => {
    const name = new URL(route.request().url()).searchParams.get("name");
    return route.fulfill({ json: { photo: name === "Museu do Fado Pequeno" ? { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Fado.jpg/640px-Fado.jpg", width: 640, height: 427 } : null } });
  });
  await page.route("https://upload.wikimedia.org/**", (route) => route.fulfill({ contentType: "image/png", body: PIXEL }));
}

async function withPlan(page: Page) {
  await page.addInitScript(([key, plan]) => window.localStorage.setItem(key, plan), [PLAN_KEY, JSON.stringify(PLAN)] as const);
}

/** On a phone the editor and its preview are two tabs; on a laptop they sit side by side. */
async function showPreview(page: Page, isMobile: boolean, name = "Preview") {
  if (isMobile) await page.getByRole("tab", { name }).click();
}

test.describe("a surprise inside", () => {
  test("a plan goes into The Letter, and unwraps at the end with its stops and their pictures", async ({ page, isMobile }) => {
    // The editor, the template and the end of a typed letter: generous against a dev server.
    test.setTimeout(180_000);
    const noErrors = watchErrors(page);
    await quietWorld(page);
    await withPlan(page);
    await page.goto("/plan");

    await page.getByTestId("plan-gift").click();
    const chooser = page.getByRole("dialog", { name: "Wrap your date in a gift" });
    await expect(chooser).toBeVisible();
    await expect(chooser.getByText("Pick any gift. Your plan waits inside it, wrapped, at the end.")).toBeVisible();
    // Every gift there is, each saying what the surprise costs in it.
    expect(await chooser.locator("[data-testid^=chooser-]").count()).toBeGreaterThan(30);
    await expect(chooser.getByTestId("chooser-the-letter")).toContainText("The surprise inside: €7.49");
    await expect(chooser.getByTestId("chooser-vinyl")).toContainText("Surprise included");
    await chooser.getByRole("button", { name: "Free", exact: true }).click();
    await expect(chooser.locator("[data-testid^=chooser-]")).toHaveCount(2);
    await chooser.getByTestId("chooser-the-letter").click();

    await page.waitForURL(/\/create\/the-letter/, { timeout: 60_000 });
    const attached = page.getByTestId("unwrap-attached");
    await expect(attached).toBeVisible({ timeout: 60_000 });
    await expect(attached).toContainText("Lisbon");
    await expect(attached).toContainText("2 stops");
    await expect(attached).toContainText("Saturday 15 June");
    await expect(page.getByTestId("unwrap-section")).toContainText("Make it special");
    await page.locator("#recipientName").fill("Ana");
    await page.locator("#senderName").fill("Marco");
    await page.locator("#message").fill("Keep Saturday free.");

    await showPreview(page, isMobile);
    await page.getByRole("button", { name: "Play from the start" }).locator("visible=true").click();
    // The Letter opens on its cover, then its seal.
    const cover = page.getByRole("button", { name: "Tap to open" }).locator("visible=true");
    const seal = page.getByRole("button", { name: /tap the seal/i }).locator("visible=true");
    await expect(cover.or(seal).first()).toBeVisible({ timeout: 30_000 });
    if (await cover.count()) await cover.click({ force: true });
    await seal.click({ force: true, timeout: 30_000 });

    const present = page.getByTestId("unwrap-present").locator("visible=true");
    await expect(present).toBeAttached({ timeout: 60_000 });
    await present.scrollIntoViewIfNeeded();
    await expect(page.getByText("One more thing…").locator("visible=true")).toBeVisible();
    await expect(present).toHaveAccessibleName("A present from Marco. Unwrap it");
    // From the keyboard, like any button.
    await present.focus();
    await page.keyboard.press("Enter");

    const card = page.getByTestId("unwrap-card").locator("visible=true");
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card).toHaveAttribute("data-kind", "date");
    await expect(card.getByRole("heading", { name: "Saturday 15 June" })).toBeVisible();
    await expect(card.getByText("Date night")).toBeVisible();
    await expect(card.getByText("Museu do Fado Pequeno")).toBeVisible();
    await expect(card.getByText("Gelados Santini")).toBeVisible();
    await expect(card.getByText("17:00")).toBeVisible();
    // The museum's photograph, and the ice cream drawn as its kind rather than passed off as the place.
    const pictures = card.locator("li img");
    await expect(pictures).toHaveCount(2);
    await expect(pictures.first()).toHaveAttribute("src", /^https:\/\/upload\.wikimedia\.org\//);
    await expect(pictures.nth(1)).toHaveAttribute("src", /^\/dates\//);
    await expect(card.getByTestId("unwrap-link")).toHaveAttribute("href", /^\/plan#p=[A-Za-z0-9_-]+$/);
    await expect(card.getByRole("button", { name: "Add to calendar" })).toBeVisible();
    await expect(page.getByTestId("unwrap").locator("visible=true")).toHaveAttribute("data-phase", "open", { timeout: 5_000 });
    noErrors();
  });

  test("a trip goes into any gift, in Spanish, and opens from the editor's still frame", async ({ page, isMobile }) => {
    test.setTimeout(150_000);
    const noErrors = watchErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await quietWorld(page);
    await page.goto("/es/trips/amalfi-coast");

    // Pack Your Bags stays the first way to make it a surprise; any other gift is the second.
    await expect(page.getByTestId("make-surprise")).toHaveAttribute("href", "/es/create/pack-your-bags");
    await page.getByTestId("surprise-any-gift").click();
    const chooser = page.getByRole("dialog", { name: "Envuelve tu viaje en un regalo" });
    await expect(chooser).toBeVisible();
    await expect(chooser.getByTestId("chooser-the-letter")).toContainText("Gratis");
    await chooser.getByTestId("chooser-vinyl").click();

    await page.waitForURL(/\/es\/create\/vinyl/, { timeout: 60_000 });
    const attached = page.getByTestId("unwrap-attached");
    await expect(attached).toBeVisible({ timeout: 60_000 });
    await expect(attached).toContainText("La costa amalfitana en coche");
    await expect(attached).toContainText("Viaje");
    await expect(page.getByTestId("unwrap-section")).toContainText("Incluida");

    await showPreview(page, isMobile, "Vista previa");
    const peek = page.getByTestId("unwrap-peek").locator("visible=true");
    await expect(peek).toBeVisible({ timeout: 30_000 });
    await peek.click();
    const open = page.getByTestId("unwrap-peek-open").locator("visible=true");
    const card = open.getByTestId("unwrap-card");
    // Motion turned down: no unwrapping to wait for.
    await expect(card).toBeVisible({ timeout: 2_000 });
    await expect(card).toHaveAttribute("data-kind", "trip");
    await expect(card.getByText("Haz la maleta")).toBeVisible();
    await expect(card.getByRole("heading", { name: "La costa amalfitana en coche" })).toBeVisible();
    await expect(card.getByText("En coche", { exact: true })).toBeVisible();
    await expect(card.getByText("Ravello").first()).toBeVisible();
    await expect(card.locator("img").first()).toHaveAttribute("src", "/trips/amalfi-coast-sm.webp");
    await expect(card.getByTestId("unwrap-link")).toHaveAttribute("href", "/es/trips/amalfi-coast");
    await open.getByRole("button", { name: "Cerrar" }).click();
    await expect(open).toBeHidden();
    // From the keyboard too: Escape puts it away and gives the present its focus back.
    await peek.click();
    await expect(open.getByTestId("unwrap-card")).toBeVisible({ timeout: 2_000 });
    await page.keyboard.press("Escape");
    await expect(open).toBeHidden();
    await expect(peek).toBeFocused();
    noErrors();
  });

  test("the editor adds a trip, and takes it off again", async ({ page }) => {
    test.setTimeout(120_000);
    await quietWorld(page);
    await page.goto("/create/the-letter");
    const section = page.getByTestId("unwrap-section");
    await expect(section).toBeVisible({ timeout: 60_000 });
    // No plan in this browser yet: the plan can't be added, and it says where to make one.
    await expect(section.getByTestId("unwrap-add-plan")).toBeDisabled();
    await expect(section.getByRole("link", { name: "Plan a date" })).toHaveAttribute("href", "/dates");
    await section.getByTestId("unwrap-add-trip").click();
    await expect(section.getByText("Which trip?")).toBeVisible();
    await expect(section.locator("[data-testid^=unwrap-trip-]")).toHaveCount(12);
    await section.getByTestId("unwrap-trip-lisbon-slow-weekend").click();
    const attached = section.getByTestId("unwrap-attached");
    await expect(attached).toContainText("Lisbon, slowly", { timeout: 15_000 });
    await expect(attached).toContainText("2 nights");
    await attached.getByLabel("Leaving").fill("2030-06-14");
    await attached.getByLabel("Coming back").fill("2030-06-18");
    await expect(attached).toContainText("4 nights");
    await section.getByTestId("unwrap-remove").click();
    await expect(attached).toBeHidden();
    await expect(section.getByTestId("unwrap-add-trip")).toBeVisible();
  });
});
