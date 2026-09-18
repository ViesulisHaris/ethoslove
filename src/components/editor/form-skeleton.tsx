"use client";

import { useLocale, useTranslations } from "next-intl";
import { GIFT_LOCALES } from "@/lib/gift/schema";
import { LOCALE_LABELS } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Field, SectionHeader } from "./field";

/**
 * What the editor shows while the template and the draft load: the first section as it will be,
 * words and all, and the rest in outline.
 *
 * It used to be grey bars only, so the first words on screen waited for every script, the
 * template's module and the draft — about eleven seconds on a mid-range Android (a throttled
 * production run on 18 Sep), on the page most people spend their visit on. These are the same
 * components with the same text in the same places, so the page reads at first paint and the
 * real form takes over without anything moving. The boxes aren't inputs: typing into a form the
 * draft is about to replace would lose the typing.
 */
export function FormSkeleton() {
  const t = useTranslations("editor");
  const locale = useLocale();
  const box = "h-11 w-full rounded-lg border border-input";

  return (
    <div className="flex flex-col divide-y divide-border [&>section]:py-9 [&>section:first-child]:pt-0" aria-hidden="true">
      <section>
        <SectionHeader n={t("sections.who.n")} title={t("sections.who.title")} blurb={t("sections.who.blurb")} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("fields.recipientName")}>
            <div className={box} />
          </Field>
          <Field label={t("fields.senderName")}>
            <div className={box} />
          </Field>
        </div>
        <Field label={t("fields.title")} help={t("fields.titleHelp")} className="mt-5">
          <div className={box} />
        </Field>
        <Field label={t("fields.locale")} className="mt-5">
          <div className="grid grid-cols-2 gap-2">
            {GIFT_LOCALES.map((l) => (
              <div
                key={l}
                className={cn(
                  "flex min-h-11 items-center rounded-xl border px-3.5 py-2.5 text-sm font-medium",
                  l === locale ? "border-ink bg-ink text-paper" : "border-border bg-card",
                )}
              >
                {LOCALE_LABELS[l]}
              </div>
            ))}
          </div>
        </Field>
      </section>
      {[0, 1].map((i) => (
        <section key={i} className="flex flex-col gap-3">
          <div className="h-3 w-10 rounded bg-ink/10" />
          <div className="h-6 w-2/3 rounded bg-ink/10" />
          <div className="h-11 rounded-xl bg-ink/5" />
          <div className="h-11 rounded-xl bg-ink/5" />
        </section>
      ))}
    </div>
  );
}
