"use client";

import { useTranslations } from "next-intl";
import { HEX_COLOR } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";

export const ACCENT_SWATCHES = ["#E8604C", "#B23A2E", "#D4A853", "#2F6B4F", "#2E4A62", "#F4C7C3", "#7A3E6A", "#1A1614", "#2A9D8F", "#C8743A"];

export function ColorInput({ value, onChange, swatches = ACCENT_SWATCHES }: { value: string; onChange: (hex: string) => void; swatches?: string[] }) {
  const t = useTranslations("editor.fields");
  const custom = !swatches.some((s) => s.toLowerCase() === value.toLowerCase());
  return (
    <div className="flex flex-wrap items-center gap-2.5 md:gap-2">
      {swatches.map((hex) => (
        <button
          key={hex}
          type="button"
          onClick={() => onChange(hex)}
          aria-label={hex}
          aria-pressed={hex.toLowerCase() === value.toLowerCase()}
          className={cn("relative size-9 rounded-full border-2 transition-transform after:absolute after:-inset-1.5 hover:scale-110 md:size-8", hex.toLowerCase() === value.toLowerCase() ? "border-ink scale-110" : "border-transparent")}
          style={{ background: hex, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)" }}
        />
      ))}
      <label className={cn("relative flex h-10 items-center gap-2 rounded-full border px-3 text-[13px] md:h-8 md:px-2 md:text-xs", custom ? "border-ink" : "border-border")}>
        <span className="size-4 rounded-full" style={{ background: HEX_COLOR.test(value) ? value : "#ccc" }} />
        {t("customColor")}
        <input type="color" value={HEX_COLOR.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={t("customColor")} />
      </label>
    </div>
  );
}
