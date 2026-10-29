import { describe, expect, it, vi } from "vitest";
import { render } from "@react-email/render";
import { PublishReminderEmail, publishReminderSubject } from "@/emails/lifecycle";
import { signToken, verifyToken } from "@/lib/lifecycle/links";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true }));

const { isDue, isPublished, sendPublishReminders, REMIND_AFTER_MS, REMIND_UNTIL_MS } = await import("@/lib/commerce/publish-reminders");
type Candidate = Parameters<typeof isPublished>[0];
type Gift = Parameters<typeof isPublished>[1][number];

/** React escapes apostrophes in text; compare against what a reader sees. */
const text = (html: string) => html.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

const NOW = Date.parse("2026-10-29T19:30:00Z");
const MIN = 60_000;
const ID = "11111111-2222-4333-8444-555555555555";
const candidate = (over: Partial<Candidate> = {}): Candidate => ({ id: ID, userId: "u1", slug: "the-letter", createdAt: NOW - 20 * MIN, paymentIntent: "pi_1", store: null, ...over });

function run(rows: Candidate[], { gifts = [] as Gift[], paidAt = (c: Candidate) => c.createdAt as number | null, claim = async () => true, send = async () => true } = {}) {
  const sent: { to: string; url: string; templateSlug: string; purchaseId: string; locale: string }[] = [];
  return {
    sent,
    result: sendPublishReminders({
      store: {
        candidates: async () => rows,
        publishedSince: async () => gifts,
        paidAt: async (c) => paidAt(c),
        contact: async (userId) => (userId === "nobody" ? null : { email: `${userId}@icloud.test`, locale: "en" }),
        claim,
      },
      send: async (args) => {
        sent.push(args);
        return send();
      },
      link: async (c) => `https://ethos.test/api/checkout/finish?t=${c.id}`,
      now: NOW,
      inTime: () => true,
      pause: async () => {},
    }),
  };
}

describe("publish reminder email", () => {
  it("says it's paid, where to open it, and that it comes once, in both languages", async () => {
    const template = { name: "The Letter", tagline: "A letter that opens like one.", poster: "https://ethos.test/posters/the-letter.jpg" };
    const en = text(await render(PublishReminderEmail({ locale: "en", url: "https://ethos.test/api/checkout/finish?t=abc", template })));
    expect(en).toContain("One step left.");
    expect(en).toContain("Your gift is paid for, but it isn't published yet");
    expect(en).toContain("The Letter");
    expect(en).toContain("https://ethos.test/posters/the-letter.jpg");
    expect(en).toContain("https://ethos.test/api/checkout/finish?t=abc");
    expect(en).toContain("Publish my gift");
    expect(en).toContain("on the phone or computer you made it on");
    expect(en).toContain("won't be asked to pay again");
    expect(en).toContain("We only send this once.");
    const es = text(await render(PublishReminderEmail({ locale: "es", url: "https://ethos.test/x", template: { ...template, name: "La carta" } })));
    expect(es).toContain("Te falta un paso.");
    expect(es).toContain("Publicar mi regalo");
    expect(es).toContain("La carta");
    expect(es).toContain("no te pedirá pagar otra vez");
    expect(publishReminderSubject("en")).toBe("One step left: publish your gift");
    expect(publishReminderSubject("es")).toBe("Te falta un paso: publica tu regalo");
  });

  it("signs its link for one purchase and a deadline, and for nothing else", async () => {
    const token = await signToken("publish-finish", `${ID}:1793400000`, "secret");
    expect(await verifyToken("publish-finish", token, "secret")).toBe(`${ID}:1793400000`);
    expect(await verifyToken("publish-finish", token, "other")).toBeNull();
    expect(await verifyToken("reminder-remove", token, "secret")).toBeNull();
    await expect(signToken("publish-finish", ID, "secret")).rejects.toThrow();
  });
});

describe("publish reminders job", () => {
  it("is due from a quarter of an hour after the payment until two hours after", () => {
    expect(isDue(NOW - REMIND_AFTER_MS + 1, NOW)).toBe(false);
    expect(isDue(NOW - REMIND_AFTER_MS, NOW)).toBe(true);
    expect(isDue(NOW - REMIND_UNTIL_MS, NOW)).toBe(true);
    expect(isDue(NOW - REMIND_UNTIL_MS - 1, NOW)).toBe(false);
  });

  it("counts a gift of that template live or updated since the purchase began, and nothing else", () => {
    const c = candidate();
    expect(isPublished(c, [{ userId: "u1", slug: "the-letter", savedAt: c.createdAt + 1 }])).toBe(true);
    expect(isPublished(c, [{ userId: "u1", slug: "the-letter", savedAt: c.createdAt - 1 }])).toBe(false);
    expect(isPublished(c, [{ userId: "u1", slug: "constellations", savedAt: NOW }])).toBe(false);
    expect(isPublished(c, [{ userId: "u2", slug: "the-letter", savedAt: NOW }])).toBe(false);
  });

  it("emails the buyer once a paid gift sits unpublished for 15 minutes", async () => {
    const { sent, result } = run([candidate()]);
    expect(await result).toEqual({ sent: 1, failed: 0, deferred: 0 });
    expect(sent).toEqual([{ to: "u1@icloud.test", locale: "en", url: `https://ethos.test/api/checkout/finish?t=${ID}`, templateSlug: "the-letter", purchaseId: ID }]);
  });

  it("leaves alone a published gift, one paid less than 15 minutes ago, one too old, and one already claimed", async () => {
    const published = run([candidate()], { gifts: [{ userId: "u1", slug: "the-letter", savedAt: NOW - 5 * MIN }] });
    expect(await published.result).toEqual({ sent: 0, failed: 0, deferred: 0 });
    // A signed-in buyer's purchase began when checkout opened: the payment's own time decides.
    const justPaid = run([candidate({ createdAt: NOW - 40 * MIN })], { paidAt: () => NOW - 5 * MIN });
    expect(await justPaid.result).toEqual({ sent: 0, failed: 0, deferred: 0 });
    const old = run([candidate({ createdAt: NOW - 3 * 60 * MIN })]);
    expect(await old.result).toEqual({ sent: 0, failed: 0, deferred: 0 });
    const unknown = run([candidate()], { paidAt: () => null });
    expect(await unknown.result).toEqual({ sent: 0, failed: 0, deferred: 0 });
    const claimed = run([candidate()], { claim: async () => false });
    expect(await claimed.result).toEqual({ sent: 0, failed: 0, deferred: 0 });
    expect([published, justPaid, old, unknown, claimed].every((r) => r.sent.length === 0)).toBe(true);
  });

  it("skips an account with no address and counts a send that failed", async () => {
    const { result } = run([candidate({ userId: "nobody" }), candidate({ id: "22222222-2222-4333-8444-555555555555", userId: "u2" })], { send: async () => false });
    expect(await result).toEqual({ sent: 0, failed: 1, deferred: 0 });
  });
});
