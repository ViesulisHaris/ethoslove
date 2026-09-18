"use client";

import { ArrowLeft, Check, CloudOff, Loader2, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { SaveState } from "@/lib/editor/types";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

export function TopBar({
  templateName,
  save,
  view,
  onView,
  onPublish,
  publishing,
}: {
  templateName: string;
  save: SaveState;
  view: "edit" | "preview";
  onView: (v: "edit" | "preview") => void;
  onPublish: () => void;
  publishing?: boolean;
}) {
  const t = useTranslations("editor");
  const saveLabel: Record<SaveState, { icon: React.ReactNode; text: string; tone: string }> = {
    idle: { icon: null, text: "", tone: "text-muted-foreground" },
    saving: { icon: <Loader2 className="size-3.5 animate-spin" />, text: t("saving"), tone: "text-muted-foreground" },
    saved: { icon: <Check className="size-3.5" />, text: t("saved"), tone: "text-moss" },
    offline: { icon: <CloudOff className="size-3.5" />, text: t("savedLocally"), tone: "text-muted-foreground" },
    error: { icon: <TriangleAlert className="size-3.5" />, text: t("saveError"), tone: "text-destructive" },
  };
  const s = saveLabel[save];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      {/*
       * On a phone the bar is three things, each a full 44pt target: back, the Edit / Preview
       * switch, Publish. The switch sits in the middle and takes whatever room is left, the way a
       * segmented control does in an iOS navigation bar. It used to be two 32px-tall, 45px-wide
       * buttons squeezed beside a title that, in Spanish at 375px, had 14px left to live in.
       * The template's name comes back at `md`, where the switch is gone and there is room.
       */}
      <div className="flex h-14 items-center gap-2 px-2 sm:gap-3 sm:px-5">
        <Link
          href="/templates"
          className="flex h-11 shrink-0 items-center gap-2 rounded-full pr-3 pl-2 text-sm text-ink-soft hover:bg-ink/5 max-[359px]:pr-2"
          aria-label={t("back")}
        >
          <LogoMark className="size-6 max-[359px]:hidden" />
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">{t("back")}</span>
        </Link>
        <div className="hidden min-w-0 flex-1 text-center md:block">
          <p className="font-display truncate text-base italic">{templateName}</p>
          <p className={cn("flex items-center justify-center gap-1 text-[11px]", s.tone)}>
            {s.icon}
            {s.text}
          </p>
        </div>
        <div className="flex min-w-0 flex-1 justify-center md:hidden">
          <div className="grid h-10 w-full max-w-[17rem] grid-cols-2 rounded-full border border-border bg-card p-[3px]" role="tablist">
            {(["edit", "preview"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => onView(v)}
                // The pill is 32px tall so the bar stays light; `after` carries the touch to 44.
                className={cn(
                  "relative min-w-0 truncate rounded-full px-1 text-[13px] font-medium transition-colors after:absolute after:inset-x-0 after:-inset-y-2 max-[374px]:px-0.5 max-[374px]:text-[12px]",
                  view === v ? "bg-ink text-paper" : "text-ink-soft",
                )}
              >
                {v === "edit" ? t("edit") : t("preview")}
              </button>
            ))}
          </div>
        </div>
        <Button
          onClick={onPublish}
          disabled={publishing}
          className="relative h-10 shrink-0 rounded-full px-5 text-sm shadow-glow after:absolute after:inset-x-0 after:-inset-y-0.5 max-[374px]:px-3.5"
        >
          {t("publish")}
        </Button>
      </div>
    </header>
  );
}
