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

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/create/[templateSlug]">, "searchParams">): Promise<Metadata> {
  const { locale, templateSlug } = await params;
  const manifest = getManifest(templateSlug);
  const t = await getTranslations({ locale, namespace: "editor" });
  return { title: manifest ? `${t("title")} · ${manifest.name[locale as GiftLocale]}` : t("title"), robots: { index: false } };
}

export default async function CreatePage({ params, searchParams }: PageProps<"/[locale]/create/[templateSlug]">) {
  const { locale, templateSlug } = await params;
  const { gift } = await searchParams;
  const manifest = getManifest(templateSlug);
  if (!manifest) notFound();
  setRequestLocale(locale);

  const user = await getCurrentUser();
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

  return (
    <Suspense>
      <EditorShell
        slug={templateSlug}
        manifest={manifest}
        user={user ? { id: user.id, email: user.email ?? "" } : null}
        remote={remote}
        supabaseConfigured={isConfigured.supabase}
        aiEnabled={isConfigured.ai}
        paymentsEnabled={isConfigured.stripe}
      />
    </Suspense>
  );
}
