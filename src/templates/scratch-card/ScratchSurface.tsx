"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const FOIL: Record<string, string> = {
  silver: "linear-gradient(135deg,#d9dbe0 0%,#f4f5f7 22%,#a9adb6 48%,#e9eaee 70%,#b8bcc4 100%)",
  gold: "linear-gradient(135deg,#caa04a 0%,#f7e2a0 22%,#a8792a 48%,#f3d98a 70%,#b8873a 100%)",
  rose: "linear-gradient(135deg,#d9a29a 0%,#f7d9d2 22%,#b87a70 48%,#f0cfc6 70%,#c48a80 100%)",
  holo: "linear-gradient(135deg,#ff9a9e 0%,#fad0c4 18%,#a1c4fd 36%,#c2e9fb 52%,#d4fc79 68%,#96e6a1 84%,#ff9a9e 100%)",
};

/**
 * Foil layer over the card. Pointer strokes erase it (destination-out); we sample the alpha
 * grid every few strokes and auto-clear past `threshold`.
 */
export function ScratchSurface({ foil, label, onCleared, threshold = 0.55, resetKey }: { foil: string; label: string; onCleared: () => void; threshold?: number; resetKey: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cleared, setCleared] = useState(false);
  const strokes = useRef(0);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Foil: gradient + fine noise + label
    const g = ctx.createLinearGradient(0, 0, w, h);
    const stops = (FOIL[foil] ?? FOIL.gold).match(/#[0-9a-f]{6}/gi) ?? ["#ccc", "#eee", "#aaa"];
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // A holographic sheen over the foil: translucent sweeps, so it scratches off with everything else.
    for (const [tilt, alpha] of [
      [0.6, 0.16],
      [-0.35, 0.1],
    ] as const) {
      const sheen = ctx.createLinearGradient(0, h * (0.5 - tilt), w, h * (0.5 + tilt));
      for (const [stop, hue] of [
        [0, 190],
        [0.25, 280],
        [0.5, 330],
        [0.75, 45],
        [1, 160],
      ] as const) {
        sheen.addColorStop(stop, `hsla(${hue}, 90%, 72%, ${alpha})`);
      }
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, w, h);
    }
    for (let i = 0; i < w * h * 0.06; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)";
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2);
    }
    ctx.fillStyle = "rgba(60,40,10,0.55)";
    ctx.font = `600 ${Math.max(12, Math.min(18, w * 0.05))}px ui-sans-serif, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "0.2em";
    ctx.fillText(label.toUpperCase(), w / 2, h / 2);
    setCleared(false);
    strokes.current = 0;
  }, [foil, label, resetKey]);

  const scratch = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || cleared) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const ctx = canvas.getContext("2d")!;
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(28, r.width * 0.11);
    ctx.beginPath();
    const from = last.current ?? { x, y };
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    last.current = { x, y };
    if (++strokes.current % 6 === 0) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let clear = 0;
      const step = 16 * dpr;
      let total = 0;
      for (let i = 3; i < data.length; i += 4 * step) {
        total++;
        if (data[i] < 40) clear++;
      }
      if (clear / total > threshold) {
        setCleared(true);
        onCleared();
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 touch-none rounded-[inherit] transition-opacity duration-500"
      style={{ opacity: cleared ? 0 : 1, pointerEvents: cleared ? "none" : "auto", cursor: "crosshair" }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        last.current = null;
        scratch(e);
      }}
      onPointerMove={(e) => e.buttons === 1 && scratch(e)}
      onPointerUp={() => (last.current = null)}
      onPointerCancel={() => (last.current = null)}
      aria-label={label}
      role="img"
    />
  );
}
