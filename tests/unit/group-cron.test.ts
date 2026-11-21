/**
 * The daily job (/api/cron/unlock) and group cards: switched off it does what it always did and
 * reads no group table; switched on it runs the group step before the storage sweep, sends a
 * scheduled card that has just opened to whoever signed it, and is never failed by either.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeDb } from "./helpers/fake-db";

const state = vi.hoisted(() => ({ db: null as unknown, on: false, order: [] as string[], signedFor: [] as string[], retention: { scrubbed: 2, addressesForgotten: 0, purged: 0, draftsKept: 1, orphansRemoved: 0, emailed: 0 } as Record<string, unknown>, signedThrows: false }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/group/flag", () => ({ groupGiftsEnabled: () => state.on }));
vi.mock("@/lib/email/notify", () => ({ notifyUnlocked: async () => {} }));
vi.mock("@/lib/gift/storage-cleanup", () => ({ pruneOpenedGiftStorage: async () => ({ deleted: 0 }) }));
vi.mock("@/lib/gift/retention", () => ({ runStorageRetention: async () => (state.order.push("storage sweep"), { orphans: 0, drafts: 0 }) }));
vi.mock("@/lib/attribution/checkout-source", () => ({ forgetUnpaidCheckoutSources: async () => 0 }));
vi.mock("@/lib/support/retention", () => ({ forgetOldSupportChats: async () => 0 }));
vi.mock("@/lib/group/retention", () => ({ runGroupRetention: async () => (state.order.push("group step"), state.retention) }));
vi.mock("@/lib/group/signed-email", () => ({
  sendSignedGiftEmails: async (_admin: unknown, giftId: string) => {
    if (state.signedThrows) throw new Error("mail down");
    state.signedFor.push(giftId);
    return { sent: 1, skipped: 0 };
  },
}));

const cron = await import("@/app/api/cron/unlock/route");

const NOW = Date.parse("2026-12-20T08:00:00Z");
const DUE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LATER = "aaaaaaaa-aaaa-4aaa-8aaa-bbbbbbbbbbbb";
let fake: FakeDb;
const run = () => cron.GET(new NextRequest("https://ethos.test/api/cron/unlock", { headers: { authorization: "Bearer cron-secret" } }));

beforeEach(() => {
  process.env.CRON_SECRET = "cron-secret";
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  fake = new FakeDb(
    {
      gifts: [
        { id: DUE, status: "scheduled", unlock_at: new Date(NOW - 60_000).toISOString(), storage_pruned_at: null, updated_at: new Date(NOW).toISOString() },
        { id: LATER, status: "scheduled", unlock_at: new Date(NOW + 86_400_000).toISOString(), storage_pruned_at: null, updated_at: new Date(NOW).toISOString() },
      ],
    },
    NOW,
  );
  state.db = fake.db;
  state.on = false;
  state.order = [];
  state.signedFor = [];
  state.signedThrows = false;
  state.retention = { scrubbed: 2, addressesForgotten: 0, purged: 0, draftsKept: 1, orphansRemoved: 0, emailed: 0 };
  return () => vi.useRealTimers();
});

describe("the daily job with group cards switched off", () => {
  it("skips the group step, sends nobody a card, and answers as it always did", async () => {
    const res = await run();
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(["flipped", "ok", "pruned", "retention", "supportChatsForgotten", "unpaidSourcesForgotten"]);
    expect(body.flipped).toBe(1);
    expect(state.order).toEqual(["storage sweep"]);
    expect(state.signedFor).toEqual([]);
  });
});

describe("the daily job with group cards switched on", () => {
  it("runs the group step before the storage sweep, so a draft it keeps is not swept in the same run, and reports it", async () => {
    state.on = true;
    const body = (await (await run()).json()) as Record<string, unknown>;
    expect(state.order).toEqual(["group step", "storage sweep"]);
    expect(body.group).toEqual(state.retention);
  });

  it("a scheduled card that has just opened goes to whoever signed it; one still waiting does not", async () => {
    state.on = true;
    await run();
    expect(state.signedFor).toEqual([DUE]);
    expect(fake.rows("gifts").map((gift) => gift.status)).toEqual(["live", "scheduled"]);
  });

  it("is not failed by a database without migration 0023, or by the mail service: the rest of the run finishes", async () => {
    state.on = true;
    state.retention = { scrubbed: 0, addressesForgotten: 0, purged: 0, draftsKept: 0, orphansRemoved: 0, emailed: 0, error: "Could not find the table 'public.gift_contributions' in the schema cache" };
    state.signedThrows = true;
    const res = await run();
    const body = (await res.json()) as { ok: boolean; flipped: number; group: { error: string }; retention: unknown };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.flipped).toBe(1);
    expect(body.group.error).toMatch(/gift_contributions/);
    expect(body.retention).toEqual({ orphans: 0, drafts: 0 });
  });

  it("still needs the cron's own secret", async () => {
    state.on = true;
    const res = await cron.GET(new NextRequest("https://ethos.test/api/cron/unlock"));
    expect(res.status).toBe(401);
    expect(state.order).toEqual([]);
  });
});
