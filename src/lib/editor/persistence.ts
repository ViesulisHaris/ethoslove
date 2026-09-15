"use client";

import type { GiftData } from "@/lib/gift/schema";
import { isLocalRef } from "@/lib/gift/assets";
import type { AssetRecord, EditorDraft } from "./types";

const KEY_PREFIX = "ethos:draft:";

export function draftKey(slug: string): string {
  return `${KEY_PREFIX}${slug}`;
}

/**
 * What a draft saved on this device points at: the copy on this device while there is one, so the
 * preview still works after a reload, otherwise the file in Storage. Where each file already went
 * rides along, so reopening the draft neither sends a file twice nor loses track of it.
 */
export function localRefs(assets: Record<string, AssetRecord>) {
  const byId: Record<string, string | undefined> = {};
  const byUrl: Record<string, string | undefined> = {};
  const uploaded: Record<string, string> = {};
  for (const a of Object.values(assets)) {
    const ref = a.local ? `idb:${a.id}` : a.storagePath;
    byId[a.id] = ref;
    if (a.objectUrl) byUrl[a.objectUrl] = ref;
    if (a.storagePath) uploaded[a.id] = a.storagePath;
  }
  return { byId, byUrl, uploaded };
}

/** Replace object URLs with persistent refs so the draft survives reloads. */
export function serializeForLocal(draft: EditorDraft, assetRefs: Record<string, string | undefined>, byUrl: Record<string, string | undefined> = {}): string {
  const data: GiftData = {
    ...draft.data,
    photos: draft.data.photos.map((p) => ({ ...p, url: assetRefs[p.id] ?? p.url })),
    music:
      draft.data.music && draft.data.music.source === "upload"
        ? { ...draft.data.music, url: assetRefs[draft.data.music.trackId ?? ""] ?? draft.data.music.url }
        : draft.data.music,
    video: draft.data.video
      ? { url: byUrl[draft.data.video.url] ?? draft.data.video.url, poster: draft.data.video.poster ? (byUrl[draft.data.video.poster] ?? draft.data.video.poster) : undefined }
      : undefined,
    // Saved as its object URL, a voice message didn't survive a reload.
    voiceNote: draft.data.voiceNote ? { ...draft.data.voiceNote, url: byUrl[draft.data.voiceNote.url] ?? draft.data.voiceNote.url } : undefined,
  };
  return JSON.stringify({ ...draft, data });
}

export function readLocalDraft(slug: string): EditorDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EditorDraft;
    if (parsed.version !== 1 || parsed.slug !== slug) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalDraft(slug: string, serialized: string): void {
  try {
    localStorage.setItem(draftKey(slug), serialized);
  } catch {
    /* quota exceeded or private mode — the DB draft is the fallback when logged in */
  }
}

export function clearLocalDraft(slug: string): void {
  try {
    localStorage.removeItem(draftKey(slug));
  } catch {
    /* ignore */
  }
}

/** Ids of every local asset a draft references (for IndexedDB rehydration / pruning). */
export function localAssetIds(data: GiftData): string[] {
  const ids: string[] = [];
  for (const p of data.photos) if (isLocalRef(p.url)) ids.push(p.id);
  if (data.music?.source === "upload" && data.music.trackId && isLocalRef(data.music.url)) ids.push(data.music.trackId);
  if (data.video?.url.startsWith("idb:")) ids.push(data.video.url.slice(4));
  if (data.video?.poster?.startsWith("idb:")) ids.push(data.video.poster.slice(4));
  if (data.voiceNote?.url.startsWith("idb:")) ids.push(data.voiceNote.url.slice(4));
  return ids;
}
