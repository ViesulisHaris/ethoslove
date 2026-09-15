"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GiftData, GiftLocale } from "@/lib/gift/schema";
import type { TemplateEvent } from "@/templates/types";
import { GiftRenderer } from "@/templates/_shared/GiftRenderer";
import { SoundGate } from "./sound-gate";
import { ReactionSheet } from "./reaction-sheet";
import { HomeScreenTip } from "./home-screen-tip";

const VIEW_TTL_MS = 24 * 60 * 60 * 1000;
const PROGRESS_STEP = 25;

type StoredView = { viewId: string; openedAt: number };

function viewStorageKey(shortId: string): string {
  return `ethos:view:${shortId}`;
}

function readStoredView(shortId: string): string | null {
  try {
    const raw = window.localStorage.getItem(viewStorageKey(shortId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredView>;
    if (typeof parsed.viewId !== "string" || typeof parsed.openedAt !== "number") return null;
    if (Date.now() - parsed.openedAt > VIEW_TTL_MS) return null;
    return parsed.viewId;
  } catch {
    return null;
  }
}

function rememberView(shortId: string, viewId: string) {
  try {
    window.localStorage.setItem(viewStorageKey(shortId), JSON.stringify({ viewId, openedAt: Date.now() }));
  } catch {}
}

/**
 * The recipient's whole visit: gate → template → reaction, with anonymous view tracking.
 * A gift with a decorated cover skips the plain gate: tapping the cover is the gesture that
 * lets sound play, so asking for a second tap would only get in the way.
 */
export function GiftExperience({ shortId, data, locale }: { shortId: string; data: GiftData; locale: GiftLocale }) {
  const router = useRouter();
  const hasCover = Boolean(data.cover && data.cover !== "classic");
  const [opened, setOpened] = useState(hasCover);
  const [reactOpen, setReactOpen] = useState(false);
  const [ended, setEnded] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const viewId = useRef<string | null>(null);
  const viewed = useRef(false);
  const lastPct = useRef(0);
  const lastReportAt = useRef(0);

  // Once per browser per day; a replay shows the cover again but is not a new view.
  const recordView = useCallback(() => {
    if (viewed.current) return;
    viewed.current = true;
    const stored = readStoredView(shortId);
    if (stored) {
      viewId.current = stored;
      return;
    }
    fetch(`/api/gift/${shortId}/view`, { method: "POST", cache: "no-store", keepalive: true })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (typeof j?.viewId === "string") {
          viewId.current = j.viewId;
          rememberView(shortId, j.viewId);
        }
      })
      .catch(() => {});
  }, [shortId]);

  const open = useCallback(() => {
    setOpened(true);
    recordView();
  }, [recordView]);

  const onEvent = useCallback(
    (e: TemplateEvent) => {
      const report = (pct: number) => {
        if (!viewId.current || pct <= lastPct.current) return;
        const now = Date.now();
        const enoughProgress = pct >= lastPct.current + PROGRESS_STEP;
        const staleProgress = pct >= lastPct.current + 10 && now - lastReportAt.current > 15000;
        if (pct < 100 && !enoughProgress && !staleProgress) return;
        lastPct.current = pct;
        lastReportAt.current = now;
        void fetch(`/api/gift/${shortId}/view`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ viewId: viewId.current, pct }), keepalive: true });
      };
      if (e.type === "progress") report(e.pct);
      if (e.type === "ended") {
        report(100);
        setEnded(true);
      }
    },
    [shortId],
  );

  return (
    <div className="gift-backdrop">
    <div className="gift-stage bg-night">
      {opened ? (
        <GiftRenderer
          slug={data.templateSlug}
          data={data}
          mode="live"
          replayKey={replayKey}
          onEvent={onEvent}
          onReact={data.showReactionCta ? () => setReactOpen(true) : undefined}
          onMakeOne={() => router.push(`/?ref=${shortId}`)}
          onCoverOpened={hasCover ? recordView : undefined}
        />
      ) : null}
      {!opened ? <SoundGate recipientName={data.recipientName} senderName={data.senderName} locale={locale} onOpen={open} /> : null}
      <ReactionSheet open={reactOpen} onClose={() => setReactOpen(false)} shortId={shortId} senderName={data.senderName} locale={locale} />
      {ended ? <HomeScreenTip locale={locale} onReplay={() => setReplayKey((k) => k + 1)} /> : null}
    </div>
    </div>
  );
}
