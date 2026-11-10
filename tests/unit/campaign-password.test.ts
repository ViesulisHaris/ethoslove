import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { isCampaignPassword } from "@/lib/commerce/campaign";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

describe("the creator-campaign password", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is the one whose hash is in CAMPAIGN_PASSWORD_SHA256, case and spaces forgiven", () => {
    vi.stubEnv("CAMPAIGN_PASSWORD_SHA256", sha("new spring phrase"));
    expect(isCampaignPassword("new spring phrase")).toBe(true);
    expect(isCampaignPassword("  New Spring Phrase ")).toBe(true);
    expect(isCampaignPassword("new spring phras")).toBe(false);
  });

  it("refuses everything else once the variable is set", () => {
    vi.stubEnv("CAMPAIGN_PASSWORD_SHA256", sha("new spring phrase"));
    for (const guess of ["", "ethos", "password", "etho"]) expect(isCampaignPassword(guess)).toBe(false);
  });

  it("never throws on a malformed variable (falls back instead of answering 500)", () => {
    for (const bad of ["", "not-hex", "abcd", "z".repeat(64)]) {
      vi.stubEnv("CAMPAIGN_PASSWORD_SHA256", bad);
      expect(() => isCampaignPassword("anything")).not.toThrow();
      expect(isCampaignPassword("anything")).toBe(false);
    }
  });
});
