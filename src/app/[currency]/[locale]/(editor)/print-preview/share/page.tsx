import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { giftDataBaseSchema, type GiftData } from "@/lib/gift/schema";
import { SharePreview } from "./share-preview";

export const metadata: Metadata = { robots: { index: false } };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Development only: the editor's share screen for a made-up gift just published, with The Tree Tag's
 * row under the QR card as a publish that stamped the tag shows it (?extra=0 for a gift without it), for screenshots and
 * the e2e tests, which can't publish a gift (that needs an account, and the dev server's database is
 * production). It sits in the editor's route group, where the share screen lives, so the editor's
 * layout sends its words and no entry in src/i18n/client-namespaces.ts ships for a page that is not
 * there. NODE_ENV is inlined at build: in production this page is a 404.
 */
export default async function SharePreviewPage({ params, searchParams }: PageProps<"/[currency]/[locale]/print-preview/share">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const data = giftDataBaseSchema.parse({ templateSlug: "bouquet", recipientName: "Mia", senderName: "Leo", locale: locale === "es" ? "es" : "en", accentColor: "#d6336c" }) as GiftData;
  return <SharePreview data={data} holidayExtra={one(query.extra) === "0" ? null : "tree-tag"} />;
}
