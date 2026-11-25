import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mintReplyToken } from "@/lib/commerce/reply-token";
import { RECIPIENT_REFS } from "@/lib/attribution/recipient";
import { openedWithin7, within7ByDoor } from "@/lib/attribution/recipient-started";
import { firstOpenOf } from "@/lib/gift/first-open";
import { FakeDb } from "./helpers/fake-db";

/**
 * The rule behind `recipient_started` (docs/marketing/LOOP-KPI.md), the gift's first open read from
 * gift_views, and the route that answers one yes or no for a sealed reply token and nothing else.
 */

const state = vi.hoisted(() => ({ db: null as unknown, allowed: true }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => state.allowed }));

const route = await import("@/app/api/loop/started/route");

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-25T12:00:00.000Z");
const GIFT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const OTHER = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const SECRET = "test-secret-that-is-long-enough";
const iso = (ms: number) => new Date(ms).toISOString();

function post(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/loop/started", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("the seven-day rule", () => {
  it("within seven days to the millisecond", () => {
    expect(openedWithin7(NOW - 7 * DAY, NOW)).toBe(true);
    expect(openedWithin7(NOW - 7 * DAY - 1, NOW)).toBe(false);
    expect(openedWithin7(NOW, NOW)).toBe(true);
  });

  it("no open yet, or one that reads later than now, is within", () => {
    expect(openedWithin7(null, NOW)).toBe(true);
    expect(openedWithin7(NOW + DAY, NOW)).toBe(true);
  });

  it("the door says it where nothing names the gift", () => {
    const expected: Record<string, boolean> = { reply: true, g: true, watermark: true, "gift-keep": false };
    for (const via of RECIPIENT_REFS) {
      // A fifth door fails here until someone decides which side it is on.
      expect(via in expected, `door ${via} has no decided answer`).toBe(true);
      expect(within7ByDoor(via)).toBe(expected[via]);
    }
  });
});

describe("a gift's first open", () => {
  it("reads a gift's earliest open", async () => {
    const fake = new FakeDb(
      {
        gift_views: [
          { id: "v1", gift_id: GIFT, opened_at: iso(NOW - 2 * DAY) },
          { id: "v2", gift_id: GIFT, opened_at: iso(NOW - 5 * DAY) },
          { id: "v3", gift_id: GIFT, opened_at: iso(NOW - 3 * DAY) },
          { id: "v4", gift_id: OTHER, opened_at: iso(NOW - 30 * DAY) },
        ],
      },
      NOW,
    );
    expect(await firstOpenOf(fake.db, GIFT)).toBe(NOW - 5 * DAY);
    expect(await firstOpenOf(fake.db, "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee")).toBeNull();
  });
});

describe("POST /api/loop/started", () => {
  let fake: FakeDb;
  const token = () => mintReplyToken({ giftId: GIFT, templateSlug: "bouquet" }, SECRET);
  const seed = (openedAgo: number) => {
    fake = new FakeDb({ gift_views: [{ id: "v1", gift_id: GIFT, opened_at: iso(NOW - openedAgo) }] }, NOW);
    state.db = fake.db;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.stubEnv("VIEWER_HASH_SECRET", SECRET);
    state.allowed = true;
    seed(6 * DAY);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("the route: a real token, opened six days ago", async () => {
    const res = await route.POST(post({ reply: token() }));
    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({ within7: true });
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("the route: opened eight days ago", async () => {
    seed(8 * DAY);
    const res = await route.POST(post({ reply: token() }));
    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({ within7: false });
  });

  it("the route: a token that isn't ours, a made-up one, no body, no secret, no database", async () => {
    const foreign = mintReplyToken({ giftId: GIFT, templateSlug: "bouquet" }, "another-secret-entirely-xxxxxxxx");
    let res = await route.POST(post({ reply: foreign }));
    expect([res.status, await res.json()]).toStrictEqual([200, { within7: null }]);

    res = await route.POST(post({ reply: "x" }));
    expect([res.status, await res.json()]).toStrictEqual([400, { within7: null }]);
    res = await route.POST(post(undefined));
    expect([res.status, await res.json()]).toStrictEqual([400, { within7: null }]);

    const minted = token();
    vi.stubEnv("VIEWER_HASH_SECRET", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    res = await route.POST(post({ reply: minted }));
    expect([res.status, await res.json()]).toStrictEqual([200, { within7: null }]);

    vi.stubEnv("VIEWER_HASH_SECRET", SECRET);
    state.db = null;
    res = await route.POST(post({ reply: minted }));
    expect([res.status, await res.json()]).toStrictEqual([200, { within7: null }]);
  });

  it("the route answers nothing that could name a gift, and writes nothing", async () => {
    const before = structuredClone(fake.rows("gift_views"));
    const res = await route.POST(post({ reply: token() }));
    const text = await res.text();
    expect(Object.keys(JSON.parse(text))).toStrictEqual(["within7"]);
    expect(text).not.toContain(GIFT);
    expect(text).not.toContain("bouquet");
    expect(fake.rows("gift_views")).toStrictEqual(before);

    state.allowed = false;
    const refused = await route.POST(post({ reply: token() }));
    expect([refused.status, await refused.json()]).toStrictEqual([429, { within7: null }]);
  });
});
