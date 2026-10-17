"use client";

import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { inkPairs, type Stroke } from "@/lib/games/ink";
import { cn } from "@/lib/utils";

/**
 * The paper both phones look at. Points are kept as fractions of the board (0 to 1), never pixels,
 * so a finger on a phone and a mouse on a laptop draw the same picture on both screens. Strokes
 * are flat number arrays (x, y, x, y…) because they travel over the room many times a second.
 */
export type { Stroke };

/** Five inks, named so the buttons can say which is which. */
export const INK = [
  { id: "ink", colour: "#2A0F1F" },
  { id: "rose", colour: "#D6336C" },
  { id: "violet", colour: "#5B4FB0" },
  { id: "blue", colour: "#2F7FA8" },
  { id: "gold", colour: "#E0962A" },
] as const;
const LINE = 0.011;

export function drawStrokes(canvas: HTMLCanvasElement, strokes: Stroke[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const stroke of strokes) {
    // A batch still on its way from the other phone leaves a gap: draw around it, not through (0, 0).
    const points = inkPairs(stroke.points);
    if (points.length < 2) continue;
    ctx.beginPath();
    ctx.strokeStyle = stroke.colour;
    ctx.lineWidth = Math.max(1, stroke.width * width);
    ctx.moveTo(points[0] * width, points[1] * height);
    if (points.length === 2) ctx.lineTo(points[0] * width + 0.01, points[1] * height);
    // Through the middle of each pair of points, so a fast finger still draws a curve.
    for (let i = 2; i < points.length - 2; i += 2) {
      const x = points[i] * width;
      const y = points[i + 1] * height;
      ctx.quadraticCurveTo(x, y, (x + points[i + 2] * width) / 2, (y + points[i + 3] * height) / 2);
    }
    if (points.length >= 4) ctx.lineTo(points[points.length - 2] * width, points[points.length - 1] * height);
    ctx.stroke();
  }
}

type Props = {
  strokes: Stroke[];
  /** Only the one drawing this round can leave a mark; the other watches. */
  canDraw: boolean;
  colour?: string;
  onStart?: (stroke: Stroke) => void;
  /** `at` is where the batch starts in the stroke's points, so the other phone can put it in its place. */
  onPoints?: (id: number, points: number[], at: number) => void;
  label: string;
  className?: string;
};

export function DrawBoard({ strokes, canDraw, colour = INK[0].colour, onStart, onPoints, label, className }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef<{ id: number; pending: number[]; sent: number; frame: number } | null>(null);
  const handlers = useRef({ onStart, onPoints });
  useEffect(() => {
    handlers.current = { onStart, onPoints };
  });

  // Redraw on every change and whenever the board is resized; the canvas is sized in device
  // pixels so lines stay crisp on a phone.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const paint = () => {
      const rect = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const width = Math.round(rect.width * dpr);
      const height = Math.round(rect.height * dpr);
      if (el.width !== width || el.height !== height) {
        el.width = width;
        el.height = height;
      }
      drawStrokes(el, strokes);
    };
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(el);
    return () => observer.disconnect();
  }, [strokes]);

  const at = (event: ReactPointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    return [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000];
  };

  // Points are collected and sent once a frame: a finger fires far more events than a room needs.
  const flush = useCallback(() => {
    const drawing = live.current;
    if (!drawing) return;
    drawing.frame = 0;
    if (drawing.pending.length === 0) return;
    handlers.current.onPoints?.(drawing.id, drawing.pending, drawing.sent);
    drawing.sent += drawing.pending.length;
    drawing.pending = [];
  }, []);

  const down = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!canDraw || event.button > 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const id = Date.now();
    // The first point goes with the stroke itself: two numbers already sent.
    live.current = { id, pending: [], sent: 2, frame: 0 };
    handlers.current.onStart?.({ id, points: at(event), colour, width: LINE });
  };

  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drawing = live.current;
    if (!canDraw || !drawing) return;
    drawing.pending.push(...at(event));
    if (!drawing.frame) drawing.frame = requestAnimationFrame(flush);
  };

  const up = () => {
    flush();
    if (live.current?.frame) cancelAnimationFrame(live.current.frame);
    live.current = null;
  };

  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={label}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      className={cn("size-full rounded-[18px] bg-[#FFFBF5] shadow-[0_1px_0_rgba(255,255,255,0.85)_inset]", canDraw ? "cursor-crosshair touch-none" : "cursor-default", className)}
    />
  );
}
