import { describe, expect, it, vi } from "vitest";
import { render } from "@react-email/render";
import { SavedGiftEmail, UnsentGiftEmail, savedGiftSubject, unsentGiftSubject } from "@/emails/lifecycle";
import { signToken, verifyToken } from "@/lib/lifecycle/links";
import { LATER_LINK_SECONDS, openLater, sealLater } from "@/lib/lifecycle/later-link";
import { unsentMode } from "@/lib/lifecycle/unsent-flag";
import { LEGAL_DOCS, UNSENT_LEGAL, legalDocs } from "@/content/legal";
import type { UnsentDraft } from "@/lib/lifecycle/unsent-gift";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true }));

const { DRAFT_KEPT_MS, UNSENT_AFTER_MS, UNSENT_UNTIL_MS, deletedOn, hasSince, isUnsentDue, sendUnsentGiftReminders, unsentLinkUntil, worthReminding } = await import("@/lib/lifecycle/unsent-gift");

/** React escapes apostrophes in text; compare against what a reader sees. */
const text = (html: string) => html.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

const NOW = Date.parse("2026-11-28T18:20:00Z");
const HOUR = 3_600_000;
const MIN = 60_000;
const ID = "11111111-2222-4333-8444-555555555555";
/** Left yesterday evening, 22 hours ago, after ten minutes of work and two photos, on a premium template. */
const draft = (over: Partial<UnsentDraft> = {}): UnsentDraft => ({ id: ID, userId: "u1", slug: "bouquet", createdAt: NOW - 22 * HOUR - 10 * MIN, updatedAt: NOW - 22 * HOUR, photos: 2, ...over });

type Sent = { to: string; locale: string; url: string; templateSlug: string; deletedOn: string; onceKey: string };

function run(
  rows: UnsentDraft[],
  {
    mode = { on: true, since: null } as ReturnType<typeof unsentMode>,
    paid = [] as { userId: string; at: number }[],
    out = [] as { userId: string; at: number }[],
    optedOut = (() => false) as (email: string) => boolean,
    claim = (async () => true) as (userId: string) => Promise<boolean>,
    accountMade = NOW - 30 * 24 * HOUR,
    send = async () => true,
  } = {},
) {
  const sent: Sent[] = [];
  const reads = { drafts: 0 };
  return {
    sent,
    reads,
    result: sendUnsentGiftReminders({
      store: {
        drafts: async () => {
          reads.drafts += 1;
          return rows;
        },
        paidSince: async () => paid,
        sentSince: async () => out,
        contact: async (userId) => (userId === "nobody" ? null : { email: `${userId}@mail.test`, locale: userId === "es1" ? "es" : "en", createdAt: accountMade }),
        optedOut: async (email) => optedOut(email),
        claim,
      },
      mode,
      send: async (args) => {
        sent.push(args);
        return send();
      },
      link: async (d) => `https://ethos.test/api/gift/unsent/open?t=${d.id}`,
      now: NOW,
      inTime: () => true,
      pause: async () => {},
    }),
  };
}

describe("the switch", () => {
  it("is off unless it says all or a date", () => {
    expect(unsentMode(undefined)).toEqual({ on: false });
    expect(unsentMode("")).toEqual({ on: false });
    expect(unsentMode("on")).toEqual({ on: false });
    expect(unsentMode("1")).toEqual({ on: false });
    expect(unsentMode("all")).toEqual({ on: true, since: null });
    expect(unsentMode("2026-12-01")).toEqual({ on: true, since: Date.parse("2026-12-01") });
    expect(unsentMode("2026-12-01T10:00:00Z")).toEqual({ on: true, since: Date.parse("2026-12-01T10:00:00Z") });
    expect(unsentMode("2026-13-45")).toEqual({ on: false });
  });

  it("reads nothing and sends nothing while it is off", async () => {
    const { result, sent, reads } = run([draft()], { mode: { on: false } });
    expect(await result).toEqual({ sent: 0, failed: 0, deferred: 0 });
    expect(sent).toEqual([]);
    expect(reads.drafts).toBe(0);
  });
});

describe("which drafts get the email", () => {
  it("wants a premium gift somebody worked on", () => {
    expect(worthReminding(draft())).toBe(true);
    // A photo is work, however quick.
    expect(worthReminding(draft({ photos: 1, createdAt: NOW - 22 * HOUR - 10_000 }))).toBe(true);
    // No photo, but minutes spent on the words.
    expect(worthReminding(draft({ photos: 0 }))).toBe(true);
    // Opened and left: nothing was made.
    expect(worthReminding(draft({ photos: 0, createdAt: NOW - 22 * HOUR - 30_000 }))).toBe(false);
    // A free template can be sent as it is: nothing is left unsent for a price.
    expect(worthReminding(draft({ slug: "the-letter" }))).toBe(false);
    expect(worthReminding(draft({ slug: "no-such-template" }))).toBe(false);
  });

  it("waits until the next day and stops after the second", () => {
    expect(isUnsentDue({ updatedAt: NOW - UNSENT_AFTER_MS + MIN }, NOW)).toBe(false);
    expect(isUnsentDue({ updatedAt: NOW - UNSENT_AFTER_MS }, NOW)).toBe(true);
    expect(isUnsentDue({ updatedAt: NOW - UNSENT_UNTIL_MS }, NOW)).toBe(true);
    expect(isUnsentDue({ updatedAt: NOW - UNSENT_UNTIL_MS - MIN }, NOW)).toBe(false);
  });

  it("counts a payment or a send from just before the draft began onwards", () => {
    const d = draft();
    expect(hasSince(d, [{ userId: "u1", at: d.createdAt + MIN }])).toBe(true);
    expect(hasSince(d, [{ userId: "u1", at: d.createdAt - 30 * MIN }])).toBe(true);
    expect(hasSince(d, [{ userId: "u1", at: d.createdAt - 2 * HOUR }])).toBe(false);
    expect(hasSince(d, [{ userId: "someone-else", at: d.createdAt + MIN }])).toBe(false);
  });

  it("says the day the draft is deleted, and the link lasts until then", () => {
    const d = draft({ updatedAt: Date.parse("2026-11-27T20:20:00Z") });
    expect(deletedOn(d)).toBe("2026-12-04T20:20:00.000Z");
    expect(unsentLinkUntil(d)).toBe(Math.floor((d.updatedAt + DRAFT_KEPT_MS) / 1000));
  });
});

describe("the hourly run", () => {
  it("sends one email for a premium gift left unsent yesterday", async () => {
    const { result, sent } = run([draft()]);
    expect(await result).toEqual({ sent: 1, failed: 0, deferred: 0 });
    expect(sent).toEqual([{ to: "u1@mail.test", locale: "en", url: `https://ethos.test/api/gift/unsent/open?t=${ID}`, templateSlug: "bouquet", deletedOn: deletedOn(draft()), onceKey: `unsent-gift/${ID}` }]);
  });

  it("writes to a Spanish account in Spanish", async () => {
    const { result, sent } = run([draft({ userId: "es1" })]);
    await result;
    expect(sent[0].locale).toBe("es");
  });

  it("sends nothing for a free template, a draft nobody worked on, or one from this morning", async () => {
    const { result, sent } = run([draft({ slug: "the-letter" }), draft({ userId: "u2", photos: 0, createdAt: NOW - 22 * HOUR - 20_000 }), draft({ userId: "u3", updatedAt: NOW - 3 * HOUR })]);
    expect(await result).toEqual({ sent: 0, failed: 0, deferred: 0 });
    expect(sent).toEqual([]);
  });

  it("leaves alone somebody who has paid since, or sent a gift after all", async () => {
    const d = draft();
    const paid = run([d], { paid: [{ userId: "u1", at: d.updatedAt + HOUR }] });
    expect(await paid.result).toEqual({ sent: 0, failed: 0, deferred: 0 });
    const out = run([d], { out: [{ userId: "u1", at: d.createdAt + 5 * MIN }] });
    expect(await out.result).toEqual({ sent: 0, failed: 0, deferred: 0 });
    expect([...paid.sent, ...out.sent]).toEqual([]);
  });

  it("never writes to an address on the unsubscribe list, or to an account without an address", async () => {
    const off = run([draft()], { optedOut: () => true });
    expect(await off.result).toEqual({ sent: 0, failed: 0, deferred: 0 });
    const none = run([draft({ userId: "nobody" })]);
    expect(await none.result).toEqual({ sent: 0, failed: 0, deferred: 0 });
  });

  it("sends one email to an account that left two gifts: the one it put more into", async () => {
    const light = draft({ id: "22222222-2222-4333-8444-555555555555", slug: "coquette", photos: 0 });
    const heavy = draft({ id: "33333333-2222-4333-8444-555555555555", slug: "bouquet", photos: 5 });
    const { result, sent } = run([light, heavy]);
    expect(await result).toEqual({ sent: 1, failed: 0, deferred: 0 });
    expect(sent[0].templateSlug).toBe("bouquet");
    expect(sent[0].onceKey).toBe("unsent-gift/33333333-2222-4333-8444-555555555555");
  });

  it("sends nothing a second time in the week (the claim is taken)", async () => {
    const { result, sent } = run([draft()], { claim: async () => false });
    expect(await result).toEqual({ sent: 0, failed: 0, deferred: 0 });
    expect(sent).toEqual([]);
  });

  it("with a date for a switch, writes only to accounts made on or after it", async () => {
    const since = Date.parse("2026-11-28");
    const old = run([draft()], { mode: { on: true, since }, accountMade: since - HOUR });
    expect(await old.result).toEqual({ sent: 0, failed: 0, deferred: 0 });
    const fresh = run([draft()], { mode: { on: true, since }, accountMade: since + HOUR });
    expect(await fresh.result).toEqual({ sent: 1, failed: 0, deferred: 0 });
  });

  it("counts an email the service refused as failed", async () => {
    const { result } = run([draft()], { send: async () => false });
    expect(await result).toEqual({ sent: 0, failed: 1, deferred: 0 });
  });
});

describe("the emails", () => {
  const template = { name: "Bouquet", tagline: "Flowers that never wilt.", poster: "https://ethos.test/posters/bouquet.jpg" };

  it("says the gift is unsent, when it is deleted and how to stop, and nothing from the gift", async () => {
    const en = text(await render(UnsentGiftEmail({ locale: "en", url: "https://ethos.test/api/gift/unsent/open?t=abc", template, deletedOn: "4 December 2026", unsubscribeUrl: "https://ethos.test/api/email/unsubscribe?t=x" })));
    expect(unsentGiftSubject("en")).toBe("Your gift is still waiting to be sent");
    expect(en).toContain("Nobody likes to be forgotten.");
    expect(en).toContain("You started a gift and never sent it.");
    expect(en).toContain("Bouquet");
    expect(en).toContain("We keep unsent gifts for 7 days. This one is deleted on 4 December 2026.");
    expect(en).toContain("Finish and send");
    expect(en).toContain("https://ethos.test/api/gift/unsent/open?t=abc");
    expect(en).toContain("Unsubscribe");
    expect(en).toContain("https://ethos.test/api/email/unsubscribe?t=x");
    const es = text(await render(UnsentGiftEmail({ locale: "es", url: "https://ethos.test/u", template, deletedOn: "4 de diciembre de 2026", unsubscribeUrl: "https://ethos.test/x" })));
    expect(unsentGiftSubject("es")).toBe("Tu regalo sigue esperando a que lo envíes");
    expect(es).toContain("A nadie le gusta que lo olviden.");
    expect(es).toContain("Este se borra el 4 de diciembre de 2026.");
    expect(es).toContain("Darme de baja");
  });

  it("tells a guest where their gift is and what opening the link does", async () => {
    const en = text(await render(SavedGiftEmail({ locale: "en", url: "https://ethos.test/api/gift/later/open?t=abc", template, neverUrl: "https://ethos.test/never" })));
    expect(savedGiftSubject("en")).toBe("Your gift is saved: here's the way back");
    expect(en).toContain("Your gift is saved.");
    expect(en).toContain("Open my gift");
    expect(en).toContain("in the same browser");
    expect(en).toContain("signs you in to an Ethos account with this address");
    expect(en).toContain("The link works for 7 days.");
    expect(en).toContain("Never email me");
    expect(en).toContain("https://ethos.test/never");
    const es = text(await render(SavedGiftEmail({ locale: "es", url: "https://ethos.test/l", template, neverUrl: "https://ethos.test/never" })));
    expect(es).toContain("Tu regalo está guardado.");
    expect(es).toContain("No escribirme nunca");
  });
});

describe("the links", () => {
  const SECRET = "test-secret";

  it("signs the unsent gift's link for that draft and that time only", async () => {
    const value = `${ID}:1796000000`;
    const token = await signToken("unsent-open", value, SECRET);
    expect(await verifyToken("unsent-open", token, SECRET)).toBe(value);
    expect(await verifyToken("publish-finish", token, SECRET)).toBeNull();
    expect(await verifyToken("unsent-open", token.replace("1796000000", "1896000000"), SECRET)).toBeNull();
    expect(await verifyToken("unsent-open", token, "another-secret")).toBeNull();
    await expect(signToken("unsent-open", ID, SECRET)).rejects.toThrow();
  });

  it("seals a guest's address in their link, and opens only what it sealed", async () => {
    const until = Math.floor(NOW / 1000) + LATER_LINK_SECONDS;
    const token = await sealLater({ email: " Ana.Ruiz@Example.org ", slug: "bouquet", until }, SECRET);
    // The address can't be read off the link.
    expect(token).not.toContain("ana");
    expect(Buffer.from(token, "base64url").toString("latin1")).not.toContain("example.org");
    expect(await openLater(token, SECRET)).toEqual({ email: "ana.ruiz@example.org", slug: "bouquet", until });
    // Two links for the same address differ: nothing about it can be told by comparing them.
    expect(await sealLater({ email: "ana.ruiz@example.org", slug: "bouquet", until }, SECRET)).not.toBe(token);
    expect(await openLater(token, "another-secret")).toBeNull();
    const flipped = token.slice(0, -2) + (token.endsWith("A") ? "B" : "A") + token.slice(-1);
    expect(await openLater(flipped, SECRET)).toBeNull();
    expect(await openLater("", SECRET)).toBeNull();
    expect(await openLater(null, SECRET)).toBeNull();
    expect(await openLater("not a token!", SECRET)).toBeNull();
    expect(await openLater("x".repeat(601), SECRET)).toBeNull();
  });

  it("refuses to seal what isn't an address, a template or a time", async () => {
    await expect(sealLater({ email: "not-an-address", slug: "bouquet", until: 1 }, SECRET)).rejects.toThrow();
    await expect(sealLater({ email: "a@b.co", slug: "../etc", until: 1 }, SECRET)).rejects.toThrow();
    await expect(sealLater({ email: "a@b.co", slug: "bouquet", until: 1.5 }, SECRET)).rejects.toThrow();
  });
});

describe("the privacy policy", () => {
  const flat = (doc: { sections: { paragraphs: string[] }[] }) => doc.sections.flatMap((s) => s.paragraphs).join("\n");

  it("says nothing of either email while they are off", () => {
    const off = legalDocs(false, "off", false, { reminder: false, emailMe: false });
    expect(flat(off.privacy.en)).toBe(flat(LEGAL_DOCS.privacy.en));
    expect(flat(off.privacy.es)).toBe(flat(LEGAL_DOCS.privacy.es));
    expect(flat(LEGAL_DOCS.privacy.en)).not.toContain("unsent gift");
    expect(flat(LEGAL_DOCS.privacy.en)).not.toContain("Email me this gift");
  });

  it("describes each one while its switch is on, in both languages", () => {
    const reminder = legalDocs(false, "off", false, { reminder: true, emailMe: false });
    expect(flat(reminder.privacy.en)).toContain("The reminder about an unsent gift: ");
    expect(flat(reminder.privacy.en)).toContain("remind you once of a gift you left unsent in your account,");
    expect(flat(reminder.privacy.en)).toContain("The reminder about an unsent gift carries the same link.");
    expect(flat(reminder.privacy.en)).not.toContain("“Email me this gift”: ");
    expect(flat(reminder.privacy.es)).toContain("El recordatorio de un regalo sin enviar: ");
    expect(flat(reminder.privacy.es)).toContain("recordarte una vez un regalo que dejaste sin enviar en tu cuenta");
    const emailMe = legalDocs(false, "off", false, { reminder: false, emailMe: true });
    expect(flat(emailMe.privacy.en)).toContain("“Email me this gift”: ");
    expect(flat(emailMe.privacy.en)).not.toContain("The reminder about an unsent gift: ");
    expect(flat(emailMe.privacy.es)).toContain("«Envíame este regalo por correo»: ");
    // The terms don't change.
    expect(flat(reminder.terms.en)).toBe(flat(LEGAL_DOCS.terms.en));
  });

  it("finds its places beside the group cards', the date letter's and the monthly idea's changes", () => {
    for (const group of [false, true])
      for (const idea of ["off", "optin", "buyers", "all"] as const)
        for (const letter of [false, true]) {
          const docs = legalDocs(group, idea, letter, { reminder: true, emailMe: true });
          for (const locale of ["en", "es"] as const) {
            const body = flat(docs.privacy[locale]);
            // What each change adds is there; the sentence it was added to may have been reworded by the monthly idea since.
            for (const edit of [...UNSENT_LEGAL[locale].reminder, ...UNSENT_LEGAL[locale].emailMe]) expect(body).toContain("text" in edit ? edit.text : "after" in edit ? edit.after.trim() : edit.replace);
          }
        }
  });

  it("keeps both paragraphs before the offer emails' one, where the list of emails ends", () => {
    const docs = legalDocs(false, "off", false, { reminder: true, emailMe: true });
    const list = docs.privacy.en.sections.find((s) => s.heading.startsWith("1. "))!.paragraphs;
    const at = (start: string) => list.findIndex((p) => p.startsWith(start));
    expect(at("The reminder about an unsent gift: ")).toBeGreaterThan(-1);
    expect(at("The reminder about an unsent gift: ")).toBeLessThan(at("“Email me this gift”: "));
    expect(at("“Email me this gift”: ")).toBeLessThan(at("Offer emails: "));
  });
});
