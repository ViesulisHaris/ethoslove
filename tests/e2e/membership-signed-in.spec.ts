import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * Ethos for Two as a signed-in member, partner or free user sees it: the pricing page's hero and
 * the account page's section, in every state a membership can be in (docs/MEMBERSHIP.md 4.1, 4.2).
 *
 * Nobody signs in: the dev server's database is production. The pricing page decides from GET
 * /api/entitlements, which each test answers itself; the browser only asks when it holds a Supabase
 * session cookie, so the tests set one the server can't read (it isn't the project's, so the server
 * sees a visitor and never calls Supabase with it). The account section is the development-only
 * preview (/for-two/preview?state=…) of the account page's component, whose buttons call the real
 * routes (POST /api/membership, /api/stripe/portal), answered here and only looked at.
 */

const DAY = 86_400_000;
const iso = (days: number) => new Date(Date.now() + days * DAY).toISOString();
const longDate = (value: string, locale = "en") => new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(value));

type Summary = Record<string, unknown>;

/** A running monthly subscription, owned, with no partner yet: each test changes what it's about. */
function member(over: Summary = {}): Summary {
  return {
    provider: "stripe_subscription",
    plan: "monthly",
    status: "active",
    running: true,
    isOwner: true,
    partnerJoined: false,
    partner: null,
    inviteUrl: "https://tryethos.io/for-two/join?code=abcdefgh23",
    periodEnd: iso(18),
    renews: true,
    endsAt: null,
    pendingPlan: null,
    manage: "stripe",
    canSwitchToYearly: true,
    canSwitchToMonthly: false,
    ...over,
  };
}

async function signedIn(context: BrowserContext, baseURL: string | undefined) {
  // Matches the browser's "is there a session" test (sb-…auth-token) but not the project's own key.
  await context.addCookies([{ name: "sb-e2e-auth-token", value: "e2e", url: baseURL ?? "http://localhost:3000" }]);
}

async function answerEntitlements(page: Page, membership: Summary | null) {
  await page.route("**/api/entitlements", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ signedIn: true, templates: [], packs: [], pass: null, membership, upgrade: null }) }),
  );
}

async function answerCheckout(page: Page) {
  const asked: Record<string, unknown>[] = [];
  await page.route("**/api/stripe/checkout", async (route) => {
    asked.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: "rate_limited" }) });
  });
  return asked;
}

test.describe("the pricing page, signed in", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await signedIn(context, baseURL);
  });

  test("a member sees what they have, with the day it renews, instead of a button to buy it again", async ({ page }) => {
    const summary = member();
    await answerEntitlements(page, summary);
    await page.goto("/pricing?subscriptions=on");
    const card = page.getByTestId("membership-member");
    await expect(card).toContainText("You have Ethos for Two");
    await expect(card).toContainText(`Monthly · renews on ${longDate(summary.periodEnd as string)}`);
    await expect(card.getByRole("link", { name: "Manage" })).toHaveAttribute("href", "/account#for-two");
    // Nothing to choose or pay for: no plans, no price, no button.
    await expect(page.getByTestId("buy-membership")).toHaveCount(0);
    await expect(page.getByTestId("plan-toggle")).toHaveCount(0);
    await expect(page.getByTestId("membership-offer")).not.toContainText("€");
  });

  test("a partner is in on it, and isn't sold their own", async ({ page }) => {
    await answerEntitlements(page, member({ isOwner: false, partnerJoined: true, partner: { name: "Alex", initial: "A" }, inviteUrl: undefined, manage: null }));
    await page.goto("/pricing?subscriptions=on");
    await expect(page.getByTestId("membership-member")).toContainText("You're in on your partner's Ethos for Two");
    await expect(page.getByTestId("buy-membership")).toHaveCount(0);
  });

  test("a cancelled membership says when it ends", async ({ page }) => {
    await answerEntitlements(page, member({ renews: false, endsAt: iso(18) }));
    await page.goto("/pricing?subscriptions=on");
    await expect(page.getByTestId("membership-member-line")).toHaveText(`Ends on ${longDate(iso(18))}`);
  });

  test("a renewal being retried asks for the card by the day its grace ends, and points to where to fix it", async ({ page }) => {
    await answerEntitlements(page, member({ status: "past_due", renews: false, periodEnd: iso(-2), endsAt: iso(5), canSwitchToYearly: false }));
    await page.goto("/pricing?subscriptions=on");
    const card = page.getByTestId("membership-member");
    await expect(card).toHaveAttribute("data-state", "paymentFailed");
    await expect(page.getByTestId("membership-member-line")).toHaveText(`Payment failed: update your card by ${longDate(iso(5))}`);
    await expect(card.getByRole("link", { name: "Update your card" })).toHaveAttribute("href", "/account#for-two");
    await expect(page.getByTestId("buy-membership")).toHaveCount(0);
  });

  test("a first payment the bank is confirming is on its way, not a failure", async ({ page }) => {
    await answerEntitlements(page, member({ status: "incomplete", running: false, renews: false, endsAt: iso(0), canSwitchToYearly: false }));
    await page.goto("/pricing?subscriptions=on");
    await expect(page.getByTestId("membership-member-line")).toHaveText("Your first payment is still being confirmed");
    await expect(page.getByTestId("membership-member")).not.toContainText("failed");
    await expect(page.getByTestId("buy-membership")).toHaveCount(0);
  });

  test("an App Store renewal Apple can't collect is fixed in the iPhone's Settings, not with a card here", async ({ page }) => {
    await answerEntitlements(page, member({ provider: "app_store", manage: "app_store", status: "past_due", renews: false, endsAt: iso(4), canSwitchToYearly: false }));
    await page.goto("/pricing?subscriptions=on");
    await expect(page.getByTestId("membership-member-line")).toHaveText(`Apple couldn't take your last payment: update it in your iPhone's Settings by ${longDate(iso(4))}`);
    await expect(page.getByTestId("membership-member").getByRole("link", { name: "Manage" })).toBeVisible();
  });

  test("a pass holder runs their year; near its end, while the pass is what's sold, they're offered the next one", async ({ page }) => {
    const pass = (days: number) => member({ provider: "stripe_pass", plan: "yearly", periodEnd: iso(days), renews: false, endsAt: iso(days), manage: "pass", canSwitchToYearly: false });
    await answerEntitlements(page, pass(200));
    await page.goto("/pricing?subscriptions=off");
    await expect(page.getByTestId("membership-member-line")).toHaveText(`Your year runs until ${longDate(iso(200))}`);

    await page.unroute("**/api/entitlements");
    await answerEntitlements(page, pass(12));
    const asked = await answerCheckout(page);
    await page.goto("/pricing?subscriptions=off");
    const renew = page.getByTestId("buy-membership");
    await expect(renew).toHaveText("Renew for another year");
    await expect(page.getByTestId("membership-offer")).toContainText("Renewing adds a year from the day yours ends");
    await renew.click();
    await expect.poll(() => asked.length).toBe(1);
    expect(asked[0]).toMatchObject({ product: "membership", plan: "yearly" });
  });

  test("a free user sent here at the saved-dates limit lands on the offer, and buys it with the plan alone", async ({ page }) => {
    await answerEntitlements(page, null);
    const asked = await answerCheckout(page);
    await page.goto("/pricing?subscriptions=on&from=saved-dates#for-two");
    const offer = page.getByTestId("membership-offer");
    await expect(offer).toBeInViewport();
    await expect(offer).toHaveClass(/ring-starlight/);
    await expect(page.getByTestId("plan-yearly")).toHaveAttribute("aria-checked", "true");
    await page.getByTestId("plan-monthly").click();
    await page.getByTestId("buy-membership").click();
    await expect.poll(() => asked.length).toBe(1);
    expect(asked[0]).toMatchObject({ product: "membership", plan: "monthly", currency: "eur", locale: "en", returnTo: "/account" });
    expect(Object.keys(asked[0]).filter((k) => /amount|price|total|code/i.test(k))).toEqual([]);
    await expect(page.getByText("Too many tries. Wait a minute and try again.")).toBeVisible();
  });

  test("in Spanish, a member's line is in Spanish with a Spanish date", async ({ page }) => {
    const summary = member({ plan: "yearly", periodEnd: iso(210) });
    await answerEntitlements(page, summary);
    await page.goto("/es/pricing?subscriptions=on");
    await expect(page.getByTestId("membership-member")).toContainText("Tienes Ethos for Two");
    await expect(page.getByTestId("membership-member-line")).toHaveText(`Anual · se renueva el ${longDate(iso(210), "es")}`);
  });
});

/** Answers POST /api/membership with `answers[action]` and keeps every body it was sent. */
async function answerMembership(page: Page, answers: Record<string, { status: number; body: unknown }>) {
  const asked: Record<string, unknown>[] = [];
  await page.route("**/api/membership", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    asked.push(body);
    const answer = answers[String(body.action)] ?? { status: 409, body: { error: "not_available" } };
    await route.fulfill({ status: answer.status, contentType: "application/json", body: JSON.stringify(answer.body) });
  });
  return asked;
}

test.describe("the account page's Ethos for Two section", () => {
  test("a monthly member cancels in one confirm: it says until when, and offers the way back", async ({ page }) => {
    const ends = iso(18);
    const asked = await answerMembership(page, { cancel: { status: 200, body: { ok: true, membership: member({ periodEnd: ends, renews: false, endsAt: ends }) } } });
    await page.goto("/for-two/preview?state=monthly");
    const section = page.getByTestId("account-membership");
    await expect(page.getByTestId("membership-status")).toHaveText(`Monthly · €4.99 a month · renews on ${longDate(ends)}`);
    await expect(section.getByTestId("invite-link")).toContainText("tryethos.io/for-two/join?code=preview234");

    await section.getByTestId("membership-cancel").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Cancel Ethos for Two?" })).toBeVisible();
    await expect(dialog).toContainText(`You both keep everything until ${longDate(ends)}.`);
    await dialog.getByRole("button", { name: "Cancel membership" }).click();
    await expect.poll(() => asked).toEqual([{ action: "cancel", locale: "en" }]);

    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("membership-status")).toHaveText(`Ends on ${longDate(ends)}: you keep everything until then`);
    await expect(section.getByTestId("membership-resume")).toBeVisible();
    await expect(section.getByTestId("membership-cancel")).toHaveCount(0);
  });

  test("keeping it closes the dialog and changes nothing", async ({ page }) => {
    const asked = await answerMembership(page, {});
    await page.goto("/for-two/preview?state=monthly");
    await page.getByTestId("membership-cancel").click();
    await page.getByRole("dialog").getByRole("button", { name: "Keep it" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(asked).toEqual([]);
  });

  test("switching to yearly shows today's amount first, and a declined payment changes nothing", async ({ page }) => {
    const periodEnd = iso(365);
    const asked = await answerMembership(page, {
      preview_yearly: { status: 200, body: { ok: true, preview: { amountDue: 2500, currency: "eur", periodEnd } } },
      switch_to_yearly: { status: 402, body: { error: "payment_failed" } },
    });
    await page.goto("/for-two/preview?state=monthly");
    await page.getByTestId("membership-switch-yearly").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(`You'll pay €25.00 today: €29.99 for a year, minus €4.99 for the rest of this month. It then renews every year on ${longDate(periodEnd)} until you cancel.`);
    await dialog.getByRole("button", { name: "Switch and pay €25.00" }).click();
    await expect(dialog).toContainText("The payment didn't go through, so nothing has changed.");
    await expect(dialog.getByRole("button", { name: "Update card" })).toBeVisible();
    expect(asked.map((body) => body.action)).toEqual(["preview_yearly", "switch_to_yearly"]);
  });

  test("a renewal being retried asks for the card by a day, and Update card opens Stripe's page for exactly that", async ({ page }) => {
    const portal: Record<string, unknown>[] = [];
    await page.route("**/api/stripe/portal", async (route) => {
      portal.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: "https://billing.stripe.com/p/session/test_e2e" }) });
    });
    await page.route("https://billing.stripe.com/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>Stripe</title>" }));
    await page.goto("/for-two/preview?state=past-due");
    const warning = page.getByTestId("membership-past-due");
    await expect(warning).toContainText(`We couldn't take your last payment. Update your card by ${longDate(iso(5))} to keep Ethos for Two.`);
    await expect(page.getByTestId("membership-status")).toHaveText("Monthly · €4.99 a month");
    // Nothing to switch while a payment is owed; cancelling stays one tap away.
    await expect(page.getByTestId("membership-switch-yearly")).toHaveCount(0);
    await expect(page.getByTestId("membership-cancel")).toBeVisible();
    await warning.getByRole("button", { name: "Update card" }).click();
    await page.waitForURL("https://billing.stripe.com/**");
    expect(portal).toEqual([{ flow: "update_card", locale: "en" }]);
  });

  test("past its grace it's paused until the payment goes through", async ({ page }) => {
    await page.goto("/for-two/preview?state=paused");
    await expect(page.getByTestId("membership-past-due")).toContainText("Ethos for Two is paused until the payment goes through.");
  });

  test("a first payment being confirmed is on its way: no warning, no card to update, nothing to cancel or share yet", async ({ page }) => {
    await page.goto("/for-two/preview?state=processing");
    await expect(page.getByTestId("membership-status")).toHaveText("Your first payment is being confirmed");
    await expect(page.getByTestId("membership-processing")).toContainText("Ethos for Two starts as soon as your bank confirms it");
    await expect(page.getByTestId("membership-past-due")).toHaveCount(0);
    await expect(page.getByTestId("membership-cancel")).toHaveCount(0);
    await expect(page.getByTestId("invite-link")).toHaveCount(0);
  });

  test("an App Store member is sent to the iPhone's Settings, with no billing buttons of ours", async ({ page }) => {
    await page.goto("/for-two/preview?state=app-store-billing");
    await expect(page.getByTestId("membership-status")).toHaveText("Through the App Store");
    await expect(page.getByTestId("membership-past-due")).toContainText("Apple couldn't take your last payment. Update your payment method in your iPhone's Settings");
    await expect(page.getByRole("button", { name: "Update card" })).toHaveCount(0);
    await expect(page.getByTestId("membership-billing")).toHaveCount(0);

    await page.goto("/for-two/preview?state=app-store");
    await expect(page.getByTestId("membership-status")).toHaveText(`Through the App Store · renews on ${longDate(iso(18))}`);
    await expect(page.getByTestId("account-membership")).toContainText("Manage it in your iPhone's Settings → your name → Subscriptions.");
  });

  test("a pass runs its year; in its last month, while the pass is sold, it offers the next year", async ({ page }) => {
    await page.goto("/for-two/preview?state=pass");
    await expect(page.getByTestId("membership-status")).toHaveText(`Your year runs until ${longDate(iso(210))}`);
    await expect(page.getByTestId("membership-billing")).toHaveCount(0);

    await page.goto("/for-two/preview?state=pass-ending&subscriptions=off");
    await expect(page.getByTestId("account-membership").getByRole("link", { name: "Renew for €29.99" })).toHaveAttribute("href", "/pricing?renew=pass#for-two");
    await page.goto("/for-two/preview?state=pass-ending");
    await expect(page.getByTestId("account-membership").getByRole("link", { name: "See the plans" })).toHaveAttribute("href", "/pricing#for-two");
  });

  test("a partner can leave, after one confirm, and is then offered their own", async ({ page }) => {
    const asked = await answerMembership(page, { leave: { status: 200, body: { ok: true, membership: null } } });
    await page.goto("/for-two/preview?state=partner");
    await expect(page.getByTestId("membership-status")).toHaveText("You're in on Alex's Ethos for Two");
    await expect(page.getByTestId("membership-billing")).toHaveCount(0);
    await page.getByTestId("membership-leave").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Leave Alex's Ethos for Two?" })).toBeVisible();
    await dialog.getByRole("button", { name: "Leave", exact: true }).click();
    await expect.poll(() => asked).toEqual([{ action: "leave", locale: "en" }]);
    await expect(page.getByTestId("account-membership-none")).toBeVisible();
    await expect(page.getByTestId("account-membership-none").getByRole("link", { name: "See Ethos for Two" })).toHaveAttribute("href", "/pricing?from=account#for-two");
  });

  test("an owner whose partner joined can remove them", async ({ page }) => {
    const asked = await answerMembership(page, { remove_partner: { status: 200, body: { ok: true, membership: member() } } });
    await page.goto("/for-two/preview?state=with-partner");
    await expect(page.getByTestId("account-membership")).toContainText("Sam has joined");
    await page.getByTestId("membership-remove").click();
    await page.getByRole("dialog").getByRole("button", { name: "Remove", exact: true }).click();
    await expect.poll(() => asked).toEqual([{ action: "remove_partner", locale: "en" }]);
    await expect(page.getByTestId("invite-link")).toBeVisible();
  });

  test("somebody without one (a free user at the saved-dates limit too) is shown what it is and what it costs", async ({ page }) => {
    await page.goto("/for-two/preview?state=none");
    const none = page.getByTestId("account-membership-none");
    await expect(none).toContainText("Unlimited saved dates, every template and game pack, for both of you. €4.99 a month or €29.99 a year.");
    await page.goto("/for-two/preview?state=none&subscriptions=off");
    await expect(page.getByTestId("account-membership-none")).toContainText("€29.99 for a year, paid once.");
  });

  test("in Spanish", async ({ page }) => {
    await page.goto("/es/for-two/preview?state=past-due");
    await expect(page.getByTestId("membership-status")).toHaveText("Mensual · 4,99 € al mes");
    await expect(page.getByTestId("membership-past-due")).toContainText(`Actualiza tu tarjeta antes del ${longDate(iso(5), "es")}`);
  });
});

test.describe("joining a partner's Ethos for Two, signed in", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await signedIn(context, baseURL);
  });

  async function answerJoin(page: Page, answer: { status: number; body: unknown }) {
    const asked: unknown[] = [];
    await page.route("**/api/for-two/join", async (route) => {
      asked.push(route.request().postDataJSON());
      await route.fulfill({ status: answer.status, contentType: "application/json", body: JSON.stringify(answer.body) });
    });
    return asked;
  }

  test("joins with one tap; a membership that renews by itself promises no end date", async ({ page }) => {
    await answerEntitlements(page, null);
    const asked = await answerJoin(page, { status: 200, body: { ok: true, endsAt: null, renews: true } });
    await page.goto("/for-two/join?code=abcdefghij");
    await page.getByTestId("join-submit").click();
    await expect.poll(() => asked).toEqual([{ code: "abcdefghij" }]);
    const done = page.getByTestId("join-done");
    await expect(done).toContainText("You're in.");
    await expect(done).toContainText("for as long as it runs.");
    await expect(done.getByRole("link", { name: "See my dates" })).toHaveAttribute("href", "/my-dates");
  });

  test("one that ends (a pass, or a cancelled subscription) says until when", async ({ page }) => {
    await answerEntitlements(page, null);
    await answerJoin(page, { status: 200, body: { ok: true, endsAt: iso(40), renews: false } });
    await page.goto("/for-two/join?code=abcdefghij");
    await page.getByTestId("join-submit").click();
    await expect(page.getByTestId("join-done")).toContainText(`until ${longDate(iso(40))}.`);
  });

  test("someone with an Ethos for Two of their own is told why they can't join a second, and what would work", async ({ page }) => {
    // Cancelling keeps a membership to its period end, so the page never says "cancel yours first".
    await answerEntitlements(page, null);
    await answerJoin(page, { status: 409, body: { error: "has_own", role: "owner", endsAt: null } });
    await page.goto("/for-two/join?code=abcdefghij");
    await page.getByTestId("join-submit").click();
    await expect(page.getByTestId("join-error")).toHaveText(
      "You already have Ethos for Two of your own, and it renews by itself. Ask your partner to join yours instead: your invite link is on your account page. If you cancel yours, you can join theirs once it ends.",
    );
    await expect(page.getByTestId("join-error-account")).toHaveAttribute("href", "/account");
  });

  test("one of their own that ends says when they can join; another couple's says to leave it", async ({ page }) => {
    await answerEntitlements(page, null);
    await answerJoin(page, { status: 409, body: { error: "has_own", role: "owner", endsAt: iso(40) } });
    await page.goto("/for-two/join?code=abcdefghij");
    await page.getByTestId("join-submit").click();
    await expect(page.getByTestId("join-error")).toHaveText(
      `Your own Ethos for Two runs until ${longDate(iso(40))}. Ask your partner to join yours instead (your invite link is on your account page), or join theirs once yours ends.`,
    );
    await page.unroute("**/api/for-two/join");
    await answerJoin(page, { status: 409, body: { error: "has_own", role: "partner", endsAt: null } });
    await page.getByTestId("join-submit").click();
    await expect(page.getByTestId("join-error")).toHaveText("You’re already in someone else’s Ethos for Two. Leave it from your account page first, then open this link again.");
  });
});
