"use client";

import { useEffect, useRef } from "react";
import { heartPoints, maskArea, maskPoints, pickPoints, stepFor, type P } from "./points";
import { buildSprites, CELL, frameFor } from "./sprites";
import { buildScript, flapAt, FLYING, IDLE_BATS, makeBats, moonFor, orbitAt, positionAt, scaleAt, stepAt, TIMING, type Bat, type Flight, type Moon, type Step } from "./flight";
import type { Look } from "./looks";

type Props = {
  /** The shapes the bats make before the heart, in order: a name, perhaps a line. */
  words: string[];
  look: Look;
  seed: number;
  /** False: a few bats circle the moon, waiting. True: the swarm plays, from now. */
  playing: boolean;
  /** Draw the first word formed, nothing moving: the editor's still frame, and anyone who asked for less motion. */
  still: boolean;
  /** Changes to jump to the scatter. */
  skip: number;
  onStep?: (step: Step) => void;
  /** The swarm is leaving: the page can start to come in under it. */
  onReveal?: () => void;
  onDone?: () => void;
  className?: string;
};

type Model = { bats: Bat[]; flight: Flight; moon: Moon; span: number; sprites: HTMLCanvasElement[] };

const FACE = '"Arial Black", "Segoe UI Black", "Helvetica Neue", Arial, sans-serif';

/** A word as white pixels on black, big enough to fill the moon: its pixels are where the bats will be. */
function rasterWord(text: string, moon: Moon) {
  const cw = Math.ceil(moon.r * 2.1);
  const ch = Math.ceil(moon.r * 1.0);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  if (!g) return { rgba: new Uint8ClampedArray(cw * ch * 4), w: cw, h: ch, area: 0, ox: 0, oy: 0 };
  let px = ch * 0.78;
  g.font = `900 ${px}px ${FACE}`;
  const wide = g.measureText(text).width;
  if (wide > cw * 0.94) {
    px = (px * cw * 0.94) / wide;
    g.font = `900 ${px}px ${FACE}`;
  }
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#fff";
  g.strokeStyle = "#fff";
  g.lineJoin = "round";
  g.lineWidth = px * 0.06;
  // The width has been fitted; now stretch the letters upward, so a short name stands tall on the
  // moon instead of lying along it as a thin band, which the bats could not make legible.
  const stretch = Math.max(1, Math.min(1.7, (ch * 0.62) / (px * 0.72)));
  g.translate(cw / 2, ch / 2);
  g.scale(1, stretch);
  g.fillText(text, 0, 0);
  g.strokeText(text, 0, 0);
  const rgba = g.getImageData(0, 0, cw, ch).data;
  return { rgba, w: cw, h: ch, area: maskArea(rgba, cw, ch), ox: moon.cx - cw / 2, oy: moon.cy - ch / 2 };
}

/**
 * The swarm itself: one canvas over the whole gift. Each frame asks the flight (./swarm) where every
 * bat is and stamps its sprite there, so nothing is simulated and nothing re-renders. The word is
 * made of real pixels: it is drawn, read back, and every bat is sent to one of them.
 */
export function Swarm({ words, look, seed, playing, still, skip, onStep, onReveal, onDone, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ playing, skip, onStep, onReveal, onDone });
  useEffect(() => {
    live.current = { playing, skip, onStep, onReveal, onDone };
  });
  const key = words.join("\u0001");

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;

    let raf = 0;
    let model: Model | null = null;
    let dpr = 1;
    let prevX = new Float32Array(0);
    let prevAt = 0;
    const idleFrom = performance.now();
    let startedAt = 0;
    let idleClock = 0;
    let lastIndex = -1;
    let revealed = false;
    let finished = false;
    let lastSkip = live.current.skip;

    const build = () => {
      const rect = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const moon = moonFor(w, h);
      const longest = Math.max(4, ...words.map((word) => word.length));
      const count = Math.round(Math.min(520, Math.max(300, 260 + 22 * longest)) * (w < 360 ? 0.85 : 1));
      const bats = makeBats(count, seed);
      const shapes: P[][] = [];
      let tightest = Infinity;
      words.forEach((word, k) => {
        const r = rasterWord(word, moon);
        const step = stepFor(r.area, count);
        tightest = Math.min(tightest, step);
        const pool = maskPoints(r.rgba, r.w, r.h, step).map((p) => ({ x: p.x + r.ox, y: p.y + r.oy }));
        shapes.push(pickPoints(pool, count, seed + 101 * (k + 1)));
      });
      shapes.push(heartPoints(count, moon.cx, moon.cy, moon.r * 1.5, seed + 999));
      const span = Math.min(22, Math.max(7.5, (Number.isFinite(tightest) ? tightest : 5) * 1.75));
      model = { bats, moon, span, sprites: buildSprites(look.bat, look.rim), flight: { bats, script: buildScript(shapes.length), moon, targets: shapes, idleClock } };
      prevX = new Float32Array(count).fill(Number.NaN);
    };

    const draw = (now: number) => {
      if (!model) return;
      const { bats, flight, moon, span, sprites } = model;
      const { script } = flight;
      const going = live.current.playing && !still;
      if (going && !startedAt) {
        startedAt = now;
        idleClock = (now - idleFrom) / 1000;
        flight.idleClock = idleClock;
      }
      let t = 0;
      let step: Step | null = null;
      if (going) {
        const last = script.steps[script.steps.length - 1];
        if (live.current.skip !== lastSkip) {
          lastSkip = live.current.skip;
          if ((now - startedAt) / 1000 < last.t0) startedAt = now - last.t0 * 1000;
        }
        t = (now - startedAt) / 1000;
        const at = stepAt(script, t);
        step = at.step;
        if (at.index !== lastIndex) {
          lastIndex = at.index;
          live.current.onStep?.(at.step);
        }
        if (!revealed && t >= script.total - TIMING.scatter + 0.55) {
          revealed = true;
          live.current.onReveal?.();
        }
        if (!finished && t >= script.total) {
          finished = true;
          live.current.onDone?.();
        }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (finished) return;
      const dt = Math.max(0.001, (now - prevAt) / 1000);
      prevAt = now;
      for (let i = 0; i < bats.length; i++) {
        const bat = bats[i];
        let x: number;
        let y: number;
        let scale: number;
        let beat: number;
        if (still) {
          const p = flight.targets[0][i];
          x = p.x;
          y = p.y;
          scale = 1;
          beat = Math.sin(i * 1.3);
        } else if (!going || !step) {
          if (i >= IDLE_BATS) continue;
          const p = orbitAt(bat, (now - idleFrom) / 1000, moon);
          x = p.x;
          y = p.y;
          scale = FLYING;
          beat = flapAt(bat, "orbit", (now - idleFrom) / 1000);
        } else {
          const p = positionAt(flight, i, t);
          if (!p.visible) continue;
          x = p.x;
          y = p.y;
          scale = scaleAt(step, t);
          beat = flapAt(bat, step.kind, t);
        }
        if (Number.isNaN(prevX[i])) prevX[i] = x;
        const bank = still ? 0 : Math.max(-0.6, Math.min(0.6, ((x - prevX[i]) / dt) * 0.0015));
        prevX[i] = x;
        // Alike once they are the pixels of a letter, various while they fly.
        const variance = 1 + (bat.size - 1) * (0.3 + 0.7 * Math.min(1, Math.max(0, (scale - 1) / (FLYING - 1))));
        const w = span * variance * scale;
        const h = (w * CELL.h) / CELL.w;
        const cos = Math.cos(bank) * dpr;
        const sin = Math.sin(bank) * dpr;
        ctx.setTransform(cos, sin, -sin, cos, x * dpr, y * dpr);
        ctx.drawImage(sprites[frameFor(beat)], -w / 2, -h * 0.55, w, h);
      }
    };

    build();
    const loop = (now: number) => {
      draw(now);
      if (!finished) raf = requestAnimationFrame(loop);
    };
    if (still) draw(performance.now());
    else raf = requestAnimationFrame(loop);

    const resize = new ResizeObserver(() => {
      build();
      if (still) draw(performance.now());
    });
    resize.observe(host);
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
    };
    // The loop reads what changes through `live`; only a new word, look or seed needs a new model.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, look, seed, still]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className ?? "pointer-events-none absolute inset-0"} />;
}
