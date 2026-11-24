/**
 * Group cards must change nothing for a gift that has no contributions. This file drives the real
 * server actions (saving a draft, editing a live gift, publishing) for ordinary gifts and records
 * what they answer, every statement they send to the database in order, and what ends up stored.
 *
 * The expectations below were recorded from the code as it is live (origin/main, 4ad3c39d, before
 * any group card code) and this file imports nothing that didn't exist then, so it can be run
 * against that code again: check out `src` at that commit, run this file, and it passes there and
 * here alike. Same answers, same statements in the same order, same rows.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoData as letterDemo } from "@/templates/the-letter/demo-data";
import { demoData as vinylDemo } from "@/templates/vinyl/demo-data";
import { FakeDb } from "./helpers/fake-db";

const state = vi.hoisted(() => ({ client: null as unknown, admin: null as unknown, user: null as unknown, notified: [] as unknown[][] }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: async () => state.client, bearerToken: async () => null }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.admin }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/email/notify", () => ({ notifyPublished: async (...args: unknown[]) => void state.notified.push(args) }));

const { publishGift, saveDraft } = await import("@/app/actions/gift");

const NOW = Date.parse("2026-12-01T10:00:00Z");
const USER = "11111111-1111-4111-8111-111111111111";
const GIFT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const photo = (n: number) => ({ id: `p${n}`, url: `gifts/${GIFT}/p${n}.webp`, width: 800, height: 600, caption: "", alt: "" });

/** A whole Letter and a whole Vinyl as the editor sends them: the demo's words, with stored photos. */
const letter = { ...letterDemo.en, photos: [photo(1), photo(2)], music: undefined, countdown: undefined, surprise: undefined, video: undefined };
const vinyl = { ...vinylDemo.en, photos: [photo(1), photo(2), photo(3)], music: undefined, countdown: undefined, surprise: undefined, video: undefined };

let fake: FakeDb;
/** Every statement sent to the database so far, in order: table statements and function calls alike. */
const statements = () => fake.calls.map((call) => `${call.op} ${call.table}`);
function seed(gift: Record<string, unknown>, unlocks: string[] = []) {
  fake = new FakeDb({ gifts: [{ id: GIFT, short_id: "abc234def", user_id: USER, locale: "en", unlock_at: null, password_hash: null, watermark: true, data: {}, ...gift }], template_unlocks: unlocks.map((template_slug, i) => ({ id: `u${i}`, user_id: USER, template_slug, purchase_id: null })) }, NOW);
  // The in-memory database records each table statement as it runs; function calls are added to the
  // same list, so the order between the two is kept. Both clients (the user's own and the service
  // role's) write to it.
  const client = {
    from: (table: string) => fake.db.from(table as never),
    rpc: async (name: string, args: Record<string, unknown>) => {
      fake.calls.push({ table: name, op: "rpc" });
      if (name === "has_template_unlock") return { data: fake.rows("template_unlocks").some((row) => row.user_id === args.p_user && (row.template_slug === "*" || row.template_slug === args.p_slug)), error: null };
      return { data: null, error: null };
    },
  };
  state.client = client;
  state.admin = client;
  state.user = { id: USER, email: "tom@example.test", app_metadata: {} };
  state.notified = [];
}
const stored = () => fake.rows("gifts")[0];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  return () => vi.useRealTimers();
});

describe("saving a draft, as before", () => {
  it("stores what the editor sent, under the row's own template", async () => {
    seed({ template_slug: "the-letter", status: "draft" });
    expect(await saveDraft({ giftId: GIFT, data: letter, expectDraft: true })).toEqual({ ok: true, data: { savedAt: new Date(NOW).toISOString() } });
    expect(statements()).toMatchInlineSnapshot(`
      [
        "select gifts",
        "update gifts",
      ]
    `);
    expect(Object.keys(stored().data as object).sort()).toMatchInlineSnapshot(`
      [
        "accentColor",
        "countdown",
        "fields",
        "fontPairing",
        "locale",
        "message",
        "messageStyle",
        "music",
        "photos",
        "recipientName",
        "senderName",
        "showReactionCta",
        "surprise",
        "templateSlug",
        "title",
        "version",
        "video",
        "watermark",
      ]
    `);
    expect((stored().data as { photos: unknown[] }).photos).toEqual(letter.photos);
  });

  it("an incomplete draft saves too, and junk does not", async () => {
    seed({ template_slug: "the-letter", status: "draft" });
    expect((await saveDraft({ giftId: GIFT, data: { ...letter, recipientName: undefined, senderName: undefined } })).ok).toBe(true);
    expect(await saveDraft({ giftId: GIFT, data: { ...letter, accentColor: "red" } })).toMatchObject({ ok: false, error: "invalid_data" });
    expect(statements()).toMatchInlineSnapshot(`
      [
        "select gifts",
        "update gifts",
      ]
    `);
  });
});

describe("publishing, as before", () => {
  it("a free Letter goes out free, footer on", async () => {
    seed({ template_slug: "the-letter", status: "draft" });
    expect(await publishGift({ giftId: GIFT, data: letter })).toEqual({ ok: true, data: { shortId: "abc234def", status: "live", holidayExtra: null } });
    expect(statements()).toMatchInlineSnapshot(`
      [
        "select gifts",
        "rpc has_template_unlock",
        "select gifts",
        "rpc set_gift_password",
        "update gifts",
        "select gifts",
      ]
    `);
    expect(stored()).toMatchObject({ status: "live", is_premium: false, watermark: true, unlock_at: null, locale: "en", published_at: new Date(NOW).toISOString() });
    expect(Object.keys(stored().data as object).sort()).toMatchInlineSnapshot(`
      [
        "accentColor",
        "countdown",
        "fields",
        "fontPairing",
        "freeTier",
        "holidayExtra",
        "locale",
        "message",
        "messageStyle",
        "music",
        "photos",
        "recipientName",
        "senderName",
        "showReactionCta",
        "surprise",
        "templateSlug",
        "title",
        "version",
        "video",
        "watermark",
      ]
    `);
    expect(state.notified).toHaveLength(1);
  });

  it("a premium gift with nothing paid is asked to pay, and nothing is written", async () => {
    seed({ template_slug: "vinyl", status: "draft" });
    expect(await publishGift({ giftId: GIFT, data: vinyl })).toEqual({ ok: false, error: "payment_required", problems: undefined });
    expect(statements()).toMatchInlineSnapshot(`
      [
        "select gifts",
        "rpc has_template_unlock",
        "select free_replies",
      ]
    `);
    expect(stored()).toMatchObject({ status: "draft", data: {} });
  });

  it("a premium gift with its template unlocked goes out without the footer", async () => {
    seed({ template_slug: "vinyl", status: "draft" }, ["vinyl"]);
    expect(await publishGift({ giftId: GIFT, data: vinyl })).toEqual({ ok: true, data: { shortId: "abc234def", status: "live", holidayExtra: null } });
    expect(statements()).toMatchInlineSnapshot(`
      [
        "select gifts",
        "rpc has_template_unlock",
        "select gifts",
        "rpc set_gift_password",
        "update gifts",
        "select gifts",
      ]
    `);
    expect(stored()).toMatchObject({ status: "live", is_premium: true, watermark: false });
    expect(Object.keys(stored().data as object).sort()).toMatchInlineSnapshot(`
      [
        "accentColor",
        "countdown",
        "fields",
        "fontPairing",
        "freeTier",
        "holidayExtra",
        "locale",
        "message",
        "messageStyle",
        "music",
        "photos",
        "recipientName",
        "senderName",
        "showReactionCta",
        "surprise",
        "templateSlug",
        "title",
        "version",
        "video",
        "watermark",
      ]
    `);
  });

  it("Everything covers a premium gift exactly as it did", async () => {
    seed({ template_slug: "vinyl", status: "draft" }, ["*"]);
    expect(await publishGift({ giftId: GIFT, data: vinyl, password: "sesame" })).toEqual({ ok: true, data: { shortId: "abc234def", status: "live", holidayExtra: null } });
    expect(statements()).toMatchInlineSnapshot(`
      [
        "select gifts",
        "rpc has_template_unlock",
        "select gifts",
        "rpc set_gift_password",
        "update gifts",
        "select gifts",
      ]
    `);
  });

  it("a gift that isn't ready says what is missing", async () => {
    seed({ template_slug: "vinyl", status: "draft" }, ["vinyl"]);
    const result = await publishGift({ giftId: GIFT, data: { ...vinyl, message: "" } });
    expect(result).toMatchInlineSnapshot(`
      {
        "error": "not_ready",
        "ok": false,
        "problems": [
          "message",
        ],
      }
    `);
    expect(statements()).toMatchInlineSnapshot(`
      [
        "select gifts",
        "rpc has_template_unlock",
      ]
    `);
  });

  it("someone else's gift is not found", async () => {
    seed({ template_slug: "vinyl", status: "draft", user_id: "99999999-9999-4999-8999-999999999999" });
    expect(await publishGift({ giftId: GIFT, data: vinyl })).toMatchObject({ ok: false, error: "not_found" });
    expect(statements()).toMatchInlineSnapshot(`
      [
        "select gifts",
      ]
    `);
  });
});

describe("editing a gift that is already out, as before", () => {
  it("a free live Letter takes an edit", async () => {
    seed({ template_slug: "the-letter", status: "live", data: letter });
    expect((await saveDraft({ giftId: GIFT, data: { ...letter, message: "Changed my mind about the ending." } })).ok).toBe(true);
    expect(statements()).toMatchInlineSnapshot(`
      [
        "select gifts",
        "select gifts",
        "update gifts",
      ]
    `);
    expect((stored().data as { message: string }).message).toBe("Changed my mind about the ending.");
  });

  it("a paid live gift takes an edit while its unlock is held, and is refused once it is not", async () => {
    seed({ template_slug: "vinyl", status: "live", watermark: false, data: vinyl }, ["vinyl"]);
    expect((await saveDraft({ giftId: GIFT, data: { ...vinyl, title: "Side B" } })).ok).toBe(true);
    const paid = statements();
    seed({ template_slug: "vinyl", status: "live", watermark: false, data: vinyl });
    expect(await saveDraft({ giftId: GIFT, data: { ...vinyl, title: "Side B" } })).toMatchObject({ ok: false, error: "payment_required" });
    expect({ paid, unpaid: statements() }).toMatchInlineSnapshot(`
      {
        "paid": [
          "select gifts",
          "rpc has_template_unlock",
          "select gifts",
          "update gifts",
        ],
        "unpaid": [
          "select gifts",
          "rpc has_template_unlock",
          "select free_replies",
        ],
      }
    `);
  });
});

describe("words a request may carry under `contributions`, on a template that takes none", () => {
  const notes = [{ key: "abcdefghij", name: "Mallory", note: "let me in" }];

  it("never reach the stored gift, on a draft, a live edit or a publish", async () => {
    seed({ template_slug: "the-letter", status: "draft" });
    expect((await saveDraft({ giftId: GIFT, data: { ...letter, contributions: notes } })).ok).toBe(true);
    expect("contributions" in (stored().data as object)).toBe(false);

    seed({ template_slug: "the-letter", status: "live", data: letter });
    expect((await saveDraft({ giftId: GIFT, data: { ...letter, contributions: notes } })).ok).toBe(true);
    expect("contributions" in (stored().data as object)).toBe(false);

    seed({ template_slug: "the-letter", status: "draft" });
    expect((await publishGift({ giftId: GIFT, data: { ...letter, contributions: notes } })).ok).toBe(true);
    expect("contributions" in (stored().data as object)).toBe(false);
    expect(JSON.stringify(stored())).not.toContain("Mallory");
    // And asking for it changes no statement: nothing looks for a group or its unlock.
    expect(statements().filter((line) => /gift_groups|gift_contributions|template_unlocks/.test(line))).toEqual([]);
  });
});
