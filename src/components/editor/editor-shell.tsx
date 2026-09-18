"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { defaultCoverFor } from "@/templates/_shared/covers/looks";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { GiftData, GiftLocale } from "@/lib/gift/schema";
import type { TemplateManifest, TemplateModule } from "@/templates/types";
import { loadTemplate } from "@/templates/registry";
import { useEditor, type RemoteGift } from "@/lib/editor/store";
import { takeReplySeed } from "@/lib/editor/reply-seed";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { TopBar } from "./top-bar";
import { PreviewPane } from "./preview-pane";
import { WhoSection } from "./sections/who";
import { WordsSection } from "./sections/words";
import { PhotosSection } from "./sections/photos";
import { MusicSection } from "./sections/music";
import { VideoSection } from "./sections/video";
import { VoiceSection } from "./sections/voice";
import { LookSection } from "./sections/look";
import { ExtrasSection } from "./sections/extras";
import { PublishSheet } from "./publish-sheet";
import { TemplateFields } from "./template-fields";
import { FormSkeleton } from "./form-skeleton";

export type EditorShellProps = {
  slug: string;
  manifest: TemplateManifest;
  user: { id: string; email: string } | null;
  remote: RemoteGift | null;
  supabaseConfigured: boolean;
  aiEnabled: boolean;
  paymentsEnabled: boolean;
};

function blankGift(manifest: TemplateManifest, locale: GiftLocale, mod: TemplateModule): GiftData {
  let fields: Record<string, unknown> = {};
  try {
    fields = mod.fieldsSchema.parse({}) as Record<string, unknown>;
  } catch {
    fields = {};
  }
  return {
    version: 1,
    templateSlug: manifest.slug,
    locale,
    title: "",
    recipientName: "",
    senderName: "",
    message: "",
    messageStyle: "typewriter",
    photos: [],
    accentColor: manifest.defaultAccent,
    fontPairing: "editorial",
    cover: defaultCoverFor(manifest.slug),
    showReactionCta: true,
    watermark: true,
    fields,
  };
}

export function EditorShell({ slug, manifest, user, remote, supabaseConfigured, aiEnabled, paymentsEnabled }: EditorShellProps) {
  const locale = useLocale() as GiftLocale;
  const search = useSearchParams();
  const [mod, setMod] = useState<TemplateModule | null>(null);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [publishOpen, setPublishOpen] = useState(false);
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const resumePublish = search.get("resume") === "publish";
  const hydrated = useEditor((s) => s.hydrated);
  const storeSlug = useEditor((s) => s.slug);
  const storeGiftId = useEditor((s) => s.giftId);
  const save = useEditor((s) => s.save);
  const authed = useEditor((s) => s.authed);
  // The store outlives the page. Arriving from another editor, it is still hydrated with that
  // gift until init() below replaces it, so this template's form would be drawn over another
  // template's data (and anything touched in that moment saved under this template's key).
  const ready = hydrated && storeSlug === slug && (!remote || storeGiftId === remote.id);

  // Load the template module (schema + field meta), then hydrate the store.
  useEffect(() => {
    let active = true;
    loadTemplate(slug).then((m) => {
      if (!active || !m) return;
      setMod(m);
      const initial = blankGift(manifest, locale, m);
      // Arrived from "Send one back" on a gift: the names come already swapped.
      const reply = remote ? null : takeReplySeed(slug);
      if (reply) {
        initial.recipientName = reply.recipientName;
        initial.senderName = reply.senderName;
        // A template can carry more across, like Halfway's places, swapped. Anything that doesn't
        // validate is left at the template's defaults.
        const answered = reply.fields && m.replyFields ? m.fieldsSchema.safeParse(reply.fields) : null;
        if (answered?.success && m.replyFields) {
          const merged = m.fieldsSchema.safeParse({ ...initial.fields, ...m.replyFields(answered.data) });
          if (merged.success) initial.fields = merged.data as Record<string, unknown>;
        }
      }
      void useEditor.getState().init({
        slug,
        manifest,
        initial,
        authed: Boolean(user),
        userId: user?.id ?? null,
        remote,
      });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Keep auth state fresh (login in another tab, magic link return).
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      useEditor.getState().setAuth(Boolean(session?.user), session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Warn before leaving with unsaved local-only work being uploaded.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useEditor.getState().save === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // The phone preview is a gift running full-screen; anything docked at the bottom of the page
  // (the consent banner) reads this and steps aside. On a laptop the preview is a side pane and
  // `view` never leaves "edit", so this only ever fires on a phone.
  useEffect(() => {
    if (view !== "preview") return;
    document.documentElement.dataset.giftRunning = "true";
    return () => {
      delete document.documentElement.dataset.giftRunning;
    };
  }, [view]);

  // Preview hides the form, the page collapses to one screen and the browser drops the scroll
  // to the top — so coming back to Edit meant scrolling all the way down to the field you were
  // on. Remember where the form was when Preview was tapped and put it back before it paints.
  const editScroll = useRef(0);
  const switched = useRef(false);
  const switchView = (next: "edit" | "preview") => {
    if (next === view) return;
    if (next === "preview") editScroll.current = window.scrollY;
    switched.current = true;
    setView(next);
  };
  useLayoutEffect(() => {
    if (!switched.current) return;
    switched.current = false;
    window.scrollTo({ top: view === "edit" ? editScroll.current : 0, behavior: "instant" });
  }, [view]);

  const templateName = useMemo(() => manifest.name[locale], [manifest, locale]);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <TopBar templateName={templateName} save={save} view={view} onView={switchView} onPublish={() => setPublishOpen(true)} />
      {/*
       * A plain block on a phone, never a flex row. As a flex item the form column could not be
       * narrower than its longest unbreakable thing, capped only by its own 520px max-width — and
       * the message box is `field-sizing: content`, so its longest word counts. Paste one link
       * into the message, or a song link, and on an iPhone the column laid out 474–520px wide on
       * a 393px screen. Safari then lets the whole page zoom out to fit, which is what made the
       * top bar tiny and hard to hit. (Reproduced in WebKit against production, 17 Sept 2026.)
       * A block is as wide as the screen, whatever is inside it; `min-w-0` does the same job in
       * the desktop grid, and `overflow-x-clip` means one wide control can never widen the page.
       */}
      <div className="flex-1 md:grid md:grid-cols-[minmax(380px,460px)_1fr]">
        <div className={view === "edit" ? "block min-w-0 overflow-x-clip" : "hidden min-w-0 md:block"}>
          <div className="mx-auto max-w-[520px] px-5 pt-8 pb-32 sm:px-7 md:pb-16">
            {ready && mod ? (
              <div className="flex flex-col divide-y divide-border [&>section]:py-9 [&>section:first-child]:pt-0">
                <WhoSection>
                  {mod.leadFields ? (
                    <div className="mt-7 border-t border-dashed border-border pt-6">
                      <p className="font-display mb-4 text-lg italic">{mod.leadFields.title[locale]}</p>
                      <TemplateFields mod={mod} locale={locale} only={mod.leadFields.keys} />
                    </div>
                  ) : null}
                </WhoSection>
                <WordsSection aiEnabled={aiEnabled} />
                <PhotosSection manifest={manifest} />
                {manifest.features.music ? <MusicSection /> : null}
                {manifest.features.video ? <VideoSection /> : null}
                <VoiceSection />
                <LookSection manifest={manifest} mod={mod} locale={locale} />
                <ExtrasSection manifest={manifest} />
              </div>
            ) : (
              <FormSkeleton />
            )}
          </div>
        </div>
        <div className={view === "preview" ? "block" : "hidden md:block"}>
          <div className="md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)]">
            <div className="hidden h-full items-center justify-center bg-[radial-gradient(60%_50%_at_50%_45%,rgba(244,199,195,0.35),transparent)] p-8 md:flex">
              <PreviewPane slug={slug} />
            </div>
            {/*
             * Everything under the bar: 3.5rem, its hairline and, in a home-screen app, the notch.
             * Inline, because Tailwind does not emit an arbitrary `calc()` with `env()` inside it —
             * the class compiled to nothing and the gift collapsed to zero height.
             */}
            <div className="md:hidden" style={{ height: "calc(100dvh - 3.5rem - 1px - env(safe-area-inset-top, 0px))" }}>
              <PreviewPane slug={slug} fullscreen />
            </div>
          </div>
        </div>
      </div>
      <PublishSheet
        open={publishOpen || (resumePublish && ready && authed && !resumeDismissed)}
        onOpenChange={(v) => {
          setPublishOpen(v);
          if (!v) setResumeDismissed(true);
        }}
        manifest={manifest}
        slug={slug}
        supabaseConfigured={supabaseConfigured}
        paymentsEnabled={paymentsEnabled}
        resume={resumePublish}
      />
    </div>
  );
}
