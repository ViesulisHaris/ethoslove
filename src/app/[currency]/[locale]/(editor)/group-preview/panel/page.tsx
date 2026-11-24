import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { GroupPanelPreview, type PanelPreviewState } from "@/components/group/panel-preview";
import { GroupMessages } from "@/i18n/client-messages";

export const metadata: Metadata = { robots: { index: false } };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const STATES: readonly PanelPreviewState[] = ["intro", "guest", "setup", "active", "full", "sent", "ranout", "capped", "closed", "copy"];

/**
 * Development only: the sender's group card panel as the editor draws it, with made-up notes, for
 * screenshots and the browser tests (nobody is signed in there, and there is no database).
 *   ?state=intro|guest|setup|active|full|sent   where the sender is
 *   ?state=ranout|capped|closed                  the link past its last day, at the last day it can have, and closed by its sender
 *   ?state=copy                                  a duplicated card: its notes, and no group behind them
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
      {/* The panel's words, which the editor's layout does not send (src/i18n/client-namespaces.ts, GROUP_WORDS). */}
      <GroupMessages locale={locale}>
        <GroupPanelPreview state={state} locale={locale === "es" ? "es" : "en"} owned={one(query.owned) === "1"} live={one(query.live) === "1"} />
      </GroupMessages>
    </Suspense>
  );
}
