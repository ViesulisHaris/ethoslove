"use client";

import { useEffect, useState } from "react";
import type { GiftData } from "@/lib/gift/schema";

type PreloadState = { progress: number; done: boolean };

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
    if (img.complete) resolve();
  });
}

/**
 * Warms the browser cache for the images a gift opens on and reports progress.
 * Never blocks forever: an overall timeout lets the template start regardless.
 *
 * Not the music. Warming it here downloaded the whole track twice — this element and the one
 * `useGiftAudio` plays from are separate media requests (and one is CORS), which never share a
 * cache entry — and the first copy competed for the connection with the photos the gift was
 * waiting on. `useGiftAudio` starts the one download when the template mounts, after the photos.
 */
export function usePreloadAssets(data: GiftData | null | undefined, enabled = true): PreloadState {
  const [state, setState] = useState<PreloadState>({ progress: 0, done: false });
  const key = data ? JSON.stringify([data.photos.map((p) => p.url), data.video?.poster]) : "";

  useEffect(() => {
    if (!enabled || !data) return;
    let cancelled = false;
    const tasks: Promise<void>[] = [
      ...data.photos.map((p) => preloadImage(p.url)),
      ...(data.video?.poster ? [preloadImage(data.video.poster)] : []),
    ];
    if (tasks.length === 0) {
      queueMicrotask(() => !cancelled && setState({ progress: 1, done: true }));
      return () => {
        cancelled = true;
      };
    }
    let loaded = 0;
    tasks.forEach((task) =>
      task.then(() => {
        loaded += 1;
        if (!cancelled) setState({ progress: loaded / tasks.length, done: loaded === tasks.length });
      }),
    );
    const timeout = setTimeout(() => !cancelled && setState({ progress: 1, done: true }), 9000);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return state;
}
