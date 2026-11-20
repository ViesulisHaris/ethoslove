"use client";

import { useRef, useState } from "react";
import { Bold, Italic, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEditor } from "@/lib/editor/store";
import { LIMITS } from "@/config/site";
import { noteLength } from "@/lib/gift/free-tier";
import { pickKeep, type KeepArm } from "@/lib/editor/keep-split";
import { askForSendScreen } from "@/lib/editor/open-publish";
import { track } from "@/lib/analytics/track";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, SectionHeader, Segmented } from "../field";
import { EmojiPicker } from "../emoji-picker";
import { WritingHelper } from "../writing-helper";
import { useNoteRules } from "../use-note-rules";

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
  // A Letter whose free version is the short note says where free ends while they write, not at the end.
  // Only where a free note exists: a gift made of photos has no free length to count towards.
  const { note: held, free: noteFree, max: noteMax, price: notePrice } = useNoteRules();
  const note = held && noteFree;
  const length = noteLength(data.message);
  // The send screen's version for this visitor (lib/editor/keep-split.ts), decided once per tab like
  // the send screen's own: in "keep", a letter past the free length gets a button that keeps every
  // word. Nothing of it is drawn until the gift has loaded, which only ever happens in the browser.
  const [keepArm] = useState<KeepArm>(() => pickKeep({ userId: useEditor.getState().userId, search: typeof window === "undefined" ? "" : window.location.search }));
  const keepWords = note && keepArm === "keep" && length > noteMax;
  // Where a free note would end: the last few words before the free length runs out.
  const noteEnd = keepWords ? Array.from(data.message.trim()).slice(0, noteMax).join("").replace(/\s+/g, " ").trim().split(" ").slice(-6).join(" ") : "";

  return (
    <section>
      <SectionHeader n={t("sections.words.n")} title={t("sections.words.title")} blurb={t("sections.words.blurb")} />
      <Field
        id="message"
        label={t("fields.message")}
        counter={note ? t("fields.noteCount", { n: length, max: noteMax }) : t("fields.charsLeft", { n: left })}
        help={note ? t(length > noteMax ? "fields.noteOver" : "fields.noteHint", { max: noteMax, price: notePrice }) : undefined}
      >
        <div className="rounded-xl border border-border bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
          <div className="flex items-center gap-0.5 border-b border-border px-1.5 py-1 md:gap-1 md:px-2 md:py-1.5">
            <button type="button" onClick={() => wrap("**")} aria-label={t("fields.bold")} className="grid size-10 place-items-center rounded-lg text-ink-soft hover:bg-ink/5 md:size-8">
              <Bold className="size-4" />
            </button>
            <button type="button" onClick={() => wrap("*")} aria-label={t("fields.italic")} className="grid size-10 place-items-center rounded-lg text-ink-soft hover:bg-ink/5 md:size-8">
              <Italic className="size-4" />
            </button>
            <EmojiPicker onPick={insert} label={t("fields.emoji")} />
            {/*
             * Only when the writing helper is switched on. Off, it was a button that looked live and
             * answered with a note meant for us ("needs an API key"); a feature that isn't there
             * is better not shown at all.
             */}
            {aiEnabled ? (
              <div className="ml-auto">
                <button type="button" onClick={() => setHelperOpen(true)} className="flex h-10 items-center gap-1.5 rounded-full bg-accent px-3.5 text-[13px] font-medium text-ink hover:bg-rose-tint md:h-8 md:px-3 md:text-xs">
                  <Sparkles className="size-3.5 text-coral" />
                  {t("fields.helpWrite")}
                </button>
              </div>
            ) : null}
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
      {keepWords ? (
        <div className="mt-3 rounded-xl border border-line bg-card p-3.5" data-testid="keep-words">
          <p className="text-sm text-ink-soft [overflow-wrap:anywhere]">{t("fields.keepWordsLine", { tail: noteEnd })}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Button
              type="button"
              className="h-10 rounded-full px-4"
              onClick={() => {
                track("letter_keepwords_tap");
                askForSendScreen();
              }}
              data-testid="keep-words-pay"
            >
              {t("fields.keepWordsPay", { price: notePrice })}
            </Button>
            <span className="text-sm text-ink-soft">{t("fields.keepWordsOr", { max: noteMax })}</span>
          </div>
        </div>
      ) : null}
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
      {aiEnabled ? <WritingHelper open={helperOpen} onOpenChange={setHelperOpen} onUse={(text) => patch({ message: text })} /> : null}
    </section>
  );
}
