import { describe, expect, it } from "vitest";
import type { AssetRecord, EditorDraft } from "@/lib/editor/types";
import { localAssetIds, localRefs, serializeForLocal } from "@/lib/editor/persistence";

const asset = (a: Partial<AssetRecord> & Pick<AssetRecord, "id" | "kind">): AssetRecord => ({ local: true, status: "local", progress: 0, ...a });

describe("drafts saved on this device", () => {
  it("point at this device's copy after an upload, and remember where the file went", () => {
    const refs = localRefs({
      p1: asset({ id: "p1", kind: "photo", objectUrl: "blob:p1", storagePath: "gifts/g/p1.webp", status: "uploaded" }),
      remote: asset({ id: "remote", kind: "photo", local: false, storagePath: "gifts/g/remote.webp", status: "uploaded" }),
      song: asset({ id: "song", kind: "audio", objectUrl: "blob:song" }),
    });
    expect(refs.byId).toEqual({ p1: "idb:p1", remote: "gifts/g/remote.webp", song: "idb:song" });
    expect(refs.byUrl).toEqual({ "blob:p1": "idb:p1", "blob:song": "idb:song" });
    expect(refs.uploaded).toEqual({ p1: "gifts/g/p1.webp", remote: "gifts/g/remote.webp" });
  });

  it("keep every file, the voice message included, as a reference that survives a reload", () => {
    const draft = {
      version: 1,
      slug: "the-letter",
      giftId: "g",
      shortId: "s",
      status: "draft",
      schedule: { enabled: false, timezone: "UTC" },
      password: "",
      removeWatermark: false,
      updatedAt: 1,
      uploaded: { p1: "gifts/g/p1.webp" },
      data: {
        recipientName: "Jack",
        senderName: "Sophie",
        message: "hi",
        photos: [{ id: "p1", url: "blob:p1" }],
        music: { source: "upload", url: "blob:song", trackId: "song", startAt: 0 },
        video: { url: "blob:v", poster: "blob:vp" },
        voiceNote: { url: "blob:vn", duration: 4 },
      },
    } as unknown as EditorDraft;
    const saved = JSON.parse(serializeForLocal(draft, { p1: "idb:p1", song: "idb:song" }, { "blob:v": "idb:v", "blob:vp": "idb:vp", "blob:vn": "idb:vn" })) as EditorDraft;
    expect(saved.data.photos[0].url).toBe("idb:p1");
    expect(saved.data.music?.url).toBe("idb:song");
    expect(saved.data.video).toEqual({ url: "idb:v", poster: "idb:vp" });
    expect(saved.data.voiceNote).toEqual({ url: "idb:vn", duration: 4 });
    expect(saved.giftId).toBe("g");
    expect(saved.uploaded).toEqual({ p1: "gifts/g/p1.webp" });
    expect(localAssetIds(saved.data).sort()).toEqual(["p1", "song", "v", "vn", "vp"]);
  });
});
