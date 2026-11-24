import { AIRPORTS, type Airport } from "./airports";
import { MATCH_LENGTHS, type MatchLength } from "./match";
import type { TripKind } from "./presets";

/** The kinds, written out: presets.ts (the trips' long texts) is never for the browser. A unit test holds this to TRIP_KINDS. */
export const MATCH_KINDS: readonly TripKind[] = ["city", "road", "islands", "train"];

/**
 * The matcher's answer in the address, so a reload or Back from a trip opens on the same three:
 * `match=1`, then each wish that is not "any" (`len`, `budget`, `kind`). Nothing else: the airport
 * they leave from says where they live, and an address reaches server logs and, with consent,
 * Clarity, so it is kept in the history entry's state instead (keptFrom), as the halfway tool keeps
 * its towns. A link from before still has `from` ("Riga~RIX"): it is read, never written.
 */
export type MatchState = {
  from: Airport | null;
  length: MatchLength | null;
  budget: 1 | 2 | null;
  kind: TripKind | null;
};

export const MATCH_KEYS = ["match", "len", "budget", "kind", "from"] as const;

export function writeMatchLink(search: URLSearchParams, state: MatchState): URLSearchParams {
  const out = new URLSearchParams(search);
  for (const key of MATCH_KEYS) out.delete(key);
  out.set("match", "1");
  if (state.length) out.set("len", state.length);
  if (state.budget) out.set("budget", String(state.budget));
  if (state.kind) out.set("kind", state.kind);
  return out;
}

/** Where the airport is kept in a history entry's state. */
export const MATCH_FROM_STATE = "ethosMatchFrom";

/** The airport this history entry keeps, or null. Read against the table, so only a real airport comes back. */
export function keptFrom(state: unknown): Airport | null {
  const kept = (state as Record<string, unknown> | null)?.[MATCH_FROM_STATE] as { city?: unknown; iata?: unknown } | undefined;
  if (!kept || typeof kept.city !== "string" || typeof kept.iata !== "string") return null;
  return AIRPORTS.find((a) => a.city === kept.city && a.iata === kept.iata) ?? null;
}

/** A history state that keeps this airport (or none), everything else in it left as it was. */
export function keepFrom(state: unknown, from: Airport | null): Record<string, unknown> {
  const out: Record<string, unknown> = { ...((state as Record<string, unknown> | null) ?? {}) };
  if (from) out[MATCH_FROM_STATE] = { city: from.city, iata: from.iata };
  else delete out[MATCH_FROM_STATE];
  return out;
}

/** The answer an address carries, or null when it carries none. A wish it cannot read is left at "any". */
export function readMatchLink(search: URLSearchParams): MatchState | null {
  if (search.get("match") !== "1") return null;
  const len = search.get("len");
  const budget = search.get("budget");
  const kind = search.get("kind");
  const from = search.get("from") ?? "";
  const at = from.lastIndexOf("~");
  const airport =
    at > 0
      ? (AIRPORTS.find((a) => a.city === from.slice(0, at) && a.iata === from.slice(at + 1)) ??
        null)
      : null;
  return {
    from: airport,
    length: (MATCH_LENGTHS as readonly string[]).includes(len ?? "") ? (len as MatchLength) : null,
    budget: budget === "1" ? 1 : budget === "2" ? 2 : null,
    kind: (MATCH_KINDS as readonly string[]).includes(kind ?? "") ? (kind as TripKind) : null,
  };
}
