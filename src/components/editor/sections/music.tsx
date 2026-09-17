"use client";
/* eslint-disable @next/next/no-img-element -- album artwork comes from Apple's CDN */

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Music2, Pause, Play, Search, Sparkles, Upload, X } from "lucide-react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import type { CatalogSong } from "@/app/api/music/search/route";
import { useTranslations } from "next-intl";
import { useEditor } from "@/lib/editor/store";
import { uploadTypeFor } from "@/lib/editor/media-types";
import { reasonOf } from "@/lib/editor/failed-uploads";
import { LIBRARY_TRACKS, TRACK_MOODS, type TrackMood } from "@/lib/editor/music-library";
import { LIMITS } from "@/config/site";
import { cn } from "@/lib/utils";
import { Field, SectionHeader, Segmented } from "../field";
import { Waveform } from "../waveform";
import { SongLinkField } from "../song-link-field";

type Mode = "none" | "library" | "song" | "upload";

export function MusicSection() {
  const t = useTranslations("editor.music");
  const tS = useTranslations("editor.sections.music");
  const tP = useTranslations("editor.publishSheet");
  const music = useEditor((s) => s.data.music);
  // The sender's own file: whether it made it up, and if not, why.
  const upload = useEditor((s) => (s.data.music?.source === "upload" && s.data.music.trackId ? s.assets[s.data.music.trackId] : undefined));
  const uploadNote = !upload
    ? null
    : upload.status === "uploading"
      ? t("uploadingPct", { pct: Math.round(upload.progress * 100) })
      : upload.status === "uploaded"
        ? t("uploadedOk")
        : upload.status === "error"
          ? (() => {
              const reason = reasonOf(upload.error);
              return reason === "type"
                ? tP("failed.typeAudio")
                : reason === "too_big"
                  ? tP("failed.tooBig", { mb: Math.round(LIMITS.uploadMaxBytes / 1024 / 1024) })
                  : tP(`failed.${reason}`);
            })()
          : null;
  const setLibraryTrack = useEditor((s) => s.setLibraryTrack);
  const setCatalogTrack = useEditor((s) => s.setCatalogTrack);
  const locale = useLocale();
  const setUploadedMusic = useEditor((s) => s.setUploadedMusic);
  const setMusicStart = useEditor((s) => s.setMusicStart);
  const clearMusic = useEditor((s) => s.clearMusic);
  const [mode, setMode] = useState<Mode>(
    music ? (music.source === "catalog" ? "song" : music.source) : "none",
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogSong[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [mood, setMood] = useState<TrackMood | "all">("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => audioRef.current?.pause(), []);

  const togglePreview = (id: string, url: string, startAt = 0) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const a = new Audio(url);
    a.currentTime = startAt;
    a.volume = 0.9;
    a.onended = () => setPlayingId(null);
    a.play().catch(() => setPlayingId(null));
    audioRef.current = a;
    setPlayingId(id);
  };

  const tracks = LIBRARY_TRACKS.filter((tr) => mood === "all" || tr.mood === mood);

  // Debounced catalogue search; the route caches upstream results for a day.
  useEffect(() => {
    if (mode !== "song") return;
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const id = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/music/search?q=${encodeURIComponent(q)}&country=${locale === "es" ? "ES" : "US"}`,
          { signal: ctrl.signal },
        );
        const json = (await res.json()) as { songs: CatalogSong[] };
        setResults(json.songs ?? []);
      } catch {
        if (!ctrl.signal.aborted) setResults([]);
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => {
      window.clearTimeout(id);
      ctrl.abort();
    };
  }, [query, mode, locale]);

  return (
    <section>
      <SectionHeader n={tS("n")} title={tS("title")} blurb={tS("blurb")} />
      <Segmented
        ariaLabel={tS("title")}
        value={mode}
        onChange={(m) => {
          setMode(m);
          if (m === "none") clearMusic();
        }}
        options={[
          { value: "none", label: t("none") },
          { value: "library", label: t("library") },
          { value: "song", label: t("song") },
          { value: "upload", label: t("upload") },
        ]}
      />

      {mode === "library" ? (
        <div className="mt-5">
          <div className="-mx-1 scrollbar-none flex gap-2 overflow-x-auto px-1 pb-1">
            {(["all", ...TRACK_MOODS] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(m)}
                className={cn(
                  "relative h-8 shrink-0 rounded-full border px-3 text-xs after:absolute after:inset-x-0 after:-inset-y-1.5",
                  mood === m ? "border-ink bg-ink text-paper" : "border-border bg-card",
                )}
              >
                {m === "all" ? "·" : t(`mood.${m}`)}
              </button>
            ))}
          </div>
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
            {tracks.map((tr) => {
              const selected = music?.source === "library" && music.trackId === tr.id;
              return (
                <li
                  key={tr.id}
                  className={cn("flex items-center gap-3 px-3 py-2.5", selected && "bg-accent/60")}
                >
                  <button
                    type="button"
                    onClick={() => togglePreview(tr.id, tr.url)}
                    aria-label={playingId === tr.id ? t("previewStop") : t("previewPlay")}
                    className="relative grid size-9 after:absolute after:-inset-1 shrink-0 place-items-center rounded-full bg-ink text-paper"
                  >
                    {playingId === tr.id ? (
                      <Pause className="size-4" />
                    ) : (
                      <Play className="ml-0.5 size-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryTrack(selected ? null : tr)}
                    className="flex min-w-0 flex-1 flex-col items-start text-left"
                  >
                    <span className="text-sm font-medium">{tr.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {tr.note} · {t(`mood.${tr.mood}`)}
                    </span>
                  </button>
                  <span
                    className={cn(
                      "size-4 rounded-full border",
                      selected ? "border-coral bg-coral" : "border-border",
                    )}
                    aria-hidden="true"
                  />
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">{t("licenseNote")}</p>
        </div>
      ) : null}

      {mode === "song" ? (
        <div className="mt-5">
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-semibold text-ink">
              <Sparkles className="size-3" />
              {t("songPremium")}
            </span>
            <span>{t("songHint")}</span>
          </div>
          {music?.source === "catalog" ? (
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-coral/40 bg-accent/60 p-3">
              {music.artwork ? (
                <img src={music.artwork} alt="" className="size-12 rounded-md object-cover" />
              ) : (
                <Music2 className="size-5 text-coral" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{music.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {music.artist} · {t("songSelected")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => togglePreview("catalog", music.url)}
                className="relative grid size-8 after:absolute after:-inset-1.5 place-items-center rounded-full bg-ink text-paper"
                aria-label={t("previewPlay")}
              >
                {playingId === "catalog" ? (
                  <Pause className="size-3.5" />
                ) : (
                  <Play className="ml-0.5 size-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setCatalogTrack(null)}
                className="relative grid size-8 after:absolute after:-inset-1.5 place-items-center rounded-full hover:bg-ink/5"
                aria-label={t("none")}
              >
                <X className="size-4" />
              </button>
            </div>
          ) : null}
          <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 focus-within:border-ink">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("songSearch")}
              className="min-w-0 flex-1 bg-transparent text-base outline-none md:text-sm"
              aria-label={t("songSearch")}
              data-testid="song-search"
            />
            {searching ? (
              <span className="size-3 animate-pulse rounded-full bg-coral" aria-hidden="true" />
            ) : null}
          </label>
          {results && query.trim().length >= 2 ? (
            results.length === 0 && !searching ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("songNone")}</p>
            ) : (
              <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
                {results.map((song) => {
                  const selected = music?.source === "catalog" && music.trackId === song.id;
                  return (
                    <li
                      key={song.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2",
                        selected && "bg-accent/60",
                      )}
                    >
                      <img
                        src={song.artwork}
                        alt=""
                        className="size-10 shrink-0 rounded-md object-cover"
                        loading="lazy"
                      />
                      <button
                        type="button"
                        onClick={() => setCatalogTrack(selected ? null : song)}
                        className="flex min-w-0 flex-1 flex-col items-start text-left"
                        data-testid="song-result"
                      >
                        <span className="max-w-full truncate text-sm font-medium">{song.title}</span>
                        <span className="max-w-full truncate text-xs text-muted-foreground">
                          {song.artist}
                          {song.album ? ` · ${song.album}` : ""}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePreview(song.id, song.previewUrl)}
                        aria-label={playingId === song.id ? t("previewStop") : t("previewPlay")}
                        className="relative grid size-8 after:absolute after:-inset-1.5 shrink-0 place-items-center rounded-full bg-ink text-paper"
                      >
                        {playingId === song.id ? (
                          <Pause className="size-3.5" />
                        ) : (
                          <Play className="ml-0.5 size-3.5" />
                        )}
                      </button>
                      <span
                        className={cn(
                          "size-4 shrink-0 rounded-full border",
                          selected ? "border-coral bg-coral" : "border-border",
                        )}
                        aria-hidden="true"
                      />
                    </li>
                  );
                })}
              </ul>
            )
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">{t("songPreviewNote")}</p>
        </div>
      ) : null}

      {mode === "upload" ? (
        <div className="mt-5">
          {music?.source === "upload" ? (
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-3">
                <Music2 className="size-4 text-coral" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{music.title}</span>
                <button
                  type="button"
                  onClick={() => togglePreview("upload", music.url, music.startAt)}
                  className="relative grid size-8 after:absolute after:-inset-1.5 place-items-center rounded-full bg-ink text-paper"
                  aria-label={t("previewPlay")}
                >
                  {playingId === "upload" ? (
                    <Pause className="size-3.5" />
                  ) : (
                    <Play className="ml-0.5 size-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={clearMusic}
                  className="relative grid size-8 after:absolute after:-inset-1.5 place-items-center rounded-full hover:bg-ink/5"
                  aria-label={t("none")}
                >
                  <X className="size-4" />
                </button>
              </div>
              {uploadNote ? (
                <p
                  className={cn("mt-2 flex items-start gap-1.5 text-xs", upload?.status === "error" ? "text-destructive" : "text-muted-foreground")}
                  role={upload?.status === "error" ? "alert" : undefined}
                  data-testid="song-upload-status"
                >
                  {upload?.status === "uploading" ? <Loader2 className="mt-px size-3 shrink-0 animate-spin" /> : null}
                  {upload?.status === "error" ? <AlertCircle className="mt-px size-3.5 shrink-0" /> : null}
                  <span className="min-w-0">{uploadNote}</span>
                </p>
              ) : null}
              <Field label={`${t("startAt")} · ${formatTime(music.startAt ?? 0)}`} className="mt-3">
                <Waveform
                  url={music.url}
                  startAt={music.startAt ?? 0}
                  duration={180}
                  onSeek={setMusicStart}
                />
              </Field>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-8 text-center hover:border-ink/40"
            >
              <Upload className="size-5 text-coral" />
              <span className="mt-3 text-sm font-medium">{t("upload")}</span>
              <span className="mt-1 text-xs text-muted-foreground">
                {t("uploadHint", { mb: Math.round(LIMITS.audioMaxBytes / 1024 / 1024) })}
              </span>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,.mp3,.m4a,.m4r,.aac,.wav"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              // Say no at the door, rather than letting a file sit on "uploading" and block the gift.
              if (!uploadTypeFor("audio", f.type, f.name)) toast.error(t("badType"));
              else if (f.size > LIMITS.audioMaxBytes) toast.error(t("tooBig", { mb: Math.round(LIMITS.audioMaxBytes / 1024 / 1024) }));
              else void setUploadedMusic(f);
            }}
          />
        </div>
      ) : null}

      {mode === "library" && music?.source === "library" ? (
        <Field label={`${t("startAt")} · ${formatTime(music.startAt ?? 0)}`} className="mt-4">
          <Waveform
            url={music.url}
            startAt={music.startAt ?? 0}
            duration={LIBRARY_TRACKS.find((tr) => tr.id === music.trackId)?.duration ?? 60}
            onSeek={setMusicStart}
          />
        </Field>
      ) : null}

      <SongLinkField />
    </section>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}
