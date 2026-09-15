"use client";

import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import { Loader2, MapPin, Plus, RotateCcw, X } from "lucide-react";
import { Field } from "@/components/editor/field";
import { Input } from "@/components/ui/input";
import type { GiftLocale } from "@/lib/gift/schema";
import type { PlaceResult } from "@/lib/places/photon";
import { cn } from "@/lib/utils";
import { searchCities } from "../_shared/places";
import type { FieldEditorProps } from "../types";
import { fieldsSchema, MAX_STOPS, placeSchema, type MapPlace } from "./schema";
import { routeKm } from "./track";

const T = {
  en: {
    search: "Search any town or city",
    none: "Nothing found. Try the nearest bigger town.",
    offline: "Couldn't search just now. Pick from these, or type the distance yourself.",
    source: "Places © OpenStreetMap contributors",
    add: "Add a place",
    remove: "Remove",
    km: "km",
    useCalculated: "Use {n} km",
  },
  es: {
    search: "Busca cualquier pueblo o ciudad",
    none: "No encontramos nada. Prueba con el pueblo grande más cercano.",
    offline: "No hemos podido buscar ahora. Elige entre estas o escribe tú la distancia.",
    source: "Lugares © colaboradores de OpenStreetMap",
    add: "Añadir un sitio",
    remove: "Quitar",
    km: "km",
    useCalculated: "Usar {n} km",
  },
};

type Option = { key: string; name: string; detail?: string; lat: number; lng: number };

const near = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => Math.abs(a.lat - b.lat) < 0.2 && Math.abs(a.lng - b.lng) < 0.2;

/**
 * A search box for one place. The built-in cities answer instantly; OpenStreetMap fills in every
 * other town as you type. Nothing changes until a place is picked, so the gift never holds a name
 * without somewhere real behind it.
 */
function PlaceSearch({ id, value, onPick, locale, ariaLabel, autoFocus }: { id?: string; value: MapPlace | null; onPick: (place: MapPlace) => void; locale: GiftLocale; ariaLabel: string; autoFocus?: boolean }) {
  const t = T[locale] ?? T.en;
  const listId = useId();
  // What's being typed; null while showing the picked place.
  const [draft, setDraft] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<{ term: string; results: PlaceResult[]; failed: boolean } | null>(null);
  const term = draft?.trim() ?? "";
  const searching = term.length >= 2;

  useEffect(() => {
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(term)}&lang=${locale}`, { signal: ctrl.signal });
        const json = res.ok ? ((await res.json()) as { results?: PlaceResult[] }) : null;
        setRemote({ term, results: json?.results ?? [], failed: !json });
      } catch {
        if (!ctrl.signal.aborted) setRemote({ term, results: [], failed: true });
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [term, locale]);

  const options = useMemo<Option[]>(() => {
    if (!searching) return [];
    const regions = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames([locale], { type: "region" }) : null;
    const out: Option[] = searchCities(term, 4).map((c) => ({ key: `c-${c.name}-${c.country}`, name: c.name, detail: regions?.of(c.country) ?? c.country, lat: c.lat, lng: c.lng }));
    for (const r of remote?.term === term ? remote.results : []) {
      if (out.some((o) => o.name.toLowerCase() === r.name.toLowerCase() && near(o, r))) continue;
      out.push({ key: `r-${r.name}-${r.lat}-${r.lng}`, name: r.name, detail: [r.region, r.country].filter(Boolean).join(", ") || undefined, lat: r.lat, lng: r.lng });
    }
    return out.slice(0, 8);
  }, [searching, term, remote, locale]);

  const loading = searching && remote?.term !== term;
  const failed = remote?.term === term && remote.failed;
  const note = failed ? t.offline : !loading && options.length === 0 ? t.none : null;

  const pick = (option: Option) => {
    onPick({ name: option.name, lat: option.lat, lng: option.lng });
    setDraft(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!searching) return;
    if (e.key === "ArrowDown") setActive((i) => Math.min(options.length - 1, i + 1));
    else if (e.key === "ArrowUp") setActive((i) => Math.max(0, i - 1));
    else if (e.key === "Enter" && options[active]) pick(options[active]);
    else if (e.key === "Escape") setDraft(null);
    else return;
    e.preventDefault();
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id={id}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={searching}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={searching && options[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          maxLength={80}
          placeholder={t.search}
          value={draft ?? value?.name ?? ""}
          onChange={(e) => {
            setDraft(e.target.value);
            setActive(0);
          }}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={() => window.setTimeout(() => setDraft(null), 150)}
          onKeyDown={onKeyDown}
          className="h-11 pr-10 pl-10"
        />
        {loading ? <Loader2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
      </div>
      {searching ? (
        <div className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {options.length ? (
            <ul id={listId} role="listbox" aria-label={ariaLabel} className="max-h-72 overflow-y-auto py-1">
              {options.map((option, i) => (
                <li
                  key={option.key}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    // Before the input blurs, so the pick lands.
                    e.preventDefault();
                    pick(option);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn("flex cursor-pointer items-baseline gap-2 px-3.5 py-2.5 text-sm", i === active && "bg-black/5")}
                >
                  <span className="shrink-0 font-medium">{option.name}</span>
                  {option.detail ? <span className="min-w-0 truncate text-xs text-muted-foreground">{option.detail}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
          {note ? <p className="border-t border-border px-3.5 py-2.5 text-xs text-muted-foreground first:border-t-0">{note}</p> : null}
          <p className="border-t border-border px-3.5 py-1.5 text-[10px] text-muted-foreground">{t.source}</p>
        </div>
      ) : null}
    </div>
  );
}

/** The editor for each home: search anywhere, pick it, and its coordinates come with it. */
export function PlaceField({ id, label, help, value, onChange, locale }: FieldEditorProps<MapPlace>) {
  const place = placeSchema.safeParse(value);
  return (
    <Field id={id} label={label} help={help}>
      <PlaceSearch id={id} value={place.success ? place.data : null} onPick={onChange} locale={locale} ariaLabel={label} />
    </Field>
  );
}

/** The editor for the stops in between: a numbered list of place searches. */
export function StopsField({ id, label, help, value, onChange, locale }: FieldEditorProps<MapPlace[]>) {
  const t = T[locale] ?? T.en;
  const stops = (Array.isArray(value) ? value : []).filter((s): s is MapPlace => placeSchema.safeParse(s).success);
  const [adding, setAdding] = useState(false);
  const full = stops.length >= MAX_STOPS;

  return (
    <Field id={id} label={label} help={help} counter={`${stops.length} / ${MAX_STOPS}`}>
      <ol className="grid gap-2">
        {stops.map((stop, i) => (
          <li key={`${stop.name}-${i}`} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <PlaceSearch id={i === 0 ? id : undefined} value={stop} onPick={(place) => onChange(stops.map((s, k) => (k === i ? place : s)))} locale={locale} ariaLabel={`${label} ${i + 1}`} />
            </div>
            <button
              type="button"
              aria-label={t.remove}
              onClick={() => onChange(stops.filter((_, k) => k !== i))}
              className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
        {adding && !full ? (
          <li className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{stops.length + 1}</span>
            <div className="min-w-0 flex-1">
              <PlaceSearch
                id={stops.length === 0 ? id : undefined}
                value={null}
                autoFocus
                onPick={(place) => {
                  onChange([...stops, place]);
                  setAdding(false);
                }}
                locale={locale}
                ariaLabel={`${label} ${stops.length + 1}`}
              />
            </div>
            <button type="button" aria-label={t.remove} onClick={() => setAdding(false)} className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 hover:text-ink">
              <X className="size-4" />
            </button>
          </li>
        ) : null}
      </ol>
      {!adding && !full ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex h-10 w-fit items-center gap-1.5 rounded-full border border-dashed border-ink/30 px-4 text-[13px] font-medium transition-colors hover:border-ink hover:bg-black/5"
        >
          <Plus className="size-4" />
          {t.add}
        </button>
      ) : null}
    </Field>
  );
}

/** The distance: worked out from the places unless the sender types their own. */
export function DistanceField({ id, label, help, value, onChange, locale, fields }: FieldEditorProps<number | undefined>) {
  const t = T[locale] ?? T.en;
  const [text, setText] = useState<string | null>(null);
  const calculated = useMemo(() => {
    const parsed = fieldsSchema.safeParse(fields ?? {});
    return parsed.success ? Math.round(routeKm([parsed.data.from, ...parsed.data.stops, parsed.data.to])) : null;
  }, [fields]);
  const own = typeof value === "number" && Number.isFinite(value) ? value : undefined;

  return (
    <Field id={id} label={label} help={help}>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            min={1}
            max={40000}
            step={1}
            value={text ?? own ?? ""}
            placeholder={calculated !== null ? String(calculated) : undefined}
            onChange={(e) => {
              const raw = e.target.value;
              setText(raw);
              const n = Math.round(Number(raw));
              onChange(raw.trim() && Number.isFinite(n) && n >= 1 ? Math.min(40000, n) : undefined);
            }}
            onBlur={() => setText(null)}
            className="h-11 pr-12 tabular-nums"
          />
          <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-muted-foreground">{t.km}</span>
        </div>
        {own !== undefined && calculated !== null && own !== calculated ? (
          <button
            type="button"
            onClick={() => {
              setText(null);
              onChange(undefined);
            }}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 text-[13px] font-medium transition-colors hover:border-ink/40"
          >
            <RotateCcw className="size-3.5" />
            {t.useCalculated.replace("{n}", calculated.toLocaleString(locale))}
          </button>
        ) : null}
      </div>
    </Field>
  );
}
