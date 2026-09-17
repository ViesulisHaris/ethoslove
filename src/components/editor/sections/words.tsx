"use client";

import { useRef, useState } from "react";
import { Bold, Italic, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useEditor } from "@/lib/editor/store";
import { LIMITS } from "@/config/site";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Field, SectionHeader, Segmented } from "../field";
import { EmojiPicker } from "../emoji-picker";
import { WritingHelper } from "../writing-helper";

export function WordsSection({ aiEnabled }: { aiEnabled: boolean }) {
  const t = useTranslations("editor");
  const data = useEditor((s) => s.data);
  const patch = useEditor((s) => s.patch);
  const ref = useRef<HTMLTextAreaElement>(null);
  const [helperOpen, setHelperOpen] = useState(false);

  /** Wraps the selection (or inserts a placeholder) with markdown markers. */
  const wrap = (marker: string) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const selected = value.slice(a, b) || "…";
    const next = value.slice(0, a) + marker + selected + marker + value.slice(b);
    patch({ message: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + marker.length, a + marker.length + selected.length);
    });
  };

  const insert = (text: string) => {
    const el = ref.current;
    if (!el) return patch({ message: data.message + text });
    const { selectionStart: a, selectionEnd: b, value } = el;
    patch({ message: value.slice(0, a) + text + value.slice(b) });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + text.length, a + text.length);
    });
  };

  const left = LIMITS.messageMaxChars - data.message.length;

  return (
    <section>
      <SectionHeader n={t("sections.words.n")} title={t("sections.words.title")} blurb={t("sections.words.blurb")} />
      <Field id="message" label={t("fields.message")} counter={t("fields.charsLeft", { n: left })}>
        <div className="rounded-xl border border-border bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
          <div className="flex items-center gap-0.5 border-b border-border px-1.5 py-1 md:gap-1 md:px-2 md:py-1.5">
            <button type="button" onClick={() => wrap("**")} aria-label={t("fields.bold")} className="grid size-10 place-items-center rounded-lg text-ink-soft hover:bg-ink/5 md:size-8">
              <Bold className="size-4" />
            </button>
            <button type="button" onClick={() => wrap("*")} aria-label={t("fields.italic")} className="grid size-10 place-items-center rounded-lg text-ink-soft hover:bg-ink/5 md:size-8">
              <Italic className="size-4" />
            </button>
            <EmojiPicker onPick={insert} label={t("fields.emoji")} />
            <div className="ml-auto">
              {aiEnabled ? (
                <button type="button" onClick={() => setHelperOpen(true)} className="flex h-10 items-center gap-1.5 rounded-full bg-accent px-3.5 text-[13px] font-medium text-ink hover:bg-rose md:h-8 md:px-3 md:text-xs">
                  <Sparkles className="size-3.5 text-coral" />
                  {t("fields.helpWrite")}
                </button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={() => toast(t("fields.helpWriteSoon"))} className="flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium text-muted-foreground md:h-8 md:px-3 md:text-xs">
                      <Sparkles className="size-3.5" />
                      {t("fields.helpWrite")}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">{t("fields.helpWriteSoon")}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          <Textarea
            ref={ref}
            id="message"
            value={data.message}
            maxLength={LIMITS.messageMaxChars}
            onChange={(e) => patch({ message: e.target.value })}
            placeholder={t("fields.messagePlaceholder")}
            rows={9}
            className="min-h-[13rem] resize-y rounded-none border-0 bg-transparent px-3.5 py-3 text-base leading-relaxed md:text-[15px] shadow-none focus-visible:ring-0"
          />
        </div>
      </Field>
      <Field label={t("fields.messageStyle")} className="mt-5">
        <Segmented
          ariaLabel={t("fields.messageStyle")}
          value={data.messageStyle}
          onChange={(v) => patch({ messageStyle: v })}
          options={[
            { value: "typewriter", label: t("fields.typewriter") },
            { value: "fade", label: t("fields.fade") },
          ]}
        />
      </Field>
      <WritingHelper open={helperOpen} onOpenChange={setHelperOpen} onUse={(text) => patch({ message: text })} />
    </section>
  );
}
