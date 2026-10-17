import { expect, test } from "@playwright/test";

/**
 * The lifecycle pieces that work signed out: the links in reminder and checkout emails, and the
 * reminders API refusing anyone without a session. Nothing here writes to the database: every
 * link used is one we never signed.
 */

test.describe("links from emails", () => {
  for (const path of ["/api/reminders/remove", "/api/email/unsubscribe"]) {
    test(`${path} with a forged token shows a page and acts on nothing`, async ({ page, request }) => {
      const response = await page.goto(`${path}?t=5f0c6f7e-3a55-4d2b-9a57-0e8a3f1b2c4d.forged&l=en`);
      // 404 for a token we didn't make; 503 on a server without the secret to check it with.
      expect([404, 503]).toContain(response?.status());
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(/This link doesn't work\.|Something went wrong\./);
      await expect(page.getByRole("button")).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Go to Ethos" })).toBeVisible();
      // What a mail app's one-click unsubscribe sends: refused the same way.
      const oneClick = await request.post(`${path}?t=forged`, { form: { "List-Unsubscribe": "One-Click" } });
      expect([404, 503]).toContain(oneClick.status());
    });
  }

  test("the page speaks Spanish when the link says so", async ({ page }) => {
    await page.goto("/api/email/unsubscribe?t=forged&l=es");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Este enlace no funciona\.|Algo ha fallado\./);
  });
});

test.describe("reminders API", () => {
  test("needs a sign-in to list, save or remove", async ({ request }) => {
    expect((await request.get("/api/reminders")).status()).toBe(401);
    expect((await request.post("/api/reminders", { data: { recipientName: "Ana", occasion: "birthday", month: 10, day: 3 } })).status()).toBe(401);
    expect((await request.delete("/api/reminders?id=5f0c6f7e-3a55-4d2b-9a57-0e8a3f1b2c4d")).status()).toBe(401);
  });

  test("the cron refuses a request without the secret", async ({ request }) => {
    expect((await request.get("/api/cron/reminders")).status()).toBe(401);
  });
});
