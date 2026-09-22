"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Five stars, filled to a value with halves, read out as a number. */
export function Stars({ value, size = "sm", className, label }: { value: number; size?: "xs" | "sm" | "md"; className?: string; label?: string }) {
  const px = size === "xs" ? "size-3" : size === "sm" ? "size-3.5" : "size-5";
  return (
    <span className={cn("inline-flex items-center gap-px", className)} role="img" aria-label={label ?? `${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - (n - 1)));
        return (
          <span key={n} className={cn("relative inline-block", px)}>
            <Star className={cn("absolute inset-0 text-star-empty", px)} fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn("text-star", px)} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Pick a number of stars: buttons that look like the stars, with keyboard and screen-reader names. */
export function StarPicker({ value, onChange, labels }: { value: number; onChange: (n: number) => void; labels: string[] }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={labels[0]}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={labels[n]}
          onPointerEnter={() => setHover(n)}
          onPointerLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="grid size-10 place-items-center rounded-full transition-transform hover:scale-110"
        >
          <Star className={cn("size-7 transition-colors", n <= shown ? "text-star" : "text-star-empty")} fill="currentColor" strokeWidth={0} />
        </button>
      ))}
      <span className="ml-2 text-[13px] font-medium text-forest/70" aria-live="polite">
        {shown ? labels[shown] : ""}
      </span>
    </div>
  );
}
