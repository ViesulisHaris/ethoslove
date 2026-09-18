import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { GiftLocale } from "@/lib/gift/schema";
import { isConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/get-user";
import { listMyPurchases } from "@/lib/gift/dashboard";
import { formatAmount, type Currency } from "@/lib/pricing/products";
import { getManifest } from "@/templates/manifests";
import { Link } from "@/i18n/navigation";
import { NotConnected } from "@/components/app/not-connected";
import { DangerZone } from "@/components/dashboard/danger-zone";
import { Button } from "@/components/ui/button";

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/account">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("title"), robots: { index: false } };
}

export default async function AccountPage({ params }: PageProps<"/[locale]/account">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  const user = await getCurrentUser();
  const { purchases, unlocks } = user ? await listMyPurchases(user.id) : { purchases: [], unlocks: [] };
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="display-lg">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      {!isConfigured.supabase ? <NotConnected /> : null}
      {user ? (
        <>
          <section className="mt-10 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl">{t("profile")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("signedInAs", { email: user.email ?? "" })}</p>
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl">{t("unlocks")}</h2>
            {unlocks.length === 0 ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{t("noUnlocks")}</p>
                <Button asChild variant="outline" className="rounded-full"><Link href="/pricing">{t("seePricing")}</Link></Button>
              </div>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {unlocks.map((u) => (
                  <li key={u.id} className="rounded-full border border-gold/60 bg-gold/10 px-3 py-1.5 text-sm">
                    {u.template_slug === "*" ? t("everything") : (getManifest(u.template_slug)?.name[locale as GiftLocale] ?? u.template_slug)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl">{t("purchases")}</h2>
            {purchases.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{t("noPurchases")}</p>
            ) : (
              <ul className="mt-3 divide-y divide-border text-sm">
                {purchases.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-3">
                    <span>
                      <span className="font-medium">{t(`product.${p.product}`)}</span>
                      <span className="ml-2 text-muted-foreground">{fmt.format(new Date(p.created_at))}</span>
                    </span>
                    <span className="tabular-nums">
                      {formatAmount(p.amount, p.currency as Currency, locale)} · {t(`purchaseStatus.${p.status}`)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <DangerZone email={user.email ?? ""} />
        </>
      ) : null}
    </div>
  );
}
