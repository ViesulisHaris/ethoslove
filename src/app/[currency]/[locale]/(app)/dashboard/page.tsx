import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/get-user";
import { listMyGifts } from "@/lib/gift/dashboard";
import { Button } from "@/components/ui/button";
import { NotConnected } from "@/components/app/not-connected";
import { GiftCard } from "@/components/dashboard/gift-card";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/dashboard">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  return { title: t("title"), robots: { index: false } };
}

export default async function DashboardPage({ params }: PageProps<"/[currency]/[locale]/dashboard">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const user = await getCurrentUser();
  const gifts = user ? await listMyGifts(user.id) : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display-lg">{t("title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild className="rounded-full">
          <Link href="/templates">
            <Plus className="size-4" />
            {t("newGift")}
          </Link>
        </Button>
      </div>
      {!isConfigured.supabase ? <NotConnected /> : null}
      {gifts.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-20 text-center">
          <p className="font-display text-2xl">{t("empty")}</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("emptyBlurb")}</p>
          <Button asChild variant="outline" className="mt-6 rounded-full">
            <Link href="/templates">{t("emptyCta")}</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {gifts.map((g) => (
            <GiftCard key={g.id} gift={g} />
          ))}
        </div>
      )}
    </div>
  );
}
