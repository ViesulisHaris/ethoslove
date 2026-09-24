import { costOf, type Cost } from "./cost";
import { distanceKm } from "./geo";
import { GROUP_IDS, type PlaceGroup } from "./kinds";
import { RARE_CAP } from "./overpass";
import { SEARCH_PER_GROUP, type Place } from "./places";
import { UNUSUAL_EXTRA } from "./unusual";

/** What couples have said about a place, summed up. */
export type Rating = { stars: number; reviews: number; cost: number | null };
export type Ratings = Record<string, Rating>;

/**
 * The most places one search can put on the page, and so the most the ratings route answers for
 * at once: every group full, and every rare find. It took 300, the page sent 356 for London, and
 * the ones cut (the last in alphabetical order, every place mapped as an area, "way/…") never got
 * their stars.
 */
export const MAX_RATED_PLACES = GROUP_IDS.length * SEARCH_PER_GROUP + UNUSUAL_EXTRA + RARE_CAP;

export type Sort = "best" | "rated" | "nearest" | "cheapest";
export const SORTS: Sort[] = ["best", "rated", "nearest", "cheapest"];

/** A place with everything the cards need worked out once. */
export type Ranked = Place & { cost: Cost; rating?: Rating; rank: number; groupRank: number; groupSize: number };

/**
 * How good a bet a place is for a date, once the map's own ranking meets the couples' ratings.
 * A single five-star review is a good sign and no more; ten of them are the point. Stars are
 * pulled towards the middle by how few there are (a Bayesian average with a prior of 3.8 and the
 * weight of four reviews), and a real photograph is worth a little, since it means somebody
 * thought the place worth photographing.
 */
export function dateScore(place: Place, rating?: Rating): number {
  let score = place.score;
  if (rating && rating.reviews > 0) {
    const shrunk = (rating.stars * rating.reviews + 3.8 * 4) / (rating.reviews + 4);
    score += (shrunk - 3.8) * 12 + Math.min(rating.reviews, 20) * 0.6;
  }
  // A real photograph means somebody thought the place worth photographing, and it is what a
  // shelf of top picks lives on; enough to lift a pictured place over an unpictured twin.
  if (place.photo) score += 8;
  return score;
}

const compare = (sort: Sort) => (a: Ranked, b: Ranked): number => {
  switch (sort) {
    case "rated": {
      const ra = a.rating?.reviews ? a.rating.stars : -1;
      const rb = b.rating?.reviews ? b.rating.stars : -1;
      return rb - ra || (b.rating?.reviews ?? 0) - (a.rating?.reviews ?? 0) || a.rank - b.rank;
    }
    case "nearest":
      return a.distanceKm - b.distanceKm || a.rank - b.rank;
    case "cheapest":
      return a.cost - b.cost || a.rank - b.rank;
    default:
      return a.rank - b.rank;
  }
};

/**
 * Every place with its cost, its rating and its rank ("#3 of 41 places to eat near here"), in the
 * order asked for. Rank is always by date score, whatever the list is sorted by, so it means the
 * same thing on every card.
 */
export function rankPlaces(places: Place[], ratings: Ratings, sort: Sort = "best"): Ranked[] {
  const scored = places
    .map((p) => ({ place: p, rating: ratings[p.id], score: dateScore(p, ratings[p.id]) }))
    .sort((a, b) => b.score - a.score || a.place.distanceKm - b.place.distanceKm || a.place.id.localeCompare(b.place.id));
  const groupSize: Partial<Record<PlaceGroup, number>> = {};
  for (const s of scored) groupSize[s.place.group] = (groupSize[s.place.group] ?? 0) + 1;
  const seen: Partial<Record<PlaceGroup, number>> = {};
  const ranked: Ranked[] = scored.map((s, i) => {
    seen[s.place.group] = (seen[s.place.group] ?? 0) + 1;
    return { ...s.place, cost: costOf(s.place, s.rating?.cost), rating: s.rating, rank: i + 1, groupRank: seen[s.place.group]!, groupSize: groupSize[s.place.group]! };
  });
  return sort === "best" ? ranked : ranked.sort(compare(sort));
}

/** The best of the list, for a shelf at the top, in rank order: #1 first, whatever it looks like. */
export function topPicks(ranked: Ranked[], count = 10): Ranked[] {
  return ranked.slice(0, count);
}

/** What goes well after what: dinner then a view, coffee then a gallery, a game then dessert. */
const NEXT: Record<PlaceGroup, PlaceGroup[]> = {
  eat: ["outdoors", "sweet", "culture"],
  sweet: ["outdoors", "culture", "play"],
  culture: ["sweet", "eat", "outdoors"],
  outdoors: ["sweet", "eat"],
  play: ["eat", "sweet"],
  unwind: ["eat", "sweet"],
};
const PAIR_KM = 0.9;

/**
 * Two places to go with this one, a short walk away and a different kind of thing: what turns a
 * table into an evening. The better-ranked candidate wins within each kind, nearest breaks ties.
 */
export function pairsWith(place: Place, all: Ranked[], count = 2): Ranked[] {
  const wanted = NEXT[place.group];
  const near = all.filter((p) => p.id !== place.id && wanted.includes(p.group) && distanceKm(place, p) <= PAIR_KM);
  const picks: Ranked[] = [];
  for (const group of wanted) {
    const best = near.filter((p) => p.group === group).sort((a, b) => a.rank - b.rank || distanceKm(place, a) - distanceKm(place, b))[0];
    if (best) picks.push(best);
    if (picks.length === count) break;
  }
  return picks;
}
