import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeDb } from "./helpers/fake-db";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => true }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: async () => state.db }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => ({ id: "11111111-1111-4111-8111-111111111111" }) }));

const route = await import("@/app/api/reminders/route");

const post = (body: Record<string, unknown>) => route.POST(new NextRequest("https://ethos.test/api/reminders", { method: "POST", body: JSON.stringify(body) }));
// Today's birthday: the gift was just made for it, so this year's three e-mails are done.
const today = new Date();
const giftDay = { month: today.getMonth() + 1, day: today.getDate() };

describe("saving a reminder from the card", () => {
  let fake: FakeDb;
  beforeEach(() => {
    fake = new FakeDb({ reminders: [] });
    state.db = fake.db;
  });

  it("keeps the page's currency, and marks the gift's own day done for the year with all three e-mails", async () => {
    expect((await post({ recipientName: "Mia", occasion: "birthday", ...giftDay, currency: "gbp" })).status).toBe(201);
    expect((await post({ recipientName: "Mia", occasion: "anniversary", month: 3, day: 5, currency: "gbp", forThisGift: false })).status).toBe(201);
    const [birthday, anniversary] = fake.rows("reminders");
    expect(birthday).toMatchObject({ currency: "gbp", last_stage: 3 });
    expect(birthday.last_sent_year).not.toBeNull();
    expect(anniversary).toMatchObject({ currency: "gbp", last_sent_year: null });
    expect(anniversary).not.toHaveProperty("last_stage");
  });

  it("lists each day with what already went for it, so the card can say when the first e-mail really comes", async () => {
    fake = new FakeDb({
      reminders: [
        { id: "r1", user_id: "11111111-1111-4111-8111-111111111111", recipient_name: "Mia", occasion: "birthday", month: 3, day: 5, locale: "en", template_slug: null, last_sent_year: 2027, last_stage: 1 },
        { id: "r2", user_id: "11111111-1111-4111-8111-111111111111", recipient_name: "Mia", occasion: "anniversary", month: 6, day: 1, locale: "en", template_slug: null, last_sent_year: null, last_stage: 0 },
      ],
    });
    state.db = fake.db;
    const listed = (await (await route.GET()).json()) as { reminders: { id: string; sentYear: number | null; sentStage?: number }[] };
    expect(listed.reminders.map((r) => [r.id, r.sentYear, r.sentStage]).sort()).toEqual([
      ["r1", 2027, 1],
      ["r2", null, 0],
    ]);
    // Saving a day already there answers with what went for it.
    const again = (await (await post({ recipientName: "mia", occasion: "birthday", month: 3, day: 5 })).json()) as { reminder: { sentYear: number; sentStage: number }; created: boolean };
    expect(again).toMatchObject({ created: false, reminder: { sentYear: 2027, sentStage: 1 } });
  });

  it("lists every day on a database without migration 0025, the stage left out", async () => {
    fake = new FakeDb({ reminders: [{ id: "r1", user_id: "11111111-1111-4111-8111-111111111111", recipient_name: "Mia", occasion: "birthday", month: 3, day: 5, locale: "en", template_slug: null, last_sent_year: 2027 }] }, undefined, { missingColumns: { reminders: ["last_stage", "currency"] } });
    state.db = fake.db;
    const listed = (await (await route.GET()).json()) as { reminders: Record<string, unknown>[] };
    expect(listed.reminders).toHaveLength(1);
    expect(listed.reminders[0]).toMatchObject({ id: "r1", sentYear: 2027 });
    expect(listed.reminders[0]).not.toHaveProperty("sentStage");
  });

  it("refuses a currency the site doesn't charge", async () => {
    expect((await post({ recipientName: "Mia", occasion: "birthday", month: 3, day: 5, currency: "jpy" })).status).toBe(400);
  });

  it("saves as before on a database without migration 0025, dropping the currency quietly", async () => {
    fake = new FakeDb({ reminders: [] }, undefined, { missingColumns: { reminders: ["last_stage", "currency"] } });
    state.db = fake.db;
    expect((await post({ recipientName: "Mia", occasion: "birthday", ...giftDay, currency: "eur" })).status).toBe(201);
    const [row] = fake.rows("reminders");
    expect(row).toMatchObject({ recipient_name: "Mia", occasion: "birthday" });
    expect(row.last_sent_year).not.toBeNull();
    expect(row).not.toHaveProperty("currency");
    expect(row).not.toHaveProperty("last_stage");
  });
});
