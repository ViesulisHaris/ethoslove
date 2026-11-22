/**
 * The sender's side of a group card, route by route, against the in-memory database: making the
 * link, reading the group, the moderation step (add, turn down, remove, undo), the link's controls,
 * and deleting it. Storage is stood in for (the in-memory database has none); the photo re-encoding
 * has its own test with real bytes (group-photo.test.ts).
 */
import { NextRequest } from "next/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { giftContributionSchema } from "@/lib/gift/schema";
import { groupToken, sha256Hex } from "@/lib/group/token";
import { manifest as letter } from "@/templates/the-letter/manifest";
import { manifest as reference } from "@/templates/_group-reference/manifest";
import { FakeDb } from "./helpers/fake-db";

const state = vi.hoisted(() => ({
  db: null as unknown,
  on: true,
  limited: false,
  user: null as { id: string } | null,
  copies: [] as { from: string; giftId: string; key: string }[],
  copyFails: false,
  removedFolders: [] as string[],
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => !state.limited }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/group/flag", () => ({ groupGiftsEnabled: () => state.on }));
vi.mock("@/templates/manifests", async (original) => {
  const real = await original<typeof import("@/templates/manifests")>();
  // The reference template is not resolvable outside `next dev`; these routes need one group template.
  return { ...real, getManifest: (slug: string) => (slug === "group-reference" ? reference : real.getManifest(slug)) };
});
vi.mock("@/lib/group/photo-store", () => ({
  CONTRIBUTIONS_BUCKET: "contributions",
  pendingPhotoPath: (groupId: string, entryId: string) => `${groupId}/${entryId}.webp`,
  giftPhotoPath: (giftId: string, key: string) => `gifts/${giftId}/c${key}.webp`,
  storePendingPhoto: async () => true,
  removePendingPhotos: async () => {},
  signPendingPhotos: async (_admin: unknown, paths: string[]) => Object.fromEntries(paths.map((path) => [path, `https://storage.test/signed/${path}`])),
  copyPhotoToGift: async (_admin: unknown, from: string, giftId: string, key: string) => {
    if (state.copyFails) return null;
    state.copies.push({ from, giftId, key });
    return { path: `gifts/${giftId}/c${key}.webp`, previewUrl: `https://storage.test/gifts/${giftId}/c${key}.webp?sig` };
  },
  deleteGroupStorage: async (_admin: unknown, groupId: string) => void state.removedFolders.push(groupId),
}));

const create = await import("@/app/api/group/route");
const find = await import("@/app/api/group/find/route");
const one = await import("@/app/api/group/[id]/route");
const entries = await import("@/app/api/group/[id]/entries/[entryId]/route");

const NOW = Date.parse("2026-12-01T10:00:00Z");
const SECRET = "group-test-secret";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const ME = "11111111-1111-4111-8111-111111111111";
const SOMEONE_ELSE = "22222222-2222-4222-8222-222222222222";
const GIFT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LETTER_GIFT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const LIVE_GIFT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const THEIR_GIFT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const entryId = (n: number) => `eeeeeeee-eeee-4eee-8eee-${String(n).padStart(12, "0")}`;

const gift = (id: string, over: Record<string, unknown> = {}) => ({ id, short_id: `s${id.slice(0, 8)}`, user_id: ME, template_slug: "group-reference", status: "draft", locale: "en", data: {}, ...over });

let fake: FakeDb;
beforeAll(() => {
  process.env.VIEWER_HASH_SECRET = SECRET;
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  fake = new FakeDb(
    {
      gifts: [gift(GIFT), gift(LETTER_GIFT, { template_slug: letter.slug }), gift(LIVE_GIFT, { status: "live" }), gift(THEIR_GIFT, { user_id: SOMEONE_ELSE, locale: "es" })],
      gift_groups: [],
      gift_contributions: [],
    },
    NOW,
  );
  state.db = fake.db;
  state.on = true;
  state.limited = false;
  state.user = { id: ME };
  state.copies = [];
  state.copyFails = false;
  state.removedFolders = [];
  return () => vi.useRealTimers();
});

const post = (url: string, body: unknown, method = "POST") => new NextRequest(`https://ethos.test${url}`, { method, body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const make = (body: Record<string, unknown> = {}) => create.POST(post("/api/group", { giftId: GIFT, fromName: "Tom", forName: "Nora", ...body }));
const read = (giftId = GIFT) => find.POST(post("/api/group/find", { giftId }));
const patch = (id: string, body: unknown) => one.PATCH(post(`/api/group/${id}`, body, "PATCH"), { params: Promise.resolve({ id }) });
const remove = (id: string) => one.DELETE(new NextRequest(`https://ethos.test/api/group/${id}`, { method: "DELETE" }), { params: Promise.resolve({ id }) });
const decide = (id: string, entry: string, body: unknown) => entries.POST(post(`/api/group/${id}/entries/${entry}`, body), { params: Promise.resolve({ id, entryId: entry }) });

type Group = { id: string; url: string; entries: Record<string, unknown>[] } & Record<string, unknown>;
async function made(body: Record<string, unknown> = {}): Promise<Group> {
  const res = await make(body);
  expect(res.status).toBe(200);
  return ((await res.json()) as { group: Group }).group;
}
/** A note as the contribute route would have stored it. */
function seed(groupId: string, n: number, over: Record<string, unknown> = {}) {
  const row = {
    id: entryId(n),
    group_id: groupId,
    status: "pending",
    name: `Guest ${n}`,
    note: `Note number ${n}`,
    photo_path: null,
    photo_width: null,
    photo_height: null,
    item_key: null,
    email: null,
    email_sha256: null,
    email_consent: null,
    email_consent_at: null,
    confirm_sent_at: null,
    email_confirmed_at: null,
    emailed_at: null,
    agreed: "I'm 16 or older.",
    withdraw_sha256: null,
    report_ref: `ref0000${n % 10}`,
    created_at: new Date(NOW + n * 1000).toISOString(),
    decided_at: null,
    scrubbed_at: null,
    ...over,
  };
  fake.tables.gift_contributions.push(row);
  return row;
}
const row = (n: number) => fake.rows("gift_contributions").find((r) => r.id === entryId(n))!;

describe("the switch, and who may ask", () => {
  it("every sender route is a 404 while the switch is off, and nothing is read", async () => {
    state.on = false;
    const id = "ffffffff-ffff-4fff-8fff-ffffffffffff";
    for (const res of [await make(), await read(), await patch(id, { closed: true }), await remove(id), await decide(id, entryId(1), { action: "reject" })]) {
      expect(res.status).toBe(404);
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
    expect(fake.calls).toEqual([]);
  });

  it("needs a signed-in account", async () => {
    state.user = null;
    expect((await make()).status).toBe(401);
    expect((await read()).status).toBe(401);
    expect(fake.calls).toEqual([]);
  });

  it("answers 503 and touches nothing else when migration 0023 is not applied", async () => {
    fake = new FakeDb({ gifts: [gift(GIFT)] }, NOW, { missingTables: ["gift_groups", "gift_contributions"] });
    state.db = fake.db;
    for (const res of [await make(), await read(), await patch("ffffffff-ffff-4fff-8fff-ffffffffffff", { closed: true })]) {
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "unavailable" });
    }
    // The gift itself is untouched.
    expect(fake.rows("gifts")).toEqual([gift(GIFT)]);
  });

  it("slows an account that asks too often", async () => {
    state.limited = true;
    expect((await make()).status).toBe(429);
  });
});

describe("making the link", () => {
  it("copies the template's limits and the draft's language, and stores only the token's hash", async () => {
    const group = await made({ prompt: "  One line about her, please " });
    expect(group).toMatchObject({ fromName: "Tom", forName: "Nora", prompt: "One line about her, please", max: 25, noteMax: 140, takesPhotos: true, closedAt: null, sentAt: null, entries: [] });
    // The site's own origin (tryethos.io live, localhost here), then /c/ and the token: no locale, no gift.
    expect(group.url).toMatch(/^https?:\/\/[^/]+\/c\/[A-Za-z0-9_-]{22}$/);
    expect(new Date(group.closesAt as string).getTime()).toBeGreaterThan(NOW);
    const [stored] = fake.rows("gift_groups");
    const token = group.url.split("/c/")[1];
    expect(stored).toMatchObject({ gift_id: GIFT, user_id: ME, template_slug: "group-reference", locale: "en", token_version: 1, max_entries: 25, note_max: 140, takes_photos: true });
    expect(token).toBe(groupToken(group.id, 1, SECRET));
    expect(stored.token_sha256).toBe(sha256Hex(token));
    expect(JSON.stringify(stored)).not.toContain(token);
    expect(stored.report_ref).toMatch(/^[a-z0-9]{8}$/);
    // The link names no gift.
    expect(group.url).not.toContain(GIFT);
  });

  it("asking again returns the same group: one link per gift", async () => {
    const first = await made();
    const second = await made({ fromName: "Someone else", forName: "Other" });
    expect(second.id).toBe(first.id);
    expect(second.url).toBe(first.url);
    expect(second.fromName).toBe("Tom");
    expect(fake.rows("gift_groups")).toHaveLength(1);
  });

  it("only for the sender's own draft, on a template made for group cards", async () => {
    expect((await make({ giftId: THEIR_GIFT })).status).toBe(404);
    expect((await make({ giftId: "99999999-9999-4999-8999-999999999999" })).status).toBe(404);
    const wrong = await make({ giftId: LETTER_GIFT });
    expect([wrong.status, await wrong.json()]).toEqual([400, { error: "not_group_template" }]);
    const live = await make({ giftId: LIVE_GIFT });
    expect([live.status, await live.json()]).toEqual([409, { error: "not_draft" }]);
    expect(fake.rows("gift_groups")).toEqual([]);
  });

  it("refuses names it can't put on the page", async () => {
    for (const body of [{ fromName: "" }, { forName: "   " }, { fromName: "x".repeat(41) }, { prompt: "x".repeat(141) }, { fromName: "www.evil.example" }, { giftId: "not-a-uuid" }]) expect((await make(body)).status, JSON.stringify(body)).toBe(400);
  });

  it("is found again by the gift, by its own account only", async () => {
    const group = await made();
    expect(((await (await read()).json()) as { group: Group }).group.id).toBe(group.id);
    expect(await (await read(LETTER_GIFT)).json()).toEqual({ group: null });
    state.user = { id: SOMEONE_ELSE };
    expect(await (await read()).json()).toEqual({ group: null });
  });
});

describe("the moderation step", () => {
  it("shows the sender each waiting note, with its photo signed, and never an address", async () => {
    const group = await made();
    seed(group.id, 1, { photo_path: `${group.id}/${entryId(1)}.webp`, photo_width: 1200, photo_height: 900, email: "mum@example.test", email_sha256: "a".repeat(64), email_consent: "yes" });
    seed(group.id, 2);
    const body = await (await read()).text();
    const view = (JSON.parse(body) as { group: Group }).group;
    expect(view.entries).toEqual([
      expect.objectContaining({ id: entryId(1), status: "pending", name: "Guest 1", note: "Note number 1", wantsEmail: true, key: null, photo: { url: `https://storage.test/signed/${group.id}/${entryId(1)}.webp`, width: 1200, height: 900 } }),
      expect.objectContaining({ id: entryId(2), status: "pending", wantsEmail: false, photo: null }),
    ]);
    expect(body).not.toContain("mum@example.test");
    expect(body).not.toContain("a".repeat(64));
    expect(body).not.toMatch(/email(?!")/i);
  });

  it("adding a note gives it a key and returns the item the gift will hold; asking again returns the same", async () => {
    const group = await made();
    seed(group.id, 1);
    const res = await decide(group.id, entryId(1), { action: "approve" });
    expect(res.status).toBe(200);
    const { item } = (await res.json()) as { item: Record<string, unknown> };
    expect(item).toEqual({ key: expect.stringMatching(/^[a-z0-9]{10}$/), name: "Guest 1", note: "Note number 1" });
    expect(giftContributionSchema.safeParse(item).success).toBe(true);
    expect(row(1)).toMatchObject({ status: "approved", item_key: item.key, decided_at: new Date(NOW).toISOString() });

    const again = (await (await decide(group.id, entryId(1), { action: "approve" })).json()) as { item: Record<string, unknown> };
    expect(again.item).toEqual(item);
    expect(row(1).item_key).toBe(item.key);
  });

  it("with its photo: the file is copied into the gift's own folder under the note's key", async () => {
    const group = await made();
    const waiting = `${group.id}/${entryId(1)}.webp`;
    seed(group.id, 1, { photo_path: waiting, photo_width: 1200, photo_height: 900 });
    const body = (await (await decide(group.id, entryId(1), { action: "approve", withPhoto: true })).json()) as { item: { key: string; photo: { url: string } }; previewUrl: string };
    expect(body.item.photo).toEqual({ url: `gifts/${GIFT}/c${body.item.key}.webp`, width: 1200, height: 900 });
    expect(body.previewUrl).toContain(`/gifts/${GIFT}/c${body.item.key}.webp`);
    expect(state.copies).toEqual([{ from: waiting, giftId: GIFT, key: body.item.key }]);
    expect(giftContributionSchema.safeParse(body.item).success).toBe(true);
  });

  it("without the photo when the sender leaves it out, and the note still goes in", async () => {
    const group = await made();
    seed(group.id, 1, { photo_path: `${group.id}/${entryId(1)}.webp`, photo_width: 1200, photo_height: 900 });
    const body = (await (await decide(group.id, entryId(1), { action: "approve", withPhoto: false })).json()) as { item: Record<string, unknown> };
    expect(body.item.photo).toBeUndefined();
    expect(state.copies).toEqual([]);
  });

  it("put back into a gift that lost it, a note comes back the way the sender added it: without its photo, or with it", async () => {
    const group = await made();
    for (const n of [1, 2]) seed(group.id, n, { photo_path: `${group.id}/${entryId(n)}.webp`, photo_width: 1200, photo_height: 900 });
    await decide(group.id, entryId(1), { action: "approve", withPhoto: false });
    await decide(group.id, entryId(2), { action: "approve", withPhoto: true });
    expect([row(1).with_photo, row(2).with_photo]).toEqual([false, true]);
    state.copies = [];
    // The editor's panel asks again for both, and (as it does) asks for the photo whenever there is one.
    const without = (await (await decide(group.id, entryId(1), { action: "approve", withPhoto: true })).json()) as { item: Record<string, unknown>; previewUrl?: string };
    expect(without.item.photo).toBeUndefined();
    expect(without.previewUrl).toBeUndefined();
    const withIt = (await (await decide(group.id, entryId(2), { action: "approve", withPhoto: false })).json()) as { item: { key: string; photo?: { url: string } } };
    expect(withIt.item.photo?.url).toBe(`gifts/${GIFT}/c${withIt.item.key}.webp`);
    expect(state.copies).toEqual([{ from: `${group.id}/${entryId(2)}.webp`, giftId: GIFT, key: withIt.item.key }]);
    // Undo forgets the choice: the next yes is a new one.
    await decide(group.id, entryId(1), { action: "remove" });
    await decide(group.id, entryId(1), { action: "restore" });
    expect(row(1).with_photo).toBeNull();
  });

  it("a photo that can't be copied leaves the note waiting, not half added", async () => {
    const group = await made();
    seed(group.id, 1, { photo_path: `${group.id}/${entryId(1)}.webp`, photo_width: 1200, photo_height: 900 });
    state.copyFails = true;
    const res = await decide(group.id, entryId(1), { action: "approve", withPhoto: true });
    expect([res.status, await res.json()]).toEqual([502, { error: "photo_failed" }]);
    expect(row(1)).toMatchObject({ status: "pending", item_key: null });
  });

  it("stops at the template's number: the 26th is a 409, and the 25 stay", async () => {
    const group = await made();
    for (let n = 1; n <= 25; n++) seed(group.id, n, { status: "approved", item_key: `key${String(n).padStart(7, "0")}` });
    seed(group.id, 26);
    const res = await decide(group.id, entryId(26), { action: "approve" });
    expect([res.status, await res.json()]).toEqual([409, { error: "full" }]);
    expect(row(26).status).toBe("pending");
  });

  it("turning a note down, and undoing it within a day", async () => {
    const group = await made();
    seed(group.id, 1);
    expect((await decide(group.id, entryId(1), { action: "reject" })).status).toBe(200);
    expect(row(1)).toMatchObject({ status: "rejected", decided_at: new Date(NOW).toISOString() });
    // It is still in the panel's list, for Undo.
    expect(((await (await read()).json()) as { group: Group }).group.entries).toEqual([expect.objectContaining({ status: "rejected", name: "Guest 1" })]);
    vi.setSystemTime(NOW + 23 * HOUR);
    expect((await decide(group.id, entryId(1), { action: "restore" })).status).toBe(200);
    expect(row(1)).toMatchObject({ status: "pending", decided_at: null, item_key: null });
  });

  it("removing one that was in the gift, and undoing it: it waits again and gets a fresh key next time", async () => {
    const group = await made();
    seed(group.id, 1);
    const first = (await (await decide(group.id, entryId(1), { action: "approve" })).json()) as { item: { key: string } };
    expect((await decide(group.id, entryId(1), { action: "remove" })).status).toBe(200);
    expect(row(1)).toMatchObject({ status: "removed", item_key: first.item.key });
    expect((await decide(group.id, entryId(1), { action: "restore" })).status).toBe(200);
    expect(row(1)).toMatchObject({ status: "pending", item_key: null });
    const second = (await (await decide(group.id, entryId(1), { action: "approve" })).json()) as { item: { key: string } };
    expect(second.item.key).not.toBe(first.item.key);
  });

  it("Undo is gone after a day, and once the words have been scrubbed", async () => {
    const group = await made();
    seed(group.id, 1, { status: "rejected", decided_at: new Date(NOW - 25 * HOUR).toISOString() });
    seed(group.id, 2, { status: "removed", decided_at: new Date(NOW - HOUR).toISOString(), scrubbed_at: new Date(NOW).toISOString(), name: null, note: null });
    for (const n of [1, 2]) {
      const res = await decide(group.id, entryId(n), { action: "restore" });
      expect([res.status, await res.json()]).toEqual([410, { error: "gone" }]);
    }
    // A scrubbed one is no longer shown either; the other still is (the card may hold it), and the panel is told Undo is over.
    const shown = ((await (await read()).json()) as { group: { entries: { id: string; canUndo: boolean }[] } }).group.entries;
    expect(shown.map((e) => [e.id, e.canUndo])).toEqual([[entryId(1), false]]);
  });

  it("the panel is told which notes Undo can still bring back: one turned down or removed within the day, and nothing else", async () => {
    const group = await made();
    seed(group.id, 1);
    seed(group.id, 2, { status: "rejected", decided_at: new Date(NOW - 23 * HOUR).toISOString() });
    seed(group.id, 3, { status: "removed", item_key: "abcdefghij", decided_at: new Date(NOW - HOUR).toISOString() });
    seed(group.id, 4, { status: "rejected", decided_at: new Date(NOW - 24 * HOUR - 1000).toISOString() });
    seed(group.id, 5, { status: "approved", item_key: "bcdefghijk", decided_at: new Date(NOW - HOUR).toISOString() });
    const shown = ((await (await read()).json()) as { group: { entries: { id: string; canUndo: boolean }[] } }).group.entries;
    expect(Object.fromEntries(shown.map((e) => [e.id, e.canUndo]))).toEqual({ [entryId(1)]: false, [entryId(2)]: true, [entryId(3)]: true, [entryId(4)]: false, [entryId(5)]: false });
    // And the route agrees with what it said, note for note.
    expect((await decide(group.id, entryId(2), { action: "restore" })).status).toBe(200);
    expect((await decide(group.id, entryId(4), { action: "restore" })).status).toBe(410);
  });

  it("each step only from the state it belongs to", async () => {
    const group = await made();
    seed(group.id, 1);
    seed(group.id, 2, { status: "withdrawn", decided_at: new Date(NOW).toISOString() });
    expect((await decide(group.id, entryId(1), { action: "remove" })).status).toBe(409);
    expect((await decide(group.id, entryId(2), { action: "approve" })).status).toBe(409);
    expect((await decide(group.id, entryId(2), { action: "restore" })).status).toBe(409);
  });

  it("a note its writer took back says so to whatever the sender asks of it, so the panel can say whose doing it was", async () => {
    const group = await made();
    seed(group.id, 1, { status: "withdrawn", decided_at: new Date(NOW).toISOString() });
    // Its words already scrubbed: still "taken back", not "no such note".
    seed(group.id, 2, { status: "withdrawn", decided_at: new Date(NOW - 30 * HOUR).toISOString(), scrubbed_at: new Date(NOW).toISOString(), name: null, note: null });
    seed(group.id, 3, { status: "rejected", decided_at: new Date(NOW).toISOString() });
    for (const n of [1, 2]) {
      for (const action of ["approve", "reject", "remove"]) {
        const res = await decide(group.id, entryId(n), { action });
        expect([n, action, res.status, await res.json()]).toEqual([n, action, 409, { error: "taken_back" }]);
      }
    }
    // One that is merely in another state than the panel thought is told apart from that.
    const other = await decide(group.id, entryId(3), { action: "approve" });
    expect([other.status, await other.json()]).toEqual([409, { error: "not_allowed" }]);
    expect(row(1)).toMatchObject({ status: "withdrawn" });
  });

  it("an address that is no note at all is still a 404", async () => {
    const group = await made();
    seed(group.id, 1);
    expect((await decide(group.id, entryId(9), { action: "approve" })).status).toBe(404);
    expect((await decide(group.id, entryId(1), { action: "publish" })).status).toBe(400);
    expect((await decide(group.id, "nope", { action: "reject" })).status).toBe(404);
  });

  it("a note its writer took back stays in the list only while the gift may still hold it", async () => {
    const group = await made();
    seed(group.id, 1, { status: "withdrawn", item_key: "abcdefghij", decided_at: new Date(NOW).toISOString() });
    seed(group.id, 2, { status: "withdrawn", decided_at: new Date(NOW).toISOString() });
    expect(((await (await read()).json()) as { group: Group }).group.entries).toEqual([expect.objectContaining({ id: entryId(1), status: "withdrawn", key: "abcdefghij" })]);
  });

  it("is the group's own account only: anyone else gets a 404 and changes nothing", async () => {
    const group = await made();
    seed(group.id, 1);
    state.user = { id: SOMEONE_ELSE };
    expect((await decide(group.id, entryId(1), { action: "approve" })).status).toBe(404);
    expect((await patch(group.id, { closed: true })).status).toBe(404);
    expect((await remove(group.id)).status).toBe(404);
    expect(row(1).status).toBe("pending");
    expect(fake.rows("gift_groups")).toHaveLength(1);
  });
});

describe("the link's controls", () => {
  it("a new link: the old token then finds nothing", async () => {
    const group = await made();
    const oldToken = group.url.split("/c/")[1];
    const next = ((await (await patch(group.id, { resetLink: true })).json()) as { group: Group }).group;
    const newToken = next.url.split("/c/")[1];
    expect(newToken).not.toBe(oldToken);
    expect(newToken).toBe(groupToken(group.id, 2, SECRET));
    const [stored] = fake.rows("gift_groups");
    expect(stored).toMatchObject({ token_version: 2, token_sha256: sha256Hex(newToken) });
    const { groupByToken } = await import("@/lib/group/store");
    expect(await groupByToken(fake.db, oldToken)).toBeNull();
    expect((await groupByToken(fake.db, newToken))?.id).toBe(group.id);
  });

  it("closing and reopening", async () => {
    const group = await made();
    expect(((await (await patch(group.id, { closed: true })).json()) as { group: Group }).group.closedAt).toBe(new Date(NOW).toISOString());
    expect(((await (await patch(group.id, { closed: false })).json()) as { group: Group }).group.closedAt).toBeNull();
  });

  const day = (n: number) => new Date(NOW + n * DAY).toISOString();
  const extended = async (id: string) => ((await (await patch(id, { extend: true })).json()) as { group: Group }).group;

  it("'Keep it open 30 more days' adds 30 days to the day it closes, on whatever day it is tapped", async () => {
    const group = await made();
    expect(group).toMatchObject({ closesAt: day(30), ranOut: false, extendsTo: day(60) });
    // Tapped the moment the link is made: 30 more, not none.
    expect(await extended(group.id)).toMatchObject({ closesAt: day(60), extendsTo: day(90) });
    // Tapped again twenty days in: 30 more again, which is the last day a link can have.
    vi.setSystemTime(NOW + 20 * DAY);
    expect(await extended(group.id)).toMatchObject({ closesAt: day(90), extendsTo: null });
  });

  it("never past 90 days from the day it was made: there the button has nothing to offer, and a request moves nothing", async () => {
    const group = await made();
    fake.rows("gift_groups")[0].closes_at = day(90);
    vi.setSystemTime(NOW + 85 * DAY);
    expect(((await (await read()).json()) as { group: Group }).group.extendsTo).toBeNull();
    expect((await extended(group.id)).closesAt).toBe(day(90));
    // Close to the end it says the day it would move to, which the panel shows instead of "30 more days".
    fake.rows("gift_groups")[0].closes_at = day(75);
    expect(((await (await read()).json()) as { group: Group }).group.extendsTo).toBe(day(90));
    expect((await extended(group.id)).closesAt).toBe(day(90));
  });

  it("a link past its last day says so, and keeping it open counts from today", async () => {
    const group = await made();
    vi.setSystemTime(NOW + 45 * DAY);
    const late = ((await (await read()).json()) as { group: Group }).group;
    expect(late).toMatchObject({ closesAt: day(30), closedAt: null, ranOut: true, extendsTo: day(75) });
    expect(await extended(group.id)).toMatchObject({ closesAt: day(75), ranOut: false });
    // Past the ninetieth day there is no way back.
    fake.rows("gift_groups")[0].closes_at = day(75);
    vi.setSystemTime(NOW + 95 * DAY);
    expect(((await (await read()).json()) as { group: Group }).group).toMatchObject({ ranOut: true, extendsTo: null });
    expect((await extended(group.id)).closesAt).toBe(day(75));
  });

  it("changes what the page says, cleaned like everything else", async () => {
    const group = await made();
    const next = ((await (await patch(group.id, { fromName: " Tom & Sam ", prompt: "" })).json()) as { group: Group }).group;
    expect(next).toMatchObject({ fromName: "Tom & Sam", prompt: null, forName: "Nora" });
    for (const body of [{ fromName: "" }, { forName: "x".repeat(41) }, { prompt: "see evil.com" }, { giftId: GIFT }, { closed: "yes" }, { resetLink: false }]) expect((await patch(group.id, body)).status, JSON.stringify(body)).toBe(400);
  });

  it("once the gift is sent the link stays closed", async () => {
    const group = await made();
    fake.rows("gift_groups")[0].sent_at = new Date(NOW).toISOString();
    for (const body of [{ closed: false }, { resetLink: true }, { extend: true }]) {
      const res = await patch(group.id, body);
      expect([res.status, await res.json()]).toEqual([409, { error: "sent" }]);
    }
    expect((await patch(group.id, { forName: "Nora B." })).status).toBe(200);
  });

  it("if the secret changes, the panel's link is the one that works and the stored hash follows", async () => {
    const group = await made();
    process.env.VIEWER_HASH_SECRET = "rotated";
    const view = ((await (await read()).json()) as { group: Group }).group;
    process.env.VIEWER_HASH_SECRET = SECRET;
    const token = view.url.split("/c/")[1];
    expect(token).toBe(groupToken(group.id, 1, "rotated"));
    expect(fake.rows("gift_groups")[0].token_sha256).toBe(sha256Hex(token));
  });
});

describe("deleting the group", () => {
  it("takes its rows and its files, and leaves the gift alone", async () => {
    const group = await made();
    seed(group.id, 1);
    seed(group.id, 2, { status: "approved", item_key: "abcdefghij" });
    const before = structuredClone(fake.rows("gifts"));
    const res = await remove(group.id);
    expect([res.status, await res.json()]).toEqual([200, { ok: true }]);
    expect(fake.rows("gift_groups")).toEqual([]);
    expect(fake.rows("gift_contributions")).toEqual([]);
    expect(state.removedFolders).toEqual([group.id]);
    expect(fake.rows("gifts")).toEqual(before);
  });
});
