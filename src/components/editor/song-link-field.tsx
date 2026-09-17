"use client";
/* eslint-disable @next/next/no-img-element -- covers come from the song's own provider */

import { useRef, useState } from "react";
import { Link2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SongLinkPreview } from "@/app/api/music/oembed/route";
import { useEditor } from "@/lib/editor/store";
import { SONG_PROVIDER_NAMES, parseSongLink } from "@/lib/gift/song-link";
import { Input } from "@/components/ui/input";

/**
 * "This song reminds me of you": paste a YouTube, Spotify or Apple Music link, we look up its title
 * and cover once, and the end screen of every template shows it. Free on every template.
 */
export function SongLinkField() {
  const t = useTranslations("editor.music");
  const dedication = useEditor((s) => s.data.dedication);
  const patch = useEditor((s) => s.patch);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "invalid">("idle");
  const timer = useRef<number | null>(null);

  const lookup = (value: string) => {
    if (timer.current) window.clearTimeout(timer.current);
    if (!value.trim()) return setState("idle");
    const link = parseSongLink(value);
    if (!link) return setState("invalid");
    setState("loading");
    timer.current = window.setTimeout(async () => {
      let preview: Partial<SongLinkPreview> = {};
      try {
        const res = await fetch(`/api/music/oembed?url=${encodeURIComponent(link.url)}`);
        if (res.ok) preview = (await res.json()) as SongLinkPreview;
      } catch {
        // The link still works without a title or cover.
      }
      const note = useEditor.getState().data.dedication?.note;
      patch({ dedication: { url: link.url, title: preview.title, artist: preview.artist, thumbnail: preview.thumbnail, note } });
      setDraft("");
      setState("idle");
    }, 350);
  };

  const provider = dedication ? parseSongLink(dedication.url)?.provider : undefined;

  return (
    <div className="mt-8 border-t border-dashed border-border pt-6">
      <p className="text-[13px] font-medium">{t("dedicationTitle")}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{t("dedicationHelp")}</p>

      {dedication ? (
        <>
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-coral/40 bg-accent/60 p-3">
            <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
              {dedication.thumbnail ? <img src={dedication.thumbnail} alt="" className="h-full w-full object-cover" /> : <Link2 className="m-3.5 size-5 text-coral" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{dedication.title || (provider ? SONG_PROVIDER_NAMES[provider] : dedication.url)}</p>
              <p className="truncate text-xs text-muted-foreground">{dedication.artist ?? dedication.url.replace(/^https:\/\//, "")}</p>
            </div>
            <button
              type="button"
              onClick={() => patch({ dedication: undefined })}
              aria-label={t("dedicationRemove")}
              className="relative grid size-8 after:absolute after:-inset-1.5 shrink-0 place-items-center rounded-full hover:bg-ink/5"
            >
              <X className="size-4" />
            </button>
          </div>
          <Input
            value={dedication.note ?? ""}
            maxLength={80}
            placeholder={t("dedicationNotePlaceholder")}
            aria-label={t("dedicationNote")}
            onChange={(e) => patch({ dedication: { ...dedication, note: e.target.value || undefined } })}
            className="mt-3 h-11"
          />
        </>
      ) : (
        <label className="mt-3 flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 focus-within:border-ink">
          <Link2 className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              lookup(e.target.value);
            }}
            placeholder={t("dedicationPlaceholder")}
            inputMode="url"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-base outline-none md:text-sm"
            aria-label={t("dedicationTitle")}
            data-testid="song-link"
          />
          {state === "loading" ? <span className="size-3 shrink-0 animate-pulse rounded-full bg-coral" aria-hidden="true" /> : null}
        </label>
      )}
      {state === "invalid" && !dedication ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {t("dedicationInvalid")}
        </p>
      ) : null}
    </div>
  );
}
