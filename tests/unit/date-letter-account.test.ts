/**
 * What the date letter adds to an account's own rights (PLAN-letter step 9, A1-A4): the export carries
 * the sign-up at the account's own address, and deleting the account deletes that row. Neither can
 * change anything for an account without a row, or before migration 0027.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeDb } from "./helpers/fake-db";

const state = vi.hoisted(() => ({ client: null as unknown, admin: null as unknown, user: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: async () => state.client, bearerToken: async () => null }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.admin }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/group/flag", () => ({ groupGiftsEnabled: () => false }));
vi.mock("@/lib/gift/storage-cleanup", () => ({ deleteGiftStorage: async () => ({ deleted: 0, errors: [] }) }));

const exportRoute = await import("@/app/api/account/export/route");
const { deleteAccountData } = await import("@/lib/auth/delete-account");

const NOW = Date.parse("2027-03-11T10:00:00Z");
const USER = "11111111-1111-4111-8111-111111111111";
const row = (id: string, email: string) => ({ id, email, locale: "en", wording: "Email me one date idea every Thursday. I can stop any time.", source_path: "/dates", asked_at: "2027-03-01T10:00:00.000Z", confirm_sent_at: null, confirmed_at: "2027-03-01T10:05:00.000Z", last_week: 2880, held_on: null, stopped_at: null });

let fake: FakeDb;
let deletedUsers: string[];
function seed(rows: Record<string, unknown>[] | null, profileEmail: string | null = "Tom@Example.test", options: { deleteFails?: boolean; authEmail?: string } = {}) {
  fake = new FakeDb({ profiles: [{ id: USER, email: profileEmail }], ...(rows ? { date_letter: rows } : {}) }, NOW, rows ? {} : { missingTables: ["date_letter"] });
  if (options.deleteFails) fake.failNext("date_letter", "delete");
  deletedUsers = [];
  const signIn = options.authEmail ?? profileEmail;
  const client = Object.assign(fake.db, {
    auth: {
      admin: {
        deleteUser: async (id: string) => (deletedUsers.push(id), { error: null }),
        getUserById: async (id: string) => ({ data: { user: id === USER ? { id, email: signIn } : null }, error: null }),
      },
    },
  });
  state.client = client;
  state.admin = client;
  state.user = { id: USER, email: profileEmail, app_metadata: {} };
}
const exported = async () => JSON.parse(await (await exportRoute.GET()).text()) as Record<string, unknown>;

beforeEach(() => seed([]));

describe("the date letter and the account", () => {
  it("A1 the export carries the sign-up only when a row has the account's address", async () => {
    seed([row("a1111111-1111-4111-8111-111111111111", "tom@example.test"), row("b2222222-2222-4222-8222-222222222222", "kim@example.test")]);
    const body = await exported();
    // The fake database answers every column of a plain select list; the route names its eight.
    expect(body.dateLetter).toHaveLength(1);
    expect((body.dateLetter as unknown[])[0]).toMatchObject({ email: "tom@example.test", locale: "en", wording: row("x", "x").wording, source_path: "/dates", asked_at: "2027-03-01T10:00:00.000Z", confirmed_at: "2027-03-01T10:05:00.000Z", last_week: 2880, stopped_at: null });
    expect(JSON.stringify(body)).not.toContain("kim@example.test");
    seed([row("b2222222-2222-4222-8222-222222222222", "kim@example.test")]);
    expect(Object.keys(await exported())).not.toContain("dateLetter");
  });

  it("A2 with the table missing the export is what it was without this job", async () => {
    seed(null);
    const without = await exported();
    expect(Object.keys(without)).not.toContain("dateLetter");
    seed([]);
    const empty = await exported();
    delete (without as { exportedAt?: string }).exportedAt;
    delete (empty as { exportedAt?: string }).exportedAt;
    expect(empty).toEqual(without);
  });

  it("A3 deleting an account deletes the row at its address, in any letter case, and no other row", async () => {
    seed([row("a1111111-1111-4111-8111-111111111111", "tom@example.test"), row("b2222222-2222-4222-8222-222222222222", "kim@example.test")], "  TOM@example.TEST ");
    expect(await deleteAccountData(state.admin as never, USER)).toEqual({ ok: true });
    expect(deletedUsers).toEqual([USER]);
    expect(fake.rows("date_letter").map((r) => r.email)).toEqual(["kim@example.test"]);
  });

  it("A5 a profile without the address, or with an older one: the sign-in's own address is used too (letter-C20)", async () => {
    seed([row("a1111111-1111-4111-8111-111111111111", "tom@example.test"), row("b2222222-2222-4222-8222-222222222222", "kim@example.test")], null, { authEmail: "Tom@Example.test" });
    expect(await deleteAccountData(state.admin as never, USER)).toEqual({ ok: true });
    expect(fake.rows("date_letter").map((r) => r.email)).toEqual(["kim@example.test"]);
    seed([row("a1111111-1111-4111-8111-111111111111", "tom@example.test"), row("b2222222-2222-4222-8222-222222222222", "old@example.test"), row("c3333333-3333-4333-8333-333333333333", "kim@example.test")], "old@example.test", { authEmail: "tom@example.test" });
    expect(await deleteAccountData(state.admin as never, USER)).toEqual({ ok: true });
    expect(fake.rows("date_letter").map((r) => r.email)).toEqual(["kim@example.test"]);
  });

  it("A4 with the table missing, or the delete failing, the account is still deleted", async () => {
    seed(null);
    expect(await deleteAccountData(state.admin as never, USER)).toEqual({ ok: true });
    expect(deletedUsers).toEqual([USER]);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    seed([row("a1111111-1111-4111-8111-111111111111", "tom@example.test")], "tom@example.test", { deleteFails: true });
    expect(await deleteAccountData(state.admin as never, USER)).toEqual({ ok: true });
    expect(deletedUsers).toEqual([USER]);
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});
