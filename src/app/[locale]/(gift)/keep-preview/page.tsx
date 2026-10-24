import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { KeepForm } from "@/components/gift/keep-form";

export const metadata: Metadata = { robots: { index: false } };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Development only: the keep page a gift's "Keep this gift" opens (/g/<id>/keep), for a made-up gift
 * (?lang=es for a Spanish one, ?sender= for its sender's name, empty for none), for screenshots and
 * the e2e tests, which have no gift to keep (the dev server's database is production). Its form talks
 * to the real route, which a test answers itself. NODE_ENV is inlined at build: in production this
 * page is a 404.
 */
export default async function KeepPreviewPage({ params, searchParams }: PageProps<"/[locale]/keep-preview">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const sender = one(query.sender);
  return <KeepForm shortId="prev2ew3k" senderName={sender === undefined ? "Mia" : sender} locale={one(query.lang) === "es" ? "es" : "en"} />;
}
