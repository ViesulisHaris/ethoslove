"use client";

import { useState } from "react";
import { Play, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEditor, previewData } from "@/lib/editor/store";
import { PhoneFrame } from "@/components/shared/phone-frame";
import { GiftRenderer } from "@/templates/_shared/GiftRenderer";
import { cn } from "@/lib/utils";

export function PreviewPane({ slug, className, fullscreen = false }: { slug: string; className?: string; fullscreen?: boolean }) {
  const t = useTranslations("editor");
  const data = useEditor((s) => s.data);
  const hydrated = useEditor((s) => s.hydrated);
  const [playing, setPlaying] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  if (!hydrated) return null;

  const preview = previewData(data, "Ana");
  const renderer = (
    <GiftRenderer
      slug={slug}
      data={preview}
      mode={playing ? "live" : "preview"}
      replayKey={replayKey}
      onReact={() => setPlaying(false)}
    />
  );

  const playButton = (
    <button
      type="button"
      onClick={() => {
        setReplayKey((k) => k + 1);
        setPlaying((p) => !p);
      }}
      className={cn(
        "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium shadow-soft transition-colors",
        playing ? "bg-ink text-paper" : "border border-border bg-card text-ink hover:border-ink/40",
      )}
    >
      {playing ? <Square className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
      {playing ? t("stopPlaying") : t("playFromStart")}
    </button>
  );

  if (fullscreen) {
    return (
      <div className={cn("relative h-full w-full", className)}>
        {renderer}
        <div className="absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex justify-center">{playButton}</div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-5", className)}>
      {/* On a short laptop screen the frame shrinks so the play button underneath stays reachable. */}
      <PhoneFrame width="min(330px, calc((100dvh - 11.25rem) * 390 / 844))" className="max-w-full">
        {renderer}
      </PhoneFrame>
      {playButton}
    </div>
  );
}
