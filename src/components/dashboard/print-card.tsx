"use client";

import { Printer } from "lucide-react";
import { LogoMark } from "@/components/shared/logo";

const S = {
  en: { line: "made you something.", cta: "Point your camera at this", sound: "Open it with your sound on", print: "Print", hint: "Prints two A6 cards per page. Choose “Actual size” in the print dialog." },
  es: { line: "te ha hecho algo.", cta: "Apunta tu cámara aquí", sound: "Ábrelo con el sonido activado", print: "Imprimir", hint: "Imprime dos tarjetas A6 por página. Elige «Tamaño real» en el diálogo de impresión." },
};

export function PrintCard({ svg, url, recipientName, senderName, accent, locale, brand }: { svg: string; url: string; recipientName: string; senderName: string; accent: string; locale: "en" | "es"; brand: string }) {
  const t = S[locale] ?? S.en;
  const nameSize = recipientName.length > 16 ? "15pt" : recipientName.length > 10 ? "18pt" : "22pt";
  const card = (
    <div className="card" style={{ borderColor: accent }}>
      <div className="head">
        <LogoMark className="mark" />
        <span>{brand}</span>
      </div>
      <p className="name" translate="no" style={{ fontSize: nameSize }}>{recipientName},</p>
      <p className="line"><span translate="no">{senderName}</span> {t.line}</p>
      <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="cta">{t.cta}</p>
      <p className="url">{url.replace(/^https?:\/\//, "")}</p>
      <p className="sound">{t.sound}</p>
    </div>
  );
  return (
    <div className="print-root">
      <style>{`
        .print-root{min-height:100dvh;background:#e9e3d8;padding:24px;display:flex;flex-direction:column;align-items:center;gap:16px;font-family:var(--font-sans),system-ui,sans-serif}
        .toolbar{display:flex;gap:12px;align-items:center;font-size:13px;color:#6f665f}
        .toolbar button{display:flex;align-items:center;gap:8px;background:#1A1614;color:#FAF7F2;border:0;border-radius:999px;padding:10px 18px;font-weight:600;cursor:pointer}
        .sheet{background:white;width:210mm;min-height:297mm;padding:12mm;display:grid;grid-template-rows:1fr 1fr;gap:10mm;box-shadow:0 20px 50px -20px rgba(0,0,0,.35)}
        .card{width:105mm;height:148mm;margin:0 auto;border:1.2mm solid;border-radius:6mm;padding:10mm 9mm;display:flex;flex-direction:column;align-items:center;text-align:center;background:#FAF7F2;color:#1A1614;position:relative}
        .head{display:flex;align-items:center;gap:6px;font-family:var(--font-display),Georgia,serif;font-style:italic;font-size:14pt}
        .mark{width:20px;height:20px}
        .name{margin-top:9mm;font-family:var(--font-display),Georgia,serif;font-size:22pt;line-height:1.05;font-style:italic;max-width:100%;overflow-wrap:anywhere}
        .line{margin-top:2mm;font-size:11pt;color:#3d3531;max-width:100%;overflow-wrap:anywhere}
        .qr{margin-top:7mm;width:46mm;height:46mm}
        .qr svg{width:100%;height:100%}
        .cta{margin-top:5mm;font-size:8pt;letter-spacing:.18em;text-transform:uppercase;color:#6f665f}
        .url{margin-top:2mm;font-family:ui-monospace,monospace;font-size:8.5pt}
        .sound{position:absolute;bottom:7mm;left:0;right:0;font-size:8pt;color:#6f665f}
        @page{size:A4;margin:0}
        @media print{.print-root{background:white;padding:0}.toolbar{display:none}.sheet{box-shadow:none;width:210mm;height:297mm}}
      `}</style>
      <div className="toolbar">
        <button type="button" onClick={() => window.print()}>
          <Printer size={16} />
          {t.print}
        </button>
        <span>{t.hint}</span>
      </div>
      <div className="sheet">
        {card}
        {card}
      </div>
    </div>
  );
}
