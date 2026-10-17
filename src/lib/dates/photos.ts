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

/**
 * The widths Wikimedia renders thumbnails at. Any other is refused (a 400 for 240px) or, asked of
 * the API, rounded up: the 1024 the photo lookups ask for comes back 1280 pixels wide.
 */
export const WIKIMEDIA_WIDTHS = [120, 250, 330, 500, 960, 1280] as const;

/** A thumbnail's path: ".../thumb/a/ab/File.jpg/1280px-File.jpg", with "lossy-page1-" and the like allowed before the width. */
const THUMB = /^(https:\/\/(?:upload|thumb)\.wikimedia\.org\/.+\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/[^/]+\/(?:[a-z0-9]+-)*)(\d+)(px-[^/?#]+)(.*)$/;
/** An original, served as it is because it was narrower than what was asked for. */
const ORIGINAL = /^(https:\/\/(?:upload|thumb)\.wikimedia\.org\/[^/]+\/[^/]+\/)([0-9a-f]\/[0-9a-f]{2}\/)([^/?#]+)(\?.*)?$/;

/**
 * The same picture at about twice the width it is shown at (sharp on a phone's screen), as the
 * smallest of Wikimedia's own sizes that covers it. A card 104 pixels wide was being sent the
 * 1280-pixel file, up to a megabyte, and sat blank while it came. Only ever smaller: a picture
 * never comes back wider than the one it was given.
 */
export function photoAt(photo: Pick<PlacePhoto, "src" | "width">, shownWidth: number): string {
  const want = WIKIMEDIA_WIDTHS.find((w) => w >= shownWidth * 2) ?? WIKIMEDIA_WIDTHS[WIKIMEDIA_WIDTHS.length - 1];
  const thumb = THUMB.exec(photo.src);
  if (thumb) return Number(thumb[2]) > want ? `${thumb[1]}${want}${thumb[3]}${thumb[4]}` : photo.src;
  const original = ORIGINAL.exec(photo.src);
  // A thumbnail of a small original only when it is really smaller; SVGs and the like are always thumbnails already.
  if (original && want < photo.width && /\.(jpe?g|png|webp)$/i.test(original[3])) return `${original[1]}thumb/${original[2]}${original[3]}/${want}px-${original[3]}${original[4] ?? ""}`;
  return photo.src;
}

/** A page's picture that is a logo, a map, a flag or a crest rather than a photograph of the place. */
const NOT_A_PAGE_PHOTO = /\.(svg|gif)$|logo|coat[_ ]of[_ ]arms|(^|[_ -])(map|locator|flag|escudo|wappen)([_ .-]|$)/i;

export function parseGeosearch(json: unknown): Sight[] {
  const pages = (json as { query?: { pages?: GeoPage[] } } | null)?.query?.pages;
  if (!Array.isArray(pages)) return [];
  const sights: Sight[] = [];
  for (const page of pages) {
    const at = page.coordinates?.[0];
    const thumb = page.thumbnail;
    if (typeof page.pageid !== "number" || !page.title || !isWikimedia(thumb?.source) || typeof at?.lat !== "number" || typeof at?.lon !== "number") continue;
    if (!page.fullurl?.startsWith("https://")) continue;
    // An article's picture is often the museum's logo or a map of the district: shown as the
    // "real photo" of a place it is worse than none, and the per-place lookup finds a photograph.
    if (page.pageimage && NOT_A_PAGE_PHOTO.test(page.pageimage)) continue;
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

const STOP = new Set(["the", "of", "and", "de", "la", "le", "el", "los", "las", "do", "da", "dos", "das", "du", "des", "di", "del", "della", "y", "e", "a", "o", "os", "as", "at", "in"]);
/**
 * "Saint" in its many spellings, read as one word and kept: "St Paul's" is a church and "Paul" is
 * a bakery, and with the saint thrown away the two were the same name. A bare "St" at the end of a
 * name is a street ("Frith St"), and is dropped; anywhere else it is a saint ("Church of St Mary").
 */
const SAINT = new Set(["st", "ste", "saint", "sainte", "san", "santa", "santo", "sao", "sant", "sankt"]);

/** A name as a bag of words: no accents, no punctuation, no "the", and no "(Lisbon)" or ", London" on the end. */
export function nameTokens(name: string): string[] {
  const base = name.replace(/\([^)]*\)/g, " ").split(",")[0];
  return base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .flatMap((t, i, all) => (t === "st" && i > 0 && i === all.length - 1 ? [] : [SAINT.has(t) ? "st" : t]))
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** A one-word name shorter than this is too common a word to find anything by on its own ("Paul", "Rose", "Nola"). */
const LONE_WORD_MIN = 5;

/** How alike two names are: the share of the shorter one's words found in the other, if a real word is among them. */
export function nameMatch(a: string, b: string): number {
  const ta = nameTokens(a);
  const tb = new Set(nameTokens(b));
  if (ta.length === 0 || tb.size === 0) return 0;
  // A saint on one side only is somebody else: the church of St Paul is not the bakery Paul.
  if (ta.includes("st") !== tb.has("st")) return 0;
  // One short word against a longer name matches too much by chance.
  const lone = ta.length === 1 ? ta[0] : tb.size === 1 ? [...tb][0] : null;
  if (lone && Math.max(ta.length, tb.size) > 1 && lone.length < LONE_WORD_MIN) return 0;
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
  `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&generator=geosearch&ggscoord=${center.lat}%7C${center.lng}&ggsradius=${Math.min(10000, Math.max(500, Math.round(radiusM)))}&ggslimit=50&prop=pageimages%7Ccoordinates%7Cdescription%7Cinfo&inprop=url&piprop=thumbnail%7Cname&pithumbsize=1024&pilicense=free&pilimit=50&colimit=50`;

export const imageInfoUrl = (lang: "en" | "es", files: string[]): string =>
  `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=extmetadata%7Curl&iiextmetadatafilter=Artist%7CLicenseShortName&titles=${files.slice(0, 50).map((f) => encodeURIComponent(`File:${f}`)).join("%7C")}`;

/* ------------------------------------------------------------------ */
/* One place at a time: Wikimedia Commons' geotagged photographs.      */
/* ------------------------------------------------------------------ */

/** How far from a place a photograph may have been taken and still be offered as a picture of it. */
export const COMMONS_REACH_M = 250;
/** Shorter than this, a name ("U9", a bar) matches any photograph on Commons, so it is never searched for. */
export const PHOTO_NAME_MIN = 3;

export const commonsSearchUrl = (name: string, at: LatLng): string =>
  `https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&generator=search&gsrnamespace=6&gsrlimit=10&gsrsearch=${encodeURIComponent(`${name.replace(/["\\:]/g, " ")} nearcoord:${COMMONS_REACH_M}m,${at.lat},${at.lng}`)}&prop=imageinfo&iiprop=url%7Cextmetadata%7Cmime%7Csize&iiurlwidth=1024&iiextmetadatafilter=Artist%7CLicenseShortName`;

export const wikidataImageUrl = (qid: string): string => `https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=${qid}&property=P18`;

export const commonsFileUrl = (file: string): string =>
  `https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&titles=${encodeURIComponent(`File:${file}`)}&prop=imageinfo&iiprop=url%7Cextmetadata%7Cmime%7Csize&iiurlwidth=1024&iiextmetadatafilter=Artist%7CLicenseShortName`;

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
  // Part by part, so a street's "St" after a comma is still read as a street and not a saint.
  return bare.split(",").flatMap((part) => nameTokens(part));
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
    const tokens = fileTokens(page.title);
    const words = new Set(tokens);
    if (!wanted.every((t) => words.has(t))) continue;
    // As in nameMatch: the place's name with a saint in front of it in the file's ("St. Paul,
    // Covent Garden" for the bakery Paul) is another place. A saint elsewhere in it is only the
    // street or the district ("Dishoom, St Martin's Lane").
    if (!wanted.includes("st") && tokens.some((t, k) => t === "st" && wanted.includes(tokens[k + 1]))) continue;
    // A one-word name has to be what the file is named for, not a word somewhere in it.
    if (wanted.length === 1 && tokens[0] !== wanted[0]) continue;
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
