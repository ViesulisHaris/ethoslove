"use client";

import { useTranslations } from "next-intl";
import type { GiftLocale } from "@/lib/gift/schema";
import type { TemplateManifest, TemplateModule } from "@/templates/types";
import { useEditor } from "@/lib/editor/store";
import { Switch } from "@/components/ui/switch";
import { Field, SectionHeader, Segmented } from "../field";
import { ColorInput, ACCENT_SWATCHES } from "../color-input";
import { TemplateFields } from "../template-fields";
import { CoverPicker } from "../cover-picker";
import { defaultCoverFor } from "@/templates/_shared/covers/looks";

export function LookSection({ manifest, mod, locale }: { manifest: TemplateManifest; mod: TemplateModule; locale: GiftLocale }) {
  const t = useTranslations("editor");
  const data = useEditor((s) => s.data);
  const patch = useEditor((s) => s.patch);
  const swatches = Array.from(new Set([manifest.defaultAccent, ...ACCENT_SWATCHES]));

  return (
    <section>
      <SectionHeader n={t("sections.look.n")} title={t("sections.look.title")} blurb={t("sections.look.blurb")} />
      <Field label={t("covers.label")} help={t("covers.help")}>
        <CoverPicker
          value={data.cover ?? defaultCoverFor(manifest.slug)}
          onChange={(cover) => patch({ cover })}
          recipientName={data.recipientName}
          locale={data.locale}
        />
      </Field>
      <Field label={t("fields.accentColor")} className="mt-6">
        <ColorInput value={data.accentColor} onChange={(accentColor) => patch({ accentColor })} swatches={swatches} />
      </Field>
      <Field label={t("fields.fontPairing")} className="mt-5">
        <Segmented
          ariaLabel={t("fields.fontPairing")}
          value={data.fontPairing}
          onChange={(fontPairing) => patch({ fontPairing })}
          options={[
            { value: "editorial", label: <span className="font-display">{t("fields.editorial")}</span>, hint: t("fields.editorialHint") },
            { value: "modern", label: t("fields.modern"), hint: t("fields.modernHint") },
            { value: "handwritten", label: <span className="font-hand text-lg">{t("fields.handwritten")}</span>, hint: t("fields.handwrittenHint") },
          ]}
        />
      </Field>
      <div className="mt-7 border-t border-dashed border-border pt-6">
        <p className="font-display mb-4 text-lg italic">{manifest.name[locale]}</p>
        <TemplateFields mod={mod} locale={locale} except={mod.leadFields?.keys} />
      </div>
      <div className="mt-7 flex items-start justify-between gap-4 border-t border-dashed border-border pt-6">
        <div>
          <p className="text-[13px] font-medium">{t("fields.showReactionCta")}</p>
          <p className="text-xs text-muted-foreground">{t("fields.showReactionCtaHelp")}</p>
        </div>
        <Switch checked={data.showReactionCta} onCheckedChange={(v) => patch({ showReactionCta: v })} aria-label={t("fields.showReactionCta")} />
      </div>
    </section>
  );
}
