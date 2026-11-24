import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GiftData } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";

// loop-D2: a reply ("Send one back", ?ref=reply) and a gift of the same template for someone else
// ("or make one for someone else", ?ref=g) shared the template's one draft on this device. Typing in
// one tab and reloading the other put the reply's names on the other gift, and a reply opened on an
// older draft of the template instead of the swapped names.

vi.mock("@/app/actions/gift", () => ({ ensureDraft: vi.fn(), saveDraft: vi.fn(), signAssetUrls: vi.fn() }));

const { useEditor, pageScope } = await import("@/lib/editor/store");
const { draftKey, replyDraftScope } = await import("@/lib/editor/persistence");
const { saveReplySeed } = await import("@/lib/editor/reply-seed");

const blank: GiftData = {
  version: 1,
  templateSlug: "the-letter",
  locale: "en",
  title: "",
  recipientName: "",
  senderName: "",
  message: "",
  messageStyle: "typewriter",
  photos: [],
  accentColor: "#E8604C",
  fontPairing: "editorial",
  cover: "lilies",
  showReactionCta: true,
  watermark: true,
  fields: { paper: "cream" },
};

function memoryStorage(map: Map<string, string>): Storage {
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  };
}

const kept = new Map<string, string>();
const open = (reply: boolean, initial: GiftData = blank) =>
  useEditor.getState().init({ slug: "the-letter", manifest: { slug: "the-letter" } as TemplateManifest, initial, authed: false, userId: null, remote: null, reply });
const type = (recipientName: string) => {
  useEditor.getState().patch({ recipientName });
  useEditor.getState().flushLocal();
};
const savedName = (key: string) => (JSON.parse(kept.get(draftKey(key)) ?? "null") as { data?: GiftData } | null)?.data?.recipientName;

describe("a reply keeps a draft of its own", () => {
  beforeEach(() => {
    kept.clear();
    const storage = memoryStorage(kept);
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", { localStorage: storage, sessionStorage: memoryStorage(new Map()), setTimeout, clearTimeout, location: { search: "" } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("under its own key, apart from the template's page", () => {
    expect(pageScope("the-letter", false)).toBe("the-letter");
    expect(pageScope("the-letter", true)).toBe(replyDraftScope("the-letter"));
    expect(replyDraftScope("the-letter")).not.toBe("the-letter");
  });

  it("a reply and a gift for someone else of the same template never write over each other", async () => {
    // Tab A: the reply, names swapped by the seed.
    await open(true, { ...blank, recipientName: "Ana", senderName: "Marco" });
    expect(useEditor.getState().data.recipientName).toBe("Ana");
    type("Marco typed in tab A");
    expect(savedName(replyDraftScope("the-letter"))).toBe("Marco typed in tab A");
    expect(kept.has(draftKey("the-letter"))).toBe(false);

    // Tab B (reloaded): the gift for someone else opens the template's own draft, not the reply's.
    await open(false);
    expect(useEditor.getState().data.recipientName).toBe("");
    type("Lucía");
    expect(savedName("the-letter")).toBe("Lucía");

    // And the reply, reloaded, is still the reply.
    await open(true);
    expect(useEditor.getState().data.recipientName).toBe("Marco typed in tab A");
  });

  it("a reply is not opened on an older draft of the template", async () => {
    await open(false);
    type("Someone from last week");
    await open(true, { ...blank, recipientName: "Ana", senderName: "Marco" });
    expect(useEditor.getState().data).toMatchObject({ recipientName: "Ana", senderName: "Marco" });
  });

  it("Send one back on another gift lets go of a reply begun for someone else; the same pair keeps it", async () => {
    await open(true, { ...blank, recipientName: "Ana", senderName: "Marco" });
    useEditor.getState().patch({ message: "Half a reply" });
    useEditor.getState().flushLocal();

    // Back to the same gift, Send one back again: what was typed stays.
    saveReplySeed({ slug: "the-letter", recipientName: "Ana ", senderName: "Marco" });
    expect(kept.has(draftKey(replyDraftScope("the-letter")))).toBe(true);

    // Another gift of the same template, from someone else: that reply starts from its names.
    saveReplySeed({ slug: "the-letter", recipientName: "Bea", senderName: "Marco" });
    expect(kept.has(draftKey(replyDraftScope("the-letter")))).toBe(false);
  });

  // loop-N2-3: the recipient edited a name in their reply, then Send one back on the same gift again.
  // Matched by the names as edited, the draft read as another pair and was deleted with the edit.
  it("the same gift answered again keeps the reply even after a name in it was edited", async () => {
    saveReplySeed({ slug: "the-letter", recipientName: "Marco", senderName: "Ana" });
    await open(true, { ...blank, recipientName: "Marco", senderName: "Ana" });
    useEditor.getState().patch({ senderName: "Ana edited", message: "Half a reply" });
    useEditor.getState().flushLocal();

    saveReplySeed({ slug: "the-letter", recipientName: "Marco", senderName: "Ana" });
    const draft = JSON.parse(kept.get(draftKey(replyDraftScope("the-letter"))) ?? "null") as { data?: GiftData } | null;
    expect(draft?.data).toMatchObject({ senderName: "Ana edited", message: "Half a reply" });

    // A different gift still lets it go.
    saveReplySeed({ slug: "the-letter", recipientName: "Bea", senderName: "Ana" });
    expect(kept.has(draftKey(replyDraftScope("the-letter")))).toBe(false);
  });
});
