/**
 * "Keep this gift": what a recipient may ask for on the keep page, the one confirmation it sends (and
 * how often, to whom), what confirming makes real, the ways out, and the morning job for the days
 * they asked about. The confirmation names nobody; after the yes, the emails name the sender by the
 * first name on the gift and carry the gift's own link and nothing else of it; the reminders carry
 * one suggested template.
 */
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { emailKey, signToken } from "@/lib/lifecycle/links";
import { CONFIRMS_PER_ADDRESS_PER_DAY, CONFIRMS_PER_GIFT_PER_DAY, KEEP_REF, cleanRequests, keepConsent, keptDays, senderFirstName } from "@/lib/keep/keep";
import { KeepConfirmEmail, KeepLinkEmail, keepLinkSubject } from "@/emails/keep";
import { ReminderEmail, reminderHeading } from "@/emails/lifecycle";
import { FakeDb } from "./helpers/fake-db";

const state = vi.hoisted(() => ({ db: null as unknown, limited: false, sendOk: true, sent: [] as { kind: string; args: Record<string, unknown> }[] }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => !state.limited }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/email/notify", () => ({
  sendKeepConfirm: async (args: Record<string, unknown>) => (state.sent.push({ kind: "confirm", args }), state.sendOk),
  sendKeepLink: async (args: Record<string, unknown>) => (state.sent.push({ kind: "link", args }), state.sendOk),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale, namespace }: { locale: "en" | "es"; namespace: string }) => {
    const root = namespace.split(".").reduce<Record<string, unknown>>((node, key) => node[key] as Record<string, unknown>, (locale === "es" ? es : en) as Record<string, unknown>);
    return (key: string, values: Record<string, string> = {}) => {
      const text = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], root) as string;
      return text.replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? "");
    };
  },
}));

const keepRoute = await import("@/app/api/keep/route");
const confirmRoute = await import("@/app/api/keep/confirm/route");
const stopRoute = await import("@/app/api/keep/stop/route");
const neverRoute = await import("@/app/api/keep/never/route");
const offRoute = await import("@/app/api/keep/reminder-off/route");
const { sendKeptReminders } = await import("@/lib/keep/reminder-job");

const NOW = Date.parse("2026-10-22T10:00:00Z");
const SECRET = "keep-test-secret";
const SENDER = "55555555-5555-4555-8555-555555555555";
const gift = (n: number, over: Record<string, unknown> = {}) => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  short_id: `keep${"abcd"[n - 1]}234a`,
  user_id: SENDER,
  status: "live",
  locale: "en",
  data: { senderName: "Mia", recipientName: "Leo", templateSlug: "bouquet" },
  ...over,
});

let fake: FakeDb;
beforeAll(() => {
  process.env.VIEWER_HASH_SECRET = SECRET;
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  fake = new FakeDb({ gifts: [1, 2, 3, 4].map((n) => gift(n)), gift_keeps: [], keep_reminders: [], email_optouts: [] }, NOW);
  state.db = fake.db;
  state.limited = false;
  state.sendOk = true;
  state.sent = [];
});
afterEach(() => vi.useRealTimers());

const ask = (body: Record<string, unknown>) =>
  keepRoute.POST(new NextRequest("https://ethos.test/api/keep", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));
async function page(route: { GET: (r: NextRequest) => Promise<Response>; POST: (r: NextRequest) => Promise<Response> }, path: string, method: "GET" | "POST", token: string, locale = "en") {
  const res = await route[method](new NextRequest(`https://ethos.test/api/keep/${path}?t=${encodeURIComponent(token)}&l=${locale}`, { method }));
  return { status: res.status, text: (await res.text()).replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"') };
}
const tokenOf = (url: unknown) => new URL(String(url)).searchParams.get("t")!;

describe("what a keeper may ask to be reminded of", () => {
  it("the sender's birthday and your anniversary on a real day, Valentine's on the 14th, each once; anything else is dropped", () => {
    expect(
      cleanRequests([
        { occasion: "birthday", name: "  Mia   Rose ", month: 5, day: 3 },
        { occasion: "christmas", name: "Mia", month: 12, day: 25 },
        { occasion: "valentines", name: "Mia", month: 7, day: 7 },
      ]),
    ).toEqual([
      { occasion: "birthday", name: "Mia Rose", month: 5, day: 3 },
      { occasion: "valentines", name: "Mia", month: 2, day: 14 },
    ]);
    expect(cleanRequests([{ occasion: "anniversary", name: "Mia", month: 2, day: 30 }])).toEqual([]);
    expect(cleanRequests([{ occasion: "birthday", name: "Mia", month: 2, day: 29 }])).toHaveLength(1);
    expect(cleanRequests([{ occasion: "birthday", name: "Mia", month: 5, day: 3 }, { occasion: "birthday", name: "Mia", month: 6, day: 1 }])).toHaveLength(1);
    // A gift signed without a first name ("Tu amor") keeps its reminders, nameless.
    expect(cleanRequests([{ occasion: "birthday", name: "", month: 5, day: 3 }])).toEqual([{ occasion: "birthday", name: "", month: 5, day: 3 }]);
    expect(cleanRequests("not a list")).toEqual([]);
  });

  it("says the days without a name until the address has said yes, then by the sender's first name, in either language", () => {
    const days = cleanRequests([{ occasion: "birthday", name: "Mia", month: 5, day: 3 }, { occasion: "valentines", name: "Mia" }]);
    expect(keptDays(days, "en")).toEqual([
      { label: "the sender's birthday", date: "3 May" },
      { label: "Valentine's Day", date: "14 February" },
    ]);
    expect(keptDays(days, "es")).toEqual([
      { label: "el cumpleaños de quien te lo regaló", date: "3 de mayo" },
      { label: "San Valentín", date: "14 de febrero" },
    ]);
    expect(keptDays(days, "en", { named: true })).toEqual([
      { label: "Mia's birthday", date: "3 May" },
      { label: "Valentine's Day", date: "14 February" },
    ]);
    expect(keptDays(days, "es", { named: true })[0]).toEqual({ label: "el cumpleaños de Mia", date: "3 de mayo" });
  });
});

describe("asking to keep a gift", () => {
  it("sends one confirmation, which names nobody, and keeps what was agreed to word for word", async () => {
    const res = await ask({ shortId: "keepa234a", email: "  Leo@Example.TEST ", reminders: [{ occasion: "birthday", month: 5, day: 3 }, { occasion: "valentines" }] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(state.sent).toHaveLength(1);
    const { args } = state.sent[0];
    expect(args).toMatchObject({ to: "leo@example.test", locale: "en" });
    expect(String(args.confirmUrl)).toMatch(/\/api\/keep\/confirm\?t=[^&]+&l=en$/);
    expect(String(args.neverUrl)).toMatch(/\/api\/keep\/never\?t=[^&]+&l=en$/);

    const [row] = fake.rows("gift_keeps");
    expect(row).toMatchObject({ gift_id: gift(1).id, email: "leo@example.test", email_sha256: await emailKey("leo@example.test"), locale: "en", consent: keepConsent("en"), confirmed_at: null });
    expect(row.confirm_sent_at).toBe(new Date(NOW).toISOString());
    expect(row.requested).toEqual([
      { occasion: "birthday", name: "Mia", month: 5, day: 3 },
      { occasion: "valentines", name: "Mia", month: 2, day: 14 },
    ]);
    // Anyone can type any address: the confirmation says nothing about the gift or who sent it.
    const html = renderToStaticMarkup(KeepConfirmEmail({ locale: "en", confirmUrl: String(args.confirmUrl), neverUrl: String(args.neverUrl) }));
    for (const word of ["Mia", "Leo", "keepa234a", "/g/", "bouquet"]) expect(html).not.toContain(word);
    expect(html).toContain("Yes, email me the link");
    expect(html).toContain("Never email me");
  });

  it("takes the name on a reminder from the gift, never from the page", async () => {
    await ask({ shortId: "keepa234a", email: "leo@example.test", reminders: [{ occasion: "birthday", month: 5, day: 3, name: "<script>alert(1)</script>" }] });
    expect(fake.rows("gift_keeps")[0].requested).toEqual([{ occasion: "birthday", name: "Mia", month: 5, day: 3 }]);
  });

  it("keeps only the sender's first name, however the gift is signed", async () => {
    fake.rows("gifts")[0].data = { senderName: "  Mia   Rose Hart ", recipientName: "Leo" };
    await ask({ shortId: "keepa234a", email: "leo@example.test", reminders: [{ occasion: "birthday", month: 5, day: 3 }] });
    expect(fake.rows("gift_keeps")[0].requested).toEqual([{ occasion: "birthday", name: "Mia", month: 5, day: 3 }]);
  });

  it("answers the same whatever happens, and sends at most one confirmation a day for a gift and address", async () => {
    await ask({ shortId: "keepa234a", email: "leo@example.test" });
    const again = await ask({ shortId: "keepa234a", email: "leo@example.test" });
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual({ ok: true });
    expect(state.sent).toHaveLength(1);
    // A day on, it may go again.
    vi.setSystemTime(NOW + 25 * 3_600_000);
    await ask({ shortId: "keepa234a", email: "leo@example.test" });
    expect(state.sent).toHaveLength(2);
  });

  it(`an address gets at most ${CONFIRMS_PER_ADDRESS_PER_DAY} a day, whatever gifts they come from`, async () => {
    for (const n of [1, 2, 3, 4]) expect((await ask({ shortId: `keep${"abcd"[n - 1]}234a`, email: "stranger@example.test" })).status).toBe(200);
    expect(state.sent).toHaveLength(CONFIRMS_PER_ADDRESS_PER_DAY);
  });

  it(`one gift's page sends at most ${CONFIRMS_PER_GIFT_PER_DAY} a day, whoever's addresses are typed in`, async () => {
    for (let i = 0; i < CONFIRMS_PER_GIFT_PER_DAY + 3; i++) expect((await ask({ shortId: "keepa234a", email: `person${i}@example.test` })).status).toBe(200);
    expect(state.sent).toHaveLength(CONFIRMS_PER_GIFT_PER_DAY);
    // The addresses over the limit aren't kept either.
    expect(fake.rows("gift_keeps")).toHaveLength(CONFIRMS_PER_GIFT_PER_DAY);
  });

  it("sends nothing to an address on the unsubscribe list", async () => {
    fake.rows("email_optouts").push({ email_sha256: await emailKey("leo@example.test") });
    expect(await (await ask({ shortId: "keepa234a", email: "Leo@example.test" })).json()).toEqual({ ok: true });
    expect(state.sent).toHaveLength(0);
  });

  it("refuses what isn't an address or a gift, and slows a flood down", async () => {
    expect((await ask({ shortId: "keepa234a", email: "not an address" })).status).toBe(400);
    expect((await ask({ shortId: "keepa234a", email: "leo@example.test", padding: "x".repeat(5000) })).status).toBe(413);
    expect((await ask({ shortId: "nope", email: "leo@example.test" })).status).toBe(400);
    expect((await ask({ shortId: "zzzz9999z", email: "leo@example.test" })).status).toBe(404);
    fake.rows("gifts")[1].status = "draft";
    expect((await ask({ shortId: "keepb234a", email: "leo@example.test" })).status).toBe(404);
    state.limited = true;
    expect((await ask({ shortId: "keepa234a", email: "leo@example.test" })).status).toBe(429);
    expect(state.sent).toHaveLength(0);
  });

  it("a confirmation that didn't go out can be asked for again straight away", async () => {
    state.sendOk = false;
    await ask({ shortId: "keepa234a", email: "leo@example.test" });
    expect(fake.rows("gift_keeps")[0].confirm_sent_at).toBeNull();
    state.sendOk = true;
    await ask({ shortId: "keepa234a", email: "leo@example.test" });
    expect(state.sent).toHaveLength(2);
  });
});

describe("confirming, and the gift's link", () => {
  async function asked(reminders: Record<string, unknown>[] = [{ occasion: "birthday", month: 5, day: 3 }, { occasion: "valentines" }]) {
    await ask({ shortId: "keepa234a", email: "leo@example.test", reminders });
    return tokenOf(state.sent[0].args.confirmUrl);
  }

  it("opening the link only asks, naming nobody; nothing is kept or sent until the button", async () => {
    const token = await asked();
    const shown = await page(confirmRoute, "confirm", "GET", token);
    expect(shown.text).toContain("Email you the gift's link?");
    expect(shown.text).toContain("remind you nine days before the sender's birthday (3 May) and Valentine's Day (14 February)");
    for (const name of ["Mia", "Leo"]) expect(shown.text).not.toContain(name);
    expect(shown.text).toContain('method="post"');
    expect(fake.rows("keep_reminders")).toHaveLength(0);
    expect(fake.rows("gift_keeps")[0].confirmed_at).toBeNull();
    expect(state.sent).toHaveLength(1);
  });

  it("the button confirms: the reminders become real, and the link goes out once, from the sender by first name and with nothing else of the gift", async () => {
    const token = await asked();
    const done = await page(confirmRoute, "confirm", "POST", token);
    expect(done.text).toContain("It's on its way.");
    expect(done.text).toContain("we'll remind you nine days before Mia's birthday (3 May) and Valentine's Day (14 February)");
    expect(done.text).toMatch(/href="[^"]*\/g\/keepa234a"/);
    expect(fake.rows("keep_reminders").map((r) => [r.occasion, r.name, r.month, r.day])).toEqual([
      ["birthday", "Mia", 5, 3],
      ["valentines", "Mia", 2, 14],
    ]);
    const [keep] = fake.rows("gift_keeps");
    expect(keep.confirmed_at).toBe(new Date(NOW).toISOString());
    expect(keep.requested).toEqual([]);
    const link = state.sent.filter((s) => s.kind === "link");
    expect(link).toHaveLength(1);
    expect(link[0].args).toMatchObject({ to: "leo@example.test", locale: "en", sender: "Mia", days: [{ label: "Mia's birthday", date: "3 May" }, { label: "Valentine's Day", date: "14 February" }] });
    expect(String(link[0].args.giftUrl)).toMatch(/\/g\/keepa234a$/);
    const html = renderToStaticMarkup(KeepLinkEmail(link[0].args as Parameters<typeof KeepLinkEmail>[0])).replace(/&#x27;/g, "'");
    expect(html).toContain("Here's your gift from Mia.");
    expect(html).toContain("And we'll email you nine days before Mia's birthday (3 May) and Valentine's Day (14 February).");
    // The recipient's name and the template stay out of it.
    for (const word of ["Leo", "bouquet"]) expect(html).not.toContain(word);
    expect(keepLinkSubject("en", "Mia")).toBe("Your gift from Mia");
    expect(html).toContain("/g/keepa234a");
    expect(html).toContain("Unsubscribe");
    // Pressed again: nothing new to send.
    await page(confirmRoute, "confirm", "POST", token);
    expect(state.sent.filter((s) => s.kind === "link")).toHaveLength(1);
  });

  it("a keep that's gone has expired, and a made-up link does nothing", async () => {
    const token = await asked();
    fake.tables.gift_keeps = [];
    expect((await page(confirmRoute, "confirm", "POST", token)).text).toContain("This link has expired.");
    expect((await page(confirmRoute, "confirm", "POST", `${fake.rows("gifts")[0].id}.${"A".repeat(43)}`)).status).toBe(404);
    expect(fake.rows("keep_reminders")).toHaveLength(0);
  });

  it("in Spanish for a Spanish gift, where \"de\" and \"el\" join: antes del cumpleaños", async () => {
    fake.rows("gifts")[0].locale = "es";
    const token = await asked([{ occasion: "birthday", month: 5, day: 3 }, { occasion: "anniversary", month: 6, day: 14 }]);
    expect(state.sent[0].args.locale).toBe("es");
    const shown = (await page(confirmRoute, "confirm", "GET", token, "es")).text;
    expect(shown).toContain("antes del cumpleaños de quien te lo regaló (3 de mayo) y vuestro aniversario (14 de junio)");
    expect(shown).not.toContain("Mia");
    const done = (await page(confirmRoute, "confirm", "POST", token, "es")).text;
    expect(done).toContain("te avisaremos nueve días antes del cumpleaños de Mia (3 de mayo)");
    const link = state.sent.find((s) => s.kind === "link")!;
    const html = renderToStaticMarkup(KeepLinkEmail(link.args as Parameters<typeof KeepLinkEmail>[0]));
    expect(html).toContain("Aquí tienes tu regalo de Mia.");
    expect(html).toContain("Y te escribiremos nueve días antes del cumpleaños de Mia (3 de mayo) y vuestro aniversario (14 de junio).");
    expect(keepLinkSubject("es", "Mia")).toBe("Tu regalo de Mia");
    for (const text of [shown, done, html]) expect(text).not.toContain("de el ");
  });
});

describe("a gift signed with a pet name", () => {
  it.each([
    ["Tu amor", ""],
    ["Tu novio", ""],
    ["Your babe", ""],
    ["Love, Mia", ""],
    ["❤️ Alex", "Alex"],
    ["  Mia   Rose Hart ", "Mia"],
    ["Mia❤️", "Mia"],
    ["Ana-María López", "Ana-María"],
    ["D'Angelo", "D'Angelo"],
    ["TU AMOR", ""],
    ["From Mia", ""],
    ["Besos, Ana", ""],
    ["J.Lo", ""],
    ["", ""],
    // Saying who without saying, "us", kisses and sign-offs: no name.
    ["Secret admirer", ""],
    ["Guess who", ""],
    ["xoxo Mia", ""],
    ["XX", ""],
    ["Love Mia", ""],
    ["Us", ""],
    ["We", ""],
    ["Someone", ""],
    ["Anon", ""],
    ["Nosotros", ""],
    ["Abrazos de Ana", ""],
    ["Alguien", ""],
    ["Anónima", ""],
    // Two senders: naming one would leave the other out.
    ["Ana y Leo", ""],
    ["Ana e Iván", ""],
    ["Mia & Leo", ""],
    ["Mia + Leo", ""],
    ["Mia and Leo", ""],
    // Safe misses stay misses; a first and last name is still a first name.
    ["Mia, your love", ""],
    ["Your Leo", ""],
    ["Mia Leo", "Mia"],
  ])("%j is signed by the first name %j", (signature, name) => expect(senderFirstName(signature)).toBe(name));

  const cases: [string, string][] = [
    ["Tu amor", ""],
    ["Tu novio", ""],
    ["Your babe", ""],
    ["Love, Mia", ""],
    ["❤️ Alex", "Alex"],
  ];
  for (const locale of ["en", "es"] as const)
    for (const [signature, name] of cases)
      it(`${locale}, signed ${JSON.stringify(signature)}: after the yes the page and the link email say ${name ? JSON.stringify(name) : "no name"}, and the reminders are kept`, async () => {
        fake.rows("gifts")[0].locale = locale;
        fake.rows("gifts")[0].data = { senderName: signature, recipientName: "Leo" };
        await ask({ shortId: "keepa234a", email: "leo@example.test", reminders: [{ occasion: "birthday", month: 5, day: 3 }, { occasion: "valentines" }] });
        const done = (await page(confirmRoute, "confirm", "POST", tokenOf(state.sent[0].args.confirmUrl), locale)).text;
        expect(fake.rows("keep_reminders").map((r) => [r.occasion, r.name])).toEqual([
          ["birthday", name],
          ["valentines", name],
        ]);
        const link = state.sent.find((s) => s.kind === "link")!;
        expect(link.args.sender).toBe(name);
        const html = renderToStaticMarkup(KeepLinkEmail(link.args as Parameters<typeof KeepLinkEmail>[0])).replace(/&#x27;/g, "'");
        const expected = {
          en: name ? { subject: `Your gift from ${name}`, heading: `Here's your gift from ${name}.`, day: `before ${name}'s birthday (3 May)` } : { subject: "Your gift's link", heading: "Here's your gift.", day: "before the sender's birthday (3 May)" },
          es: name
            ? { subject: `Tu regalo de ${name}`, heading: `Aquí tienes tu regalo de ${name}.`, day: `antes del cumpleaños de ${name} (3 de mayo)` }
            : { subject: "El enlace de tu regalo", heading: "Aquí tienes tu regalo.", day: "antes del cumpleaños de quien te lo regaló (3 de mayo)" },
        }[locale];
        expect(keepLinkSubject(locale, String(link.args.sender))).toBe(expected.subject);
        expect(html).toContain(expected.heading);
        expect(html).toContain(expected.day);
        expect(done).toContain(expected.day);
        // Nothing of the signature but a real first name reaches them.
        for (const bit of signature.split(/[\s,]+/).filter((b) => b && b !== name)) {
          expect(html).not.toContain(bit);
          expect(done).not.toContain(bit);
        }
      });

  it("the reminders still come, saying “the sender” and “them”, in either language", async () => {
    fake.rows("gift_keeps").push({ id: "pppp", gift_id: gift(1).id, email: "pppp@example.test", email_sha256: "p".padEnd(64, "0"), locale: "es", consent: "x", requested: [], created_at: new Date(NOW - 30 * 86_400_000).toISOString(), confirm_sent_at: null, confirmed_at: new Date(NOW - 30 * 86_400_000).toISOString() });
    fake.rows("keep_reminders").push({ id: "pppp-r0", keep_id: "pppp", name: "", occasion: "birthday", month: 10, day: 31, last_sent_year: null });
    const mail: Record<string, unknown>[] = [];
    const result = await sendKeptReminders({ admin: state.db as never, now: new Date(NOW), send: (async (m: Record<string, unknown>) => (mail.push(m), true)) as never, removeUrl: async (id, l) => `https://ethos.test/api/keep/reminder-off?t=${id}&l=${l}`, inTime: () => true, pause: async () => {} });
    expect(result).toMatchObject({ sent: 1 });
    expect(mail[0]).toMatchObject({ recipientName: "", occasion: "birthday", locale: "es", ref: KEEP_REF });

    const idea = { name: "Birthday Cinema", tagline: "x", url: "https://ethos.test/create/birthday-cinema?ref=gift-keep", poster: "https://ethos.test/p.jpg" };
    const email = (locale: "en" | "es", occasion: "birthday" | "anniversary") =>
      renderToStaticMarkup(ReminderEmail({ locale, recipientName: "", occasion, date: locale === "es" ? "31 de octubre" : "31 October", idea, moreUrl: "https://ethos.test/occasions/birthday", removeUrl: "https://ethos.test/x" })).replace(/&#x27;/g, "'");
    expect(reminderHeading("birthday", "en", "", "31 October")).toBe("The sender's birthday is on 31 October.");
    expect(reminderHeading("birthday", "es", "", "31 de octubre")).toBe("El cumpleaños de quien te lo regaló es el 31 de octubre.");
    expect(reminderHeading("anniversary", "es", "", "31 de octubre")).toBe("Vuestro aniversario es el 31 de octubre.");
    const en = email("en", "birthday");
    expect(en).toContain("There's time to make them something");
    expect(en).toContain("Make them something");
    const es = email("es", "birthday");
    expect(es).toContain("Hay tiempo de sobra para hacerle algo y programarlo");
    expect(es).toContain("Hazle algo");
    // Nowhere a gap where a name would have been: "'s birthday", "Make it for ", "make  something".
    for (const html of [en, es, email("en", "anniversary")]) {
      expect(html).not.toMatch(/(^|[>\s])'s birthday/);
      expect(html).not.toMatch(/(Make it for|Hacerlo para) </);
      expect(html).not.toMatch(/[a-z] {2}[a-z]/);
    }
    // A named reminder reads as before.
    expect(reminderHeading("birthday", "en", "Mia", "31 October")).toBe("Mia's birthday is on 31 October.");
  });
});

describe("the ways out", () => {
  async function confirmed() {
    await ask({ shortId: "keepa234a", email: "leo@example.test", reminders: [{ occasion: "birthday", month: 5, day: 3 }] });
    await page(confirmRoute, "confirm", "POST", tokenOf(state.sent[0].args.confirmUrl));
    return fake.rows("gift_keeps")[0].id as string;
  }

  it("unsubscribe asks, then forgets the address for that gift", async () => {
    const id = await confirmed();
    const token = await signToken("keep-stop", id, SECRET);
    expect((await page(stopRoute, "stop", "GET", token)).text).toContain("Unsubscribe?");
    expect(fake.rows("gift_keeps")).toHaveLength(1);
    expect((await page(stopRoute, "stop", "POST", token)).text).toContain("You're unsubscribed.");
    expect(fake.rows("gift_keeps")).toHaveLength(0);
    // Again, or from a mail app's one-click: still done.
    expect((await page(stopRoute, "stop", "POST", token)).text).toContain("You're unsubscribed.");
  });

  it("never email me: on the list, every keep for the address gone, and asking again sends nothing", async () => {
    await confirmed();
    await ask({ shortId: "keepb234a", email: "leo@example.test" });
    const never = tokenOf(state.sent.find((s) => s.kind === "confirm" && String(s.args.confirmUrl) !== "")!.args.neverUrl);
    expect((await page(neverRoute, "never", "GET", never)).text).toContain("Never email this address?");
    expect(fake.rows("email_optouts")).toHaveLength(0);
    expect((await page(neverRoute, "never", "POST", never)).text).toContain("whoever types it in");
    expect(fake.rows("email_optouts")).toEqual([expect.objectContaining({ email_sha256: await emailKey("leo@example.test") })]);
    expect(fake.rows("gift_keeps")).toHaveLength(0);
    const before = state.sent.length;
    await ask({ shortId: "keepc234a", email: "leo@example.test" });
    expect(state.sent).toHaveLength(before);
  });

  it("remove this reminder takes that day only", async () => {
    await confirmed();
    fake.rows("keep_reminders").push({ id: "r-2", keep_id: fake.rows("gift_keeps")[0].id, name: "Mia", occasion: "valentines", month: 2, day: 14, last_sent_year: null });
    const birthday = fake.rows("keep_reminders").find((r) => r.occasion === "birthday")!;
    const token = await signToken("keep-reminder-off", String(birthday.id), SECRET);
    expect((await page(offRoute, "reminder-off", "GET", token)).text).toContain("We won't email you before Mia's birthday again.");
    expect((await page(offRoute, "reminder-off", "POST", token)).text).toContain("No more emails before Mia's birthday.");
    expect(fake.rows("keep_reminders").map((r) => r.occasion)).toEqual(["valentines"]);
    expect((await page(offRoute, "reminder-off", "POST", token)).text).toContain("That reminder was already removed.");
  });

  it("in Spanish, removing the birthday says antes del cumpleaños", async () => {
    fake.rows("gifts")[0].locale = "es";
    await confirmed();
    const birthday = fake.rows("keep_reminders").find((r) => r.occasion === "birthday")!;
    const token = await signToken("keep-reminder-off", String(birthday.id), SECRET);
    expect((await page(offRoute, "reminder-off", "GET", token, "es")).text).toContain("No volveremos a escribirte antes del cumpleaños de Mia.");
    expect((await page(offRoute, "reminder-off", "POST", token, "es")).text).toContain("No más correos antes del cumpleaños de Mia.");
  });

  it("a token made for one way out works for no other", async () => {
    const id = await confirmed();
    const stop = await signToken("keep-stop", id, SECRET);
    expect((await page(confirmRoute, "confirm", "POST", stop)).status).toBe(404);
    expect((await page(offRoute, "reminder-off", "POST", stop)).status).toBe(404);
    expect(fake.rows("gift_keeps")).toHaveLength(1);
  });
});

describe("the morning job for kept gifts", () => {
  const DAY = 86_400_000;
  function seedKeep(id: string, confirmed: boolean, createdAgoDays: number, reminders: Record<string, unknown>[]) {
    fake.rows("gift_keeps").push({
      id,
      gift_id: gift(1).id,
      email: `${id}@example.test`,
      email_sha256: id.padEnd(64, "0"),
      locale: "en",
      consent: "x",
      requested: [],
      created_at: new Date(NOW - createdAgoDays * DAY).toISOString(),
      confirm_sent_at: null,
      confirmed_at: confirmed ? new Date(NOW - createdAgoDays * DAY).toISOString() : null,
    });
    for (const [i, r] of reminders.entries()) fake.rows("keep_reminders").push({ id: `${id}-r${i}`, keep_id: id, name: "Mia", last_sent_year: null, ...r });
  }
  const run = (send: (email: Record<string, unknown>) => Promise<boolean>) =>
    sendKeptReminders({
      admin: state.db as never,
      now: new Date(NOW),
      send: send as never,
      removeUrl: async (id, locale) => `https://ethos.test/api/keep/reminder-off?t=${id}&l=${locale}`,
      inTime: () => true,
      pause: async () => {},
    });

  it("emails a confirmed keeper nine days before, once, with the template link marked as theirs", async () => {
    seedKeep("aaaa", true, 30, [{ occasion: "birthday", month: 10, day: 31 }]);
    const mail: Record<string, unknown>[] = [];
    expect(await run(async (m) => (mail.push(m), true))).toEqual({ sent: 1, failed: 0, deferred: 0, purged: 0 });
    expect(mail).toEqual([{ to: "aaaa@example.test", locale: "en", recipientName: "Mia", occasion: "birthday", date: "31 October", removeUrl: "https://ethos.test/api/keep/reminder-off?t=aaaa-r0&l=en", ref: KEEP_REF }]);
    expect(fake.rows("keep_reminders")[0].last_sent_year).toBe(2026);
    expect(await run(async (m) => (mail.push(m), true))).toMatchObject({ sent: 0 });
    expect(mail).toHaveLength(1);
  });

  it("never emails a keep that wasn't confirmed, and deletes it after a week", async () => {
    seedKeep("bbbb", false, 2, [{ occasion: "birthday", month: 10, day: 31 }]);
    seedKeep("cccc", false, 8, [{ occasion: "birthday", month: 10, day: 31 }]);
    seedKeep("dddd", true, 400, []);
    const mail: unknown[] = [];
    expect(await run(async (m) => (mail.push(m), true))).toMatchObject({ sent: 0, purged: 1 });
    expect(mail).toEqual([]);
    expect(fake.rows("gift_keeps").map((k) => k.id)).toEqual(["bbbb", "dddd"]);
  });

  it("gives the day back when the email fails, so tomorrow tries again", async () => {
    seedKeep("eeee", true, 30, [{ occasion: "anniversary", month: 10, day: 31 }]);
    expect(await run(async () => false)).toMatchObject({ sent: 0, failed: 1 });
    expect(fake.rows("keep_reminders")[0].last_sent_year).toBeNull();
  });
});
