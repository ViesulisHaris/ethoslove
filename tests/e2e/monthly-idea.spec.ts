import { expect, test, type Page } from "@playwright/test";

/**
 * The monthly idea's pieces on the send sheet, the share screen and the account page
 * (lib/lifecycle/monthly-idea.ts, PLAN-monthly 4.2). Nothing here can sign in or publish (a worktree
 * has no database), so the pieces are drawn by the development page /monthly-idea/preview and every
 * route they call is answered by the test. B1 and B10 open the real editor as a guest.
 */

async function mode(page: Page): Promise<string> {
  const res = await page.request.get("/monthly-idea/preview");
  test.skip(res.status() === 404, "/monthly-idea/preview is development-only: a production build answers 404");
  return /data-idea-mode="(\w+)"/.exec(await res.text())?.[1] ?? "off";
}

async function needMode(page: Page, ...wanted: string[]) {
  const found = await mode(page);
  test.skip(!wanted.includes(found), `needs MONTHLY_IDEA_EMAILS=${wanted.join(" or ")}; this server runs with "${found}" (start it with the setting, see PLAN-monthly section 5)`);
}

async function openEditorSheet(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByLabel("Their name")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Their name").fill("Leo");
  await page.getByLabel("Your name").fill("Mia");
  await page.getByLabel("Message", { exact: true }).fill("For every Sunday morning.");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  test.skip((await sheet.getByText("Publishing needs Supabase").count()) > 0, "this server has no accounts: run it with NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=x to see the guest's send sheet");
  return sheet;
}

/** Answers POST /api/monthly-idea, recording each body; `fail` answers 500. */
async function answerSwitch(page: Page, { fail = false } = {}) {
  const bodies: unknown[] = [];
  await page.route("**/api/monthly-idea", async (route) => {
    if (route.request().method() !== "POST") return route.fulfill({ json: { state: "on" } });
    const body = route.request().postDataJSON() as { on: boolean };
    bodies.push(body);
    if (fail) return route.fulfill({ status: 500, json: { error: "save_failed" } });
    return route.fulfill({ json: { state: body.on ? "on" : "off" } });
  });
  return bodies;
}

test.describe("with the setting off", () => {
  test("B1 the send screen is as it was", async ({ page }) => {
    await needMode(page, "off");
    for (const path of ["/create/the-letter", "/create/bouquet"]) {
      const sheet = await openEditorSheet(page, path);
      await expect(sheet.getByTestId("free-terms")).toHaveCount(0);
      await expect(sheet.getByTestId("idea-where")).toHaveCount(0);
    }
  });
});

test.describe("the share screen's line", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/offer/emails", (route) => route.fulfill({ json: { on: false } }));
  });

  test("B2 says it once, and one tap turns it off and back on", async ({ page }) => {
    const bodies = await answerSwitch(page);
    await page.goto("/monthly-idea/preview?part=share");
    const notice = page.getByTestId("idea-notice");
    await expect(notice).toContainText("Starting next month, we’ll email you one gift idea a month for a year.");
    await notice.getByRole("button", { name: "Don’t send these" }).click();
    await expect(notice).toContainText("Off. We won’t send them.");
    await expect(notice.getByRole("button")).toHaveText("Undo");
    expect(bodies).toEqual([{ on: false }]);
    await notice.getByRole("button", { name: "Undo" }).click();
    await expect(notice).toContainText("Starting next month");
    expect(bodies).toEqual([{ on: false }, { on: true }]);
  });

  test("B3 in Spanish", async ({ page }) => {
    await answerSwitch(page);
    await page.goto("/es/monthly-idea/preview?part=share");
    const notice = page.getByTestId("idea-notice");
    await expect(notice).toContainText("A partir del mes que viene te enviaremos una idea de regalo al mes durante un año.");
    await notice.getByRole("button", { name: "No quiero recibirlas" }).click();
    await expect(notice).toContainText("Desactivado. No te las enviaremos.");
    await expect(notice.getByRole("button")).toHaveText("Deshacer");
  });

  test("B4 fits a phone", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile-chrome", "a phone's widths");
    await answerSwitch(page);
    for (const size of [
      { width: 375, height: 812 },
      { width: 320, height: 568 },
    ]) {
      await page.setViewportSize(size);
      await page.goto("/monthly-idea/preview?part=share");
      const notice = page.getByTestId("idea-notice");
      await expect(notice).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      const button = await notice.getByRole("button").boundingBox();
      expect(button!.height).toBeGreaterThanOrEqual(44);
      const line = await notice.boundingBox();
      const box = await page.getByTestId("offer-emails-box").boundingBox();
      expect(line!.y + line!.height).toBeLessThanOrEqual(box!.y);
    }
  });

  test("B5 a failed save puts it back and says so", async ({ page }) => {
    await answerSwitch(page, { fail: true });
    await page.goto("/monthly-idea/preview?part=share");
    const notice = page.getByTestId("idea-notice");
    await notice.getByRole("button", { name: "Don’t send these" }).click();
    await expect(page.getByText("Couldn’t save that.", { exact: false })).toBeVisible();
    await expect(notice).toContainText("Starting next month");
    await expect(notice.getByRole("button")).toHaveText("Don’t send these");
  });

  test("B6 no line without one, and the box's sentence follows the setting", async ({ page }) => {
    const posted: unknown[] = [];
    await page.unroute("**/api/offer/emails");
    await page.route("**/api/offer/emails", async (route) => {
      if (route.request().method() === "POST") {
        posted.push(route.request().postDataJSON());
        return route.fulfill({ json: { on: true } });
      }
      return route.fulfill({ json: { on: false } });
    });
    await page.goto("/monthly-idea/preview?part=share&notice=0");
    await expect(page.getByTestId("idea-notice")).toHaveCount(0);
    await expect(page.getByTestId("offer-emails")).toContainText("Email me Ethos offers, like early Black Friday prices.");
    await page.getByTestId("offer-emails-box").check();
    await expect.poll(() => posted.length).toBe(1);
    expect(posted[0]).toEqual({ on: true, locale: "en" });

    await page.goto("/monthly-idea/preview?part=share&notice=0&box=idea");
    await expect(page.getByTestId("offer-emails")).toContainText("Email me Ethos offers and one gift idea a month. I can unsubscribe any time.");
    await page.getByTestId("offer-emails-box").check();
    await expect.poll(() => posted.length).toBe(2);
    expect(posted[1]).toEqual({ on: true, locale: "en", idea: true });
  });
});

test.describe("the free version's Terms box", () => {
  test("B7 a free gift waits for the box", async ({ page }) => {
    await page.goto("/monthly-idea/preview?part=terms");
    const send = page.getByTestId("terms-send");
    await expect(send).toHaveAttribute("aria-disabled", "true");
    // Playwright waits for an aria-disabled button to be enabled; a finger doesn't, and that tap is the point.
    await send.click({ force: true });
    // The page's own alert, not Next's route announcer (also role="alert", always empty here).
    const nudge = page.getByRole("alert").filter({ hasText: /\S/ });
    await expect(nudge).toHaveText("Tick the box to send the free version.");
    await expect(nudge).toHaveAttribute("id", "free-terms-nudge");
    await expect(page.getByTestId("free-terms-box")).toBeFocused();
    await expect(page.getByTestId("terms-sent")).toHaveCount(0);
    await page.getByTestId("free-terms-box").check();
    await expect(page.getByTestId("free-terms-nudge")).toHaveCount(0);
    await expect(send).not.toHaveAttribute("aria-disabled", "true");
    await send.click();
    await expect(page.getByTestId("terms-sent")).toBeVisible();
  });

  test("B8 by keyboard", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-chrome", "a keyboard");
    await page.goto("/monthly-idea/preview?part=terms");
    const box = page.getByTestId("free-terms-box");
    await box.focus();
    await expect(box).toBeFocused();
    expect(await box.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none");
    await page.keyboard.press("Space");
    await expect(box).toBeChecked();
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("free-terms-link")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("terms-send")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("terms-sent")).toBeVisible();
  });

  test("B9 the Terms link goes to the Terms, in the page's language", async ({ page }) => {
    await page.goto("/monthly-idea/preview?part=terms");
    const en = page.getByTestId("free-terms-link");
    await expect(en).toHaveAttribute("href", /\/legal\/terms$/);
    await expect(en).toHaveAttribute("target", "_blank");
    await page.goto("/es/monthly-idea/preview?part=terms");
    await expect(page.getByTestId("free-terms-link")).toHaveAttribute("href", /\/es\/legal\/terms$/);
    await expect(page.getByTestId("free-terms")).toContainText("Acepto los Términos");
  });
});

test.describe("where the address is given", () => {
  test("B10 the sentence where the address is given", async ({ page }) => {
    const found = await mode(page);
    test.skip(found !== "all" && found !== "buyers", `needs MONTHLY_IDEA_EMAILS=all or buyers; this server runs with "${found}"`);
    const paid = await openEditorSheet(page, "/create/bouquet");
    // The guest's pay panel needs Stripe; a server without it asks a guest to sign in instead.
    if ((await paid.getByTestId("pay-panel").count()) > 0) await expect(paid.getByTestId("pay-panel").getByTestId("idea-where")).toBeVisible();
    else await expect(paid.getByTestId("publish-sign-in").getByTestId("idea-where")).toHaveCount(found === "all" ? 1 : 0);
    const free = await openEditorSheet(page, "/create/the-letter");
    const signIn = free.getByTestId("publish-sign-in");
    await expect(signIn).toBeVisible();
    await expect(signIn.getByTestId("idea-where")).toHaveCount(found === "all" ? 1 : 0);
  });
});

test.describe("the account page's row", () => {
  test("B11 turns it off and on", async ({ page }) => {
    const bodies = await answerSwitch(page);
    await page.goto("/monthly-idea/preview?part=account");
    const row = page.getByTestId("idea-emails");
    await expect(row).toContainText("One gift idea a month");
    await row.getByRole("button", { name: "Stop them" }).click();
    await expect(row).toContainText("Off. We won’t send them.");
    const back = row.getByRole("button", { name: "Turn them back on" });
    await expect(back).toHaveAttribute("aria-pressed", "false");
    expect(bodies).toEqual([{ on: false }]);
    await back.click();
    await expect(row).toContainText("By email, for a year after your last gift.");
    await expect(row.getByRole("button", { name: "Stop them" })).toHaveAttribute("aria-pressed", "true");
    expect(bodies).toEqual([{ on: false }, { on: true }]);
  });

  test("B12 says when it couldn't save", async ({ page }) => {
    await answerSwitch(page, { fail: true });
    await page.goto("/monthly-idea/preview?part=account");
    const row = page.getByTestId("idea-emails");
    await row.getByRole("button", { name: "Stop them" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveText("Couldn’t save that. Try again in a moment.");
    await expect(row).toContainText("By email, for a year after your last gift.");
  });
});
