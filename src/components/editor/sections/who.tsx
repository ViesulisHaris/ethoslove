"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useEditor } from "@/lib/editor/store";
import { GIFT_LOCALES, type GiftLocale } from "@/lib/gift/schema";
import { LOCALE_LABELS } from "@/i18n/routing";
import { Input } from "@/components/ui/input";
import { Field, SectionHeader, Segmented } from "../field";

const NAME_MAX = 40;
/** From here on a quiet count shows under a name, so a long one is shortened by its sender, not cut (walk-make-7). */
const COUNT_FROM = 30;

function NameCount({ id, length }: { id: string; length: number }) {
  if (length < COUNT_FROM) return null;
  return (
    <p id={id} data-name-count className="-mt-1 text-right text-[11px] tabular-nums text-muted-foreground">
      {length} / {NAME_MAX}
    </p>
  );
}

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
          <Input id="recipientName" value={data.recipientName} maxLength={NAME_MAX} onChange={(e) => patch({ recipientName: e.target.value })} className="h-11" autoComplete="off" aria-describedby={data.recipientName.length >= COUNT_FROM ? "recipientName-count" : undefined} />
          <NameCount id="recipientName-count" length={data.recipientName.length} />
        </Field>
        <Field id="senderName" label={t("fields.senderName")}>
          <Input id="senderName" value={data.senderName} maxLength={NAME_MAX} onChange={(e) => patch({ senderName: e.target.value })} className="h-11" autoComplete="off" aria-describedby={data.senderName.length >= COUNT_FROM ? "senderName-count" : undefined} />
          <NameCount id="senderName-count" length={data.senderName.length} />
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
