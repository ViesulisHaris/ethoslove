"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlaceResult } from "@/lib/places/photon";

export type Where = { lat: number; lng: number; name: string };
export type WhereLabels = { label: string; placeholder: string; nearMe: string; searching: string; nothing: string };

type Props = { value: Where | null; locale: "en" | "es"; labels: WhereLabels; locating?: boolean; autoFocus?: boolean; size?: "md" | "lg"; className?: string; onPick: (where: Where) => void; onNearMe?: () => void };

const describe = (p: PlaceResult) => [p.region !== p.name ? p.region : undefined, p.country].filter(Boolean).join(", ");

/**
 * Where they are looking: a town, a neighbourhood, or wherever the phone says they are. Towns come
 * from OpenStreetMap through the site's own /api/places, so nothing typed here goes to a third party
 * from the browser. A combobox in the ARIA sense: arrows move, Enter picks, Escape closes.
 */
export function WhereBox({ value, locale, labels, locating, autoFocus, size = "md", className, onPick, onNearMe }: Props) {
  const listId = useId();
  const [text, setText] = useState(value?.name ?? "");
  const [shown, setShown] = useState(value?.name ?? "");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [asked, setAsked] = useState("");
  const box = useRef<HTMLDivElement>(null);
  // Enter pressed before the answer arrived: someone who types "Madrid" and hits return means the first result.
  const wantFirst = useRef(false);
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  });

  // The place can change from outside (the map was dragged, "near me" answered): show its name.
  if ((value?.name ?? "") !== shown) {
    setShown(value?.name ?? "");
    setText(value?.name ?? "");
  }

  useEffect(() => {
    const query = text.trim();
    if (!open || query.length < 2 || query === value?.name) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(query)}${locale === "en" ? "&lang=en" : ""}`, { signal: controller.signal });
        const json = (await res.json()) as { results?: PlaceResult[] };
        const found = json.results ?? [];
        setResults(found);
        setActive(0);
        setAsked(query);
        if (wantFirst.current && found[0]) {
          wantFirst.current = false;
          setOpen(false);
          setText(found[0].name);
          onPickRef.current({ lat: found[0].lat, lng: found[0].lng, name: found[0].name });
        }
      } catch {
        // Typed over, or offline: the box just stays as it is.
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, open, locale, value?.name]);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const pick = (p: PlaceResult) => {
    setOpen(false);
    setText(p.name);
    onPick({ lat: p.lat, lng: p.lng, name: p.name });
  };
  const listed = open && text.trim().length >= 2 && text.trim() !== value?.name;

  return (
    <div ref={box} className={cn("relative", className)}>
      <div className={cn("flex items-center gap-2 rounded-full border border-forest/15 bg-white pr-1.5 pl-4 shadow-soft transition-shadow focus-within:border-[#D6336C]/50 focus-within:shadow-[0_0_0_4px_rgba(178,58,94,0.12)]", size === "lg" ? "h-14" : "h-12")}>
        <MapPin aria-hidden="true" className="size-[18px] shrink-0 text-[#B0245A]" />
        <input
          type="text"
          role="combobox"
          aria-label={labels.label}
          aria-expanded={listed}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={listed && results[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          enterKeyHint="search"
          value={text}
          placeholder={labels.placeholder}
          onFocus={(e) => {
            setOpen(true);
            e.currentTarget.select();
          }}
          onChange={(e) => {
            wantFirst.current = false;
            setText(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(results.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter" && listed && results[active] && asked === text.trim()) {
              e.preventDefault();
              pick(results[active]);
            } else if (e.key === "Enter" && listed) {
              e.preventDefault();
              wantFirst.current = true;
            } else if (e.key === "Escape") {
              wantFirst.current = false;
              setOpen(false);
              setText(value?.name ?? "");
            }
          }}
          className={cn("min-w-0 flex-1 bg-transparent text-forest outline-none placeholder:text-forest/45", size === "lg" ? "text-[17px]" : "text-[15px]")}
        />
        {busy ? <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin text-forest/40" /> : null}
        {onNearMe ? (
          <button type="button" onClick={onNearMe} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#FFE8EF] font-semibold text-[#9C1F4A] transition-colors hover:bg-[#FFD6E2]", size === "lg" ? "h-11 px-4 text-[14px]" : "h-9 px-3 text-[13px]")}>
            {locating ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <LocateFixed aria-hidden="true" className="size-4" />}
            <span className="max-[380px]:sr-only">{labels.nearMe}</span>
          </button>
        ) : null}
      </div>

      {listed ? (
        <ul id={listId} role="listbox" aria-label={labels.label} className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-auto rounded-2xl border border-forest/10 bg-white p-1.5 shadow-lift">
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-forest/55">{busy || asked !== text.trim() ? labels.searching : labels.nothing}</li>
          ) : (
            results.map((p, i) => (
              <li key={`${p.name}-${p.lat}-${p.lng}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <button type="button" tabIndex={-1} onPointerEnter={() => setActive(i)} onClick={() => pick(p)} className={cn("flex w-full items-baseline gap-2 rounded-xl px-3 py-2.5 text-left", i === active && "bg-[#FFE8EF]")}>
                  <span className="text-[15px] font-medium text-forest">{p.name}</span>
                  <span className="truncate text-[13px] text-forest/55">{describe(p)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
