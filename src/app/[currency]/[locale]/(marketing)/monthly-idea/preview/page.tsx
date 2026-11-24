import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClientMessages } from "@/i18n/client-messages";
import { ideaMode } from "@/lib/lifecycle/monthly-idea";
import { OfferEmailsBox } from "@/components/editor/offer-emails-box";
import { IdeaWhereNote } from "@/components/editor/idea-where-note";
import { TermsPreview } from "./terms-preview";

export const metadata: Metadata = { robots: { index: false } };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Development only: the monthly idea's pieces of the send sheet (lib/lifecycle/monthly-idea.ts), for
 * screenshots and the e2e tests, which can't publish a gift (that needs an account, and the dev
 * server's database is production). ?part=share (the line on the share screen; ?notice=0 without it,
 * &box=idea for the offers box that names the idea), terms (the free version's Terms box over a send
 * button), where (the line under the sign-in form). Its buttons talk to the real routes, which a test
 * answers itself. `data-idea-mode` is the server's setting, so a test can see what it runs against.
 * NODE_ENV is inlined at build: in production this page is a 404.
 */
export default async function MonthlyIdeaPreviewPage({ params, searchParams }: PageProps<"/[currency]/[locale]/monthly-idea/preview">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const part = one(query.part) ?? "share";
  const lang = locale === "es" ? "es" : "en";
  const t = await getTranslations({ locale: lang, namespace: "offerEmails" });
  const tSheet = await getTranslations({ locale: lang, namespace: "editor.publishSheet" });
  return (
    <ClientMessages scope="(marketing)/monthly-idea/preview/page" locale={locale}>
      <div className="mx-auto w-full max-w-lg bg-paper px-4 pt-24 pb-16 sm:px-6" data-idea-mode={ideaMode()}>
        {part === "share" ? <OfferEmailsBox ideaNotice={one(query.notice) === "0" ? null : t("ideaLine")} ideaBox={one(query.box) === "idea"} /> : null}
        {part === "terms" ? <TermsPreview /> : null}
        {part === "where" ? (
          <section className="mt-7 rounded-xl border border-line bg-card p-5" data-testid="publish-sign-in">
            <p className="font-display text-xl">{tSheet("signInTitle")}</p>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">{tSheet("signInBlurb")}</p>
            {/* Where the sign-in form goes: it needs a database this preview doesn't have. */}
            <div aria-hidden className="h-24 rounded-lg bg-muted" />
            <IdeaWhereNote className="mt-3" />
          </section>
        ) : null}
      </div>
    </ClientMessages>
  );
}
