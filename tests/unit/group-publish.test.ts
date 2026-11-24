/**
 * Sending a group card, through the real publish action against the in-memory database: what it
 * asks for, what it does to the group once the card has gone (the link closes, whoever signed it
 * and asked is sent its link), and what it leaves alone when the card has a date on it, when group
 * cards are switched off, and when migration 0023 is not there. The reference template stands in
 * for a gallery template that takes contributions, as it does in group-money.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoData } from "@/templates/_group-reference/demo-data";
import { manifest as reference } from "@/templates/_group-reference/manifest";
import { fieldsSchema as referenceFields } from "@/templates/_group-reference/schema";
import { FakeDb } from "./helpers/fake-db";

const state = vi.hoisted(() => ({ client: null as unknown, user: null as unknown, on: true, signed: [] as Record<string, unknown>[], tasks: [] as (() => unknown)[], signedAtAnswer: 0 }));
vi.mock("server-only", () => ({}));
// Work handed to after() waits here until the action has answered, as it does on the server.
vi.mock("next/server", async (original) => ({ ...(await original<typeof import("next/server")>()), after: (task: () => unknown) => void state.tasks.push(task) }));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: async () => state.client, bearerToken: async () => null }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.client }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/group/flag", () => ({ groupGiftsEnabled: () => state.on }));
vi.mock("@/lib/email/notify", () => ({ notifyPublished: async () => {}, sendGroupSigned: async (args: Record<string, unknown>) => (state.signed.push(args), true) }));
vi.mock("@/templates/manifests", async (original) => {
  const real = await original<typeof import("@/templates/manifests")>();
  return { ...real, isTemplateSlug: (slug: string) => slug === "group-reference" || real.isTemplateSlug(slug), getManifest: (slug: string) => (slug === "group-reference" ? reference : real.getManifest(slug)) };
});
vi.mock("@/templates/schemas", async (original) => {
  const real = await original<typeof import("@/templates/schemas")>();
  return { ...real, loadFieldsSchema: async (slug: string) => (slug === "group-reference" ? referenceFields : real.loadFieldsSchema(slug)) };
});

const { publishGift, saveDraft } = await import("@/app/actions/gift");

const NOW = Date.parse("2026-12-01T10:00:00Z");
const DAY = 86_400_000;
const at = (ms: number) => new Date(ms).toISOString();
const USER = "11111111-1111-4111-8111-111111111111";
const GIFT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const GROUP = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const SLUG = "group-reference";

/** The card as the editor sends it: the demo's words and two of its notes, one with a photo in the gift's own folder. */
const card = {
  ...demoData.en,
  contributions: [
    { key: "abcdefghij", name: "Mum", note: "Forty is nothing. Ring me.", photo: { url: `gifts/${GIFT}/cabcdefghij.webp`, width: 800, height: 600 } },
    { key: "bcdefghijk", name: "Dad", note: "The kettle's on." },
  ],
};
const entry = (n: number, over: Record<string, unknown>) => ({
  id: `cccccccc-cccc-4ccc-8ccc-00000000000${n}`,
  group_id: GROUP,
  status: "approved",
  name: "x",
  note: "y",
  agreed: "z",
  report_ref: "aaaaaaaa",
  email: null,
  email_sha256: null,
  email_confirmed_at: null,
  emailed_at: null,
  created_at: at(NOW - DAY),
  ...over,
});

let fake: FakeDb;
function seed({ unlocks = [SLUG, `group:${SLUG}`], withGroup = true, missingTables = [] as string[] } = {}) {
  fake = new FakeDb(
    {
      gifts: [{ id: GIFT, short_id: "card234ab", user_id: USER, template_slug: SLUG, status: "draft", locale: "en", unlock_at: null, password_hash: null, watermark: true, data: {} }],
      template_unlocks: unlocks.map((template_slug, i) => ({ id: `u${i}`, user_id: USER, template_slug, purchase_id: null })),
      email_optouts: [],
      ...(missingTables.length
        ? {}
        : {
            gift_groups: withGroup ? [{ id: GROUP, gift_id: GIFT, user_id: USER, locale: "en", from_name: "Tom", for_name: "Nora", created_at: at(NOW - 2 * DAY), closes_at: at(NOW + 28 * DAY), closed_at: null, sent_at: null }] : [],
            gift_contributions: withGroup
              ? [
                  entry(1, { item_key: "abcdefghij", email: "mum@example.test", email_sha256: "e".repeat(64), email_confirmed_at: at(NOW - DAY) }),
                  // Asked, never confirmed: nothing may go there.
                  entry(2, { item_key: "bcdefghijk", email: "dad@example.test", email_sha256: "d".repeat(64) }),
                ]
              : [],
          }),
    },
    NOW,
    { missingTables },
  );
  state.client = {
    from: (table: string) => fake.db.from(table as never),
    rpc: async (name: string, args: Record<string, unknown>) => {
      fake.calls.push({ table: name, op: "rpc" });
      if (name === "has_template_unlock") return { data: fake.rows("template_unlocks").some((row) => row.user_id === args.p_user && (row.template_slug === "*" || row.template_slug === args.p_slug)), error: null };
      return { data: null, error: null };
    },
  };
  state.user = { id: USER, email: "tom@example.test", app_metadata: {} };
}
const stored = () => fake.rows("gifts")[0];
const groupRow = () => fake.rows("gift_groups")[0];
/** Publishes, notes how many emails had gone by the time the sender had their answer, then lets the work left for afterwards run. */
const send = async (over: Record<string, unknown> = {}) => {
  const result = await publishGift({ giftId: GIFT, data: card, removeWatermark: true, ...over });
  state.signedAtAnswer = state.signed.length;
  for (const task of state.tasks.splice(0)) await task();
  return result;
};
const notes = () => (stored().data as { contributions?: { key: string }[] }).contributions?.map((item) => item.key);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  state.on = true;
  state.signed = [];
  state.tasks = [];
  state.signedAtAnswer = 0;
  vi.spyOn(console, "error").mockImplementation(() => {});
  return () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  };
});

describe("sending a group card", () => {
  it("asks for the group unlock, and Everything is not it", async () => {
    seed({ unlocks: ["*"] });
    expect(await send()).toMatchObject({ ok: false, error: "payment_required" });
    expect(stored().status).toBe("draft");
    expect(groupRow().sent_at).toBeNull();
    expect(state.signed).toEqual([]);
  });

  it("goes out with its notes, closes its link, and sends the card to whoever signed it and said yes", async () => {
    seed();
    expect(await send()).toEqual({ ok: true, data: { shortId: "card234ab", status: "live" } });
    expect(stored()).toMatchObject({ status: "live", watermark: false });
    expect((stored().data as typeof card).contributions).toEqual(card.contributions);
    expect(groupRow().sent_at).toBe(at(NOW));
    expect(state.signed).toHaveLength(1);
    // The Send tap is not kept waiting for the emails: they go once it has its answer.
    expect(state.signedAtAnswer).toBe(0);
    expect(state.signed[0]).toMatchObject({ to: "mum@example.test", fromName: "Tom", giftUrl: expect.stringMatching(/\/g\/card234ab$/) });
    const [mum, dad] = fake.rows("gift_contributions");
    expect(mum).toMatchObject({ email: null, emailed_at: at(NOW) });
    expect(dad).toMatchObject({ email: "dad@example.test", emailed_at: null });
  });

  it("with a date on it: the link closes now, the email waits for the day", async () => {
    seed();
    const unlockAt = at(NOW + 5 * DAY);
    expect(await send({ schedule: { unlockAt, timezone: "Europe/London" } })).toMatchObject({ ok: true, data: { status: "scheduled" } });
    expect(groupRow().sent_at).toBe(at(NOW));
    expect(state.signed).toEqual([]);
    expect(fake.rows("gift_contributions")[0]).toMatchObject({ email: "mum@example.test", emailed_at: null });
  });

  it("sent again with a change keeps the day its link first closed", async () => {
    seed();
    await send();
    vi.setSystemTime(NOW + DAY);
    expect((await send()).ok).toBe(true);
    expect(groupRow().sent_at).toBe(at(NOW));
    expect(state.signed).toHaveLength(1);
  });

  it("a card with notes and no group behind it (a duplicate) goes out the same, and touches no one's notes", async () => {
    seed({ withGroup: false });
    expect((await send()).ok).toBe(true);
    expect(state.signed).toEqual([]);
  });
});

describe("a note that is no longer the card's to carry", () => {
  const takeOut = (n: number, status: string) => Object.assign(fake.rows("gift_contributions")[n], { status, decided_at: at(NOW - 60_000) });

  it("taken back by its writer: it never goes out, whatever the editor still held, and the editor is told which", async () => {
    seed();
    takeOut(0, "withdrawn");
    expect(await send()).toEqual({ ok: true, data: { shortId: "card234ab", status: "live", takenBack: ["abcdefghij"] } });
    expect(stored().status).toBe("live");
    expect(notes()).toEqual(["bcdefghijk"]);
    // Nothing of the note is in what recipients are sent, and nobody is told they signed it.
    expect(JSON.stringify(stored().data)).not.toContain("Forty is nothing");
    expect(state.signed).toEqual([]);
  });

  it("removed or turned down on another device: the same", async () => {
    for (const status of ["removed", "rejected"]) {
      seed();
      takeOut(1, status);
      expect((await send()).ok).toBe(true);
      expect(notes(), status).toEqual(["abcdefghij"]);
    }
  });

  it("stays out after its words have been scrubbed: the key is what is remembered", async () => {
    seed();
    Object.assign(fake.rows("gift_contributions")[0], { status: "withdrawn", name: null, note: null, withdraw_sha256: null, decided_at: at(NOW - 2 * DAY), scrubbed_at: at(NOW - DAY) });
    await send();
    expect(notes()).toEqual(["bcdefghijk"]);
  });

  it("a card left with no notes is an ordinary gift: it needs no group unlock", async () => {
    seed({ unlocks: [SLUG] });
    takeOut(0, "withdrawn");
    takeOut(1, "withdrawn");
    expect(await send()).toMatchObject({ ok: true, data: { takenBack: ["abcdefghij", "bcdefghijk"] } });
    expect(notes()).toEqual([]);
  });

  it("a note added back after Undo has a new key, so the old one being out does not touch it", async () => {
    seed();
    // Removed, then restored and added again: the row holds the new key; the old one is on no row.
    Object.assign(fake.rows("gift_contributions")[0], { status: "approved", item_key: "zzzzzzzzzz" });
    expect(await send()).toEqual({ ok: true, data: { shortId: "card234ab", status: "live" } });
    expect(notes()).toEqual(["abcdefghij", "bcdefghijk"]);
  });

  it("if the notes can't be read, the card is not sent: better late than with a note someone took back", async () => {
    seed();
    takeOut(0, "withdrawn");
    fake.failNext("gift_contributions", "select", "connection lost");
    expect(await send()).toEqual({ ok: false, error: "group_unavailable" });
    expect(stored().status).toBe("draft");
    expect(groupRow().sent_at).toBeNull();
  });

  it("an edit to a card that is already out drops it too", async () => {
    seed();
    await send();
    expect(notes()).toEqual(["abcdefghij", "bcdefghijk"]);
    // The sender takes Dad's note out on their phone; a laptop left open still holds it and saves.
    takeOut(1, "removed");
    expect((await saveDraft({ giftId: GIFT, data: card })).ok).toBe(true);
    expect(notes()).toEqual(["abcdefghij"]);
    expect(stored().status).toBe("live");
  });
});

describe("what sending never depends on", () => {
  it("before migration 0023 the card still goes out: the missing tables are logged, not thrown", async () => {
    seed({ missingTables: ["gift_groups", "gift_contributions"] });
    expect(await send()).toEqual({ ok: true, data: { shortId: "card234ab", status: "live" } });
    expect(stored().status).toBe("live");
  });

  it("switched off, sending reads no group table at all and sends nobody anything", async () => {
    seed();
    state.on = false;
    const result = await send();
    expect(result.ok).toBe(true);
    expect(fake.calls.filter((call) => call.table.startsWith("gift_groups") || call.table === "gift_contributions")).toEqual([]);
    expect(groupRow().sent_at).toBeNull();
    expect(state.signed).toEqual([]);
  });
});
