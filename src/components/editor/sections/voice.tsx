"use client";

import { Mic, Sparkles, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { LIMITS } from "@/config/site";
import { useEditor } from "@/lib/editor/store";
import { VoiceRecorder } from "@/components/gift/voice-recorder";
import { SectionHeader } from "../field";

/** The sender records a message for the very end of the gift. Premium extra. */
export function VoiceSection() {
  const t = useTranslations("editor.voice");
  const tS = useTranslations("editor.sections.voice");
  const locale = useLocale() === "es" ? "es" : "en";
  const note = useEditor((s) => s.data.voiceNote);
  const setVoiceNote = useEditor((s) => s.setVoiceNote);
  const clearVoiceNote = useEditor((s) => s.clearVoiceNote);

  return (
    <section>
      <SectionHeader
        n={tS("n")}
        title={tS("title")}
        blurb={tS("blurb")}
        badge={
          <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-semibold text-ink">
            <Sparkles className="size-3" />
            {t("premium")}
          </span>
        }
      />
      {note ? (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
          <span className="grid size-10 place-items-center rounded-full bg-coral/15 text-coral">
            <Mic className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t("recorded", { seconds: note.duration ?? 0 })}</p>
            <audio controls src={note.url} className="mt-1 h-8 w-full" preload="metadata" />
          </div>
          <button
            type="button"
            onClick={clearVoiceNote}
            className="relative grid size-9 after:absolute after:-inset-1 shrink-0 place-items-center rounded-full hover:bg-ink/5"
            aria-label={t("remove")}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-4">
          <VoiceRecorder
            locale={locale}
            value={null}
            tone="light"
            maxSeconds={LIMITS.senderVoiceMaxSeconds}
            onChange={(blob, seconds) => {
              if (blob) void setVoiceNote(blob, seconds ?? 0);
            }}
          />
          <p className="mt-3 text-xs text-muted-foreground">{t("hint")}</p>
        </div>
      )}
    </section>
  );
}
