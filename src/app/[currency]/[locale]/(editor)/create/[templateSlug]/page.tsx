import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { GiftData, GiftLocale } from "@/lib/gift/schema";
import { isConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getManifest } from "@/templates/manifests";
import { loadGiftForEdit } from "@/app/actions/gift";
import { EditorShell } from "@/components/editor/editor-shell";
import type { RemoteGift } from "@/lib/editor/store";
import { shownReactions } from "@/lib/proof/proof";
import { AdTemplateView } from "@/components/shared/ad-pixels";
import { groupGiftsEnabled } from "@/lib/group/flag";
import { GroupMessages } from "@/i18n/client-messages";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/create/[templateSlug]">, "searchParams">): Promise<Metadata> {
  const { locale, templateSlug } = await params;
  const manifest = getManifest(templateSlug);
  const t = await getTranslations({ locale, namespace: "editor" });
  return { title: manifest ? `${t("title")} · ${manifest.name[locale as GiftLocale]}` : t("title"), robots: { index: false } };
}

export default async function CreatePage({ params, searchParams }: PageProps<"/[currency]/[locale]/create/[templateSlug]">) {
  const { locale, templateSlug } = await params;
  const { gift, group } = await searchParams;
  const manifest = getManifest(templateSlug);
  if (!manifest) notFound();
  setRequestLocale(locale);

  // The newest approved real reaction in this page's language, for the pay panel's first line: read
  // through a cache, not per visit. None in this language: the panel opens with its outcome line.
  const [user, [reaction]] = await Promise.all([getCurrentUser(), shownReactions(1, locale === "es" ? "es" : "en")]);
  let remote: RemoteGift | null = null;
  if (user && typeof gift === "string") {
    const result = await loadGiftForEdit(gift);
    if (result.ok && result.data.templateSlug === templateSlug) {
      remote = {
        id: result.data.id,
        shortId: result.data.shortId,
        status: result.data.status as RemoteGift["status"],
        data: result.data.data as GiftData,
        unlockAt: result.data.unlockAt,
        timezone: result.data.timezone,
        hasPassword: result.data.hasPassword,
      };
    }
  }

  // Group cards are off until GROUP_GIFTS_ENABLED and a gallery template made for them. Under
  // `next dev` only, ?group=on|off shows either state of the switch for the reference template
  // (NODE_ENV is inlined at build: a production build never reads the query).
  const groupEnabled = process.env.NODE_ENV === "development" && (group === "on" || group === "off") ? group === "on" : groupGiftsEnabled();

  const shell = (
    <EditorShell
      slug={templateSlug}
      manifest={manifest}
      user={user ? { id: user.id, email: user.email ?? "" } : null}
      remote={remote}
      supabaseConfigured={isConfigured.supabase}
      aiEnabled={isConfigured.ai}
      paymentsEnabled={isConfigured.stripe}
      reaction={reaction ?? null}
      groupEnabled={groupEnabled}
    />
  );

  return (
    <Suspense>
      {/* For the ad pixels' per-template audiences (lib/analytics/ads.ts); nothing without consent. */}
      <AdTemplateView slug={manifest.slug} tier={manifest.tier} />
      {/* A group card's words go to the browser only with a template made for group cards, whose
          editor is the one place that reads them (the panel, and the send screen of a draft that
          holds notes). Every other editor's source holds none of them, switched on or off
          (src/i18n/client-namespaces.ts, GROUP_WORDS). */}
      {manifest.features.group ? <GroupMessages locale={locale}>{shell}</GroupMessages> : shell}
    </Suspense>
  );
}
