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
    // The link in a contributor's confirming email: asking and pressing are both not there.
    expect((await request.get("/api/group/confirm?t=anything&l=en")).status()).toBe(404);
    expect((await request.post("/api/group/confirm?t=anything&l=en")).status()).toBe(404);
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
    await expect(page.getByTestId("contribute-email")).toBeHidden();
  });

  test("sends the note to the real route and says who has it; the page keeps the way to take it back", async ({ page }) => {
    const asked = await answer(page, "**/api/group/contribute", { status: 200, body: { ok: true, withdraw: "w".repeat(32) } });
    const taken = await answer(page, "**/api/group/withdraw", { status: 200, body: { ok: true } });
    await page.goto(PREVIEW);
    await write(page);
    await page.getByTestId("contribute-wants-email").check();
    // The card comes only to someone whose note is in it, and the sentence they agree to says so.
    await expect(page.getByText("We'll email you once to confirm it's you and, if your note goes into the card, once with the link when it's sent. Then we delete your address.")).toBeVisible();
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
    [410, "expired", "This link has stopped taking notes."],
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
      // Past its last day, with nobody having closed it: it does not say Tom did.
      ["expired", "This link has stopped taking notes."],
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
    // The page stops saying the note is with Tom and stops offering another: the card has gone.
    await expect(page.getByTestId("contribute-ended")).toHaveText("This card has been sent.");
    await expect(page.getByTestId("contribute")).toHaveAttribute("data-stage", "sent");
    await expect(page.getByTestId("contribute-done")).toHaveCount(0);
    await expect(page.getByTestId("contribute-another")).toHaveCount(0);
    await expect(page.getByTestId("contribute-take-back")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("Your note is with Tom");
    // Said once, by the headline; the line under it is only what to do.
    await expect(page.getByTestId("contribute-write-in")).toHaveText(/^Write to \S+@\S+ and we'll take your note out\.$/);
    await expect(page.getByTestId("contribute")).not.toContainText("already been sent");
    // The address is a link that opens an email quoting this page's reference, not text to select by hand.
    const link = page.getByTestId("contribute-write-in-link");
    const href = decodeURIComponent((await link.getAttribute("href")) ?? "");
    expect(href).toMatch(/^mailto:[^?]+@[^?]+\?subject=Take my note out of group card prev1ew0&body=Group card: prev1ew0/);
    expect(href).not.toContain(TOKEN);
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });

  test("the address to write to is a link on the 'no longer here' line too, and in Spanish on a Spanish card", async ({ page }) => {
    await answer(page, "**/api/group/contribute", { status: 200, body: { ok: true, withdraw: "w".repeat(32) } });
    await answer(page, "**/api/group/withdraw", { status: 404, body: { error: "not_found" } });
    await page.goto(`${PREVIEW}?lang=es`);
    await write(page, "La abuela", "Cuarenta no es nada.");
    await page.getByTestId("contribute-submit").click();
    await page.getByTestId("contribute-take-back").click();
    await expect(page.getByTestId("contribute-write-in")).toContainText("Esa nota ya no se puede retirar desde aquí. Escribe a");
    const href = decodeURIComponent((await page.getByTestId("contribute-write-in-link").getAttribute("href")) ?? "");
    expect(href).toContain("subject=Quitar mi nota de la tarjeta en grupo prev1ew0");
  });

  test("a note the server can no longer find is never said to be taken back: the page gives the support address", async ({ page }) => {
    await answer(page, "**/api/group/contribute", { status: 200, body: { ok: true, withdraw: "w".repeat(32) } });
    await answer(page, "**/api/group/withdraw", { status: 404, body: { error: "not_found" } });
    await page.goto(PREVIEW);
    await write(page);
    await page.getByTestId("contribute-submit").click();
    await page.getByTestId("contribute-take-back").click();
    await expect(page.getByTestId("contribute-write-in")).toContainText("That note can't be taken back from here any more. Write to");
    await expect(page.getByTestId("contribute")).toHaveAttribute("data-stage", "done");
    await expect(page.getByTestId("contribute-ended")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("has been taken back");
    // The key that found nothing is not offered again.
    await expect(page.getByTestId("contribute-take-back")).toHaveCount(0);
  });

  test("the way to take a note back outlives the tab, and a second note does not cost the first its own", async ({ page, context }) => {
    let n = 0;
    const secrets = ["a".repeat(32), "b".repeat(32)];
    await answer(page, "**/api/group/contribute", () => ({ status: 200, body: { ok: true, withdraw: secrets[n++] } }));
    await page.goto(PREVIEW);
    await write(page);
    await page.getByTestId("contribute-submit").click();
    await expect(page.getByTestId("contribute-take-back")).toHaveText("Take my note back");
    await page.getByTestId("contribute-another").click();
    await write(page, "Sam", "You taught me to drive.");
    await page.getByTestId("contribute-submit").click();
    // Two notes from this phone: each has its own way back, by the name it was signed with.
    await expect(page.getByTestId("contribute-take-back")).toHaveText(["Take back the note from Gran", "Take back the note from Sam"]);
    await page.close();

    // Another tab, later (a chat app's browser closes the first one): both are still there.
    const later = await context.newPage();
    const taken = await answer(later, "**/api/group/withdraw", { status: 200, body: { ok: true } });
    await later.goto(PREVIEW);
    await expect(later.getByTestId("contribute-take-back")).toHaveCount(2);
    await later.getByTestId("contribute-take-back").first().click();
    await expect(later.getByTestId("contribute-took-back")).toHaveText("The note from Gran has been taken back.");
    // The one that is left is still named, so nobody wonders which note the button means.
    await expect(later.getByTestId("contribute-take-back")).toHaveText(["Take back the note from Sam"]);
    expect(taken.map((request) => request.postDataJSON())).toEqual([{ token: TOKEN, withdraw: "a".repeat(32) }]);
    await later.getByTestId("contribute-take-back").click();
    await expect(later.getByTestId("contribute-ended")).toHaveText("Your note has been taken back.");
    expect(taken.map((request) => (request.postDataJSON() as { withdraw: string }).withdraw)).toEqual(["a".repeat(32), "b".repeat(32)]);
    // Nothing is left behind in the browser once both are out.
    expect(await later.evaluate(() => Object.keys(window.localStorage).filter((key) => key.startsWith("ethos:group-notes:")))).toEqual([]);
  });

  test("a note can still be taken back at a link that has closed, until the card is sent", async ({ page }) => {
    await answer(page, "**/api/group/contribute", { status: 200, body: { ok: true, withdraw: "w".repeat(32) } });
    const taken = await answer(page, "**/api/group/withdraw", { status: 200, body: { ok: true } });
    await page.goto(PREVIEW);
    await write(page);
    await page.getByTestId("contribute-submit").click();
    await expect(page.getByTestId("contribute-done")).toBeVisible();
    // Tom closes the link (everyone has signed); Gran comes back to change her mind.
    await page.goto(`${PREVIEW}?state=closed`);
    await expect(page.getByTestId("contribute-ended")).toHaveText("Tom has closed this link.");
    await page.getByTestId("contribute-take-back").click();
    await expect(page.getByTestId("contribute-took-back")).toHaveText("The note from Gran has been taken back.");
    await expect(page.getByTestId("contribute-ended")).toHaveText("Tom has closed this link.");
    await expect(page.getByTestId("contribute-take-back")).toHaveCount(0);
    expect(taken).toHaveLength(1);
    // Once the card is sent there is no button: that is the support address's job.
    await page.goto(PREVIEW);
    await write(page);
    await page.getByTestId("contribute-submit").click();
    await page.goto(`${PREVIEW}?state=sent`);
    await expect(page.getByTestId("contribute-ended")).toHaveText("This card has been sent.");
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
    // Small text on the night ground still has to be read: 4.5 to 1 or better against what is behind it.
    const ratio = await page.getByTestId("contribute-report").evaluate((link) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      const ground = getComputedStyle(document.querySelector('[data-testid="contribute"]')!).backgroundColor;
      const paint = (...colors: string[]) => {
        ctx.clearRect(0, 0, 1, 1);
        for (const color of colors) {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
        }
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        const linear = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
        return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
      };
      const back = paint(ground);
      const text = paint(ground, getComputedStyle(link).color);
      return (Math.max(back, text) + 0.05) / (Math.min(back, text) + 0.05);
    });
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  test("on a Spanish card the report is written in Spanish, subject and body", async ({ page }) => {
    await page.goto(`${PREVIEW}?lang=es`);
    await expect(page.getByTestId("contribute-report")).toHaveText("Denunciar esta página");
    const href = decodeURIComponent((await page.getByTestId("contribute-report").getAttribute("href")) ?? "");
    expect(href).toContain("subject=Denunciar la tarjeta en grupo prev1ew0");
    expect(href).toContain("Tarjeta en grupo: prev1ew0");
    expect(href).toContain("Qué tiene de malo y por qué");
    expect(href).not.toMatch(/Report|What is wrong|Your name/);
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

const PANEL = "/group-preview/panel";
const GIFT_ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const GROUP_ID = "99999999-9999-4999-8999-999999999999";
const ENTRY = "eeeeeeee-eeee-4eee-8eee-000000000001";

/** A group as the routes answer it, for a panel that talks to them. */
function serverGroup(over: Record<string, unknown> = {}, entries: Record<string, unknown>[] = []) {
  return {
    id: GROUP_ID,
    url: "https://tryethos.io/c/liveLiveLiveLiveLive00",
    fromName: "Tom",
    forName: "Nora",
    prompt: null,
    max: 25,
    noteMax: 140,
    takesPhotos: true,
    closesAt: "2026-12-31T10:00:00.000Z",
    closedAt: null,
    ranOut: false,
    // Made on 1 December: 30 more days from the day it closes, as the real route counts it.
    extendsTo: "2027-01-30T10:00:00.000Z",
    sentAt: null,
    reportRef: "live0000",
    entries,
    ...over,
  };
}
const waitingEntry = (over: Record<string, unknown> = {}) => ({ id: ENTRY, status: "pending", name: "Gran", note: "Forty is nothing. Ring me.", photo: { url: "/demo/photos/p3.webp", width: 1024, height: 1024 }, wantsEmail: true, key: null, reportRef: "note0001", createdAt: "2026-12-01T10:00:00.000Z", decidedAt: null, ...over });

test.describe("the sender's group card panel", () => {
  test.beforeEach(async ({ request }) => needGroupPreviews(request));

  test("shows the price before any link exists, and what it is for someone who has the template", async ({ page }) => {
    await page.goto(`${PANEL}?state=intro`);
    await expect(page.getByRole("heading", { name: "A group card" })).toBeVisible();
    await expect(page.getByTestId("group-price-line")).toHaveText("Group cards on Group card (reference) cost €19.99. You pay once, when you send your first one.");
    await expect(page.getByText("The group stays with this template.")).toBeVisible();
    await expect(page.getByTestId("group-link")).toHaveCount(0);
    await page.goto(`${PANEL}?state=intro&owned=1`);
    await expect(page.getByTestId("group-price-line")).toHaveText("You already have Group card (reference), so group cards on it cost €10.00. You pay once, when you send your first one.");
  });

  test("a guest who taps Invite is asked to sign in, and told why", async ({ page }) => {
    await page.goto(`${PANEL}?state=guest`);
    await expect(page.getByTestId("group-guest")).toContainText("Notes are kept with your account, so you can open them on any phone.");
    // The site's own sign-in form, in the panel (this server has no accounts behind it, so the form says so),
    // under a heading of its own: "Welcome back" greeted people making their first card.
    await expect(page.getByTestId("group-guest").getByRole("heading", { name: "Sign in to invite people" })).toBeVisible();
    await expect(page.getByTestId("group-guest")).not.toContainText("Welcome back");
    await expect(page.getByTestId("group-link")).toHaveCount(0);
    // And a way back to the price it replaced, without reloading the page.
    await expect(page.getByTestId("group-price-line")).toHaveCount(0);
    expect((await page.getByTestId("group-guest-cancel").boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.getByTestId("group-guest-cancel").click();
    await expect(page.getByTestId("group-guest")).toHaveCount(0);
    await expect(page.getByTestId("group-price-line")).toContainText("€19.99");
    await expect(page.getByTestId("group-invite")).toBeVisible();
    await page.goto(`/es${PANEL}?state=guest`);
    await expect(page.getByTestId("group-guest").getByRole("heading", { name: "Inicia sesión para invitar a gente" })).toBeVisible();
    await expect(page.getByTestId("group-guest-cancel")).toHaveText("Ahora no");
  });

  test("the names for the page come filled in from the gift, and both are needed", async ({ page }) => {
    await page.goto(`${PANEL}?state=setup`);
    await expect(page.getByLabel("Your name, as they know you")).toHaveValue("Tom");
    await expect(page.getByLabel("Who it's for")).toHaveValue("Nora");
    await expect(page.getByLabel("What should they write?")).toHaveAttribute("maxlength", "140");
    await page.getByLabel("Who it's for").fill("   ");
    await page.getByTestId("group-create").click();
    await expect(page.getByTestId("group-setup").getByRole("alert")).toHaveText("Add both names first.");
  });

  test("the link can be copied and passed on, with words that say what it is", async ({ page }) => {
    await page.goto(`${PANEL}?state=active`);
    await expect(page.getByTestId("group-url")).toHaveText("tryethos.io/c/previewPreviewPreview0");
    const whatsapp = decodeURIComponent((await page.getByTestId("group-whatsapp").getAttribute("href")) ?? "");
    expect(whatsapp).toBe("https://wa.me/?text=Tom is making a group card for Nora. Add your note: https://tryethos.io/c/previewPreviewPreview0");
    await expect(page.getByTestId("group-copy")).toBeVisible();
  });

  test("'Share…' is offered only where the browser has a share sheet, and then it opens it with the words and the link", async ({ page }) => {
    // This browser has none: no button that would only copy the link without saying so.
    await page.goto(`${PANEL}?state=active`);
    expect(await page.evaluate(() => typeof navigator.share)).toBe("undefined");
    await expect(page.getByTestId("group-whatsapp")).toBeVisible();
    await expect(page.getByTestId("group-share")).toHaveCount(0);
    // WhatsApp then has the row to itself, edge to edge with the link above it.
    const [row, link] = [await page.getByTestId("group-whatsapp").boundingBox(), await page.getByTestId("group-link").boundingBox()];
    expect(Math.abs(row!.width - link!.width)).toBeLessThan(2);

    // A phone that has one.
    await page.addInitScript(() => {
      const shared: unknown[] = [];
      Object.assign(window, { __shared: shared });
      Object.defineProperty(navigator, "share", { configurable: true, value: async (data: unknown) => void shared.push(data) });
    });
    await page.goto(`${PANEL}?state=active`);
    await page.getByTestId("group-share").click();
    expect(await page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared)).toEqual([{ text: "Tom is making a group card for Nora. Add your note: https://tryethos.io/c/previewPreviewPreview0", url: "https://tryethos.io/c/previewPreviewPreview0" }]);
    // The sheet did the sharing: nothing claims the link was copied.
    await expect(page.getByTestId("group-copy")).toHaveText("Copy");
  });

  test("lists who is waiting and what is in the card, and never an address or a price", async ({ page }) => {
    await page.goto(`${PANEL}?state=active`);
    await expect(page.getByTestId("group-waiting-title")).toHaveText("Waiting for you (2)");
    await expect(page.getByTestId("group-in-card-title")).toHaveText("In the card (3 of 25)");
    const first = page.getByTestId("group-waiting-entry").first();
    await expect(first).toContainText("Gran");
    await expect(first).toContainText("Wants the finished card");
    // A note with a photo offers it, ticked; one without does not.
    await expect(first.getByTestId("group-with-photo")).toHaveCount(0);
    await expect(page.getByTestId("group-waiting-entry").nth(1).getByTestId("group-with-photo")).toBeChecked();
    await expect(page.getByTestId("group-decided-entry")).toContainText("Uncle Rob's note was removed.");
    await expect(page.getByTestId("group-active")).not.toContainText(/@|€|\$|£/);
    // Each note can be reported to a person, quoting its own reference.
    const report = decodeURIComponent((await first.getByTestId("group-report").getAttribute("href")) ?? "");
    expect(report.startsWith("mailto:")).toBe(true);
    expect(report).toContain("Note: prev0001");
  });

  test("the card's own list: move a note, fix a typo, take one out, add one yourself", async ({ page }) => {
    await page.goto(`${PANEL}?state=active`);
    const names = () => page.getByTestId("group-item").locator("p.font-medium").allTextContents();
    await expect(page.getByTestId("group-item")).toHaveCount(3);
    expect(await names()).toEqual(["Mum", "Iris", "Sam"]);
    await expect(page.getByTestId("group-move-up").first()).toBeDisabled();
    await expect(page.getByTestId("group-move-down").last()).toBeDisabled();
    await page.getByTestId("group-move-down").first().click();
    expect(await names()).toEqual(["Iris", "Mum", "Sam"]);

    await page.getByTestId("group-edit").first().click();
    const form = page.getByTestId("group-note-form");
    await form.getByLabel("Name").fill("Iris B.");
    await form.getByLabel("Note").fill("Same table on the 12th.\nI'm buying.");
    await expect(form.getByText("35 of 140")).toBeVisible();
    await form.getByRole("button", { name: "Save" }).click();
    expect(await names()).toEqual(["Iris B.", "Mum", "Sam"]);
    // A line break typed into a note becomes a space: a note is one line.
    await expect(page.getByTestId("group-item").first()).toContainText("Same table on the 12th. I'm buying.");

    await page.getByTestId("group-remove-item").last().click();
    await expect(page.getByTestId("group-in-card-title")).toHaveText("In the card (2 of 25)");

    await page.getByTestId("group-add-own").click();
    const own = page.getByTestId("group-note-form");
    await expect(own.getByRole("button", { name: "Add it" })).toBeDisabled();
    await own.getByLabel("Name").fill("Grandad");
    await own.getByLabel("Note").fill("Told you forty would suit you.");
    await own.getByRole("button", { name: "Add it" }).click();
    await expect(page.getByTestId("group-in-card-title")).toHaveText("In the card (3 of 25)");
    expect(await names()).toEqual(["Iris B.", "Mum", "Grandad"]);
  });

  test("a full card says so and takes no more until one is removed", async ({ page }) => {
    await page.goto(`${PANEL}?state=full`);
    await expect(page.getByTestId("group-in-card-title")).toHaveText("In the card (25 of 25)");
    await expect(page.getByTestId("group-add")).toBeDisabled();
    await expect(page.getByTestId("group-add-own")).toBeDisabled();
    await expect(page.getByText("The card is full. Remove a note to add another.")).toBeVisible();
    await page.getByTestId("group-remove-item").last().click();
    await expect(page.getByTestId("group-add")).toBeEnabled();
  });

  test("once the card is sent the link is gone, and notes still waiting can be added for a week", async ({ page }) => {
    await page.goto(`${PANEL}?state=sent`);
    // Six days from sending (1 December): the daily job deletes what is still waiting within the seven everyone was told.
    await expect(page.getByTestId("group-sent")).toHaveText("The card has been sent, so the link is closed. Notes still waiting can be added until December 7.");
    await expect(page.getByTestId("group-link")).toHaveCount(0);
    await expect(page.getByTestId("group-link-controls")).toHaveCount(0);
    await expect(page.getByTestId("group-add")).toBeEnabled();
  });

  test("everything in it is at least 44 px to tap and fits a 320 px screen", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(`${PANEL}?state=active`);
    for (const id of ["group-copy", "group-whatsapp", "group-edit-page", "group-add", "group-reject", "group-undo", "group-move-down", "group-edit", "group-remove-item", "group-add-own", "group-extend", "group-close", "group-reset", "group-report"]) {
      const box = await page.getByTestId(id).first().boundingBox();
      expect(box, id).not.toBeNull();
      expect(box!.height, id).toBeGreaterThanOrEqual(44);
      // The short words (Report, Undo, Edit) were 35 to 38 px wide: a thumb needs the width too.
      expect(box!.width, id).toBeGreaterThanOrEqual(44);
    }
    // The form a note is fixed in, and the one behind "Add one yourself": its buttons too.
    await page.getByTestId("group-edit").first().click();
    for (const button of await page.getByTestId("group-note-form").getByRole("button").all()) expect((await button.boundingBox())!.height, await button.innerText()).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("a note the sender types or fixes can't carry a web address either, and the form says why", async ({ page }) => {
    await page.goto(`${PANEL}?state=active`);
    await page.getByTestId("group-edit").first().click();
    const form = page.getByTestId("group-note-form");
    await form.getByLabel("Note").fill("Photos from the day are on evil.com");
    await expect(form.getByTestId("group-note-links")).toHaveText("A note can't carry a web address. Take it out to save it.");
    await expect(form.getByRole("button", { name: "Save" })).toBeDisabled();
    // A full stop with no space after it is not an address.
    await form.getByLabel("Note").fill("See you on the 12th.Me and Sam will bring the cake");
    await expect(form.getByTestId("group-note-links")).toHaveCount(0);
    await expect(form.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  test("a link past its last day says the day it ran out, not that it is open, and offers the way back", async ({ page }) => {
    await page.goto(`${PANEL}?state=ranout`);
    await expect(page.getByTestId("group-link-controls")).toHaveAttribute("data-link", "ran-out");
    await expect(page.getByTestId("group-open-until")).toHaveText("The link ran out on November 28. Nobody new can add a note.");
    await expect(page.getByTestId("group-extend")).toHaveText("Open it again until December 31");
    // There is nothing to close, so no "Close the link"; a new link can still be made.
    await expect(page.getByTestId("group-close")).toHaveCount(0);
    await expect(page.getByTestId("group-reset")).toBeVisible();
    await page.goto(`/es${PANEL}?state=ranout`);
    await expect(page.getByTestId("group-open-until")).toHaveText("El enlace caducó el 28 de noviembre. Nadie más puede dejar una nota.");
    await expect(page.getByTestId("group-extend")).toHaveText("Volver a abrirlo hasta el 31 de diciembre");
  });

  test("at the last day a link can have, there is no button that would do nothing", async ({ page }) => {
    await page.goto(`${PANEL}?state=capped`);
    await expect(page.getByTestId("group-open-until")).toHaveText("Open until January 15");
    await expect(page.getByTestId("group-extend")).toHaveCount(0);
    await expect(page.getByTestId("group-close")).toHaveText("Close the link");
  });

  test("a duplicated card: its notes can be seen, fixed and taken out though no group is behind them", async ({ page }) => {
    await page.goto(`${PANEL}?state=copy`);
    // Inviting people is still on offer, and the card's own notes are listed under it.
    await expect(page.getByTestId("group-invite")).toBeVisible();
    await expect(page.getByTestId("group-link")).toHaveCount(0);
    await expect(page.getByTestId("group-waiting-title")).toHaveCount(0);
    await expect(page.getByTestId("group-in-card-title")).toHaveText("In the card (3 of 25)");
    await expect(page.getByTestId("group-item")).toHaveCount(3);
    await page.getByTestId("group-remove-item").first().click();
    await expect(page.getByTestId("group-in-card-title")).toHaveText("In the card (2 of 25)");
    await expect(page.getByTestId("group-item").first()).toContainText("Iris");
  });

  test("the sender's report on a note is written in their language", async ({ page }) => {
    await page.goto(`/es${PANEL}?state=active`);
    const report = decodeURIComponent((await page.getByTestId("group-report").first().getAttribute("href")) ?? "");
    expect(report).toContain("subject=Denunciar una nota de una tarjeta en grupo (prev0001)");
    expect(report).toContain("Nota: prev0001");
    expect(report).not.toMatch(/Report|What is wrong|Your name/);
  });

  test("in Spanish, written for it", async ({ page }) => {
    await page.goto(`/es${PANEL}?state=active`);
    await expect(page.getByRole("heading", { name: "Una tarjeta en grupo" })).toBeVisible();
    await expect(page.getByTestId("group-waiting-title")).toHaveText("Esperan tu visto bueno (2)");
    await expect(page.getByTestId("group-in-card-title")).toHaveText("En la tarjeta (3 de 25)");
    await expect(page.getByTestId("group-open-until")).toHaveText("Abierto hasta el 31 de diciembre");
    await page.goto(`/es${PANEL}?state=intro`);
    await expect(page.getByTestId("group-price-line")).toContainText("Las tarjetas en grupo con Tarjeta en grupo (referencia) cuestan 19,99");
  });
});

test.describe("the panel talking to the routes", () => {
  test.beforeEach(async ({ request }) => needGroupPreviews(request));

  test("makes the link from the gift's draft, with the gift's id in the body and never in an address", async ({ page }) => {
    const urls: string[] = [];
    page.on("request", (request) => urls.push(request.url()));
    await answer(page, "**/api/group/find", { status: 200, body: { group: null } });
    const made = await answer(page, "**/api/group", { status: 200, body: { group: serverGroup() } });
    await page.goto(`${PANEL}?state=setup&live=1`);
    await page.getByTestId("group-invite").click();
    await page.getByLabel("What should they write?").fill("One line only you would know");
    await page.getByTestId("group-create").click();
    await expect(page.getByTestId("group-url")).toHaveText("tryethos.io/c/liveLiveLiveLiveLive00");
    expect(made).toHaveLength(1);
    expect(made[0].method()).toBe("POST");
    expect(made[0].postDataJSON()).toEqual({ giftId: GIFT_ID, fromName: "Tom", forName: "Nora", prompt: "One line only you would know" });
    expect(urls.filter((url) => url.includes(GIFT_ID))).toEqual([]);
  });

  test("says so when group cards can't be started, and lets them try again", async ({ page }) => {
    await answer(page, "**/api/group/find", { status: 200, body: { group: null } });
    await answer(page, "**/api/group", { status: 503, body: { error: "unavailable" } });
    await page.goto(`${PANEL}?state=setup&live=1`);
    await page.getByTestId("group-invite").click();
    await page.getByTestId("group-create").click();
    await expect(page.getByTestId("group-setup").getByRole("alert")).toHaveText("Group cards can't be started right now. Try again later.");
    await expect(page.getByTestId("group-create")).toBeEnabled();
  });

  test("adding a note puts it in the card with its photo; removing it offers Undo", async ({ page }) => {
    let entries = [waitingEntry()];
    const item = { key: "abcdefghij", name: "Gran", note: "Forty is nothing. Ring me.", photo: { url: `gifts/${GIFT_ID}/cabcdefghij.webp`, width: 1024, height: 1024 } };
    await answer(page, "**/api/group/find", () => ({ status: 200, body: { group: serverGroup({}, entries) } }));
    const decided = await answer(page, `**/api/group/${GROUP_ID}/entries/${ENTRY}`, (request) => {
      const { action } = request.postDataJSON() as { action: string };
      if (action === "approve") {
        entries = [waitingEntry({ status: "approved", key: item.key })];
        return { status: 200, body: { ok: true, status: "approved", item, previewUrl: "/demo/photos/p3.webp" } };
      }
      entries = [waitingEntry({ status: action === "remove" ? "removed" : "pending", key: action === "remove" ? item.key : null, decidedAt: action === "remove" ? "2026-12-01T10:05:00.000Z" : null })];
      return { status: 200, body: { ok: true, status: action === "remove" ? "removed" : "pending" } };
    });
    await page.goto(`${PANEL}?state=active&live=1`);
    await expect(page.getByTestId("group-waiting-title")).toHaveText("Waiting for you (1)");
    await expect(page.getByTestId("group-in-card-title")).toHaveText("In the card (0 of 25)");

    await page.getByTestId("group-add").click();
    await expect(page.getByTestId("group-in-card-title")).toHaveText("In the card (1 of 25)");
    await expect(page.getByTestId("group-waiting-title")).toHaveText("Waiting for you (0)");
    await expect(page.getByTestId("group-item")).toContainText("Forty is nothing. Ring me.");
    // The photo shown is the preview's address; what was asked for was the photo.
    await expect(page.getByTestId("group-item").getByRole("img", { name: "Photo from Gran" })).toHaveAttribute("src", "/demo/photos/p3.webp");
    expect(decided[0].postDataJSON()).toEqual({ action: "approve", withPhoto: true });

    await page.getByTestId("group-remove-item").click();
    await expect(page.getByTestId("group-in-card-title")).toHaveText("In the card (0 of 25)");
    await expect(page.getByTestId("group-decided-entry")).toContainText("Gran's note was removed.");
    await page.getByTestId("group-undo").click();
    await expect(page.getByTestId("group-waiting-title")).toHaveText("Waiting for you (1)");
    expect(decided.map((request) => (request.postDataJSON() as { action: string }).action)).toEqual(["approve", "remove", "restore"]);
  });

  test("the photo can be left out, and a note can be turned down", async ({ page }) => {
    await answer(page, "**/api/group/find", { status: 200, body: { group: serverGroup({}, [waitingEntry()]) } });
    const decided = await answer(page, `**/api/group/${GROUP_ID}/entries/${ENTRY}`, (request) => {
      const body = request.postDataJSON() as { action: string };
      return body.action === "approve" ? { status: 200, body: { ok: true, status: "approved", item: { key: "abcdefghij", name: "Gran", note: "Forty is nothing. Ring me." } } } : { status: 200, body: { ok: true, status: "rejected" } };
    });
    await page.goto(`${PANEL}?state=active&live=1`);
    await page.getByTestId("group-with-photo").uncheck();
    await page.getByTestId("group-add").click();
    await expect(page.getByTestId("group-in-card-title")).toHaveText("In the card (1 of 25)");
    await expect(page.getByTestId("group-item").getByRole("img")).toHaveCount(0);
    expect(decided[0].postDataJSON()).toEqual({ action: "approve", withPhoto: false });
  });

  test("a note the card lost is put back, and one its writer took back is taken out and said", async ({ page }) => {
    // The server says "added" for a note the gift does not hold (a save that never landed).
    const item = { key: "abcdefghij", name: "Gran", note: "Forty is nothing. Ring me." };
    let entries = [waitingEntry({ status: "approved", key: item.key, photo: null })];
    await answer(page, "**/api/group/find", () => ({ status: 200, body: { group: serverGroup({}, entries) } }));
    const again = await answer(page, `**/api/group/${GROUP_ID}/entries/${ENTRY}`, { status: 200, body: { ok: true, status: "approved", item } });
    await page.goto(`${PANEL}?state=active&live=1`);
    await expect(page.getByTestId("group-in-card-title")).toHaveText("In the card (1 of 25)");
    expect(again[0].postDataJSON()).toEqual({ action: "approve", withPhoto: false });

    // Then its writer takes it back: the next read removes it from the card.
    entries = [waitingEntry({ status: "withdrawn", key: item.key, photo: null })];
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.getByTestId("group-in-card-title")).toHaveText("In the card (0 of 25)");
    await expect(page.getByTestId("group-took-back")).toHaveText("Gran took their note back, so it's out of the card.");
  });

  test("the link's controls: close, keep open, and a new link only after saying yes", async ({ page }) => {
    await answer(page, "**/api/group/find", { status: 200, body: { group: serverGroup() } });
    const patches = await answer(page, `**/api/group/${GROUP_ID}`, (request) => {
      const body = request.postDataJSON() as Record<string, unknown>;
      if (body.closed === true) return { status: 200, body: { group: serverGroup({ closedAt: "2026-12-01T10:00:00.000Z" }) } };
      if (body.resetLink) return { status: 200, body: { group: serverGroup({ url: "https://tryethos.io/c/newNewNewNewNewNewNew0" }) } };
      // What the real route answers for a link made on 1 December: 30 days on from the day it closes,
      // and the next tap would reach the last day it can have (90 days from the start, 1 March).
      if (body.extend) return { status: 200, body: { group: serverGroup({ closesAt: "2027-01-30T10:00:00.000Z", extendsTo: "2027-03-01T10:00:00.000Z" }) } };
      return { status: 200, body: { group: serverGroup() } };
    });
    await page.goto(`${PANEL}?state=active&live=1`);
    await expect(page.getByTestId("group-open-until")).toHaveText("Open until December 31");
    await expect(page.getByTestId("group-extend")).toHaveText("Keep it open 30 more days");
    await page.getByTestId("group-extend").click();
    await expect(page.getByTestId("group-open-until")).toHaveText("Open until January 30");
    await expect(page.getByTestId("group-extend")).toHaveText("Keep it open 30 more days");
    await page.getByTestId("group-close").click();
    await expect(page.getByTestId("group-open-until")).toHaveText("The link is closed. Nobody new can add a note.");
    await expect(page.getByTestId("group-close")).toHaveText("Reopen the link");
    await page.getByTestId("group-close").click();

    await page.getByTestId("group-reset").click();
    await expect(page.getByText("The link you shared will stop working. Make a new one?")).toBeVisible();
    expect(patches.map((request) => request.postDataJSON())).toEqual([{ extend: true }, { closed: true }, { closed: false }]);
    await page.getByTestId("group-reset-yes").click();
    await expect(page.getByTestId("group-url")).toHaveText("tryethos.io/c/newNewNewNewNewNewNew0");
    expect(patches.at(-1)?.method()).toBe("PATCH");
    expect(patches.at(-1)?.postDataJSON()).toEqual({ resetLink: true });
  });

  test("'30 more days' is only promised when it is 30: near the last day the button names the day instead", async ({ page }) => {
    await answer(page, "**/api/group/find", { status: 200, body: { group: serverGroup({ closesAt: "2027-02-14T10:00:00.000Z", extendsTo: "2027-03-01T10:00:00.000Z" }) } });
    const patches = await answer(page, `**/api/group/${GROUP_ID}`, { status: 200, body: { group: serverGroup({ closesAt: "2027-03-01T10:00:00.000Z", extendsTo: null }) } });
    await page.goto(`${PANEL}?state=active&live=1`);
    await expect(page.getByTestId("group-open-until")).toHaveText("Open until February 14");
    await expect(page.getByTestId("group-extend")).toHaveText("Keep it open until March 1");
    await page.getByTestId("group-extend").click();
    await expect(page.getByTestId("group-open-until")).toHaveText("Open until March 1");
    // The last day it can have: the button is gone, not left to do nothing.
    await expect(page.getByTestId("group-extend")).toHaveCount(0);
    expect(patches.map((request) => request.postDataJSON())).toEqual([{ extend: true }]);
  });

  test("a failure says so and leaves the note where it was", async ({ page }) => {
    await answer(page, "**/api/group/find", { status: 200, body: { group: serverGroup({}, [waitingEntry()]) } });
    await answer(page, `**/api/group/${GROUP_ID}/entries/${ENTRY}`, { status: 502, body: { error: "photo_failed" } });
    await page.goto(`${PANEL}?state=active&live=1`);
    await page.getByTestId("group-add").click();
    await expect(page.getByTestId("group-error")).toHaveText("That didn't go through. Try again in a moment.");
    await expect(page.getByTestId("group-waiting-title")).toHaveText("Waiting for you (1)");
    await expect(page.getByTestId("group-add")).toBeEnabled();
  });

  test("a failed tap is answered inside the thing that was tapped, on screen, however long the card is", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    // Nine notes already in the card and one waiting: the foot of the panel is two screens down.
    const keys = Array.from({ length: 9 }, (_, i) => `inthecard${i}`);
    const inCard = keys.map((key, i) => waitingEntry({ id: `eeeeeeee-eeee-4eee-8eee-0000000001${String(i).padStart(2, "0")}`, status: "approved", key, name: `Guest ${i + 1}`, note: "Happy birthday, Nora. See you on Saturday.", photo: null, wantsEmail: false }));
    const removed = waitingEntry({ id: "eeeeeeee-eeee-4eee-8eee-000000000777", status: "rejected", name: "Uncle Rob", note: "…", photo: null, wantsEmail: false, decidedAt: "2026-12-01T10:05:00.000Z" });
    await answer(page, "**/api/group/find", { status: 200, body: { group: serverGroup({}, [waitingEntry(), removed, ...inCard]) } });
    // Every note's route fails, except the first reading that puts the nine into this empty editor.
    await page.route(`**/api/group/${GROUP_ID}/entries/*`, async (route) => {
      const id = route.request().url().split("/").pop()!;
      const at = inCard.findIndex((entry) => entry.id === id);
      const { action } = route.request().postDataJSON() as { action: string };
      if (at >= 0 && action === "approve") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, status: "approved", item: { key: keys[at], name: inCard[at].name, note: inCard[at].note } }) });
      return route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "failed" }) });
    });
    await answer(page, `**/api/group/${GROUP_ID}`, { status: 502, body: { error: "failed" } });
    await page.goto(`${PANEL}?state=active&live=1`);
    await expect(page.getByTestId("group-in-card-title")).toHaveText("In the card (9 of 25)");
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(812 * 2);

    // "Add to the card": the words are in the waiting note's own card, in view, with nothing scrolled.
    const waiting = page.getByTestId("group-waiting-entry");
    await waiting.getByTestId("group-add").click();
    await expect(waiting.getByRole("alert")).toHaveText("That didn't go through. Try again in a moment.");
    await expect(waiting.getByRole("alert")).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId("group-error")).toHaveCount(1);

    // "Undo" on a removed note: under its own line.
    const decided = page.getByTestId("group-decided-entry");
    await decided.getByTestId("group-undo").click();
    await expect(decided.getByRole("alert")).toHaveText("That didn't go through. Try again in a moment.");
    await expect(decided.getByRole("alert")).toBeInViewport({ ratio: 1 });
    await expect(waiting.getByRole("alert")).toHaveCount(0);

    // Taking the seventh note out of the card: said in that note, which is where the thumb is.
    const seventh = page.getByTestId("group-item").nth(6);
    await seventh.getByTestId("group-remove-item").click();
    await expect(seventh.getByRole("alert")).toHaveText("That didn't go through. Try again in a moment.");
    await expect(seventh.getByRole("alert")).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId("group-in-card-title")).toHaveText("In the card (9 of 25)");

    // Closing the link: beside the link's own controls, at the foot.
    await page.getByTestId("group-close").click();
    const controls = page.getByTestId("group-link-controls");
    await expect(controls.getByRole("alert")).toHaveText("That didn't go through. Try again in a moment.");
    await expect(controls.getByRole("alert")).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId("group-error")).toHaveCount(1);
  });
});

test.describe("a group card's pay panel", () => {
  test.beforeEach(async ({ request }) => needGroupPreviews(request));

  test("one thing, one price, one button: the full price says the template is in it", async ({ page }) => {
    const asked = await answer(page, "**/api/stripe/checkout", { status: 200, body: { url: "/group-preview/pay?went=stripe" } });
    await page.goto("/group-preview/pay");
    await expect(page.getByTestId("group-pay")).toContainText("Send your group card");
    await expect(page.getByTestId("group-pay")).toContainText("Group cards on Group card (reference)");
    await expect(page.getByTestId("group-pay-price")).toHaveText("€19.99");
    await expect(page.getByTestId("group-pay-template")).toHaveText("Group card (reference) is included.");
    await expect(page.getByTestId("group-pay-button")).toHaveText("Pay €19.99");
    await expect(page.getByText("One payment. The people you invited never pay.")).toBeVisible();
    await page.getByTestId("group-pay-button").click();
    await page.waitForURL("**/group-preview/pay?went=stripe");
    const body = asked[0].postDataJSON() as Record<string, unknown>;
    expect(body).toMatchObject({ product: "group", templateSlugs: ["group-reference"], currency: "eur", locale: "en", returnTo: "/create/group-reference?resume=publish" });
    // The browser never says what to charge, and names no gift.
    expect(Object.keys(body).some((key) => /amount|price|total|gift/i.test(key))).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
  });

  test("the step up for someone who has the template: the difference, and why", async ({ page }) => {
    await page.goto("/group-preview/pay?owned=1");
    await expect(page.getByTestId("group-pay-price")).toHaveText("€10.00");
    await expect(page.getByTestId("group-pay-template")).toHaveText("You already have Group card (reference), so that part is taken off.");
    await expect(page.getByTestId("group-pay-button")).toHaveText("Pay €10.00");
  });

  test("a refusal from checkout is said in words and the button comes back", async ({ page }) => {
    await answer(page, "**/api/stripe/checkout", { status: 400, body: { error: "not_on_sale" } });
    await page.goto("/group-preview/pay");
    await page.getByTestId("group-pay-button").click();
    await expect(page.getByTestId("group-pay-button")).toBeEnabled();
    await expect(page.getByTestId("group-pay-button")).toHaveText("Pay €19.99");
  });

  test("inside the iPhone app it sells nothing and says where to finish", async ({ page }) => {
    await page.goto("/group-preview/pay?inapp=1");
    await expect(page.getByTestId("group-pay-in-app")).toHaveText("Group cards aren't sold in the app. Finish this one on tryethos.io.");
    await expect(page.getByTestId("group-pay-button")).toHaveCount(0);
  });

  test("in Spanish, in euros written the Spanish way", async ({ page }) => {
    await page.goto("/es/group-preview/pay?owned=1");
    await expect(page.getByTestId("group-pay")).toContainText("Envía tu tarjeta en grupo");
    await expect(page.getByTestId("group-pay-price")).toHaveText(/10,00\s€/);
    await expect(page.getByTestId("group-pay-template")).toHaveText("Ya tienes Tarjeta en grupo (referencia), así que esa parte se descuenta.");
  });
});

test.describe("the reference template and the editor", () => {
  test.beforeEach(async ({ request }) => needGroupPreviews(request));

  test("the demo draws all six notes, in order, with two photos, and nothing a note could have smuggled in", async ({ page }) => {
    await page.goto("/demo/group-reference?cover=classic");
    const notes = page.getByTestId("contribution");
    await expect(notes).toHaveCount(6);
    await expect(notes.first()).toContainText("You were born at 4 a.m.");
    await expect(notes.first()).toContainText("Mum");
    await expect(notes.nth(3)).toContainText("The whole Okonkwo family");
    await expect(notes.last()).toContainText("Forty is nothing. Ring me.");
    await expect(page.getByTestId("contributions").locator("img")).toHaveCount(2);
    await expect(page.getByTestId("contributions").locator("a, button, form, input")).toHaveCount(0);
    // The longest name and the longest note stay inside their card.
    for (const card of await notes.all()) {
      const fits = await card.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
      expect(fits).toBe(true);
    }
    await expect(page.getByText("from Tom and 6 more")).toBeVisible();
  });

  test("in Spanish the demo's notes are Spanish", async ({ page }) => {
    await page.goto("/es/demo/group-reference?cover=classic");
    await expect(page.getByTestId("contribution")).toHaveCount(6);
    await expect(page.getByTestId("contribution").first()).toContainText("Naciste a las cuatro de la mañana");
    await expect(page.getByText("Firman")).toBeVisible();
  });

  test("a card with notes ends with one small Report link: an email to a person that names nothing of the card", async ({ page }) => {
    await page.goto("/demo/group-reference?cover=classic");
    const report = page.getByTestId("report-note");
    await expect(report).toHaveCount(1);
    await report.scrollIntoViewIfNeeded();
    await expect(report).toHaveText("Report a note");
    const href = decodeURIComponent((await report.getAttribute("href")) ?? "");
    expect(href.startsWith("mailto:")).toBe(true);
    expect(href).toContain("The card's link:");
    for (const secret of ["Tom", "Nora", "Mum", "Okonkwo", "group-reference", "demo0000", "/g/", "/demo/"]) expect(href).not.toContain(secret);
    // Big enough to tap, quiet enough not to be the screen's point, and it comes after the buttons.
    const box = (await report.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    const lastButton = (await page.getByRole("button", { name: /Make one for someone/ }).boundingBox())!;
    expect(box.y).toBeGreaterThan(lastButton.y + lastButton.height - 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

    await page.goto("/es/demo/group-reference?cover=classic");
    await expect(page.getByTestId("report-note")).toHaveText("Denunciar una nota");
  });

  test("the same template with no notes from a group has no Report link, like every gift before it", async ({ page, isMobile }) => {
    // A new draft holds no notes: the editor's preview is the gift as it would be sent today.
    await page.goto("/create/group-reference");
    if (isMobile) await page.getByRole("tab", { name: "Preview" }).click();
    await expect(page.getByText("The end. For now.")).toBeAttached();
    await expect(page.getByTestId("report-note")).toHaveCount(0);
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  });

  test("the editor shows the group card section only with the switch on, and only on a template made for it", async ({ page }) => {
    await page.goto("/create/group-reference?group=on");
    await expect(page.getByTestId("group-section")).toBeVisible();
    await expect(page.getByTestId("group-invite")).toBeVisible();
    // A guest is asked to sign in before any link is made, and no group route is called.
    const calls: string[] = [];
    page.on("request", (request) => request.url().includes("/api/group") && calls.push(request.url()));
    await page.getByTestId("group-invite").click();
    await expect(page.getByTestId("group-guest")).toBeVisible();
    expect(calls).toEqual([]);

    await page.goto("/create/group-reference?group=off");
    await expect(page.getByRole("heading", { name: "Your words" })).toBeVisible();
    await expect(page.getByTestId("group-section")).toHaveCount(0);

    await page.goto("/create/the-letter?group=on");
    await expect(page.getByRole("heading", { name: "Your words" })).toBeVisible();
    await expect(page.getByTestId("group-section")).toHaveCount(0);
  });

  test("with the switch as it is live (off), the editor has no group card section at all", async ({ page }) => {
    await page.goto("/create/group-reference");
    await expect(page.getByRole("heading", { name: "Your words" })).toBeVisible();
    await expect(page.getByTestId("group-section")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("A group card");
  });

  test("the editor's preview draws the notes the draft holds", async ({ page, isMobile }) => {
    const draft = {
      version: 1,
      slug: "group-reference",
      giftId: null,
      shortId: null,
      status: "draft",
      schedule: { enabled: false, timezone: "UTC" },
      password: "",
      removeWatermark: false,
      updatedAt: Date.now(),
      data: { version: 1, templateSlug: "group-reference", locale: "en", title: "", recipientName: "Nora", senderName: "Tom", message: "Forty looks good on you.", messageStyle: "fade", photos: [], accentColor: "#B4552D", fontPairing: "editorial", cover: "classic", showReactionCta: true, watermark: true, fields: {}, contributions: [{ key: "abcdefghij", name: "Gran", note: "Forty is nothing. Ring me." }, { key: "abcdefghik", name: "Sam", note: "You taught me to drive." }] },
    };
    await page.addInitScript((value) => window.localStorage.setItem("ethos:draft:group-reference", value), JSON.stringify(draft));
    await page.goto("/create/group-reference?group=on");
    if (isMobile) await page.getByRole("tab", { name: "Preview" }).click();
    await expect(page.getByTestId("contribution")).toHaveCount(2);
    await expect(page.getByTestId("contribution").first()).toContainText("Forty is nothing. Ring me.");
    await expect(page.getByTestId("contribution").last()).toContainText("Sam");
    // And the editor lists them, with no group behind them (a duplicated card, a draft from before): they can be taken out.
    if (isMobile) await page.getByRole("tab", { name: "Edit" }).click();
    await expect(page.getByTestId("group-section").getByTestId("group-item")).toHaveCount(2);
    await page.getByTestId("group-remove-item").first().click();
    await expect(page.getByTestId("group-section").getByTestId("group-item")).toHaveCount(1);
    if (isMobile) await page.getByRole("tab", { name: "Preview" }).click();
    await expect(page.getByTestId("contribution")).toHaveCount(1);
    await expect(page.getByTestId("contribution")).toContainText("Sam");
  });
});

/**
 * What a hands-on test of group cards found (21 Nov 2026): each of these was a way the page or the
 * panel let someone down when used as people use it, and is held here so it stays fixed.
 */
test.describe("the page at a link, used the way people use it", () => {
  test.beforeEach(async ({ request }) => needGroupPreviews(request));

  // The full 140, ending on wide letters: five lines and more in a phone's box.
  const LONG = "Forty is nothing. Ring me when you have finished with the candles, and bring the dog on Sunday because the kids drew him a banner. WWWWWWW".padEnd(140, "W").slice(0, 140);

  test("Privacy opens beside the page, so reading it costs nobody the note they were writing", async ({ page, context }) => {
    await page.goto(PREVIEW);
    await write(page);
    const link = page.getByTestId("contribute-privacy");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("href", "/legal/privacy");
    const [opened] = await Promise.all([context.waitForEvent("page"), link.click()]);
    await opened.close();
    // The page they were on never went anywhere.
    await expect(page.getByTestId("contribute-name")).toHaveValue("Gran");
    await expect(page.getByTestId("contribute-count")).toHaveText("26 of 140");
    // Big enough for a thumb, though it is one small word in a sentence.
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect((await link.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  });

  test("leaving the page and coming Back: what is drawn and what would be sent still agree", async ({ page }) => {
    const asked = await answer(page, "**/api/group/contribute", { status: 200, body: { ok: true, withdraw: "w".repeat(32) } });
    await page.goto(PREVIEW);
    await write(page, "Gran", "Forty is nothing. Ring me when you have finished with the candles.");
    await page.getByTestId("contribute-wants-email").check();
    await page.getByTestId("contribute-email").fill("gran@example.com");
    await expect(page.getByTestId("contribute-count")).toHaveText("66 of 140");

    await page.goto("/legal/privacy");
    await page.goBack();
    await expect(page.getByTestId("contribute-name")).toBeVisible();

    // Whatever this browser put back (it may be everything, or nothing), the page must not lie about
    // it once it is live: the count is the note's, and the address field is there exactly when the box is ticked.
    const now = await page.evaluate(() => {
      const form = document.querySelector<HTMLFormElement>('[data-testid="contribute-form"]')!;
      const get = <T extends Element>(id: string) => form.querySelector<T>(`[data-testid="${id}"]`)!;
      return { note: get<HTMLTextAreaElement>("contribute-note").value, ticked: get<HTMLInputElement>("contribute-wants-email").checked, email: get<HTMLInputElement>("contribute-email").value };
    });
    await expect(page.getByTestId("contribute-count")).toHaveText(`${now.note.length} of 140`);
    if (now.ticked) await expect(page.getByTestId("contribute-email")).toBeVisible();
    else await expect(page.getByTestId("contribute-email")).toBeHidden();

    // And sending it now sends exactly what is on the page.
    if (!now.note) await write(page, "Gran", "Forty is nothing.");
    await page.getByTestId("contribute-name").fill("Gran");
    await page.getByTestId("contribute-agree").check();
    await page.getByTestId("contribute-submit").click();
    if (now.ticked && !now.email) {
      // A tick with no address is never sent as "no email": the page asks for the address.
      await expect(page.getByTestId("contribute-form").getByRole("alert")).toHaveText("Add your email, or untick the box.");
      expect(asked).toHaveLength(0);
    } else {
      await expect(page.getByTestId("contribute-done")).toBeVisible();
      expect(field(asked[0], "email")).toBe(now.ticked ? now.email : undefined);
    }
  });

  test("a form the browser restored with the box ticked shows the address field and counts the note", async ({ page }) => {
    // What a browser does on Back, done by hand before the page's script runs: the fields hold
    // values the page's own memory knows nothing of.
    await page.route("**/_next/static/**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.continue();
    });
    await page.goto(PREVIEW, { waitUntil: "commit" });
    await page.waitForSelector('[data-testid="contribute-form"]', { state: "attached" });
    await page.evaluate(() => {
      const form = document.querySelector<HTMLFormElement>('[data-testid="contribute-form"]')!;
      form.querySelector<HTMLTextAreaElement>('[name="note"]')!.value = "Forty is nothing.";
      form.querySelector<HTMLInputElement>('[name="wantsEmail"]')!.checked = true;
      form.querySelector<HTMLInputElement>('[name="email"]')!.value = "gran@example.com";
    });
    await expect(page.getByTestId("contribute-count")).toHaveText("17 of 140");
    await expect(page.getByTestId("contribute-wants-email")).toBeChecked();
    await expect(page.getByTestId("contribute-email")).toBeVisible();
    await expect(page.getByTestId("contribute-email")).toHaveValue("gran@example.com");
  });

  test("ticked with no address: the page asks for it instead of quietly sending none", async ({ page }) => {
    const asked = await answer(page, "**/api/group/contribute", { status: 200, body: { ok: true, withdraw: "w".repeat(32) } });
    await page.goto(PREVIEW);
    await write(page);
    await page.getByTestId("contribute-wants-email").check();
    await page.getByTestId("contribute-submit").click();
    await expect(page.getByTestId("contribute-form").getByRole("alert")).toHaveText("Add your email, or untick the box.");
    // The field it is about has the cursor.
    await expect(page.getByTestId("contribute-email")).toBeFocused();
    expect(asked).toHaveLength(0);
    // Unticking is the other way out, and clears the words.
    await page.getByTestId("contribute-wants-email").uncheck();
    await expect(page.getByTestId("contribute-form").getByRole("alert")).toHaveCount(0);
    await page.getByTestId("contribute-wants-email").check();
    await page.getByTestId("contribute-submit").click();
    await expect(page.getByTestId("contribute-form").getByRole("alert")).toHaveText("Add your email, or untick the box.");
    await page.getByTestId("contribute-email").fill("gran@example.com");
    await expect(page.getByTestId("contribute-form").getByRole("alert")).toHaveCount(0);
    await page.getByTestId("contribute-submit").click();
    await expect(page.getByTestId("contribute-done")).toContainText("Check your inbox to confirm your address.");
    expect(field(asked[0], "email")).toBe("gran@example.com");
  });

  test("the count sits under the note's box, never on its words, however long the note", async ({ page }) => {
    for (const [width, lang, note] of [
      [375, "en", LONG],
      [320, "en", LONG],
      [375, "es", "Cuarenta no es nada. Llámame cuando acabes de soplar las velas y trae al perro el domingo, que los niños le han pintado una pancarta.".padEnd(140, "W").slice(0, 140)],
    ] as const) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto(`${PREVIEW}?lang=${lang}`);
      await page.getByTestId("contribute-note").fill(note);
      const box = (await page.getByTestId("contribute-note").boundingBox())!;
      const count = (await page.getByTestId("contribute-count").boundingBox())!;
      // Wholly below the box: a note that scrolls inside it has nothing laid over it.
      expect(count.y, `${width} ${lang}`).toBeGreaterThanOrEqual(box.y + box.height);
      expect(count.x + count.width).toBeLessThanOrEqual(box.x + box.width + 1);
      expect(await page.getByTestId("contribute-note").evaluate((el) => getComputedStyle(el).paddingBottom === getComputedStyle(el).paddingTop)).toBe(true);
      await expect(page.getByTestId("contribute-count")).toHaveText(/^140 (of|de) 140$/);
      // The box really does scroll here (the case that used to overprint), and the count is still clear of it.
      expect(await page.getByTestId("contribute-note").evaluate((el) => el.scrollHeight > el.clientHeight), `${width} ${lang} scrolls`).toBe(true);
    }
  });

  test("a photo that can't be used is said at the photo button, not under the send button", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(PREVIEW);
    await page.getByTestId("contribute-photo-input").setInputFiles({ name: "scan.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 not a picture") });
    const words = page.getByTestId("contribute-photo-problem");
    await expect(words).toHaveText("That photo couldn't be used. Try a JPEG or a PNG.");
    await expect(words).toBeInViewport({ ratio: 1 });
    const [said, button, send] = [await words.boundingBox(), await page.getByTestId("contribute-photo-add").boundingBox(), await page.getByTestId("contribute-submit").boundingBox()];
    expect(said!.y).toBeGreaterThanOrEqual(button!.y + button!.height);
    expect(said!.y + said!.height).toBeLessThan(send!.y);
    // Said once: nothing about it under the send button.
    await expect(page.getByTestId("contribute-form").getByRole("alert")).toHaveCount(1);
    // Picking a real one clears it.
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4AWP8z8Dwn4EIwDiqEF8oAQBf9AoL/k2KLAAAAABJRU5ErkJggg==", "base64");
    await page.getByTestId("contribute-photo-input").setInputFiles({ name: "us.png", mimeType: "image/png", buffer: png });
    await expect(page.getByTestId("contribute-photo")).toBeVisible();
    await expect(words).toHaveCount(0);
  });

  test("a photo the server refuses is said at the photo too, and other refusals stay under the send button", async ({ page }) => {
    await answer(page, "**/api/group/contribute", { status: 413, body: { error: "too_large" } });
    await page.goto(PREVIEW);
    await write(page);
    await page.getByTestId("contribute-submit").click();
    await expect(page.getByTestId("contribute-photo-problem")).toHaveText("That photo is too big. Try a smaller one.");
    await expect(page.getByTestId("contribute-photo-problem")).toBeInViewport();
    // A card that takes no photos has no photo button to say it at.
    await page.goto(`${PREVIEW}?photos=0`);
    await write(page);
    await page.getByTestId("contribute-submit").click();
    await expect(page.getByTestId("contribute-photo-problem")).toHaveCount(0);
    await expect(page.getByTestId("contribute-form").getByRole("alert")).toHaveText("That photo is too big. Try a smaller one.");
  });

  test("a card that takes no photos does not ask anyone to agree to a photo being seen", async ({ page }) => {
    await page.goto(`${PREVIEW}?photos=0&prompt=`);
    await expect(page.getByTestId("contribute-photo-add")).toHaveCount(0);
    await expect(page.getByTestId("contribute-form")).toContainText("Tom will see your name and note and choose whether they go in.");
    await expect(page.getByTestId("contribute-form")).not.toContainText(/photo/i);
    await page.goto(`${PREVIEW}?photos=0&lang=es`);
    await expect(page.getByTestId("contribute-form")).toContainText("Tomás verá tu nombre y tu nota, y decide si entran en la tarjeta.");
    await expect(page.getByTestId("contribute-form")).not.toContainText(/foto/i);
    // One that does take them still says so.
    await page.goto(PREVIEW);
    await expect(page.getByTestId("contribute-form")).toContainText("Tom will see your name, note and photo and choose whether they go in.");
  });

  test("the keyboard's focus can be seen on both tick boxes", async ({ page, isMobile }) => {
    test.skip(isMobile, "a keyboard's focus ring is a desktop matter");
    await page.goto(PREVIEW);
    await page.getByTestId("contribute-photo-add").focus();
    for (const id of ["contribute-wants-email", "contribute-agree"]) {
      await page.keyboard.press("Tab");
      await expect(page.getByTestId(id)).toBeFocused();
      const ratio = await page.getByTestId(id).evaluate((box) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        const luminance = (color: string) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
          const linear = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
          return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
        };
        const style = getComputedStyle(box);
        if (style.outlineStyle === "none" || parseFloat(style.outlineWidth) < 2) return 0;
        const [ring, ground] = [luminance(style.outlineColor), luminance(getComputedStyle(document.querySelector('[data-testid="contribute"]')!).backgroundColor)];
        return (Math.max(ring, ground) + 0.05) / (Math.min(ring, ground) + 0.05);
      });
      // It was near black on the night ground (1.1 to 1). A focus ring needs 3 to 1.
      expect(ratio, id).toBeGreaterThanOrEqual(3);
    }
  });

  test("someone whose note is already in never sees the empty form first, even before the page's script has run", async ({ page }) => {
    await answer(page, "**/api/group/contribute", { status: 200, body: { ok: true, withdraw: "w".repeat(32) } });
    await page.goto(PREVIEW);
    await write(page);
    await page.getByTestId("contribute-submit").click();
    await expect(page.getByTestId("contribute-done")).toBeVisible();

    // They come back on a slow phone: the page's script never arrives in this test, so what is
    // drawn is what they would be looking at for however long it takes.
    await page.route("**/_next/static/**", (route) => (route.request().resourceType() === "script" ? route.abort() : route.continue()));
    await page.goto(PREVIEW, { waitUntil: "commit" });
    await page.waitForSelector('[data-testid="contribute-form"]', { state: "attached" });
    await expect(page.getByTestId("contribute-form")).toBeHidden();
    await expect(page.getByRole("heading", { name: "Add your note for Nora" })).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.hasAttribute("data-group-kept"))).toBe(true);
    // The frame they do see is the page's own: its mark and its report link, nothing claiming anything.
    await expect(page.getByTestId("contribute-report")).toBeVisible();

    // With the script, the page lands on their note, with the way to take it back.
    await page.unroute("**/_next/static/**");
    await page.goto(PREVIEW);
    await expect(page.getByTestId("contribute-done")).toContainText("Your note is with Tom.");
    await expect(page.getByTestId("contribute-take-back")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.hasAttribute("data-group-kept"))).toBe(false);
    // "Add another note" still opens the form: nothing is left hiding it.
    await page.getByTestId("contribute-another").click();
    await expect(page.getByTestId("contribute-name")).toBeVisible();
  });

  test("a first-time visitor has the form from the first frame, script or no script", async ({ page }) => {
    await page.route("**/_next/static/**", (route) => (route.request().resourceType() === "script" ? route.abort() : route.continue()));
    await page.goto(PREVIEW, { waitUntil: "commit" });
    await page.waitForSelector('[data-testid="contribute-form"]', { state: "attached" });
    await expect(page.getByTestId("contribute-name")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Add your note for Nora" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.hasAttribute("data-group-kept"))).toBe(false);
    // Typed before the page is live, and still there.
    await page.getByTestId("contribute-name").fill("Gran");
    await expect(page.getByTestId("contribute-name")).toHaveValue("Gran");
  });

  test("an address that opens no card: with group cards on it says to ask for a new link; off, it is the site's own 'not found'", async ({ page }) => {
    // On: the one line, in the contribute page's dress, naming nobody.
    await page.goto(`${PREVIEW}?state=gone`);
    await expect(page.getByRole("heading", { name: "This link no longer works." })).toBeVisible();
    await expect(page.getByTestId("group-link-gone")).toContainText("Ask whoever sent it for a new one.");
    await expect(page.getByTestId("group-link-gone")).not.toContainText(/Tom|Nora|€|\$|£/);
    await expect(page.getByRole("link", { name: "Make a gift of your own" })).toHaveAttribute("href", "/templates?ref=group-contribute");
    expect((await page.getByRole("link", { name: "Make a gift of your own" }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.goto(`${PREVIEW}?state=gone&lang=es`);
    await expect(page.getByRole("heading", { name: "Este enlace ya no funciona." })).toBeVisible();
    await expect(page.getByTestId("group-link-gone")).toContainText("Pide uno nuevo a quien te lo envió.");

    // Off, as this server is: exactly the page every other missing address gets, light ground and all.
    const res = await page.goto(`/c/${TOKEN}`);
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "This page wandered off" })).toBeVisible();
    await expect(page.getByTestId("group-link-gone")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(/no longer works|group card/i);
    const there = await page.getByRole("heading", { name: "This page wandered off" }).evaluate((h) => getComputedStyle(h).color);
    await page.goto("/no-such-page-anywhere");
    const elsewhere = await page.getByRole("heading", { name: "This page wandered off" }).evaluate((h) => getComputedStyle(h).color);
    expect(there).toBe(elsewhere);
  });
});

test.describe("the sender's panel, used the way people use it", () => {
  test.beforeEach(async ({ request }) => needGroupPreviews(request));

  test("what the page at the link says can be seen, and changed after the link went out", async ({ page }) => {
    await answer(page, "**/api/group/find", { status: 200, body: { group: serverGroup({ forName: "Noar", prompt: "One line only you would know" }) } });
    const patches = await answer(page, `**/api/group/${GROUP_ID}`, (request) => {
      const body = request.postDataJSON() as { fromName?: string; forName?: string; prompt?: string | null };
      return { status: 200, body: { group: serverGroup({ fromName: body.fromName, forName: body.forName, prompt: body.prompt ?? null }) } };
    });
    await page.goto(`${PANEL}?state=active&live=1`);
    const row = page.getByTestId("group-page-words");
    await expect(row).toContainText("The page says Tom is putting a group card together for Noar. It asks: “One line only you would know”");
    await expect(page.getByTestId("group-edit-page")).toHaveAccessibleName("Edit what the page says");

    await page.getByTestId("group-edit-page").click();
    const form = page.getByTestId("group-page-form");
    await expect(form.getByLabel("Your name, as they know you")).toHaveValue("Tom");
    await expect(form.getByLabel("Who it's for")).toHaveValue("Noar");
    await expect(form.getByLabel("What should they write?")).toHaveValue("One line only you would know");
    // Both names are still needed.
    await form.getByLabel("Who it's for").fill("  ");
    await page.getByTestId("group-page-save").click();
    await expect(form.getByRole("alert")).toHaveText("Add both names first.");
    expect(patches).toHaveLength(0);

    await form.getByLabel("Who it's for").fill("Nora");
    await form.getByLabel("What should they write?").fill("");
    await page.getByTestId("group-page-save").click();
    await expect(page.getByTestId("group-page-form")).toHaveCount(0);
    await expect(row).toHaveText(/The page says Tom is putting a group card together for Nora\.\s*Edit/);
    expect(patches).toHaveLength(1);
    expect(patches[0].method()).toBe("PATCH");
    // The words only: the link itself is not reset, closed or extended by fixing a name.
    expect(patches[0].postDataJSON()).toEqual({ fromName: "Tom", forName: "Nora", prompt: null });
    // The words people are sent follow.
    expect(decodeURIComponent((await page.getByTestId("group-whatsapp").getAttribute("href")) ?? "")).toContain("Tom is making a group card for Nora.");
  });

  test("changing what the page says can be cancelled, and a failure is said in the form with what was typed kept", async ({ page }) => {
    await answer(page, "**/api/group/find", { status: 200, body: { group: serverGroup() } });
    await answer(page, `**/api/group/${GROUP_ID}`, { status: 502, body: { error: "failed" } });
    await page.goto(`${PANEL}?state=active&live=1`);
    await page.getByTestId("group-edit-page").click();
    const form = page.getByTestId("group-page-form");
    await form.getByLabel("Who it's for").fill("Norah");
    await page.getByTestId("group-page-save").click();
    await expect(form.getByRole("alert")).toHaveText("The page couldn't be changed. Try again in a moment.");
    await expect(form.getByLabel("Who it's for")).toHaveValue("Norah");
    await expect(page.getByTestId("group-page-save")).toBeEnabled();
    await form.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByTestId("group-page-words")).toContainText("for Nora.");
    await expect(page.getByTestId("group-error")).toHaveCount(0);
  });

  test("a link that takes no notes says so on itself, and offers nothing to share it with", async ({ page }) => {
    await page.goto(`${PANEL}?state=closed`);
    await expect(page.getByTestId("group-link")).toHaveAttribute("data-link", "closed");
    await expect(page.getByTestId("group-link-state")).toHaveText("Closed");
    for (const id of ["group-copy", "group-share", "group-whatsapp"]) await expect(page.getByTestId(id)).toHaveCount(0);
    // The address is still there to be read, and the way to reopen it is with the link's controls.
    await expect(page.getByTestId("group-url")).toHaveText("tryethos.io/c/previewPreviewPreview0");
    await expect(page.getByTestId("group-close")).toHaveText("Reopen the link");

    await page.goto(`${PANEL}?state=ranout`);
    await expect(page.getByTestId("group-link")).toHaveAttribute("data-link", "ran-out");
    await expect(page.getByTestId("group-link-state")).toHaveText("Ran out");
    await expect(page.getByTestId("group-copy")).toHaveCount(0);

    await page.goto(`/es${PANEL}?state=closed`);
    await expect(page.getByTestId("group-link-state")).toHaveText("Cerrado");
    await page.goto(`/es${PANEL}?state=ranout`);
    await expect(page.getByTestId("group-link-state")).toHaveText("Caducado");

    // An open link carries no such word and has its buttons.
    await page.goto(`${PANEL}?state=active`);
    await expect(page.getByTestId("group-link")).toHaveAttribute("data-link", "open");
    await expect(page.getByTestId("group-link-state")).toHaveCount(0);
    await expect(page.getByTestId("group-copy")).toBeVisible();
  });

  test("closing the link changes the block at the top at once, and reopening brings its buttons back without moving the notes", async ({ page }) => {
    await answer(page, "**/api/group/find", { status: 200, body: { group: serverGroup({}, [waitingEntry()]) } });
    await answer(page, `**/api/group/${GROUP_ID}`, (request) => ({ status: 200, body: { group: serverGroup({ closedAt: (request.postDataJSON() as { closed: boolean }).closed ? "2026-12-01T10:00:00.000Z" : null }, [waitingEntry()]) } }));
    await page.goto(`${PANEL}?state=active&live=1`);
    await expect(page.getByTestId("group-copy")).toBeVisible();
    await page.getByTestId("group-close").click();
    await expect(page.getByTestId("group-link-state")).toHaveText("Closed");
    await expect(page.getByTestId("group-copy")).toHaveCount(0);
    await page.getByTestId("group-close").click();
    await expect(page.getByTestId("group-link-state")).toHaveCount(0);
    await expect(page.getByTestId("group-copy")).toBeVisible();
  });

  test("the small label on the optional field is 12 px or more", async ({ page }) => {
    await page.goto(`${PANEL}?state=setup`);
    const size = await page.getByTestId("group-setup").getByText("Optional", { exact: true }).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(12);
    await expect(page.getByLabel("What should they write?")).toHaveAttribute("maxlength", "140");
  });
});

test.describe("the send screen for a draft that holds a group's notes, signed out", () => {
  test.beforeEach(async ({ request }) => needGroupPreviews(request));

  test("asks them to sign in: it never offers the guest's 'Pay and send', which would not send a group card", async ({ page }) => {
    const draft = {
      version: 1,
      slug: "group-reference",
      giftId: null,
      shortId: null,
      status: "draft",
      schedule: { enabled: false, timezone: "UTC" },
      password: "",
      removeWatermark: false,
      updatedAt: Date.now(),
      data: { version: 1, templateSlug: "group-reference", locale: "en", title: "", recipientName: "Nora", senderName: "Tom", message: "Forty looks good on you.", messageStyle: "fade", photos: [], accentColor: "#B4552D", fontPairing: "editorial", cover: "classic", showReactionCta: true, watermark: true, fields: {}, contributions: [{ key: "abcdefghij", name: "Gran", note: "Forty is nothing. Ring me." }] },
    };
    await page.addInitScript((value) => window.localStorage.setItem("ethos:draft:group-reference", value), JSON.stringify(draft));
    await page.goto("/create/group-reference?group=on");
    await expect(page.getByTestId("group-section").getByTestId("group-item")).toHaveCount(1);
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByTestId("publish-checklist")).toBeAttached();
    // A server with no accounts behind it (a bare worktree) says so and shows neither step: nothing to check there.
    test.skip((await sheet.getByText("Publishing needs Supabase").count()) > 0, "this server has no accounts: run it with the placeholder settings in docs/GROUP.md (Tests) to see the send screen's sign-in step");
    await expect(sheet.getByTestId("publish-sign-in")).toContainText("A group card is sent from an account, where its notes are kept.");
    await expect(sheet.getByTestId("pay-panel")).toHaveCount(0);
    await expect(sheet).not.toContainText(/Pay .* and send|Everything|second gift/i);
    await expect(sheet).not.toContainText(/€|\$|£/);
  });
});
