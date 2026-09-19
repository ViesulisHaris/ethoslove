"use client";

import { useRef } from "react";
import { AlertCircle, Clapperboard, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useEditor } from "@/lib/editor/store";
import { uploadTypeFor } from "@/lib/editor/media-types";
import { reasonOf } from "@/lib/editor/failed-uploads";
import { LIMITS } from "@/config/site";
import { SectionHeader } from "../field";

const ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";

export function VideoSection() {
  const t = useTranslations("editor.video");
  const tS = useTranslations("editor.sections.video");
  const tP = useTranslations("editor.publishSheet");
  const video = useEditor((s) => s.data.video);
  const assets = useEditor((s) => s.assets);
  const setUploadedVideo = useEditor((s) => s.setUploadedVideo);
  const clearVideo = useEditor((s) => s.clearVideo);
  const inputRef = useRef<HTMLInputElement>(null);
  const asset = Object.values(assets).find((a) => a.kind === "video");
  const status = asset?.status;
  const mb = Math.round(LIMITS.videoMaxBytes / 1024 / 1024);
  const reason = status === "error" ? reasonOf(asset?.error) : null;

  return (
    <section>
      <SectionHeader n={tS("n")} title={tS("title")} blurb={tS("blurb")} />
      {video ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <video src={video.url} poster={video.poster} controls playsInline preload="metadata" className="aspect-video w-full bg-black" />
          <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {status === "uploading" ? <Loader2 className="size-3 animate-spin" /> : null}
              <span>
                {status === "uploaded" ? t("uploaded") : status === "uploading" ? t("uploading") : status === "error" ? t("failed") : t("local")}
                {asset?.bytes ? ` · ${(asset.bytes / 1024 / 1024).toFixed(1)} MB` : ""}
              </span>
            </span>
            <button type="button" onClick={clearVideo} className="flex items-center gap-1 rounded-full px-2 py-1 text-ink-soft hover:bg-ink/5">
              <X className="size-3.5" />
              {t("remove")}
            </button>
          </div>
          {reason ? (
            <p className="flex items-start gap-1.5 px-3 pb-3 text-xs text-destructive" role="alert">
              <AlertCircle className="mt-px size-3.5 shrink-0" />
              <span className="min-w-0">
                {reason === "type" ? tP("failed.typeVideo") : reason === "too_big" ? tP("failed.tooBig", { mb: Math.round(LIMITS.uploadMaxBytes / 1024 / 1024) }) : tP(`failed.${reason}`)}
              </span>
            </p>
          ) : null}
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-8 text-center hover:border-ink/40">
          <Clapperboard className="size-5 text-coral" />
          <span className="mt-3 text-sm font-medium">{t("add")}</span>
          <span className="mt-1 text-xs text-muted-foreground">{t("hint", { mb })}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (!uploadTypeFor("video", f.type, f.name)) toast.error(t("badType"));
          else if (f.size > LIMITS.videoMaxBytes) toast.error(t("tooBig", { mb }));
          else void setUploadedVideo(f);
        }}
      />
    </section>
  );
}
