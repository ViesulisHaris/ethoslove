import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BackToGift, UpgradeAfterPurchase } from "@/components/pricing/upgrade-after-purchase";
import { isUpgradePreviewState, previewUpgrade } from "@/components/pricing/upgrade-preview-fixtures";

export const metadata: Metadata = { robots: { index: false } };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Development only: the success page after a single, a pick three or "make it special", with the
 * upgrade card in each of its states (?state=single|pick3|extras|birthday|earlier|until,
 * ?currency=eur|usd|gbp, and ?guest=1 for a guest's way back to the gift), for screenshots and the e2e tests, which never finish a real checkout (the
 * dev server's database is production). The card's button talks to the real route, which a test
 * answers itself. NODE_ENV is inlined at build: in production this page is a 404.
 */
export default async function UpgradePreviewPage({ params, searchParams }: PageProps<"/[locale]/checkout/success/preview">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const state = one(query.state) ?? "single";
  if (!isUpgradePreviewState(state)) notFound();
  const upgrade = previewUpgrade(state, one(query.currency));
  const t = await getTranslations("checkout");
  const tm = await getTranslations("money.success");
  const returnTo = "/create/bouquet?resume=publish";
  const sessionId = "cs_test_previewpreviewpreview";

  return (
    <div className="container-narrow flex flex-col items-center py-24 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-moss/10">
        <Check aria-hidden="true" className="size-7 text-moss" />
      </div>
      <h1 className="mt-6 display-lg">{t("paid.title")}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{t("paid.detail")}</p>
      {one(query.guest) === "1" ? (
        <BackToGift sessionId={sessionId} returnTo={returnTo} label={tm("toGift")} />
      ) : (
        <Button asChild className="mt-8 h-12 rounded-full px-6">
          <Link href={returnTo}>{tm("toGift")}</Link>
        </Button>
      )}
      {upgrade ? <UpgradeAfterPurchase sessionId={sessionId} returnTo={returnTo} upgrade={upgrade} /> : null}
    </div>
  );
}
