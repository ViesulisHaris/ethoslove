import { NextRequest } from "next/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { signToken, verifyToken } from "@/lib/lifecycle/links";
import { FakeDb } from "./helpers/fake-db";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale, namespace }: { locale: "en" | "es"; namespace: string }) => {
    const root = namespace.split(".").reduce<Record<string, unknown>>((node, key) => node[key] as Record<string, unknown>, (locale === "es" ? es : en) as Record<string, unknown>);
    return (key: string, values: Record<string, string> = {}) => {
      const text = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], root) as string;
      return text.replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? "");
    };
  },
}));

const route = await import("@/app/api/reminders/skip/route");
const removeRoute = await import("@/app/api/reminders/remove/route");
const { markMadeFor, settledBy } = await import("@/lib/lifecycle/reminder-done");

const SECRET = "reminder-skip-test-secret";
const ID = "22222222-2222-4222-8222-222222222222";
const USER = "11111111-1111-4111-8111-111111111111";
const YEAR = new Date().getUTCFullYear();
const row = (over: Record<string, unknown> = {}) => ({ id: ID, user_id: USER, recipient_name: "Mia", occasion: "birthday", month: 3, day: 5, locale: "en", template_slug: null, last_sent_year: YEAR, last_stage: 1, currency: null, ...over });

async function page(method: "GET" | "POST", value: string, locale: "en" | "es" = "en") {
  const t = await signToken("reminder-skip", value, SECRET);
  const res = await route[method](new NextRequest(`https://ethos.test/api/reminders/skip?t=${t}&l=${locale}`, { method }));
  return { status: res.status, text: await res.text() };
}

describe("the links in the three e-mails", () => {
  it("sign 'Not this year' for one reminder and one year, and 'Open my gift' for one reminder until a time", async () => {
    const skip = await signToken("reminder-skip", `${ID}:2027`, "s");
    expect(await verifyToken("reminder-skip", skip, "s")).toBe(`${ID}:2027`);
    expect(await verifyToken("reminder-remove", skip, "s")).toBeNull();
    expect(await verifyToken("reminder-open", skip, "s")).toBeNull();
    await expect(signToken("reminder-skip", ID, "s")).rejects.toThrow();
    const open = await signToken("reminder-open", `${ID}:1804550399`, "s");
    expect(await verifyToken("reminder-open", open, "s")).toBe(`${ID}:1804550399`);
    expect(await verifyToken("reminder-open", open, "other")).toBeNull();
    expect(await verifyToken("reminder-skip", open, "s")).toBeNull();
    await expect(signToken("reminder-open", `${ID}:2027`, "s")).rejects.toThrow();
  });
});

describe("'Not this year' from the e-mail", () => {
  let fake: FakeDb;
  beforeAll(() => {
    process.env.VIEWER_HASH_SECRET = SECRET;
  });
  beforeEach(() => {
    fake = new FakeDb({ reminders: [row()] });
    state.db = fake.db;
  });

  it("asks first, in the reminder's language, and changes nothing on a GET", async () => {
    const asked = await page("GET", `${ID}:${YEAR}`);
    expect(asked.status).toBe(200);
    expect(asked.text).toContain("Stop the emails about Mia&#39;s birthday until next year?");
    expect(asked.text).toContain("Yes, not this year");
    expect(fake.rows("reminders")[0]).toMatchObject({ last_sent_year: YEAR, last_stage: 1 });
    fake.tables.reminders[0].locale = "es";
    expect((await page("GET", `${ID}:${YEAR}`)).text).toContain("¿Dejamos de escribirte sobre el cumpleaños de Mia hasta el año que viene?");
  });

  it("names the occasion as the e-mails do: an anniversary is yours, a day of their own is theirs", async () => {
    fake.tables.reminders[0].occasion = "anniversary";
    expect((await page("GET", `${ID}:${YEAR}`)).text).toContain("Stop the emails about your anniversary until next year?");
    fake.tables.reminders[0].locale = "es";
    expect((await page("GET", `${ID}:${YEAR}`)).text).toContain("¿Dejamos de escribirte sobre vuestro aniversario hasta el año que viene?");
    fake.tables.reminders[0].occasion = "other";
    fake.tables.reminders[0].locale = "en";
    expect((await page("GET", `${ID}:${YEAR}`)).text).toContain("Stop the emails about Mia&#39;s day until next year?");
  });

  it("and so does 'Remove this reminder'", async () => {
    fake.tables.reminders[0].occasion = "anniversary";
    const t = await signToken("reminder-remove", ID, SECRET);
    const asked = await removeRoute.GET(new NextRequest(`https://ethos.test/api/reminders/remove?t=${t}&l=en`));
    expect(await asked.text()).toContain("You won&#39;t get the emails before your anniversary any more.");
    expect(fake.rows("reminders")).toHaveLength(1);
  });

  it("marks the reminder done for that year on the POST, and the next year's still come", async () => {
    const done = await page("POST", `${ID}:${YEAR}`);
    expect(done.text).toContain("Done. See you next year.");
    expect(fake.rows("reminders")[0]).toMatchObject({ last_sent_year: YEAR, last_stage: 3 });
  });

  it("refuses a year that is neither this one nor the next, and a link for something else", async () => {
    expect((await page("POST", `${ID}:${YEAR + 2}`)).status).toBe(404);
    expect((await page("POST", `${ID}:${YEAR - 1}`)).status).toBe(404);
    const remove = await signToken("reminder-remove", ID, SECRET);
    const res = await route.POST(new NextRequest(`https://ethos.test/api/reminders/skip?t=${remove}&l=en`, { method: "POST" }));
    expect(res.status).toBe(404);
    expect(fake.rows("reminders")[0]).toMatchObject({ last_sent_year: YEAR, last_stage: 1 });
  });

  it("never takes back a later year", async () => {
    fake.tables.reminders[0].last_sent_year = YEAR + 1;
    fake.tables.reminders[0].last_stage = 3;
    await page("POST", `${ID}:${YEAR}`);
    expect(fake.rows("reminders")[0]).toMatchObject({ last_sent_year: YEAR + 1, last_stage: 3 });
  });
});

describe("a gift made for the person stops the e-mails", () => {
  const now = new Date("2027-02-26T15:00:00Z");
  const reminders = [
    row({ id: "a", recipient_name: " mia ", month: 3, day: 5, last_sent_year: 2027, last_stage: 1 }),
    row({ id: "b", recipient_name: "Mia", occasion: "anniversary", month: 3, day: 8, last_sent_year: null, last_stage: 0 }),
    // More than ten days away: not this gift's day.
    row({ id: "c", recipient_name: "Mia", occasion: "other", month: 4, day: 1, last_sent_year: null, last_stage: 0 }),
    row({ id: "d", recipient_name: "Ana", month: 3, day: 1, last_sent_year: null, last_stage: 0 }),
    row({ id: "e", recipient_name: "Mia", occasion: "other", month: 3, day: 5, last_sent_year: 2027, last_stage: 3 }),
  ];

  it("settles the nearest reminder of that name whose day is at most ten days away, once", () => {
    // Mia's birthday (5 March) is nearer than the anniversary (8 March): a gift now is the birthday's.
    expect(settledBy(reminders, "MIA", now)).toEqual([{ id: "a", year: 2027 }]);
    // Two of hers on the same nearest day both are.
    expect(settledBy([...reminders, row({ id: "f", recipient_name: "Mia", occasion: "valentines", month: 3, day: 5, last_sent_year: null, last_stage: 0 })], "Mia", now)).toEqual([
      { id: "a", year: 2027 },
      { id: "f", year: 2027 },
    ]);
    // Across the new year.
    expect(settledBy([row({ id: "x", month: 1, day: 3, last_sent_year: null, last_stage: 0 })], "Mia", new Date("2026-12-28T10:00:00Z"))).toEqual([{ id: "x", year: 2027 }]);
  });

  it("counts a gift scheduled to open on the day however far ahead it was made, and not an edit of one already out", () => {
    const far = new Date("2027-01-10T15:00:00Z");
    // Made in January for 5 March, set to open at midnight in New York (05:00 UTC) or in Tokyo (15:00 UTC the day before).
    expect(settledBy(reminders, "Mia", far, { unlockAt: "2027-03-05T05:00:00.000Z" })).toEqual([{ id: "a", year: 2027 }]);
    expect(settledBy(reminders, "Mia", far, { unlockAt: "2027-03-04T15:00:00.000Z" })).toEqual([{ id: "a", year: 2027 }]);
    // Scheduled for another day, or not at all: too far for the window, nothing.
    expect(settledBy(reminders, "Mia", far, { unlockAt: "2027-02-20T05:00:00.000Z" })).toEqual([]);
    expect(settledBy(reminders, "Mia", far)).toEqual([]);
    // Last year's gift for Mia edited inside the window: it was out long before, so it wasn't made for this day.
    expect(settledBy(reminders, "Mia", now, { wasOutSince: "2026-03-01T10:00:00.000Z" })).toEqual([]);
    // One that first went out a few days ago and is edited now still counts.
    expect(settledBy(reminders, "Mia", now, { wasOutSince: "2027-02-26T10:00:00.000Z" })).toEqual([{ id: "a", year: 2027 }]);
  });

  it("settles only a reminder of an occasion the gift's template is for", () => {
    const xmas = new Date("2026-12-22T10:00:00Z");
    const birthday = row({ id: "bd", recipient_name: "Mia", occasion: "birthday", month: 12, day: 28, last_sent_year: null, last_stage: 0 });
    const ownDay = row({ id: "od", recipient_name: "Mia", occasion: "other", month: 12, day: 25, last_sent_year: null, last_stage: 0 });
    // A Christmas gift (Frosted Window) for Mia: her own Christmas day, never her birthday on the 28th.
    expect(settledBy([birthday, ownDay], "Mia", xmas, { occasions: ["christmas"] })).toEqual([{ id: "od", year: 2026 }]);
    expect(settledBy([birthday], "Mia", xmas, { occasions: ["christmas"] })).toEqual([]);
    // A birthday gift (Birthday Cinema) three days before an anniversary: the anniversary's e-mails still come.
    const anniversary = row({ id: "an", recipient_name: "Mia", occasion: "anniversary", month: 3, day: 5, last_sent_year: null, last_stage: 0 });
    expect(settledBy([anniversary], "Mia", new Date("2027-03-02T10:00:00Z"), { occasions: ["birthday"] })).toEqual([]);
    // A template for both (Scrapbook) settles only the nearer of the two.
    const bday = row({ id: "b2", recipient_name: "Mia", occasion: "birthday", month: 3, day: 9, last_sent_year: null, last_stage: 0 });
    expect(settledBy([bday, anniversary], "Mia", new Date("2027-03-02T10:00:00Z"), { occasions: ["anniversary", "birthday", "just-because", "long-distance"] })).toEqual([{ id: "an", year: 2027 }]);
    // Scheduled to open on the birthday itself: that is the birthday's gift, whatever the template.
    expect(settledBy([birthday], "Mia", new Date("2026-11-01T10:00:00Z"), { occasions: ["christmas"], unlockAt: "2026-12-28T05:00:00.000Z" })).toEqual([{ id: "bd", year: 2026 }]);
  });

  it("settles nothing of another day for a gift counting down to a day of its own", () => {
    const scrapbook = ["anniversary", "birthday", "just-because", "long-distance"] as const;
    const birthday = row({ id: "bd", recipient_name: "Mia", occasion: "birthday", month: 12, day: 28, last_sent_year: null, last_stage: 0 });
    const published = new Date("2026-12-20T10:00:00Z");
    // A Scrapbook counting down to 25 December, made on the 20th: her birthday on the 28th still gets its e-mails.
    expect(settledBy([birthday], "Mia", published, { occasions: scrapbook, countsDownTo: "2026-12-25" })).toEqual([]);
    // Counting down to the birthday itself (or a day off, for the time zones): the birthday's, however early.
    expect(settledBy([birthday], "Mia", published, { occasions: scrapbook, countsDownTo: "2026-12-28" })).toEqual([{ id: "bd", year: 2026 }]);
    expect(settledBy([birthday], "Mia", published, { occasions: scrapbook, countsDownTo: "2026-12-27" })).toEqual([{ id: "bd", year: 2026 }]);
    expect(settledBy([birthday], "Mia", new Date("2026-10-01T10:00:00Z"), { occasions: scrapbook, countsDownTo: "2026-12-28" })).toEqual([{ id: "bd", year: 2026 }]);
    // Last year's gift republished, still counting down to last year's day: not this year's.
    expect(settledBy([birthday], "Mia", published, { occasions: scrapbook, countsDownTo: "2025-12-28" })).toEqual([]);
    // No countdown: the nearest day in the window, as before.
    expect(settledBy([birthday], "Mia", published, { occasions: scrapbook, countsDownTo: null })).toEqual([{ id: "bd", year: 2026 }]);
  });

  it("writes them done for the year on the account's rows only", async () => {
    const other = row({ id: "z", user_id: "99999999-9999-4999-8999-999999999999", recipient_name: "Mia", last_sent_year: null, last_stage: 0 });
    const fake = new FakeDb({ reminders: [...reminders, other] });
    expect(await markMadeFor(fake.db as never, USER, "Mia", now, { occasions: ["birthday", "anniversary"] })).toBe(1);
    const by = Object.fromEntries(fake.rows("reminders").map((r) => [r.id, [r.last_sent_year, r.last_stage]]));
    expect(by).toEqual({ a: [2027, 3], b: [null, 0], c: [null, 0], d: [null, 0], e: [2027, 3], z: [null, 0] });
  });

  it("does nothing and throws nothing on a database without 0025", async () => {
    const fake = new FakeDb({ reminders: [{ id: "a", user_id: USER, recipient_name: "Mia", month: 3, day: 5, last_sent_year: null }] }, undefined, { missingColumns: { reminders: ["last_stage", "currency"] } });
    expect(await markMadeFor(fake.db as never, USER, "Mia", now)).toBe(0);
    expect(fake.rows("reminders")[0].last_sent_year).toBeNull();
    fake.failNext("reminders", "select");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await markMadeFor(fake.db as never, USER, "Mia", now)).toBe(0);
    errors.mockRestore();
  });
});
