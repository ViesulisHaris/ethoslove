import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Plan } from "@/lib/dates/plan";
import type { Inserts, Updates } from "@/lib/supabase/types";

/**
 * Saved dates and their limits (docs/MEMBERSHIP.md 3.1, 3.2 and 3.4): the rules in
 * lib/saved-dates/server.ts over an in-memory table that behaves like 0015's (the database's own
 * clock for created_at and updated_at, the one-row-per-trip index, the 500 cap, the CHECKs, and
 * row-level security from couple_partner()), the routes' rate limits and answers, and the reminder
 * the day before.
 */

vi.mock("server-only", () => ({}));
const route = vi.hoisted(() => ({ session: null as unknown, limits: [] as { key: string; limit: number; windowSeconds: number }[], allowed: true }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => null }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => null }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: async () => null }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: async (key: string, options: { limit: number; windowSeconds: number }) => {
    route.limits.push({ ...options, key });
    return route.allowed;
  },
}));
vi.mock("@/lib/saved-dates/server", async (original) => ({ ...(await original<typeof import("@/lib/saved-dates/server")>()), savedDatesSession: async () => route.session }));

const server = await import("@/lib/saved-dates/server");
const { createSavedDate, deleteSavedDate, editableWhenFree, listSavedDates, personOf, readSavedDate, refusalOf, SavedStoreError, updateSavedDate } = server;
type SavedRow = import("@/lib/saved-dates/server").SavedRow;
type SavedStore = import("@/lib/saved-dates/server").SavedStore;
const { deriveColumns, readPatchInput, readSaveInput, readTitle, readTripData, DATA_MAX_BYTES } = await import("@/lib/saved-dates/validate");
const { FREE_SAVED_DATES } = await import("@/lib/pricing/products");
const { CoupleUnavailable } = await import("@/lib/saved-dates/couple");
const listRoute = await import("@/app/api/saved-dates/route");
const itemRoute = await import("@/app/api/saved-dates/[id]/route");
const { QUIET_HEADER } = await import("@/lib/saved-dates/types");
const { REMINDER_BATCH, sendDateReminders, supabaseReminderStore, tomorrowUtc } = await import("@/lib/saved-dates/reminders");

// ---------------------------------------------------------------------------------------------
// A saved_dates table, as 0015 makes it
// ---------------------------------------------------------------------------------------------

const ANA = "00000000-0000-4000-8000-00000000000a";
const BEN = "00000000-0000-4000-8000-00000000000b";
const CARA = "00000000-0000-4000-8000-00000000000c";

const stop = (i: number, over: Partial<Plan["stops"][number]> = {}): Plan["stops"][number] => ({ id: `s${i}`, name: `Stop ${i}`, kind: "cafe", lat: 38.71 + i / 1000, lng: -9.14, ...over });
const plan = (stops = 2, over: Partial<Plan> = {}): Plan => ({ v: 1, where: "Lisbon", date: "2026-10-03", stops: Array.from({ length: stops }, (_, i) => stop(i + 1)), ...over });

type Refusal = { refused: "duplicate" | "cap" | "check"; detail?: string };

/**
 * The table and who shares with whom. `clock` is the database's: every insert and every new version
 * is stamped by it, whatever the app server's clock says, as 0015's defaults and saved_dates_touch do.
 */
function world() {
  const rows: SavedRow[] = [];
  const couples: { owner: string; partner: string | null; running: boolean }[] = [];
  const names = new Map<string, { name: string | null; email: string | null }>([
    [ANA, { name: "Ana", email: "ana@example.com" }],
    [BEN, { name: "Ben", email: "ben@example.com" }],
    [CARA, { name: null, email: "cara@example.com" }],
  ]);
  let tick = Date.UTC(2026, 8, 25, 9);
  let ids = 0;
  const clock = () => new Date((tick += 1000)).toISOString();
  const inserts: Inserts<"saved_dates">[] = [];
  let failNext: Refusal | null = null;
  const yieldToOthers = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  const running = (userId: string) => couples.find((c) => c.running && (c.owner === userId || c.partner === userId));
  const partnerOf = (userId: string) => {
    const c = couples.find((x) => x.running && x.partner && (x.owner === userId || x.partner === userId));
    return c ? (c.owner === userId ? c.partner : c.owner) : null;
  };
  const checks = (row: SavedRow): Refusal | null => {
    if (row.title.length > 80) return { refused: "check", detail: 'violates check constraint "saved_dates_title_check"' };
    if (row.city !== null && row.city.length > 80) return { refused: "check", detail: 'violates check constraint "saved_dates_city_check"' };
    if (JSON.stringify(row.data).length > 16384) return { refused: "check", detail: 'violates check constraint "saved_dates_data_check"' };
    if (row.stops_count < 0 || row.stops_count > 99) return { refused: "check", detail: 'violates check constraint "saved_dates_stops_count_check"' };
    return null;
  };

  const storeFor = (viewer: string): SavedStore => {
    // Row-level security: one's own rows, and the partner's while a membership with them runs.
    const visible = (row: SavedRow) => row.owner_user_id === viewer || row.owner_user_id === partnerOf(viewer);
    return {
      async listVisible() {
        await yieldToOthers();
        return rows.filter(visible).map(server.listShape);
      },
      async getVisible(id) {
        await yieldToOthers();
        const row = rows.find((r) => r.id === id);
        return row && visible(row) ? structuredClone(row) : null;
      },
      async ownKeys(ownerId) {
        await yieldToOthers();
        return rows.filter((r) => r.owner_user_id === ownerId).map(({ id, created_at, updated_at }) => ({ id, created_at, updated_at }));
      },
      async findOwnTrip(ownerId, tripId) {
        await yieldToOthers();
        return rows.find((r) => r.owner_user_id === ownerId && r.kind === "trip" && (r.data as { tripId?: string }).tripId === tripId) ?? null;
      },
      async insert(insert) {
        inserts.push(insert);
        await yieldToOthers();
        if (failNext) {
          const refused = failNext;
          failNext = null;
          return refused;
        }
        if (rows.filter((r) => r.owner_user_id === insert.owner_user_id).length >= 500) return { refused: "cap" };
        if (insert.kind === "trip" && rows.some((r) => r.owner_user_id === insert.owner_user_id && r.kind === "trip" && (r.data as { tripId?: string }).tripId === (insert.data as { tripId?: string }).tripId)) return { refused: "duplicate" };
        const at = clock();
        const row: SavedRow = { id: `00000000-0000-4000-9000-${String(++ids).padStart(12, "0")}`, title: "", city: null, day: null, stops_count: 0, remind: true, reminded_for: null, version: 1, last_edited_by: null, ...insert, created_at: at, updated_at: at } as SavedRow;
        const refused = checks(row);
        if (refused) return refused;
        rows.push(row);
        return { row: structuredClone(row) };
      },
      async update(id, patch: Updates<"saved_dates">, version) {
        await yieldToOthers();
        const row = rows.find((r) => r.id === id);
        if (!row || (version !== null && row.version !== version)) return null;
        const next = { ...row, ...patch } as SavedRow;
        if (next.version !== row.version) next.updated_at = clock();
        const refused = failNext ?? checks(next);
        failNext = null;
        if (refused) return refused;
        Object.assign(row, next);
        return structuredClone(row);
      },
      async remove(id, ownerId) {
        await yieldToOthers();
        const at = rows.findIndex((r) => r.id === id && r.owner_user_id === ownerId);
        if (at < 0) return false;
        rows.splice(at, 1);
        return true;
      },
      async profiles(wanted) {
        return new Map(wanted.filter((id) => names.has(id)).map((id) => [id, names.get(id)!]));
      },
    };
  };

  const deps = (viewer: string) => ({
    viewerId: viewer,
    store: storeFor(viewer),
    couple: { isMember: async (id: string) => Boolean(running(id)), partnerOf: async (id: string) => partnerOf(id) },
  });

  return {
    rows,
    inserts,
    deps,
    clock,
    refuseNext: (refusal: Refusal) => (failNext = refusal),
    join: (owner: string, partner: string | null = null) => couples.push({ owner, partner, running: true }),
    end: (owner: string) => couples.filter((c) => c.owner === owner).forEach((c) => (c.running = false)),
    /** A row as if saved earlier, stamped by the database clock. */
    seed: (owner: string, over: Partial<SavedRow> = {}) => {
      const at = clock();
      const row: SavedRow = { id: `00000000-0000-4000-9000-${String(++ids).padStart(12, "0")}`, owner_user_id: owner, kind: "date", title: `Date ${ids}`, city: "Lisbon", day: "2026-10-03", data: plan() as unknown as SavedRow["data"], stops_count: 2, remind: true, reminded_for: null, version: 1, last_edited_by: owner, created_at: at, updated_at: at, ...over };
      rows.push(row);
      return row;
    },
  };
}

const saveDate = (p: Plan = plan(), title?: string) => {
  const input = readSaveInput({ kind: "date", data: p, title });
  if (!input.ok) throw new Error(input.error);
  return input.value;
};
const saveTrip = (tripId = "lisbon-slow-weekend") => {
  const input = readSaveInput({ kind: "trip", data: { v: 1, tripId } });
  if (!input.ok) throw new Error(input.error);
  return input.value;
};

// ---------------------------------------------------------------------------------------------

describe("what /api/saved-dates accepts", () => {
  it("keeps a date only as a plan readPlan accepts, with at least one stop", () => {
    const ok = readSaveInput({ kind: "date", data: { ...plan(2), where: "  Lisbon  ", extra: "dropped" }, title: "  Our   evening " });
    expect(ok).toEqual({ ok: true, value: { kind: "date", data: plan(2), title: "Our evening" } });
    expect(readSaveInput({ kind: "date", data: plan(0) })).toEqual({ ok: false, error: "empty_plan" });
    expect(readSaveInput({ kind: "date", data: { v: 2, stops: [stop(1)] } })).toEqual({ ok: false, error: "invalid_input" });
    expect(readSaveInput({ kind: "date", data: plan(1, { stops: [stop(1, { kind: "casino" as never })] }) })).toEqual({ ok: false, error: "invalid_input" });
    expect(readSaveInput({ kind: "date", data: { ...plan(9) } })).toEqual({ ok: false, error: "invalid_input" });
    expect(readSaveInput({ kind: "gift", data: plan() })).toEqual({ ok: false, error: "invalid_input" });
    expect(readSaveInput(null)).toEqual({ ok: false, error: "invalid_input" });
  });

  it("keeps a trip only as one of the ready-made trips, with a real day to leave and a short note", () => {
    expect(readTripData({ v: 1, tripId: "lisbon-slow-weekend", depart: "2026-11-02", note: " window seat " })).toEqual({ v: 1, tripId: "lisbon-slow-weekend", depart: "2026-11-02", note: "window seat" });
    expect(readSaveInput({ kind: "trip", data: { v: 1, tripId: "atlantis-by-night" } })).toEqual({ ok: false, error: "unknown_trip" });
    expect(readSaveInput({ kind: "trip", data: { v: 1, tripId: "../../etc" } })).toEqual({ ok: false, error: "invalid_input" });
    expect(readSaveInput({ kind: "trip", data: { v: 1, tripId: "lisbon-slow-weekend", depart: "2026-13-40" } })).toEqual({ ok: false, error: "invalid_input" });
    expect(readSaveInput({ kind: "trip", data: { v: 1, tripId: "lisbon-slow-weekend", note: "x".repeat(281) } })).toEqual({ ok: false, error: "invalid_input" });
  });

  it("takes a title of one line, at most 80 characters, and reads a blank one as none", () => {
    expect(readTitle("  Sunset\n and   wine ")).toBe("Sunset and wine");
    expect(readTitle("   ")).toBeNull();
    expect(readTitle(undefined)).toBeNull();
    expect(readTitle("x".repeat(80))).toBe("x".repeat(80));
    expect(readTitle("x".repeat(81))).toBe(false);
    expect(readTitle(42)).toBe(false);
  });

  it("refuses a plan too big for the table's 16 KB check before the database sees it", () => {
    const big = plan(8, { stops: Array.from({ length: 8 }, (_, i) => stop(i, { name: "n".repeat(120), address: "a".repeat(160), note: "o".repeat(140) })) });
    // Eight full stops fit comfortably: the limit is for something that isn't a plan anybody made.
    expect(readSaveInput({ kind: "date", data: big }).ok).toBe(true);
    expect(DATA_MAX_BYTES).toBeLessThan(16384);
  });

  it("asks an edit to the plan or the title which version it was made on, and a reminder switch nothing", () => {
    expect(readPatchInput({ baseVersion: 3, data: plan() })).toEqual({ ok: true, value: { baseVersion: 3, data: plan() } });
    expect(readPatchInput({ data: plan() })).toEqual({ ok: false, error: "invalid_input" });
    expect(readPatchInput({ title: "Rename" })).toEqual({ ok: false, error: "invalid_input" });
    expect(readPatchInput({ remind: false })).toEqual({ ok: true, value: { baseVersion: null, remind: false } });
    expect(readPatchInput({ baseVersion: 2, title: "   " })).toEqual({ ok: false, error: "invalid_input" });
    expect(readPatchInput({})).toEqual({ ok: false, error: "invalid_input" });
    expect(readPatchInput({ baseVersion: 0, data: plan() })).toEqual({ ok: false, error: "invalid_input" });
    expect(readPatchInput({ baseVersion: 1.5, data: plan() })).toEqual({ ok: false, error: "invalid_input" });
    expect(readPatchInput({ remind: "yes" })).toEqual({ ok: false, error: "invalid_input" });
  });

  it("derives where, when and how many stops on the server, never from the client", () => {
    expect(deriveColumns({ kind: "date", data: plan(3, { where: "Porto", date: "2026-12-24" }) })).toEqual({ city: "Porto", day: "2026-12-24", stops_count: 3 });
    expect(deriveColumns({ kind: "date", data: plan(1, { where: undefined, date: undefined }) })).toEqual({ city: null, day: null, stops_count: 1 });
    const trip = deriveColumns({ kind: "trip", data: { v: 1, tripId: "lisbon-slow-weekend", depart: "2026-11-02" } });
    expect(trip.day).toBe("2026-11-02");
    expect(trip.city).toBe("Lisbon");
    expect(trip.stops_count).toBeGreaterThan(0);
  });
});

describe("the free limit", () => {
  it("keeps three dates and trips together, and refuses the fourth before writing anything", async () => {
    const w = world();
    for (const input of [saveDate(), saveTrip(), saveDate(plan(1))]) expect((await createSavedDate(w.deps(ANA), input)).status).toBe(201);
    const fourth = await createSavedDate(w.deps(ANA), saveDate());
    expect(fourth).toEqual({ status: 403, body: { error: "limit_reached", limit: FREE_SAVED_DATES, used: 3 } });
    expect(w.inserts).toHaveLength(3);
    expect(w.rows).toHaveLength(3);
  });

  it("checks again after inserting: of two saves at once, the one the database made last is deleted and refused", async () => {
    const w = world();
    w.seed(ANA);
    w.seed(ANA);
    const [first, second] = await Promise.all([createSavedDate(w.deps(ANA), saveDate(plan(1), "One")), createSavedDate(w.deps(ANA), saveDate(plan(2), "Two"))]);
    expect([first.status, second.status].sort()).toEqual([201, 403]);
    const refused = first.status === 403 ? first : second;
    expect(refused.body).toEqual({ error: "limit_reached", limit: FREE_SAVED_DATES, used: 3 });
    expect(w.rows).toHaveLength(FREE_SAVED_DATES);
    // Both passed the first check and both were written: the survivor is the one made first.
    expect(w.inserts).toHaveLength(2);
    expect(w.rows.map((r) => r.title)).toContain("One");
    expect(w.rows.map((r) => r.title)).not.toContain("Two");
  });

  it("ranks the race by the database's clock: the insert carries no time of this server's", async () => {
    const w = world();
    w.seed(ANA);
    w.seed(ANA);
    // This server's clock a day ahead of the database's changes nothing.
    vi.useFakeTimers({ toFake: ["Date"], now: Date.UTC(2026, 8, 26) });
    try {
      await Promise.all([createSavedDate(w.deps(ANA), saveDate(plan(1), "First")), createSavedDate(w.deps(ANA), saveDate(plan(1), "Second"))]);
    } finally {
      vi.useRealTimers();
    }
    for (const insert of w.inserts) {
      expect(insert).not.toHaveProperty("created_at");
      expect(insert).not.toHaveProperty("updated_at");
    }
    expect(w.rows.map((r) => r.title)).toEqual(["Date 1", "Date 2", "First"]);
  });

  it("lets members save as many as they like, up to the database's 500 backstop", async () => {
    const w = world();
    w.join(ANA);
    for (let i = 0; i < 5; i += 1) expect((await createSavedDate(w.deps(ANA), saveDate())).status).toBe(201);
    for (let i = w.rows.length; i < 500; i += 1) w.seed(ANA);
    expect(await createSavedDate(w.deps(ANA), saveDate())).toEqual({ status: 403, body: { error: "limit_reached", limit: 500, used: 500 } });
  });

  it("tells the 500 cap apart from any other CHECK the table refuses", async () => {
    const w = world();
    w.join(ANA);
    w.refuseNext({ refused: "cap" });
    expect(await createSavedDate(w.deps(ANA), saveDate())).toMatchObject({ status: 403, body: { error: "limit_reached", limit: 500 } });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    w.refuseNext({ refused: "check", detail: 'violates check constraint "saved_dates_data_check"' });
    expect(await createSavedDate(w.deps(ANA), saveDate())).toEqual({ status: 400, body: { error: "invalid_input" } });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("saved_dates_data_check"));
    warn.mockRestore();
  });

  it("reads the database's refusals: the cap's words are the only 23514 that is a limit", () => {
    expect(refusalOf({ code: "23505", message: "duplicate key value violates unique constraint" })).toEqual({ refused: "duplicate" });
    expect(refusalOf({ code: "23514", message: "too many saved dates" })).toEqual({ refused: "cap" });
    expect(refusalOf({ code: "23514", message: 'new row for relation "saved_dates" violates check constraint "saved_dates_title_check"' })).toEqual({ refused: "check", detail: 'new row for relation "saved_dates" violates check constraint "saved_dates_title_check"' });
    expect(refusalOf({ code: "42P01", message: 'relation "public.saved_dates" does not exist' })).toBeNull();
    expect(refusalOf({ code: "PGRST205", message: "Could not find the table" })).toBeNull();
  });

  it("answers a trip saved already with the row it has, even when two taps race to the unique index", async () => {
    const w = world();
    const first = await createSavedDate(w.deps(ANA), saveTrip());
    expect(first.status).toBe(201);
    const again = await createSavedDate(w.deps(ANA), saveTrip());
    expect(again).toMatchObject({ status: 200, body: { existing: true, savedDate: { kind: "trip", tripId: "lisbon-slow-weekend" } } });
    expect(w.rows).toHaveLength(1);
    // The index said "duplicate" although the first look found nothing (the other tap got there in between).
    const racing = world();
    racing.seed(ANA, { kind: "trip", data: { v: 1, tripId: "amalfi-coast" } as unknown as SavedRow["data"] });
    const store = racing.deps(ANA).store;
    let looks = 0;
    const deps = { ...racing.deps(ANA), store: { ...store, findOwnTrip: async (owner: string, tripId: string) => (looks++ === 0 ? null : store.findOwnTrip(owner, tripId)) } };
    expect(await createSavedDate(deps, saveTrip("amalfi-coast"))).toMatchObject({ status: 200, body: { existing: true } });
  });
});

describe("editing: versions, read-only after a membership, the partner", () => {
  it("writes an edit made on the current version, and stamps it with the database's time", async () => {
    const w = world();
    const row = w.seed(ANA);
    const before = row.updated_at;
    const answer = await updateSavedDate(w.deps(ANA), row.id, { baseVersion: 1, data: plan(3), title: "Renamed" });
    expect(answer.status).toBe(200);
    const saved = (answer.body as { savedDate: { version: number; title: string; stopsCount: number; updatedAt: string; lastEditedBy: { name: string } } }).savedDate;
    expect(saved).toMatchObject({ version: 2, title: "Renamed", stopsCount: 3, lastEditedBy: { name: "Ana" } });
    expect(saved.updatedAt > before).toBe(true);
  });

  it("answers an edit made on an older version with 409 and the row as it is now", async () => {
    const w = world();
    const row = w.seed(ANA, { version: 4, data: plan(3) as unknown as SavedRow["data"] });
    const answer = await updateSavedDate(w.deps(ANA), row.id, { baseVersion: 3, data: plan(1) });
    expect(answer).toMatchObject({ status: 409, body: { error: "conflict", savedDate: { version: 4, stopsCount: 2 } } });
    expect(w.rows[0].version).toBe(4);
  });

  it("answers 409 when the other phone saved between the read and the write", async () => {
    const w = world();
    const row = w.seed(ANA);
    const deps = w.deps(ANA);
    const getVisible = deps.store.getVisible;
    let first = true;
    deps.store.getVisible = async (id) => {
      const seen = await getVisible(id);
      if (first) {
        first = false;
        // The other phone's save lands now.
        w.rows[0].version = 2;
        w.rows[0].data = plan(5) as unknown as SavedRow["data"];
      }
      return seen;
    };
    expect(await updateSavedDate(deps, row.id, { baseVersion: 1, data: plan(1) })).toMatchObject({ status: 409, body: { error: "conflict", savedDate: { version: 2 } } });
  });

  it("switches a reminder without a version, so it never conflicts with an edit or moves the date up the list", async () => {
    const w = world();
    const row = w.seed(ANA, { version: 7 });
    const answer = await updateSavedDate(w.deps(ANA), row.id, { baseVersion: null, remind: false });
    expect(answer).toMatchObject({ status: 200, body: { savedDate: { remind: false, version: 7, updatedAt: row.updated_at } } });
  });

  it("keeps a saved trip the trip it was saved as", async () => {
    const w = world();
    const row = w.seed(ANA, { kind: "trip", data: { v: 1, tripId: "amalfi-coast" } as unknown as SavedRow["data"] });
    expect(await updateSavedDate(w.deps(ANA), row.id, { baseVersion: 1, data: { v: 1, tripId: "lisbon-slow-weekend" } })).toEqual({ status: 400, body: { error: "invalid_input" } });
    expect(await updateSavedDate(w.deps(ANA), row.id, { baseVersion: 1, data: { v: 1, tripId: "amalfi-coast", depart: "2026-11-02" } })).toMatchObject({ status: 200 });
  });

  it("answers an edit the table's checks refuse with 400, not a limit", async () => {
    const w = world();
    const row = w.seed(ANA);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    w.refuseNext({ refused: "check", detail: "saved_dates_data_check" });
    expect(await updateSavedDate(w.deps(ANA), row.id, { baseVersion: 1, data: plan(2) })).toEqual({ status: 400, body: { error: "invalid_input" } });
    warn.mockRestore();
  });

  it("once a membership ends, keeps every date, and only the three most recently changed editable", async () => {
    const w = world();
    w.join(ANA);
    const rows = Array.from({ length: 5 }, () => w.seed(ANA));
    // The oldest was edited last, so it is among the three most recent.
    expect((await updateSavedDate(w.deps(ANA), rows[0].id, { baseVersion: 1, title: "Edited last" })).status).toBe(200);
    w.end(ANA);

    const list = await listSavedDates(w.deps(ANA));
    expect(list.member).toBe(false);
    expect(list.quota).toEqual({ used: 5, limit: FREE_SAVED_DATES });
    expect(list.items.map((i) => [i.title, i.editable])).toEqual([
      ["Edited last", true],
      [rows[4].title, true],
      [rows[3].title, true],
      [rows[2].title, false],
      [rows[1].title, false],
    ]);
    expect(await updateSavedDate(w.deps(ANA), rows[1].id, { baseVersion: 1, title: "Nope" })).toEqual({ status: 403, body: { error: "read_only" } });
    expect(await updateSavedDate(w.deps(ANA), rows[1].id, { baseVersion: null, remind: false })).toEqual({ status: 403, body: { error: "read_only" } });
    expect(await readSavedDate(w.deps(ANA), rows[1].id)).toMatchObject({ status: 200, body: { savedDate: { editable: false } } });
    expect((await updateSavedDate(w.deps(ANA), rows[3].id, { baseVersion: 1, title: "Still mine to change" })).status).toBe(200);
    // Deleting is always allowed, read-only or not, and saving a new one waits for room.
    expect(await deleteSavedDate(w.deps(ANA), rows[1].id)).toEqual({ status: 200, body: { ok: true } });
    expect(await createSavedDate(w.deps(ANA), saveDate())).toMatchObject({ status: 403, body: { error: "limit_reached", used: 4 } });
    expect(w.rows).toHaveLength(4);
  });

  it("ranks the editable few by the last change, then by id, the same for every reader", () => {
    const at = "2026-09-25T09:00:00.000Z";
    const keys = [
      { id: "b", updated_at: at },
      { id: "a", updated_at: at },
      { id: "c", updated_at: "2026-09-25T10:00:00.000Z" },
      { id: "d", updated_at: "2026-09-24T10:00:00.000Z" },
    ];
    expect([...editableWhenFree(keys)]).toEqual(["c", "b", "a"]);
    expect([...editableWhenFree([...keys].reverse())]).toEqual(["c", "b", "a"]);
  });

  it("shares both people's dates while the membership runs: each reads and edits the other's", async () => {
    const w = world();
    w.join(ANA, BEN);
    const anas = w.seed(ANA, { title: "Ana's" });
    const bens = w.seed(BEN, { title: "Ben's" });

    const forBen = await listSavedDates(w.deps(BEN));
    expect(forBen).toMatchObject({ member: true, quota: { used: 1, limit: null }, partner: { name: "Ana", initial: "A" } });
    expect(forBen.items.map((i) => [i.title, i.mine, i.owner.name, i.editable])).toEqual([
      ["Ben's", true, "Ben", true],
      ["Ana's", false, "Ana", true],
    ]);

    const edited = await updateSavedDate(w.deps(BEN), anas.id, { baseVersion: 1, data: plan(4) });
    expect(edited).toMatchObject({ status: 200, body: { savedDate: { mine: false, lastEditedBy: { name: "Ben" }, version: 2 } } });
    expect(await readSavedDate(w.deps(ANA), anas.id)).toMatchObject({ status: 200, body: { savedDate: { mine: true, lastEditedBy: { name: "Ben" }, stopsCount: 4 } } });
    expect(await readSavedDate(w.deps(ANA), bens.id)).toMatchObject({ status: 200, body: { savedDate: { mine: false, editable: true } } });

    // Only the owner deletes.
    expect(await deleteSavedDate(w.deps(BEN), anas.id)).toEqual({ status: 403, body: { error: "not_owner" } });
    expect(w.rows).toHaveLength(2);
  });

  it("stops sharing when the membership ends: each keeps their own, and the other's are simply not there", async () => {
    const w = world();
    w.join(ANA, BEN);
    const anas = w.seed(ANA);
    w.seed(BEN);
    w.end(ANA);
    expect((await listSavedDates(w.deps(BEN))).items.map((i) => i.mine)).toEqual([true]);
    expect(await readSavedDate(w.deps(BEN), anas.id)).toEqual({ status: 404, body: { error: "not_found" } });
    expect(await updateSavedDate(w.deps(BEN), anas.id, { baseVersion: 1, title: "x" })).toEqual({ status: 404, body: { error: "not_found" } });
    expect(await deleteSavedDate(w.deps(BEN), anas.id)).toEqual({ status: 404, body: { error: "not_found" } });
    expect((await listSavedDates(w.deps(ANA))).partner).toBeNull();
  });

  it("answers somebody else's date exactly like one that doesn't exist", async () => {
    const w = world();
    const anas = w.seed(ANA);
    expect(await readSavedDate(w.deps(CARA), anas.id)).toEqual({ status: 404, body: { error: "not_found" } });
    expect(await readSavedDate(w.deps(CARA), "00000000-0000-4000-9000-000000000999")).toEqual({ status: 404, body: { error: "not_found" } });
    expect(await deleteSavedDate(w.deps(CARA), anas.id)).toEqual({ status: 404, body: { error: "not_found" } });
  });

  it("names people by their name, or the first letter of their email, and never sends the email", async () => {
    expect(personOf({ name: "  Ana ", email: "ana@example.com" })).toEqual({ name: "Ana", initial: "A" });
    expect(personOf({ name: null, email: "cara@example.com" })).toEqual({ name: null, initial: "C" });
    expect(personOf(undefined)).toEqual({ name: null, initial: "?" });
    const w = world();
    w.join(CARA, ANA);
    w.seed(CARA);
    const list = await listSavedDates(w.deps(ANA));
    expect(JSON.stringify(list)).not.toContain("@example.com");
    expect(list.partner).toEqual({ name: null, initial: "C" });
  });
});

describe("the routes: sign-in, rate limits, and an outage said as one", () => {
  const request = (url: string, init: RequestInit & { quiet?: boolean } = {}) => {
    const { quiet, ...rest } = init;
    const headers = new Headers(rest.headers);
    if (quiet) headers.set(QUIET_HEADER, "1");
    return new NextRequest(new URL(url, "http://localhost"), { ...rest, headers } as ConstructorParameters<typeof NextRequest>[1]);
  };
  const params = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
  let w: ReturnType<typeof world>;

  beforeEach(() => {
    w = world();
    route.limits = [];
    route.allowed = true;
    route.session = { deps: w.deps(ANA) };
  });
  afterEach(() => {
    route.session = null;
  });

  it("limits each person: the list and one date 120 a minute, saving 30 an hour, editing 600 and deleting 120 an hour", async () => {
    const row = w.seed(ANA);
    await listRoute.GET(request("/api/saved-dates"));
    await listRoute.POST(request("/api/saved-dates", { method: "POST", body: JSON.stringify({ kind: "date", data: plan() }) }));
    await itemRoute.GET(request(`/api/saved-dates/${row.id}`), params(row.id));
    await itemRoute.PATCH(request(`/api/saved-dates/${row.id}`, { method: "PATCH", body: JSON.stringify({ remind: false }) }), params(row.id));
    await itemRoute.DELETE(request(`/api/saved-dates/${row.id}`, { method: "DELETE" }), params(row.id));
    expect(route.limits).toEqual([
      { key: `saved-dates:read:${ANA}`, limit: 120, windowSeconds: 60 },
      { key: `saved-dates:save:${ANA}`, limit: 30, windowSeconds: 3600 },
      { key: `saved-dates:read:${ANA}`, limit: 120, windowSeconds: 60 },
      { key: `saved-dates:edit:${ANA}`, limit: 600, windowSeconds: 3600 },
      { key: `saved-dates:delete:${ANA}`, limit: 120, windowSeconds: 3600 },
    ]);
  });

  it("answers 429 past a limit, before reading or writing anything", async () => {
    route.allowed = false;
    const res = await listRoute.POST(request("/api/saved-dates", { method: "POST", body: JSON.stringify({ kind: "date", data: plan() }) }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "rate_limited" });
    expect(w.inserts).toHaveLength(0);
  });

  it("answers 401 signed out, and never caches an answer", async () => {
    route.session = { status: 401, error: "unauthenticated" };
    const res = await listRoute.GET(request("/api/saved-dates"));
    expect(res.status).toBe(401);
    route.session = { deps: w.deps(ANA) };
    const ok = await listRoute.GET(request("/api/saved-dates?kind=trip"));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("cache-control")).toBe("private, no-store");
    expect((await listRoute.GET(request("/api/saved-dates?kind=gifts"))).status).toBe(400);
  });

  it("answers the 4th free save 403 limit_reached, and a bad body 400", async () => {
    for (let i = 0; i < 3; i += 1) w.seed(ANA);
    const res = await listRoute.POST(request("/api/saved-dates", { method: "POST", body: JSON.stringify({ kind: "date", data: plan() }) }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "limit_reached", limit: 3, used: 3 });
    expect((await listRoute.POST(request("/api/saved-dates", { method: "POST", body: "{not json" }))).status).toBe(400);
    expect(await (await listRoute.POST(request("/api/saved-dates", { method: "POST", body: JSON.stringify({ kind: "date", data: plan(0) }) }))).json()).toEqual({ error: "empty_plan" });
  });

  it("says an outage as 503 to the app, and quietly as 200 { unavailable } to the website's own requests", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const broken = { ...w.deps(ANA), store: { ...w.deps(ANA).store, listVisible: async () => Promise.reject(new SavedStoreError("list: relation \"public.saved_dates\" does not exist")) } };
    route.session = { deps: broken };
    const loud = await listRoute.GET(request("/api/saved-dates"));
    expect(loud.status).toBe(503);
    expect(await loud.json()).toEqual({ error: "not_configured" });
    const quiet = await listRoute.GET(request("/api/saved-dates", { quiet: true }));
    expect(quiet.status).toBe(200);
    expect(await quiet.json()).toEqual({ unavailable: true });
    expect(error).toHaveBeenCalledWith(expect.stringContaining("does not exist"));

    // Membership that can't be read is an outage too, never "free".
    route.session = { deps: { ...w.deps(ANA), couple: { isMember: () => Promise.reject(new CoupleUnavailable("is_member: missing")), partnerOf: async () => null } } };
    expect((await listRoute.POST(request("/api/saved-dates", { method: "POST", body: JSON.stringify({ kind: "date", data: plan() }), quiet: true }))).status).toBe(200);
    expect((await listRoute.POST(request("/api/saved-dates", { method: "POST", body: JSON.stringify({ kind: "date", data: plan() }) }))).status).toBe(503);

    // Without Supabase at all.
    route.session = { status: 503, error: "not_configured" };
    expect(await (await itemRoute.GET(request(`/api/saved-dates/${ANA}`, { quiet: true }), params(ANA))).json()).toEqual({ unavailable: true });
    expect((await itemRoute.GET(request(`/api/saved-dates/${ANA}`), params(ANA))).status).toBe(503);
    error.mockRestore();
  });

  it("answers a malformed id exactly like a date that isn't there", async () => {
    const res = await itemRoute.GET(request("/api/saved-dates/not-a-uuid"), params("not-a-uuid"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });
});

describe("the reminder the day before (members only)", () => {
  type Row = Awaited<ReturnType<import("@/lib/saved-dates/reminders").ReminderStore["due"]>>[number];
  const row = (id: string, owner: string, over: Partial<Row> = {}): Row => ({ id, owner_user_id: owner, kind: "date", title: "Our evening", day: "2026-09-26", data: plan(2) as unknown as Row["data"], reminded_for: null, ...over });

  function run(rows: Row[], options: { members?: string[]; partners?: Record<string, string>; failFor?: string[]; budget?: number; batch?: number } = {}) {
    const claimed: string[] = [];
    const released: string[] = [];
    const sent: { to: string; locale: string; title: string | null }[] = [];
    let asked: { day: string; limit: number } | null = null;
    let left = options.budget ?? Infinity;
    const people: Record<string, { email: string; locale: "en" | "es" }> = { [ANA]: { email: "ana@example.com", locale: "en" }, [BEN]: { email: "ben@example.com", locale: "es" }, [CARA]: { email: "cara@example.com", locale: "en" } };
    return {
      claimed,
      released,
      sent,
      asked: () => asked,
      result: sendDateReminders({
        store: {
          due: async (day, limit) => {
            asked = { day, limit };
            return rows.slice(0, limit);
          },
          isMember: async (id) => (options.members ?? [ANA, BEN]).includes(id),
          partnerOf: async (id) => options.partners?.[id] ?? null,
          claim: async (id) => {
            claimed.push(id);
            return true;
          },
          release: async (id) => void released.push(id),
          people: async (ids) => new Map(ids.filter((id) => people[id]).map((id) => [id, people[id]])),
        },
        send: async (reminder) => {
          sent.push({ to: reminder.to, locale: reminder.locale, title: reminder.title });
          return !(options.failFor ?? []).includes(reminder.to);
        },
        links: async (r, locale) => ({ openUrl: `https://tryethos.io/${locale}/plan#s=${r.id}`, offUrl: "https://tryethos.io/off" }),
        now: new Date("2026-09-25T07:00:00Z"),
        inTime: () => left-- > 0,
        pause: async () => undefined,
        ...(options.batch !== undefined && { batch: options.batch }),
      }),
    };
  }

  it("asks for tomorrow's rows, members' only, and never more than one batch", async () => {
    const r = run([], { batch: 10_000 });
    await r.result;
    expect(r.asked()).toEqual({ day: "2026-09-26", limit: REMINDER_BATCH });
    expect(tomorrowUtc(new Date("2026-12-31T23:59:00Z"))).toBe("2027-01-01");
  });

  it("claims each date, then emails the owner and the partner, each in their own language", async () => {
    const r = run([row("r1", ANA)], { partners: { [ANA]: BEN } });
    expect(await r.result).toEqual({ sent: 1, failed: 0, deferred: 0, skipped: 0 });
    expect(r.claimed).toEqual(["r1"]);
    expect(r.sent).toEqual([
      { to: "ana@example.com", locale: "en", title: "Our evening" },
      { to: "ben@example.com", locale: "es", title: "Our evening" },
    ]);
  });

  it("sends nothing for a membership that ended since the query, and gives a claim back when every email failed", async () => {
    const r = run([row("r1", CARA), row("r2", ANA)], { failFor: ["ana@example.com"] });
    expect(await r.result).toEqual({ sent: 0, failed: 1, deferred: 0, skipped: 1 });
    expect(r.claimed).toEqual(["r2"]);
    expect(r.released).toEqual(["r2"]);
  });

  it("stops starting new dates when the cron's time is up", async () => {
    const r = run([row("r1", ANA), row("r2", ANA), row("r3", ANA)], { budget: 1 });
    expect(await r.result).toEqual({ sent: 1, failed: 0, deferred: 2, skipped: 0 });
  });

  it("asks the database for members' rows only (0015's saved_dates_due), so free accounts can't fill the batch", async () => {
    const calls: { fn: string; args: unknown }[] = [];
    const due = [row("m1", ANA), row("m2", BEN)].map((r) => ({ ...r, city: null, stops_count: 2, remind: true, version: 1, last_edited_by: null, created_at: "", updated_at: "" }));
    const db = {
      rpc: async (fn: string, args: unknown) => {
        calls.push({ fn, args });
        return { data: due, error: null };
      },
      from: () => {
        throw new Error("the cron must not page through saved_dates itself");
      },
    };
    const store = supabaseReminderStore(db as never);
    expect((await store.due("2026-09-26", 200)).map((r) => r.id)).toEqual(["m1", "m2"]);
    expect(calls).toEqual([{ fn: "saved_dates_due", args: { p_day: "2026-09-26", p_limit: 200 } }]);
    const failing = supabaseReminderStore({ rpc: async () => ({ data: null, error: { message: "function public.saved_dates_due does not exist" } }) } as never);
    await expect(failing.due("2026-09-26", 200)).rejects.toThrow(/saved_dates_due does not exist/);
  });
});
