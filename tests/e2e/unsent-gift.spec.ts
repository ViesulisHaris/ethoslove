import { expect, test } from "@playwright/test";
import { needPreviews } from "./server-state";

/**
 * My gifts after paying, before the gift is sent: a card that says so and opens the gift ready to
 * publish, in place of "You haven't made a gift yet" (12 Nov 2026: a buyer opened My gifts some
 * forty times in 26 minutes looking for the gift he had just paid for). Drawn from the development
 * preview (?unsent=<template>), as a real one needs a purchase; on a production build this skips.
 */
test.describe("a gift paid for and not sent yet", () => {
  test.beforeEach(async ({ request }) => needPreviews(request));

  test("leads My gifts, opens the gift with the publish step, and replaces the empty state", async ({ page }) => {
    await page.goto("/dashboard?unsent=party-animals");
    const card = page.getByTestId("unsent-gift");
    await expect(card).toContainText("Your Party Animals gift is paid for");
    await expect(card).toContainText("It's saved on the phone or computer you made it on, so open it there.");
    await expect(card.getByRole("link", { name: "Finish and send it" })).toHaveAttribute("href", "/create/party-animals?resume=publish");
    await expect(page.getByText("You haven't made a gift yet.")).toHaveCount(0);
  });

  test("in Spanish", async ({ page }) => {
    await page.goto("/es/dashboard?unsent=party-animals");
    const card = page.getByTestId("unsent-gift");
    await expect(card).toContainText("Tu regalo Fiesta Animal está pagado");
    await expect(card.getByRole("link", { name: "Terminar y enviarlo" })).toHaveAttribute("href", "/es/create/party-animals?resume=publish");
  });

  test("without one, My gifts is as it was", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("unsent-gift")).toHaveCount(0);
    await expect(page.getByText("You haven't made a gift yet.")).toBeVisible();
  });
});
