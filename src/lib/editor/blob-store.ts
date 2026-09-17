"use client";

import { del, get, keys, set } from "idb-keyval";

const PREFIX = "asset:";

/**
 * This tab's own copy of every blob it has been handed.
 *
 * IndexedDB is where a draft's media survives a reload, but it is not always there to write to:
 * a Safari private tab refuses to store a Blob at all, a full disk or blocked site data refuses
 * everything, and the failure arrives as a rejection whose reason is `null`. `putBlob` used to
 * let that escape, so on an iPhone in a private tab every photo, song, voice note and video
 * stopped dead at "Preparing…" — picked, compressed, and then dropped on the floor. (Reproduced
 * in WebKit, 17 Sept 2026.)
 *
 * So the write to disk is best-effort and the tab keeps the blob itself. Nothing extra is held
 * in memory: the editor already shows each one through an object URL, which pins the same blob.
 * What is lost without IndexedDB is only the reload, and the editor already says so honestly —
 * the asset comes back as "missing" and asks to be added again.
 */
const memory = new Map<string, Blob>();

export async function putBlob(id: string, blob: Blob): Promise<void> {
  memory.set(id, blob);
  try {
    await set(PREFIX + id, blob);
  } catch {
    /* kept in memory for this session */
  }
}

export async function getBlob(id: string): Promise<Blob | undefined> {
  const held = memory.get(id);
  if (held) return held;
  try {
    return await get<Blob>(PREFIX + id);
  } catch {
    return undefined;
  }
}

export async function deleteBlob(id: string): Promise<void> {
  memory.delete(id);
  try {
    await del(PREFIX + id);
  } catch {
    /* ignore */
  }
}

/** Remove blobs that no draft references anymore (call after loading drafts). */
export async function pruneBlobs(keep: Set<string>): Promise<void> {
  for (const id of memory.keys()) if (!keep.has(id)) memory.delete(id);
  try {
    const all = await keys();
    await Promise.all(
      all
        .filter((k): k is string => typeof k === "string" && k.startsWith(PREFIX) && !keep.has(k.slice(PREFIX.length)))
        .map((k) => del(k)),
    );
  } catch {
    /* ignore */
  }
}
