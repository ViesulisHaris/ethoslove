"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig } from "motion/react";
import type { CoverId, GiftData, GiftLocale } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import type { TemplateEvent, TemplateMode, TemplateModule } from "../types";
import { loadTemplate } from "../registry";
import { giftThemeVars } from "./theme";
import { usePreloadAssets } from "./hooks/use-preload-assets";
import { LoadingScreen } from "./LoadingScreen";
import { introVariantFor } from "./intro-variants";
import { Cover } from "./covers/Cover";
import { coverFor } from "./covers/follow";
import { Watermark } from "./Watermark";
import { TemplateErrorBoundary } from "./ErrorBoundary";
import { ReplyModeContext } from "./reply-mode";
import { GiftChromeContext } from "./gift-chrome";
import { UnwrapPeek } from "./UnwrapGift";

const MIN_LOADING_MS = 1600;

export type GiftRendererProps = {
  slug: string;
  /** Omit in demo mode to use the template's bundled demo data. */
  data?: GiftData | null;
  mode: TemplateMode;
  demoLocale?: GiftLocale;
  onEvent?: (event: TemplateEvent) => void;
  onReact?: () => void;
  onMakeOne?: () => void;
  /** On a real gift page: the make-one button offers to send one back to the sender. */
  replyMode?: boolean;
  /** On a real gift page: where the end screen's "Keep this gift" goes. */
  keepHref?: string;
  /** Change to remount the template (replay). */
  replayKey?: number;
  /** Show this cover regardless of the gift's own choice (demo pages, `?cover=`). */
  coverOverride?: CoverId;
  /**
   * Show the demo in another of the template's looks (`?look=` on a demo page), so each can be seen
   * and recorded without making a gift. The template checks it against its own looks and opens on
   * its first for one it doesn't have.
   */
  lookOverride?: string;
  /** Called when the recipient opens the cover: the moment a view counts. */
  onCoverOpened?: () => void;
  className?: string;
};

/**
 * The one place a template gets mounted: gallery demo, editor preview, recipient page.
 * Handles lazy loading, asset preloading, the branded loading screen, theming, errors
 * and the watermark. Templates only ever see `TemplateProps`.
 */
export function GiftRenderer({
  slug,
  data,
  mode,
  demoLocale = "en",
  onEvent,
  onReact,
  onMakeOne,
  replyMode = false,
  keepHref,
  replayKey = 0,
  coverOverride,
  lookOverride,
  onCoverOpened,
  className,
}: GiftRendererProps) {
  const [loaded, setLoaded] = useState<{ slug: string; mod: TemplateModule | null }>({ slug: "", mod: null });
  const [minElapsed, setMinElapsed] = useState(mode === "preview");
  // The replay the cover was last opened for; a replay shows the cover again.
  const [openedFor, setOpenedFor] = useState<number | null>(null);
  // The end screen says when it is the thing being looked at, so the badge can get out of its way.
  const [endScreen, setEndScreen] = useState(false);
  const mod = loaded.slug === slug ? loaded.mod : null;
  const failed = loaded.slug === slug && loaded.mod === null && loaded.slug !== "";

  useEffect(() => {
    let active = true;
    loadTemplate(slug)
      .then((m) => active && setLoaded({ slug, mod: m }))
      .catch(() => active && setLoaded({ slug, mod: null }));
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (mode === "preview") return;
    const id = setTimeout(() => setMinElapsed(true), MIN_LOADING_MS);
    return () => clearTimeout(id);
  }, [mode, replayKey]);

  const base: GiftData | null = data ?? mod?.demoData[demoLocale] ?? mod?.demoData.en ?? null;
  const resolved = useMemo(() => {
    if (!base) return base;
    const covered = coverOverride ? { ...base, cover: coverOverride } : base;
    return lookOverride ? { ...covered, fields: { ...covered.fields, look: lookOverride } } : covered;
  }, [base, coverOverride, lookOverride]);
  const preload = usePreloadAssets(resolved, Boolean(mod) && mode !== "preview");
  const ready = Boolean(mod && resolved) && (mode === "preview" || (preload.done && minElapsed));

  const watermarked = ready && !!resolved?.watermark && mode !== "preview";
  const chrome = useMemo(() => ({ watermarked, onEndScreen: setEndScreen, keepHref }), [watermarked, keepHref]);

  const theme = useMemo(
    () => (resolved ? giftThemeVars(resolved.accentColor, resolved.fontPairing) : undefined),
    [resolved],
  );

  const Template = mod?.Template;
  const coverLook = useMemo(() => (resolved?.cover && resolved.cover !== "classic" && mode !== "preview" ? coverFor(resolved.cover, slug, resolved.fields) : null), [resolved, mode, slug]);
  const coverOpen = !coverLook || openedFor === replayKey;

  return (
    <MotionConfig reducedMotion="user">
      {/*
       * translate="no": a gift is the sender's words, in whatever language they wrote them, and
       * the browser's translator took them for English and "translated" them — a Romanian message
       * came back reworded in the editor's preview. It also rewrote the template's text under
       * React's feet, mid-animation. The gift stays exactly as it was made.
       */}
      <div
        translate="no"
        className={cn("gift-root relative isolate h-full w-full overflow-hidden bg-night text-paper [container-type:size]", className)}
        style={theme}
        data-mode={mode}
        data-template={slug}
      >
        {ready && coverOpen && Template && resolved ? (
          <TemplateErrorBoundary locale={resolved.locale} slug={slug}>
            <ReplyModeContext.Provider value={replyMode}>
              <GiftChromeContext.Provider value={chrome}>
                <Template
                  key={replayKey}
                  data={resolved}
                  mode={mode}
                  onEvent={onEvent}
                  onReact={onReact}
                  onMakeOne={onMakeOne}
                />
              </GiftChromeContext.Provider>
            </ReplyModeContext.Provider>
          </TemplateErrorBoundary>
        ) : null}
        <AnimatePresence>
          {coverLook && resolved && !coverOpen ? (
            <Cover
              key={`cover-${replayKey}`}
              look={coverLook}
              recipientName={resolved.recipientName}
              locale={resolved.locale}
              ready={ready}
              onOpened={() => {
                setOpenedFor(replayKey);
                onCoverOpened?.();
              }}
            />
          ) : !coverLook && !ready ? (
            <LoadingScreen
              key="loading"
              recipientName={resolved?.recipientName}
              progress={mod ? preload.progress : 0}
              locale={resolved?.locale ?? demoLocale}
              variant={introVariantFor(slug, mod?.manifest)}
            />
          ) : null}
        </AnimatePresence>
        {failed ? (
          <div className="absolute inset-0 z-[70] grid place-items-center bg-night p-8 text-center text-paper">
            <p className="font-display text-xl">Unknown template “{slug}”.</p>
          </div>
        ) : null}
        {/* The still frame rarely shows the end screen, where a surprise inside waits: it peeks in instead, until the real one is in view. */}
        {mode === "preview" && ready && resolved?.unwrap && !endScreen ? <UnwrapPeek data={resolved} /> : null}
        {/* The end screen carries the badge itself, so the floating one stands down while it shows. */}
        {watermarked && !endScreen && resolved ? <Watermark locale={resolved.locale} slug={slug} /> : null}
      </div>
    </MotionConfig>
  );
}
