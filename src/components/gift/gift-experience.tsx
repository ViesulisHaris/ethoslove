"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GiftData, GiftLocale } from "@/lib/gift/schema";
import type { TemplateEvent } from "@/templates/types";
import { GiftRenderer } from "@/templates/_shared/GiftRenderer";
import { SongHold, SongStrip, songStripOn } from "@/templates/_shared/SongStrip";
import { isCatalogPreview } from "@/lib/gift/music";
import { SoundGate } from "./sound-gate";
import { ReactionSheet } from "./reaction-sheet";
import { HomeScreenTip } from "./home-screen-tip";
import { replyEditorHref, saveReplySeed } from "@/lib/editor/reply-seed";
import { track } from "@/lib/analytics/track";
import { whenOnline } from "./when-online";

const VIEW_TTL_MS = 24 * 60 * 60 * 1000;
/** How long "Send one back" stays busy waiting for the editor, or for a connection, before it wakes. */
const WAKE_MS = 10_000;
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
/**
 * `replyToken` makes "send one back" free: the gift page mints it for a paid premium gift whose free
 * reply is still unused, once the gift (and its password, if any) has been checked. Null otherwise.
 */
export function GiftExperience({ shortId, data, locale, replyToken = null }: { shortId: string; data: GiftData; locale: GiftLocale; replyToken?: string | null }) {
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
  // "Send one back" has been tapped and the editor is on its way: the button says so and takes no
  // second tap. The editor takes this page's place when it is up. If it has not come in ten seconds
  // the button wakes, so a tap that led nowhere can be given again. That covers a request that
  // hangs, and a phone that says it is offline: then nothing is asked for at all until it is back
  // online (./when-online.ts), since a page asked for with no connection is the browser's error
  // page in place of the gift. A network that answers nothing while calling itself online still
  // ends there.
  const [leaving, setLeaving] = useState(false);
  const lastReplyTap = useRef(0);
  const wake = useRef(0);
  const giveUp = useRef(() => {});
  useEffect(
    () => () => {
      window.clearTimeout(wake.current);
      giveUp.current();
    },
    [],
  );

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

  // "Send one back to {sender}": one door, two places to find it (the end screen, and under "Sent to
  // {sender}." once a reaction has gone). The count says which, so the two can be told apart.
  const sendOneBack = useCallback(
    (from: "end" | "reaction") => {
      // One tap, one reply: a second tap while the editor loads (it takes a moment on a slow phone)
      // would count a second reply and open the editor twice. The clock catches the tap that lands
      // before the button has been redrawn as busy.
      const now = performance.now();
      if (leaving || now - lastReplyTap.current < 1000) return;
      lastReplyTap.current = now;
      setLeaving(true);
      window.clearTimeout(wake.current);
      giveUp.current();
      wake.current = window.setTimeout(() => setLeaving(false), WAKE_MS);
      // Counted, and gone, only once there is a connection to go with: an offline tap that the
      // wait gives up on started no reply.
      giveUp.current = whenOnline(() => {
        // The easiest gift to make is a reply: the same template, the names already swapped, and
        // whatever else the template carries across (Halfway flips the two places).
        saveReplySeed({ slug: data.templateSlug, recipientName: data.senderName, senderName: data.recipientName, fields: data.fields });
        track("reply_started", { template: data.templateSlug, from });
        // A paid premium gift's reply is free: the link carries the sealed token that proves it,
        // never this gift's id.
        router.push(replyEditorHref(data.templateSlug, data.locale === "es" ? "es" : "en", replyToken));
      }, WAKE_MS);
    },
    [data, replyToken, router, leaving],
  );

  return (
    // The whole gift page is the sender's, names and all: the browser's translator doesn't get to
    // reword it (see GiftRenderer).
    <div className="gift-backdrop" translate="no">
    <div className="gift-stage bg-night">
      {opened ? (
        <GiftRenderer
          slug={data.templateSlug}
          data={data}
          mode="live"
          replayKey={replayKey}
          onEvent={onEvent}
          onReact={data.showReactionCta ? () => setReactOpen(true) : undefined}
          onMakeOne={() => sendOneBack("end")}
          makeOnePending={leaving}
          replyMode
          keepHref={`/g/${shortId}/keep`}
          onCoverOpened={hasCover ? recordView : undefined}
        />
      ) : null}
      {!opened ? <SoundGate recipientName={data.recipientName} senderName={data.senderName} locale={locale} onOpen={open} /> : null}
      {/* The sound button on the gate (templates/_shared/SongStrip.tsx): the same player the gift's own pill shows once it opens. */}
      {!opened && songStripOn() && isCatalogPreview(data.music) ? <SongStrip music={data.music} locale={locale} onCover /> : null}
      {songStripOn() && isCatalogPreview(data.music) ? <SongHold music={data.music} /> : null}
      <ReactionSheet open={reactOpen} onClose={() => setReactOpen(false)} shortId={shortId} senderName={data.senderName} locale={locale} onSendOneBack={() => sendOneBack("reaction")} sendingBack={leaving} />
      {ended ? <HomeScreenTip locale={locale} onReplay={() => setReplayKey((k) => k + 1)} held={reactOpen} /> : null}
    </div>
    </div>
  );
}
