/**
 * The emails a group card sends, against the in-memory database. A contributor who leaves an
 * address gets one confirmation that names nobody; nothing else goes there until it says yes; then
 * "here's the card you signed" goes once, only for a card that is out and still holds their note,
 * and their address is deleted as it goes. The sender hears that notes are waiting at most once a
 * day. Each email is rendered in both languages.
 */
import { NextRequest } from "next/server";
import { render } from "@react-email/render";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import type { Db } from "@/lib/commerce/db";
import { GroupConfirmEmail, GroupNudgeEmail, GroupSignedEmail, groupConfirmSubject, groupNudgeSubject, groupSignedSubject } from "@/emails/group";
import { emailKey, signToken, verifyToken } from "@/lib/lifecycle/links";
import { groupEmailConsent } from "@/lib/group/notice";
import { groupToken, sha256Hex } from "@/lib/group/token";
import { FakeDb } from "./helpers/fake-db";

type Sent = { kind: "confirm" | "signed" | "nudge"; args: Record<string, unknown> };
const state = vi.hoisted(() => ({ db: null as unknown, on: true, limitedKeys: [] as string[], asked: [] as string[], sendOk: true, sent: [] as { kind: string; args: Record<string, unknown> }[] }));
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
  storePendingPhoto: async () => true,
  removePendingPhotos: async () => {},
  signPendingPhotos: async () => ({}),
  copyPhotoToGift: async () => null,
  deleteGroupStorage: async () => {},
}));
vi.mock("@/lib/email/notify", () => ({
  sendGroupConfirm: async (args: Record<string, unknown>) => (state.sent.push({ kind: "confirm", args }), state.sendOk),
  sendGroupSigned: async (args: Record<string, unknown>) => (state.sent.push({ kind: "signed", args }), state.sendOk),
  sendGroupNudge: async (args: Record<string, unknown>) => (state.sent.push({ kind: "nudge", args }), state.sendOk),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale, namespace }: { locale: "en" | "es"; namespace: string }) => {
    const root = namespace.split(".").reduce<Record<string, unknown>>((node, key) => node[key] as Record<string, unknown>, (locale === "es" ? es : en) as Record<string, unknown>);
    return (key: string) => key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], root) as string;
  },
}));

const contribute = await import("@/app/api/group/contribute/route");
const confirm = await import("@/app/api/group/confirm/route");
const { sendSignedGiftEmails, GROUP_SIGNED_REF } = await import("@/lib/group/signed-email");
const { nudgeSender } = await import("@/lib/group/mail");

const NOW = Date.parse("2026-12-01T10:00:00Z");
const DAY = 86_400_000;
const at = (ms: number) => new Date(ms).toISOString();
const SECRET = "group-test-secret";
const USER = "11111111-1111-4111-8111-111111111111";
const GROUP = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const GIFT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ENTRY = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const TOKEN = groupToken(GROUP, 1, SECRET);
const KEY = "abcdefghij";

const group = (over: Record<string, unknown> = {}) => ({
  id: GROUP,
  gift_id: GIFT,
  user_id: USER,
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
  created_at: at(NOW - DAY),
  closes_at: at(NOW + 29 * DAY),
  closed_at: null,
  sent_at: null,
  nudged_at: null,
  ...over,
});
const gift = (over: Record<string, unknown> = {}) => ({ id: GIFT, short_id: "card234ab", user_id: USER, status: "live", locale: "en", template_slug: "group-reference", password_hash: null, data: { contributions: [{ key: KEY, name: "Mum", note: "Forty is nothing." }] }, ...over });
const entry = (over: Record<string, unknown> = {}) => ({
  id: ENTRY,
  group_id: GROUP,
  status: "approved",
  name: "Mum",
  note: "Forty is nothing.",
  item_key: KEY,
  email: "mum@example.test",
  email_sha256: "e".repeat(64),
  email_consent: "We'll email you once.",
  email_consent_at: at(NOW - DAY),
  confirm_sent_at: at(NOW - DAY),
  email_confirmed_at: at(NOW - DAY + 60_000),
  emailed_at: null,
  agreed: "yes",
  report_ref: "aaaaaaaa",
  created_at: at(NOW - DAY),
  decided_at: at(NOW - DAY),
  scrubbed_at: null,
  ...over,
});

let fake: FakeDb;
function seed(tables: Record<string, Record<string, unknown>[]> = {}) {
  fake = new FakeDb({ gifts: [gift()], gift_groups: [group()], gift_contributions: [], email_optouts: [], profiles: [{ id: USER, email: "tom@example.test", locale: "en" }], ...tables }, NOW);
  state.db = fake.db;
}
const db = () => fake.db as Db;
const rows = () => fake.rows("gift_contributions");
const sent = (kind: Sent["kind"]) => state.sent.filter((mail) => mail.kind === kind).map((mail) => mail.args);

beforeAll(() => {
  process.env.VIEWER_HASH_SECRET = SECRET;
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  seed();
  state.on = true;
  state.limitedKeys = [];
  state.asked = [];
  state.sendOk = true;
  state.sent = [];
  return () => vi.useRealTimers();
});

function add(fields: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ token: TOKEN, name: "Mum", note: "Forty is nothing. Ring me.", agree: "1", ...fields })) form.set(key, value);
  return contribute.POST(new NextRequest("https://ethos.test/api/group/contribute", { method: "POST", body: form, headers: { "x-real-ip": "203.0.113.7" } }));
}
const confirmUrl = (token: string, locale = "en") => `https://ethos.test/api/group/confirm?t=${token}&l=${locale}`;
const open = (token: string, locale?: string) => confirm.GET(new NextRequest(confirmUrl(token, locale)));
const press = (token: string, locale?: string) => confirm.POST(new NextRequest(confirmUrl(token, locale), { method: "POST" }));
const ticket = (id = ENTRY) => signToken("group-confirm", id, SECRET);

describe("leaving an address with a note", () => {
  it("sends one confirmation, to that address, with a link only that note's token opens", async () => {
    seed({ gift_groups: [group({ sent_at: null })] });
    const res = await add({ email: "Mum@Example.test" });
    expect(res.status).toBe(200);
    const [mail] = sent("confirm");
    expect(sent("confirm")).toHaveLength(1);
    expect(mail).toMatchObject({ to: "mum@example.test", locale: "en" });
    const url = new URL(String(mail.confirmUrl));
    expect(url.pathname).toBe("/api/group/confirm");
    expect(await verifyToken("group-confirm", url.searchParams.get("t"), SECRET)).toBe(rows()[0].id);
    // "Never email me" is the list every other email on the site already honours.
    expect(await verifyToken("keep-never", new URL(String(mail.neverUrl)).searchParams.get("t"), SECRET)).toBe(await emailKey("mum@example.test"));
    expect(rows()[0]).toMatchObject({ confirm_sent_at: at(NOW), email_confirmed_at: null });
    // Nothing in it names the card, the gift, or anyone.
    expect(Object.keys(mail).sort()).toEqual(["confirmUrl", "locale", "neverUrl", "to"]);
    for (const value of Object.values(mail)) for (const secret of [GIFT, GROUP, TOKEN, "Tom", "Nora"]) expect(String(value)).not.toContain(secret);
  });

  it("speaks the card's language", async () => {
    seed({ gift_groups: [group({ locale: "es" })] });
    await add({ email: "abuela@example.test" });
    expect(sent("confirm")[0]).toMatchObject({ locale: "es", confirmUrl: expect.stringMatching(/&l=es$/) });
  });

  it("no address, no email", async () => {
    await add();
    expect(sent("confirm")).toEqual([]);
  });

  it("an address on the never-email list gets nothing, and is not kept", async () => {
    seed({ email_optouts: [{ email_sha256: await emailKey("mum@example.test") }] });
    const res = await add({ email: "mum@example.test" });
    // The answer is the same as for anyone: the page tells nobody what an address has done.
    expect([res.status, Object.keys(await res.json()).sort()]).toEqual([200, ["ok", "withdraw"]]);
    expect(sent("confirm")).toEqual([]);
    expect(rows()[0]).toMatchObject({ name: "Mum", email: null, email_sha256: null, email_consent: null, email_consent_at: null });
  });

  it("at most three confirmations a day to one address, across every card", async () => {
    const key = await emailKey("mum@example.test");
    await add({ email: "mum@example.test" });
    expect(state.asked).toContain(`group-confirm-mail:${key}`);
    state.limitedKeys = [`group-confirm-mail:${key}`];
    const res = await add({ email: "mum@example.test", name: "Mum again" });
    expect(res.status).toBe(200);
    expect(sent("confirm")).toHaveLength(1);
    expect(rows()[1]).toMatchObject({ name: "Mum again", confirm_sent_at: null });
  });

  it("the note is kept whatever happens to the email", async () => {
    state.sendOk = false;
    const res = await add({ email: "mum@example.test" });
    expect(res.status).toBe(200);
    expect(rows()[0]).toMatchObject({ status: "pending", email: "mum@example.test", confirm_sent_at: null });
  });
});

describe("the confirmation link", () => {
  it("opened, it only asks: a mail scanner following it confirms nothing", async () => {
    seed({ gift_groups: [group({ locale: "es" })], gift_contributions: [entry({ status: "pending", item_key: null, email_confirmed_at: null })] });
    const res = await open(await ticket());
    const html = await res.text();
    expect(res.status).toBe(200);
    // In the card's language, whatever the link's own says.
    expect(html).toContain(es.lifecycle.group.confirmTitle);
    expect(html).toContain('<form method="post"');
    expect(rows()[0].email_confirmed_at).toBeNull();
    expect(state.sent).toEqual([]);
    for (const secret of ["Tom", "Nora", "Mum", GIFT, "card234ab"]) expect(html).not.toContain(secret);
  });

  it("pressed, the address has said yes; the card is not out yet, so nothing is sent", async () => {
    seed({ gifts: [gift({ status: "draft" })], gift_contributions: [entry({ status: "pending", item_key: null, email_confirmed_at: null })] });
    const res = await press(await ticket());
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(en.lifecycle.group.doneTitle.replaceAll("'", "&#39;"));
    expect(rows()[0]).toMatchObject({ email_confirmed_at: at(NOW), email: "mum@example.test", emailed_at: null });
    expect(state.sent).toEqual([]);
  });

  it("pressed after the card went out, the card comes at once", async () => {
    seed({ gift_groups: [group({ sent_at: at(NOW - DAY) })], gift_contributions: [entry({ email_confirmed_at: null })] });
    await press(await ticket());
    expect(sent("signed")).toHaveLength(1);
    expect(rows()[0]).toMatchObject({ email: null, emailed_at: at(NOW) });
    // Pressed again, there is nothing left to do, and it says so kindly.
    const again = await press(await ticket());
    expect(again.status).toBe(200);
    expect(await again.text()).toContain(en.lifecycle.group.doneBody.replaceAll("'", "&#39;"));
    expect(sent("signed")).toHaveLength(1);
  });

  it("keeps the first yes: pressing twice does not move its time", async () => {
    seed({ gifts: [gift({ status: "draft" })], gift_contributions: [entry({ status: "pending", item_key: null, email_confirmed_at: at(NOW - 3_600_000) })] });
    await press(await ticket());
    expect(rows()[0].email_confirmed_at).toBe(at(NOW - 3_600_000));
  });

  it("a note that is gone, or holds no address any more, has nothing to confirm", async () => {
    seed({ gift_contributions: [entry({ email: null, email_sha256: null, emailed_at: null })] });
    for (const res of [await open(await ticket()), await press(await ticket()), await open(await ticket("dddddddd-dddd-4ddd-8ddd-dddddddddddd"))]) {
      expect(res.status).toBe(200);
      expect(await res.text()).toContain(en.lifecycle.group.goneTitle);
    }
    expect(state.sent).toEqual([]);
  });

  it("a link that is not ours is a 404; a token for something else opens nothing here", async () => {
    seed({ gift_contributions: [entry({ email_confirmed_at: null })] });
    for (const token of ["nope", await signToken("keep-confirm", ENTRY, SECRET), await signToken("group-confirm", ENTRY, "another-secret")]) {
      expect((await open(token)).status).toBe(404);
      expect((await press(token)).status).toBe(404);
    }
    expect(rows()[0].email_confirmed_at).toBeNull();
  });

  it("is a 404 while group cards are switched off, and reads nothing", async () => {
    seed({ gift_contributions: [entry({ email_confirmed_at: null })] });
    state.on = false;
    expect((await open(await ticket())).status).toBe(404);
    expect((await press(await ticket())).status).toBe(404);
    expect(fake.calls).toEqual([]);
    expect(state.asked).toEqual([]);
  });

  it("is a 503 before migration 0023, and thirty a minute from one connection", async () => {
    fake = new FakeDb({}, NOW, { missingTables: ["gift_groups", "gift_contributions"] });
    state.db = fake.db;
    expect((await open(await ticket())).status).toBe(503);
    expect((await press(await ticket())).status).toBe(503);
    seed({ gift_contributions: [entry({ email_confirmed_at: null })] });
    state.limitedKeys = ["group-confirm:"];
    expect((await press(await ticket())).status).toBe(503);
    expect(rows()[0].email_confirmed_at).toBeNull();
  });
});

describe("here's the card you signed", () => {
  it("goes to a confirmed address whose note is in a card that is out, with the card's own link and nothing else of it", async () => {
    seed({ gift_contributions: [entry()] });
    expect(await sendSignedGiftEmails(db(), GIFT, NOW)).toEqual({ sent: 1, skipped: 0 });
    const [mail] = sent("signed");
    expect(mail).toEqual({ to: "mum@example.test", locale: "en", fromName: "Tom", giftUrl: expect.stringMatching(/\/g\/card234ab$/), hasPassword: false, makeUrl: expect.stringMatching(new RegExp(`/templates\\?ref=${GROUP_SIGNED_REF}$`)), onceKey: `group-signed:${ENTRY}` });
    for (const value of Object.values(mail)) expect(String(value)).not.toContain(GIFT);
  });

  it("deletes the address the moment it has gone: the note then holds no way to reach its writer", async () => {
    seed({ gift_contributions: [entry()] });
    await sendSignedGiftEmails(db(), GIFT, NOW);
    expect(rows()[0]).toMatchObject({ email: null, email_sha256: null, email_consent: null, email_consent_at: null, emailed_at: at(NOW), name: "Mum" });
    expect(JSON.stringify(fake.tables)).not.toContain("mum@example.test");
  });

  it("once: asked again, on any path, nothing more is sent", async () => {
    seed({ gift_contributions: [entry()] });
    await sendSignedGiftEmails(db(), GIFT, NOW);
    expect(await sendSignedGiftEmails(db(), GIFT, NOW + 1000)).toEqual({ sent: 0, skipped: 0 });
    expect(sent("signed")).toHaveLength(1);
  });

  it("not to an address that never confirmed, a note still waiting, one turned down, or one no longer in the card", async () => {
    const other = (n: number, over: Record<string, unknown>) => entry({ id: `cccccccc-cccc-4ccc-8ccc-00000000000${n}`, email: `p${n}@example.test`, ...over });
    seed({
      gift_contributions: [
        other(1, { email_confirmed_at: null }),
        other(2, { status: "pending", item_key: null }),
        other(3, { status: "rejected", item_key: null }),
        other(4, { status: "removed" }),
        // Approved, and then the sender took it out in the editor: its key is not in the gift.
        other(5, { item_key: "zzzzzzzzzz" }),
        other(6, { email: null, email_sha256: null }),
      ],
    });
    expect(await sendSignedGiftEmails(db(), GIFT, NOW)).toEqual({ sent: 0, skipped: 0 });
    expect(state.sent).toEqual([]);
    // Nobody's address was touched either.
    expect(rows().filter((row) => row.email).length).toBe(5);
  });

  it("not until the card is out: a draft and a card still waiting for its date send nothing", async () => {
    for (const status of ["draft", "scheduled"]) {
      seed({ gifts: [gift({ status })], gift_contributions: [entry()] });
      expect(await sendSignedGiftEmails(db(), GIFT, NOW), status).toEqual({ sent: 0, skipped: 0 });
      expect(rows()[0]).toMatchObject({ email: "mum@example.test", emailed_at: null });
    }
    expect(state.sent).toEqual([]);
  });

  it("an address that has since asked for no email gets none, and is deleted all the same", async () => {
    seed({ gift_contributions: [entry()], email_optouts: [{ email_sha256: "e".repeat(64) }] });
    expect(await sendSignedGiftEmails(db(), GIFT, NOW)).toEqual({ sent: 0, skipped: 1 });
    expect(state.sent).toEqual([]);
    expect(rows()[0]).toMatchObject({ email: null, email_sha256: null });
  });

  it("an email that does not go is tried again on the next run, with the address kept until then", async () => {
    seed({ gift_contributions: [entry()] });
    state.sendOk = false;
    expect(await sendSignedGiftEmails(db(), GIFT, NOW)).toEqual({ sent: 0, skipped: 1 });
    expect(rows()[0]).toMatchObject({ email: "mum@example.test", emailed_at: null });
    state.sendOk = true;
    expect(await sendSignedGiftEmails(db(), GIFT, NOW + DAY)).toEqual({ sent: 1, skipped: 0 });
    // The same key both times, so the mail service itself would refuse a second copy.
    expect(sent("signed").map((mail) => mail.onceKey)).toEqual([`group-signed:${ENTRY}`, `group-signed:${ENTRY}`]);
  });

  it("says when the sender set a password, in the card's language", async () => {
    seed({ gifts: [gift({ password_hash: "x" })], gift_groups: [group({ locale: "es", from_name: "Tomás" })], gift_contributions: [entry()] });
    await sendSignedGiftEmails(db(), GIFT, NOW);
    expect(sent("signed")[0]).toMatchObject({ locale: "es", fromName: "Tomás", hasPassword: true, makeUrl: expect.stringContaining("/es/templates?ref=group-signed") });
  });

  it("a gift with no group, or one that is not there, is simply nothing to do", async () => {
    seed({ gift_groups: [] });
    expect(await sendSignedGiftEmails(db(), GIFT, NOW)).toEqual({ sent: 0, skipped: 0 });
    expect(await sendSignedGiftEmails(db(), "dddddddd-dddd-4ddd-8ddd-dddddddddddd", NOW)).toEqual({ sent: 0, skipped: 0 });
  });
});

describe("telling the sender notes are waiting", () => {
  it("on the first note, to the account's own address in its own language, naming only who the card is for", async () => {
    seed({ gifts: [gift({ status: "draft" })], profiles: [{ id: USER, email: "tom@example.test", locale: "es" }] });
    await add();
    const [mail] = sent("nudge");
    expect(sent("nudge")).toHaveLength(1);
    expect(mail).toEqual({ to: "tom@example.test", locale: "es", count: 1, forName: "Nora", unsubscribeUrl: expect.stringMatching(/\/api\/email\/unsubscribe\?t=[0-9a-f]{64}\.[A-Za-z0-9_-]+&l=es$/), onceKey: `group-nudge:${GROUP}:2026-12-01` });
    expect(fake.rows("gift_groups")[0].nudged_at).toBe(at(NOW));
    // The way out is the site's own unsubscribe link, for this address and no other.
    const token = new URL(mail.unsubscribeUrl as string).searchParams.get("t");
    expect(await verifyToken("email-optout", token, SECRET)).toBe(await emailKey("tom@example.test"));
  });

  it("never to an address on the unsubscribe list, and the list is asked once a day, not once a note", async () => {
    seed({ gifts: [gift({ status: "draft" })], email_optouts: [{ email_sha256: await emailKey("tom@example.test") }] });
    expect((await add()).status).toBe(200);
    expect((await add({ name: "Dad" })).status).toBe(200);
    expect(sent("nudge")).toEqual([]);
    expect(fake.calls.filter((call) => call.table === "email_optouts")).toHaveLength(1);
    expect(rows()).toHaveLength(2);
  });

  it("the day is counted as a moment, however the database writes the time it last sent one", async () => {
    // Postgres hands a timestamp back as "+00:00", toISOString writes ".000Z": as text the two don't compare.
    const stamp = (ms: number) => at(ms).replace(".000Z", "+00:00");
    seed({ gifts: [gift({ status: "draft" })], gift_groups: [group({ nudged_at: stamp(NOW - DAY + 60_000) })] });
    expect(await nudgeSender(db(), fake.rows("gift_groups")[0] as never, NOW)).toBe(false);
    // Not a day yet: nothing is sent, and nothing is even asked of the database.
    expect(fake.calls).toEqual([]);
    seed({ gifts: [gift({ status: "draft" })], gift_groups: [group({ nudged_at: stamp(NOW - DAY - 60_000) })] });
    expect(await nudgeSender(db(), fake.rows("gift_groups")[0] as never, NOW)).toBe(true);
    expect(sent("nudge")).toHaveLength(1);
  });

  it("at most once a day for a card, however many notes land", async () => {
    seed({ gifts: [gift({ status: "draft" })] });
    await add();
    await add({ name: "Dad" });
    vi.setSystemTime(NOW + DAY - 1000);
    await add({ name: "Ines" });
    expect(sent("nudge")).toHaveLength(1);
    vi.setSystemTime(NOW + DAY + 1000);
    await add({ name: "Kofi" });
    expect(sent("nudge")).toHaveLength(2);
    expect(sent("nudge")[1]).toMatchObject({ count: 4 });
  });

  it("two notes at once claim the day once", async () => {
    const row = group();
    expect(await Promise.all([nudgeSender(db(), row as never, NOW), nudgeSender(db(), row as never, NOW)])).toEqual([true, false]);
    expect(sent("nudge")).toHaveLength(1);
  });

  it("an email that does not go gives the day back", async () => {
    state.sendOk = false;
    expect(await nudgeSender(db(), group() as never, NOW)).toBe(false);
    expect(fake.rows("gift_groups")[0].nudged_at).toBeNull();
  });

  it("never fails the note it follows", async () => {
    seed({ gifts: [gift({ status: "draft" })], profiles: [] });
    expect((await add()).status).toBe(200);
    expect(sent("nudge")).toEqual([]);
    expect(rows()).toHaveLength(1);
  });
});

describe("the emails themselves", () => {
  const text = (html: string) => html.replace(/<!--.*?-->/g, "").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

  it("the confirmation names nobody and says how to never get one again, in both languages", async () => {
    const english = text(await render(GroupConfirmEmail({ locale: "en", confirmUrl: "https://ethos.test/api/group/confirm?t=abc", neverUrl: "https://ethos.test/api/keep/never?t=def" })));
    expect(english).toContain("Yes, send it to me");
    expect(english).toContain("https://ethos.test/api/group/confirm?t=abc");
    expect(english).toContain("https://ethos.test/api/keep/never?t=def");
    expect(english).toContain("Not you? Do nothing");
    const spanish = text(await render(GroupConfirmEmail({ locale: "es", confirmUrl: "https://ethos.test/c", neverUrl: "https://ethos.test/n" })));
    expect(spanish).toContain("Sí, envíamela");
    expect(spanish).toContain("tarjeta en grupo");
    // It promises the card only to someone whose note is in it: nobody is left waiting for an email that won't come.
    expect(english).toContain("It comes only if that note is in the card.");
    expect(spanish).toContain("Llega solo si esa nota va en la tarjeta.");
    for (const locale of ["en", "es"] as const) expect(groupEmailConsent(locale)).toMatch(locale === "es" ? /si tu nota entra en la tarjeta/ : /if your note goes into the card/);
    // So do the two pages the confirming link opens.
    expect(en.lifecycle.group.confirmBody).toContain("If your note is in the card when it goes out");
    expect(en.lifecycle.group.doneBody).toContain("if your note is in it");
    expect(es.lifecycle.group.confirmBody).toContain("Si tu nota va en la tarjeta cuando salga");
    expect(es.lifecycle.group.doneBody).toContain("si tu nota va en ella");
    expect(groupConfirmSubject("en")).toBe("Confirm to be sent the card");
    expect(groupConfirmSubject("es")).toBe("Confirma para recibir la tarjeta");
  });

  it("the card you signed carries the card's link, who sent it, the password line when there is one, and one quiet link", async () => {
    const props = { fromName: "Tom", giftUrl: "https://tryethos.io/g/card234ab", makeUrl: "https://tryethos.io/templates?ref=group-signed" };
    const english = text(await render(GroupSignedEmail({ locale: "en", hasPassword: true, ...props })));
    expect(english).toContain("Tom sent the card you added a note to.");
    expect(english).toContain("tryethos.io/g/card234ab");
    expect(english).toContain("Tom set a password; ask them for it.");
    expect(english).toContain("https://tryethos.io/templates?ref=group-signed");
    expect(english).toContain("we've deleted your address");
    expect(text(await render(GroupSignedEmail({ locale: "en", hasPassword: false, ...props })))).not.toContain("password");
    const spanish = text(await render(GroupSignedEmail({ locale: "es", hasPassword: true, ...props, fromName: "Tomás" })));
    expect(spanish).toContain("Tomás ha enviado la tarjeta a la que añadiste tu nota.");
    expect(spanish).toContain("ya hemos borrado tu dirección");
    expect(groupSignedSubject("en", "Tom")).toBe("Tom sent the card you signed");
  });

  it("a name is drawn as the characters it is", async () => {
    const html = await render(GroupSignedEmail({ locale: "en", fromName: '<img src=x onerror="alert(1)">', giftUrl: "https://tryethos.io/g/a", hasPassword: false, makeUrl: "https://tryethos.io/templates" }));
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
  });

  it("the sender's nudge counts the notes, in both languages, and carries the way to stop them", async () => {
    const english = text(await render(GroupNudgeEmail({ locale: "en", count: 1, forName: "Nora", editorUrl: "https://tryethos.io/dashboard", unsubscribeUrl: "https://tryethos.io/api/email/unsubscribe?t=abc&l=en" })));
    expect(english).toContain("A note is waiting to go into the card for Nora.");
    expect(english).toContain("https://tryethos.io/api/email/unsubscribe?t=abc&l=en");
    expect(english).toContain("Unsubscribe");
    const spanish = text(await render(GroupNudgeEmail({ locale: "es", count: 3, forName: "Nora", editorUrl: "https://tryethos.io/es/dashboard", unsubscribeUrl: "https://tryethos.io/api/email/unsubscribe?t=abc&l=es" })));
    expect(spanish).toContain("3 notas esperan en tu tarjeta para Nora.");
    expect(spanish).toContain("https://tryethos.io/es/dashboard");
    expect(spanish).toContain("Darme de baja");
    expect(groupNudgeSubject("en", 1, "Nora")).toBe("A note is waiting to go into the card for Nora");
    expect(groupNudgeSubject("en", 2, "Nora")).toBe("2 notes are waiting to go into the card for Nora");
    expect(groupNudgeSubject("es", 1, "Nora")).toBe("Una nota espera en tu tarjeta para Nora");
  });
});
