import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ContributeForm, type ContributeState } from "@/components/group/contribute-form";

export const metadata: Metadata = { robots: { index: false } };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const STATES: readonly ContributeState[] = ["open", "full", "closed", "sent"];

/**
 * Development only: the page a group card's link opens (/c/<token>), for a made-up group, for
 * screenshots and the browser tests, which have no group to open (a worktree has no database).
 *   ?state=open|full|closed|sent   what the link is
 *   ?lang=es                       a Spanish card
 *   ?from= ?for= ?prompt=          what the page says (prompt empty for none)
 *   ?photos=0                      a template that takes no photos
 * Its form posts to the real routes, which a test answers itself. NODE_ENV is inlined at build: in
 * production this page is a 404.
 */
export default async function ContributePreviewPage({ params, searchParams }: PageProps<"/[currency]/[locale]/group-preview/contribute">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const es = one(query.lang) === "es";
  const state = STATES.find((s) => s === one(query.state)) ?? "open";
  const prompt = one(query.prompt);
  return (
    <ContributeForm
      token="previewPreviewPreview0"
      state={state}
      locale={es ? "es" : "en"}
      fromName={one(query.from) ?? (es ? "Tomás" : "Tom")}
      forName={one(query.for) ?? "Nora"}
      prompt={prompt === undefined ? (es ? "Una línea que solo vosotros sabéis." : "One line that only you would know.") : prompt || null}
      noteMax={140}
      takesPhotos={one(query.photos) !== "0"}
      reportRef="prev1ew0"
    />
  );
}
