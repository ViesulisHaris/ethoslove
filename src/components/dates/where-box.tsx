"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { suggestPlaces, type Suggestion } from "@/lib/dates/where";
import type { PlaceResult } from "@/lib/places/photon";

export type Where = { lat: number; lng: number; name: string };
/** `failed` is said when the town search could not be asked (slow, down, offline); without it the box keeps saying it is looking, never that the town does not exist. */
export type WhereLabels = { label: string; placeholder: string; nearMe: string; searching: string; nothing: string; failed?: string };

type Props = { value: Where | null; locale: "en" | "es"; labels: WhereLabels; locating?: boolean; autoFocus?: boolean; size?: "md" | "lg"; className?: string; onPick: (where: Where) => void; onNearMe?: () => void };

/** A quiet pause before asking again: a busy geocoder usually answers the second time. */
const RETRY_MS = 1200;
const DEBOUNCE_MS = 220;

const describe = (p: PlaceResult) => [p.region !== p.name ? p.region : undefined, p.country].filter(Boolean).join(", ");

/** What the geocoder said for one query, or that it could not be asked. */
type Answer = { query: string; results: PlaceResult[]; failed: boolean };

/**
 * Where they are looking: a town, a neighbourhood, or wherever the phone says they are. Towns come
 * from OpenStreetMap through the site's own /api/places, so nothing typed here goes to a third party
 * from the browser; the big cities the site knows by heart are offered at once, before it answers.
 * A combobox in the ARIA sense: arrows move, Enter picks, Escape closes.
 */
export function WhereBox({ value, locale, labels, locating, autoFocus, size = "md", className, onPick, onNearMe }: Props) {
  const listId = useId();
  const [text, setText] = useState(value?.name ?? "");
  const [shown, setShown] = useState(value?.name ?? "");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  // Enter pressed before the answer arrived: someone who types "Salzburg" and hits return means the first result.
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

  const query = text.trim();
  const listed = open && query.length >= 2 && query !== value?.name;
  // Only ever the answer to what is in the box now: the last query's towns are never left under a
  // new one, where a tap would pick Madrid while "Tokyo" is typed.
  const answered = answer?.query === query;
  const options = useMemo<Suggestion[]>(() => (listed ? suggestPlaces(query, answer && answer.query === query ? answer.results : [], locale) : []), [listed, query, answer, locale]);
  const loading = listed && !answered;
  const failed = answered && answer?.failed === true;

  useEffect(() => {
    if (!open || query.length < 2 || query === value?.name) return;
    const controller = new AbortController();
    const ask = async (): Promise<PlaceResult[] | null> => {
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(query)}${locale === "en" ? "&lang=en" : ""}`, { signal: controller.signal });
        // A 5xx or a 429 is "couldn't ask", never "no such town".
        if (!res.ok) return null;
        const json = (await res.json()) as { results?: unknown };
        return Array.isArray(json.results) ? (json.results as PlaceResult[]) : null;
      } catch {
        return null;
      }
    };
    const timer = setTimeout(async () => {
      let found = await ask();
      if (found === null && !controller.signal.aborted) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
        if (!controller.signal.aborted) found = await ask();
      }
      // Typed over, closed or unmounted: this answer belongs to nobody.
      if (controller.signal.aborted) return;
      setAnswer({ query, results: found ?? [], failed: found === null });
      setActive(0);
      if (wantFirst.current) {
        wantFirst.current = false;
        const first = suggestPlaces(query, found ?? [], locale)[0];
        // Nothing heard back: only one of the site's own cities is a safe guess at what they meant.
        if (first && (found !== null || first.lead)) {
          setOpen(false);
          setText(first.name);
          onPickRef.current({ lat: first.lat, lng: first.lng, name: first.name });
        }
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, locale, value?.name]);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const pick = (p: PlaceResult) => {
    wantFirst.current = false;
    setOpen(false);
    setText(p.name);
    onPick({ lat: p.lat, lng: p.lng, name: p.name });
  };

  return (
    <div
      ref={box}
      className={cn("relative", className)}
      data-tour="where"
      // Focus leaving the box closes the list: Tab, or a phone keyboard's next-field arrow, moves on
      // without a tap anywhere, and the list would otherwise stay drawn over the next field.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div className={cn("flex items-center gap-2 rounded-full border border-forest/15 bg-white pr-1.5 pl-4 shadow-soft transition-shadow focus-within:border-rose/50 focus-within:shadow-[0_0_0_4px_rgba(178,58,94,0.12)]", size === "lg" ? "h-14" : "h-12")}>
        <MapPin aria-hidden="true" className="size-[18px] shrink-0 text-rose-deep" />
        <input
          type="text"
          role="combobox"
          aria-label={labels.label}
          aria-expanded={listed}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={listed && options[active] ? `${listId}-${active}` : undefined}
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
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.max(0, Math.min(options.length - 1, i + 1)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter" && listed) {
              e.preventDefault();
              const choice = options[active];
              // One of the site's own cities is already where it will stay once the geocoder
              // answers; anything else waits for the answer, so Enter never takes a row that is
              // about to move (or, with no answer at all, New York for "York").
              if (choice && (choice.lead || (answered && !failed))) pick(choice);
              else if (!answered) wantFirst.current = true;
            } else if (e.key === "Escape") {
              wantFirst.current = false;
              setOpen(false);
              setText(value?.name ?? "");
            }
          }}
          // 16px at least: iPhone Safari zooms the whole page into any smaller field it focuses. The
          // pill's full height, so a tap near its top or bottom edge lands in the field, not on the pill.
          className={cn("h-full min-w-0 flex-1 bg-transparent text-forest outline-none placeholder:text-forest/45", size === "lg" ? "text-[17px]" : "text-[16px]")}
        />
        {loading ? <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin text-forest/40" /> : null}
        {onNearMe ? (
          <button type="button" onClick={onNearMe} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full bg-rose-soft font-semibold text-rose-ink transition-colors hover:bg-rose-tint", size === "lg" ? "h-11 px-4 text-[14px]" : "h-11 min-w-11 justify-center px-3 text-[13px]")}>
            {locating ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <LocateFixed aria-hidden="true" className="size-4" />}
            <span className="max-[380px]:sr-only">{labels.nearMe}</span>
          </button>
        ) : null}
      </div>

      {listed ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={labels.label}
          tabIndex={-1}
          // A tap on a row must not take focus from the field first: Safari never focuses a button
          // it is tapping, so the blur above would close the list before the tap landed.
          onMouseDown={(e) => e.preventDefault()}
          // With only "Looking…" in it the list is a note, not a target: a tap on the field it is
          // drawn over (the second town on Long distance) goes to that field.
          className={cn("absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-auto rounded-2xl border border-forest/10 bg-white p-1.5 shadow-lift", options.length === 0 && "pointer-events-none")}
        >
          {options.length === 0 ? (
            <li className="px-3 py-3 text-sm text-forest/65">{loading ? labels.searching : failed ? (labels.failed ?? labels.searching) : labels.nothing}</li>
          ) : (
            options.map((p, i) => (
              <li key={`${p.name}-${p.lat}-${p.lng}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <button type="button" tabIndex={-1} onPointerEnter={() => setActive(i)} onClick={() => pick(p)} className={cn("flex w-full items-baseline gap-2 rounded-xl px-3 py-2.5 text-left", i === active && "bg-rose-soft")}>
                  <span className="text-[15px] font-medium text-forest">{p.name}</span>
                  <span className="truncate text-[13px] text-forest/65">{describe(p)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
