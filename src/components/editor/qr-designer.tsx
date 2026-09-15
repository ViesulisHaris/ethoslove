"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import type QRCodeStyling from "qr-code-styling";
import type { GiftPhoto } from "@/lib/gift/schema";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ColorInput } from "./color-input";
import { Field, Segmented } from "./field";

type Frame = "none" | "circle" | "heart";
type Dots = "rounded" | "square" | "dots" | "classy";
type Centre = "none" | "logo" | "photo";

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M16 2.5c1.3 0 2 1.2 3.3 1.5s2.6-.5 3.7.3 1 2.2 1.9 3.2 2.4 1.2 2.9 2.4-.3 2.5 0 3.8 1.6 2.1 1.6 3.4-1.3 2.1-1.6 3.4.5 2.7 0 3.8-2 1.5-2.9 2.4-.8 2.5-1.9 3.2-2.4-.1-3.7.3S17.3 32 16 32s-2-1.2-3.3-1.5-2.6.5-3.7-.3-1-2.2-1.9-3.2-2.4-1.2-2.9-2.4.3-2.5 0-3.8S2.5 18.7 2.5 17.4s1.3-2.1 1.6-3.4-.5-2.7 0-3.8 2-1.5 2.9-2.4.8-2.5 1.9-3.2 2.4.1 3.7-.3S14.7 2.5 16 2.5Z" fill="#E8604C"/><path d="M16 10.2c-1.9-2.4-5.6-1.8-6.4 1.2-.6 2.3.9 4.2 2.7 5.8l3.7 3.3 3.7-3.3c1.8-1.6 3.3-3.5 2.7-5.8-.8-3-4.5-3.6-6.4-1.2Z" fill="#FFF8F4"/></svg>`;

/** Heart outline as an SVG path in a 100×100 box (used for the frame + canvas compositing). */
const HEART_PATH = "M50 88 C 20 66, 6 50, 6 32 C 6 18, 17 9, 29 9 C 38 9, 45 14, 50 21 C 55 14, 62 9, 71 9 C 83 9, 94 18, 94 32 C 94 50, 80 66, 50 88 Z";

export function QrDesigner({ url, photos, accent, giftId }: { url: string; photos: GiftPhoto[]; accent: string; giftId: string | null }) {
  const t = useTranslations("editor.qr");
  const holder = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const [frame, setFrame] = useState<Frame>("none");
  const [dots, setDots] = useState<Dots>("rounded");
  const [colour, setColour] = useState(accent);
  const [background, setBackground] = useState("#FAF7F2");
  const [gradient, setGradient] = useState(false);
  const [centre, setCentre] = useState<Centre>("logo");
  const [photoId, setPhotoId] = useState(photos[0]?.id ?? "");
  const frameRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState(300);

  // The preview is as wide as the card allows, so the code is sized from the frame, not a constant.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setBox(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Same proportions as the PNG export below: the heart's code sits between the lobes and the point.
  const qrSize = Math.max(96, Math.round(box * (frame === "heart" ? 0.4 : frame === "circle" ? 0.6 : 0.8)));

  const image = centre === "logo" ? `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}` : centre === "photo" ? photos.find((p) => p.id === photoId)?.url : undefined;

  useEffect(() => {
    let cancelled = false;
    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (cancelled || !holder.current) return;
      const options = {
        width: qrSize,
        height: qrSize,
        type: "svg" as const,
        data: url,
        margin: 8,
        image,
        qrOptions: { errorCorrectionLevel: "H" as const },
        imageOptions: { crossOrigin: "anonymous", margin: 6, imageSize: 0.35 },
        dotsOptions: {
          type: dots,
          color: colour,
          gradient: gradient ? { type: "linear" as const, rotation: Math.PI / 4, colorStops: [{ offset: 0, color: colour }, { offset: 1, color: "#D4A853" }] } : undefined,
        },
        cornersSquareOptions: { type: dots === "square" ? ("square" as const) : ("extra-rounded" as const), color: colour },
        cornersDotOptions: { type: dots === "square" ? ("square" as const) : ("dot" as const), color: colour },
        backgroundOptions: { color: "transparent" },
      };
      if (!qrRef.current) {
        qrRef.current = new QRCodeStyling(options);
        holder.current.innerHTML = "";
        qrRef.current.append(holder.current);
      } else {
        qrRef.current.update(options);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [url, dots, colour, gradient, image, qrSize]);

  /** Composites the frame + QR into a PNG so the download matches the preview. */
  const downloadPng = async () => {
    const qr = qrRef.current;
    if (!qr) return;
    const raw = await qr.getRawData("png");
    if (!raw) return;
    const blob = raw instanceof Blob ? raw : new Blob([raw as BlobPart]);
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    await img.decode();
    const S = 1200;
    const canvas = document.createElement("canvas");
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext("2d")!;
    if (frame === "none") {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, S, S);
      ctx.drawImage(img, S * 0.1, S * 0.1, S * 0.8, S * 0.8);
    } else if (frame === "circle") {
      ctx.fillStyle = background;
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(img, S * 0.2, S * 0.2, S * 0.6, S * 0.6);
    } else {
      ctx.save();
      ctx.scale(S / 100, S / 100);
      ctx.fillStyle = background;
      ctx.fill(new Path2D(HEART_PATH));
      ctx.restore();
      ctx.drawImage(img, S * 0.3, S * 0.24, S * 0.4, S * 0.4);
    }
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `ethos-qr-${frame}.png`;
    a.click();
    URL.revokeObjectURL(img.src);
  };

  return (
    <div className="grid gap-5">
      <div className="flex justify-center rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div
          ref={frameRef}
          className={cn("relative aspect-square w-full max-w-[340px]", frame === "none" && "rounded-2xl", frame === "circle" && "rounded-full")}
          style={frame === "heart" ? { background, clipPath: `path("${HEART_PATH.replace(/(\d+(\.\d+)?)/g, (m) => String((Number(m) * box) / 100))}")` } : { background }}
        >
          <div ref={holder} className={cn("absolute left-1/2 -translate-x-1/2 [&_canvas]:block [&_svg]:block", frame === "heart" ? "top-[24%]" : "top-1/2 -translate-y-1/2")} />
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
      </Field>
      <Field label={t("background")}>
        <ColorInput value={background} onChange={setBackground} swatches={["#FAF7F2", "#FFFFFF", "#F4C7C3", "#1A1614", "#D4A853", "#F1ECE4"]} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("centre")}>
          <Segmented ariaLabel={t("centre")} value={centre} onChange={setCentre} options={[{ value: "none", label: t("centreNone") }, { value: "logo", label: t("centreLogo") }, { value: "photo", label: t("centrePhoto") }]} />
        </Field>
        <label className="flex items-center gap-3 self-end rounded-xl border border-border bg-card px-3.5 py-3 text-sm">
          <input type="checkbox" checked={gradient} onChange={(e) => setGradient(e.target.checked)} className="size-4 accent-coral" />
          {t("gradient")}
        </label>
      </div>
      {centre === "photo" && photos.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.url} alt="" onClick={() => setPhotoId(p.id)} className={cn("size-14 shrink-0 cursor-pointer rounded-lg object-cover ring-2", photoId === p.id ? "ring-coral" : "ring-transparent")} />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={downloadPng} className="flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper">
          <Download className="size-4" />
          {t("downloadPng")}
        </button>
        <button type="button" onClick={() => qrRef.current?.download({ extension: "svg", name: "ethos-qr" })} className="flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium hover:border-ink/40">
          <Download className="size-4" />
          {t("downloadSvg")}
        </button>
        {giftId ? (
          <Link href={`/dashboard/gift/${giftId}/print`} className="flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium hover:border-ink/40">
            <Printer className="size-4" />
            {t("printCard")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
