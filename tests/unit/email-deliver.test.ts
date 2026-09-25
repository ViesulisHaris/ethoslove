import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Pass } from "@/lib/commerce/passes";

/**
 * Whether a lifecycle email counts as sent (lib/email/notify.ts deliver), which decides whether the
 * claim a webhook or the cron made for it stays. An address that can never receive mail counts as
 * sent: its claim stays, so a once-only email is once-only on a test account too.
 */
const state = vi.hoisted(() => ({ email: "qa@example.org", sent: 0 }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return { ...actual, isConfigured: { ...actual.isConfigured, resend: true } };
});
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async () => {
        state.sent++;
        return { data: null, error: { message: "rejected" } };
      },
    };
  },
}));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { email: state.email, locale: "en" }, error: null }) }) }) }) }),
}));

const { sendMembershipPaymentProblem } = await import("@/lib/email/notify");

const row = { owner_user_id: "u1", ends_at: "2026-10-01T00:00:00.000Z" } as Pass;
const args = { kind: "failed" as const, amount: 499, currency: "eur", url: null };

beforeEach(() => {
  state.sent = 0;
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("a lifecycle email, sent", () => {
  it("counts as sent to an address that can never receive mail, without reaching Resend", async () => {
    state.email = "sv-fix-billing@example.org";
    expect(await sendMembershipPaymentProblem(row, args)).toBe(true);
    expect(state.sent).toBe(0);
  });

  it("doesn't count as sent when Resend refuses it, so the claim is released for a later try", async () => {
    state.email = "ana@gmail.com";
    expect(await sendMembershipPaymentProblem(row, args)).toBe(false);
    expect(state.sent).toBe(1);
  });
});
