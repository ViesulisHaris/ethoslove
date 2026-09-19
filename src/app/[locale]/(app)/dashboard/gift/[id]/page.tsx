import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil, Printer } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { GiftData, GiftLocale } from "@/lib/gift/schema";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getGiftDetail } from "@/lib/gift/dashboard";
import { getManifest } from "@/templates/manifests";
import { SITE } from "@/config/site";
import { Button } from "@/components/ui/button";
import { OpensChart } from "@/components/dashboard/opens-chart";
import { ReactionList } from "@/components/dashboard/reaction-list";
import { ShareBox } from "@/components/dashboard/share-box";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/dashboard/gift/[id]">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  return { title: t("stats"), robots: { index: false } };
}

export default async function GiftDetailPage({ params }: PageProps<"/[locale]/dashboard/gift/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const user = await getCurrentUser();
  const detail = user ? await getGiftDetail(user.id, id) : null;
  if (!detail) notFound();
  const { gift, stats, reactions, views } = detail;
  const data = gift.data as unknown as Partial<GiftData>;
  const manifest = getManifest(gift.template_slug);
  const url = `${SITE.url}${SITE.giftPath}/${gift.short_id}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <p className="text-eyebrow text-coral">{manifest?.name[locale as GiftLocale] ?? gift.template_slug} · {t(`status.${gift.status}`)}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 translate={data.recipientName ? "no" : undefined} className="display-lg">{data.recipientName || t("untitled")}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="rounded-full"><Link href={`/create/${gift.template_slug}?gift=${gift.id}`}><Pencil className="size-4" />{t("edit")}</Link></Button>
          <Button asChild variant="outline" className="rounded-full"><Link href={`/dashboard/gift/${gift.id}/print`}><Printer className="size-4" />{t("qrCard")}</Link></Button>
          {gift.status !== "draft" ? <Button asChild className="rounded-full"><a href={url} target="_blank" rel="noopener"><ExternalLink className="size-4" />{t("open")}</a></Button> : null}
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-4">
        {[
          [t("opens"), stats.opens],
          [t("viewers"), stats.uniqueViewers],
          [t("watched"), `${stats.avgWatchPct}%`],
          [t("reactions"), stats.reactions],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-display mt-1 text-3xl tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-xl">{t("opensOverTime")}</h2>
          <OpensChart views={views} locale={locale} />
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-xl">{t("share")}</h2>
          {gift.status !== "draft" ? <ShareBox url={url} /> : <p className="mt-2 text-sm text-muted-foreground">{t("draftShare")}</p>}
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-xl">{t("reactionsTitle")}</h2>
        <ReactionList reactions={reactions} locale={locale} />
      </section>
    </div>
  );
}
