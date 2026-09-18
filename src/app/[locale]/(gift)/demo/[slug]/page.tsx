import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { GiftLocale } from "@/lib/gift/schema";
import { TEMPLATE_SLUGS, getManifest } from "@/templates/manifests";
import { DemoStage } from "@/components/gift/demo-stage";

export function generateStaticParams() {
  return TEMPLATE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/demo/[slug]">, "searchParams">): Promise<Metadata> {
  const { locale, slug } = await params;
  const manifest = getManifest(slug);
  return manifest ? { title: `${manifest.name[locale as GiftLocale]} · Demo`, robots: { index: false } } : {};
}

export default async function DemoPage({ params }: PageProps<"/[locale]/demo/[slug]">) {
  const { locale, slug } = await params;
  if (!getManifest(slug)) notFound();
  setRequestLocale(locale);
  return (
    <Suspense fallback={<div className="h-dvh w-full bg-night" />}>
      <DemoStage slug={slug} backHref={`/templates/${slug}`} />
    </Suspense>
  );
}
