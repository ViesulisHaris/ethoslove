"use client";

import { useState, useSyncExternalStore } from "react";
import { ArrowLeft, RotateCcw, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import type { CoverId, GiftLocale } from "@/lib/gift/schema";
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
          <div className="gift-stage">
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
          </div>
        </div>
      </div>
    </div>
  );
}
