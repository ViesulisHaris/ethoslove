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
  // Only once the store holds this template's gift; see EditorShell's `ready`.
  const hydrated = useEditor((s) => s.hydrated && s.slug === slug);
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
        "flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium shadow-soft transition-colors md:h-10 md:px-4",
        playing ? "bg-ink text-paper" : "border border-border bg-card text-ink hover:border-ink/40",
      )}
    >
      {playing ? <Square className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
      {playing ? t("stopPlaying") : t("playFromStart")}
    </button>
  );

  if (fullscreen) {
    // The phone preview. The play button gets a dock of its own under the gift rather than
    // floating over it: almost every template keeps its main control in the bottom strip ("Read
    // the note", "tap the box", the blow meter), and a floating button sat right on top of it.
    // The gift sizes itself to its container, so it simply plays in the space that is left.
    return (
      <div className={cn("flex h-full w-full flex-col", className)}>
        <div className="relative min-h-0 flex-1">{renderer}</div>
        <div className="flex shrink-0 justify-center border-t border-border bg-paper px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          {playButton}
        </div>
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
