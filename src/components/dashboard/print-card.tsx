"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Printer } from "lucide-react";
import type QRCodeStyling from "qr-code-styling";
import { LogoMark } from "@/components/shared/logo";
import { qrCodeOptions, QR_LOGO, type QrDesign } from "@/lib/qr/compose";
import { darkenUntil, qrPalette } from "@/lib/qr/palette";

const S = {
  en: {
    line: "made you something.",
    cta: "Point your camera at this",
    sound: "Open it with your sound on",
    print: "Print",
    hint: "Prints two A6 cards per page. Choose “Actual size” in the print dialog.",
    adjust: "Adjust the card",
    paper: "Paper",
    papers: { cream: "Cream", white: "White", blush: "Blush", sage: "Sage" },
    name: "First line",
    message: "Second line",
    showUrl: "Show the web address",
    qrAlt: "QR code for the gift",
    tag: {
      for: "For",
      scan: "Scan on Christmas morning",
      from: "from",
      print: "Print The Tree Tag",
      hint: "Prints four tags per page. Cut along the lines, punch the hole, and tie it to the tree.",
      adjust: "Adjust the tag",
      name: "Their name",
      sender: "From",
      message: "Line under the code",
      tree: "Show the tree",
    },
  },
  es: {
    line: "te ha hecho algo.",
    cta: "Apunta tu cámara aquí",
    sound: "Ábrelo con el sonido activado",
    print: "Imprimir",
    hint: "Imprime dos tarjetas A6 por página. Elige «Tamaño real» en el diálogo de impresión.",
    adjust: "Ajusta la tarjeta",
    paper: "Papel",
    papers: { cream: "Crema", white: "Blanco", blush: "Rosa", sage: "Salvia" },
    name: "Primera línea",
    message: "Segunda línea",
    showUrl: "Mostrar la dirección web",
    qrAlt: "Código QR del regalo",
    tag: {
      for: "Para",
      scan: "Escanéame la mañana de Navidad",
      from: "de",
      print: "Imprimir la etiqueta",
      hint: "Imprime cuatro etiquetas por página. Recorta por las líneas, perfora el agujero y átala al árbol.",
      adjust: "Ajusta la etiqueta",
      name: "Para quién",
      sender: "De",
      message: "Línea bajo el código",
      tree: "Mostrar el árbol",
    },
  },
};

/** The card's print styles, in millimetres and points. The tag's own are TAG_STYLE, below; neither touches the other's selectors. */
const CARD_STYLE = `
        .print-root{min-height:100dvh;background:#e9e3d8;padding:24px;display:flex;flex-direction:column;align-items:center;gap:16px;font-family:var(--font-sans),system-ui,sans-serif}
        .toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:center;font-size:13px;color:#6f665f;max-width:210mm}
        .toolbar>button{display:flex;align-items:center;gap:8px;background:#1A1614;color:#FAF7F2;border:0;border-radius:999px;padding:10px 18px;font-weight:600;cursor:pointer}
        .adjust{width:100%;max-width:210mm;background:#FAF7F2;border-radius:16px;padding:14px 16px;display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));font-size:13px;color:#3d3531}
        .adjust b{grid-column:1/-1;font-family:var(--font-display),Georgia,serif;font-style:italic;font-weight:400;font-size:17px}
        .adjust label{display:grid;gap:6px}
        .adjust input[type=text]{height:40px;border:1px solid #d9cfbf;border-radius:10px;padding:0 10px;font-size:14px;background:#fff}
        .papers{display:flex;gap:8px;flex-wrap:wrap}
        .papers button{display:flex;align-items:center;gap:6px;border:1px solid #d9cfbf;border-radius:999px;padding:6px 10px;background:#fff;cursor:pointer;font-size:13px}
        .papers button[aria-pressed=true]{border-color:#1A1614}
        .papers i{width:16px;height:16px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)}
        .check{display:flex !important;grid-auto-flow:column;align-items:center;gap:8px !important}
        .sheet{background:white;width:210mm;min-height:297mm;padding:12mm;display:grid;grid-template-rows:1fr 1fr;gap:10mm;box-shadow:0 20px 50px -20px rgba(0,0,0,.35)}
        .card{width:105mm;height:148mm;margin:0 auto;border:1.2mm solid;border-radius:6mm;padding:10mm 9mm;display:flex;flex-direction:column;align-items:center;text-align:center;color:#1A1614;position:relative}
        .head{display:flex;align-items:center;gap:6px;font-family:var(--font-display),Georgia,serif;font-style:italic;font-size:14pt}
        .mark{width:20px;height:20px}
        .name{margin-top:9mm;font-family:var(--font-display),Georgia,serif;line-height:1.05;font-style:italic;max-width:100%;overflow-wrap:anywhere;min-height:1em}
        .line{margin-top:2mm;font-size:11pt;color:#3d3531;max-width:100%;overflow-wrap:anywhere}
        .qr{margin-top:7mm;width:46mm;height:46mm}
        .qr img{display:block;width:100%;height:100%}
        .label{margin-top:3mm;font-family:Georgia,serif;font-style:italic;font-size:12pt}
        .cta{margin-top:4mm;font-size:8pt;letter-spacing:.18em;text-transform:uppercase;color:#6f665f}
        .url{margin-top:2mm;font-family:ui-monospace,monospace;font-size:8.5pt}
        .sound{position:absolute;bottom:7mm;left:0;right:0;font-size:8pt;color:#6f665f}
        @page{size:A4;margin:0}
        @media print{.print-root{background:white;padding:0}.toolbar,.adjust{display:none}.sheet{box-shadow:none;width:210mm;height:297mm}}
      `;

/**
 * The Tree Tag's print styles: four 74 × 105 mm tags, two by two, centred on whatever page the printer
 * holds (A4 or Letter, one page either way). Each part has a fixed height, so a long name, or none,
 * never moves the code. Only `.tag…` selectors, an @page that comes after the card's, and, in print,
 * the dashboard's sidebar and top bar put away (a printer's page is wide enough for the sidebar) and
 * the screen-high minimums dropped (a page exactly one screen high spilled onto a blank second page).
 * On a phone's screen the tags stand in one column, so nothing runs off the side; print is unchanged.
 */
const TAG_STYLE = `
.tag-sheet{background:white;width:210mm;padding:14mm 0 16mm;display:grid;grid-template-columns:repeat(2,74mm);grid-auto-rows:105mm;gap:8mm 10mm;justify-content:center;align-content:start;box-shadow:0 20px 50px -20px rgba(0,0,0,.35)}
.tag{position:relative;width:74mm;height:105mm;color:#1A1614;text-align:center;break-inside:avoid}
.tag-edge{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.tag-body{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;padding:14.5mm 6mm 0}
.tag-for{height:4mm;line-height:4mm;font-size:8pt;letter-spacing:.2em;text-transform:uppercase;color:#6f665f}
.tag-name{height:14mm;width:100%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display),Georgia,serif;font-style:italic;line-height:1.05;overflow:hidden}
.tag-name span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;max-width:100%}
.tag-tile{margin-top:1.5mm;background:#fff;border-radius:3mm;padding:2.5mm;box-shadow:0 0 0 .2mm rgba(26,22,20,.16)}
.tag-qr{width:38mm;height:38mm}
.tag-qr img{display:block;width:100%;height:100%}
.tag-line{margin-top:3mm;height:7mm;max-width:52mm;font-size:7.5pt;line-height:1.3;letter-spacing:.16em;text-transform:uppercase;color:#6f665f;overflow:hidden;overflow-wrap:anywhere}
.tag-from{margin-top:2.5mm;height:9.5mm;width:38mm;font-family:var(--font-display),Georgia,serif;font-style:italic;line-height:1.2;overflow:hidden}
.tag-from span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.tag-tree{position:absolute;right:3.5mm;bottom:3mm;width:14mm;height:14mm;object-fit:contain}
@media screen and (max-width:820px){.tag-sheet{width:100%;grid-template-columns:74mm;padding:8mm 0}}
@page{size:auto;margin:0}
@media print{.tag-sheet{box-shadow:none;width:100%}aside[data-app-hide],header[data-app-hide]{display:none !important}.print-root:has(.tag-sheet),.min-h-dvh:has(.tag-sheet){min-height:0 !important}html:has(.tag-sheet),body:has(.tag-sheet),.min-h-dvh:has(.tag-sheet){background:#fff !important}}
`;

/** What the print page draws: the A6 card (two to a page), or The Tree Tag (four to a page, a holiday extra). */
export type PrintShape = "card" | "tree-tag";

/** The card stocks: all light, so the code on them always scans. */
const PAPERS = { cream: "#FAF7F2", white: "#FFFFFF", blush: "#FBE3E8", sage: "#E8EFE4" } as const;
type Paper = keyof typeof PAPERS;

export function PrintCard({ url, recipientName, senderName, accent, locale, brand, design, photoUrl, shape = "card" }: { url: string; recipientName: string; senderName: string; accent: string; locale: "en" | "es"; brand: string; design: QrDesign; photoUrl: string | null; shape?: PrintShape }) {
  const t = S[locale] ?? S.en;
  const tag = shape === "tree-tag";
  const qrRef = useRef<QRCodeStyling | null>(null);
  const [paper, setPaper] = useState<Paper>("cream");
  const [name, setName] = useState(tag ? recipientName : recipientName ? `${recipientName},` : "");
  // The tag's line under the code is always the instruction: the QR designer's label is usually the
  // name ("for Mia ♡"), which the tag already carries above the code. The toolbar can still change it.
  const [message, setMessage] = useState(tag ? t.tag.scan : `${senderName} ${t.line}`.trim());
  const [sender, setSender] = useState(senderName);
  const [showUrl, setShowUrl] = useState(true);
  const [showTree, setShowTree] = useState(true);
  const [code, setCode] = useState("");
  const background = PAPERS[paper];
  // The tag's code sits on its own white tile, so that is the ground it has to scan on.
  const ground = tag ? "#FFFFFF" : background;
  const palette = useMemo(() => qrPalette(design.colour, ground), [design.colour, ground]);
  // The border is only trim, but a pale accent on cream would vanish: keep it just visible.
  const border = useMemo(() => darkenUntil(accent, background, 1.6), [accent, background]);
  const image = design.centre === "logo" ? QR_LOGO : design.centre === "photo" ? (photoUrl ?? undefined) : undefined;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { default: QRCodeStyling } = await import("qr-code-styling");
      const options = qrCodeOptions({ url, dots: design.dots, palette, gradient: design.gradient, image, centreSize: design.size });
      if (!qrRef.current) qrRef.current = new QRCodeStyling(options);
      else qrRef.current.update(options);
      const raw = await qrRef.current.getRawData("svg");
      if (cancelled || !raw) return;
      const svg = raw instanceof Blob ? await raw.text() : String(raw);
      if (!cancelled) setCode(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [url, design.dots, design.gradient, design.size, palette, image]);

  const nameSize = name.length > 17 ? "15pt" : name.length > 11 ? "18pt" : "22pt";
  const card = (
    <div className="card" style={{ borderColor: border, background }}>
      <div className="head">
        <LogoMark className="mark" />
        <span>{brand}</span>
      </div>
      <p className="name" translate="no" style={{ fontSize: nameSize }}>
        {name}
      </p>
      <p className="line">{message}</p>
      <div className="qr">
        {code ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={code} alt={t.qrAlt} />
        ) : null}
      </div>
      {design.label ? <p className="label" style={{ color: palette.dots }}>{design.label}</p> : null}
      <p className="cta">{t.cta}</p>
      {showUrl ? <p className="url">{url.replace(/^https?:\/\//, "")}</p> : null}
      <p className="sound">{t.sound}</p>
    </div>
  );
  if (tag) {
    const tagName = name.trim();
    const tagNameSize = tagName.length > 28 ? "11pt" : tagName.length > 17 ? "13pt" : tagName.length > 11 ? "16pt" : "20pt";
    const from = sender.trim();
    // Two lines at most in a box of fixed height, so "Grandma and Grandpa Johnson" prints whole, and so
    // does the longest the field takes (40 characters, "Grandma Rosalind and Grandpa Bartholomew").
    const fromSize = from.length > 32 ? "8pt" : from.length > 24 ? "9pt" : "11pt";
    const one = (
      <div className="tag" data-testid="tree-tag">
        <svg className="tag-edge" viewBox="0 0 74 105" aria-hidden="true">
          <polygon points="12,0.15 62,0.15 73.85,12 73.85,104.85 0.15,104.85 0.15,12" fill={background} stroke="#B5AA9B" strokeWidth="0.25" strokeDasharray="1.6 1.1" />
          <circle cx="37" cy="9" r="3" fill="#FFFFFF" stroke="#B5AA9B" strokeWidth="0.3" />
        </svg>
        <div className="tag-body">
          <p className="tag-for">{tagName ? t.tag.for : ""}</p>
          <p className="tag-name" translate="no" style={{ fontSize: tagNameSize }}>
            <span>{tagName}</span>
          </p>
          <div className="tag-tile">
            <div className="tag-qr">
              {code ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={code} alt={t.qrAlt} />
              ) : null}
            </div>
          </div>
          <p className="tag-line">{message}</p>
          <p className="tag-from" translate="no" style={{ fontSize: fromSize }}>
            {from ? (
              <span>
                {t.tag.from} {from}
              </span>
            ) : null}
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {showTree ? <img className="tag-tree" src="/art/occasions/christmas.webp" alt="" /> : null}
      </div>
    );
    return (
      <div className="print-root">
        <style>{CARD_STYLE}</style>
        <style>{TAG_STYLE}</style>
        <div className="toolbar">
          <button type="button" onClick={() => window.print()}>
            <Printer size={16} />
            {t.tag.print}
          </button>
          <span>{t.tag.hint}</span>
        </div>
        <div className="adjust">
          <b>{t.tag.adjust}</b>
          <div style={{ display: "grid", gap: 6 }}>
            <span>{t.paper}</span>
            <div className="papers">
              {(Object.keys(PAPERS) as Paper[]).map((p) => (
                <button key={p} type="button" aria-pressed={paper === p} onClick={() => setPaper(p)}>
                  <i style={{ background: PAPERS[p] }} />
                  {t.papers[p]}
                </button>
              ))}
            </div>
          </div>
          <label>
            {t.tag.name}
            <input type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            {t.tag.message}
            <input type="text" value={message} maxLength={40} onChange={(e) => setMessage(e.target.value)} />
          </label>
          <label>
            {t.tag.sender}
            <input type="text" value={sender} maxLength={40} onChange={(e) => setSender(e.target.value)} />
          </label>
          <label className="check">
            <input type="checkbox" checked={showTree} onChange={(e) => setShowTree(e.target.checked)} />
            {t.tag.tree}
          </label>
        </div>
        <div className="tag-sheet" data-testid="tree-tag-sheet">
          {one}
          {one}
          {one}
          {one}
        </div>
      </div>
    );
  }
  return (
    <div className="print-root">
      <style>{CARD_STYLE}</style>
      <div className="toolbar">
        <button type="button" onClick={() => window.print()}>
          <Printer size={16} />
          {t.print}
        </button>
        <span>{t.hint}</span>
      </div>
      <div className="adjust">
        <b>{t.adjust}</b>
        <div style={{ display: "grid", gap: 6 }}>
          <span>{t.paper}</span>
          <div className="papers">
            {(Object.keys(PAPERS) as Paper[]).map((p) => (
              <button key={p} type="button" aria-pressed={paper === p} onClick={() => setPaper(p)}>
                <i style={{ background: PAPERS[p] }} />
                {t.papers[p]}
              </button>
            ))}
          </div>
        </div>
        <label>
          {t.name}
          <input type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          {t.message}
          <input type="text" value={message} maxLength={80} onChange={(e) => setMessage(e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={showUrl} onChange={(e) => setShowUrl(e.target.checked)} />
          {t.showUrl}
        </label>
      </div>
      <div className="sheet">
        {card}
        {card}
      </div>
    </div>
  );
}
