"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useState, type DragEvent } from "react";
import { closestCenter, DndContext, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, Crop, ImagePlus, Loader2, RotateCw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { GiftPhoto } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";
import { useEditor } from "@/lib/editor/store";
import { LIMITS } from "@/config/site";
import { cn } from "@/lib/utils";
import { SectionHeader } from "../field";
import { CropDialog } from "../crop-dialog";

const ACCEPT = "image/*,.heic,.heif";

export function PhotosSection({ manifest }: { manifest: TemplateManifest }) {
  const t = useTranslations("editor.photos");
  const photos = useEditor((s) => s.data.photos);
  const assets = useEditor((s) => s.assets);
  const addPhotos = useEditor((s) => s.addPhotos);
  const removePhoto = useEditor((s) => s.removePhoto);
  const movePhoto = useEditor((s) => s.movePhoto);
  const updatePhoto = useEditor((s) => s.updatePhoto);
  const editPhoto = useEditor((s) => s.editPhoto);
  const retryUploads = useEditor((s) => s.retryUploads);
  const dropFailedUploads = useEditor((s) => s.dropFailedUploads);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [cropping, setCropping] = useState<GiftPhoto | null>(null);
  const tSections = useTranslations("editor.sections.photos");

  const max = manifest.features.photos.max;
  const processing = Object.values(assets).filter((a) => a.kind === "photo" && a.status === "processing");
  const failed = Object.values(assets).filter((a) => a.kind === "photo" && a.status === "error" && !a.storagePath);
  const retryable = failed.some((a) => a.error !== "missing_blob");
  const full = photos.length >= max;

  const pick = (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (photos.length + list.length > max) list.length = Math.max(0, max - photos.length);
    if (list.length) void addPhotos(list);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    pick(e.dataTransfer.files);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = photos.findIndex((p) => p.id === active.id);
    const to = photos.findIndex((p) => p.id === over.id);
    if (from >= 0 && to >= 0) movePhoto(from, to);
  };

  return (
    <section>
      <SectionHeader n={tSections("n")} title={tSections("title")} blurb={tSections("blurb")} />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-8 text-center transition-colors",
          dragOver ? "border-coral bg-accent" : "border-border bg-card",
          full && "opacity-60",
        )}
      >
        <ImagePlus className="size-6 text-coral" />
        <p className="mt-3 text-sm text-ink-soft">
          {t("drop")}{" "}
          <button type="button" onClick={() => inputRef.current?.click()} disabled={full} className="font-medium text-coral underline underline-offset-4">
            {t("browse")}
          </button>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{t("formats", { max })}</p>
        <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
      </div>
      {full ? <p className="mt-2 text-xs text-muted-foreground">{t("tooMany", { max })}</p> : photos.length >= LIMITS.free.maxPhotos ? <p className="mt-2 text-xs text-muted-foreground">{t("free10")}</p> : null}

      {failed.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm" role="alert">
          <AlertCircle className="size-4 shrink-0 text-destructive" />
          <span className="min-w-0 flex-1">{retryable ? t("failedBanner", { n: failed.length }) : t("failedMissing", { n: failed.length })}</span>
          {retryable ? (
            <button type="button" onClick={() => void retryUploads()} className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-paper">
              {t("retry")}
            </button>
          ) : null}
          <button type="button" onClick={() => void dropFailedUploads()} className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium">
            {t("removeFailed")}
          </button>
        </div>
      ) : null}

      {photos.length > 0 || processing.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((photo, i) => (
                <PhotoTile
                  key={photo.id}
                  photo={photo}
                  index={i}
                  status={assets[photo.id]?.status ?? "uploaded"}
                  onCaption={(caption) => updatePhoto(photo.id, { caption })}
                  onRemove={() => void removePhoto(photo.id)}
                  onRotate={() => void editPhoto(photo.id, { rotate: 90 })}
                  onCrop={() => setCropping(photo)}
                />
              ))}
              {processing.map((a) => (
                <li key={a.id} className="flex aspect-square flex-col items-center justify-center rounded-xl border border-border bg-card text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="mt-2">{t("processing")}</span>
                </li>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : null}

      <CropDialog
        photo={cropping}
        onClose={() => setCropping(null)}
        onApply={async (crop) => {
          if (cropping) await editPhoto(cropping.id, { crop });
          setCropping(null);
        }}
      />
    </section>
  );
}

function PhotoTile({
  photo,
  index,
  status,
  onCaption,
  onRemove,
  onRotate,
  onCrop,
}: {
  photo: GiftPhoto;
  index: number;
  status: string;
  onCaption: (v: string) => void;
  onRemove: () => void;
  onRotate: () => void;
  onCrop: () => void;
}) {
  const t = useTranslations("editor.photos");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const progress = useEditor((s) => s.assets[photo.id]?.progress ?? 0);
  const failure = useEditor((s) => s.assets[photo.id]?.error);
  const statusLabel: Record<string, string> = {
    uploading: `${t("uploading")} ${Math.round(progress * 100)}%`,
    uploaded: t("uploaded"),
    local: t("local"),
    error: failure === "missing_blob" ? t("missing") : t("failed"),
    processing: t("processing"),
  };

  return (
    <li ref={setNodeRef} style={style} className={cn("group flex flex-col gap-2", isDragging && "z-10 opacity-80")}>
      <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-paper-deep shadow-soft">
        <img src={photo.url} alt={photo.alt ?? ""} className="h-full w-full object-cover" draggable={false} {...attributes} {...listeners} />
        <span className="absolute top-2 left-2 grid size-6 place-items-center rounded-full bg-black/55 text-[11px] font-semibold text-white tabular-nums">{index + 1}</span>
        <span className={cn("absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur", status === "uploaded" ? "bg-moss/80 text-white" : status === "error" ? "bg-destructive text-white" : "bg-black/55 text-white")}>
          {status === "uploading" ? <Loader2 className="mr-1 inline size-3 animate-spin" /> : null}
          {statusLabel[status] ?? status}
        </span>
        <div className="absolute top-2 right-2 flex gap-1">
          <button type="button" onClick={onRotate} aria-label={t("rotate")} className="grid size-7 place-items-center rounded-full bg-black/55 text-white hover:bg-black/75">
            <RotateCw className="size-3.5" />
          </button>
          <button type="button" onClick={onCrop} aria-label={t("crop")} className="grid size-7 place-items-center rounded-full bg-black/55 text-white hover:bg-black/75">
            <Crop className="size-3.5" />
          </button>
          <button type="button" onClick={onRemove} aria-label={t("remove")} className="grid size-7 place-items-center rounded-full bg-black/55 text-white hover:bg-destructive">
            <X className="size-3.5" />
          </button>
        </div>
      </div>
      <input
        value={photo.caption ?? ""}
        maxLength={LIMITS.captionMaxChars}
        onChange={(e) => onCaption(e.target.value)}
        placeholder={t("captionPlaceholder")}
        aria-label={t("caption")}
        className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-sm placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30 focus:outline-none"
      />
    </li>
  );
}
