import { AIRPORTS, type Airport } from "./airports";
import { MATCH_LENGTHS, type MatchLength } from "./match";
import type { TripKind } from "./presets";

/** The kinds, written out: presets.ts (the trips' long texts) is never for the browser. A unit test holds this to TRIP_KINDS. */
export const MATCH_KINDS: readonly TripKind[] = ["city", "road", "islands", "train"];

/**
 * The matcher's answer in the address, so a reload or Back from a trip opens on the same three:
 * `match=1`, then each wish that is not "any" (`len`, `budget`, `kind`) and the airport they leave
 * from as its city and code ("Riga~RIX": Osaka and Kyoto share an airport). Nothing else.
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
  if (state.from) out.set("from", `${state.from.city}~${state.from.iata}`);
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
