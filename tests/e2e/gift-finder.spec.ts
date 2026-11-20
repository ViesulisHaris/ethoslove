import { expect, test, type Page } from "@playwright/test";

/**
 * The gift finder end to end (/gifts/finder): three answers, three picks with a sentence each, a
 * link that can be sent, Back through the questions, the demo, and the editor it ends in. Both
 * projects run it, so every flow is walked on a phone and on a desktop.
 */
const picks = (page: Page) => page.locator('ol[aria-labelledby="finder-picks"] > li');
const names = (page: Page) => picks(page).locator("h3").allTextContents();
const question = (page: Page, text: string) => page.getByRole("heading", { level: 2, name: text });
const search = (page: Page) => new URL(page.url()).search;

test.describe("the gift finder", () => {
  test("three answers end on three ranked gifts, and the answers are the address", async ({ page }) => {
    await page.goto("/gifts/finder");
    await expect(page.getByRole("heading", { level: 1, name: "Which digital gift should you send?" })).toBeVisible();
    await expect(page.getByText("Question 1 of 3")).toBeVisible();
    await expect(question(page, "Who is it for?")).toBeVisible();

    await page.getByRole("button", { name: "My mom", exact: true }).click();
    await expect(question(page, "What's the occasion?")).toBeVisible();
    expect(search(page)).toBe("?for=mom");
    // The next question has the focus, for a keyboard and a screen reader.
    await expect(question(page, "What's the occasion?")).toBeFocused();

    await page.getByRole("button", { name: "Birthday", exact: true }).click();
    await expect(question(page, "What should it feel like?")).toBeVisible();
    expect(search(page)).toBe("?for=mom&occasion=birthday");

    await page.getByRole("button", { name: /^Sentimental/ }).click();
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    expect(search(page)).toBe("?for=mom&occasion=birthday&feel=sentimental");
    await expect(picks(page)).toHaveCount(3);
    expect(await names(page)).toEqual(["Pop-up Card", "Recipe Box", "Sketchbook"]);

    // Each pick: its place, the gallery's mark, a sentence written for a mother, the demo and the editor.
    const first = picks(page).first();
    await expect(first.getByText("01", { exact: true })).toBeVisible();
    await expect(first.getByText("Premium", { exact: true })).toBeVisible();
    await expect(first.getByText("The nearest thing to the card you would have posted.", { exact: false })).toBeVisible();
    await expect(first.getByRole("button", { name: "Watch it: Pop-up Card" })).toBeVisible();
    await expect(first.getByRole("link", { name: "Make this gift" })).toHaveAttribute("href", "/create/popup-card?ref=finder");
    await expect(picks(page).nth(1).getByText("Write her as a recipe", { exact: false })).toBeVisible();

    // One address for search engines, whatever the answers.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/gifts\/finder$/);

    // The three answers are buttons that ask their question again.
    await expect(page.getByRole("button", { name: "My mom Change: Who is it for?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Birthday Change: What's the occasion?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sentimental Change: What should it feel like?" })).toBeVisible();
  });

  test("Back walks back through the questions, and forward again", async ({ page }) => {
    await page.goto("/gifts/finder");
    await page.getByRole("button", { name: "My girlfriend", exact: true }).click();
    await page.getByRole("button", { name: "Anniversary", exact: true }).click();
    await page.getByRole("button", { name: /^Romantic/ }).click();
    await expect(question(page, "Three gifts that fit")).toBeVisible();

    await page.goBack();
    await expect(question(page, "What should it feel like?")).toBeVisible();
    expect(search(page)).toBe("?for=girlfriend&occasion=anniversary");
    await page.goBack();
    await expect(question(page, "What's the occasion?")).toBeVisible();
    await page.goBack();
    await expect(question(page, "Who is it for?")).toBeVisible();
    expect(search(page)).toBe("");
    await page.goForward();
    await page.goForward();
    await page.goForward();
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    await expect(picks(page)).toHaveCount(3);
  });

  test("an answer can be changed without starting over", async ({ page }) => {
    await page.goto("/gifts/finder?for=girlfriend&occasion=anniversary&feel=romantic");
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    const before = await names(page);
    await page.getByRole("button", { name: "Change: Who is it for?" }).click();
    await expect(question(page, "Who is it for?")).toBeVisible();
    expect(search(page)).toBe("?occasion=anniversary&feel=romantic");
    await page.getByRole("button", { name: "My dad", exact: true }).click();
    // The other two answers were kept: straight back to picks, and different ones.
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    expect(search(page)).toBe("?for=dad&occasion=anniversary&feel=romantic");
    expect(await names(page)).not.toEqual(before);
  });

  test("a result link opens on the picks in someone else's browser", async ({ page, browser, baseURL, browserName }) => {
    await page.goto("/gifts/finder?for=best-friend&occasion=birthday&feel=funny");
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    const mine = await names(page);
    expect(mine).toContain("Party Animals");

    // The copy button hands over the address with the answers, and says so.
    let link = `${new URL(baseURL ?? "http://localhost:3000").origin}/gifts/finder?for=best-friend&occasion=birthday&feel=funny`;
    if (browserName === "chromium") {
      await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.getByRole("button", { name: "Copy the link to these picks" }).click();
      await expect(page.getByText("Link copied")).toBeVisible();
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      expect(copied).toBe(link);
      link = copied;
    }

    const origin = new URL(baseURL ?? "http://localhost:3000").origin;
    const friend = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
    const theirs = await friend.newPage();
    const errors: string[] = [];
    theirs.on("console", (message) => (message.type() === "error" ? errors.push(message.text()) : undefined));
    theirs.on("pageerror", (error) => errors.push(String(error)));
    await theirs.goto(link);
    await expect(question(theirs, "Three gifts that fit")).toBeVisible();
    // Straight to the picks: the first question is not on the page, even for a moment after it settles.
    await expect(question(theirs, "Who is it for?")).toHaveCount(0);
    expect(await names(theirs)).toEqual(mine);
    // Nothing about arriving with answers upsets the page (a hydration mismatch would be logged).
    expect(errors.filter((e) => /hydrat|did not match|Minified React/i.test(e))).toEqual([]);
    await friend.close();
  });

  test("a broken or half-written link starts at the first question it leaves open", async ({ page }) => {
    await page.goto("/gifts/finder?for=alien&occasion=%3Cscript%3E&feel=42");
    await expect(question(page, "Who is it for?")).toBeVisible();

    await page.goto("/gifts/finder?occasion=christmas&feel=nonsense");
    await expect(question(page, "Who is it for?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Christmas Change: What's the occasion?" })).toBeVisible();
    await page.getByRole("button", { name: "My dad", exact: true }).click();
    // The occasion it did carry is kept: on to the third question.
    await expect(question(page, "What should it feel like?")).toBeVisible();
    expect(search(page)).toBe("?for=dad&occasion=christmas");

    await page.goto("/gifts/finder?for=wife&occasion=apology&feel=sentimental&more=banana");
    await expect(picks(page)).toHaveCount(3);
  });

  test("“Not sure” on every question still ends on three gifts", async ({ page }) => {
    await page.goto("/gifts/finder");
    for (const heading of ["Who is it for?", "What's the occasion?", "What should it feel like?"]) {
      await expect(question(page, heading)).toBeVisible();
      await page.getByRole("button", { name: "Not sure", exact: true }).click();
    }
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    expect(search(page)).toBe("?for=any&occasion=any&feel=any");
    expect(await names(page)).toEqual(["The Letter", "Bouquet", "Constellations"]);
  });

  test("the other occasions wait behind “Something else”, and a season's gifts only come when asked for", async ({ page }) => {
    await page.goto("/gifts/finder?for=someone");
    const more = page.getByRole("button", { name: "Something else" });
    await expect(more).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("button", { name: "Halloween", exact: true })).toBeHidden();
    await more.click();
    await expect(more).toHaveAttribute("aria-expanded", "true");
    for (const occasion of ["Wedding", "Graduation", "Thanksgiving", "Mother's Day", "Father's Day"]) await expect(page.getByRole("button", { name: occasion, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Halloween", exact: true }).click();
    await page.getByRole("button", { name: /^Funny/ }).click();
    await expect(picks(page)).toHaveCount(3);
    const halloween = await names(page);
    for (const name of halloween) expect(["Trick or Treat", "Witch's Brew", "Jack-o'-Lantern", "Haunted House", "The Séance", "Bat Swarm"]).toContain(name);

    // The same person and feeling at Christmas: not one of them.
    await page.goto("/gifts/finder?for=someone&occasion=christmas&feel=funny&more=20");
    await expect(picks(page).first()).toBeVisible();
    const christmas = await names(page);
    expect(christmas.slice(0, 3)).toEqual(["Gingerbread House", "The Nice List", "Unwrapped"]);
    for (const name of halloween) expect(christmas).not.toContain(name);
    // And a mother is never offered the couples' collages, however many she asks to see.
    await page.goto("/gifts/finder?for=mom&occasion=valentines&feel=romantic&more=20");
    await expect(picks(page).first()).toBeVisible();
    const forMom = await names(page);
    for (const name of ["XOXO", "Coquette", "Dark Romance", "Evergreen", "Snow Globe"]) expect(forMom).not.toContain(name);
    await expect(page.getByText("Those are all the gifts that fit these answers.")).toBeVisible();
  });

  test("three more, then start again", async ({ page }) => {
    await page.goto("/gifts/finder?for=boyfriend&occasion=just-because&feel=funny");
    await expect(picks(page)).toHaveCount(3);
    const three = await names(page);
    await page.getByRole("button", { name: "Show three more" }).click();
    await expect(picks(page)).toHaveCount(6);
    const six = await names(page);
    expect(six.slice(0, 3)).toEqual(three);
    expect(new Set(six).size).toBe(6);
    // The focus moved on to the first of the new three.
    await expect(picks(page).nth(3).getByRole("link", { name: "Make this gift" })).toBeFocused();
    // In the address, so coming Back from the editor finds the same six.
    expect(search(page)).toBe("?for=boyfriend&occasion=just-because&feel=funny&more=1");
    await page.reload();
    await expect(picks(page)).toHaveCount(6);

    await page.getByRole("button", { name: "Start again" }).click();
    await expect(question(page, "Who is it for?")).toBeVisible();
    expect(search(page)).toBe("");
    await page.goBack();
    await expect(picks(page)).toHaveCount(6);
  });

  test("“Watch it” plays the real template, and “Make this gift” lands in its editor", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/gifts/finder?for=wife&occasion=anniversary&feel=sentimental");
    await expect(picks(page)).toHaveCount(3);
    const name = (await names(page))[0];
    expect(name).toBe("The Letter");

    await page.getByRole("button", { name: `Watch it: ${name}` }).click();
    const demo = page.getByRole("dialog", { name: `${name}: live demo` });
    await expect(demo).toBeVisible();
    // The template itself, with its sample gift, inside the phone.
    await expect(demo.getByRole("button", { name: /tap the seal/i })).toBeVisible({ timeout: 30_000 });
    await expect(demo.getByRole("link", { name: "Make this gift" })).toHaveAttribute("href", "/create/the-letter?ref=finder");
    await page.keyboard.press("Escape");
    await expect(demo).toBeHidden();
    await expect(page.getByRole("button", { name: `Watch it: ${name}` })).toBeFocused();

    await picks(page).first().getByRole("link", { name: "Make this gift" }).click();
    // The editor is a big page for a dev server to build the first time it is asked for.
    await expect(page).toHaveURL(/\/create\/the-letter\?ref=finder$/, { timeout: 30_000 });
    await expect(page.getByLabel("Their name")).toBeVisible({ timeout: 30_000 });
    // Back from the editor: the same picks, not the first question.
    await page.goBack();
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    expect(await names(page)).toContain("The Letter");
  });

  test("works from the keyboard alone", async ({ page, isMobile }) => {
    test.skip(isMobile, "a phone has no Tab key");
    await page.goto("/gifts/finder");
    const first = page.getByRole("button", { name: "My girlfriend", exact: true });
    await first.focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "My boyfriend", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(question(page, "What's the occasion?")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Birthday", exact: true })).toBeFocused();
    await page.keyboard.press("Space");
    await expect(question(page, "What should it feel like?")).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(question(page, "Three gifts that fit")).toBeFocused();
    expect(search(page)).toBe("?for=boyfriend&occasion=birthday&feel=romantic");
    // The first stop after the heading is a pick's way into the editor, not its picture.
    await page.keyboard.press("Tab");
    await expect(picks(page).first().getByRole("link", { name: "Make this gift" })).toBeFocused();
  });

  test("in Spanish, from the first question to the editor's address", async ({ page }) => {
    await page.goto("/es/gifts/finder");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByRole("heading", { level: 1, name: "¿Qué regalo digital deberías enviar?" })).toBeVisible();
    await expect(page.getByText("Pregunta 1 de 3")).toBeVisible();
    await page.getByRole("button", { name: "Mi novia", exact: true }).click();
    await expect(question(page, "¿Cuál es la ocasión?")).toBeVisible();
    await page.getByRole("button", { name: "San Valentín", exact: true }).click();
    await expect(question(page, "¿Qué tono debería tener?")).toBeVisible();
    await page.getByRole("button", { name: /^Romántico/ }).click();
    await expect(question(page, "Tres regalos que encajan")).toBeVisible();
    // The same values in the address as in English: a link works in either language.
    expect(search(page)).toBe("?for=girlfriend&occasion=valentines&feel=romantic");
    await expect(picks(page)).toHaveCount(3);
    expect(await names(page)).toContain("XOXO");
    const xoxo = picks(page).filter({ has: page.getByRole("heading", { level: 3, name: "XOXO" }) });
    await expect(xoxo.getByText("Un sobre sellado con un beso de pintalabios", { exact: false })).toBeVisible();
    await expect(xoxo.getByText("Premium", { exact: true })).toBeVisible();
    await expect(xoxo.getByRole("link", { name: "Crear este regalo" })).toHaveAttribute("href", "/es/create/xoxo?ref=finder");
    await page.getByRole("button", { name: "Ver tres más" }).click();
    await expect(picks(page)).toHaveCount(6);
    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await expect(question(page, "¿Para quién es?")).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/es\/gifts\/finder$/);
  });

  test("with scripts off the page still asks its first question and links on", async ({ page }) => {
    await page.route("**/*.js", (route) => route.abort());
    await page.goto("/gifts/finder?for=mom&occasion=birthday&feel=funny");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Which digital gift should you send?");
    await expect(page.getByRole("heading", { level: 2, name: "Who is it for?" })).toBeAttached();
    await expect(page.getByRole("heading", { level: 2, name: "How the finder picks" })).toBeVisible();
    for (const href of ["/gifts/for-mom", "/gifts/for-best-friend", "/occasions/birthday", "/occasions/just-because", "/templates"]) {
      await expect(page.locator(`main a[href="${href}"]`).first()).toBeAttached();
    }
    const data = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("");
    expect(data).toContain('"BreadcrumbList"');
    expect(data).toContain("/gifts/finder");
  });

  test("fits a phone's width at every step", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the phone project's check");
    for (const query of ["", "?for=best-friend", "?for=best-friend&occasion=long-distance", "?for=best-friend&occasion=long-distance&feel=unusual&more=2"]) {
      for (const locale of ["", "/es"]) {
        await page.goto(`${locale}/gifts/finder${query}`);
        await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${locale}/gifts/finder${query}`).toBeLessThanOrEqual(0);
        // Everything that can be tapped is at least 44px tall.
        const small = await page.locator("section[aria-label] button:visible, section[aria-label] a:visible").evaluateAll((els) => els.filter((el) => el.getAttribute("aria-hidden") !== "true" && el.getBoundingClientRect().height < 43.5).map((el) => el.textContent));
        expect(small, `${locale}/gifts/finder${query}`).toEqual([]);
      }
    }
  });
});

test.describe("the ways into the finder", () => {
  test("from the front page's templates, the gifts page and the gallery", async ({ page }) => {
    for (const path of ["/", "/gifts", "/templates"]) {
      await page.goto(path);
      const link = page.locator("main").getByRole("link", { name: "Answer three questions" });
      await expect(link, path).toHaveCount(1);
      await expect(link, path).toHaveAttribute("href", "/gifts/finder");
      await expect(page.getByText("Not sure which?").first(), path).toBeVisible();
    }
    await page.goto("/es/templates");
    await expect(page.locator("main").getByRole("link", { name: "Responde tres preguntas" })).toHaveAttribute("href", "/es/gifts/finder");
    await page.locator("main").getByRole("link", { name: "Responde tres preguntas" }).click();
    await expect(page).toHaveURL(/\/es\/gifts\/finder$/);
    await expect(question(page, "¿Para quién es?")).toBeVisible();
  });

  test("the finder is in the sitemap, in both languages, and nowhere on a gift", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toMatch(/<loc>[^<]*\/gifts\/finder<\/loc>/);
    expect(sitemap).toMatch(/<loc>[^<]*\/es\/gifts\/finder<\/loc>/);
    const demo = await (await request.get("/demo/the-letter")).text();
    expect(demo).not.toContain("/gifts/finder");
  });
});
