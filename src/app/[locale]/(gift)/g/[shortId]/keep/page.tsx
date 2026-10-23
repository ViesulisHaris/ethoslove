import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { fetchPublicGiftMeta } from "@/lib/gift/public";
import { isShortId } from "@/lib/gift/short-id";
import { KeepForm } from "@/components/gift/keep-form";
import { AppReady } from "@/components/app/app-ready";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/g/[shortId]/keep">, "searchParams">): Promise<Metadata> {
  const { shortId } = await params;
  const gift = isShortId(shortId) ? await fetchPublicGiftMeta(shortId) : null;
  const es = gift?.locale === "es";
  return {
    title: es ? "Guardar este regalo" : "Keep this gift",
    description: es ? "Te enviamos el enlace por correo para que puedas volver a abrirlo cuando quieras." : "We'll email you the link so you can open it again any time.",
    robots: { index: false, follow: false },
  };
}

/**
 * "Keep this gift": the small page off a gift's end screen, where its recipient asks for the link by
 * email, and maybe a reminder before the sender's birthday. The gift itself carries no form; this
 * page is the one. It speaks the gift's language, like the gift (the link is shared across languages,
 * so the address says nothing about it), and names only the sender, which the gift's lock screen
 * already shows anyone with the link.
 */
export default async function KeepPage({ params }: PageProps<"/[locale]/g/[shortId]/keep">) {
  const { locale, shortId } = await params;
  setRequestLocale(locale);
  if (!isShortId(shortId)) notFound();
  const gift = await fetchPublicGiftMeta(shortId);
  if (!gift) notFound();
  return (
    <>
      <AppReady route="other" />
      <KeepForm shortId={shortId} senderName={gift.senderName.replace(/\s+/g, " ").trim()} locale={gift.locale} />
    </>
  );
}
