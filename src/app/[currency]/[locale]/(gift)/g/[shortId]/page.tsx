import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { fetchPublicGift, fetchPublicGiftMeta, passwordCookieName } from "@/lib/gift/public";
import { promoteScheduledGift } from "@/lib/gift/promote";
import { unseal } from "@/lib/crypto";
import { isShortId } from "@/lib/gift/short-id";
import { replyTokenForGift } from "@/lib/commerce/free-reply";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { SHARE_CARD, shareCardUrl } from "@/lib/gift/share-card";
import { SITE } from "@/config/site";
import { GiftExperience } from "@/components/gift/gift-experience";
import { LockScreen } from "@/components/gift/lock-screen";
import { ScheduledScreen } from "@/components/gift/scheduled-screen";
import { AppReady } from "@/components/app/app-ready";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/g/[shortId]">, "searchParams">): Promise<Metadata> {
  const { shortId } = await params;
  const gift = isShortId(shortId) ? await fetchPublicGiftMeta(shortId) : null;
  if (!gift) return { title: "Gift", robots: { index: false, follow: false } };
  const es = gift.locale === "es";
  // The editor promises the Title shows in the link preview; without one, the invitation stands in.
  const title =
    gift.title?.trim() ||
    (es ? `${gift.recipientName}, alguien te ha hecho algo 💌` : `${gift.recipientName}, someone made you something 💌`);
  const description = es ? "Ábrelo con el sonido activado." : "Open it with your sound on.";
  // Named here, not by an opengraph-image file: that one's URL began /en/ and was redirected.
  const image = { url: shareCardUrl(shortId, gift), ...SHARE_CARD, type: "image/jpeg", alt: es ? "Alguien te ha hecho algo" : "Someone made you something" };
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website", url: `${SITE.url}/g/${shortId}`, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function GiftPage({ params }: PageProps<"/[currency]/[locale]/g/[shortId]">) {
  const { locale, shortId } = await params;
  setRequestLocale(locale);
  if (!isShortId(shortId)) notFound();

  const jar = await cookies();
  const password = await unseal(jar.get(passwordCookieName(shortId))?.value);
  const gift = await fetchPublicGift(shortId, password);
  if (!gift) notFound();
  // Scheduled gifts go live on first open once their time has passed; the daily cron is a backstop.
  if (gift.status === "scheduled" && gift.unlocked) await promoteScheduledGift(gift.id);

  if (!gift.unlocked && gift.unlockAt) {
    return (
      <>
        <AppReady route="gift" />
        <ScheduledScreen senderName={gift.senderName} unlockAt={gift.unlockAt} timezone={gift.timezone} locale={gift.locale} />
      </>
    );
  }
  if (gift.requiresPassword && !gift.passwordOk) {
    return (
      <>
        <AppReady route="gift" />
        <LockScreen shortId={shortId} senderName={gift.senderName} locale={gift.locale} />
      </>
    );
  }
  if (!gift.data) notFound();

  // "Send one back" is free after a paid premium gift. The token is minted here, past the password
  // check above, so only someone who can open the gift can spend its one free reply. A scheduled gift
  // promoted a moment ago is live now.
  const admin = getSupabaseAdminClient();
  const replyToken = admin
    ? await replyTokenForGift(admin, { id: gift.id, template_slug: gift.templateSlug, status: gift.unlocked ? "live" : gift.status, watermark: gift.watermark })
    : null;
  const messages = (await import(`../../../../../../../messages/${gift.locale}.json`)).default;
  return (
    <NextIntlClientProvider locale={gift.locale} messages={{ gift: messages.gift }}>
      <AppReady route="gift" />
      <GiftExperience shortId={shortId} data={gift.data} locale={gift.locale} replyToken={replyToken} />
    </NextIntlClientProvider>
  );
}
