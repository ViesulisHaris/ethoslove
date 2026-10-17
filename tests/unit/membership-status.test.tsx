import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import type { MembershipSummary } from "@/lib/membership/types";
import { membershipState, needsPayment, type MembershipState } from "@/components/membership/status";
import { ARRIVING_TRIES, ARRIVING_WAIT_MS, membershipSuccess, readStartedMembership, type StartedRow } from "@/components/membership/success";
import { heroMemberState } from "@/components/pricing/offers";

const app = vi.hoisted(() => ({ inApp: false }));
vi.mock("@/lib/app/use-bridge", () => ({ useInApp: () => app.inApp, useNativeEvents: () => undefined, useNativeReady: () => undefined }));
// next-intl's navigation reaches for Next's router, which a unit test doesn't have: a plain link will do.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => "/account",
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
}));

const { MembershipPanel } = await import("@/components/membership/membership-panel");

const DAY = 86_400_000;
const NOW = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();
const PERIOD_END = iso(NOW + 20 * DAY);
const GRACE_END = iso(NOW + 5 * DAY);

/** A running monthly subscription, owned, with no partner yet: each case changes what it's about. */
function member(over: Partial<MembershipSummary> = {}): MembershipSummary {
  return {
    provider: "stripe_subscription",
    plan: "monthly",
    status: "active",
    running: true,
    isOwner: true,
    partnerJoined: false,
    partner: null,
    inviteUrl: "https://tryethos.io/for-two/join?code=abcdefgh23",
    periodEnd: PERIOD_END,
    renews: true,
    endsAt: null,
    pendingPlan: null,
    manage: "stripe",
    canSwitchToYearly: true,
    canSwitchToMonthly: false,
    ...over,
  };
}

/** Every state a summary can be in, as GET /api/entitlements and the account page's readMembership send it. */
const CASES: Record<string, { summary: MembershipSummary; state: MembershipState }> = {
  incomplete: {
    // A first payment the bank is confirming: zero length, not running, renewing nothing yet.
    summary: member({ status: "incomplete", running: false, renews: false, endsAt: iso(NOW - 60_000), canSwitchToYearly: false }),
    state: { kind: "processing" },
  },
  monthly: { summary: member(), state: { kind: "renewing", plan: "monthly", date: PERIOD_END } },
  yearly: { summary: member({ plan: "yearly", canSwitchToYearly: false, canSwitchToMonthly: true }), state: { kind: "renewing", plan: "yearly", date: PERIOD_END } },
  pastDueInGrace: {
    summary: member({ status: "past_due", renews: false, endsAt: GRACE_END, canSwitchToYearly: false }),
    state: { kind: "pastDue", plan: "monthly", date: GRACE_END },
  },
  pastDueAfterGrace: {
    summary: member({ status: "past_due", running: false, renews: false, endsAt: iso(NOW - DAY), canSwitchToYearly: false }),
    state: { kind: "paused", plan: "monthly" },
  },
  cancelling: { summary: member({ renews: false, endsAt: PERIOD_END }), state: { kind: "cancelling", plan: "monthly", date: PERIOD_END } },
  pass: {
    summary: member({ provider: "stripe_pass", plan: "yearly", renews: false, endsAt: iso(NOW + 200 * DAY), periodEnd: iso(NOW + 200 * DAY), manage: "pass", canSwitchToYearly: false }),
    state: { kind: "pass", date: iso(NOW + 200 * DAY), web: true },
  },
  appPass: {
    summary: member({ provider: "app_store_pass", plan: "yearly", renews: false, endsAt: iso(NOW + 200 * DAY), periodEnd: iso(NOW + 200 * DAY), manage: "pass", canSwitchToYearly: false }),
    state: { kind: "pass", date: iso(NOW + 200 * DAY), web: false },
  },
  appStore: { summary: member({ provider: "app_store", manage: "app_store", canSwitchToYearly: false }), state: { kind: "appStore", date: PERIOD_END } },
  appStoreEnding: {
    summary: member({ provider: "app_store", manage: "app_store", renews: false, endsAt: PERIOD_END, canSwitchToYearly: false }),
    state: { kind: "appStoreEnding", date: PERIOD_END },
  },
  appStorePastDue: {
    summary: member({ provider: "app_store", manage: "app_store", status: "past_due", renews: false, endsAt: GRACE_END, canSwitchToYearly: false }),
    state: { kind: "appStoreBilling", date: GRACE_END },
  },
  partner: {
    summary: member({ isOwner: false, partnerJoined: true, partner: { name: "Alex", initial: "A" }, inviteUrl: undefined, manage: null, canSwitchToYearly: false }),
    state: { kind: "partner", until: null },
  },
  partnerCancelling: {
    summary: member({ isOwner: false, partnerJoined: true, partner: { name: "Alex", initial: "A" }, inviteUrl: undefined, manage: null, renews: false, endsAt: PERIOD_END, canSwitchToYearly: false }),
    state: { kind: "partner", until: PERIOD_END },
  },
  ended: {
    // What a summary would say about a subscription that no longer runs (the server sends null for it).
    summary: member({ running: false, renews: false, endsAt: iso(NOW - DAY), canSwitchToYearly: false }),
    state: { kind: "none" },
  },
};

describe("one reading of a membership, for every page", () => {
  for (const [name, { summary, state }] of Object.entries(CASES)) {
    it(`reads ${name}`, () => {
      expect(membershipState(summary)).toEqual(state);
    });
  }

  it("is nothing without a membership, and nothing for a partner whose couple's membership stopped", () => {
    expect(membershipState(null)).toEqual({ kind: "none" });
    expect(membershipState(member({ isOwner: false, running: false, manage: null }))).toEqual({ kind: "none" });
  });

  it("calls a payment to fix only what really needs one: never a first payment being confirmed", () => {
    expect(needsPayment(membershipState(CASES.pastDueInGrace.summary))).toBe(true);
    expect(needsPayment(membershipState(CASES.pastDueAfterGrace.summary))).toBe(true);
    expect(needsPayment(membershipState(CASES.appStorePastDue.summary))).toBe(true);
    for (const name of ["incomplete", "monthly", "cancelling", "pass", "appStore", "appStoreEnding", "partner"]) expect(needsPayment(membershipState(CASES[name].summary)), name).toBe(false);
  });
});

describe("the pricing page's hero and the account page agree", () => {
  const ctx = { subscriptions: true, renewAsked: false, now: NOW };
  const heroLine = (messages: typeof en, name: string) => {
    const hero = heroMemberState(CASES[name].summary, ctx);
    if (hero.kind !== "member") return hero.kind;
    return (messages.membership.member as Record<string, string>)[hero.line];
  };

  const panel = (summary: MembershipSummary | null, messages: typeof en = en, locale: "en" | "es" = "en", subscriptions = true) =>
    renderToStaticMarkup(
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        <MembershipPanel membership={summary} currency="eur" subscriptions={subscriptions} />
      </NextIntlClientProvider>,
    );
  const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ");

  it("a first payment still being confirmed is on its way on both, never a failure, with no card to update and nothing to cancel", () => {
    expect(heroLine(en, "incomplete")).toBe("Your first payment is still being confirmed");
    const html = panel(CASES.incomplete.summary);
    expect(text(html)).toContain("Your first payment is being confirmed");
    expect(html).toContain('data-testid="membership-processing"');
    expect(html).not.toContain('data-testid="membership-past-due"');
    expect(text(html)).not.toMatch(/couldn't take|failed|paused|Update card/i);
    expect(html).not.toContain('data-testid="membership-cancel"');
    expect(html).not.toContain('data-testid="membership-switch-yearly"');
    // Nobody can join a membership that doesn't run yet.
    expect(html).not.toContain("for-two/join?code=");
  });

  it("a renewal being retried asks for the card by the same day on both, and can still be cancelled", () => {
    expect(heroLine(en, "pastDueInGrace")).toBe("Payment failed: update your card by {date}");
    const html = panel(CASES.pastDueInGrace.summary);
    const day = new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(GRACE_END));
    expect(text(html)).toContain(`We couldn't take your last payment. Update your card by ${day} to keep Ethos for Two.`);
    expect(text(html)).toContain("Update card");
    expect(html).toContain('data-testid="membership-cancel"');
    expect(html).not.toContain('data-testid="membership-switch-yearly"');
  });

  it("a renewal past its grace is paused on both", () => {
    expect(heroLine(en, "pastDueAfterGrace")).toBe("Paused: your last payment didn't go through");
    const html = panel(CASES.pastDueAfterGrace.summary);
    expect(text(html)).toContain("Ethos for Two is paused until the payment goes through.");
    expect(text(html)).toContain("Update card");
  });

  it("an App Store renewal Apple can't collect is fixed in iOS on both: no card of ours, no billing buttons", () => {
    expect(heroLine(en, "appStorePastDue")).toMatch(/^Apple couldn't take your last payment/);
    const html = panel(CASES.appStorePastDue.summary);
    expect(text(html)).toContain("Through the App Store");
    expect(text(html)).toContain("Apple couldn't take your last payment. Update your payment method in your iPhone's Settings");
    expect(text(html)).not.toContain("Update card");
    expect(html).not.toContain('data-testid="membership-billing"');
    expect(html).not.toContain('data-testid="membership-cancel"');
  });

  it("an App Store membership renewing, or ending, says so with its day on both", () => {
    const day = new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(PERIOD_END));
    expect(heroLine(en, "appStore")).toBe("Through the App Store · renews on {date}");
    expect(text(panel(CASES.appStore.summary))).toContain(`Through the App Store · renews on ${day}`);
    expect(heroLine(en, "appStoreEnding")).toBe("Through the App Store · ends on {date}");
    expect(text(panel(CASES.appStoreEnding.summary))).toContain(`Through the App Store · ends on ${day}`);
  });

  it("a renewing plan shows its price and day, with every change it allows", () => {
    const day = new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(PERIOD_END));
    const html = panel(CASES.monthly.summary);
    expect(text(html)).toContain(`Monthly · €4.99 a month · renews on ${day}`);
    for (const id of ["membership-billing", "membership-switch-yearly", "membership-cancel"]) expect(html).toContain(`data-testid="${id}"`);
    expect(html).toContain("for-two/join?code=abcdefgh23");
    expect(heroLine(en, "monthly")).toBe("Monthly · renews on {date}");
  });

  it("cancelling runs to its end and offers the way back, not another cancel", () => {
    const html = panel(CASES.cancelling.summary);
    expect(text(html)).toMatch(/Ends on .+: you keep everything until then/);
    expect(html).toContain('data-testid="membership-resume"');
    expect(html).not.toContain('data-testid="membership-cancel"');
    expect(heroLine(en, "cancelling")).toBe("Ends on {date}");
  });

  it("a pass runs its year, with nothing to bill", () => {
    const html = panel(CASES.pass.summary);
    expect(text(html)).toMatch(/Your year runs until /);
    expect(html).not.toContain('data-testid="membership-billing"');
    expect(heroLine(en, "pass")).toBe("Your year runs until {date}");
  });

  it("a partner is in on it, can leave, and sees no billing", () => {
    const html = panel(CASES.partner.summary);
    expect(text(html)).toContain("You're in on Alex's Ethos for Two");
    expect(text(html)).toContain("For as long as it runs.");
    expect(html).toContain('data-testid="membership-leave"');
    expect(html).not.toContain('data-testid="membership-billing"');
    expect(text(panel(CASES.partnerCancelling.summary))).toMatch(/Until .+\./);
    expect(heroMemberState(CASES.partner.summary, ctx)).toEqual({ kind: "partner" });
  });

  it("offers it again once nothing runs", () => {
    expect(heroMemberState(CASES.ended.summary, ctx)).toEqual({ kind: "buy" });
    expect(panel(CASES.ended.summary)).toContain('data-testid="account-membership-none"');
    expect(panel(null)).toContain('data-testid="account-membership-none"');
  });

  it("has every line in Spanish too, with the day in each dated one", () => {
    for (const name of Object.keys(CASES)) {
      const hero = heroMemberState(CASES[name].summary, ctx);
      if (hero.kind !== "member") continue;
      const lineEs = (es.membership.member as Record<string, string>)[hero.line];
      expect(lineEs, name).toEqual(expect.any(String));
      expect(lineEs.includes("{date}"), name).toBe(hero.date !== null);
      expect(((en.membership.member as Record<string, string>)[hero.line]).includes("{date}"), name).toBe(hero.date !== null);
    }
    const html = text(panel(CASES.appStorePastDue.summary, es, "es"));
    expect(html).toContain("Apple no ha podido cobrar tu último pago");
    expect(text(panel(CASES.incomplete.summary, es, "es"))).toContain("Tu primer pago se está confirmando");
  });
});

describe("the success page after an Ethos for Two checkout", () => {
  const row = (over: Partial<StartedRow> = {}): StartedRow => ({ plan: "yearly", status: "active", current_period_end: PERIOD_END, partner_user_id: null, ...over });
  const noWait = async () => undefined;

  it("reads the row the checkout started", async () => {
    let asked = 0;
    const read = await readStartedMembership(async () => (asked++, { data: row(), error: null }), { sleep: noWait });
    expect(read).toEqual({ kind: "found", row: row() });
    expect(asked).toBe(1);
  });

  it("tries again, briefly, while the row is still arriving, and says so when it hasn't", async () => {
    const answers = [null, null, row({ plan: "monthly" })];
    const waits: number[] = [];
    const read = await readStartedMembership(async () => ({ data: answers.shift() ?? null, error: null }), { sleep: async (ms) => void waits.push(ms) });
    expect(read).toEqual({ kind: "found", row: row({ plan: "monthly" }) });
    expect(waits).toEqual([ARRIVING_WAIT_MS, 2 * ARRIVING_WAIT_MS]);

    let asked = 0;
    expect(await readStartedMembership(async () => (asked++, { data: null, error: null }), { sleep: noWait })).toEqual({ kind: "arriving" });
    expect(asked).toBe(ARRIVING_TRIES);
  });

  it("doesn't retry a read that failed: that is an error, not a row on its way", async () => {
    let asked = 0;
    expect(await readStartedMembership(async () => (asked++, { data: null, error: { message: "column does not exist" } }), { sleep: noWait })).toEqual({ kind: "unreadable" });
    expect(asked).toBe(1);
    expect(
      await readStartedMembership(
        async () => {
          throw new Error("network");
        },
        { sleep: noWait },
      ),
    ).toEqual({ kind: "unreadable" });
  });

  it("says 'being processed' only while a payment really is", () => {
    // Stripe says the checkout isn't paid yet, or the bank is confirming the first payment.
    expect(membershipSuccess(true, null)).toEqual({ kind: "processing" });
    expect(membershipSuccess(false, { kind: "found", row: row({ status: "incomplete" }) })).toEqual({ kind: "processing" });
    // Not a payment problem: a row on its way, or a read that failed.
    expect(membershipSuccess(false, { kind: "arriving" })).toEqual({ kind: "arriving" });
    expect(membershipSuccess(false, { kind: "unreadable" })).toEqual({ kind: "unreadable" });
    expect(membershipSuccess(false, null)).toEqual({ kind: "unreadable" });
    // On, with the day it renews; never "on" for one that has already ended.
    expect(membershipSuccess(false, { kind: "found", row: row({ partner_user_id: "p1" }) })).toEqual({ kind: "on", plan: "yearly", renewsOn: PERIOD_END, partnerJoined: true });
    expect(membershipSuccess(false, { kind: "found", row: row({ status: "ended" }) })).toEqual({ kind: "unreadable" });
  });

  it("has every line in both languages", () => {
    for (const messages of [en, es]) {
      const success = messages.membership.success;
      for (const key of ["title", "detail", "wait", "late"] as const) expect(success.arriving[key], key).toEqual(expect.any(String));
      expect(success.unreadable.title).toEqual(expect.any(String));
      expect(success.unreadable.detail).not.toMatch(/process/i);
    }
  });
});
