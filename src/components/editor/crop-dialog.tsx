"use client";

import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { useTranslations } from "next-intl";
import type { GiftPhoto } from "@/lib/gift/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

const ASPECTS: { label: string; value: number | undefined }[] = [
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "3:4", value: 3 / 4 },
  { label: "16:9", value: 16 / 9 },
];

export function CropDialog({ photo, onClose, onApply }: { photo: GiftPhoto | null; onClose: () => void; onApply: (crop: Area) => Promise<void> }) {
  const t = useTranslations("editor.photos");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number>(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={Boolean(photo)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t("crop")}</DialogTitle>
        </DialogHeader>
        {photo ? (
          <>
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-night">
              <Cropper image={photo.url} crop={crop} zoom={zoom} aspect={aspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} />
            </div>
            <div className="flex items-center gap-2">
              {ASPECTS.map((a) => (
                <button key={a.label} type="button" onClick={() => setAspect(a.value ?? 1)} className={aspect === a.value ? "relative h-8 rounded-full bg-ink px-3 text-xs text-paper after:absolute after:inset-x-0 after:-inset-y-1.5" : "relative h-8 rounded-full border border-border px-3 text-xs after:absolute after:inset-x-0 after:-inset-y-1.5"}>
                  {a.label}
                </button>
              ))}
            </div>
            <Slider value={[zoom]} min={1} max={3} step={0.01} onValueChange={([z]) => setZoom(z)} aria-label="Zoom" />
            <Button
              className="h-11 rounded-full"
              disabled={!area || busy}
              onClick={async () => {
                if (!area) return;
                setBusy(true);
                await onApply(area);
                setBusy(false);
                setZoom(1);
                setCrop({ x: 0, y: 0 });
              }}
            >
              {t("done")}
            </Button>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
