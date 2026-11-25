import { expect, test } from "@playwright/test";

/**
 * The About page (who makes Ethos, in both languages), the /contact address people and assistants
 * try, and The Letter's one page in Portuguese. Set SHOTS=<folder> to save a full-page picture of
 * each for a look by eye.
 */
const shot = async (page: import("@playwright/test").Page, name: string, project: string) => {
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/${name}-${project}.png`, fullPage: true });
};

test.describe("the About page", () => {
  test("says who makes Ethos, with the company's details", async ({ page }, info) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Who makes Ethos");
    const about = page.getByTestId("about");
    await expect(about).toContainText('SIA "MIGLAI"');
    await expect(about).toContainText("40203733943");
    await expect(about).toContainText("LV40203733943");
    await expect(about).toContainText("within 30 days of buying");
    await expect(about.locator("#contact")).toContainText("@");
    // The same Organization every page names, here with its legal name and address.
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.join("\n")).toContain('"legalName":"SIA \\"MIGLAI\\""');
    expect(ld.join("\n")).toContain('"@type":"AboutPage"');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/about$/);
    await shot(page, "about-en", info.project.name);
  });

  test("in Spanish too", async ({ page }, info) => {
    await page.goto("/es/about");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quién hace Ethos");
    await expect(page.getByTestId("about")).toContainText("27 de marzo de 2026");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/es\/about$/);
    await shot(page, "about-es", info.project.name);
  });

  test("is linked from every page's footer", async ({ page }) => {
    await page.goto("/templates");
    await expect(page.locator("footer").getByRole("link", { name: "About", exact: true })).toHaveAttribute("href", "/about");
  });

  test("/contact leads to how to reach us", async ({ request }) => {
    for (const [from, to] of [
      ["/contact", "/about#contact"],
      ["/es/contact", "/es/about#contact"],
    ]) {
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status(), from).toBe(307);
      expect(res.headers().location, from).toBe(to);
    }
  });
});

test.describe("The Letter's page in Portuguese", () => {
  test("is written in Portuguese and leads to the editor and the demo", async ({ page }, info) => {
    await page.goto("/pt/carta-digital");
    const body = page.getByTestId("carta-digital");
    await expect(body).toHaveAttribute("lang", "pt-BR");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Carta digital de amor");
    await expect(body.getByRole("link", { name: "Criar minha carta" })).toHaveAttribute("href", "/create/the-letter");
    // The button, and the picture beside it, both open the demo.
    for (const demo of await body.getByRole("link", { name: "Ver uma carta pronta", exact: true }).all()) await expect(demo).toHaveAttribute("href", "/demo/the-letter");
    expect(await body.getByRole("link", { name: "Ver uma carta pronta", exact: true }).count()).toBe(2);
    // What is free follows the server's free-note setting: the short note as live has it, the whole letter without it.
    await expect(body).toContainText(process.env.NEXT_PUBLIC_FREE_NOTE_SHARE === "1" ? "até 500 caracteres" : "a carta inteira");
    await expect(page).toHaveTitle(/Carta digital de amor: crie sua carta virtual com música/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/pt\/carta-digital$/);
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n");
    expect(ld).toContain('"@type":"FAQPage"');
    expect(ld).toContain('"inLanguage":"pt-BR"');
    await shot(page, "carta-digital", info.project.name);
  });

  test("keeps one address under the Spanish menus too", async ({ page }) => {
    await page.goto("/es/pt/carta-digital");
    await expect(page.getByTestId("carta-digital")).toHaveAttribute("lang", "pt-BR");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /(?<!\/es)\/pt\/carta-digital$/);
  });

  test("is linked from The Letter's own page", async ({ page }) => {
    await page.goto("/templates/the-letter");
    await expect(page.getByRole("link", { name: "Também em português: carta digital" })).toHaveAttribute("href", "/pt/carta-digital");
  });
});
