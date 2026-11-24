import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { readQrDesign } from "@/lib/qr/compose";
import { SITE } from "@/config/site";
import { BRAND } from "@/config/brand";
import { PrintCard } from "@/components/dashboard/print-card";

/** Not indexed; The Tree Tag's sheet named for it, as the real print page names it. */
export async function generateMetadata({ params, searchParams }: PageProps<"/[currency]/[locale]/print-preview">): Promise<Metadata> {
  const query = await searchParams;
  if (process.env.NODE_ENV !== "development" || one(query.shape) !== "tree-tag") return { robots: { index: false } };
  const { locale } = await params;
  const t = await getTranslations({ locale: one(query.lang) === "es" ? "es" : locale, namespace: "editor.share.treeTag" });
  return { robots: { index: false }, title: t("title") };
}

/** The live origin, not the dev server's: the e-mail's picture is a code that has to open the real site. */
const LIVE = "https://tryethos.io";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Development only: the print page (/dashboard/gift/<id>/print) for a made-up gift, in either shape
 * (?shape=tree-tag for The Tree Tag), for screenshots, the e-mail's picture and the e2e tests, which
 * have no gift of their own (the dev server's database is production). ?lang=es for a Spanish gift,
 * ?name= and ?sender= for the names, ?to=home for a code that opens the home page, ?to=email for the
 * e-mail's picture (the home page in the gift's language, counted as a scan of that picture). The QR designer's
 * choices come in the query as they do on the real page. NODE_ENV is inlined at build: in
 * production this page is a 404.
 */
export default async function PrintPreviewPage({ params, searchParams }: PageProps<"/[currency]/[locale]/print-preview">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const name = one(query.name);
  const sender = one(query.sender);
  const es = one(query.lang) === "es";
  const to = one(query.to);
  return (
    <PrintCard
      shape={one(query.shape) === "tree-tag" ? "tree-tag" : "card"}
      url={to === "email" ? `${LIVE}${es ? "/es" : "/"}?ref=email-xmas-tag` : to === "home" ? LIVE : `${LIVE}${SITE.giftPath}/prev2ew3k`}
      recipientName={name === undefined ? "Mia" : name}
      senderName={sender === undefined ? "Leo" : sender}
      accent="#d6336c"
      locale={es ? "es" : "en"}
      brand={BRAND.name}
      design={readQrDesign(query, "#d6336c")}
      photoUrl={null}
    />
  );
}
