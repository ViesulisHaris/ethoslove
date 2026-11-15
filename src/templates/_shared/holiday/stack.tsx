"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { mulberry32 } from "../random";

/**
 * Photos as a small stack of prints, the way they come out of an envelope: the top one is tapped
 * and goes to the back, showing the next. All of them stay in the stack, so it can be gone round
 * as often as wanted.
 */
export function PhotoStack({ photos, seed, still, label }: { photos: GiftPhoto[]; seed: number; still?: boolean; label: string }) {
  const [top, setTop] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const n = photos.length;
  const tilt = useMemo(() => {
    const rnd = mulberry32(seed + 23);
    return photos.map(() => ({ r: (rnd() - 0.5) * 9, x: (rnd() - 0.5) * 5, y: (rnd() - 0.5) * 3 }));
  }, [photos, seed]);
  if (!n) return null;
  const turn = () => {
    if (leaving !== null || n < 2) return;
    if (still) setTop((t) => (t + 1) % n);
    else setLeaving(top);
  };
  return (
    <div>
      <div className="relative mx-auto w-[74%]" style={{ aspectRatio: "1 / 1.2" }}>
        {photos.map((photo, i) => {
          // how far down the stack this print lies: 0 is the top
          const depth = (i - top + n) % n;
          const t = tilt[i];
          const away = leaving === i;
          return (
            <figure
              key={photo.id}
              className="absolute inset-0 m-0"
              onTransitionEnd={(e) => {
                if (!away || e.propertyName !== "transform") return;
                setLeaving(null);
                setTop((v) => (v + 1) % n);
              }}
              style={{
                zIndex: away ? n + 1 : n - depth,
                transform: away ? "translate(118%, -6%) rotate(20deg)" : `translate(${(t.x * Math.min(depth, 3)).toFixed(1)}%, ${(t.y * Math.min(depth, 3)).toFixed(1)}%) rotate(${(depth ? t.r : t.r * 0.35).toFixed(1)}deg) scale(${(1 - Math.min(depth, 3) * 0.025).toFixed(3)})`,
                transition: still ? undefined : away ? "transform .42s cubic-bezier(.5,0,.9,.5)" : "transform .5s cubic-bezier(.2,.8,.3,1)",
                visibility: depth > 3 && !away ? "hidden" : undefined,
              }}
            >
              <div className="h-full bg-[#fffdf8] px-[5.5%] pt-[5.5%]" style={{ boxShadow: "0 0 0 .5px rgba(60,40,20,.2), 0 calc(.6*var(--u)) calc(1.2*var(--u)) rgba(0,0,0,.3), calc(1*var(--u)) calc(2.4*var(--u)) calc(5*var(--u)) rgba(0,0,0,.38)" }}>
                <img src={photo.url} alt={photo.alt ?? ""} loading="lazy" draggable={false} className="block aspect-square w-full object-cover" style={{ boxShadow: "inset 0 0 0 .5px rgba(0,0,0,.35)" }} />
                {photo.caption ? (
                  <figcaption className="line-clamp-2 px-[2%] pt-[4%] text-center leading-[1.1]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(3.4*var(--u))", color: "#3a2410" }}>
                    {photo.caption}
                  </figcaption>
                ) : null}
              </div>
            </figure>
          );
        })}
        {n > 1 ? <button type="button" aria-label={label} onClick={turn} className="absolute inset-0 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-white/60" style={{ zIndex: n + 2 }} /> : null}
      </div>
      {n > 1 ? (
        <p aria-hidden="true" className="mt-[calc(4*var(--u))] text-center text-[calc(2.4*var(--u))] tracking-[0.3em] uppercase" style={{ color: "rgba(255,246,234,.85)", textShadow: "0 1px calc(2*var(--u)) rgba(0,0,0,.5)" }}>
          {top + 1} / {n}
        </p>
      ) : null}
    </div>
  );
}
