import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { IDEAS, suggestTemplate, suggestionPath } from "@/lib/lifecycle/suggest";
import { getManifest } from "@/templates/manifests";
import { MonthsaryCheckInEmail, MonthsaryReminderEmail, monthsaryCheckInHeading, monthsaryHeading } from "@/emails/lifecycle";
import { ReactionEmail } from "@/emails/templates";
import { emailKey } from "@/lib/lifecycle/links";
import { FakeDb } from "./helpers/fake-db";

/**
 * What brings a buyer back, in their inbox: the reminder's one template, the monthsary's check-in and
 * reminder, and "whose day is next?" under the news that a gift landed. None of it may carry anything
 * from a gift someone made: not its photos, its words or its link.
 */

const text = (html: string) => html.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

describe("the template an email suggests", () => {
  it("is a real template, and one that suits the occasion", () => {
    for (const [kind, slugs] of Object.entries(IDEAS)) {
      for (const slug of slugs) expect(getManifest(slug), `${kind}: ${slug}`).not.toBeNull();
      if (kind === "birthday" || kind === "anniversary" || kind === "valentines") for (const slug of slugs) expect(getManifest(slug)!.occasions, `${kind}: ${slug}`).toContain(kind);
    }
  });

  it("is a new one: never the template the reminder was saved with", () => {
    expect(suggestTemplate("birthday").slug).toBe("birthday-cinema");
    expect(suggestTemplate("birthday", { avoid: "birthday-cinema" }).slug).toBe("balloons");
    expect(suggestTemplate("next", { avoid: "birthday-cinema" }).slug).toBe("bouquet");
    expect(suggestTemplate("valentines", { avoid: null }).slug).toBe("bouquet");
  });

  it("is a different small one each month", () => {
    const months = [1, 2, 3, 4, 5, 6].map((turn) => suggestTemplate("monthsary", { turn }).slug);
    expect(new Set(months).size).toBe(6);
    expect(suggestTemplate("monthsary", { turn: 7 }).slug).toBe(suggestTemplate("monthsary", { turn: 1 }).slug);
  });

  it("links straight into its editor, saying which email the tap came from", () => {
    expect(suggestionPath("bouquet", "email-opened")).toBe("/create/bouquet?ref=email-opened");
  });
});

describe("the monthsary emails", () => {
  const links = { yesUrl: "https://ethos.test/api/monthsaries/yes?t=y&l=en", stopUrl: "https://ethos.test/api/monthsaries/stop?t=s&l=en" };

  it("checks in neutrally: no milestone, no 'happy', no number in the subject", async () => {
    const subject = monthsaryCheckInHeading("en", "Ana");
    expect(subject).toBe("Still celebrating with Ana tomorrow?");
    expect(subject).not.toMatch(/happy|month|\d/i);
    expect(monthsaryCheckInHeading("es", "Ana")).toBe("¿Mañana seguís celebrándolo, Ana y tú?");
    const html = text(await render(MonthsaryCheckInEmail({ locale: "en", partnerName: "Ana", date: "3 November", ...links })));
    expect(html).toContain("Yes, remind me");
    expect(html).toContain(links.yesUrl);
    expect(html).toContain("Stop these");
    expect(html).toContain(links.stopUrl);
    expect(html).toContain("If you don't answer, we won't write about this one again.");
    expect(html).not.toMatch(/\d+ months/);
    const es = text(await render(MonthsaryCheckInEmail({ locale: "es", partnerName: "Ana", date: "3 de noviembre", ...links })));
    expect(es).toContain("Sí, recuérdamelo");
    expect(es).toContain("Dejar de recibir estos correos");
  });

  it("reminds, after a yes, with the months and one small template", async () => {
    expect(monthsaryHeading("en", "Ana", 7)).toBe("7 months with Ana today");
    expect(monthsaryHeading("en", "Ana", 1)).toBe("1 month with Ana today");
    expect(monthsaryHeading("en", "Ana", 12)).toBe("A year with Ana today");
    expect(monthsaryHeading("en", "Ana", 24)).toBe("2 years with Ana today");
    expect(monthsaryHeading("es", "Ana", 7)).toBe("Hoy cumplís 7 meses, Ana y tú");
    expect(monthsaryHeading("es", "Ana", 12)).toBe("Hoy cumplís un año, Ana y tú");
    const idea = { name: "Fortune Cookie", tagline: "Crack one open.", url: "https://ethos.test/create/fortune-cookie?ref=email-monthsary", poster: "https://ethos.test/templates/fortune-cookie/poster.jpg" };
    const html = text(await render(MonthsaryReminderEmail({ locale: "en", partnerName: "Ana", months: 7, idea, stopUrl: links.stopUrl })));
    expect(html).toContain("7 months with Ana today.");
    expect(html).toContain("Fortune Cookie");
    expect(html).toContain(idea.url);
    expect(html).toContain("Stop these");
  });
});

// --- notify.ts: what goes into the emails -----------------------------------------------------

const state = vi.hoisted(() => ({ db: null as unknown, sent: [] as { to: string; subject: string; react: ReactElement; headers?: Record<string, string> }[] }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/email/send", () => ({
  isUndeliverable: () => false,
  sendEmail: vi.fn(async (message: { to: string; subject: string; react: ReactElement; headers?: Record<string, string> }) => {
    state.sent.push(message);
    return { ok: true, id: "email_1" };
  }),
}));
const server = vi.hoisted(() => ({ db: null as unknown, user: null as { id: string } | null }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: async () => server.db }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => server.user }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true }));
vi.mock("@/lib/env", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/env")>();
  return { ...real, isConfigured: { ...real.isConfigured, resend: true } };
});

const notify = await import("@/lib/email/notify");

const GIFT = "77777777-7777-4777-8777-777777777777";
const OWNER = "88888888-8888-4888-8888-888888888888";
const giftRow = { id: GIFT, user_id: OWNER, locale: "en", short_id: "k7m2p9xqa", template_slug: "bouquet", data: { recipientName: "Ana", message: "Every Sunday morning with you", photos: [{ url: "gifts/owner/secret-photo.jpg" }] } };

describe("whose day is next?", () => {
  beforeEach(() => {
    state.sent = [];
    state.db = new FakeDb({ gifts: [giftRow], profiles: [{ id: OWNER, email: "sender@example.com", locale: "en" }], email_optouts: [] }).db;
  });

  it("follows a reaction with one other template, by name, never the gift's own words, photos or link", async () => {
    await notify.notifyReaction(GIFT, "😍", "I love it", false);
    const html = text(await render(state.sent[0].react));
    expect(html).toContain("Whose day is next? Try");
    expect(html).toContain("Birthday Cinema");
    expect(html).toMatch(/\/create\/birthday-cinema\?ref=email-reaction/);
    expect(html).not.toContain("/create/bouquet");
    expect(html).not.toContain("Every Sunday morning");
    expect(html).not.toContain("secret-photo");
    expect(html).not.toContain("k7m2p9xqa");
  });

  it("is left out for an address on the unsubscribe list", async () => {
    state.db = new FakeDb({ gifts: [giftRow], profiles: [{ id: OWNER, email: "sender@example.com", locale: "en" }], email_optouts: [{ email_sha256: await emailKey("sender@example.com") }] }).db;
    await notify.notifyReaction(GIFT, "😍", "I love it", false);
    const html = text(await render(state.sent[0].react));
    expect(html).toContain("I love it");
    expect(html).not.toContain("Whose day is next?");
  });

  it("speaks Spanish to a Spanish sender", async () => {
    state.db = new FakeDb({ gifts: [giftRow], profiles: [{ id: OWNER, email: "sender@example.com", locale: "es" }], email_optouts: [] }).db;
    await notify.notifyReaction(GIFT, "😍", null, false);
    const html = text(await render(state.sent[0].react));
    expect(html).toContain("¿Para quién es el próximo regalo? Prueba con");
    expect(html).toMatch(/\/es\/create\/birthday-cinema\?ref=email-reaction/);
  });
});

describe("the reminder email", () => {
  beforeEach(() => {
    state.sent = [];
  });

  it("names one template for the occasion and opens its editor; the remove link is the one-click unsubscribe", async () => {
    const ok = await notify.sendReminderEmail({ to: "buyer@example.com", locale: "en", recipientName: "Ana", occasion: "birthday", date: "3 October", avoid: "birthday-cinema", removeUrl: "https://ethos.test/api/reminders/remove?t=x&l=en" });
    expect(ok).toBe(true);
    const [message] = state.sent;
    expect(message.subject).toBe("Ana's birthday is on 3 October");
    expect(message.headers).toMatchObject({ "List-Unsubscribe": "<https://ethos.test/api/reminders/remove?t=x&l=en>" });
    const html = text(await render(message.react));
    expect(html).toContain("Balloons");
    expect(html).toMatch(/\/create\/balloons\?ref=email-reminder/);
    expect(html).toContain("/templates/balloons/poster.jpg");
    expect(html).not.toContain("birthday-cinema");
  });

  it("monthsary check-in and reminder carry the stop link as the one-click unsubscribe", async () => {
    await notify.sendMonthsaryCheckIn({ to: "buyer@example.com", locale: "en", partnerName: "Ana", date: "3 November", yesUrl: "https://ethos.test/y", stopUrl: "https://ethos.test/s" });
    await notify.sendMonthsaryReminder({ to: "buyer@example.com", locale: "es", partnerName: "Ana", months: 8, stopUrl: "https://ethos.test/s" });
    expect(state.sent.map((m) => m.subject)).toEqual(["Still celebrating with Ana tomorrow?", "Hoy cumplís 8 meses, Ana y tú"]);
    for (const m of state.sent) expect(m.headers).toMatchObject({ "List-Unsubscribe": "<https://ethos.test/s>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });
    expect(text(await render(state.sent[1].react))).toMatch(/\/es\/create\/[a-z-]+\?ref=email-monthsary/);
  });
});

describe("the reaction email without an idea", () => {
  it("is as it was", async () => {
    const html = text(await render(ReactionEmail({ locale: "en", recipientName: "Ana", emoji: "😍", text: "Wow", hasAudio: true, dashboardUrl: "https://x" })));
    expect(html).toContain("They also left a voice note.");
    expect(html).not.toContain("Whose day is next?");
  });
});

// --- POST /api/reminders: the share screen's other rows ---------------------------------------

describe("saving the card's other days", () => {
  let fake: FakeDb;
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.parse("2026-10-22T12:00:00Z"));
    fake = new FakeDb({ reminders: [] });
    server.db = fake.db;
    server.user = { id: OWNER };
  });
  afterEach(() => vi.useRealTimers());

  const post = async (body: Record<string, unknown>) => {
    const { POST } = await import("@/app/api/reminders/route");
    return POST(new NextRequest("https://ethos.test/api/reminders", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));
  };

  it("skips this year's email only for the gift's own occasion; another day that's near still gets it", async () => {
    // Ana's birthday is 3 November: twelve days away.
    expect((await post({ recipientName: "Ana", occasion: "birthday", month: 11, day: 3 })).status).toBe(201);
    expect((await post({ recipientName: "Ana", occasion: "anniversary", month: 11, day: 3, forThisGift: false })).status).toBe(201);
    const [own, other] = fake.rows("reminders");
    expect(own.last_sent_year).toBe(2026);
    expect(other.last_sent_year).toBeNull();
  });

  it("saves someone else's day, and a double tap is still one reminder", async () => {
    expect((await post({ recipientName: "Mum", occasion: "birthday", month: 5, day: 4, forThisGift: false })).status).toBe(201);
    expect((await post({ recipientName: " mum ", occasion: "birthday", month: 5, day: 4, forThisGift: false })).status).toBe(200);
    expect(fake.rows("reminders")).toHaveLength(1);
  });
});
