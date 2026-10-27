import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { GiftData, GiftLocale } from "@/lib/gift/schema";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getGiftDetail } from "@/lib/gift/dashboard";
import { GIFTS_BUCKET, isStoragePath, storageObjectKey } from "@/lib/gift/assets";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { readQrDesign } from "@/lib/qr/compose";
import { normalHex } from "@/lib/qr/palette";
import { SITE } from "@/config/site";
import { BRAND } from "@/config/brand";
import { PrintCard } from "@/components/dashboard/print-card";

export const metadata: Metadata = { robots: { index: false } };

/** The photo for the middle of the code, signed for an hour: long enough to print. */
async function photoFor(data: Partial<GiftData>, id: string): Promise<string | null> {
  const photo = data.photos?.find((p) => p.id === id) ?? data.photos?.[0];
  if (!photo?.url) return null;
  if (!isStoragePath(photo.url)) return /^https:\/\//.test(photo.url) ? photo.url : null;
  const supabase = await getSupabaseServerClient();
  const { data: signed } = (await supabase?.storage.from(GIFTS_BUCKET).createSignedUrl(storageObjectKey(photo.url), 3600)) ?? { data: null };
  return signed?.signedUrl ?? null;
}

/**
 * A6 card, two-up on A4/Letter, print-ready. The code is drawn the way the QR designer left it (its
 * choices come in the query string), in colours a phone can scan on the card's paper.
 */
export default async function PrintCardPage({ params, searchParams }: PageProps<"/[currency]/[locale]/dashboard/gift/[id]/print">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  const detail = user ? await getGiftDetail(user.id, id) : null;
  if (!detail) notFound();
  const data = detail.gift.data as unknown as Partial<GiftData>;
  const url = `${SITE.url}${SITE.giftPath}/${detail.gift.short_id}`;
  const accent = normalHex(data.accentColor, "#d6336c");
  const design = readQrDesign(await searchParams, accent);
  const photoUrl = design.centre === "photo" ? await photoFor(data, design.photo) : null;
  return (
    <PrintCard
      url={url}
      recipientName={data.recipientName ?? ""}
      senderName={data.senderName ?? ""}
      accent={accent}
      locale={(data.locale ?? locale) as GiftLocale}
      brand={BRAND.name}
      design={{ ...design, centre: design.centre === "photo" && !photoUrl ? "logo" : design.centre }}
      photoUrl={photoUrl}
    />
  );
}
