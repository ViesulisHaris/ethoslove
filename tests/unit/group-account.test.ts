/**
 * What a group card adds to an account's own rights: its export (the groups this person started
 * and the notes they were sent, never a contributor's address or anything that opens a link), and
 * deletion (the photos still waiting at a group's link go with the gift or the account). All of it
 * only while group cards are switched on; switched off, none of these paths reads a group table.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/commerce/db";
import { FakeDb } from "./helpers/fake-db";

const state = vi.hoisted(() => ({ client: null as unknown, admin: null as unknown, user: null as unknown, on: true, giftFilesDeleted: [] as string[] }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: async () => state.client, bearerToken: async () => null }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.admin }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/group/flag", () => ({ groupGiftsEnabled: () => state.on }));
vi.mock("@/lib/email/notify", () => ({ notifyPublished: async () => {} }));
vi.mock("@/lib/gift/storage-cleanup", () => ({ deleteGiftStorage: async (giftId: string) => (state.giftFilesDeleted.push(giftId), { deleted: 0, errors: [] }) }));

const exportRoute = await import("@/app/api/account/export/route");
const { deleteGift } = await import("@/app/actions/gift");
const { deleteAccountData } = await import("@/lib/auth/delete-account");
const { forgetGroupPhotos } = await import("@/lib/group/store");

const NOW = Date.parse("2026-12-01T10:00:00Z");
const at = (ms: number) => new Date(ms).toISOString();
const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const GIFT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const GIFT_2 = "aaaaaaaa-aaaa-4aaa-8aaa-bbbbbbbbbbbb";
const GROUP = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const GROUP_2 = "6f1c2a3b-4d5e-4f60-8a7b-000000000002";
const THEIRS = "6f1c2a3b-4d5e-4f60-8a7b-000000000003";

const group = (id: string, giftId: string, userId = USER) => ({
  id,
  gift_id: giftId,
  user_id: userId,
  template_slug: "group-reference",
  locale: "en",
  from_name: "Tom",
  for_name: "Nora",
  prompt: "One line each",
  token_sha256: "a".repeat(64),
  token_version: 3,
  report_ref: "abcd1234",
  max_entries: 25,
  note_max: 140,
  takes_photos: true,
  created_at: at(NOW - 86_400_000),
  closes_at: at(NOW + 29 * 86_400_000),
  closed_at: null,
  sent_at: null,
  nudged_at: at(NOW),
});
const note = (n: number, groupId: string, over: Record<string, unknown> = {}) => ({
  id: `cccccccc-cccc-4ccc-8ccc-00000000000${n}`,
  group_id: groupId,
  status: "pending",
  name: `Person ${n}`,
  note: `Note ${n}`,
  photo_path: `${groupId}/cccccccc-cccc-4ccc-8ccc-00000000000${n}.webp`,
  item_key: null,
  email: `p${n}@example.test`,
  email_sha256: "e".repeat(64),
  email_consent: "We'll email you once.",
  email_consent_at: at(NOW),
  email_confirmed_at: null,
  agreed: "I'm 16 or older.",
  withdraw_sha256: "f".repeat(64),
  report_ref: "aaaaaaaa",
  created_at: at(NOW),
  decided_at: null,
  scrubbed_at: null,
  ...over,
});

let fake: FakeDb;
let files: Record<string, string[]>;
let removed: string[];
let deletedUsers: string[];
function seed(options: { missingTables?: string[] } = {}) {
  fake = new FakeDb(
    {
      gifts: [
        { id: GIFT, short_id: "card234ab", user_id: USER, template_slug: "group-reference", status: "draft", data: {} },
        { id: GIFT_2, short_id: "card234cd", user_id: USER, template_slug: "group-reference", status: "draft", data: {} },
      ],
      ...(options.missingTables ? {} : { gift_groups: [group(GROUP, GIFT), group(GROUP_2, GIFT_2), group(THEIRS, "aaaaaaaa-aaaa-4aaa-8aaa-cccccccccccc", OTHER)], gift_contributions: [note(1, GROUP), note(2, GROUP, { status: "approved", item_key: "abcdefghij" }), note(3, THEIRS)] }),
    },
    NOW,
    options,
  );
  files = { [GROUP]: ["one.webp", "two.webp"], [GROUP_2]: ["three.webp"], [THEIRS]: ["theirs.webp"] };
  removed = [];
  deletedUsers = [];
  const client = Object.assign(fake.db, {
    storage: {
      from: () => ({
        list: async (folder: string) => ({ data: (files[folder] ?? []).map((name) => ({ name })), error: null }),
        remove: async (names: string[]) => {
          removed.push(...names);
          return { data: null, error: null };
        },
      }),
    },
    auth: { admin: { deleteUser: async (id: string) => (deletedUsers.push(id), { error: null }) } },
  });
  state.client = client;
  state.admin = client;
  state.user = { id: USER, email: "tom@example.test", app_metadata: {} };
}
const groupReads = () => fake.calls.filter((call) => call.table === "gift_groups" || call.table === "gift_contributions");

beforeEach(() => {
  state.on = true;
  state.giftFilesDeleted = [];
  seed();
});

describe("the account's export", () => {
  const exported = async () => JSON.parse(await (await exportRoute.GET()).text()) as Record<string, unknown>;

  it("lists the groups this person started and the notes they were sent", async () => {
    const body = await exported();
    expect((body.giftGroups as { id: string }[]).map((row) => row.id)).toEqual([GROUP, GROUP_2]);
    expect(body.groupContributions).toEqual([
      { id: note(1, GROUP).id, group_id: GROUP, status: "pending", name: "Person 1", note: "Note 1", created_at: at(NOW), decided_at: null, scrubbed_at: null },
      { id: note(2, GROUP).id, group_id: GROUP, status: "approved", name: "Person 2", note: "Note 2", created_at: at(NOW), decided_at: null, scrubbed_at: null },
    ]);
  });

  it("never a contributor's address, what they agreed to, or anything that could open a link or take a note back", async () => {
    const body = await exported();
    const text = JSON.stringify([body.giftGroups, body.groupContributions]);
    for (const secret of ["example.test", "e".repeat(64), "f".repeat(64), "a".repeat(64), "token_version", "withdraw", "email", "report_ref", ".webp", "Person 3"]) expect(text, secret).not.toContain(secret);
  });

  it("switched off, it is the export it always was: no group keys, and no group table read", async () => {
    state.on = false;
    const body = await exported();
    expect(Object.keys(body)).not.toContain("giftGroups");
    expect(Object.keys(body)).not.toContain("groupContributions");
    expect(groupReads()).toEqual([]);
  });

  it("before migration 0023 it still exports, with the two lists empty", async () => {
    seed({ missingTables: ["gift_groups", "gift_contributions"] });
    const res = await exportRoute.GET();
    expect(res.status).toBe(200);
    expect(JSON.parse(await res.text())).toMatchObject({ giftGroups: [], groupContributions: [], user: { id: USER } });
  });
});

describe("deleting a gift that has a group", () => {
  it("removes the photos waiting at its link, then the gift", async () => {
    expect(await deleteGift(GIFT)).toEqual({ ok: true, data: null });
    expect(removed.sort()).toEqual([`${GROUP}/one.webp`, `${GROUP}/two.webp`]);
    expect(fake.rows("gifts").map((row) => row.id)).toEqual([GIFT_2]);
    expect(state.giftFilesDeleted).toEqual([GIFT]);
  });

  it("switched off, reads no group table and removes nothing of a group's", async () => {
    state.on = false;
    expect((await deleteGift(GIFT)).ok).toBe(true);
    expect(groupReads()).toEqual([]);
    expect(removed).toEqual([]);
  });

  it("is never stopped by the group: no tables yet, or storage failing", async () => {
    seed({ missingTables: ["gift_groups", "gift_contributions"] });
    expect((await deleteGift(GIFT)).ok).toBe(true);
    seed();
    (state.admin as { storage: unknown }).storage = { from: () => ({ list: async () => Promise.reject(new Error("storage down")) }) };
    expect((await deleteGift(GIFT)).ok).toBe(true);
    expect(fake.rows("gifts").map((row) => row.id)).toEqual([GIFT_2]);
  });
});

describe("deleting an account that has groups", () => {
  it("removes the waiting photos of every group it started, and nobody else's, before the user goes", async () => {
    expect(await deleteAccountData(state.admin as never, USER)).toEqual({ ok: true });
    expect(removed.sort()).toEqual([`${GROUP_2}/three.webp`, `${GROUP}/one.webp`, `${GROUP}/two.webp`].sort());
    expect(deletedUsers).toEqual([USER]);
  });

  it("switched off, it is the deletion it always was", async () => {
    state.on = false;
    expect(await deleteAccountData(state.admin as never, USER)).toEqual({ ok: true });
    expect(groupReads()).toEqual([]);
    expect(removed).toEqual([]);
    expect(deletedUsers).toEqual([USER]);
  });

  it("goes through before migration 0023", async () => {
    seed({ missingTables: ["gift_groups", "gift_contributions"] });
    expect(await deleteAccountData(state.admin as never, USER)).toEqual({ ok: true });
    expect(deletedUsers).toEqual([USER]);
  });
});

describe("forgetting a group's photos", () => {
  it("does nothing without the service role, and never throws", async () => {
    await expect(forgetGroupPhotos({ giftId: GIFT }, null)).resolves.toBeUndefined();
    await expect(forgetGroupPhotos({ userId: USER }, { from: () => { throw new Error("down"); } } as unknown as Db)).resolves.toBeUndefined();
  });
});
