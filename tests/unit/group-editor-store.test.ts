/**
 * A group card's notes in the editor's store. A note's photo is one of the gift's stored files: in
 * the editor it is shown by a signed address, and everywhere it is saved (to the server, to this
 * browser) it goes back as its Storage path. A signed address must never be what is stored: it
 * stops working in hours, and the gift page signs paths, not addresses.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GiftContribution, GiftData } from "@/lib/gift/schema";
import { giftContributionSchema } from "@/lib/gift/schema";
import { mediaUrlsAllowed } from "@/lib/gift/media-urls";
import type { EditorDraft } from "@/lib/editor/types";
import type { TemplateManifest } from "@/templates/types";
import { manifest } from "@/templates/_group-reference/manifest";

const saved = vi.hoisted(() => ({ drafts: [] as unknown[] }));
const signAssetUrls = vi.fn(async (paths: string[]) => ({ ok: true as const, data: Object.fromEntries(paths.map((p) => [p, `https://signed.test/${p}?token=abc`])) }));
const saveDraft = vi.fn(async (input: { data: unknown }) => (saved.drafts.push(input.data), { ok: true as const, data: { savedAt: "now" } }));
vi.mock("@/app/actions/gift", () => ({ ensureDraft: vi.fn(async () => ({ ok: true, data: { giftId: GIFT, shortId: "abc234def" } })), saveDraft, signAssetUrls }));

const { useEditor } = await import("@/lib/editor/store");
const { draftKey, serializeForLocal, localRefs } = await import("@/lib/editor/persistence");

const GIFT = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const path = (key: string) => `gifts/${GIFT}/c${key}.webp`;
const note = (n: number, over: Partial<GiftContribution> = {}): GiftContribution => ({ key: `key000000${n}`, name: `Guest ${n}`, note: `Note ${n}`, ...over });
const withPhoto = (n: number): GiftContribution => note(n, { photo: { url: path(`key000000${n}`), width: 1200, height: 900 } });

const blank: GiftData = { version: 1, templateSlug: manifest.slug, locale: "en", title: "", recipientName: "Nora", senderName: "Tom", message: "Hi", messageStyle: "fade", photos: [], accentColor: "#B4552D", fontPairing: "editorial", showReactionCta: true, watermark: true, fields: {} };

const local = new Map<string, string>();
beforeEach(() => {
  vi.useFakeTimers();
  local.clear();
  saved.drafts = [];
  signAssetUrls.mockClear();
  saveDraft.mockClear();
  vi.stubGlobal("window", { setTimeout, clearTimeout, location: { search: "" } });
  vi.stubGlobal("localStorage", { getItem: (k: string) => local.get(k) ?? null, setItem: (k: string, v: string) => void local.set(k, v), removeItem: (k: string) => void local.delete(k) });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const open = (data: unknown, authed = true) =>
  useEditor.getState().init({
    slug: manifest.slug,
    manifest: manifest as TemplateManifest,
    initial: blank,
    authed,
    userId: authed ? "u1" : null,
    remote: { id: GIFT, shortId: "abc234def", status: "draft", data: data as GiftData, unlockAt: null, timezone: null, hasPassword: false },
  });
const notes = () => useEditor.getState().data.contributions ?? [];
const toServer = () => useEditor.getState().serializedForServer();

describe("adding a note the sender said yes to", () => {
  it("shows its photo by the signed address and saves it as the path in the gift's own folder", async () => {
    await open({ ...blank });
    useEditor.getState().addContribution(withPhoto(1), "https://signed.test/preview-1");
    expect(notes()).toEqual([note(1, { photo: { url: "https://signed.test/preview-1", width: 1200, height: 900 } })]);
    expect(useEditor.getState().assets.ckey0000001).toMatchObject({ kind: "photo", local: false, storagePath: path("key0000001"), status: "uploaded" });
    expect(toServer().contributions).toEqual([withPhoto(1)]);
    expect(useEditor.getState().dirty).toBe(true);
  });

  it("with no signed address to hand, keeps the path, which still saves and publishes", async () => {
    await open({ ...blank });
    useEditor.getState().addContribution(withPhoto(1), null);
    expect(notes()[0].photo?.url).toBe(path("key0000001"));
    expect(toServer().contributions).toEqual([withPhoto(1)]);
  });

  it("twice is once: the panel may ask for the same note again", async () => {
    await open({ ...blank });
    useEditor.getState().addContribution(note(1));
    useEditor.getState().addContribution(note(1, { note: "something else" }));
    expect(notes()).toEqual([note(1)]);
  });

  it("is saved to the server on the next save, as an item the gift's schema takes and media rules allow", async () => {
    await open({ ...blank });
    useEditor.getState().addContribution(withPhoto(1), "https://signed.test/preview-1");
    useEditor.getState().addContribution(note(2));
    expect(await useEditor.getState().syncNow()).toBe(true);
    const stored = saved.drafts.at(-1) as GiftData;
    expect(stored.contributions).toEqual([withPhoto(1), note(2)]);
    for (const item of stored.contributions!) expect(giftContributionSchema.safeParse(item).success).toBe(true);
    expect(mediaUrlsAllowed(stored)).toBe(true);
    expect(JSON.stringify(stored)).not.toContain("signed.test");
  });

  it("a gift with no notes saves with no such key, exactly as before", async () => {
    await open({ ...blank });
    expect("contributions" in toServer()).toBe(false);
    useEditor.getState().patch({ message: "Changed" });
    expect("contributions" in toServer()).toBe(false);
  });
});

describe("the card's own list", () => {
  beforeEach(async () => {
    await open({ ...blank });
    useEditor.getState().addContribution(withPhoto(1), "https://signed.test/preview-1");
    useEditor.getState().addContribution(note(2));
    useEditor.getState().addContribution(note(3));
  });

  it("fixes a typo in a name or a note and leaves the rest", () => {
    useEditor.getState().updateContribution("key0000002", { name: "Iris", note: "Same table on the 12th." });
    expect(notes()[1]).toEqual({ key: "key0000002", name: "Iris", note: "Same table on the 12th." });
    expect(notes()[0].name).toBe("Guest 1");
    useEditor.getState().updateContribution("nope000000", { name: "x" });
    expect(notes()).toHaveLength(3);
  });

  it("takes a photo off a note and forgets the file", () => {
    useEditor.getState().updateContribution("key0000001", { photo: null });
    expect(notes()[0]).toEqual(note(1));
    expect(useEditor.getState().assets.ckey0000001).toBeUndefined();
    expect(toServer().contributions![0]).toEqual(note(1));
  });

  it("moves a note up or down, and ignores a move that goes nowhere", () => {
    useEditor.getState().moveContribution(2, 0);
    expect(notes().map((item) => item.key)).toEqual(["key0000003", "key0000001", "key0000002"]);
    useEditor.getState().moveContribution(0, 5);
    useEditor.getState().moveContribution(-1, 1);
    expect(notes().map((item) => item.key)).toEqual(["key0000003", "key0000001", "key0000002"]);
    // The photo still belongs to the note it came with.
    expect(toServer().contributions![1]).toEqual(withPhoto(1));
  });

  it("removes a note, and its photo's record with it", () => {
    useEditor.getState().removeContribution("key0000001");
    expect(notes().map((item) => item.key)).toEqual(["key0000002", "key0000003"]);
    expect(useEditor.getState().assets.ckey0000001).toBeUndefined();
  });
});

describe("opening a card again", () => {
  it("from the server: each stored photo is signed for the preview and goes back as its path", async () => {
    await open({ ...blank, contributions: [withPhoto(1), note(2), withPhoto(3)] });
    expect(signAssetUrls).toHaveBeenCalledWith([path("key0000001"), path("key0000003")]);
    expect(notes().map((item) => item.photo?.url)).toEqual([`https://signed.test/${path("key0000001")}?token=abc`, undefined, `https://signed.test/${path("key0000003")}?token=abc`]);
    expect(toServer().contributions).toEqual([withPhoto(1), note(2), withPhoto(3)]);
    expect(useEditor.getState().dirty).toBe(false);
  });

  it("when signing fails the paths stay, and nothing is lost on the next save", async () => {
    signAssetUrls.mockResolvedValueOnce({ ok: false, error: "unauthenticated" } as never);
    await open({ ...blank, contributions: [withPhoto(1)] });
    expect(notes()[0].photo?.url).toBe(path("key0000001"));
    expect(toServer().contributions).toEqual([withPhoto(1)]);
  });

  it("from this browser's own copy: saved as paths, signed again on the way back in", async () => {
    // The template's own page (no gift in the address): the draft lives under the template's key.
    const fresh = () => useEditor.getState().init({ slug: manifest.slug, manifest: manifest as TemplateManifest, initial: blank, authed: true, userId: "u1", remote: null });
    await fresh();
    expect(await useEditor.getState().ensureRemote()).toBe(GIFT);
    useEditor.getState().addContribution(withPhoto(1), "https://signed.test/preview-1");
    useEditor.getState().flushLocal();
    const kept = JSON.parse(local.get(draftKey(manifest.slug)) ?? "{}") as EditorDraft;
    expect(kept.giftId).toBe(GIFT);
    expect(kept.data.contributions).toEqual([withPhoto(1)]);
    expect(JSON.stringify(kept)).not.toContain("signed.test");

    // A reload of the same page finds the same draft.
    signAssetUrls.mockClear();
    await fresh();
    expect(signAssetUrls).toHaveBeenCalledWith([path("key0000001")]);
    expect(notes()[0].photo?.url).toBe(`https://signed.test/${path("key0000001")}?token=abc`);
    expect(toServer().contributions).toEqual([withPhoto(1)]);
  });

  it("the local copy maps a signed address back by the note's own record, even with no object URL kept", () => {
    const draft = { version: 1, slug: manifest.slug, giftId: GIFT, shortId: "s", status: "draft", schedule: { enabled: false, timezone: "UTC" }, password: "", removeWatermark: false, updatedAt: 1, data: { ...blank, contributions: [note(1, { photo: { url: "https://signed.test/x", width: 8, height: 8 } })] } } as EditorDraft;
    const refs = localRefs({ ckey0000001: { id: "ckey0000001", kind: "photo", local: false, storagePath: path("key0000001"), status: "uploaded", progress: 1 } });
    const kept = JSON.parse(serializeForLocal(draft, refs.byId, refs.byUrl)) as EditorDraft;
    expect(kept.data.contributions![0].photo?.url).toBe(path("key0000001"));
  });
});
