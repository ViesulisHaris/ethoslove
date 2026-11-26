import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { getManifest } from "@/templates/manifests";
import { GiftPreviewStage } from "./stage";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Development only: a gift page as a recipient gets it (/g/<id>), for a made-up gift, for
 * screenshots and the e2e tests, which have no gift to open (a worktree has no database, and the
 * dev server's is production). It is the real GiftExperience, so the end screen is in reply mode
 * with its keep link, the reaction sheet opens, and the badge floats on a free gift.
 *
 *   ?template=<slug>   the template, played with its own demo gift (default the-letter)
 *   ?lang=es           a Spanish gift
 *   ?paid=1            sent without the footer (a paid gift)
 *   ?full=1            the tallest end screen: a surprise inside, a voice message, a song and a dedication
 *   ?cover=<id>        the gift opens from that cover (pressed, lilies, ...)
 *   ?song=1            the gift carries a real song (the song strip, with NEXT_PUBLIC_SONG_STRIP=1)
 *
 * The reaction and view routes are the real ones, which a test answers itself. NODE_ENV is inlined
 * at build: in production this page is a 404.
 */
export default async function GiftPreviewPage({ params, searchParams }: PageProps<"/[currency]/[locale]/gift-preview">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const slug = one(query.template) ?? "the-letter";
  if (!getManifest(slug)) notFound();
  const lang = one(query.lang) === "es" ? "es" : "en";
  const messages = (await import(`../../../../../../messages/${lang}.json`)).default;
  return (
    <NextIntlClientProvider locale={lang} messages={{ gift: messages.gift }}>
      <GiftPreviewStage slug={slug} locale={lang} paid={one(query.paid) === "1"} full={one(query.full) === "1"} song={one(query.song) === "1"} cover={one(query.cover)} />
    </NextIntlClientProvider>
  );
}
