import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LetterBox, type LetterBoxState } from "@/components/date-letter/letter-box";
import { dateLetterOn } from "@/lib/lifecycle/date-letter-flag";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { robots: { index: false } };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const STATES: readonly LetterBoxState[] = ["empty", "sending", "asked", "on", "blocked", "invalid", "limited", "failed"];

/**
 * Development only: the date letter's box (components/date-letter/letter-box.tsx) in each of its
 * states, for screenshots and the e2e tests, which have no database to draw it against.
 * ?state= one of STATES (default empty), ?variant=card|band, ?ground=paper|dark, ?email= to fill the
 * field. It is drawn whatever DATE_LETTER says; `data-date-letter` is the server's setting, so a test
 * can see what it runs against. NODE_ENV is inlined at build: in production this page is a 404.
 */
export default async function DateLetterPreviewPage({ params, searchParams }: PageProps<"/[currency]/[locale]/date-letter/preview">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const asked = one(query.state) as LetterBoxState | undefined;
  const state = asked && STATES.includes(asked) ? asked : "empty";
  const variant = one(query.variant) === "band" ? "band" : "card";
  const dark = one(query.ground) === "dark";
  const lang = locale === "es" ? "es" : "en";
  const t = await getTranslations({ locale: lang, namespace: "dateLetter" });
  const email = one(query.email) ?? (["sending", "asked", "limited", "failed"].includes(state) ? "sam@mail.com" : state === "invalid" ? "sam@mail" : "");
  const words = {
    title: t("title"),
    line: t("line"),
    emailLabel: t("emailLabel"),
    send: t("send"),
    privacy: t("privacy"),
    asked: t("asked"),
    another: t("another"),
    on: t("on"),
    blocked: t("blocked"),
    invalid: t("invalid"),
    limited: t("limited"),
    failed: t("failed"),
  };
  return (
    <div data-date-letter={dateLetterOn() ? "on" : "off"} className={cn("pt-28 pb-16", dark ? "bg-forest" : "bg-paper")}>
      {variant === "band" ? (
        <div className="bg-page-raised py-12">
          <div className="container-x mx-auto max-w-xl">
            <LetterBox where="date-kind" locale={lang} variant="band" words={words} preview={{ state, email }} />
          </div>
        </div>
      ) : (
        <LetterBox where="dates" locale={lang} variant="card" words={words} preview={{ state, email }} />
      )}
    </div>
  );
}
