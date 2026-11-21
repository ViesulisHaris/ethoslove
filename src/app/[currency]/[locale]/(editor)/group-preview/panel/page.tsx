import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { GroupPanelPreview, type PanelPreviewState } from "@/components/group/panel-preview";

export const metadata: Metadata = { robots: { index: false } };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const STATES: readonly PanelPreviewState[] = ["intro", "guest", "setup", "active", "full", "sent"];

/**
 * Development only: the sender's group card panel as the editor draws it, with made-up notes, for
 * screenshots and the browser tests (nobody is signed in there, and there is no database).
 *   ?state=intro|guest|setup|active|full|sent   where the sender is
 *   ?owned=1                                     they already hold the template (the step-up price)
 *   ?live=1                                      the panel talks to the real routes, which a test answers
 * The page's own language is the panel's (/es/group-preview/panel). NODE_ENV is inlined at build:
 * in production this page is a 404.
 */
export default async function GroupPanelPreviewPage({ params, searchParams }: PageProps<"/[currency]/[locale]/group-preview/panel">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const state = STATES.find((s) => s === one(query.state)) ?? "intro";
  return (
    <Suspense>
      <GroupPanelPreview state={state} locale={locale === "es" ? "es" : "en"} owned={one(query.owned) === "1"} live={one(query.live) === "1"} />
    </Suspense>
  );
}
