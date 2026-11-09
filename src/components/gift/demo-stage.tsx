"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowLeft, RotateCcw, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import type { CoverId, GiftData, GiftLocale } from "@/lib/gift/schema";
import type { TemplateEvent } from "@/templates/types";
import { GiftRenderer } from "@/templates/_shared/GiftRenderer";
import { COVER_LOOKS } from "@/templates/_shared/covers/looks";
import { LogoMark } from "@/components/shared/logo";
import { closeInApp } from "@/lib/app/bridge";
import { useNativeReady } from "@/lib/app/use-bridge";

const noSubscribe = () => () => {};

/**
 * `?cover=`, read once the page is running. Not `useSearchParams`: on this statically rendered
 * page it made everything up to the Suspense boundary render only in the browser, so the HTML
 * held nothing but a dark box and a phone showed a blank screen for five seconds. Now the bar and
 * the gift's loading screen are in the HTML. Checked against the cover looks rather than
 * `COVER_IDS`, which lives with the zod schema and pulled all of zod into this page.
 */
function useCoverParam(): CoverId | undefined {
  const raw = useSyncExternalStore(noSubscribe, () => new URLSearchParams(window.location.search).get("cover"), () => null);
  if (!raw) return undefined;
  return raw === "classic" || Object.prototype.hasOwnProperty.call(COVER_LOOKS, raw) ? (raw as CoverId) : undefined;
}

/** `?look=`, read the same way: the demo in another of the template's looks. The template checks the name. */
function useLookParam(): string | undefined {
  const raw = useSyncExternalStore(noSubscribe, () => new URLSearchParams(window.location.search).get("look"), () => null);
  return raw && /^[a-z]{1,20}$/.test(raw) ? raw : undefined;
}

/**
 * Test builds only: `?e2e=<case>` plays an edge case of the demo as a real gift
 * (src/templates/_shared/e2e/edge-cases.ts, read by tests/e2e/template-sweep.spec.ts).
 * NEXT_PUBLIC_E2E is inlined when the app is built and is never set for the site, so there the
 * param is never read and a demo link can't be made to show anything but the demo's own data.
 */
const E2E = process.env.NEXT_PUBLIC_E2E === "1";

function useEdgeCaseParam(): string | null {
  return useSyncExternalStore(noSubscribe, () => (E2E ? new URLSearchParams(window.location.search).get("e2e") : null), () => null);
}

/** The edge case once loaded: its data (null for a case the template doesn't have) and its option count. */
function useEdgeCase(slug: string, locale: GiftLocale, name: string | null) {
  const key = `${slug}/${locale}/${name}`;
  const [loaded, setLoaded] = useState<{ key: string; data: GiftData | null; options: number } | null>(null);
  useEffect(() => {
    if (!E2E || !name) return;
    let live = true;
    void import("@/templates/_shared/e2e/edge-cases")
      .then((m) => m.loadEdgeCase(slug, locale, name))
      .then((edge) => {
        if (live) setLoaded({ key, data: edge?.data ?? null, options: edge?.options ?? 0 });
      });
    return () => {
      live = false;
    };
  }, [key, slug, locale, name]);
  return loaded?.key === key ? loaded : null;
}

/** Every event an edge case's template sends, kept on the window for the sweep to read. */
function recordEvent(event: TemplateEvent) {
  const w = window as unknown as { __giftEvents?: Array<TemplateEvent & { at: number }> };
  (w.__giftEvents ??= []).push({ ...event, at: Math.round(performance.now()) });
}

/**
 * Full-screen live demo. The control strip sits in its own row above the template so it
 * never covers template controls (templates assume they own the whole viewport).
 */
export function DemoStage({ slug, backHref = "/templates" }: { slug: string; backHref?: string }) {
  const locale = useLocale() as GiftLocale;
  const router = useRouter();
  const t = useTranslations("templates");
  const [replayKey, setReplayKey] = useState(0);
  const cover = useCoverParam();
  const look = useLookParam();
  const edgeName = useEdgeCaseParam();
  const edge = useEdgeCase(slug, locale, edgeName);
  // The app titles its own bar from its catalogue: no need to load every template's name here.
  useNativeReady("demo");

  return (
    <div className="flex h-dvh w-full flex-col bg-night">
      {/*
       * 44px controls, the size a thumb can hit, in a 48px bar that grows by the notch's inset
       * rather than giving it its own height. The labels never wrap: on a narrow phone the way
       * back shortens ("Todas las plantillas" is the longest) and "Use this template", the one
       * that turns a visitor into a customer, keeps its full width.
       */}
      <div data-demo-chrome className="flex h-[calc(3rem+env(safe-area-inset-top))] shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-night px-2 pt-[env(safe-area-inset-top)] sm:px-3">
        {/* At least 44px wide too: below 360px the label is screen-reader only and the arrow alone was 30. */}
        {/* Not prefetched: on a slow phone that download competed with the gift's own. */}
        {/* Inside the iPhone app the way back closes the demo, onto the app's own template page. */}
        <Link href={backHref} prefetch={false} onClick={closeInApp} className="flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap text-white/80 hover:bg-white/10 sm:text-sm">
          <LogoMark className="hidden size-5 shrink-0 min-[400px]:block" />
          <ArrowLeft className="size-3.5 shrink-0" />
          <span className="truncate max-[359px]:sr-only">{t("backToGallery")}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => setReplayKey((k) => k + 1)} className="grid size-11 shrink-0 place-items-center rounded-full text-white/80 hover:bg-white/10" aria-label={t("replay")}>
            <RotateCcw className="size-4" />
          </button>
          <Link href={`/create/${slug}`} className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-coral px-3.5 text-xs font-semibold whitespace-nowrap text-white hover:bg-coral-deep sm:text-sm">
            <Sparkles className="size-3.5" />
            {t("useTemplate")}
          </Link>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <div className="gift-backdrop in-demo">
          <div className="gift-stage" data-e2e-options={edge?.options}>
            {edgeName ? (
              edge?.data ? (
                <GiftRenderer slug={slug} data={edge.data} mode="live" demoLocale={locale} replayKey={replayKey} onEvent={recordEvent} onReact={() => {}} onMakeOne={() => {}} />
              ) : edge ? (
                <p data-e2e-missing className="p-6 text-paper">
                  No such case.
                </p>
              ) : null
            ) : (
              <GiftRenderer
                slug={slug}
                mode="demo"
                demoLocale={locale}
                coverOverride={cover}
                lookOverride={look}
                replayKey={replayKey}
                onReact={() => toast(t("demoReactionToast"))}
                onMakeOne={() => router.push(`/create/${slug}`)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
