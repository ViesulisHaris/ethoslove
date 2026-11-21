import { devices, expect, test, webkit, type Page, type Request } from "@playwright/test";
import { needGroupPreviews } from "./server-state";

/**
 * Group cards. Nobody signs in and there is no database: the page at a card's link and the sender's
 * panel are drawn from their development-only previews (on a production build these skip), and
 * their buttons talk to the real routes, which each test answers itself and then looks at what was
 * asked. The switch is off on this server, as it is live, so the real routes and a real /c/ link
 * are checked for what "off" must mean: not there.
 */

const TOKEN = "previewPreviewPreview0";
const PREVIEW = "/group-preview/contribute";

type Reply = { status: number; body: Record<string, unknown> };
async function answer(page: Page, url: string, reply: Reply | ((request: Request) => Reply)) {
  const asked: Request[] = [];
  await page.route(url, async (route) => {
    asked.push(route.request());
    const { status, body } = typeof reply === "function" ? reply(route.request()) : reply;
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  return asked;
}
/** One field of a multipart body, as the browser sent it. */
const field = (request: Request, name: string) => new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)\\r\\n`).exec(request.postData() ?? "")?.[1];

async function write(page: Page, name = "Gran", note = "Forty is nothing. Ring me.") {
  await page.getByTestId("contribute-name").fill(name);
  await page.getByTestId("contribute-note").fill(note);
  await page.getByTestId("contribute-agree").check();
}

test.describe("with the switch off, as it is live", () => {
  test("a group card's link is not there, and neither is any group route", async ({ request }) => {
    expect((await request.get(`/c/${TOKEN}`)).status()).toBe(404);
    expect((await request.get(`/es/c/${TOKEN}`)).status()).toBe(404);
    expect((await request.post("/api/group/contribute", { multipart: { token: TOKEN, name: "x", note: "y", agree: "1" } })).status()).toBe(404);
    expect((await request.post("/api/group/withdraw", { data: { token: TOKEN, withdraw: "w".repeat(32) } })).status()).toBe(404);
    expect((await request.post("/api/group", { data: { giftId: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", fromName: "a", forName: "b" } })).status()).toBe(404);
    expect((await request.post("/api/group/find", { data: { giftId: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b" } })).status()).toBe(404);
    expect((await request.patch("/api/group/6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", { data: { closed: true } })).status()).toBe(404);
    expect((await request.delete("/api/group/6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b")).status()).toBe(404);
    expect((await request.post("/api/group/6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b/entries/7f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", { data: { action: "approve" } })).status()).toBe(404);
  });

  test("the /c/ address is never redirected to a language: it answers where it was asked", async ({ request }) => {
    const res = await request.get(`/c/${TOKEN}`, { maxRedirects: 0, headers: { "accept-language": "es-ES,es;q=0.9" } });
    expect(res.status()).toBe(404);
    expect(res.headers().location).toBeUndefined();
  });
});

test.describe("the page at a group card's link", () => {
  test.beforeEach(async ({ request }) => needGroupPreviews(request));

  test("asks for a name and a note, counts the note, and never shows a price or a payment field", async ({ page }) => {
    await page.goto(PREVIEW);
    await expect(page.getByRole("heading", { name: "Add your note for Nora" })).toBeVisible();
    await expect(page.getByText("Tom is putting a group card together.")).toBeVisible();
    await expect(page.getByTestId("contribute-prompt")).toHaveText("“One line that only you would know.”");
    await expect(page.getByTestId("contribute-count")).toHaveText("0 of 140");
    await page.getByTestId("contribute-note").fill("Forty is nothing.");
    await expect(page.getByTestId("contribute-count")).toHaveText("17 of 140");
    // The field itself stops at the card's length.
    await page.getByTestId("contribute-note").fill("m".repeat(200));
    await expect(page.getByTestId("contribute-note")).toHaveValue("m".repeat(140));
    await expect(page.getByTestId("contribute-count")).toHaveText("140 of 140");
    await expect(page.getByTestId("contribute-name")).toHaveAttribute("maxlength", "24");
    // Nobody invited is ever asked for money.
    await expect(page.locator("body")).not.toContainText(/€|\$|£|\bpay\b|\bbuy\b|price|card number/i);
    await expect(page.locator('input[type="tel"], input[autocomplete^="cc-"], iframe')).toHaveCount(0);
    // Both boxes start unticked.
    await expect(page.getByTestId("contribute-wants-email")).not.toBeChecked();
    await expect(page.getByTestId("contribute-agree")).not.toBeChecked();
    await expect(page.getByTestId("contribute-email")).toHaveCount(0);
  });

  test("sends the note to the real route and says who has it; the page keeps the way to take it back", async ({ page }) => {
    const asked = await answer(page, "**/api/group/contribute", { status: 200, body: { ok: true, withdraw: "w".repeat(32) } });
    const taken = await answer(page, "**/api/group/withdraw", { status: 200, body: { ok: true } });
    await page.goto(PREVIEW);
    await write(page);
    await page.getByTestId("contribute-wants-email").check();
    await expect(page.getByText("We'll email you once to confirm it's you, and once with the link when the card is sent. Then we delete your address.")).toBeVisible();
    await page.getByTestId("contribute-email").fill("gran@example.com");
    await page.getByTestId("contribute-submit").click();

    await expect(page.getByTestId("contribute-done")).toContainText("Your note is with Tom.");
    await expect(page.getByTestId("contribute-done")).toContainText("Check your inbox to confirm your address.");
    expect(asked).toHaveLength(1);
    expect(asked[0].method()).toBe("POST");
    expect(asked[0].headers()["content-type"]).toContain("multipart/form-data");
    expect([field(asked[0], "token"), field(asked[0], "name"), field(asked[0], "note"), field(asked[0], "agree"), field(asked[0], "email")]).toEqual([TOKEN, "Gran", "Forty is nothing. Ring me.", "1", "gran@example.com"]);

    // A reload comes back to the same place, in this tab.
    await page.reload();
    await expect(page.getByTestId("contribute-take-back")).toBeVisible();
    await page.getByTestId("contribute-take-back").click();
    await expect(page.getByTestId("contribute-ended")).toHaveText("Your note has been taken back.");
    expect(taken.map((request) => request.postDataJSON())).toEqual([{ token: TOKEN, withdraw: "w".repeat(32) }]);
    // And the one quiet way on carries a plain ref, never the link's token.
    await expect(page.getByTestId("contribute-own")).toHaveAttribute("href", "/templates?ref=group-contribute");
  });

  test("an address is only sent when the box is ticked, and the note needs the 16-or-older box", async ({ page }) => {
    const asked = await answer(page, "**/api/group/contribute", (request) => (field(request, "agree") === "1" ? { status: 200, body: { ok: true, withdraw: "w".repeat(32) } } : { status: 400, body: { error: "invalid" } }));
    await page.goto(PREVIEW);
    await page.getByTestId("contribute-name").fill("Gran");
    await page.getByTestId("contribute-note").fill("Forty is nothing.");
    await page.getByTestId("contribute-wants-email").check();
    await page.getByTestId("contribute-email").fill("gran@example.com");
    await page.getByTestId("contribute-wants-email").uncheck();
    await page.getByTestId("contribute-submit").click();
    await expect(page.getByTestId("contribute-form").getByRole("alert")).toHaveText("Add your name and a note, and tick the box.");
    // What was typed is still there.
    await expect(page.getByTestId("contribute-name")).toHaveValue("Gran");
    await page.getByTestId("contribute-agree").check();
    await page.getByTestId("contribute-submit").click();
    await expect(page.getByTestId("contribute-done")).toBeVisible();
    await expect(page.getByTestId("contribute-done")).not.toContainText("Check your inbox");
    expect(asked.map((request) => field(request, "email"))).toEqual([undefined, undefined]);
  });

  for (const [status, error, words] of [
    [400, "no_links", "A note can't carry a web address. Take it out and try again."],
    [400, "bad_photo", "That photo couldn't be used. Try a JPEG or a PNG."],
    [400, "invalid_email", "Check the email address."],
    [413, "too_large", "That photo is too big. Try a smaller one."],
    [429, "rate_limited", "Too many notes from this connection. Try again in an hour."],
    [500, "failed", "That didn't go through. Try again in a moment."],
  ] as const) {
    test(`says what went wrong and lets them try again: ${error}`, async ({ page }) => {
      await answer(page, "**/api/group/contribute", { status, body: { error } });
      await page.goto(PREVIEW);
      await write(page);
      await page.getByTestId("contribute-submit").click();
      await expect(page.getByTestId("contribute-form").getByRole("alert")).toHaveText(words);
      await expect(page.getByTestId("contribute-submit")).toBeEnabled();
      await expect(page.getByTestId("contribute-note")).toHaveValue("Forty is nothing. Ring me.");
    });
  }

  for (const [status, error, words] of [
    [409, "full", "This card has all the notes it can hold."],
    [410, "closed", "Tom has closed this link."],
    [410, "sent", "This card has been sent."],
  ] as const) {
    test(`a link that ended while they were writing says so: ${error}`, async ({ page }) => {
      await answer(page, "**/api/group/contribute", { status, body: { error } });
      await page.goto(PREVIEW);
      await write(page);
      await page.getByTestId("contribute-submit").click();
      await expect(page.getByTestId("contribute-ended")).toHaveText(words);
      await expect(page.getByTestId("contribute-form")).toHaveCount(0);
    });
  }

  test("each end a link comes to: one line, and one quiet way on", async ({ page }) => {
    for (const [state, words] of [
      ["full", "This card has all the notes it can hold."],
      ["closed", "Tom has closed this link."],
      ["sent", "This card has been sent."],
    ] as const) {
      await page.goto(`${PREVIEW}?state=${state}`);
      await expect(page.getByTestId("contribute-ended")).toHaveText(words);
      await expect(page.getByTestId("contribute-form")).toHaveCount(0);
      await expect(page.getByTestId("contribute-own")).toHaveText("Make a gift of your own");
      await expect(page.locator("body")).not.toContainText(/€|\$|£/);
    }
  });

  test("taking a note back after the card was sent gives the support address instead", async ({ page }) => {
    await answer(page, "**/api/group/contribute", { status: 200, body: { ok: true, withdraw: "w".repeat(32) } });
    await answer(page, "**/api/group/withdraw", { status: 410, body: { error: "sent" } });
    await page.goto(PREVIEW);
    await write(page);
    await page.getByTestId("contribute-submit").click();
    await page.getByTestId("contribute-take-back").click();
    await expect(page.getByTestId("contribute-done").getByRole("alert")).toContainText("The card has already been sent. Write to");
    await expect(page.getByTestId("contribute-take-back")).toHaveCount(0);
  });

  test("one phone at one table: another note can be added straight after", async ({ page }) => {
    const asked = await answer(page, "**/api/group/contribute", { status: 200, body: { ok: true, withdraw: "w".repeat(32) } });
    await page.goto(PREVIEW);
    await write(page);
    await page.getByTestId("contribute-submit").click();
    await page.getByTestId("contribute-another").click();
    await expect(page.getByTestId("contribute-name")).toHaveValue("");
    await expect(page.getByTestId("contribute-count")).toHaveText("0 of 140");
    await write(page, "Sam", "You taught me to drive.");
    await page.getByTestId("contribute-submit").click();
    await expect(page.getByTestId("contribute-done")).toBeVisible();
    expect(asked.map((request) => field(request, "name"))).toEqual(["Gran", "Sam"]);
  });

  test("a photo is shown before it is sent and can be taken off; a card that takes none offers none", async ({ page }) => {
    const asked = await answer(page, "**/api/group/contribute", { status: 200, body: { ok: true, withdraw: "w".repeat(32) } });
    await page.goto(PREVIEW);
    await expect(page.getByText("Don't upload photos of children who aren't yours.")).toBeVisible();
    // A real, tiny PNG.
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4AWP8z8Dwn4EIwDiqEF8oAQBf9AoL/k2KLAAAAABJRU5ErkJggg==", "base64");
    await page.getByTestId("contribute-photo-input").setInputFiles({ name: "us.png", mimeType: "image/png", buffer: png });
    await expect(page.getByTestId("contribute-photo").getByRole("img", { name: "The photo you added" })).toBeVisible();
    await page.getByTestId("contribute-photo-remove").click();
    await expect(page.getByTestId("contribute-photo")).toHaveCount(0);
    await page.getByTestId("contribute-photo-input").setInputFiles({ name: "us.png", mimeType: "image/png", buffer: png });
    await expect(page.getByTestId("contribute-photo")).toBeVisible();
    await write(page);
    await page.getByTestId("contribute-submit").click();
    await expect(page.getByTestId("contribute-done")).toBeVisible();
    expect(asked[0].postData()).toContain('name="photo"');

    await page.goto(`${PREVIEW}?photos=0`);
    await expect(page.getByTestId("contribute-photo-add")).toHaveCount(0);
    await expect(page.getByText("Don't upload photos of children who aren't yours.")).toHaveCount(0);
  });

  test("everything that can be tapped is at least 44 px tall, and nothing is wider than the screen", async ({ page }) => {
    await page.goto(PREVIEW);
    await page.getByTestId("contribute-wants-email").check();
    const targets = [
      page.getByTestId("contribute-name"),
      page.getByTestId("contribute-note"),
      page.getByTestId("contribute-photo-add"),
      page.locator("label", { has: page.getByTestId("contribute-wants-email") }),
      page.getByTestId("contribute-email"),
      page.locator("label", { has: page.getByTestId("contribute-agree") }),
      page.getByTestId("contribute-submit"),
      page.getByTestId("contribute-report"),
    ];
    for (const target of targets) {
      const box = await target.boundingBox();
      expect(box, await target.evaluate((el) => el.outerHTML.slice(0, 80))).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // Text typed into a field is never small enough for an iPhone to zoom the page.
    for (const id of ["contribute-name", "contribute-note"]) expect(await page.getByTestId(id).evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  });

  test("the keyboard goes through it in reading order and can send it", async ({ page, isMobile }) => {
    test.skip(isMobile, "a keyboard's Tab order is a desktop matter");
    const asked = await answer(page, "**/api/group/contribute", { status: 200, body: { ok: true, withdraw: "w".repeat(32) } });
    await page.goto(PREVIEW);
    await page.getByTestId("contribute-name").focus();
    const order: string[] = [];
    for (let i = 0; i < 6; i++) {
      order.push(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.testid ?? document.activeElement?.tagName ?? ""));
      await page.keyboard.press("Tab");
    }
    expect(order).toEqual(["contribute-name", "contribute-note", "contribute-photo-add", "contribute-wants-email", "contribute-agree", "contribute-submit"]);
    await page.getByTestId("contribute-name").focus();
    await page.keyboard.type("Gran");
    await page.keyboard.press("Tab");
    await page.keyboard.type("Forty is nothing.");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("contribute-submit")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("contribute-done")).toBeVisible();
    expect(asked).toHaveLength(1);
  });

  test("with reduced motion nothing waits on an animation: the page is whole at once and still works", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await answer(page, "**/api/group/contribute", { status: 200, body: { ok: true, withdraw: "w".repeat(32) } });
    await page.goto(PREVIEW);
    await expect(page.getByRole("heading", { name: "Add your note for Nora" })).toBeVisible();
    await write(page);
    await page.getByTestId("contribute-submit").click();
    await expect(page.getByTestId("contribute-done")).toBeVisible();
  });

  test("speaks the card's language, not the address's", async ({ page }) => {
    const asked = await answer(page, "**/api/group/contribute", { status: 200, body: { ok: true, withdraw: "w".repeat(32) } });
    await page.goto(`${PREVIEW}?lang=es`);
    await expect(page.getByTestId("contribute")).toHaveAttribute("lang", "es");
    await expect(page.getByRole("heading", { name: "Añade tu nota para Nora" })).toBeVisible();
    await expect(page.getByText("Tomás está preparando una tarjeta en grupo.")).toBeVisible();
    await expect(page.getByTestId("contribute-count")).toHaveText("0 de 140");
    await expect(page.getByText("Tengo 16 años o más.")).toBeVisible();
    await expect(page.getByText("No subas fotos de menores que no estén a tu cargo.")).toBeVisible();
    await write(page, "La abuela", "Cuarenta no es nada. Llámame.");
    await page.getByTestId("contribute-submit").click();
    await expect(page.getByTestId("contribute-done")).toContainText("Tu nota ya la tiene Tomás.");
    await expect(page.getByTestId("contribute-own")).toHaveAttribute("href", "/es/templates?ref=group-contribute");
    expect(field(asked[0], "name")).toBe("La abuela");
  });

  test("a name of the full 24 and a long sender's name stay inside a 320 px screen", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(`${PREVIEW}?from=${encodeURIComponent("Maximiliano-Alexander Wolfeschlegelstein")}&for=${encodeURIComponent("Bartholomew-Christopher Featherstone")}&prompt=${encodeURIComponent("Supercalifragilisticexpialidocious".repeat(4))}`);
    await expect(page.getByTestId("contribute-name")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("the report link is an email to a person, quoting the page's reference and nothing that opens it", async ({ page }) => {
    await page.goto(PREVIEW);
    const href = (await page.getByTestId("contribute-report").getAttribute("href")) ?? "";
    expect(href.startsWith("mailto:")).toBe(true);
    expect(decodeURIComponent(href)).toContain("Group card: prev1ew0");
    expect(href).not.toContain(TOKEN);
  });

  test("works in Safari on an iPhone: write, send, come back, take it back", async ({ baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chrome", "one WebKit pass is enough");
    const browser = await webkit.launch();
    try {
      const context = await browser.newContext({ ...devices["iPhone 13"], baseURL });
      const page = await context.newPage();
      const asked = await answer(page, "**/api/group/contribute", { status: 200, body: { ok: true, withdraw: "w".repeat(32) } });
      await answer(page, "**/api/group/withdraw", { status: 200, body: { ok: true } });
      await page.goto(PREVIEW);
      await write(page);
      await expect(page.getByTestId("contribute-count")).toHaveText("26 of 140");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.getByTestId("contribute-submit").click();
      await expect(page.getByTestId("contribute-done")).toContainText("Your note is with Tom.");
      expect(field(asked[0], "note")).toBe("Forty is nothing. Ring me.");
      await page.reload();
      await page.getByTestId("contribute-take-back").click();
      await expect(page.getByTestId("contribute-ended")).toHaveText("Your note has been taken back.");
    } finally {
      await browser.close();
    }
  });
});
