"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { defaultCoverFor } from "@/templates/_shared/covers/looks";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { giftUnwrapSchema, type GiftData, type GiftLocale } from "@/lib/gift/schema";
import type { TemplateManifest, TemplateModule } from "@/templates/types";
import type { ShownReaction } from "@/lib/proof/numbers";
import { loadTemplate } from "@/templates/registry";
import { getManifest } from "@/templates/manifests";
import { useEditor, type RemoteGift } from "@/lib/editor/store";
import { clearReplySeed, opensAsReply, replySeedForEditor } from "@/lib/editor/reply-seed";
import { mergeSeedFields, seedUnwrap, takeGiftSeed } from "@/lib/editor/gift-seed";
import { withoutUrlSeed } from "@/lib/editor/url-seed";
import { useNativeEvents, useNativeReady } from "@/lib/app/use-bridge";
import { hasSessionCookie } from "@/lib/supabase/session-cookie";
import { track } from "@/lib/analytics/track";
import { askStartedWithin7, countRecipientEditorOpened, countRecipientStarted } from "@/lib/attribution/recipient-loop";
import { OPEN_PUBLISH_EVENT } from "@/lib/editor/open-publish";
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
import type { IdeaMode } from "@/lib/lifecycle/monthly-idea";
import { TemplateFields } from "./template-fields";
import { FormSkeleton } from "./form-skeleton";
import { loadUrlSeed } from "./url-seed";
import { MoveOffer, MovedNote } from "./move-offer";
import { StartedForYou, type StartedState } from "./started-for-you";
import { START_COOKIE, START_PARAM, parseStartRef, readCookie, startPending } from "@/lib/editor/start-ref";
import { draftHasContent, finishStart, prepareDemo, prepareStart, startPhotoLimit, type PreparedStart, type StartSeed } from "@/lib/editor/start-from-gift";
import { clearLocalDraft, readLocalDraft, writeLocalDraft } from "@/lib/editor/persistence";
import { deleteBlob } from "@/lib/editor/blob-store";
import type { EditorDraft } from "@/lib/editor/types";

export type EditorShellProps = {
  slug: string;
  manifest: TemplateManifest;
  user: { id: string; email: string } | null;
  remote: RemoteGift | null;
  supabaseConfigured: boolean;
  aiEnabled: boolean;
  paymentsEnabled: boolean;
  /** The monthly idea's setting (lib/lifecycle/monthly-idea.ts), read on the server: the send sheet's Terms box and lines. */
  ideaMode?: IdeaMode;
  /** A real reaction the pay panel may open with (lib/proof), or null. */
  reaction?: ShownReaction | null;
  /**
   * Group cards are switched on (groupGiftsEnabled, lib/group/flag.ts: server-side only, so it comes
   * down as a prop). The panel is drawn only with this and on a template that declares `features.group`,
   * and the send screen shows a group card's own lines and price only with it.
   */
  groupEnabled?: boolean;
};

type GroupSectionComponent = typeof import("./sections/group").GroupSection;

/**
 * Tailwind's md: from here up the preview sits beside the form; below it (a phone) it is a tab of its
 * own. In rem, as the stylesheet has it: 768px, until someone sets their browser's text larger, and
 * then the layout switches later and this has to switch with it, or a tablet would draw no preview.
 */
const WIDE = "(min-width: 48rem)";
/**
 * The longest the form waits behind its skeleton for a start (lib/editor/start-from-gift.ts) to come
 * in, counted from when the start begins to be read (after the template and the draft are in).
 */
const START_WAIT_MS = 6000;
const subscribeWide = (onChange: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const isWide = () => window.matchMedia(WIDE).matches;

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

export function EditorShell({ slug, manifest, user, remote, supabaseConfigured, aiEnabled, paymentsEnabled, reaction = null, groupEnabled = false, ideaMode = "off" }: EditorShellProps) {
  const locale = useLocale() as GiftLocale;
  const search = useSearchParams();
  const [mod, setMod] = useState<TemplateModule | null>(null);
  const [view, setView] = useState<"edit" | "preview">("edit");
  // Only a preview that can be seen is drawn: the gift running in one is as heavy as the form, and the
  // page used to start two, the laptop's (hidden on a phone) and the phone's (hidden until its tab is
  // opened). A laptop draws the one beside the form; a phone draws its own the first time Preview is
  // tapped, and keeps it after that so switching back and forth stays instant.
  const wide = useSyncExternalStore(subscribeWide, isWide, () => false);
  const [phonePreview, setPhonePreview] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const resumePublish = search.get("resume") === "publish";
  // A part of the form can ask for the send screen (the letter's "Keep every word" button).
  useEffect(() => {
    const openIt = () => setPublishOpen(true);
    window.addEventListener(OPEN_PUBLISH_EVENT, openIt);
    return () => window.removeEventListener(OPEN_PUBLISH_EVENT, openIt);
  }, []);
  const hydrated = useEditor((s) => s.hydrated);
  const storeSlug = useEditor((s) => s.slug);
  const storeGiftId = useEditor((s) => s.giftId);
  const save = useEditor((s) => s.save);
  const authed = useEditor((s) => s.authed);
  // The store outlives the page. Arriving from another editor, it is still hydrated with that
  // gift until init() below replaces it, so this template's form would be drawn over another
  // template's data (and anything touched in that moment saved under this template's key).
  const ready = hydrated && storeSlug === slug && (!remote || storeGiftId === remote.id);
  // A reply's swapped names wait in this tab until the reply is first changed: from then on they
  // are in its own draft, and the seed would only put them on some other gift made here later.
  const dirty = useEditor((s) => s.dirty);
  useEffect(() => {
    if (ready && dirty) clearReplySeed();
  }, [ready, dirty]);
  // And the first change to a draft begun now, by someone who came from a gift, is that gift's
  // recipient starting their own: counted once (docs/marketing/LOOP-KPI.md). A draft this device or
  // the account already held was counted when it was begun. Where a sealed token names the gift, the
  // server is asked as the draft opens, so its answer is in hand by the first change.
  const fresh = useEditor((s) => s.fresh);
  const startCounted = useRef(false);
  const startAnswer = useRef<Promise<boolean | null> | null | undefined>(undefined);
  useEffect(() => {
    if (!ready || !fresh || startCounted.current) return;
    const search = new URLSearchParams(window.location.search);
    if (startAnswer.current === undefined) startAnswer.current = askStartedWithin7(search);
    if (!dirty) return;
    startCounted.current = true;
    void countRecipientStarted(search, fetch, startAnswer.current);
  }, [ready, dirty, fresh]);

  // A group card's panel has a script of its own, fetched only by an editor that draws it (group
  // cards on, a template made for them): no other editor's scripts hold the panel, or the emails it
  // writes to report a note (lib/group/report.ts). It is asked for at once, beside the template, and
  // the form waits for it so nothing under it moves when it comes. A script that can't be fetched
  // leaves the form as it is without the panel; the next load asks again.
  const drawsGroup = groupEnabled && Boolean(manifest.features.group);
  const [groupScript, setGroupScript] = useState<{ Section: GroupSectionComponent | null } | null>(null);
  useEffect(() => {
    if (!drawsGroup) return;
    let active = true;
    import("./sections/group").then(
      (m) => {
        if (active) setGroupScript({ Section: m.GroupSection });
      },
      () => {
        if (active) setGroupScript({ Section: null });
      },
    );
    return () => {
      active = false;
    };
  }, [drawsGroup]);
  const GroupSection = drawsGroup ? (groupScript?.Section ?? null) : null;
  const formReady = ready && Boolean(mod) && (!drawsGroup || groupScript !== null);

  useEffect(() => {
    track("editor_opened", { template: slug });
    // And, when whoever opened it came from a gift (its "send one back", its "someone else" link, its
    // badge, a kept gift's reminder), that the loop turned: which door, which template, nothing else.
    countRecipientEditorOpened(new URLSearchParams(window.location.search), slug);
  }, [slug]);

  // A gift a reminder e-mail started (lib/editor/start-from-gift.ts): what came in, or what could.
  const reinit = useRef<() => Promise<void>>(async () => {});
  // `done`: the start with its photos already on this device, when it came after the form showed and
  // was only offered: "Use them" puts those in rather than fetching every photo again.
  const [started, setStarted] = useState<{ state: StartedState; start: PreparedStart; done?: StartSeed } | null>(null);
  // While a start is on its way, the form waits behind its skeleton, so "Started for you." and the
  // names and photos arrive with it rather than pushing it down once it is read. Never for long:
  // START_WAIT_MS after the start begins (beginStart) the form shows; a start that comes after goes
  // in all the same while the form is still empty, and is only offered once something is in it.
  // Once the start is read (its names and how many photos), the card holds its place as "pending"
  // above the form, so photos that land after the wait never push the form down.
  const [starting, setStarting] = useState(() => typeof window !== "undefined" && !remote && startPending(window.location.search, document.cookie, Boolean(user)));
  // A gift's id never stays in the address (it would reach a page-view event): it is read into this
  // at the first render and taken out of the address before anything else runs.
  const [startAsked] = useState(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get(START_PARAM)));
  const startTaken = useRef(false);
  // "Start empty" while the photos are still coming: what arrives after is put away, not put in.
  const startDropped = useRef(false);
  useLayoutEffect(() => {
    if (!new URLSearchParams(window.location.search).has(START_PARAM)) return;
    const url = new URL(window.location.href);
    url.searchParams.delete(START_PARAM);
    window.history.replaceState(window.history.state, "", url.toString());
  }, []);
  const clock = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (clock.current !== null) window.clearTimeout(clock.current);
    },
    [],
  );

  /** The draft of this template's page with the start's names (and photos, when it brings any) in it, opened again. */
  const applySeed = async (seed: StartSeed["seed"]) => {
    const s = useEditor.getState();
    s.flushLocal();
    const base: EditorDraft = readLocalDraft(slug) ?? {
      version: 1,
      slug,
      data: s.data,
      giftId: s.giftId,
      shortId: s.shortId,
      status: "draft",
      schedule: s.schedule,
      password: s.password,
      removeWatermark: s.removeWatermark,
      updatedAt: Date.now(),
    };
    const data = { ...base.data, recipientName: seed.recipientName, ...(seed.senderName ? { senderName: seed.senderName } : {}), ...(seed.photos ? { photos: seed.photos } : {}) };
    writeLocalDraft(slug, JSON.stringify({ ...base, data, updatedAt: Date.now() }));
    await reinit.current();
  };

  const beginStart = async (demo: unknown) => {
    // The form waits for the start from now, not from when the page opened: a slow line spends its
    // first seconds on the template and the draft.
    if (starting) clock.current = window.setTimeout(() => setStarting(false), START_WAIT_MS);
    const asked = startTaken.current ? null : startAsked;
    const cookie = readCookie(document.cookie, START_COOKIE);
    // Used once: the address wins over the cookie, and both are cleared so a reload starts nothing again.
    if (cookie) document.cookie = `${START_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
    startTaken.current = true;
    // Development only: the template's own demo, to see the card without an account.
    const isDemo = process.env.NODE_ENV === "development" && asked === "demo";
    const ref = asked ? parseStartRef(asked) : parseStartRef(cookie);
    if (!isDemo && (!ref || !user)) return;
    const max = startPhotoLimit(manifest);
    const start = isDemo ? prepareDemo(demo, max) : await prepareStart(ref!, max).catch(() => null);
    if (!start || useEditor.getState().slug !== slug) return;
    const offer = () => {
      if (start.from.mode !== "name") setStarted({ state: { kind: "offer", from: start.from }, start });
    };
    // A draft they are already working on is never written over: the start is offered instead.
    if (draftHasContent(useEditor.getState().data)) return offer();
    // Its place above the form, kept from now: shown only if the wait ends before the photos land.
    if (start.from.mode !== "name") setStarted({ state: { kind: "pending", from: start.from }, start });
    const done = await finishStart(start);
    if (clock.current !== null) window.clearTimeout(clock.current);
    const now = useEditor.getState();
    if (now.slug !== slug) return;
    if (startDropped.current) {
      for (const photo of done.seed.photos ?? []) if (photo.url.startsWith("idb:")) void deleteBlob(photo.url.slice(4)).catch(() => undefined);
      return;
    }
    // Something went into the form while the photos came (only possible once it showed, late): the
    // start is offered, with its photos kept for "Use them". An empty form takes it in place.
    if (draftHasContent(now.data)) {
      // The offer takes its own, shorter height: the form under it moves up once, now, and not again.
      if (done.from.mode !== "name") setStarted({ state: { kind: "offer", from: start.from }, start, done });
      return;
    }
    await applySeed(done.seed);
    setStarted(done.from.mode !== "name" ? { state: { kind: "started", from: done.from }, start } : null);
  };

  const takeStart = async () => {
    if (!started) return;
    // The photos fetched while the form was showing are used, not fetched (and stored) a second time.
    const done = started.done ?? (await finishStart(started.start));
    await applySeed(done.seed);
    setStarted({ state: { kind: "started", from: done.from }, start: started.start });
  };

  /** "No thanks" to an offer whose photos are already on this device: those copies go too. */
  const dismissStart = () => {
    const unused = started?.state.kind === "offer" ? (started.done?.seed.photos ?? []) : [];
    setStarted(null);
    for (const photo of unused) if (photo.url.startsWith("idb:")) void deleteBlob(photo.url.slice(4)).catch(() => undefined);
  };

  const startEmpty = async () => {
    if (started?.state.kind === "pending") startDropped.current = true;
    clearLocalDraft(slug);
    await reinit.current();
    setStarted(null);
  };

  const showPhotos = () => {
    const section = document.getElementById("editor-photos");
    if (!section) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    section.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    section.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  };

  // Load the template module (schema + field meta), then hydrate the store. A seed in the address
  // (?seed=trip:…, ?unwrap=…: the iPhone app, or a link) is read alongside it.
  useEffect(() => {
    let active = true;
    const fromUrl = remote ? Promise.resolve(null) : loadUrlSeed(slug, locale === "es" ? "es" : "en").catch(() => null);
    void Promise.all([loadTemplate(slug), fromUrl]).then(([m, url]) => {
      if (!active || !m) return;
      setMod(m);
      const initial = blankGift(manifest, locale, m);
      // Arrived from "Send one back" on a gift: the names come already swapped. The seed is left in
      // place until this reply is first changed (below), so a reload before then still has them.
      // Only an editor opened as a reply takes it; any other editor of this template throws it away.
      const reply = remote ? null : replySeedForEditor(slug, window.location.search);
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
      const asReply = !remote && opensAsReply(window.location.search);
      const initArgs = {
        slug,
        manifest,
        initial,
        authed: Boolean(user),
        userId: user?.id ?? null,
        remote,
        // A reply keeps its own draft: a gift of this template for someone else, in another tab
        // or later in this one, is a different gift and never writes over it.
        reply: asReply,
      };
      reinit.current = () => useEditor.getState().init(initArgs);
      void useEditor
        .getState()
        .init(initArgs)
        .then(() => {
          // A reminder e-mail's "Open my gift" (?start=, or the cookie the gallery way round): a new
          // gift started from their last one for that person, in this browser, signed in.
          if (active && !remote && !asReply)
            void beginStart(m.demoData[locale === "es" ? "es" : "en"])
              .catch(() => undefined)
              .finally(() => {
                if (active) setStarting(false);
              });
          else if (active) setStarting(false);
          return undefined;
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

  // A phone puts the tab away the moment another app opens, and a closed tab never runs the
  // debounced save: whatever was typed in the last moment is written now.
  useEffect(() => {
    const flush = () => useEditor.getState().flushLocal();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
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
    if (next === "preview") {
      editScroll.current = window.scrollY;
      setPhonePreview(true);
    }
    switched.current = true;
    setView(next);
  };
  useLayoutEffect(() => {
    if (!switched.current) return;
    switched.current = false;
    window.scrollTo({ top: view === "edit" ? editScroll.current : 0, behavior: "instant" });
  }, [view]);

  const templateName = useMemo(() => manifest.name[locale], [manifest, locale]);
  // Arrived from "Same words, a bigger moment" on a free template (?from=the-letter).
  const from = search.get("from");
  const movedFrom = from && from !== slug ? getManifest(from) : undefined;

  // Inside the iPhone app: the app's loading screen goes once the form is up, and its bar takes the name.
  useNativeReady("editor", templateName, formReady);
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
            {ready && movedFrom ? <MovedNote from={movedFrom} /> : null}
            {ready && !starting && started ? <StartedForYou key={started.state.kind} state={started.state} onChangePhotos={showPhotos} onEmpty={startEmpty} onUse={takeStart} onDismiss={dismissStart} noPhotos={startPhotoLimit(manifest) === 0} /> : null}
            {formReady && mod && !starting ? (
              <div className="flex flex-col divide-y divide-border [&>section]:py-9 [&>section:first-child]:pt-0" data-tour="form">
                <WhoSection>
                  {mod.leadFields ? (
                    <div className="mt-7 border-t border-dashed border-border pt-6">
                      <p className="font-display mb-4 text-lg italic">{mod.leadFields.title[locale]}</p>
                      <TemplateFields mod={mod} locale={locale} only={mod.leadFields.keys} />
                    </div>
                  ) : null}
                </WhoSection>
                <WordsSection aiEnabled={aiEnabled} groupCard={drawsGroup} />
                {GroupSection ? <GroupSection manifest={manifest} /> : null}
                {manifest.tier === "free" ? <MoveOffer manifest={manifest} /> : null}
                <UnwrapSection manifest={manifest} groupCard={drawsGroup} />
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
              {wide ? <PreviewPane slug={slug} /> : null}
            </div>
            {/*
             * Everything under the bar: 3.5rem, its hairline and, in a home-screen app, the notch.
             * Inline, because Tailwind does not emit an arbitrary `calc()` with `env()` inside it —
             * the class compiled to nothing and the gift collapsed to zero height.
             */}
            <div className="md:hidden" style={{ height: "calc(100dvh - 3.5rem - 1px - env(safe-area-inset-top, 0px))" }}>
              {!wide && phonePreview ? <PreviewPane slug={slug} fullscreen /> : null}
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
        reaction={reaction}
        groupEnabled={groupEnabled}
        ideaMode={ideaMode}
      />
    </div>
  );
}
