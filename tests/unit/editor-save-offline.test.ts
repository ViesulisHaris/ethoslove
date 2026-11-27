/**
 * Error 2L9E1J, "TypeError: Failed to fetch" as an unhandled rejection on /create/the-letter and
 * /create/our-timeline (Chrome on Android and Linux, before and after the release of 26 Nov): the
 * signed-in editor's autosave calls the saveDraft server action, and a server action whose request
 * never gets an answer (the connection dropped, the phone went offline) throws instead of answering
 * { ok: false }. The save then stayed "saving" for good: the editor said "Saving…" and asked
 * "Leave site?" on the way out. A save that can't reach the server is a failed save, the state the
 * editor already shows and recovers from on the next change.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GiftData } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";
import { manifest } from "@/templates/_group-reference/manifest";

const GIFT = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const offline = () => Promise.reject(new TypeError("Failed to fetch"));
const saveDraft = vi.fn(async (): Promise<{ ok: true; data: { savedAt: string } } | { ok: false; error: string }> => ({ ok: true, data: { savedAt: "now" } }));
const ensureDraft = vi.fn(async (): Promise<{ ok: true; data: { giftId: string; shortId: string } } | { ok: false; error: string }> => ({ ok: true, data: { giftId: GIFT, shortId: "abc234def" } }));
vi.mock("@/app/actions/gift", () => ({ ensureDraft, saveDraft, signAssetUrls: vi.fn(async () => ({ ok: true, data: {} })) }));

const { useEditor } = await import("@/lib/editor/store");

const blank: GiftData = { version: 1, templateSlug: manifest.slug, locale: "en", title: "", recipientName: "Nora", senderName: "Tom", message: "Hi", messageStyle: "fade", photos: [], accentColor: "#B4552D", fontPairing: "editorial", showReactionCta: true, watermark: true, fields: {} };

const local = new Map<string, string>();
beforeEach(() => {
  local.clear();
  saveDraft.mockClear();
  ensureDraft.mockClear();
  vi.stubGlobal("window", { setTimeout, clearTimeout, location: { search: "" } });
  vi.stubGlobal("localStorage", { getItem: (k: string) => local.get(k) ?? null, setItem: (k: string, v: string) => void local.set(k, v), removeItem: (k: string) => void local.delete(k) });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const open = (remote: boolean) =>
  useEditor.getState().init({
    slug: manifest.slug,
    manifest: manifest as TemplateManifest,
    initial: blank,
    authed: true,
    userId: "u1",
    remote: remote ? { id: GIFT, shortId: "abc234def", status: "draft", data: blank, unlockAt: null, timezone: null, hasPassword: false } : undefined,
  });

describe("a save that can't reach the server", () => {
  it("is a failed save, not one that never ends", async () => {
    await open(true);
    useEditor.getState().patch({ message: "Hi again" });
    saveDraft.mockImplementationOnce(offline);
    await expect(useEditor.getState().syncNow()).resolves.toBe(false);
    expect(useEditor.getState().save).toBe("error");
    // Still unsaved, so the next change or the send screen tries again.
    expect(useEditor.getState().dirty).toBe(true);
  });

  it("goes through on the next try once the connection is back", async () => {
    await open(true);
    useEditor.getState().patch({ message: "Hi again" });
    saveDraft.mockImplementationOnce(offline);
    await useEditor.getState().syncNow();
    await expect(useEditor.getState().syncNow()).resolves.toBe(true);
    expect(useEditor.getState().save).toBe("saved");
  });

  it("creating the draft row offline fails the same way, and the next try creates it", async () => {
    await open(false);
    ensureDraft.mockImplementationOnce(offline);
    await expect(useEditor.getState().ensureRemote()).resolves.toBeNull();
    expect(useEditor.getState().save).toBe("error");
    await expect(useEditor.getState().ensureRemote()).resolves.toBe(GIFT);
  });
});
