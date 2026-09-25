import { describe, expect, it } from "vitest";
import { planPortalConfiguration } from "../../scripts/lib/portal-configuration.mjs";

/** What scripts/setup-billing-portal.mjs does with the shared account's portal configurations (docs/MEMBERSHIP.md 2.7, R5). */
const ETHOS = { app: "ethos", ethos_object: "portal_configuration" };
const config = (id: string, over: { is_default?: boolean; active?: boolean; metadata?: Record<string, string> } = {}) => ({ id, is_default: false, active: true, metadata: {}, ...over });

describe("the billing portal setup", () => {
  it("refuses to create Ethos's configuration on an account with no default, which Stripe would make it", () => {
    expect(planPortalConfiguration([])).toEqual({ action: "refuse", strandedDefault: null });
    // An inactive leftover of somebody else's isn't a default either.
    expect(planPortalConfiguration([config("bpc_other", { active: false })])).toMatchObject({ action: "refuse" });
  });

  it("creates it beside the account's own default, and updates it once it exists", () => {
    expect(planPortalConfiguration([config("bpc_default", { is_default: true })])).toEqual({ action: "create", strandedDefault: null });
    expect(planPortalConfiguration([config("bpc_default", { is_default: true }), config("bpc_ethos", { metadata: ETHOS })])).toEqual({ action: "update", id: "bpc_ethos", strandedDefault: null });
    // Another business's configuration, or one with only half the marker, is never taken for Ethos's.
    expect(planPortalConfiguration([config("bpc_default", { is_default: true }), config("bpc_x", { metadata: { app: "ethos" } })])).toMatchObject({ action: "create" });
  });

  it("never treats a configuration of ours that became the default as Ethos's again, and names it", () => {
    // The state test mode was left in: Ethos's configuration was the account's first, so Stripe made it the default.
    expect(planPortalConfiguration([config("bpc_stranded", { is_default: true, metadata: ETHOS })])).toEqual({ action: "create", strandedDefault: "bpc_stranded" });
    expect(planPortalConfiguration([config("bpc_stranded", { is_default: true, metadata: ETHOS }), config("bpc_new", { metadata: ETHOS })])).toEqual({
      action: "update",
      id: "bpc_new",
      strandedDefault: "bpc_stranded",
    });
  });
});
