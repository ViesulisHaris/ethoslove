"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import type QRCodeStyling from "qr-code-styling";
import type { GiftPhoto } from "@/lib/gift/schema";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { composeQrSvg, qrCodeOptions, qrDesignQuery, QR_LABEL_MAX, QR_LOGO, type QrCentre, type QrCentreSize, type QrDots, type QrFrame } from "@/lib/qr/compose";
import { labelColour, normalHex, qrPalette, QR_BACKGROUNDS } from "@/lib/qr/palette";
import { Switch } from "@/components/ui/switch";
import { ColorInput } from "./color-input";
import { Field, Segmented } from "./field";

/** The size the PNG is drawn at: crisp on a printed card, still a small file. */
const PNG_SIZE = 1200;

const fileName = (name: string) =>
  `qr-for-${
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "you"
  }`;

function save(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}

export function QrDesigner({ url, photos, accent, giftId, recipientName = "" }: { url: string; photos: GiftPhoto[]; accent: string; giftId: string | null; recipientName?: string }) {
  const t = useTranslations("editor.qr");
  const qrRef = useRef<QRCodeStyling | null>(null);
  const [frame, setFrame] = useState<QrFrame>("none");
  const [dots, setDots] = useState<QrDots>("rounded");
  // An old draft can carry a colour that isn't a hex; the code still has to draw.
  const [colour, setColour] = useState(() => normalHex(accent, "#1a1614"));
  const [background, setBackground] = useState("#FAF7F2");
  const [gradient, setGradient] = useState(false);
  const [centre, setCentre] = useState<QrCentre>("logo");
  const [centreSize, setCentreSize] = useState<QrCentreSize>("m");
  const [photoId, setPhotoId] = useState(photos[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [svg, setSvg] = useState("");
  const [busy, setBusy] = useState(false);

  const palette = useMemo(() => qrPalette(colour, background), [colour, background]);
  const photo = photos.find((p) => p.id === photoId) ?? photos[0];
  const image = centre === "logo" ? QR_LOGO : centre === "photo" ? photo?.url : undefined;

  // One drawing for the preview and both downloads: the frame, the code and the line under it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { default: QRCodeStyling } = await import("qr-code-styling");
      const options = qrCodeOptions({ url, dots, palette, gradient, image, centreSize });
      if (!qrRef.current) qrRef.current = new QRCodeStyling(options);
      else qrRef.current.update(options);
      const raw = await qrRef.current.getRawData("svg");
      if (cancelled || !raw) return;
      const code = raw instanceof Blob ? await raw.text() : String(raw);
      if (cancelled) return;
      setSvg(composeQrSvg({ qrSvg: code, frame, background, palette, label, labelFill: labelColour(palette, background) }));
    })();
    return () => {
      cancelled = true;
    };
  }, [url, dots, palette, gradient, image, centreSize, frame, background, label]);

  const preview = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : "";

  const downloadSvg = () => {
    if (!svg) return;
    const href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    save(href, `${fileName(recipientName)}.svg`);
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  };

  const downloadPng = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const img = new Image();
      img.src = preview;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = PNG_SIZE;
      canvas.height = PNG_SIZE;
      canvas.getContext("2d")!.drawImage(img, 0, 0, PNG_SIZE, PNG_SIZE);
      save(canvas.toDataURL("image/png"), `${fileName(recipientName)}.png`);
    } catch {
      // A browser that won't paint an SVG holding a photo onto a canvas still gets the code itself.
      await qrRef.current?.download({ extension: "png", name: fileName(recipientName) });
    } finally {
      setBusy(false);
    }
  };

  const printHref = giftId ? `/dashboard/gift/${giftId}/print?${qrDesignQuery({ dots, colour, gradient, centre, photo: photo?.id ?? "", size: centreSize, label })}` : null;

  return (
    <div className="grid gap-5">
      <div className="flex justify-center rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="relative aspect-square w-full max-w-[340px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview} alt={t("previewAlt")} className="absolute inset-0 h-full w-full" draggable={false} /> : <div className="absolute inset-0 animate-pulse rounded-2xl bg-muted" />}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("frame")}>
          <Segmented ariaLabel={t("frame")} value={frame} onChange={setFrame} options={[{ value: "none", label: t("frameNone") }, { value: "circle", label: t("frameCircle") }, { value: "heart", label: t("frameHeart") }]} />
        </Field>
        <Field label={t("dots")}>
          <Segmented ariaLabel={t("dots")} value={dots} onChange={setDots} options={[{ value: "rounded", label: t("dotsRounded") }, { value: "square", label: t("dotsSquare") }, { value: "dots", label: t("dotsDots") }, { value: "classy", label: t("dotsClassy") }]} />
        </Field>
      </div>
      <Field label={t("colour")}>
        <ColorInput value={colour} onChange={setColour} />
        {palette.adjusted ? <p className="mt-2 text-xs text-muted-foreground">{t("adjusted")}</p> : null}
      </Field>
      <Field label={t("background")}>
        <ColorInput value={background} onChange={setBackground} swatches={QR_BACKGROUNDS} />
        {palette.panel ? <p className="mt-2 text-xs text-muted-foreground">{t("panel")}</p> : null}
      </Field>
      <Field label={t("label")}>
        <input
          type="text"
          value={label}
          maxLength={QR_LABEL_MAX}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={recipientName ? t("labelPlaceholder", { name: recipientName }) : t("labelPlaceholderPlain")}
          className="h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm outline-none focus-visible:border-ink/50"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("centre")}>
          <Segmented ariaLabel={t("centre")} value={centre} onChange={setCentre} options={[{ value: "none", label: t("centreNone") }, { value: "logo", label: t("centreLogo") }, ...(photos.length ? [{ value: "photo" as const, label: t("centrePhoto") }] : [])]} />
        </Field>
        {centre !== "none" ? (
          <Field label={t("centreSize")}>
            <Segmented ariaLabel={t("centreSize")} value={centreSize} onChange={setCentreSize} options={[{ value: "s", label: t("sizeSmall") }, { value: "m", label: t("sizeMedium") }, { value: "l", label: t("sizeLarge") }]} />
          </Field>
        ) : null}
      </div>
      {centre === "photo" && photos.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label={t("centrePhoto")}>
          {photos.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={photo?.id === p.id} aria-label={p.caption || p.alt || t("centrePhoto")} onClick={() => setPhotoId(p.id)} className={cn("size-14 shrink-0 overflow-hidden rounded-lg ring-2", photo?.id === p.id ? "ring-coral" : "ring-transparent")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      {/* The site's own switch, not the browser's checkbox: the one control here that looked borrowed. */}
      <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2 text-sm">
        {t("gradient")}
        <Switch checked={gradient} onCheckedChange={setGradient} />
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={downloadPng} disabled={!svg || busy} className="flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper disabled:opacity-60">
          <Download className="size-4" />
          {t("downloadPng")}
        </button>
        <button type="button" onClick={downloadSvg} disabled={!svg} className="flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium hover:border-ink/40 disabled:opacity-60">
          <Download className="size-4" />
          {t("downloadSvg")}
        </button>
        {printHref ? (
          <Link href={printHref} className="flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium hover:border-ink/40">
            <Printer className="size-4" />
            {t("printCard")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
