"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { defaultCoverFor } from "@/templates/_shared/covers/looks";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { giftUnwrapSchema, type GiftData, type GiftLocale } from "@/lib/gift/schema";
import type { TemplateManifest, TemplateModule } from "@/templates/types";
import { loadTemplate } from "@/templates/registry";
import { useEditor, type RemoteGift } from "@/lib/editor/store";
import { takeReplySeed } from "@/lib/editor/reply-seed";
import { mergeSeedFields, seedUnwrap, takeGiftSeed } from "@/lib/editor/gift-seed";
import { withoutUrlSeed } from "@/lib/editor/url-seed";
import { useNativeEvents, useNativeReady } from "@/lib/app/use-bridge";
import { hasSessionCookie } from "@/lib/supabase/session-cookie";
import { track } from "@/lib/analytics/track";
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
import { UnwrapSection } from "./sections/unwrap";
import { PublishSheet } from "./publish-sheet";
import { TemplateFields } from "./template-fields";
import { FormSkeleton } from "./form-skeleton";
import { loadUrlSeed } from "./url-seed";

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

  useEffect(() => {
    track("editor_opened", { template: slug });
  }, [slug]);

  // Load the template module (schema + field meta), then hydrate the store. A seed in the address
  // (?seed=trip:…, ?unwrap=…: the iPhone app, or a link) is read alongside it.
  useEffect(() => {
    let active = true;
    const fromUrl = remote ? Promise.resolve(null) : loadUrlSeed(slug, locale === "es" ? "es" : "en").catch(() => null);
    void Promise.all([loadTemplate(slug), fromUrl]).then(([m, url]) => {
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
      // Arrived from a page that already knew part of this gift, like a preset trip: those fields
      // start filled in. Whatever doesn't validate stays at the template's defaults. The address's
      // seed wins over one another page left in this tab, and leaves the address once it is read.
      const stored = remote ? null : takeGiftSeed(slug);
      const seed = url?.seed ?? stored;
      if (url) window.history.replaceState(window.history.state, "", withoutUrlSeed(window.location.href));
      const seeded = seed ? mergeSeedFields(m.fieldsSchema, initial.fields as Record<string, unknown>, seed.fields) : null;
      if (seeded) initial.fields = seeded;
      // A date or a trip chosen to go inside this gift ("Wrap it in a gift" on /plan, a trip's page).
      const unwrap = seed?.unwrap ? seedUnwrap(giftUnwrapSchema, seed.unwrap) : null;
      if (unwrap) initial.unwrap = unwrap;
      void useEditor
        .getState()
        .init({
          slug,
          manifest,
          initial,
          authed: Boolean(user),
          userId: user?.id ?? null,
          remote,
        })
        .then(() => {
          // init() puts a draft left in this browser in place of `initial`. They have just asked
          // for this (a trip, say), so the seed goes on top of the old draft, not under it.
          const editor = useEditor.getState();
          if (!active || !seed || editor.slug !== slug) return;
          if (seeded) {
            const current = editor.data.fields as Record<string, unknown>;
            const merged = mergeSeedFields(m.fieldsSchema, current, seed.fields);
            if (merged && JSON.stringify(merged) !== JSON.stringify(current)) editor.patchFields(merged);
          }
          // The surprise too: the one they just wrapped, not one an old draft was carrying.
          if (unwrap && JSON.stringify(editor.data.unwrap) !== JSON.stringify(unwrap)) editor.patch({ unwrap });
          // A surprise from the address gets its stops' photographs when they come, if it is still
          // the one that was built (nobody has taken it off or changed it in the meantime).
          if (url && unwrap)
            void url.photographed().then((photographed) => {
              const now = useEditor.getState();
              if (!active || !photographed || now.slug !== slug || JSON.stringify(now.data.unwrap) !== JSON.stringify(unwrap)) return;
              const checked = seedUnwrap(giftUnwrapSchema, photographed);
              if (checked) now.patch({ unwrap: checked });
            });
        });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Keep auth state fresh (login in another tab, magic link return). The client library is
  // 60 KB the editor doesn't need to start, so it loads once there is a session to watch, or
  // the publish sheet is open, which is where a guest signs in; subscribing replays the current
  // session, so a sign-in made elsewhere in the meantime is picked up then.
  const signedIn = Boolean(user);
  useEffect(() => {
    if (!signedIn && !publishOpen && !hasSessionCookie()) return;
    let active = true;
    let unsubscribe = () => {};
    void import("@/lib/supabase/client").then(({ getSupabaseBrowserClient }) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase || !active) return;
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
        useEditor.getState().setAuth(Boolean(session?.user), session?.user?.id ?? null);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [signedIn, publishOpen]);

  // A guest signs in from the publish sheet, and the client library that takes is 60 KB: it is
  // fetched once the form is live and the browser has gone idle, so the sheet has it in hand
  // without it costing the editor's start.
  useEffect(() => {
    if (signedIn || !ready) return;
    const load = () => void import("@/lib/supabase/client");
    // Safari has no requestIdleCallback.
    const idle = typeof window.requestIdleCallback === "function";
    const id = idle ? window.requestIdleCallback(load, { timeout: 10000 }) : window.setTimeout(load, 3000);
    return () => (idle ? window.cancelIdleCallback(id) : window.clearTimeout(id));
  }, [signedIn, ready]);

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

  // Inside the iPhone app: the app's loading screen goes once the form is up, and its bar takes the name.
  useNativeReady("editor", templateName, ready && Boolean(mod));
  // The app signed in or out while this page was open (it hands the page a session of its own): the
  // editor re-reads it from the cookies, as it does for a sign-in made in another tab.
  useNativeEvents((event) => {
    if (event.type !== "session") return;
    void import("@/lib/supabase/client").then(async ({ getSupabaseBrowserClient }) => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      useEditor.getState().setAuth(Boolean(data.session?.user), data.session?.user?.id ?? null);
    });
  });

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
      {/*
       * The editor is the funnel, so session recordings (Clarity, with consent) keep watching it —
       * but what people type and upload is somebody's private message, names and photos. Both
       * columns are masked: the recording keeps the clicks and the scrolling and loses the words.
       */}
      <div className="flex-1 md:grid md:grid-cols-2 lg:grid-cols-[minmax(380px,460px)_minmax(0,1fr)]" data-clarity-mask="true">
        <div className={view === "edit" ? "block min-w-0 overflow-x-clip" : "hidden min-w-0 md:block"}>
          <div className="mx-auto max-w-[520px] px-5 pt-8 pb-32 sm:px-7 md:pb-16">
            {ready && mod ? (
              <div className="flex flex-col divide-y divide-border [&>section]:py-9 [&>section:first-child]:pt-0" data-tour="form">
                <WhoSection>
                  {mod.leadFields ? (
                    <div className="mt-7 border-t border-dashed border-border pt-6">
                      <p className="font-display mb-4 text-lg italic">{mod.leadFields.title[locale]}</p>
                      <TemplateFields mod={mod} locale={locale} only={mod.leadFields.keys} />
                    </div>
                  ) : null}
                </WhoSection>
                <WordsSection aiEnabled={aiEnabled} />
                <UnwrapSection manifest={manifest} />
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
        <div className={view === "preview" ? "block min-w-0" : "hidden min-w-0 md:block"}>
          <div className="md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)]">
            <div className="hidden h-full items-center justify-center bg-[radial-gradient(60%_50%_at_50%_45%,rgba(244,199,195,0.35),transparent)] p-4 md:flex lg:p-8" data-tour="preview">
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
        mod={mod}
        slug={slug}
        supabaseConfigured={supabaseConfigured}
        paymentsEnabled={paymentsEnabled}
        resume={resumePublish}
      />
    </div>
  );
}
