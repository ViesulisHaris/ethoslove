/**
 * The daily job for group cards, against the in-memory database: each row of "what is kept and for
 * how long" (docs/GROUP.md) at its boundary, the drafts it keeps from the seven-day sweep and the
 * ones it stops keeping, the files it removes, and what it does to a database that has no group
 * tables yet (it reports, and changes nothing).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/commerce/db";
import { GROUP_RETENTION } from "@/lib/group/limits";
import { groupNotice } from "@/lib/group/notice";
import { FakeDb } from "./helpers/fake-db";

const state = vi.hoisted(() => ({ sent: [] as Record<string, unknown>[], sendOk: true }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/email/notify", () => ({ sendGroupSigned: async (args: Record<string, unknown>) => (state.sent.push(args), state.sendOk) }));

const { runGroupRetention } = await import("@/lib/group/retention");

const NOW = Date.parse("2026-12-20T03:00:00Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const at = (ms: number) => new Date(ms).toISOString();
const USER = "11111111-1111-4111-8111-111111111111";
const uuid = (prefix: string, n: number) => `${prefix.repeat(8)}-${prefix.repeat(4)}-4${prefix.repeat(3)}-8${prefix.repeat(3)}-${String(n).padStart(12, "0")}`;
const groupId = (n: number) => uuid("a", n);
const giftId = (n: number) => uuid("b", n);
const entryId = (n: number) => uuid("c", n);

const gift = (n: number, over: Record<string, unknown> = {}) => ({ id: giftId(n), short_id: `card${n}aaaa`, user_id: USER, status: "draft", template_slug: "group-reference", data: {}, password_hash: null, updated_at: at(NOW - 6 * DAY), ...over });
const group = (n: number, over: Record<string, unknown> = {}) => ({
  id: groupId(n),
  gift_id: giftId(n),
  user_id: USER,
  locale: "en",
  from_name: "Tom",
  for_name: "Nora",
  created_at: at(NOW - 10 * DAY),
  closes_at: at(NOW + 20 * DAY),
  closed_at: null,
  sent_at: null,
  ...over,
});
const entry = (n: number, groupN: number, over: Record<string, unknown> = {}) => ({
  id: entryId(n),
  group_id: groupId(groupN),
  status: "pending",
  name: "Mum",
  note: "Forty is nothing.",
  photo_path: null,
  agreed: "yes",
  report_ref: "aaaaaaaa",
  withdraw_sha256: "f".repeat(64),
  item_key: null,
  email: null,
  email_confirmed_at: null,
  emailed_at: null,
  decided_at: null,
  scrubbed_at: null,
  created_at: at(NOW - DAY),
  ...over,
});
const address = { email: "mum@example.test", email_sha256: "e".repeat(64), email_consent: "We'll email you once.", email_consent_at: at(NOW - DAY) };

let fake: FakeDb;
let removed: { bucket: string; names: string[] }[];
let orphans: string[];
let rpcCalls: { fn: string; args: unknown }[];

/** The in-memory tables, with Storage and the one function the job calls stood in for. */
function admin(): Db {
  return Object.assign(fake.db, {
    rpc: async (fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      return { data: orphans.map((name) => ({ name })), error: null };
    },
    storage: {
      from: (bucket: string) => ({
        remove: async (names: string[]) => {
          removed.push({ bucket, names });
          return { data: null, error: null };
        },
      }),
    },
  }) as unknown as Db;
}
function seed(tables: { gifts?: Record<string, unknown>[]; gift_groups?: Record<string, unknown>[]; gift_contributions?: Record<string, unknown>[]; email_optouts?: Record<string, unknown>[] }) {
  fake = new FakeDb({ gifts: [], gift_groups: [], gift_contributions: [], email_optouts: [], ...tables }, NOW);
}
const rows = () => fake.rows("gift_contributions");
const row = (n: number) => rows().find((r) => r.id === entryId(n));
const removedFiles = () => removed.flatMap((call) => call.names);

beforeEach(() => {
  removed = [];
  orphans = [];
  rpcCalls = [];
  state.sent = [];
  state.sendOk = true;
  seed({});
});

describe("a note decided against", () => {
  it("keeps its words for the sender's Undo, and loses them, its photo and its address a day on", async () => {
    const justOver = at(NOW - GROUP_RETENTION.undoHours * HOUR - 1000);
    const justUnder = at(NOW - GROUP_RETENTION.undoHours * HOUR + 1000);
    seed({
      gifts: [gift(1)],
      gift_groups: [group(1)],
      gift_contributions: [
        entry(1, 1, { status: "rejected", decided_at: justOver, photo_path: `${groupId(1)}/${entryId(1)}.webp`, photo_width: 800, photo_height: 600, ...address }),
        entry(2, 1, { status: "removed", decided_at: justOver, item_key: "abcdefghij" }),
        entry(3, 1, { status: "withdrawn", decided_at: justOver }),
        entry(4, 1, { status: "rejected", decided_at: justUnder, photo_path: `${groupId(1)}/${entryId(4)}.webp` }),
        entry(5, 1, { status: "pending" }),
        entry(6, 1, { status: "approved", decided_at: justOver, item_key: "bcdefghijk" }),
      ],
    });
    const result = await runGroupRetention(admin(), NOW);
    expect(result).toMatchObject({ scrubbed: 3 });
    expect(result.error).toBeUndefined();
    for (const n of [1, 2, 3]) expect(row(n)).toMatchObject({ name: null, note: null, photo_path: null, photo_width: null, photo_height: null, email: null, email_sha256: null, email_consent: null, email_consent_at: null, withdraw_sha256: null, scrubbed_at: at(NOW) });
    // The row itself stays, with what it was: the group's limits still count it.
    expect(rows()).toHaveLength(6);
    expect(row(1)?.status).toBe("rejected");
    // A day is not up, a note still waiting, a note in the card: untouched.
    expect(row(4)).toMatchObject({ name: "Mum", scrubbed_at: null });
    expect(row(5)).toMatchObject({ name: "Mum", note: "Forty is nothing.", scrubbed_at: null });
    expect(row(6)).toMatchObject({ name: "Mum", scrubbed_at: null });
    expect(removedFiles()).toEqual([`${groupId(1)}/${entryId(1)}.webp`]);
    expect(removed[0].bucket).toBe("contributions");
  });

  it("is not scrubbed twice", async () => {
    seed({ gifts: [gift(1)], gift_groups: [group(1)], gift_contributions: [entry(1, 1, { status: "rejected", decided_at: at(NOW - 3 * DAY), name: null, note: null, scrubbed_at: at(NOW - 2 * DAY) })] });
    expect((await runGroupRetention(admin(), NOW)).scrubbed).toBe(0);
    expect(row(1)?.scrubbed_at).toBe(at(NOW - 2 * DAY));
  });
});

describe("an address that never said yes", () => {
  it("is forgotten after seven days; the note it came with stays", async () => {
    seed({
      gifts: [gift(1)],
      gift_groups: [group(1, { created_at: at(NOW - 12 * DAY) })],
      gift_contributions: [
        entry(1, 1, { ...address, created_at: at(NOW - GROUP_RETENTION.unconfirmedDays * DAY - 1000) }),
        entry(2, 1, { ...address, created_at: at(NOW - GROUP_RETENTION.unconfirmedDays * DAY + 1000) }),
        entry(3, 1, { ...address, created_at: at(NOW - 9 * DAY), email_confirmed_at: at(NOW - 8 * DAY) }),
      ],
    });
    const result = await runGroupRetention(admin(), NOW);
    expect(result.addressesForgotten).toBe(1);
    expect(row(1)).toMatchObject({ email: null, email_sha256: null, email_consent: null, email_consent_at: null, name: "Mum", note: "Forty is nothing.", status: "pending" });
    expect(row(2)?.email).toBe("mum@example.test");
    expect(row(3)?.email).toBe("mum@example.test");
  });
});

describe("a card that was sent", () => {
  it("is cleared a day inside what every contributor was told: the job runs once a day, and 'within 7 days' has to be true at any hour", async () => {
    expect(groupNotice("en", "Tom", true)).toContain(`deleted within ${GROUP_RETENTION.sentPromiseDays} days of the card being sent`);
    expect(groupNotice("es", "Tomás", true)).toContain(`se borra en los ${GROUP_RETENTION.sentPromiseDays} días siguientes al envío`);
    expect(GROUP_RETENTION.sentPromiseDays).toBe(7);
    expect(GROUP_RETENTION.afterSentDays + 1).toBeLessThanOrEqual(GROUP_RETENTION.sentPromiseDays);

    // The worst case: sent a moment after one run, so that the run six days on just misses it. The
    // next run, a day later, takes it: still inside seven days of sending.
    const sentAt = NOW - GROUP_RETENTION.afterSentDays * DAY + 1000;
    seed({ gifts: [gift(1, { status: "live" })], gift_groups: [group(1, { sent_at: at(sentAt) })], gift_contributions: [entry(1, 1), entry(2, 1, { status: "approved", item_key: "abcdefghij" })] });
    expect((await runGroupRetention(admin(), NOW)).purged).toBe(0);
    const next = NOW + DAY;
    expect((await runGroupRetention(admin(), next)).purged).toBe(2);
    expect(next - sentAt).toBeLessThan(GROUP_RETENTION.sentPromiseDays * DAY);
    expect(rows()).toEqual([]);
  });

  it("loses every note six days after sending, waiting ones included, and their files", async () => {
    const live = (n: number) => gift(n, { status: "live", data: { contributions: [{ key: "abcdefghij", name: "Mum", note: "x" }] } });
    seed({
      gifts: [live(1), live(2)],
      gift_groups: [group(1, { sent_at: at(NOW - GROUP_RETENTION.afterSentDays * DAY - 1000) }), group(2, { sent_at: at(NOW - GROUP_RETENTION.afterSentDays * DAY + 1000) })],
      gift_contributions: [
        entry(1, 1, { status: "approved", item_key: "abcdefghij", photo_path: `${groupId(1)}/${entryId(1)}.webp` }),
        entry(2, 1, { status: "pending", photo_path: `${groupId(1)}/${entryId(2)}.webp` }),
        entry(3, 1, { status: "rejected", decided_at: at(NOW - HOUR) }),
        entry(4, 2, { status: "approved", item_key: "abcdefghij" }),
        entry(5, 2, { status: "pending" }),
      ],
    });
    const result = await runGroupRetention(admin(), NOW);
    expect(result).toMatchObject({ purged: 3 });
    expect(rows().map((r) => r.id)).toEqual([entryId(4), entryId(5)]);
    expect(removedFiles().sort()).toEqual([`${groupId(1)}/${entryId(1)}.webp`, `${groupId(1)}/${entryId(2)}.webp`]);
    // What was added lives on in the gift itself: the job never writes a sent gift.
    expect(fake.rows("gifts")[0]).toMatchObject({ status: "live", data: { contributions: [{ key: "abcdefghij", name: "Mum", note: "x" }] }, updated_at: at(NOW - 6 * DAY) });
  });

  it("with a date on it that has not arrived keeps only the notes still owed its link, until it has gone", async () => {
    const inCard = { contributions: [{ key: "abcdefghij", name: "Mum", note: "x" }] };
    seed({
      gifts: [gift(1, { status: "scheduled", data: inCard })],
      gift_groups: [group(1, { sent_at: at(NOW - 8 * DAY) })],
      gift_contributions: [
        entry(1, 1, { status: "approved", item_key: "abcdefghij", ...address, email_confirmed_at: at(NOW - 9 * DAY) }),
        entry(2, 1, { status: "approved", item_key: "bcdefghijk", ...address, email: "dad@example.test" }),
        entry(3, 1, { status: "pending" }),
      ],
    });
    const first = await runGroupRetention(admin(), NOW);
    expect(first).toMatchObject({ purged: 2, emailed: 0 });
    expect(rows().map((r) => r.id)).toEqual([entryId(1)]);
    expect(state.sent).toEqual([]);

    // The day comes: the email goes, the address with it, and the note on the same run.
    fake.rows("gifts")[0].status = "live";
    const second = await runGroupRetention(admin(), NOW + DAY);
    expect(second).toMatchObject({ emailed: 1, purged: 1 });
    expect(state.sent).toHaveLength(1);
    expect(state.sent[0]).toMatchObject({ to: "mum@example.test", giftUrl: expect.stringMatching(/\/g\/card1aaaa$/) });
    expect(rows()).toEqual([]);
  });
});

describe("a card never sent", () => {
  it("loses every note fourteen days after its link ran out, not a day sooner", async () => {
    seed({
      gifts: [gift(1), gift(2)],
      gift_groups: [
        group(1, { created_at: at(NOW - 50 * DAY), closes_at: at(NOW - GROUP_RETENTION.afterClosedDays * DAY - 1000) }),
        group(2, { created_at: at(NOW - 50 * DAY), closes_at: at(NOW - GROUP_RETENTION.afterClosedDays * DAY + 1000) }),
      ],
      gift_contributions: [entry(1, 1, { photo_path: `${groupId(1)}/${entryId(1)}.webp` }), entry(2, 1, { status: "approved", item_key: "abcdefghij" }), entry(3, 2)],
    });
    const result = await runGroupRetention(admin(), NOW);
    expect(result.purged).toBe(2);
    expect(rows().map((r) => r.id)).toEqual([entryId(3)]);
    expect(removedFiles()).toEqual([`${groupId(1)}/${entryId(1)}.webp`]);
  });
});

describe("however many cards have been sent", () => {
  it("every note that is due goes, even when hundreds of older cards were sent before it", async () => {
    // 620 cards sent long ago, their notes long deleted (a sent group's row lives as long as its gift),
    // and then twenty sent a week ago that still have theirs.
    const old = Array.from({ length: 620 }, (_, i) => group(i + 1, { sent_at: at(NOW - 40 * DAY) }));
    const due = Array.from({ length: 20 }, (_, i) => group(700 + i, { sent_at: at(NOW - 7 * DAY) }));
    seed({ gift_groups: [...old, ...due], gift_contributions: due.map((_, i) => entry(i + 1, 700 + i, { photo_path: `${groupId(700 + i)}/${entryId(i + 1)}.webp` })) });
    const result = await runGroupRetention(admin(), NOW);
    expect(result.error).toBeUndefined();
    expect(result.purged).toBe(20);
    expect(rows()).toEqual([]);
    expect(removedFiles()).toHaveLength(20);
  });

  it("goes through more notes than one read holds, takes the ones that are due and leaves the rest", async () => {
    // Twenty cards sent a week ago and twenty still open, sixty notes each: 2,400 notes, read a thousand at a time.
    const sent = Array.from({ length: 20 }, (_, i) => group(i + 1, { sent_at: at(NOW - 7 * DAY) }));
    const open = Array.from({ length: 20 }, (_, i) => group(100 + i));
    let n = 0;
    const notes = [...sent, ...open].flatMap((_, g) => Array.from({ length: 60 }, () => entry(++n, g < 20 ? g + 1 : 100 + g - 20)));
    seed({ gift_groups: [...sent, ...open], gift_contributions: notes });
    const result = await runGroupRetention(admin(), NOW);
    expect(result.error).toBeUndefined();
    expect(result.purged).toBe(1200);
    expect(rows()).toHaveLength(1200);
    expect(rows().every((row) => (row.group_id as string) >= groupId(100))).toBe(true);
  });

  it("no filter ever carries more than a hundred ids (each is 36 characters of an address)", async () => {
    const sent = Array.from({ length: 150 }, (_, i) => group(i + 1, { sent_at: at(NOW - 7 * DAY) }));
    seed({ gifts: sent.map((_, i) => gift(i + 1, { status: "live" })), gift_groups: sent, gift_contributions: sent.map((_, i) => entry(i + 1, i + 1)) });
    const db = admin();
    const sizes: number[] = [];
    const from = db.from.bind(db);
    (db as unknown as { from: (table: string) => unknown }).from = (table: string) => {
      const query = from(table as never) as unknown as { in: (column: string, values: unknown[]) => unknown };
      const inList = query.in.bind(query);
      query.in = (column: string, values: unknown[]) => (sizes.push(values.length), inList(column, values));
      return query;
    };
    expect((await runGroupRetention(db, NOW)).purged).toBe(150);
    expect(sizes.length).toBeGreaterThan(0);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(100);
  });
});

describe("the draft behind a group", () => {
  it("is kept even on a run where the rest of the job fails", async () => {
    seed({ gifts: [gift(1)], gift_groups: [group(1)], gift_contributions: [entry(1, 1)] });
    fake.failNext("gift_contributions", "select", "connection lost");
    const result = await runGroupRetention(admin(), NOW);
    expect(result).toMatchObject({ draftsKept: 1, error: "connection lost" });
    expect(fake.rows("gifts")[0].updated_at).toBe(at(NOW));
  });

  it("is touched only once it has gone four days untouched, so it is not sent to the top of My gifts every morning", async () => {
    seed({
      gifts: [gift(1, { updated_at: at(NOW - 2 * DAY) }), gift(2, { updated_at: at(NOW - GROUP_RETENTION.draftTouchDays * DAY - 1000) }), gift(3, { updated_at: at(NOW - GROUP_RETENTION.draftTouchDays * DAY + 1000) })],
      gift_groups: [group(1), group(2), group(3)],
    });
    expect((await runGroupRetention(admin(), NOW)).draftsKept).toBe(1);
    expect(fake.rows("gifts").map((row) => row.updated_at)).toEqual([at(NOW - 2 * DAY), at(NOW), at(NOW - GROUP_RETENTION.draftTouchDays * DAY + 1000)]);
    // Early enough that two missed runs still leave it short of the sweep's seven days.
    expect(GROUP_RETENTION.draftTouchDays + 2).toBeLessThan(7);
  });

  it("reaches every open group, however many there are", async () => {
    const many = Array.from({ length: 1100 }, (_, i) => i + 1);
    seed({ gifts: many.map((n) => gift(n)), gift_groups: many.map((n) => group(n, { closes_at: at(NOW + (n % 25) * DAY + n) })) });
    expect((await runGroupRetention(admin(), NOW)).draftsKept).toBe(1100);
  });

  it("is touched while its link is open, and for fourteen days after it ran out, so the draft sweep leaves it", async () => {
    seed({
      gifts: [gift(1), gift(2), gift(3), gift(4, { status: "live" }), gift(5), gift(6)],
      gift_groups: [
        group(1),
        // Closed by hand, early: the clock is the day it would have run out, not the day it was closed.
        group(2, { closed_at: at(NOW - 20 * DAY) }),
        group(3, { created_at: at(NOW - 50 * DAY), closes_at: at(NOW - GROUP_RETENTION.afterClosedDays * DAY + 1000) }),
        group(4, { sent_at: at(NOW - DAY) }),
        group(5, { created_at: at(NOW - 50 * DAY), closes_at: at(NOW - GROUP_RETENTION.afterClosedDays * DAY - 1000) }),
      ],
    });
    const result = await runGroupRetention(admin(), NOW);
    expect(result.draftsKept).toBe(3);
    const touched = (n: number) => fake.rows("gifts")[n - 1].updated_at;
    for (const n of [1, 2, 3]) expect(touched(n), `gift ${n}`).toBe(at(NOW));
    // A card that went out, a link two weeks gone, a draft with no group: none of them is written.
    for (const n of [4, 5, 6]) expect(touched(n), `gift ${n}`).toBe(at(NOW - 6 * DAY));
  });

  it("writes nothing but the draft's own date, and never a gift that is not a draft", async () => {
    seed({ gifts: [gift(1, { data: { message: "hi" } }), gift(2, { status: "scheduled" })], gift_groups: [group(1), group(2)] });
    await runGroupRetention(admin(), NOW);
    expect(fake.rows("gifts")[0]).toEqual({ ...gift(1, { data: { message: "hi" } }), updated_at: at(NOW) });
    expect(fake.rows("gifts")[1]).toEqual(gift(2, { status: "scheduled" }));
  });
});

describe("files nothing points at", () => {
  it("are asked for from the database and removed from the bucket, a hundred at a time", async () => {
    orphans = Array.from({ length: 150 }, (_, i) => `${groupId(9)}/${entryId(i)}.webp`);
    const result = await runGroupRetention(admin(), NOW);
    expect(rpcCalls).toEqual([{ fn: "group_photo_orphans", args: { p_limit: 500 } }]);
    expect(result.orphansRemoved).toBe(150);
    expect(removed.map((call) => [call.bucket, call.names.length])).toEqual([
      ["contributions", 100],
      ["contributions", 50],
    ]);
  });
});

describe("the card you signed, as a backstop", () => {
  it("goes to a confirmed address whose card is out and still holds the note, whenever that happened", async () => {
    seed({
      gifts: [gift(1, { status: "live", data: { contributions: [{ key: "abcdefghij", name: "Mum", note: "x" }] } })],
      gift_groups: [group(1, { sent_at: at(NOW - 3 * DAY) })],
      gift_contributions: [entry(1, 1, { status: "approved", item_key: "abcdefghij", ...address, email_confirmed_at: at(NOW - HOUR) })],
    });
    const result = await runGroupRetention(admin(), NOW);
    expect(result.emailed).toBe(1);
    expect(row(1)).toMatchObject({ email: null, email_sha256: null, emailed_at: at(NOW) });
  });

  it("sends nothing for a draft: the card is not out", async () => {
    seed({ gifts: [gift(1)], gift_groups: [group(1)], gift_contributions: [entry(1, 1, { status: "approved", item_key: "abcdefghij", ...address, email_confirmed_at: at(NOW - HOUR) })] });
    expect((await runGroupRetention(admin(), NOW)).emailed).toBe(0);
    expect(state.sent).toEqual([]);
  });
});

describe("a database without migration 0023", () => {
  it("reports it and changes nothing: the job never throws", async () => {
    fake = new FakeDb({ gifts: [gift(1)] }, NOW, { missingTables: ["gift_groups", "gift_contributions"] });
    const result = await runGroupRetention(admin(), NOW);
    expect(result.error).toMatch(/gift_contributions/);
    expect(result).toMatchObject({ scrubbed: 0, addressesForgotten: 0, purged: 0, draftsKept: 0, orphansRemoved: 0, emailed: 0 });
    expect(fake.rows("gifts")).toEqual([gift(1)]);
    expect(removed).toEqual([]);
    expect(rpcCalls).toEqual([]);
    // Not one statement reached a table that exists.
    expect(fake.calls).toEqual([]);
  });

  it("a failure halfway is reported too, with what was done before it", async () => {
    seed({ gifts: [gift(1)], gift_groups: [group(1)], gift_contributions: [entry(1, 1, { status: "rejected", decided_at: at(NOW - 2 * DAY) })] });
    fake.failNext("gift_groups", "select", "connection lost");
    const result = await runGroupRetention(admin(), NOW);
    expect(result).toMatchObject({ scrubbed: 1, error: "connection lost" });
  });
});
