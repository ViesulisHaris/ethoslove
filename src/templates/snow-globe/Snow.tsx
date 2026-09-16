"use client";

import { useEffect, useRef } from "react";

type Flake = { x: number; y: number; r: number; fall: number; phase: number; spin: number; alpha: number };

/**
 * The snow inside the glass, on one canvas. It reads the shake level every frame from a ref, so
 * a storm never costs a React render: the harder the phone is shaken, the faster and wider the
 * flakes fly. Turned over, they fall the other way through the world instead.
 */
export function Snow({
  levelRef,
  flipped,
  still,
  colour = "#FFFFFF",
  count = 88,
  seed = 1,
}: {
  levelRef: { readonly current: number };
  /** The globe has been tipped: snow falls towards what used to be the sky. */
  flipped: boolean;
  /** Preview and reduced motion get one still frame of settled weather. */
  still: boolean;
  colour?: string;
  count?: number;
  seed?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Which way gravity points is read every frame, not baked into the canvas: turning the globe
  // over must not rebuild the flakes, or the whole snowfall jumps back to where it started.
  const down = useRef(flipped);
  useEffect(() => {
    down.current = flipped;
  }, [flipped]);

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let last = performance.now();
    let t = 0;

    // A tiny deterministic generator, so the same globe looks the same on a replay.
    let s = seed >>> 0 || 1;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };

    const flakes: Flake[] = Array.from({ length: count }, () => ({
      x: rnd(),
      y: rnd(),
      r: 0.004 + rnd() * 0.009,
      fall: 0.03 + rnd() * 0.05,
      phase: rnd() * Math.PI * 2,
      spin: 0.5 + rnd() * 1.4,
      alpha: 0.45 + rnd() * 0.55,
    }));

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (level: number) => {
      ctx.clearRect(0, 0, w, h);
      const unit = Math.min(w, h);
      if (level > 0.04) {
        // The world whites out a little while it is really flying.
        ctx.fillStyle = colour;
        ctx.globalAlpha = Math.min(0.3, level * 0.32);
        ctx.fillRect(0, 0, w, h);
      }
      ctx.fillStyle = colour;
      for (const f of flakes) {
        ctx.globalAlpha = f.alpha * (0.7 + level * 0.3);
        ctx.beginPath();
        ctx.arc(f.x * w, f.y * h, Math.max(0.6, f.r * unit * (1 + level * 0.5)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    resize();
    if (still) {
      // Settled: everything low in the globe, nothing moving.
      for (const f of flakes) f.y = 0.55 + f.y * 0.44;
      draw(0);
      const ro = new ResizeObserver(() => {
        resize();
        draw(0);
      });
      ro.observe(parent);
      return () => ro.disconnect();
    }

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const level = Math.min(1, Math.max(0, levelRef.current));
      const dir = down.current ? -1 : 1;
      const speed = 1 + level * 11;
      const swirl = 0.03 + level * 0.6;
      for (const f of flakes) {
        f.y += dir * f.fall * speed * dt;
        f.x += Math.sin(t * f.spin + f.phase) * swirl * dt;
        if (f.y > 1.05) {
          f.y = -0.05;
          f.x = rnd();
        } else if (f.y < -0.05) {
          f.y = 1.05;
          f.x = rnd();
        }
        if (f.x > 1.05) f.x = -0.05;
        else if (f.x < -0.05) f.x = 1.05;
      }
      draw(level);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [colour, count, levelRef, seed, still]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}
