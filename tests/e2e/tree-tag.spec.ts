import { expect, test, type Page } from "@playwright/test";
import before from "./print-card-before.json";
import { measureCard } from "./print-measure";

/**
 * The Tree Tag, the print page's second shape (components/dashboard/print-card.tsx), drawn from its
 * development-only preview: a real print page needs a signed-in owner and a paid gift, and the dev
 * server's database is production. On a production build the preview is a 404 and these skip.
 * Chromium only for the PDFs (page.pdf).
 */

/** CSS pixels per millimetre. */
const MM = 96 / 25.4;

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByTestId("tree-tag").first().locator(".tag-qr img")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

const pdfPages = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;

test.describe("The Tree Tag", () => {
  test.beforeEach(async ({ request }) => {
    const status = (await request.get("/print-preview")).status();
    test.skip(status === 404, "/print-preview is development-only: a production build answers 404");
  });

  test("a sheet holds four tags, each 74 by 105 mm, with the name, the code and who it is from", async ({ page }) => {
    await open(page, "/print-preview?shape=tree-tag");
    const tags = page.getByTestId("tree-tag");
    await expect(tags).toHaveCount(4);
    const box = (await tags.first().boundingBox())!;
    expect(box.width / MM).toBeCloseTo(74, 0);
    expect(box.height / MM).toBeCloseTo(105, 0);
    const first = tags.first();
    await expect(first.getByText("For", { exact: true })).toBeVisible();
    await expect(first.getByText("Mia", { exact: true })).toBeVisible();
    await expect(first.getByText("Scan on Christmas morning")).toBeVisible();
    await expect(first.getByText("from Leo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Print The Tree Tag" })).toBeVisible();
  });

  test("the code is at least 34 mm wide, and a 40-character name stays in its tag without moving it", async ({ page }) => {
    // Where the code sits inside its tag, in CSS pixels from the tag's top.
    const codeTop = async () => page.getByTestId("tree-tag").first().evaluate((tag) => tag.querySelector(".tag-qr img")!.getBoundingClientRect().top - tag.getBoundingClientRect().top);
    await open(page, "/print-preview?shape=tree-tag");
    const short = (await page.getByTestId("tree-tag").first().locator(".tag-qr img").boundingBox())!;
    expect(short.width / MM).toBeGreaterThanOrEqual(34);
    expect(short.height / MM).toBeGreaterThanOrEqual(34);
    const top = await codeTop();

    const long = "Maximiliana Alexandria Montgomery-Smithe"; // 40 characters
    expect(long).toHaveLength(40);
    await open(page, `/print-preview?shape=tree-tag&name=${encodeURIComponent(long)}`);
    const tag = page.getByTestId("tree-tag").first();
    const tagBox = (await tag.boundingBox())!;
    const name = (await tag.locator(".tag-name span").boundingBox())!;
    expect(name.x).toBeGreaterThanOrEqual(tagBox.x);
    expect(name.x + name.width).toBeLessThanOrEqual(tagBox.x + tagBox.width);
    // Every letter shows: nothing is cut off by the two-line limit.
    expect(await tag.locator(".tag-name span").evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    expect(await codeTop()).toBeCloseTo(top, 1);

    // A name in another script, with an emoji, and no name at all, hold the code where it is too.
    for (const other of ["美咲 🎄", ""]) {
      await open(page, `/print-preview?shape=tree-tag&name=${encodeURIComponent(other)}`);
      expect(await codeTop()).toBeCloseTo(top, 1);
    }
  });

  test("the tree can be left off, and nothing of the toolbar prints", async ({ page }) => {
    await open(page, "/print-preview?shape=tree-tag");
    await expect(page.locator(".tag-tree")).toHaveCount(4);
    await page.getByRole("checkbox", { name: "Show the tree" }).uncheck();
    await expect(page.locator(".tag-tree")).toHaveCount(0);
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".toolbar")).toBeHidden();
    await expect(page.locator(".adjust")).toBeHidden();
    await expect(page.locator("aside[data-app-hide]")).toBeHidden();
  });

  test("on a 375 px phone the tags stand in one column, with nothing off the side", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await open(page, "/print-preview?shape=tree-tag");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    const [a, b] = await page.getByTestId("tree-tag").evaluateAll((tags) => tags.slice(0, 2).map((t) => t.getBoundingClientRect().left));
    expect(a).toBeCloseTo(b, 0);
  });

  test("prints on one page of A4 and one of Letter", async ({ page, browserName }, info) => {
    test.skip(browserName !== "chromium", "page.pdf is Chromium's");
    await open(page, "/print-preview?shape=tree-tag");
    for (const format of ["A4", "Letter"] as const) {
      const pdf = await page.pdf({ format, printBackground: true });
      await info.attach(`tree-tag-${format}.pdf`, { body: pdf, contentType: "application/pdf" });
      expect(pdfPages(pdf), format).toBe(1);
    }
  });

  test("in Spanish", async ({ page }) => {
    await open(page, "/es/print-preview?shape=tree-tag&lang=es&name=Luc%C3%ADa");
    const first = page.getByTestId("tree-tag").first();
    await expect(first.getByText("Para", { exact: true })).toBeVisible();
    await expect(first.getByText("Lucía", { exact: true })).toBeVisible();
    await expect(first.getByText("Escanéame la mañana de Navidad")).toBeVisible();
    await expect(first.getByText("de Leo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Imprimir la etiqueta" })).toBeVisible();
    await expect(page.getByText("Imprime cuatro etiquetas por página.", { exact: false })).toBeVisible();
  });

  test("the share screen offers it under the QR card when the publish stamped it, with the code's design in the link", async ({ page }) => {
    await page.goto("/print-preview/share");
    const row = page.getByTestId("tree-tag-row");
    await expect(row).toBeVisible();
    await expect(row.getByText("Comes with this gift")).toBeVisible();
    await expect(row.getByText("The Tree Tag", { exact: true })).toBeVisible();
    await expect(row.getByText("Print it, hang it on the tree, they scan it on Christmas morning.")).toBeVisible();
    const link = row.getByRole("link", { name: "Print The Tree Tag" });
    await expect(link).toHaveAttribute("href", /\/dashboard\/gift\/[0-9a-f-]+\/print\?shape=tree-tag&dots=rounded&/);
    // It sits under the QR card's own buttons, and its button is a 44 px target.
    const print = (await page.getByRole("link", { name: "Print-ready card" }).boundingBox())!;
    expect((await row.boundingBox())!.y).toBeGreaterThan(print.y);
    // h-11, 44 px; a phone's fractional pixel ratio reads it as 43.9998.
    expect((await link.boundingBox())!.height).toBeGreaterThan(43.5);
    // The code's design travels with it, as it does to the print card.
    await page.getByRole("radio", { name: "Square" }).click();
    await expect(link).toHaveAttribute("href", /shape=tree-tag&dots=square&/);
  });

  test("the share screen offers nothing for a gift the publish did not stamp", async ({ page }) => {
    // Which gifts are stamped (the days, paid, a first send, the switch) is held by tests/unit/holiday-extras.test.ts.
    await page.goto("/print-preview/share?extra=0");
    await expect(page.getByRole("link", { name: "Print-ready card" })).toBeVisible();
    await expect(page.getByTestId("tree-tag-row")).toHaveCount(0);
  });

  test("a long sender prints whole on two lines, and can be changed, without moving the code", async ({ page }) => {
    const codeTop = async () => page.getByTestId("tree-tag").first().evaluate((tag) => tag.querySelector(".tag-qr img")!.getBoundingClientRect().top - tag.getBoundingClientRect().top);
    await open(page, "/print-preview?shape=tree-tag");
    const top = await codeTop();
    const fromBox = async () => (await page.getByTestId("tree-tag").first().locator(".tag-from").boundingBox())!;
    const height = (await fromBox()).height;

    const long = "Grandma Rose and Grandpa Peter"; // 30 characters
    expect(long).toHaveLength(30);
    await open(page, `/print-preview?shape=tree-tag&sender=${encodeURIComponent(long)}`);
    const from = page.getByTestId("tree-tag").first().locator(".tag-from span");
    await expect(from).toHaveText(`from ${long}`);
    // Nothing cut off: every letter fits its two lines, and the box keeps its height.
    expect(await from.evaluate((el) => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect((await fromBox()).height).toBeCloseTo(height, 1);
    expect(await codeTop()).toBeCloseTo(top, 1);
    // Clear of the tree in the corner.
    const tree = (await page.getByTestId("tree-tag").first().locator(".tag-tree").boundingBox())!;
    const box = await fromBox();
    expect(box.x + box.width <= tree.x || box.y + box.height <= tree.y).toBe(true);

    // The toolbar changes who it is from, on every tag.
    await page.getByRole("textbox", { name: "From" }).fill("Mum and Dad");
    await expect(page.locator(".tag-from span")).toHaveText(Array(4).fill("from Mum and Dad"));
  });

  test("the line under the code is the label the QR designer gave the code, when it gave one", async ({ page }) => {
    await open(page, "/print-preview?shape=tree-tag&label=Open%20me%20first");
    await expect(page.getByTestId("tree-tag").first().locator(".tag-line")).toHaveText("Open me first");
  });

  test("the card prints as it did before the tag: the same words, every part in the same place", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop-chrome", "measured at the desktop width");
    await page.setViewportSize({ width: 1280, height: 720 });
    for (const [key, path] of [["en", "/print-preview"], ["es", "/es/print-preview?lang=es"]] as const) {
      await page.goto(path);
      await expect(page.locator(".sheet .card .qr img").first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await measureCard(page)).toEqual(before[key]);
    }
  });
});
