"use client";

import { useSyncExternalStore } from "react";
import type { PlacePhoto } from "@/lib/dates/photos";

/**
 * Photographs of places, looked up one at a time and only for places somebody has actually
 * scrolled to. `undefined` is "not asked yet", `null` is "asked, and nobody has photographed it".
 * A few at once and no more: the pictures come from Wikimedia by way of our own server, and a
 * page that opens with two hundred requests is rude to both.
 */
type Entry = PlacePhoto | null;
type Asked = { id: string; name: string; lat: number; lng: number };

const cache = new Map<string, Entry>();
const asked = new Set<string>();
const listeners = new Set<() => void>();
const waiting: (() => Promise<void>)[] = [];
let active = 0;
const MAX_AT_ONCE = 3;

const tell = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function pump() {
  while (active < MAX_AT_ONCE && waiting.length > 0) {
    const job = waiting.shift()!;
    active++;
    void job().finally(() => {
      active--;
      pump();
    });
  }
}

/** A photo known some other way (matched from the neighbourhood's Wikipedia articles). */
export function seedPhoto(id: string, photo: PlacePhoto) {
  if (cache.get(id)) return;
  cache.set(id, photo);
  tell();
}

/** Ask for a place's photo. With a Wikidata id it asks again even after a "no": that id finds pictures a name cannot. */
export function requestPhoto(place: Asked, qid?: string) {
  const key = qid ? `${place.id}|${qid}` : place.id;
  if (asked.has(key) || cache.get(place.id)) return;
  asked.add(key);
  waiting.push(async () => {
    try {
      const params = new URLSearchParams({ name: place.name, lat: place.lat.toFixed(4), lng: place.lng.toFixed(4) });
      if (qid) params.set("qid", qid);
      const res = await fetch(`/api/dates/photo?${params}`);
      const json = res.ok ? ((await res.json()) as { photo?: PlacePhoto | null }) : null;
      if (json?.photo || !cache.has(place.id)) cache.set(place.id, json?.photo ?? null);
    } catch {
      if (!cache.has(place.id)) cache.set(place.id, null);
    }
    tell();
  });
  pump();
}

export function usePhoto(id: string | null | undefined): Entry | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (id ? cache.get(id) : undefined),
    () => undefined,
  );
}
