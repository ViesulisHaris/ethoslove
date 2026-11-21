/**
 * The link's side of a group card, against the in-memory database: what a stranger with the link
 * may send and what becomes of it, the states a link ends in, the limits, and taking a note back.
 * The photo goes through the real encoder with real image bytes; only Storage is stood in for.
 */
import sharp from "sharp";
import { NextRequest } from "next/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { emailKey } from "@/lib/lifecycle/links";
import { groupAgreed, groupEmailConsent } from "@/lib/group/notice";
import { groupToken, sha256Hex } from "@/lib/group/token";
import { FakeDb } from "./helpers/fake-db";

const state = vi.hoisted(() => ({
  db: null as unknown,
  on: true,
  limitedKeys: [] as string[],
  asked: [] as string[],
  stored: [] as { path: string; webp: Buffer }[],
  removed: [] as string[],
  storeFails: false,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: async (key: string) => {
    state.asked.push(key);
    return !state.limitedKeys.some((prefix) => key.startsWith(prefix));
  },
}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/group/flag", () => ({ groupGiftsEnabled: () => state.on }));
vi.mock("@/lib/group/photo-store", () => ({
  CONTRIBUTIONS_BUCKET: "contributions",
  pendingPhotoPath: (groupId: string, entryId: string) => `${groupId}/${entryId}.webp`,
  giftPhotoPath: (giftId: string, key: string) => `gifts/${giftId}/c${key}.webp`,
  storePendingPhoto: async (_admin: unknown, path: string, webp: Buffer) => {
    if (state.storeFails) return false;
    state.stored.push({ path, webp });
    return true;
  },
  removePendingPhotos: async (_admin: unknown, paths: string[]) => void state.removed.push(...paths),
  signPendingPhotos: async () => ({}),
  copyPhotoToGift: async () => null,
  deleteGroupStorage: async () => {},
}));

const contribute = await import("@/app/api/group/contribute/route");
const withdraw = await import("@/app/api/group/withdraw/route");

const NOW = Date.parse("2026-12-01T10:00:00Z");
const DAY = 86_400_000;
const SECRET = "group-test-secret";
const GROUP = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const GIFT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TOKEN = groupToken(GROUP, 1, SECRET);

const group = (over: Record<string, unknown> = {}) => ({
  id: GROUP,
  gift_id: GIFT,
  user_id: "11111111-1111-4111-8111-111111111111",
  template_slug: "group-reference",
  locale: "en",
  from_name: "Tom",
  for_name: "Nora",
  prompt: null,
  token_sha256: sha256Hex(TOKEN),
  token_version: 1,
  report_ref: "abcd1234",
  max_entries: 25,
  note_max: 140,
  takes_photos: true,
  created_at: new Date(NOW - DAY).toISOString(),
  closes_at: new Date(NOW + 29 * DAY).toISOString(),
  closed_at: null,
  sent_at: null,
  nudged_at: null,
  ...over,
});

let fake: FakeDb;
let jpeg: Buffer;
beforeAll(async () => {
  process.env.VIEWER_HASH_SECRET = SECRET;
  jpeg = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: "#c87" } })
    .jpeg()
    .withExif({ IFD0: { Artist: "Mum Okonkwo" } })
    .toBuffer();
});
function reset(over: Record<string, unknown> = {}, entries: Record<string, unknown>[] = []) {
  fake = new FakeDb({ gift_groups: [group(over)], gift_contributions: entries }, NOW);
  state.db = fake.db;
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  reset();
  state.on = true;
  state.limitedKeys = [];
  state.asked = [];
  state.stored = [];
  state.removed = [];
  state.storeFails = false;
  return () => vi.useRealTimers();
});

/** Bytes as a file a browser would send (a copy: a Buffer may sit on shared memory, which Blob does not take). */
const blob = (bytes: Buffer, type: string) => new Blob([new Uint8Array(bytes)], { type });
type Fields = Record<string, string | Blob | undefined>;
function send(fields: Fields = {}, headers: Record<string, string> = {}) {
  const form = new FormData();
  const all: Fields = { token: TOKEN, name: "Mum", note: "Forty is nothing. Ring me.", agree: "1", ...fields };
  for (const [key, value] of Object.entries(all)) {
    if (value === undefined) continue;
    if (typeof value === "string") form.set(key, value);
    else form.set(key, value, "photo");
  }
  return contribute.POST(new NextRequest("https://ethos.test/api/group/contribute", { method: "POST", body: form, headers: { "x-real-ip": "203.0.113.7", ...headers } }));
}
const takeBack = (body: unknown) => withdraw.POST(new NextRequest("https://ethos.test/api/group/withdraw", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", "x-real-ip": "203.0.113.7" } }));
const rows = () => fake.rows("gift_contributions");
const filler = (n: number, status = "pending") => Array.from({ length: n }, (_, i) => ({ id: `eeeeeeee-eeee-4eee-8eee-${String(i).padStart(12, "0")}`, group_id: GROUP, status, name: "x", note: "y", agreed: "z", report_ref: "aaaaaaaa", created_at: new Date(NOW).toISOString() }));

describe("the switch", () => {
  it("both routes are a 404 while it is off, and nothing is read or limited", async () => {
    state.on = false;
    for (const res of [await send(), await takeBack({ token: TOKEN, withdraw: "x".repeat(32) })]) {
      expect(res.status).toBe(404);
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
    expect(fake.calls).toEqual([]);
    expect(state.asked).toEqual([]);
  });

  it("503 before migration 0023, and nothing is stored", async () => {
    fake = new FakeDb({}, NOW, { missingTables: ["gift_groups", "gift_contributions"] });
    state.db = fake.db;
    const res = await send({ photo: blob(jpeg, "image/jpeg") });
    expect([res.status, await res.json()]).toEqual([503, { error: "unavailable" }]);
    expect(state.stored).toEqual([]);
  });
});

describe("adding a note", () => {
  it("stores it waiting, as plain text, with the notice agreed to word for word and a secret to take it back", async () => {
    const res = await send({ name: "  Mum​ ", note: "Forty is nothing.\n\nRing me." });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; withdraw: string };
    expect(body.ok).toBe(true);
    expect(body.withdraw).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toMatchObject({
      group_id: GROUP,
      status: "pending",
      name: "Mum",
      note: "Forty is nothing. Ring me.",
      photo_path: null,
      email: null,
      email_sha256: null,
      item_key: null,
      agreed: groupAgreed("en", "Tom", true),
      withdraw_sha256: sha256Hex(body.withdraw),
    });
    expect(rows()[0].report_ref).toMatch(/^[a-z0-9]{8}$/);
    // The secret itself is never stored, and the answer says nothing about the group or the gift.
    expect(JSON.stringify(rows())).not.toContain(body.withdraw);
    expect(Object.keys(body).sort()).toEqual(["ok", "withdraw"]);
  });

  it("agrees in the card's own language", async () => {
    reset({ locale: "es", from_name: "Tomás" });
    await send({ email: "abuela@example.test" });
    expect(rows()[0]).toMatchObject({ agreed: groupAgreed("es", "Tomás", true), email_consent: groupEmailConsent("es") });
  });

  it("on a card that takes no photos, nobody is recorded as agreeing to one being seen", async () => {
    reset({ takes_photos: false });
    await send();
    expect(rows()[0].agreed).toBe(groupAgreed("en", "Tom", false));
    expect(rows()[0].agreed).not.toMatch(/photo/i);
    reset();
    await send();
    expect(rows()[0].agreed).toContain("your name, note and photo");
  });

  it("stores no IP address, anywhere", async () => {
    await send({ email: "mum@example.test", photo: blob(jpeg, "image/jpeg") });
    expect(JSON.stringify(fake.tables)).not.toContain("203.0.113.7");
  });

  it("an address is optional, lower-cased, kept with the sentence they agreed to, and unconfirmed", async () => {
    await send({ email: "  Mum@Example.TEST " });
    expect(rows()[0]).toMatchObject({ email: "mum@example.test", email_sha256: await emailKey("mum@example.test"), email_consent: groupEmailConsent("en"), email_consent_at: new Date(NOW).toISOString(), email_confirmed_at: null, emailed_at: null });
    const bad = await send({ email: "not an address" });
    expect([bad.status, await bad.json()]).toEqual([400, { error: "invalid_email" }]);
    expect(rows()).toHaveLength(1);
  });

  it("refuses what it can't keep: no name, no note, the box unticked, a note too long, a link", async () => {
    for (const [fields, error] of [
      [{ name: "" }, "invalid"],
      [{ note: "   " }, "invalid"],
      [{ agree: undefined }, "invalid"],
      [{ agree: "0" }, "invalid"],
      [{ name: "W".repeat(25) }, "invalid"],
      [{ note: "m".repeat(141) }, "invalid"],
      [{ note: "see https://evil.example" }, "no_links"],
      [{ name: "evil.com" }, "no_links"],
      [{ note: "gifts/6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b/a.webp" }, "invalid"],
    ] as const) {
      const res = await send(fields);
      expect([res.status, await res.json()], JSON.stringify(fields)).toEqual([400, { error }]);
    }
    expect(rows()).toEqual([]);
  });

  it("holds the note to the group's own length", async () => {
    reset({ note_max: 60 });
    expect((await send({ note: "m".repeat(61) })).status).toBe(400);
    expect((await send({ note: "m".repeat(60) })).status).toBe(200);
  });

  it("markup arrives as the characters it is, nothing more", async () => {
    await send({ name: "<b>Mal</b>", note: '<img src=x onerror="alert(1)"> **hi**' });
    expect(rows()[0]).toMatchObject({ name: "<b>Mal</b>", note: '<img src=x onerror="alert(1)"> **hi**' });
  });

  it("a link that finds nothing is a 404, whatever else was sent", async () => {
    for (const token of [groupToken(GROUP, 2, SECRET), "short", "", sha256Hex(TOKEN)]) expect((await send({ token })).status, token).toBe(404);
    expect(rows()).toEqual([]);
  });
});

describe("a photo", () => {
  it("is re-encoded before it is stored: WebP, inside 1600 px, with nothing of the original file", async () => {
    const res = await send({ photo: blob(jpeg, "image/jpeg") });
    expect(res.status).toBe(200);
    const [saved] = state.stored;
    const [row] = rows();
    expect(saved.path).toBe(`${GROUP}/${row.id}.webp`);
    expect(row).toMatchObject({ photo_path: saved.path, photo_width: 1600, photo_height: 800 });
    const meta = await sharp(saved.webp).metadata();
    expect([meta.format, meta.width, meta.height, meta.exif]).toEqual(["webp", 1600, 800, undefined]);
    expect(saved.webp.includes(Buffer.from("Mum Okonkwo"))).toBe(false);
    // It waits in its own bucket, never in the gift's folder.
    expect(saved.path).not.toContain("gifts/");
  });

  it("is refused when it is not a picture, the wrong kind, or too big", async () => {
    for (const [photo, status, error] of [
      [new Blob(["<script>alert(1)</script>"], { type: "image/jpeg" }), 400, "bad_photo"],
      [blob(jpeg, "image/gif"), 400, "bad_photo"],
      [blob(jpeg, "application/pdf"), 400, "bad_photo"],
      [blob(Buffer.alloc(2 * 1024 * 1024 + 1), "image/jpeg"), 413, "too_large"],
    ] as const) {
      const res = await send({ photo });
      expect([res.status, await res.json()]).toEqual([status, { error }]);
    }
    expect(rows()).toEqual([]);
    expect(state.stored).toEqual([]);
  });

  it("is refused on a card whose template takes none", async () => {
    reset({ takes_photos: false });
    const res = await send({ photo: blob(jpeg, "image/jpeg") });
    expect([res.status, await res.json()]).toEqual([400, { error: "bad_photo" }]);
    expect((await send()).status).toBe(200);
  });

  it("is taken away again if the note itself is then refused", async () => {
    fake.failNext("gift_contributions", "insert", "boom");
    const res = await send({ photo: blob(jpeg, "image/jpeg") });
    expect(res.status).toBe(500);
    expect(state.stored).toHaveLength(1);
    expect(state.removed).toEqual([state.stored[0].path]);
    expect(rows()).toEqual([]);
  });

  it("that can't be stored stops the note: never a row pointing at no file", async () => {
    state.storeFails = true;
    expect((await send({ photo: blob(jpeg, "image/jpeg") })).status).toBe(503);
    expect(rows()).toEqual([]);
  });

  it("a body over the limit is refused before any of it is read", async () => {
    const res = await send({}, { "content-length": String(4 * 1024 * 1024) });
    expect([res.status, await res.json()]).toEqual([413, { error: "too_large" }]);
    expect(fake.calls).toEqual([]);
  });
});

describe("what a link comes to", () => {
  it("sent: 410, and nothing is stored", async () => {
    reset({ sent_at: new Date(NOW).toISOString() });
    const res = await send();
    expect([res.status, await res.json()]).toEqual([410, { error: "sent" }]);
    expect(rows()).toEqual([]);
  });

  it("closed by the sender, or past its last day: 410, and the page is told which, so it never says the sender closed a link that only ran out", async () => {
    reset({ closed_at: new Date(NOW).toISOString() });
    expect(await (await send()).json()).toEqual({ error: "closed" });
    reset({ closes_at: new Date(NOW).toISOString() });
    const res = await send();
    expect([res.status, await res.json()]).toEqual([410, { error: "expired" }]);
    // Both at once: the sender did close it.
    reset({ closed_at: new Date(NOW - DAY).toISOString(), closes_at: new Date(NOW).toISOString() });
    expect(await (await send()).json()).toEqual({ error: "closed" });
    reset({ closes_at: new Date(NOW + 1000).toISOString() });
    expect((await send()).status).toBe(200);
  });

  it("full at the template's number waiting or added: the 26th is a 409", async () => {
    reset({}, [...filler(20, "approved"), ...filler(5).map((row, i) => ({ ...row, id: `dddddddd-dddd-4ddd-8ddd-${String(i).padStart(12, "0")}` }))]);
    const res = await send();
    expect([res.status, await res.json()]).toEqual([409, { error: "full" }]);
    expect(rows()).toHaveLength(25);
  });

  it("full at sixty in all, however many of them were turned down", async () => {
    reset({}, filler(60, "rejected"));
    const res = await send();
    expect([res.status, await res.json()]).toEqual([409, { error: "full" }]);
    reset({}, filler(59, "rejected"));
    expect((await send()).status).toBe(200);
  });

  it("the database's own refusal, when two notes land together, is the same 409", async () => {
    // The trigger in 0023 raises a check violation when the group filled up between the count and the insert.
    fake.failNext("gift_contributions", "insert", "group is full", "23514");
    const res = await send({ photo: blob(jpeg, "image/jpeg") });
    expect([res.status, await res.json()]).toEqual([409, { error: "full" }]);
    expect(state.removed).toHaveLength(1);
  });
});

describe("limits by connection", () => {
  it("forty an hour from one connection, thirty an hour to one link from it, keyed by nothing that names the gift", async () => {
    await send();
    expect(state.asked).toEqual(["group-add:203.0.113.7", `group-add:203.0.113.7:${sha256Hex(TOKEN).slice(0, 16)}`]);
    for (const key of state.asked) {
      expect(key).not.toContain(GIFT);
      expect(key).not.toContain(TOKEN);
    }
  });

  it("429 from either, and nothing is stored", async () => {
    for (const prefix of ["group-add:203.0.113.7", `group-add:203.0.113.7:${sha256Hex(TOKEN).slice(0, 16)}`]) {
      state.limitedKeys = [prefix];
      const res = await send();
      expect([res.status, await res.json()]).toEqual([429, { error: "rate_limited" }]);
    }
    expect(rows()).toEqual([]);
  });
});

describe("taking a note back", () => {
  async function added() {
    return ((await (await send()).json()) as { withdraw: string }).withdraw;
  }

  it("withdraws it while the card is not yet sent, with the secret the page was given", async () => {
    const secret = await added();
    const res = await takeBack({ token: TOKEN, withdraw: secret });
    expect([res.status, await res.json()]).toEqual([200, { ok: true }]);
    expect(rows()[0]).toMatchObject({ status: "withdrawn", decided_at: new Date(NOW).toISOString() });
  });

  it("one already added to the draft keeps its key, so the sender's editor can take it out", async () => {
    const secret = await added();
    Object.assign(rows()[0], { status: "approved", item_key: "abcdefghij" });
    await takeBack({ token: TOKEN, withdraw: secret });
    expect(rows()[0]).toMatchObject({ status: "withdrawn", item_key: "abcdefghij" });
  });

  it("is too late once the card is sent: 410, and the note stays", async () => {
    const secret = await added();
    fake.rows("gift_groups")[0].sent_at = new Date(NOW).toISOString();
    const res = await takeBack({ token: TOKEN, withdraw: secret });
    expect([res.status, await res.json()]).toEqual([410, { error: "sent" }]);
    expect(rows()[0].status).toBe("pending");
  });

  it("names nobody else's note: a wrong secret finds nothing, and a request without one is refused", async () => {
    const secret = await added();
    expect((await takeBack({ token: TOKEN, withdraw: "x".repeat(32) })).status).toBe(404);
    expect((await takeBack({ token: TOKEN })).status).toBe(400);
    expect((await takeBack({ token: "nope", withdraw: secret })).status).toBe(400);
    expect(rows()[0].status).toBe("pending");
  });

  it("still works after the sender has reset the link: the old page's secret is what names the note", async () => {
    const secret = await added();
    // "Reset the link": the group now answers to another token, and the one this page holds finds no group.
    Object.assign(fake.rows("gift_groups")[0], { token_version: 2, token_sha256: sha256Hex(groupToken(GROUP, 2, SECRET)) });
    const res = await takeBack({ token: TOKEN, withdraw: secret });
    expect([res.status, await res.json()]).toEqual([200, { ok: true }]);
    expect(rows()[0]).toMatchObject({ status: "withdrawn", decided_at: new Date(NOW).toISOString() });
  });

  it("a note that is no longer there (scrubbed, or deleted with its card) answers 404, never 'taken back'", async () => {
    const secret = await added();
    // The daily job's scrub forgets the secret with the words.
    Object.assign(rows()[0], { status: "rejected", name: null, note: null, withdraw_sha256: null, scrubbed_at: new Date(NOW).toISOString() });
    expect((await takeBack({ token: TOKEN, withdraw: secret })).status).toBe(404);
    expect(rows()[0].status).toBe("rejected");
    // And a note whose group has gone (the row would have gone with it).
    const again = await added();
    fake.tables.gift_groups = [];
    expect((await takeBack({ token: TOKEN, withdraw: again })).status).toBe(404);
  });
});
