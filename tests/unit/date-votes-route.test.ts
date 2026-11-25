import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

const state = vi.hoisted(() => ({ db: null as unknown, allow: true, storeDown: false, counts: new Map<string, number>(), marks: new Map<string, string>() }));
vi.mock("server-only", () => ({}));
// The limiter as it behaves in one process: a count per key, against that key's limit.
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: async (key: string, { limit }: { limit: number }) => {
    if (!state.allow) return false;
    const n = (state.counts.get(key) ?? 0) + 1;
    state.counts.set(key, n);
    return n <= limit;
  },
  // The limiter's memory of one answer, swapped in one step as Upstash's SET … GET / GETDEL do.
  swapMark: async (key: string, value: string | null) => {
    if (state.storeDown) return undefined;
    const before = state.marks.get(key) ?? null;
    if (value === null) state.marks.delete(key);
    else state.marks.set(key, value);
    return before;
  },
}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));

const route = await import("@/app/api/dates/votes/route");

type Rows = { target: string; yes: number; no: number }[];
type Err = { code: string; message: string } | null;
/** A database that answers the one read and the one call the route makes. */
function fakeDb({ rows = [], readError = null, rpcError = null }: { rows?: Rows; readError?: Err; rpcError?: Err }) {
  const rpc = vi.fn<(name: string, args: unknown) => Promise<{ data: null; error: Err }>>(async () => ({ data: null, error: rpcError }));
  const db = {
    from: () => ({ select: () => ({ in: async (_col: string, targets: string[]) => ({ data: readError ? null : rows.filter((r) => targets.includes(r.target)), error: readError }) }) }),
    rpc,
  };
  return { db, rpc };
}

const get = (t: string) => route.GET(new NextRequest(`https://ethos.test/api/dates/votes?t=${encodeURIComponent(t)}`));
const post = (body: unknown, ip = "203.0.113.7", headers: Record<string, string> = { "content-type": "application/json", "sec-fetch-site": "same-origin", origin: "https://ethos.test" }) =>
  route.POST(new NextRequest("https://ethos.test/api/dates/votes", { method: "POST", headers: { "x-forwarded-for": ip, host: "ethos.test", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) }));
/** The counters as the database would hold them after every call the route made. */
const totals = (rpc: { mock: { calls: unknown[][] } }) => {
  const rows: Record<string, { yes: number; no: number }> = {};
  for (const [, args] of rpc.mock.calls) {
    const { p_targets, p_yes, p_no } = args as { p_targets: string[]; p_yes: number[]; p_no: number[] };
    p_targets.forEach((t, i) => {
      const row = rows[t] ?? { yes: 0, no: 0 };
      rows[t] = { yes: Math.max(row.yes + p_yes[i], 0), no: Math.max(row.no + p_no[i], 0) };
    });
  }
  return rows;
};
const GOOD = { changes: [{ target: "place:node/1", yes: 1, no: 0 }, { target: "idea:spa-evening", yes: 1, no: 0 }] };

describe("the votes route, with the table missing and present (dates2)", () => {
  let logged: MockInstance;
  beforeEach(() => {
    state.db = null;
    state.allow = true;
    state.storeDown = false;
    state.counts.clear();
    state.marks.clear();
    logged = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => logged.mockRestore());

  it("A1 GET with no database: available false, nothing logged", async () => {
    const res = await get("place:node/1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ available: false, liked: {} });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(logged).not.toHaveBeenCalled();
  });

  it("A2 GET with the table missing: the same", async () => {
    for (const code of ["PGRST205", "42P01"]) {
      state.db = fakeDb({ readError: { code, message: "relation does not exist" } }).db;
      const res = await get("place:node/1");
      expect(res.status, code).toBe(200);
      expect(await res.json(), code).toEqual({ available: false, liked: {} });
    }
    expect(logged).not.toHaveBeenCalled();
  });

  it("A3 GET with rows: only five and up, as numbers, and never a no", async () => {
    state.db = fakeDb({ rows: [{ target: "place:node/1", yes: 4, no: 9 }, { target: "place:node/2", yes: 5, no: 7 }, { target: "place:node/3", yes: 14, no: 1 }] }).db;
    const res = await get("place:node/1,place:node/2,place:node/3");
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ available: true, liked: { "place:node/2": 5, "place:node/3": 14 } });
    expect(text).not.toMatch(/"no"/);
    expect(res.headers.get("cache-control")).toContain("max-age=60");
  });

  it("A4 GET with a bad target or too many: 400", async () => {
    expect((await get("user:1")).status).toBe(400);
    expect((await get(Array.from({ length: 61 }, (_, i) => `place:node/${i + 1}`).join(","))).status).toBe(400);
    expect((await get("")).status).toBe(400);
  });

  it("A5 POST with the function missing: available false, nothing logged", async () => {
    state.db = fakeDb({ rpcError: { code: "PGRST202", message: "function not found" } }).db;
    const res = await post(GOOD);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ available: false });
    expect(logged).not.toHaveBeenCalled();
  });

  it("A6 POST present: one call with three arrays of the same length", async () => {
    const { db, rpc } = fakeDb({});
    state.db = db;
    const res = await post(GOOD);
    expect(await res.json()).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("date_votes_apply", { p_targets: ["place:node/1", "idea:spa-evening"], p_yes: [1, 1], p_no: [0, 0] });
  });

  it("A7 POST with a bad body: 400, and nothing written", async () => {
    const { db, rpc } = fakeDb({});
    state.db = db;
    expect((await post({ changes: [{ target: "place:node/1", yes: 2, no: 0 }] })).status).toBe(400);
    expect((await post("not json")).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("A8 over the limit: 429", async () => {
    state.allow = false;
    expect((await post(GOOD)).status).toBe(429);
    expect((await get("place:node/1")).status).toBe(429);
  });

  it("A9 any other error: 503 and exactly one line logged", async () => {
    state.db = fakeDb({ rpcError: { code: "57014", message: "canceling statement due to statement timeout" } }).db;
    expect((await post(GOOD)).status).toBe(503);
    expect(logged).toHaveBeenCalledTimes(1);
  });

  it("A10 one address holds one answer per place, however often it asks (dates2-C5, D1)", async () => {
    const { db, rpc } = fakeDb({});
    state.db = db;
    const yes = { changes: [{ target: "place:node/9", yes: 1, no: 0 }] };
    for (let i = 0; i < 5; i++) expect(await (await post(yes)).json()).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(totals(rpc)["place:node/9"]).toEqual({ yes: 1, no: 0 });
    // Another address, or another place, is counted on its own.
    await post(yes, "198.51.100.4");
    await post({ changes: [{ target: "place:node/10", yes: 1, no: 0 }] });
    expect(totals(rpc)).toEqual({ "place:node/9": { yes: 2, no: 0 }, "place:node/10": { yes: 1, no: 0 } });
  });

  it("A10b an address that never said yes cannot take one away", async () => {
    const { db, rpc } = fakeDb({});
    state.db = db;
    await post({ changes: [{ target: "place:node/9", yes: 1, no: 0 }] }, "198.51.100.4");
    // A wipe from a fresh address: read as "no" from nothing, never as a yes taken off.
    for (let i = 0; i < 5; i++) await post({ changes: [{ target: "place:node/9", yes: -1, no: 1 }] });
    for (let i = 0; i < 5; i++) await post({ changes: [{ target: "place:node/9", yes: -1, no: 0 }] }, "192.0.2.1");
    expect(totals(rpc)["place:node/9"]).toEqual({ yes: 1, no: 1 });
  });

  it("A11 Yes, No, Yes ends counted as yes, and every step is written (dates2-D1)", async () => {
    const { db, rpc } = fakeDb({});
    state.db = db;
    const both = (yes: -1 | 0 | 1, no: -1 | 0 | 1) => ({ changes: [{ target: "place:node/1", yes, no }, { target: "idea:spa-evening", yes, no }] });
    await post(both(1, 0));
    expect(totals(rpc)["place:node/1"]).toEqual({ yes: 1, no: 0 });
    await post(both(-1, 1));
    expect(totals(rpc)["place:node/1"]).toEqual({ yes: 0, no: 1 });
    await post(both(1, -1));
    expect(totals(rpc)).toEqual({ "place:node/1": { yes: 1, no: 0 }, "idea:spa-evening": { yes: 1, no: 0 } });
    // No again, then taken back: nothing left from this address.
    await post(both(-1, 1));
    await post(both(0, -1));
    expect(totals(rpc)).toEqual({ "place:node/1": { yes: 0, no: 0 }, "idea:spa-evening": { yes: 0, no: 0 } });
    expect(rpc).toHaveBeenCalledTimes(5);
  });

  it("A12 a tap mixing a repeat and a new answer writes only the new one", async () => {
    const { db, rpc } = fakeDb({});
    state.db = db;
    await post({ changes: [{ target: "place:node/1", yes: 1, no: 0 }] });
    await post({ changes: [{ target: "place:node/1", yes: 1, no: 0 }, { target: "place:node/2", yes: 1, no: 0 }] });
    expect(rpc).toHaveBeenLastCalledWith("date_votes_apply", { p_targets: ["place:node/2"], p_yes: [1], p_no: [0] });
  });

  it("A13 the limiter's memory down: 503, nothing written; a failed write is counted on the retry", async () => {
    const { db, rpc } = fakeDb({});
    state.db = db;
    state.storeDown = true;
    expect((await post(GOOD)).status).toBe(503);
    expect(rpc).not.toHaveBeenCalled();
    state.storeDown = false;
    // The database fails once: the remembered answer is put back, so the browser's retry moves the counter.
    state.db = fakeDb({ rpcError: { code: "57014", message: "timeout" } }).db;
    expect((await post(GOOD)).status).toBe(503);
    state.db = db;
    expect(await (await post(GOOD)).json()).toEqual({ ok: true });
    expect(totals(rpc)).toEqual({ "place:node/1": { yes: 1, no: 0 }, "idea:spa-evening": { yes: 1, no: 0 } });
  });

  it("A14 only this site's own pages may vote (dates2-D2)", async () => {
    const { db, rpc } = fakeDb({});
    state.db = db;
    const body = JSON.stringify(GOOD);
    // Another site's "simple" request: text/plain, no preflight.
    expect((await post(body, undefined, { "content-type": "text/plain", "sec-fetch-site": "cross-site", origin: "https://evil.test" })).status).toBe(415);
    expect((await post(body, undefined, { "content-type": "text/plain" })).status).toBe(415);
    expect((await post(body, undefined, {})).status).toBe(415);
    // JSON, but from another site or a sibling one.
    expect((await post(body, undefined, { "content-type": "application/json", "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await post(body, undefined, { "content-type": "application/json", "sec-fetch-site": "same-site" })).status).toBe(403);
    expect((await post(body, undefined, { "content-type": "application/json", origin: "https://evil.test" })).status).toBe(403);
    expect((await post(body, undefined, { "content-type": "application/json", origin: "null" })).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
    // This site's own page, with or without a charset.
    expect((await post(body, undefined, { "content-type": "application/json; charset=utf-8", "sec-fetch-site": "same-origin", origin: "https://ethos.test" })).status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("A15 a body over 4 KB is refused before it is read as a vote", async () => {
    const { db, rpc } = fakeDb({});
    state.db = db;
    const padded = JSON.stringify({ ...GOOD, pad: "x".repeat(5000) });
    expect((await post(padded)).status).toBe(413);
    expect(rpc).not.toHaveBeenCalled();
  });
});
