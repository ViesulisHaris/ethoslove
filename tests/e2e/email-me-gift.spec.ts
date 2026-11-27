import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * "Not ready to send? Email me this gift" (components/editor/email-me-gift.tsx), under a guest's pay
 * panel on a premium gift, and the two things the switches add beside it: the line under the
 * sign-in form and the privacy policy's paragraphs. The route that sends the email is answered
 * here, so no email is sent and nothing is asked of Supabase or Resend.
 *
 * The switches are read at build time: the first group runs only against a server started with
 * NEXT_PUBLIC_EMAIL_ME_GIFT=1 (and the same variable given to this run), the last only without it.
 * SHOTS=<folder> saves pictures of each state.
 */
const ON = process.env.NEXT_PUBLIC_EMAIL_ME_GIFT === "1";
const REMINDER_ON = Boolean(process.env.NEXT_PUBLIC_UNSENT_GIFT_EMAILS);
const SHOTS = process.env.SHOTS;

const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
};

async function openSheet(page: Page) {
  await page.goto("/create/bouquet");
  await expect(page.getByLabel("Their name")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Their name").fill("Leo");
  await page.getByLabel("Your name").fill("Mia");
  await page.getByLabel("Message", { exact: true }).fill("For every Sunday morning.");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByTestId("pay-panel")).toBeVisible();
  return sheet;
}

async function answerLater(page: Page, status: number) {
  const asked: Record<string, unknown>[] = [];
  await page.route("**/api/gift/later", async (route) => {
    asked.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(status === 200 ? { ok: true } : { error: "x" }) });
  });
  return asked;
}

test.describe("a guest who isn't ready to pay", () => {
  test.skip(!ON, "the server wasn't built with NEXT_PUBLIC_EMAIL_ME_GIFT=1");

  test("asks for the gift by email: one field, what happens next, then a confirmation", async ({ page }) => {
    const asked = await answerLater(page, 200);
    const sheet = await openSheet(page);
    const link = sheet.getByTestId("email-me-gift-link");
    await expect(link).toHaveText("Not ready to send? Email me this gift");
    await link.scrollIntoViewIfNeeded();
    await shot(page, "1-link");
    await link.click();

    const form = sheet.getByTestId("email-me-gift");
    await expect(form).toContainText("Finish it later");
    await expect(form).toContainText("It stays saved on this phone.");
    await expect(form).toContainText("Opening it signs you in to an Ethos account with this address");
    await expect(form).toContainText("we remind you once");
    await expect(form.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/legal/privacy");
    await form.getByLabel("Your email address").fill("mia@example.org");
    await form.scrollIntoViewIfNeeded();
    await shot(page, "2-form");
    await form.getByRole("button", { name: "Email it to me" }).click();

    const done = sheet.getByTestId("email-me-gift-sent");
    await expect(done).toContainText("Sent. Open the link on this phone, in this browser, to pick your gift up again.");
    await done.scrollIntoViewIfNeeded();
    await shot(page, "3-sent");
    // The address, the template and the language: nothing of the gift.
    expect(asked).toEqual([{ email: "mia@example.org", slug: "bouquet", locale: "en" }]);
    // The pay panel is still there to pay from.
    await expect(sheet.getByTestId("pay-panel")).toBeVisible();
  });

  test("says so when it didn't go through, and lets them try again", async ({ page }) => {
    await answerLater(page, 400);
    const sheet = await openSheet(page);
    await sheet.getByTestId("email-me-gift-link").click();
    const form = sheet.getByTestId("email-me-gift");
    await form.getByLabel("Your email address").fill("mia@example.org");
    await form.getByRole("button", { name: "Email it to me" }).click();
    await expect(form.getByRole("alert")).toHaveText("That didn’t go through. Check the address and try again.");
    await expect(form.getByRole("button", { name: "Email it to me" })).toBeEnabled();
  });

  test("says to wait when too many were asked for from here", async ({ page }) => {
    await answerLater(page, 429);
    const sheet = await openSheet(page);
    await sheet.getByTestId("email-me-gift-link").click();
    const form = sheet.getByTestId("email-me-gift");
    await form.getByLabel("Your email address").fill("mia@example.org");
    await form.getByRole("button", { name: "Email it to me" }).click();
    await expect(form.getByRole("alert")).toHaveText("Too many tries from here. Try again in an hour.");
  });

  test("sends nothing for an address the browser can tell is not one", async ({ page }) => {
    const asked = await answerLater(page, 200);
    const sheet = await openSheet(page);
    await sheet.getByTestId("email-me-gift-link").click();
    const form = sheet.getByTestId("email-me-gift");
    await form.getByLabel("Your email address").fill("mia");
    await form.getByRole("button", { name: "Email it to me" }).click();
    await expect(sheet.getByTestId("email-me-gift-sent")).toHaveCount(0);
    expect(asked).toEqual([]);
  });

  test("is in Spanish on the Spanish editor", async ({ page }) => {
    await answerLater(page, 200);
    await page.goto("/es/create/bouquet");
    await expect(page.getByLabel("Su nombre")).toBeVisible({ timeout: 30_000 });
    await page.getByLabel("Su nombre").fill("Leo");
    await page.getByLabel("Tu nombre").fill("Mia");
    await page.getByLabel("Mensaje", { exact: true }).fill("Por cada domingo.");
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByTestId("email-me-gift-link").click();
    await expect(sheet.getByTestId("email-me-gift")).toContainText("Termínalo más tarde");
  });

  test("the privacy policy describes the email while it is on", async ({ page }) => {
    await page.goto("/legal/privacy");
    await expect(page.getByText("“Email me this gift”: if you aren't signed in", { exact: false })).toBeVisible();
  });
});

test.describe("the reminder's notices", () => {
  test.skip(!REMINDER_ON, "the server wasn't built with NEXT_PUBLIC_UNSENT_GIFT_EMAILS");

  test("the sign-in form says an unsent gift is remembered once", async ({ page }) => {
    await page.goto("/login");
    const note = page.getByTestId("unsent-note");
    await expect(note).toHaveText("If you leave a gift unsent, we email you once to remind you. The email has a link to stop these.");
    await note.scrollIntoViewIfNeeded();
    await shot(page, "4-sign-in-note");
  });

  test("the privacy policy describes the reminder", async ({ page }) => {
    await page.goto("/legal/privacy");
    await expect(page.getByText("The reminder about an unsent gift: if you are signed in", { exact: false })).toBeVisible();
  });
});

test.describe("switched off, as it ships", () => {
  test.skip(ON || REMINDER_ON, "the server was built with a switch on");

  test("a guest's pay panel has no such link, the sign-in form no such line, the policy no such paragraph", async ({ page }) => {
    const sheet = await openSheet(page);
    await expect(sheet.getByTestId("email-me-gift-link")).toHaveCount(0);
    await page.goto("/login");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.getByTestId("unsent-note")).toHaveCount(0);
    await page.goto("/legal/privacy");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.getByText("Email me this gift", { exact: false })).toHaveCount(0);
    await expect(page.getByText("The reminder about an unsent gift", { exact: false })).toHaveCount(0);
  });
});
