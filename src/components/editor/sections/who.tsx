"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useEditor } from "@/lib/editor/store";
import { GIFT_LOCALES, type GiftLocale } from "@/lib/gift/schema";
import { LOCALE_LABELS } from "@/i18n/routing";
import { Input } from "@/components/ui/input";
import { Field, SectionHeader, Segmented } from "../field";

/** Names, title and language; `children` is a template's lead group, asked for right after. */
export function WhoSection({ children }: { children?: ReactNode }) {
  const t = useTranslations("editor");
  const data = useEditor((s) => s.data);
  const patch = useEditor((s) => s.patch);

  return (
    <section>
      <SectionHeader n={t("sections.who.n")} title={t("sections.who.title")} blurb={t("sections.who.blurb")} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="recipientName" label={t("fields.recipientName")}>
          <Input id="recipientName" value={data.recipientName} maxLength={40} onChange={(e) => patch({ recipientName: e.target.value })} className="h-11" autoComplete="off" />
        </Field>
        <Field id="senderName" label={t("fields.senderName")}>
          <Input id="senderName" value={data.senderName} maxLength={40} onChange={(e) => patch({ senderName: e.target.value })} className="h-11" autoComplete="off" />
        </Field>
      </div>
      <Field id="title" label={t("fields.title")} help={t("fields.titleHelp")} className="mt-5">
        <Input id="title" value={data.title} maxLength={80} onChange={(e) => patch({ title: e.target.value })} className="h-11" />
      </Field>
      <Field label={t("fields.locale")} className="mt-5">
        <Segmented
          ariaLabel={t("fields.locale")}
          value={data.locale}
          onChange={(v) => patch({ locale: v as GiftLocale })}
          options={GIFT_LOCALES.map((l) => ({ value: l, label: LOCALE_LABELS[l] }))}
        />
      </Field>
      {children}
    </section>
  );
}
