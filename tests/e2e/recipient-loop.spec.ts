import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { asArrived, bring, endControls, playToEnd } from "./play-gift";

/**
 * The person who receives a gift makes the next one: the end screen's "or make one for someone
 * else", the step after a reaction, the two-line maker's mark, and the counts that say how often
 * each is used. A real gift needs a database, which a worktree doesn't have, so the gift is the
 * development-only /gift-preview (the real GiftExperience around a template's demo gift); on a
 * production build that page is a 404 and these skip. Vercel's script is only served on Vercel, so
 * the tests stand in for it and take down what the page hands to `window.va` (as arrival.spec.ts does).
 */

async function needGiftPreview(request: APIRequestContext) {
  const status = (await request.get("/gift-preview?template=the-letter")).status();
  test.skip(status === 404, "/gift-preview is development-only: a production build answers 404");
}

type Counted = { name: string; data: Record<string, unknown> };

async function countEvents(page: Page) {
  // In development Vercel's debug script does load, from its CDN, and takes `window.va` over a moment
  // after the page opens: a tap made later than that would go to it and not to the list below.
  await page.route(/va\.vercel-scripts\.com|\/_vercel\/(insights|speed-insights)\//, (route) => route.abort());
  await page.addInitScript(() => {
    const w = window as unknown as { __counted?: unknown[][]; va: (...args: unknown[]) => void };
    w.__counted ??= [];
    w.va = (...args: unknown[]) => {
      w.__counted!.push(args);
    };
  });
}

async function events(page: Page): Promise<Counted[]> {
  return page.evaluate(() =>
    ((window as unknown as { __counted?: unknown[][] }).__counted ?? [])
      .filter((call) => call[0] === "event")
      .map((call) => {
        const sent = call[1] as { name?: unknown; data?: Record<string, unknown> } | undefined;
        return { name: String(sent?.name), data: sent?.data ?? {} };
      }),
  );
}

/**
 * Every control on the end screen can be scrolled to and pressed, and is a thumb tall. "Scrolled to"
 * as a thumb scrolls, and "can be pressed" means all of it shows: nothing around it cuts a part off
 * (./play-gift.ts, `see`).
 */
async function expectAllReachable(page: Page, template: string, names: string[], where = "") {
  const { sideways, controls } = await endControls(page, template);
  expect(sideways, `the gift scrolls sideways${where}`).toBe(false);
  for (const name of names) expect(controls.map((c) => c.name), `the end screen has "${name}"${where}`).toContainEqual(expect.stringContaining(name));
  for (const control of controls) {
    expect(control.inside && control.hit, `"${control.name}" can be scrolled to and pressed${where}`).toBe(true);
    expect(control.height, `"${control.name}" is at least 44px tall${where}`).toBeGreaterThanOrEqual(44);
  }
}

/** The phones a stepped gift's card is smallest on: an iPhone SE or 8, a small Android, the first SE. */
const SMALL_PHONES = [
  { width: 375, height: 667 },
  { width: 360, height: 640 },
  { width: 320, height: 568 },
] as const;

/**
 * The phones most gifts are opened on, as the gift has them: an iPhone in Safari with its bars up
 * (390×664), an iPhone SE or 8, a small Android, an iPhone full screen, a Pixel.
 */
const USUAL_PHONES = [
  { width: 390, height: 664 },
  { width: 375, height: 667 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 412, height: 839 },
] as const;

/**
 * A stepped gift's end as a recipient first sees it: every link and button shows whole, nothing is
 * under a fade, there is nothing to scroll and so no arrow. `expectAllReachable` passes for an end
 * whose last three rows are out of sight; this does not.
 */
async function expectWholeOnArrival(page: Page, template: string, names: string[], where: string) {
  const seen = await asArrived(page, template);
  for (const name of names) expect(seen.controls.map((c) => c.name), `the end screen has "${name}"${where}`).toContainEqual(expect.stringContaining(name));
  for (const control of seen.controls) expect(control.whole, `"${control.name}" shows whole as the end arrives${where} (${control.cut} of its ${control.height}px do not)`).toBe(true);
  expect(seen.more, `nothing of the end lies past its card${where}`).toBeNull();
  expect(seen.arrow, `no "more below" arrow${where}`).toBe(false);
}

test.describe("a gift's end screen, for whoever received it", () => {
  // A gift is a phone thing (93% of opens), and each test plays one to its end: the phone project only.
  test.skip(({ isMobile }) => !isMobile, "played once, on the phone project");
  test.beforeEach(async ({ request }) => needGiftPreview(request));
  test.setTimeout(240_000);

  test("a free gift: the quiet link after Send one back, the two-line mark, and both counted", async ({ page, context }) => {
    await countEvents(page);
    expect(await playToEnd(page, { template: "the-letter" }), "The Letter plays to its end").toBe(true);
    const gift = page.url();

    const link = page.getByTestId("make-for-someone-else");
    await bring(page, '[data-testid="make-for-someone-else"]');
    await expect(link).toHaveText("or make one for someone else");
    await expect(link).toHaveAttribute("href", "/made-with-ethos?ref=g&template=the-letter");
    await expect(link).toHaveAttribute("target", "_blank");
    // In the link group: after "Send one back", before "Keep this gift".
    const order = await page.evaluate(() => {
      const y = (el: Element | null | undefined) => el?.getBoundingClientRect().top ?? NaN;
      const reply = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Send one back to"));
      return [y(reply), y(document.querySelector('[data-testid="make-for-someone-else"]')), y(document.querySelector('[data-testid="keep-gift"]'))];
    });
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);

    // It opens the page made for a recipient in a new tab, their template first; the gift stays open.
    const [made] = await Promise.all([context.waitForEvent("page"), link.click()]);
    await made.waitForLoadState("domcontentloaded");
    expect(new URL(made.url()).pathname + new URL(made.url()).search).toBe("/made-with-ethos?ref=g&template=the-letter");
    await expect(made.getByText("The one you got", { exact: true })).toHaveCount(1);
    // That page is told the site's name as where the tap came from, and nothing of the gift's address.
    expect(await made.evaluate(() => document.referrer)).toBe(`${new URL(gift).origin}/`);
    await made.close();
    // Back on the gift's tab. While the other tab was in front, the end screen's visibility watcher
    // could read "not in view" and the floating badge come back for a moment beside the inline one.
    await page.bringToFront();
    expect(page.url()).toBe(gift);
    expect(await events(page)).toContainEqual({ name: "make_own_clicked", data: { template: "the-letter", from: "end" } });

    // The maker's mark at the foot of a free gift: two quiet lines, one link.
    const badge = page.getByRole("link", { name: /Made with Ethos/ }).filter({ hasText: "Digital cards by Tryethos" });
    await bring(page, '[data-testid="keep-gift"]', "end");
    // Once the end is in view, the end screen carries the only badge. The floating one stands down on
    // the badge check's next pass, which under a full run can come later than the default 5 s.
    await expect(page.getByRole("link", { name: /Made with Ethos/ })).toHaveCount(1, { timeout: 15_000 });
    await expect(badge).toContainText("Made with Ethos");
    await expect(badge).toContainText("Digital cards by Tryethos");
    await expect(badge).toHaveAttribute("href", "/made-with-ethos?ref=watermark&template=the-letter");
    const [fromBadge] = await Promise.all([context.waitForEvent("page"), badge.click()]);
    await fromBadge.waitForLoadState("domcontentloaded");
    expect(await fromBadge.evaluate(() => document.referrer)).toBe(`${new URL(gift).origin}/`);
    await fromBadge.close();
    expect(await events(page)).toContainEqual({ name: "watermark_clicked", data: { template: "the-letter" } });

    await expectAllReachable(page, "the-letter", ["Send Marco a reaction", "Send one back to Marco", "make-for-someone-else", "keep-gift", "Watch again", "Made with Ethos"]);

    // "Send one back" itself: counted as the end screen's, and the editor knows a recipient opened it.
    await bring(page, '[data-testid="make-for-someone-else"]');
    await page.getByRole("button", { name: "Send one back to Marco" }).click();
    await page.waitForURL("**/create/the-letter?ref=reply");
    await expect.poll(async () => events(page)).toContainEqual({ name: "reply_started", data: { template: "the-letter", from: "end" } });
    await expect.poll(async () => events(page), { timeout: 60_000 }).toContainEqual({ name: "recipient_editor_opened", data: { via: "reply", template: "the-letter" } });
  });

  test("the floating badge, before the end screen: a tap is counted, and opens the same page", async ({ page, context }) => {
    await countEvents(page);
    await page.goto("/gift-preview?template=the-letter", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /tap to open/i }).click({ timeout: 60_000 });
    // The Letter's first screen (its seal): no end screen yet, so this is the badge that floats.
    const badge = page.getByRole("link", { name: "Made with Ethos" });
    await expect(badge).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("keep-gift")).toHaveCount(0);
    await expect(badge).not.toContainText("Digital cards by Tryethos");
    await expect(badge).toHaveAttribute("href", "/made-with-ethos?ref=watermark&template=the-letter");
    const [made] = await Promise.all([context.waitForEvent("page"), badge.click()]);
    await made.waitForLoadState("domcontentloaded");
    expect(await made.evaluate(() => document.referrer)).toBe(`${new URL(page.url()).origin}/`);
    await made.close();
    expect(await events(page)).toContainEqual({ name: "watermark_clicked", data: { template: "the-letter" } });
  });

  test("a paid gift in Spanish on a small phone: the link in Spanish, no badge, nothing pushed out of reach", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    expect(await playToEnd(page, { template: "bouquet", lang: "es", paid: true }), "Bouquet plays to its end").toBe(true);
    const link = page.getByTestId("make-for-someone-else");
    await bring(page, '[data-testid="make-for-someone-else"]');
    await expect(link).toHaveText("o hazle uno a otra persona");
    await expect(link).toHaveAttribute("href", "/es/made-with-ethos?ref=g&template=bouquet");
    await expect(page.getByText("La primera respuesta es gratis")).toBeVisible();
    // A paid gift carries no badge and no brand line.
    await expect(page.getByText("Hecho con Ethos")).toHaveCount(0);
    await expect(page.getByText("Tarjetas digitales de Tryethos")).toHaveCount(0);
    await expectAllReachable(page, "bouquet", ["Hazle uno a Marco", "make-for-someone-else", "keep-gift"]);
    // Still no price and no form on a gift.
    await expect(page.locator(".gift-root form, .gift-root input")).toHaveCount(0);
    expect(await page.locator(".gift-root").innerText()).not.toMatch(/€|\$\d|£/);
  });

  test("the tallest end screen (a surprise, a voice message, a song, a dedication) on 320×568", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    expect(await playToEnd(page, { template: "the-letter", full: true }), "The Letter plays to its end").toBe(true);
    await expectAllReachable(page, "the-letter", ["Send Marco a reaction", "Send one back to Marco", "make-for-someone-else", "keep-gift", "Watch again", "Made with Ethos"]);
  });

  // Gingerbread House and String the Lights hand the note over a page (a card) at a time, and the end
  // screen is the last of them, inside a page that clips. It had no scroller there, so a taller end
  // screen lost its last buttons on an ordinary phone. Each is played once as a paid gift and once as
  // the tallest free one, and measured on three small phones.
  for (const template of ["gingerbread-house", "string-the-lights"]) {
    test(`${template}: a paid gift's end screen is all in reach on small phones`, async ({ page }) => {
      await page.setViewportSize(SMALL_PHONES[0]);
      expect(await playToEnd(page, { template, paid: true }), `${template} plays to its end`).toBe(true);
      for (const phone of SMALL_PHONES) {
        await page.setViewportSize(phone);
        await expectAllReachable(page, template, ["Send one back to", "make-for-someone-else", "keep-gift"], ` at ${phone.width}×${phone.height}`);
      }
      await expect(page.getByText("The first reply is free")).toHaveCount(1);
      await expect(page.getByText("Made with Ethos")).toHaveCount(0);
      // On the smallest phone the end is taller than its page. A page often cuts it cleanly between
      // two rows, which looks finished, so the edge that more lies past fades, and while that is the
      // foot a small arrow stands on it: the foot as the end first shows, the top once it has been
      // scrolled to its foot.
      const fade = () =>
        page.evaluate(() => {
          for (let p = document.querySelector('[data-testid="keep-gift"]')?.parentElement; p; p = p.parentElement)
            if (/auto|scroll/.test(getComputedStyle(p).overflowY)) return { more: p.getAttribute("data-more"), masked: getComputedStyle(p).maskImage !== "none" };
          return null;
        });
      await bring(page, '[data-testid="keep-gift"]', "end");
      await expect.poll(fade).toEqual({ more: "above", masked: true });
      await page.evaluate(() => {
        for (let p = document.querySelector('[data-testid="keep-gift"]')?.parentElement; p; p = p.parentElement) if (/auto|scroll/.test(getComputedStyle(p).overflowY)) p.scrollTop = 0;
      });
      await expect.poll(fade).toEqual({ more: "below", masked: true });
      // The arrow says so whatever row the cut falls on, and a tap on it brings the next part up.
      const arrow = page.getByTestId("end-more");
      await expect(arrow).toBeVisible();
      // (And the measure the next test trusts does see it: here some of the end is out of sight.)
      const small = await asArrived(page, template);
      expect(small).toMatchObject({ more: "below", arrow: true });
      expect(small.controls.some((control) => !control.whole)).toBe(true);
      expect((await arrow.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const scrolled = () =>
        page.evaluate(() => {
          for (let p = document.querySelector('[data-testid="keep-gift"]')?.parentElement; p; p = p.parentElement) if (/auto|scroll/.test(getComputedStyle(p).overflowY)) return p.scrollTop;
          return -1;
        });
      await arrow.click();
      // (By what was hidden: a few dozen pixels here, where only the last row or two was.)
      await expect.poll(scrolled).toBeGreaterThan(8);
      // Tapped to the foot (twice at most on a phone this small), it goes: there is no more below.
      for (let taps = 0; taps < 3 && (await arrow.count()); taps++) {
        await arrow.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(700);
      }
      await expect(arrow).toHaveCount(0);
      await expect.poll(fade).toEqual({ more: "above", masked: true });
      // It turned no page on the way: the end is still the page in front.
      await expectAllReachable(page, template, ["keep-gift"], " after the arrow");
    });

    // The end as every other gift draws it was two of this card: on an iPhone in Safari it arrived
    // showing one button, with the link, "Keep this gift" and "Watch again" out of sight under a
    // cut that looked like the end of the card. Set closer for a card, all of it shows.
    test(`${template}: on the phones gifts are opened on, the whole end shows as it arrives`, async ({ page }) => {
      await page.setViewportSize(USUAL_PHONES[0]);
      expect(await playToEnd(page, { template, paid: true }), `${template} plays to its end`).toBe(true);
      for (const phone of USUAL_PHONES) {
        await page.setViewportSize(phone);
        const where = ` at ${phone.width}×${phone.height}`;
        await expectWholeOnArrival(page, template, ["Send one back to", "make-for-someone-else", "keep-gift", "Watch again"], where);
        // The link is one line on a card now (it broke in two, each underlined, in a 190px column),
        // and "Keep this gift" and "Watch again" share a row wherever the card is wide enough.
        const rows = await page.evaluate(() => {
          const box = (el: Element | null | undefined) => el?.getBoundingClientRect();
          const link = document.querySelector('[data-testid="make-for-someone-else"]')!;
          const keep = box(document.querySelector('[data-testid="keep-gift"]'))!;
          const again = box([...document.querySelectorAll("[data-end-screen] button")].find((b) => b.textContent?.includes("Watch again")))!;
          const range = document.createRange();
          range.selectNodeContents(link);
          return { lines: new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size, sameRow: Math.abs(keep.top - again.top) < 8 };
        });
        expect(rows.lines, `the link is one line${where}`).toBe(1);
        if (phone.width >= 375) expect(rows.sameRow, `Keep this gift and Watch again share a row${where}`).toBe(true);
      }
    });

    test(`${template}: the tallest end screen, in Spanish with the badge, is all in reach on small phones`, async ({ page }) => {
      await page.setViewportSize(SMALL_PHONES[0]);
      expect(await playToEnd(page, { template, lang: "es", full: true }), `${template} plays to its end`).toBe(true);
      for (const phone of SMALL_PHONES) {
        await page.setViewportSize(phone);
        await expectAllReachable(page, template, ["Hazle uno a", "make-for-someone-else", "keep-gift", "Hecho con Ethos"], ` at ${phone.width}×${phone.height}`);
      }
    });
  }

  test("after a reaction is sent, one quiet next step: send one back, counted as the reaction's", async ({ page }) => {
    await countEvents(page);
    await page.route("**/api/gift/*/react", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
    expect(await playToEnd(page, { template: "the-letter" }), "The Letter plays to its end").toBe(true);
    await bring(page, '[data-testid="make-for-someone-else"]');
    const opener = page.getByRole("button", { name: "Send Marco a reaction" });
    await opener.click();
    // A modal with a name, that Escape closes and that gives the focus back to what opened it.
    // Named by its title; once sent, by "Sent to Marco." (the line that then heads it).
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAccessibleName("Send Marco a reaction");
    await expect.poll(() => sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(opener).toBeFocused();
    await opener.click();
    await expect(sheet).toBeVisible();
    // Tab goes round the sheet's own controls and never reaches the gift behind it.
    for (let i = 0; i < 16; i++) {
      await page.keyboard.press("Tab");
      expect(await sheet.evaluate((el) => el.contains(document.activeElement)), `Tab ${i + 1} stays in the sheet`).toBe(true);
    }
    // Held sideways (an iPhone 13 at 844×340) the sheet scrolls inside the screen: Close and Send can
    // both be reached.
    const upright = page.viewportSize()!;
    await page.setViewportSize({ width: 844, height: 340 });
    const close = sheet.getByRole("button", { name: "Close" });
    await sheet.evaluate((el) => (el.scrollTop = 0));
    expect((await close.boundingBox())!.y, "Close is on the screen").toBeGreaterThanOrEqual(0);
    const sendIt = sheet.getByRole("button", { name: /^Send/ });
    await sendIt.scrollIntoViewIfNeeded();
    const sendBox = (await sendIt.boundingBox())!;
    expect(sendBox.y + sendBox.height, "Send is on the screen").toBeLessThanOrEqual(340);
    await page.setViewportSize(upright);
    // Before it is sent there is nothing about replying.
    await expect(sheet.getByTestId("reaction-reply")).toHaveCount(0);
    await sendIt.click();
    await expect(sheet.locator("p:not(.sr-only)", { hasText: "Sent to Marco." })).toBeVisible();
    // Said out loud, and the focus is on the next step (the Send button it was on is gone).
    await expect(page.getByRole("status").filter({ hasText: "Sent to Marco." })).toHaveCount(1);
    const next = sheet.getByTestId("reaction-reply");
    await expect(next).toBeFocused();
    await expect(sheet).toHaveAccessibleName("Sent to Marco.");
    await expect(next).toHaveText("Send one back to Marco");
    // The one action there, besides closing the sheet.
    await expect(sheet.getByRole("button")).toHaveCount(2);
    await expect(sheet.getByRole("link")).toHaveCount(0);
    expect((await next.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    // Two taps, as an impatient thumb gives it while the editor loads: one reply, one editor.
    await next.dblclick();
    // The same door as the end screen's button: the same editor, the names already swapped.
    await page.waitForURL("**/create/the-letter?ref=reply");
    await expect.poll(async () => events(page)).toContainEqual({ name: "reply_started", data: { template: "the-letter", from: "reaction" } });
    expect((await events(page)).filter((e) => e.name === "reply_started")).toHaveLength(1);
    await expect(page.locator("#recipientName")).toHaveValue("Marco", { timeout: 60_000 });
    await expect(page.locator("#senderName")).toHaveValue("Ana");
    // A reload before anything is typed opens the same reply, not one with both names empty.
    await page.reload();
    await expect(page.locator("#recipientName")).toHaveValue("Marco", { timeout: 60_000 });
    await expect(page.locator("#senderName")).toHaveValue("Ana");
    // Once the reply is changed its own draft holds the names, and the tab stops carrying them.
    const carried = () => page.evaluate(() => window.sessionStorage.getItem("ethos:reply") !== null);
    expect(await carried()).toBe(true);
    await page.locator("#recipientName").fill("Marco P");
    await expect.poll(carried).toBe(false);
  });

  // With no connection the editor cannot come, and a page asked for then is the browser's own error
  // page where the gift was (Back from it starts the gift over). The tap waits for the connection.
  test("with no connection, Send one back stays on the gift, and goes once the connection is back", async ({ page, context }) => {
    await countEvents(page);
    expect(await playToEnd(page, { template: "the-letter" }), "The Letter plays to its end").toBe(true);
    const gift = page.url();
    const reply = page.getByRole("button", { name: "Send one back to Marco" });
    const replies = async () => (await events(page)).filter((e) => e.name === "reply_started");
    await bring(page, '[data-testid="make-for-someone-else"]');

    await context.setOffline(true);
    await reply.click();
    await expect(reply).toBeDisabled();
    // The wait runs out (ten seconds): the button wakes, the gift is still here at its end, and no reply was counted.
    await expect(reply).toBeEnabled({ timeout: 15_000 });
    expect(page.url()).toBe(gift);
    await expect(page.getByTestId("keep-gift")).toHaveCount(1);
    expect(await replies()).toHaveLength(0);
    // A connection that comes back after that moves nobody.
    await context.setOffline(false);
    await page.waitForTimeout(1500);
    expect(page.url()).toBe(gift);

    // Tapped again while offline, and the connection back within the wait: the editor opens, counted once.
    await context.setOffline(true);
    await reply.click();
    await expect(reply).toBeDisabled();
    await page.waitForTimeout(1200);
    expect(page.url()).toBe(gift);
    await context.setOffline(false);
    await page.waitForURL("**/create/the-letter?ref=reply", { timeout: 60_000 });
    expect(await replies()).toEqual([{ name: "reply_started", data: { template: "the-letter", from: "end" } }]);
  });
});

test.describe("a stepped gift's end on a desktop", () => {
  // The card is no bigger on a wide screen than on a phone (it is sized from the screen's height),
  // and the end used to lose "Watch again" there to the scroller: a ghost at the card's foot at
  // 1440×900, blank paper under "Keep this gift" at 1280×720.
  test.skip(({ isMobile }) => isMobile, "the desktop project's");
  test.beforeEach(async ({ request }) => needGiftPreview(request));
  test.setTimeout(240_000);

  for (const template of ["gingerbread-house", "string-the-lights"]) {
    test(`${template}: the whole end shows as it arrives`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      expect(await playToEnd(page, { template, paid: true }), `${template} plays to its end`).toBe(true);
      for (const screen of [{ width: 1280, height: 720 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 1280, height: 620 }]) {
        await page.setViewportSize(screen);
        await expectWholeOnArrival(page, template, ["Send one back to", "make-for-someone-else", "keep-gift", "Watch again"], ` at ${screen.width}×${screen.height}`);
      }
    });
  }
});

test.describe("the add-to-home-screen tip and the reaction sheet", () => {
  // iOS Safari is the only browser the tip comes in (it reads the user agent), and it comes five
  // seconds after the end: about when a recipient opens the reaction sheet. In WebKit it drew
  // undimmed beside the sheet, its close button still under a finger (loop-N1-2).
  test.skip(({ isMobile }) => !isMobile, "the phone project's");
  test.use({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  });
  test.beforeEach(async ({ request }) => needGiftPreview(request));
  test.setTimeout(240_000);

  test("stands down while the sheet is open, and is back once it closes", async ({ page }) => {
    expect(await playToEnd(page, { template: "the-letter" }), "The Letter plays to its end").toBe(true);
    const tip = page.getByText("Save it to your phone", { exact: false });
    await expect(tip).toBeVisible({ timeout: 15_000 });
    await bring(page, '[data-testid="make-for-someone-else"]');
    await page.getByRole("button", { name: "Send Marco a reaction" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(tip).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Close" })).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(tip).toBeVisible();
  });
});

test.describe("a gift's address stays with the gift", () => {
  test("a gift page and its keep page send only the site's origin as a referrer; other pages keep the site's policy", async ({ playwright, baseURL }) => {
    // Cold pages compile on first request in development.
    test.setTimeout(120_000);
    // No gift answers here (a worktree has no database): the header rides on whatever the address answers.
    // Each address is asked with no cookies: a shared context kept the Spanish locale cookie /es/g/…
    // set, so /gifts went on to /es/gifts, another page to compile, and ran past the time limit.
    const headerOf = async (address: string) => {
      const fresh = await playwright.request.newContext({ baseURL });
      try {
        return (await fresh.get(address, { timeout: 90_000 })).headers()["referrer-policy"];
      } finally {
        await fresh.dispose();
      }
    };
    for (const address of ["/g/prev2ew3k", "/es/g/prev2ew3k", "/g/prev2ew3k/keep"]) expect(await headerOf(address), address).toBe("strict-origin");
    for (const address of ["/made-with-ethos", "/gifts"]) expect(await headerOf(address), address).toBe("strict-origin-when-cross-origin");
  });
});

test.describe("the page the badge and the new link open", () => {
  const ready = { waitUntil: "domcontentloaded" } as const;

  test("carries the brand line as its eyebrow, in both languages", async ({ page }) => {
    await page.goto("/made-with-ethos?ref=watermark&template=the-letter", ready);
    await expect(page.locator("header").getByText("Digital cards by Tryethos", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Someone made you one of these.");
    await page.goto("/es/made-with-ethos?ref=watermark", ready);
    await expect(page.locator("header").getByText("Tarjetas digitales de Tryethos", { exact: true })).toBeVisible();
  });

  test("is titled for both arrivals, and promises no number of free templates", async ({ page }) => {
    // The badge's visitor may be answering the sender; the new link's is making one for someone else.
    for (const ref of ["watermark", "g"]) {
      await page.goto(`/made-with-ethos?ref=${ref}&template=bouquet`, ready);
      await expect(page).toHaveTitle(/^Make one of your own/);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Someone made you an Ethos gift. Make one of your own: every template is free to try.");
    }
    // The free shelf's line holds whether one template sends free or two.
    await page.goto("/made-with-ethos?ref=watermark", ready);
    await expect(page.locator('[data-shelf="free"]')).toContainText("A free gift carries the small “Made with Ethos” footer, like the one you got.");
    // (Spanish last: once a visitor has been on /es, the site keeps them there.)
    await page.goto("/es/made-with-ethos?ref=g", ready);
    await expect(page).toHaveTitle(/^Haz el tuyo/);
    await expect(page.locator('[data-shelf="free"]')).toContainText("Un regalo gratis lleva un pequeño pie «Hecho con Ethos».");
  });

  test("for someone making one for someone else: their template first, the tag carried to every editor link", async ({ page }) => {
    await page.goto("/made-with-ethos?ref=g&template=bouquet", ready);
    await expect(page.getByText("Make one for someone else. Free to start.")).toBeVisible();
    // Their gift may have had no footer (a paid one): the free shelf doesn't say it was like theirs.
    await expect(page.locator('[data-shelf="free"]')).not.toContainText("like the one you got");
    await expect(page.locator("[data-lead]").getByRole("link", { name: /^Make this/ })).toHaveAttribute("href", "/create/bouquet?ref=g");
    await expect(page.getByText("The one you got", { exact: true })).toHaveCount(1);
    for (const href of await page.getByTestId("made-with-ethos").getByRole("link", { name: /^Make this/ }).evaluateAll((links) => links.map((a) => a.getAttribute("href"))))
      expect(href).toMatch(/^\/create\/[a-z0-9-]+\?ref=g$/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await page.goto("/es/made-with-ethos?ref=g&template=bouquet", ready);
    await expect(page.getByText("Hazle uno a otra persona: empezar es gratis.")).toBeVisible();
  });

  /** Where things stand on the page as it opens: document coordinates, nothing scrolled. */
  const layout = (page: Page) =>
    page.evaluate(() => {
      const box = (el: Element | null | undefined) => {
        const r = el?.getBoundingClientRect();
        return r ? { left: r.left, top: r.top + scrollY, right: r.right, bottom: r.bottom + scrollY } : null;
      };
      // The label over their card: a paid gift's column, or a free gift's card at the head of its shelf.
      const marker = [...document.querySelectorAll('[data-testid="made-with-ethos"] :is(h2, p)')].find((s) => s.textContent === "The one you got");
      const cards = [...document.querySelectorAll('[data-testid="made-with-ethos"] > :first-child article')];
      return {
        screen: innerHeight,
        sideways: document.documentElement.scrollWidth > innerWidth,
        marker: box(marker),
        names: [...document.querySelectorAll('[data-testid="made-with-ethos"] h3')].slice(0, 3).map((h) => h.textContent),
        cards: cards.map((c) => box(c)!),
        words: box(document.querySelector('[data-shelf="free"] header'))!,
        visibleCards: [...document.querySelectorAll('[data-testid="made-with-ethos"] article')].filter((a) => a.getClientRects().length > 0).length,
        height: document.documentElement.scrollHeight,
      };
    });

  test("opens with the gift they got, on the first screen, whether it was a free one or a paid one", async ({ page, isMobile }) => {
    // A paid gift's template is not on the free shelf. It used to lead the premium shelf: a screen
    // and a half down (two and a half on a phone), under "Someone made you one of these." and a
    // picture of The Letter. It stands in front of the free shelf now, and nowhere else.
    await page.goto("/made-with-ethos?ref=g&template=bouquet", ready);
    await expect(page.locator("[data-lead]")).toHaveCount(1);
    let seen = await layout(page);
    expect(seen.names[0]).toBe("Bouquet");
    expect(seen.marker!.bottom, "“The one you got” is on the first screen").toBeLessThan(seen.screen);
    // A label over their card, not a pill on its picture (it covered the preview's own headline).
    expect(seen.marker!.bottom).toBeLessThanOrEqual(seen.cards[0].top);
    expect(seen.cards[0].top - seen.marker!.bottom).toBeLessThan(isMobile ? 40 : 200);
    expect(seen.sideways).toBe(false);
    await expect(page.locator('[data-shelf="premium"] h3', { hasText: /^Bouquet$/ })).toHaveCount(0);
    await expect(page.locator('[data-testid="made-with-ethos"] h3', { hasText: /^Bouquet$/ })).toHaveCount(1);
    // The free templates come straight after it, each of them once.
    await expect(page.locator('[data-shelf="free"] h3')).toHaveText(["The Letter", "Constellations"]);

    // A free gift's template leads its own shelf, as before, and nothing stands in front of it.
    await page.goto("/made-with-ethos?ref=watermark&template=the-letter", ready);
    await expect(page.locator("[data-lead]")).toHaveCount(0);
    seen = await layout(page);
    expect(seen.names[0]).toBe("The Letter");
    expect(seen.marker!.bottom, "“The one you got” is on the first screen").toBeLessThan(seen.screen);
    // A free gift's card has the same label over it, and nothing on its picture.
    expect(seen.marker!.bottom).toBeLessThanOrEqual(seen.cards[0].top);
    expect(seen.cards[0].top - seen.marker!.bottom).toBeLessThan(40);
    // The free cards beside it start level with it all the same.
    if (!isMobile) for (const card of seen.cards) expect(Math.abs(card.top - seen.cards[0].top)).toBeLessThan(2);
    expect(seen.sideways).toBe(false);

    // A template that does not exist leads nothing, and marks nothing.
    await page.goto("/made-with-ethos?ref=g&template=nope", ready);
    await expect(page.locator("[data-lead]")).toHaveCount(0);
    await expect(page.getByText("The one you got", { exact: true })).toHaveCount(0);
  });

  test("the first row: their card under its own label, then the free shelf's words and cards, words first", async ({ page, isMobile }) => {
    for (const address of ["/made-with-ethos?ref=g&template=bouquet", "/made-with-ethos?ref=watermark&template=the-letter"]) {
      await page.goto(address, ready);
      const seen = await layout(page);
      const lead = address.includes("bouquet") ? 1 : 0;
      expect(seen.cards).toHaveLength(lead + 2);
      // The words never lie on a card.
      for (const card of seen.cards) expect(card.right <= seen.words.left || seen.words.right <= card.left || card.bottom <= seen.words.top || seen.words.bottom <= card.top, `${address}: the words clear of every card`).toBe(true);
      if (isMobile) {
        // One column: their card (when it leads), then the free shelf's heading, then its cards.
        if (lead) expect(seen.words.top).toBeGreaterThanOrEqual(seen.cards[0].bottom);
        expect(seen.words.bottom).toBeLessThanOrEqual(seen.cards[lead].top);
      } else if (lead) {
        // Their card under its label, the free shelf's words beside the label, its cards beside their
        // card: read left to right, "The one you got", then "Free" over the free cards.
        for (const card of seen.cards) expect(Math.abs(card.top - seen.cards[0].top), `${address}: the cards start level`).toBeLessThan(2);
        expect(Math.abs(seen.words.top - seen.marker!.top), `${address}: the two labels start level`).toBeLessThan(2);
        expect(seen.words.left).toBeGreaterThanOrEqual(seen.cards[0].right);
        expect(seen.words.bottom).toBeLessThanOrEqual(seen.cards[1].top);
      } else {
        // A spread: the words first, at the left, level with the label over the cards beside them.
        for (const card of seen.cards) expect(seen.words.right, `${address}: the words come before the cards`).toBeLessThanOrEqual(card.left);
        expect(Math.abs(seen.words.top - seen.marker!.top)).toBeLessThan(2);
      }
    }
  });

  // Every recipient lands here, mostly on a phone. It listed all 61 templates: about twenty-five phone
  // screens of cards with a title, a line, a price and two links each (the deep tester's loop-D5).
  test("is short: their card, the free shelf, one row of premium cards, and a link to every template", async ({ page, isMobile }) => {
    for (const address of ["/made-with-ethos?ref=g&template=bouquet", "/made-with-ethos?ref=watermark&template=the-letter"]) {
      await page.goto(address, ready);
      const seen = await layout(page);
      const premium = await page.locator('[data-shelf="premium"] article').evaluateAll((cards) => cards.filter((a) => a.getClientRects().length > 0).length);
      const width = page.viewportSize()!.width;
      const columns = width >= 1280 ? 4 : width >= 1024 ? 3 : width >= 640 ? 2 : 2;
      expect(premium, `${address}: one row of premium cards`).toBe(columns);
      expect(seen.visibleCards).toBeLessThanOrEqual(3 + columns);
      if (isMobile) expect(seen.height / seen.screen, `${address}: phone screens`).toBeLessThan(10);
      const all = page.getByTestId("made-with-all");
      await expect(all).toHaveText("See every template");
      await expect(all).toHaveAttribute("href", `/templates?ref=${address.includes("ref=g") ? "g" : "watermark"}`);
      // At most 300 words on the page, the site's header and footer aside.
      const words = await page.evaluate(() => {
        const text = [document.querySelector("main header"), document.querySelector('[data-testid="made-with-ethos"]')].map((el) => (el as HTMLElement | null)?.innerText ?? "").join(" ");
        return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
      });
      expect(words, `${address}: words on the page`).toBeLessThanOrEqual(300);
    }
    await page.goto("/es/made-with-ethos?ref=g&template=bouquet", ready);
    await expect(page.getByTestId("made-with-all")).toHaveText("Ver todas las plantillas");
    await expect(page.getByTestId("made-with-all")).toHaveAttribute("href", "/es/templates?ref=g");
  });
});

test.describe("the swapped names go to the reply and nowhere else", () => {
  // A seed kept in the tab for a reload was put on the next gift of the same template made there:
  // "or make one for someone else" opened a gift addressed to the person who sent the first one.
  test.skip(({ isMobile }) => !isMobile, "the phone project's");
  test.setTimeout(240_000);

  test("a reply opens with them; the same template opened any other way in that tab does not, and throws them away", async ({ page }) => {
    const seed = () =>
      page.evaluate(() => window.sessionStorage.setItem("ethos:reply", JSON.stringify({ slug: "the-letter", recipientName: "Marco", senderName: "Ana", savedAt: Date.now() })));
    const carried = () => page.evaluate(() => window.sessionStorage.getItem("ethos:reply") !== null);
    await page.goto("/made-with-ethos", { waitUntil: "domcontentloaded" });
    await seed();
    await page.goto("/create/the-letter?ref=reply");
    await expect(page.locator("#recipientName")).toHaveValue("Marco", { timeout: 90_000 });
    await expect(page.locator("#senderName")).toHaveValue("Ana");
    for (const address of ["/create/the-letter?ref=g", "/create/the-letter"]) {
      await page.goto(address);
      await expect(page.locator("#recipientName"), address).toBeVisible({ timeout: 90_000 });
      await expect(page.locator("#recipientName"), address).not.toHaveValue("Marco");
      await expect(page.locator("#senderName"), address).not.toHaveValue("Ana");
      expect(await carried(), `${address} throws the seed away`).toBe(false);
      await seed();
    }
  });
});

test.describe("the editor counts a recipient's arrival, and nobody else's", () => {
  const opened = async (page: Page, address: string) => {
    await countEvents(page);
    await page.goto(address);
    await expect.poll(async () => (await events(page)).map((e) => e.name), { timeout: 60_000 }).toContain("editor_opened");
    return (await events(page)).filter((e) => e.name === "recipient_editor_opened");
  };

  for (const via of ["reply", "g", "watermark", "gift-keep"]) {
    test(`?ref=${via} is a recipient`, async ({ page }) => {
      const counted = await opened(page, `/create/the-letter?ref=${via}`);
      expect(counted.length).toBeGreaterThan(0);
      for (const event of counted) expect(event.data).toEqual({ via, template: "the-letter" });
    });
  }

  test("a TikTok link, a plain visit, and a return from signing in are not", async ({ page }) => {
    expect(await opened(page, "/create/the-letter?ref=tt-couple")).toEqual([]);
    expect(await opened(page, "/create/the-letter")).toEqual([]);
    // Back from signing in or paying: the same gift, not a second opening.
    expect(await opened(page, "/create/the-letter?resume=publish&ref=reply")).toEqual([]);
  });
});

test.describe("a gift a recipient starts is counted once", () => {
  // recipient_started (docs/marketing/LOOP-KPI.md): the first change to a new draft, in an editor
  // opened through a door out of a gift. One true or false, nothing else, once per gift.
  test.setTimeout(180_000);

  const started = async (page: Page) => (await events(page)).filter((e) => e.name === "recipient_started");
  const ready = (page: Page) => expect(page.locator("#recipientName")).toBeVisible({ timeout: 60_000 });
  const type = (page: Page, text = "Ana") => page.locator("#recipientName").pressSequentially(text);

  test("the first change to a reply sends one recipient_started, with one true and nothing else", async ({ page }) => {
    await countEvents(page);
    await page.goto("/create/the-letter?ref=reply");
    await ready(page);
    expect(await started(page)).toEqual([]);
    await type(page);
    await expect.poll(() => started(page), { timeout: 15_000 }).toEqual([{ name: "recipient_started", data: { within7: true } }]);
    await page.locator("#senderName").pressSequentially("Leo");
    await page.waitForTimeout(1000);
    expect(await started(page)).toEqual([{ name: "recipient_started", data: { within7: true } }]);
  });

  test("a reload of the same draft does not count it again", async ({ page }) => {
    await countEvents(page);
    await page.goto("/create/the-letter?ref=reply");
    await ready(page);
    await type(page);
    await expect.poll(async () => (await started(page)).length, { timeout: 15_000 }).toBe(1);
    // The draft is kept on this device a moment after the change.
    await page.waitForTimeout(1500);
    await page.reload();
    await ready(page);
    await expect(page.locator("#recipientName")).toHaveValue("Ana");
    await type(page, " M");
    await page.waitForTimeout(1500);
    expect(await started(page)).toEqual([]);
  });

  test("a kept gift's reminder is counted as later; a visitor from anywhere else is not counted", async ({ page, browser }) => {
    await countEvents(page);
    await page.goto("/create/the-letter?ref=gift-keep");
    await ready(page);
    await type(page);
    await expect.poll(() => started(page), { timeout: 15_000 }).toEqual([{ name: "recipient_started", data: { within7: false } }]);

    for (const address of ["/create/the-letter", "/create/the-letter?ref=tt-couple"]) {
      const context = await browser.newContext();
      const other = await context.newPage();
      await countEvents(other);
      await other.goto(address);
      await ready(other);
      await type(other);
      await other.waitForTimeout(1500);
      expect(await started(other), address).toEqual([]);
      await context.close();
    }
  });

  test("a sealed token asks the server, sends it the token alone, and takes its answer", async ({ page }) => {
    const token = "A".repeat(64);
    const asked: unknown[] = [];
    await page.route("**/api/loop/started", (route) => {
      asked.push(route.request().postDataJSON());
      return route.fulfill({ json: { within7: false } });
    });
    await countEvents(page);
    await page.goto(`/create/bouquet?ref=reply&reply=${token}`);
    await ready(page);
    await type(page);
    await expect.poll(() => started(page), { timeout: 15_000 }).toEqual([{ name: "recipient_started", data: { within7: false } }]);
    expect(asked).toEqual([{ reply: token }]);
  });

  test("when the server can't answer, the door's answer is sent", async ({ page }) => {
    await page.route("**/api/loop/started", (route) => route.fulfill({ status: 500, body: "boom" }));
    await countEvents(page);
    await page.goto(`/create/bouquet?ref=reply&reply=${"A".repeat(64)}`);
    await ready(page);
    await type(page);
    await expect.poll(() => started(page), { timeout: 15_000 }).toEqual([{ name: "recipient_started", data: { within7: true } }]);
    await page.waitForTimeout(1000);
    expect(await started(page)).toHaveLength(1);
  });
});
