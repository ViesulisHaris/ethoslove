import { distanceKm, type LatLng } from "./geo";
import type { Place } from "./places";

/**
 * Real photographs, where the world has given some away. Wikipedia knows the landmarks, museums,
 * theatres, parks and famous pubs of a neighbourhood, each with a freely licensed picture and
 * coordinates; this finds the ones near a search, works out which of our places each one is, and
 * keeps the credit with the picture, which the licences require and the photographers deserve.
 * It will never have a photo of the café on the corner. Nothing free does.
 */
export type PlacePhoto = {
  /** A thumbnail on one of Wikimedia's image hosts. */
  src: string;
  width: number;
  height: number;
  /** Who took it and under what terms; shown with the picture. */
  credit?: string;
  licence?: string;
  /** The file's own page, where the full attribution lives. */
  fileUrl?: string;
};

export type Sight = { pageId: number; title: string; lat: number; lng: number; description?: string; articleUrl: string; file?: string; photo: PlacePhoto };

type GeoPage = { pageid?: number; title?: string; fullurl?: string; description?: string; pageimage?: string; coordinates?: { lat?: number; lon?: number }[]; thumbnail?: { source?: string; width?: number; height?: number } };

/** Only pictures served by Wikimedia itself are ever put in an <img>: its two image hosts, and nothing an API answer might name instead. */
export const isWikimedia = (url: unknown): url is string => typeof url === "string" && (url.startsWith("https://upload.wikimedia.org/") || url.startsWith("https://thumb.wikimedia.org/"));

export function parseGeosearch(json: unknown): Sight[] {
  const pages = (json as { query?: { pages?: GeoPage[] } } | null)?.query?.pages;
  if (!Array.isArray(pages)) return [];
  const sights: Sight[] = [];
  for (const page of pages) {
    const at = page.coordinates?.[0];
    const thumb = page.thumbnail;
    if (typeof page.pageid !== "number" || !page.title || !isWikimedia(thumb?.source) || typeof at?.lat !== "number" || typeof at?.lon !== "number") continue;
    if (!page.fullurl?.startsWith("https://")) continue;
    sights.push({
      pageId: page.pageid,
      title: page.title.slice(0, 120),
      lat: at.lat,
      lng: at.lon,
      description: page.description?.slice(0, 160),
      articleUrl: page.fullurl,
      file: page.pageimage,
      photo: { src: thumb.source, width: thumb.width ?? 640, height: thumb.height ?? 480 },
    });
  }
  return sights;
}

const stripTags = (html: string): string => html.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

type InfoPage = { title?: string; imageinfo?: { descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }[] };

/** Author and licence for each file ("File:Foo.jpg" → credit), from the image's own metadata. */
export function parseImageInfo(json: unknown): Map<string, { credit?: string; licence?: string; fileUrl?: string }> {
  const out = new Map<string, { credit?: string; licence?: string; fileUrl?: string }>();
  const pages = (json as { query?: { pages?: InfoPage[] } } | null)?.query?.pages;
  if (!Array.isArray(pages)) return out;
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!page.title || !info) continue;
    const meta = info.extmetadata ?? {};
    const artist = stripTags(meta.Artist?.value ?? "").slice(0, 80);
    const licence = stripTags(meta.LicenseShortName?.value ?? "").slice(0, 40);
    out.set(page.title.replace(/^[^:]+:/, "").replace(/_/g, " "), { credit: artist || undefined, licence: licence || undefined, fileUrl: info.descriptionurl?.startsWith("https://") ? info.descriptionurl : undefined });
  }
  return out;
}

/** Articles that have a picture and coordinates and are nowhere to take anybody. */
const NOT_A_DATE = /\b(station|railway|metro|tram|bus|airport|embassy|consulate|school|college|university|academy|hospital|clinic|ministry|department|agency|headquarters|company|bank|office|court|prison|police|barracks|constituency|ward|district|borough|parish|street|road|avenue|motorway|junction|hotel|hostel|cemetery|crematorium|newspaper|broadcaster|election|bombing|attack|fire|disaster|murder|riot|estación|embajada|colegio|escuela|universidad|hospital|ministerio|empresa|banco|calle|avenida|barrio|distrito|cementerio)\b/i;

export const isDateWorthy = (sight: Sight): boolean => !NOT_A_DATE.test(sight.title) && !NOT_A_DATE.test(sight.description ?? "");

const STOP = new Set(["the", "of", "and", "de", "la", "le", "el", "los", "las", "do", "da", "dos", "das", "du", "des", "di", "del", "della", "y", "e", "a", "o", "os", "as", "at", "in", "st", "saint", "san", "santa", "sao"]);

/** A name as a bag of words: no accents, no punctuation, no "the", and no "(Lisbon)" or ", London" on the end. */
export function nameTokens(name: string): string[] {
  const base = name.replace(/\([^)]*\)/g, " ").split(",")[0];
  return base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** How alike two names are: the share of the shorter one's words found in the other, if a real word is among them. */
export function nameMatch(a: string, b: string): number {
  const ta = nameTokens(a);
  const tb = new Set(nameTokens(b));
  if (ta.length === 0 || tb.size === 0) return 0;
  const shared = ta.filter((t) => tb.has(t));
  if (!shared.some((t) => t.length >= 4)) return 0;
  return shared.length / Math.min(ta.length, tb.size);
}

/** A park's article points at its middle, which can be a long way from the gate the map has. */
const REACH_KM: Partial<Record<Place["kind"], number>> = { park: 0.7, garden: 0.45, beach: 0.8, zoo: 0.6, themepark: 0.6 };
const NEAR_KM = 0.25;
const ALIKE = 0.75;

/**
 * Which sight is which place. A photo goes to the best-named place within reach of it, a place
 * takes the best photo offered, and nothing is matched on distance alone: the building next door
 * to a museum is not the museum.
 */
export function matchPhotos(places: Place[], sights: Sight[]): { byPlace: Map<string, Sight>; unmatched: Sight[] } {
  const offers: { place: Place; sight: Sight; score: number }[] = [];
  for (const sight of sights) {
    for (const place of places) {
      if (!place.named) continue;
      const km = distanceKm(place, sight);
      if (km > (REACH_KM[place.kind] ?? NEAR_KM)) continue;
      const alike = nameMatch(place.name, sight.title);
      if (alike >= ALIKE) offers.push({ place, sight, score: alike - km });
    }
  }
  offers.sort((a, b) => b.score - a.score || a.place.id.localeCompare(b.place.id));
  const byPlace = new Map<string, Sight>();
  const used = new Set<number>();
  for (const offer of offers) {
    if (byPlace.has(offer.place.id) || used.has(offer.sight.pageId)) continue;
    byPlace.set(offer.place.id, offer.sight);
    used.add(offer.sight.pageId);
  }
  return { byPlace, unmatched: sights.filter((s) => !used.has(s.pageId)) };
}

export const geosearchUrl = (lang: "en" | "es", center: LatLng, radiusM: number): string =>
  `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&generator=geosearch&ggscoord=${center.lat}%7C${center.lng}&ggsradius=${Math.min(10000, Math.max(500, Math.round(radiusM)))}&ggslimit=50&prop=pageimages%7Ccoordinates%7Cdescription%7Cinfo&inprop=url&piprop=thumbnail%7Cname&pithumbsize=640&pilicense=free&pilimit=50&colimit=50`;

export const imageInfoUrl = (lang: "en" | "es", files: string[]): string =>
  `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=extmetadata%7Curl&iiextmetadatafilter=Artist%7CLicenseShortName&titles=${files.slice(0, 50).map((f) => encodeURIComponent(`File:${f}`)).join("%7C")}`;

/* ------------------------------------------------------------------ */
/* One place at a time: Wikimedia Commons' geotagged photographs.      */
/* ------------------------------------------------------------------ */

/** How far from a place a photograph may have been taken and still be offered as a picture of it. */
export const COMMONS_REACH_M = 250;

export const commonsSearchUrl = (name: string, at: LatLng): string =>
  `https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&generator=search&gsrnamespace=6&gsrlimit=10&gsrsearch=${encodeURIComponent(`${name.replace(/["\\:]/g, " ")} nearcoord:${COMMONS_REACH_M}m,${at.lat},${at.lng}`)}&prop=imageinfo&iiprop=url%7Cextmetadata%7Cmime%7Csize&iiurlwidth=640&iiextmetadatafilter=Artist%7CLicenseShortName`;

export const wikidataImageUrl = (qid: string): string => `https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=${qid}&property=P18`;

export const commonsFileUrl = (file: string): string =>
  `https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&titles=${encodeURIComponent(`File:${file}`)}&prop=imageinfo&iiprop=url%7Cextmetadata%7Cmime%7Csize&iiurlwidth=640&iiextmetadatafilter=Artist%7CLicenseShortName`;

export const isQid = (value: string): boolean => /^Q[1-9]\d{0,11}$/.test(value);

/** The first image a Wikidata item names as its picture. */
export function parseWikidataImage(json: unknown): string | null {
  const claims = (json as { claims?: { P18?: { mainsnak?: { datavalue?: { value?: unknown } } }[] } } | null)?.claims?.P18;
  const value = claims?.[0]?.mainsnak?.datavalue?.value;
  return typeof value === "string" && value.length < 240 ? value : null;
}

type CommonsPage = { title?: string; index?: number; imageinfo?: { thumburl?: string; thumbwidth?: number; thumbheight?: number; width?: number; mime?: string; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }[] };

/** A file name as words: no "File:", no extension, no Geograph serial or Flickr id on the end. */
export function fileTokens(title: string): string[] {
  const bare = title
    .replace(/^File:/i, "")
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/-?\s*geograph\.org\.uk\s*-?\s*\d+/i, " ")
    .replace(/\(\d{6,}\)/g, " ");
  return nameTokens(bare.replace(/,/g, " "));
}

/** Pictures that are near a place and named after it without being a picture of it. */
const NOT_A_PHOTO = /\b(map|plan|logo|plaque|sign|signage|menu|diagram|poster|advert|ticket|receipt|coat of arms|drawing|engraving|postcard)\b/i;

const toPhoto = (page: CommonsPage): PlacePhoto | null => {
  const info = page.imageinfo?.[0];
  if (!info || !isWikimedia(info.thumburl) || !/^image\/(jpeg|png|webp)$/.test(info.mime ?? "")) return null;
  // Geograph's pictures of British pubs are 640 pixels wide at best; smaller than this is a smudge.
  if ((info.width ?? 0) < 400) return null;
  const meta = info.extmetadata ?? {};
  const credit = stripTags(meta.Artist?.value ?? "").slice(0, 80);
  const licence = stripTags(meta.LicenseShortName?.value ?? "").slice(0, 40);
  return { src: info.thumburl, width: info.thumbwidth ?? 640, height: info.thumbheight ?? 480, credit: credit || undefined, licence: licence || undefined, fileUrl: info.descriptionurl?.startsWith("https://") ? info.descriptionurl : undefined };
};

/**
 * The photograph to show for a place, out of what Commons found near it: the first, in Commons'
 * own order of relevance, whose file name carries every word of the place's name, that is a
 * photograph, and that is wide enough to look at. None of them is an acceptable answer.
 */
export function pickCommonsPhoto(json: unknown, placeName: string): PlacePhoto | null {
  const pages = (json as { query?: { pages?: CommonsPage[] } } | null)?.query?.pages;
  if (!Array.isArray(pages)) return null;
  const wanted = nameTokens(placeName);
  if (wanted.length === 0 || !wanted.some((t) => t.length >= 4)) return null;
  for (const page of [...pages].sort((a, b) => (a.index ?? 99) - (b.index ?? 99))) {
    if (!page.title || NOT_A_PHOTO.test(page.title)) continue;
    const words = new Set(fileTokens(page.title));
    if (!wanted.every((t) => words.has(t))) continue;
    const photo = toPhoto(page);
    if (photo && photo.width >= photo.height * 0.7) return photo;
  }
  return null;
}

/** The one file a Wikidata item points at. */
export function parseCommonsFile(json: unknown): PlacePhoto | null {
  const page = (json as { query?: { pages?: CommonsPage[] } } | null)?.query?.pages?.[0];
  return page ? toPhoto(page) : null;
}
