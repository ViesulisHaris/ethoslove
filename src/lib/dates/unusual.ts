import { KINDS, type PlaceGroup, type PlaceKind } from "./kinds";

/**
 * Places with a story: a bar down a cellar staircase or behind an unmarked door, a table on a roof,
 * a jazz club, a boat, a planetarium, a café full of cats. What makes a place one of these is a
 * "quirk", read from what the map knows: its OpenStreetMap tags when we have them (the rare finds),
 * its name in the languages of the cities people search (the tiles give nothing else), and, last
 * and weakest, a kind of place that is an outing in itself (karaoke, an ice rink, boat hire).
 *
 * Names are the main signal and the riskiest: "The Castle" is a London pub, "Terrace Café" is on a
 * pavement, Mikkeller is a brewery chain, Peniche is a Portuguese town. Every word here is matched
 * on whole words (or as the tail of a German or Dutch compound), and the rules carry the guards
 * that came out of reading real names from London, Paris, Lisbon, Berlin, New York, Rome,
 * Amsterdam and Prague.
 */

type L = { en: string; es: string };

export type Quirk =
  | "underground"
  | "speakeasy"
  | "rooftop"
  | "high"
  | "music"
  | "tiki"
  | "water"
  | "stars"
  | "games"
  | "karaoke"
  | "cats"
  | "animals"
  | "castle"
  | "lighthouse"
  | "windmill"
  | "glasshouse"
  | "openair"
  | "baths"
  | "spa"
  | "wine"
  | "ice"
  | "climb"
  | "thrills";

/** How the badge reads. Short: it sits on a photograph beside the price. */
export const QUIRKS: Record<Quirk, { label: L }> = {
  underground: { label: { en: "Underground", es: "Bajo tierra" } },
  speakeasy: { label: { en: "Speakeasy", es: "Bar escondido" } },
  rooftop: { label: { en: "Rooftop", es: "En la azotea" } },
  high: { label: { en: "Up high", es: "En las alturas" } },
  music: { label: { en: "Live music", es: "Música en directo" } },
  tiki: { label: { en: "Tiki bar", es: "Bar tiki" } },
  water: { label: { en: "On the water", es: "Sobre el agua" } },
  stars: { label: { en: "Under the stars", es: "Bajo las estrellas" } },
  games: { label: { en: "Games", es: "Juegos" } },
  karaoke: { label: { en: "Karaoke", es: "Karaoke" } },
  cats: { label: { en: "Cat café", es: "Café con gatos" } },
  animals: { label: { en: "Animals", es: "Animales" } },
  castle: { label: { en: "Castle", es: "Castillo" } },
  lighthouse: { label: { en: "Lighthouse", es: "Faro" } },
  windmill: { label: { en: "Windmill", es: "Molino" } },
  glasshouse: { label: { en: "Glasshouse", es: "Invernadero" } },
  openair: { label: { en: "Open air", es: "Al aire libre" } },
  baths: { label: { en: "Thermal baths", es: "Baños termales" } },
  spa: { label: { en: "Spa date", es: "Cita en el spa" } },
  wine: { label: { en: "Wine tasting", es: "Cata de vinos" } },
  ice: { label: { en: "On ice", es: "Sobre hielo" } },
  climb: { label: { en: "Climbing", es: "Escalada" } },
  thrills: { label: { en: "Thrills", es: "Emociones fuertes" } },
};
export const QUIRK_IDS = Object.keys(QUIRKS) as Quirk[];

/**
 * 3: the map says so in a tag, or the name says it in so many words ("Rooftop", "Jazz", "Caveau").
 * 2: the name hints at it ("… with a view"). 1: the kind of place is an outing in itself.
 */
export type Strength = 1 | 2 | 3;
export type Unusual = { quirk: Quirk; strength: Strength };

/** Fewer than this and there is no shelf: two cards read as a shelf that failed to load. */
export const MIN_UNUSUAL = 3;
/** The most cards the shelf holds. */
export const UNUSUAL_SHELF = 12;
/**
 * A search keeps the best sixty places of each group, and a city centre has hundreds of bars: the
 * cellar bar ranked two hundredth would never reach the page. This many places with a story are
 * kept past that cap (lib/dates/sources.ts).
 */
export const UNUSUAL_EXTRA = 30;

/** Kinds that are a different kind of evening by themselves: the shelf's last resort, never its lead. */
const KIND_QUIRKS: Partial<Record<PlaceKind, Quirk>> = {
  planetarium: "stars",
  karaoke: "karaoke",
  escape: "games",
  bowling: "games",
  arcade: "games",
  minigolf: "games",
  climbing: "climb",
  skating: "ice",
  boats: "water",
  zoo: "animals",
  themepark: "thrills",
  spa: "spa",
  winery: "wine",
};

/** Where a couple sits down: the kinds a hidden bar, a rooftop or a jazz night can be. */
const VENUES: readonly PlaceKind[] = ["restaurant", "bar", "cafe", "dessert", "theatre"];
/** Places to look at rather than eat in: a castle, a lighthouse, a windmill, a glasshouse. */
const SIGHTS: readonly PlaceKind[] = ["landmark", "museum", "park", "garden", "gallery", "theatre"];

type Rule = {
  quirk: Quirk;
  /** Whole words or phrases, lower case without accents ("cat cafe" matches "Cat Café"). */
  words?: readonly string[];
  /** The tail of a compound word ("keller" in Ratskeller, Jazzkeller): only longer words than the tail. */
  ends?: readonly string[];
  /** The start of a word ("rooftop" in "RooftopBar", "katzen" in Katzentempel). */
  starts?: readonly string[];
  /** Only for these kinds. */
  kinds?: readonly PlaceKind[];
  /** Words or phrases that undo the rule for this name. */
  unless?: readonly string[];
  /** Matched with accents kept: "péniche" is a boat, "Peniche" a town famous for sardines. */
  accents?: boolean;
  strength?: Strength;
};

/**
 * The order matters where a name says two things: "Jazzkeller" is a cellar before it is a jazz club,
 * and a "Rooftop Cinema" is on a roof before it is open-air.
 */
const RULES: readonly Rule[] = [
  {
    quirk: "speakeasy",
    // Said outright, it is one whatever the map calls it.
    words: ["speakeasy", "speak easy"],
    kinds: VENUES,
  },
  {
    quirk: "speakeasy",
    // A "Secret Garden" café or "Les secrets du Maghreb" is a name; a bar called Secret is a door to find.
    words: ["secret", "secrete", "hidden", "hideaway", "hideout", "blind pig", "blind tiger", "back room", "backroom", "prohibition", "clandestine", "clandestino", "clandestina", "clandestin", "escondido", "escondida", "secreto", "secreta", "oculto", "oculta", "segreto", "segreta", "nascosto", "nascosta", "geheim", "versteckt", "verborgen", "verstopt", "hinterzimmer"],
    starts: ["geheim"],
    kinds: ["bar"],
    unless: ["garden", "gardens", "jardin", "jardim", "garten", "comedy"],
  },
  {
    quirk: "underground",
    words: ["cellar", "cellars", "vault", "vaults", "crypt", "undercroft", "catacomb", "catacombs", "bunker", "basement", "underground", "cavern", "caveau", "caveaux", "les caves", "caves du", "caves de", "sous sol", "souterrain", "crypte", "catacombes", "sotano", "cueva", "cripta", "boveda", "subterraneo", "subterranea", "subterraneo", "sotterraneo", "sotterranea", "sotterranei", "gewolbe", "keller", "katakomben", "gruft", "untergrund", "unterirdisch", "kelder", "gewelf", "gewelven", "ondergronds", "kaelder", "kaelderen", "kallare", "kallaren", "kjeller", "kjelleren", "piwnica", "piwnice", "podziemia"],
    ends: ["keller", "kelder", "kaelder", "kallare", "pince"],
    starts: ["kellerbar", "kellerclub", "kellerkneipe", "kellerlokal", "kellerkino", "kellertheater"],
    kinds: [...VENUES, "landmark", "museum", "gallery", "cinema"],
    // A Danish brewery with bars in every capital; a clothes shop and a hotel chain with the word in them.
    unless: ["mikkeller", "the london silver vaults", "underground station"],
  },
  {
    quirk: "rooftop",
    words: ["rooftop", "rooftops", "roof top", "roof terrace", "roof garden", "roof gardens", "roof bar", "roof deck", "roof lounge", "the roof", "on the roof", "sky bar", "skybar", "sky lounge", "sky garden", "sky terrace", "azotea", "atico", "toit", "toits", "sur le toit", "perchoir", "dachterrasse", "dachgarten", "dachbar", "dach", "uber den dachern", "sul tetto", "tetto", "attico", "altana", "dakterras", "dakbar", "daktuin", "op het dak", "tagterrasse", "takterrass"],
    starts: ["rooftop", "dachterrasse", "dakterras"],
    kinds: [...VENUES, "viewpoint", "garden", "cinema"],
  },
  {
    quirk: "high",
    // An observation deck is an observatory in English and never a telescope.
    words: ["observation deck", "observatory", "skydeck", "sky deck", "top of the rock", "the edge", "skypod", "sky tower"],
    kinds: ["viewpoint", "landmark"],
  },
  {
    quirk: "music",
    // "Blues & Royals" is a regiment and "Hill Street Blues" a television series: blues on its own
    // is not enough, a blues club or a blues bar is. "Piano" alone is a floor in Italian.
    words: ["jazz", "live jazz", "blues bar", "blues club", "blues cafe", "blues kitchen", "blues lounge", "piano bar", "piano lounge", "piano works", "live music", "musica en vivo", "musica en directo", "musica dal vivo", "musique live", "live muziek", "cabaret", "cabare", "variete", "guinguette", "fado", "fados", "casa de fado", "casa de fados", "fadista", "tablao", "flamenco", "milonga", "tangueria"],
    starts: ["jazz", "pianobar", "bluescafe", "bluesbar", "bluesclub"],
    ends: ["jazz"],
    kinds: VENUES,
    // A "cabaret club" in Prague or Rome is not a night of chansons; Pastel do Fado sells pastries.
    unless: ["cabaret club", "club cabaret", "gentlemen", "gentlemens", "pastel do fado"],
  },
  { quirk: "tiki", words: ["tiki"], starts: ["tiki"], kinds: ["bar"] },
  {
    quirk: "water",
    // "The Ship" and "The Boat" are pubs on dry land; a barge, a péniche or a houseboat is not.
    words: ["barge", "houseboat", "floating", "lightship", "riverboat", "narrowboat", "paddle steamer", "aboard", "on board", "flottant", "flottante", "a bord", "hausboot", "feuerschiff", "badeschiff", "schwimmende", "flotante", "a bordo", "galleggiante", "barcone", "barconi", "battello", "flutuante", "woonboot", "drijvend", "drijvende", "aan boord"],
    kinds: [...VENUES, "landmark", "museum", "cinema", "gallery"],
    // A floating island is a pudding.
    unless: ["ile flottante", "iles flottantes", "floating island"],
  },
  {
    quirk: "water",
    // The boats themselves, where the map files the jetty as a sight; the café by the jetty is not on board.
    words: ["boat tour", "boat tours", "canal cruise", "canal cruises", "river cruise", "rondvaart", "rondvaarten", "bateau mouche", "bateaux mouches", "bateaux parisiens"],
    kinds: ["landmark", "museum"],
  },
  // Only the French word, with its accent.
  { quirk: "water", words: ["péniche"], accents: true, kinds: [...VENUES, "landmark", "museum", "cinema", "gallery"] },
  {
    quirk: "stars",
    // Not "astronomique": the gnomon in Saint-Sulpice is a line on a church floor.
    words: ["planetarium", "planetario", "planetaire", "sternwarte", "observatorio", "observatoire", "osservatorio", "observatorium"],
    starts: ["planetari", "observator"],
    ends: ["planetarium", "sternwarte"],
    // An observatory in a landmark's or a museum's name is a telescope; on a viewpoint it is a deck
    // (above). A planetarium is one by its kind already.
    kinds: ["museum", "landmark", "park", "garden", "theatre", "cinema"],
  },
  {
    quirk: "stars",
    words: ["observatory"],
    kinds: ["museum", "park", "garden"],
  },
  {
    quirk: "games",
    // Bars and cafés only: Ping Pong is a dim sum chain and Jeux Jeux an okonomiyaki kitchen.
    words: ["board game", "board games", "boardgame", "boardgames", "game cafe", "games cafe", "games bar", "game bar", "barcade", "arcade bar", "ping pong", "pingpong", "table tennis", "shuffleboard", "darts", "crazy golf", "mini golf", "minigolf", "pinball", "bowling", "escape room", "jeux", "bar a jeux", "jeux de societe", "juegos de mesa", "juegos", "ludoteca", "ludotheque", "giochi", "giochi da tavolo", "jogos", "jogos de tabuleiro", "spielecafe", "spielcafe", "spielebar", "brettspiel", "brettspiele", "brettspielcafe", "spellencafe", "bordspel", "bordspellen", "tischtennis", "puttshack", "flight club"],
    starts: ["boardgame", "brettspiel", "spellencafe", "spielecafe", "bordspel"],
    kinds: ["bar", "cafe"],
  },
  // A karaoke bar's kind already says it: that one is the shelf's last resort, like an ice rink.
  { quirk: "karaoke", words: ["karaoke", "noraebang"], starts: ["karaoke"], kinds: VENUES },
  {
    quirk: "cats",
    words: ["cat cafe", "cats cafe", "cat lounge", "kitty cafe", "catfe", "cafe des chats", "bar a chats", "cafe de gatos", "cafe dos gatos", "gatos cafe", "caffe dei gatti", "katzencafe", "katzen cafe", "kattencafe", "kattcafe", "neko cafe", "nekocafe", "katzentempel"],
    starts: ["katzencafe", "katzentempel", "kattencafe", "catcafe"],
    kinds: ["cafe", "dessert", "restaurant", "bar"],
  },
  {
    quirk: "castle",
    // Only for somewhere to visit: "The Castle" and "Albert's Schloss" are a pub and a bar with a theme.
    // Castelo Branco is a town and a writer, and a castle's viewpoint is not the castle.
    words: ["castle", "chateau", "schloss", "burg", "castello", "castel", "castillo", "castelo", "kasteel", "zamek", "hrad", "fortress", "forteresse", "festung", "fortezza", "fortaleza", "citadel", "citadelle", "zitadelle", "cittadella", "ciudadela", "cidadela", "alcazar", "alcazaba"],
    kinds: SIGHTS,
    unless: ["castelo branco", "rosa luxemburg"],
  },
  { quirk: "lighthouse", words: ["lighthouse", "leuchtturm", "phare", "faro", "farol", "vuurtoren", "fyr"], kinds: SIGHTS },
  { quirk: "windmill", words: ["windmill", "windmuhle", "moulin", "molino", "moinho", "molen", "wiatrak"], kinds: ["landmark", "museum", "park", "garden"] },
  {
    quirk: "glasshouse",
    words: ["glasshouse", "glass house", "greenhouse", "conservatory", "palm house", "palmhouse", "palmenhaus", "orangery", "orangerie", "serre", "serres", "estufa", "estufa fria", "estufa quente", "invernadero", "gewachshaus", "tropenhaus", "winter garden", "wintergarten", "jardin d hiver", "jardin de invierno", "biodome", "de kas"],
    kinds: ["garden", "park", "landmark"],
  },
  {
    quirk: "openair",
    words: ["open air", "openair", "freiluftkino", "freilichtbuhne", "sommerkino", "plein air", "cine de verano", "cinema all aperto", "all aperto", "drive in", "outdoor cinema", "rooftop cinema"],
    starts: ["freiluft", "openair"],
    kinds: ["cinema", "theatre"],
  },
  {
    quirk: "baths",
    // Not for a ruin: the Baths of Diocletian are a museum, and nobody is getting in.
    words: ["therme", "thermen", "thermal", "thermae", "termas", "termal", "terme", "hammam", "hamam", "banya", "banja", "onsen", "bathhouse", "bath house", "baths", "furdo", "gyogyfurdo"],
    ends: ["therme", "furdo"],
    kinds: ["spa"],
    // Rare finds from eight kilometres round: after the bars and rooftops of the neighbourhood.
    strength: 2,
  },
];

/** Names that never go on this shelf, whatever else they say: it is a date page, and a shared one. */
const NEVER = ["strip", "striptease", "stripclub", "erotic", "erotik", "erotica", "sex", "sexy", "sexshop", "gentlemen", "gentlemens", "table dance", "tabledance", "lap dance", "go go", "gogo", "peep", "peepshow", "swinger", "swingers", "escort", "brothel", "bordel", "bordell", "burdel", "puticlub", "laufhaus", "fkk", "saunaclub", "sauna club", "club sauna", "night club", "nightclub", "nachtclub", "hostess", "red light", "love store", "fetish", "bdsm", "dungeon", "cannabis", "coffeeshop", "weed", "hooters"];

type Folded = { plain: string; marked: string; tokens: string[] };

const LETTERS: Record<string, string> = { ß: "ss", æ: "ae", ø: "o", œ: "oe", ł: "l", đ: "d", ı: "i" };

/**
 * A name as words: lower case, apostrophes and punctuation as spaces, and (for `plain`) no accents,
 * so "Sótano", "SOTANO" and "El Sótano!" all read " el sotano ". Padded, so " word " is a whole word.
 */
export function foldName(name: string): Folded {
  const lower = name.toLowerCase().replace(/[ßæøœłđı]/g, (c) => LETTERS[c] ?? c);
  const marked = ` ${lower.replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
  const plain = ` ${lower.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
  return { plain, marked, tokens: plain.trim().split(" ").filter(Boolean) };
}

const has = (text: string, phrase: string) => text.includes(` ${phrase} `);

function matches(rule: Rule, name: Folded): boolean {
  const text = rule.accents ? name.marked : name.plain;
  if (rule.unless?.some((w) => has(name.plain, w) || name.tokens.includes(w))) return false;
  if (rule.words?.some((w) => has(text, w))) return true;
  if (rule.starts?.some((s) => name.tokens.some((t) => t.startsWith(s)))) return true;
  return Boolean(rule.ends?.some((e) => name.tokens.some((t) => t.length > e.length + 1 && t.endsWith(e))));
}

export const isNeverUnusual = (name: Folded): boolean => NEVER.some((w) => has(name.plain, w));

/** What a place's name says about it, if anything. */
export function quirkOfName(name: string, kind: PlaceKind): Unusual | null {
  const folded = foldName(name);
  if (isNeverUnusual(folded)) return null;
  for (const rule of RULES) {
    if (rule.kinds && !rule.kinds.includes(kind)) continue;
    if (matches(rule, folded)) return { quirk: rule.quirk, strength: rule.strength ?? 3 };
  }
  return null;
}

type Tags = Record<string, string | undefined>;

const EAT_GROUPS: readonly PlaceGroup[] = ["eat", "sweet"];
const ROOF = new Set(["roof", "rooftop"]);
/** A "castle" in OpenStreetMap is as often a palace, a manor or an embassy in one. */
const NOT_A_CASTLE = new Set(["palace", "manor", "stately", "mansion", "chateau", "residence"]);

/**
 * What a place's OpenStreetMap tags say about it, for the places whose tags we have (the rare finds
 * and anything read from Overpass). A chain's cellar or rooftop is still a chain.
 */
export function quirkOfTags(tags: Tags, kind: PlaceKind): Quirk | null {
  const group = KINDS[kind].group;
  if (EAT_GROUPS.includes(group) && (tags.brand || tags["brand:wikidata"])) return null;
  if (isNeverUnusual(foldName(tags.name ?? ""))) return null;
  if (VENUES.includes(kind) || kind === "cinema") {
    if (tags.location === "underground") return "underground";
    if (ROOF.has(tags.location ?? "") || tags.rooftop === "yes") return "rooftop";
    if (tags.floating === "yes" || tags.building === "ship" || tags.building === "houseboat" || tags.historic === "ship") return "water";
    // A cellar bar is on level -1; a restaurant there is as often in a shopping centre's food court.
    if (kind === "bar" && /^-\d/.test(tags.level ?? "")) return "underground";
  }
  if (tags.man_made === "lighthouse") return "lighthouse";
  if (tags.man_made === "windmill") return "windmill";
  if (tags.man_made === "observatory" && kind !== "viewpoint") return "stars";
  if ((tags.historic === "castle" && !NOT_A_CASTLE.has(tags.castle_type ?? "")) || tags.historic === "fort" || tags.historic === "citadel") return SIGHTS.includes(kind) ? "castle" : null;
  return null;
}

/** The little a place needs to be judged: what the lists and the rare finds carry. */
export type Judged = { id: string; name: string; named: boolean; kind: PlaceKind; quirk?: Quirk };

/** Names are judged once a visit, not once a render: the same café comes back in every answer. */
const judged = new Map<string, Unusual | null>();
const JUDGED_MAX = 4000;

/** Why a place is out of the ordinary, or null: its tags first, then its name, then its kind. */
export function unusualOf(place: Judged): Unusual | null {
  const key = `${place.kind}|${place.quirk ?? ""}|${place.named ? place.name : ""}`;
  const hit = judged.get(key);
  if (hit !== undefined) return hit;
  let found: Unusual | null = null;
  const folded = place.named ? foldName(place.name) : null;
  if (!folded || !isNeverUnusual(folded)) {
    if (place.quirk) found = { quirk: place.quirk, strength: 3 };
    else if (place.named) found = quirkOfName(place.name, place.kind) ?? (KIND_QUIRKS[place.kind] ? { quirk: KIND_QUIRKS[place.kind]!, strength: 1 } : null);
  }
  if (judged.size >= JUDGED_MAX) judged.clear();
  judged.set(key, found);
  return found;
}

/** Every out-of-the-ordinary place in a set, by id: worked out once per set of places. */
export function unusualIndex(places: readonly Judged[]): Map<string, Unusual> {
  const index = new Map<string, Unusual>();
  for (const p of places) {
    const u = unusualOf(p);
    if (u) index.set(p.id, u);
  }
  return index;
}

/** Two cards of one quirk this close are one place mapped twice, or one castle's garden and museum. */
const TWIN_M = 150;
/** No quirk takes more than this many cards: variety is the point of the shelf. */
const PER_QUIRK = { strong: 3, fill: 2 } as const;

const metres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const dy = (a.lat - b.lat) * 111_320;
  const dx = (a.lng - b.lng) * 111_320 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  return Math.hypot(dx, dy);
};

type Pickable = { id: string; name: string; named: boolean; lat: number; lng: number; rank: number };

const FILLER = new Set(["the", "le", "la", "les", "l", "el", "los", "las", "o", "a", "os", "as", "il", "lo", "de", "do", "da", "du", "des", "der", "die", "das", "het", "bar", "cafe", "restaurant", "restaurante", "ristorante", "club"]);
/** "Red Frog Speakeasy" and "Red Frog - Speakeasy Bar" are one bar mapped twice, a street apart. */
const twinKey = (name: string): string =>
  foldName(name)
    .tokens.filter((t) => !FILLER.has(t))
    .slice(0, 2)
    .join(" ");
/** How far apart one place mapped twice under two names can be. */
const NAMESAKE_M = 1000;

/**
 * The shelf: the strongest quirks first, taken a quirk at a time so the first cards are a rooftop,
 * a cellar and a jazz club rather than three rooftops, each quirk in date-score order; then the
 * kinds that are an outing in themselves. Places in `avoid` (the top picks just above) go last in
 * their quirk, so the two shelves don't open on the same place. `seed` is a shelf already on the
 * screen: it stays as it is, first, and only what fits beside it (no third rooftop, no twin of a
 * card already there) is added after it.
 */
export function unusualPicks<T extends Pickable>(ranked: readonly T[], index: ReadonlyMap<string, Unusual>, count = UNUSUAL_SHELF, avoid?: ReadonlySet<string>, seed: readonly T[] = []): T[] {
  const seeded = new Set(seed.map((p) => p.id));
  const candidates = ranked.filter((p) => p.named && index.has(p.id) && !seeded.has(p.id));
  const picked: T[] = [...seed];
  const taken: Partial<Record<Quirk, T[]>> = {};
  for (const p of seed) {
    const quirk = index.get(p.id)?.quirk;
    if (quirk) taken[quirk] = [...(taken[quirk] ?? []), p];
  }
  const tier = (strong: boolean) => {
    const queues = new Map<Quirk, T[]>();
    const pool = candidates
      .filter((p) => (index.get(p.id)!.strength > 1) === strong)
      .sort((a, b) => index.get(b.id)!.strength - index.get(a.id)!.strength || Number(avoid?.has(a.id) ?? false) - Number(avoid?.has(b.id) ?? false) || a.rank - b.rank);
    for (const p of pool) {
      const q = index.get(p.id)!.quirk;
      queues.set(q, [...(queues.get(q) ?? []), p]);
    }
    const cap = strong ? PER_QUIRK.strong : PER_QUIRK.fill;
    for (let round = 0; picked.length < count && [...queues.values()].some((q) => q.length > 0); round++) {
      for (const [quirk, queue] of queues) {
        if (picked.length >= count) break;
        const mine = taken[quirk] ?? [];
        // Past the cap, or nothing left: this quirk sits the rest of the rounds out.
        while (queue.length > 0) {
          if (mine.length >= cap) {
            queue.length = 0;
            break;
          }
          const next = queue.shift()!;
          const key = twinKey(next.name);
          if (mine.some((m) => metres(m, next) < TWIN_M) || (key && picked.some((m) => twinKey(m.name) === key && metres(m, next) < NAMESAKE_M))) continue;
          mine.push(next);
          taken[quirk] = mine;
          picked.push(next);
          break;
        }
      }
    }
  };
  tier(true);
  tier(false);
  return picked;
}

export const quirkLabel = (quirk: Quirk, locale: "en" | "es"): string => QUIRKS[quirk].label[locale];
/** Whether a card in the list should say it: the kind already says "Karaoke" or "Ice rink". */
export const isTold = (u: Unusual | undefined): u is Unusual => Boolean(u && u.strength > 1);

/**
 * The map files a jazz club with the nightclubs, which are left off these pages. One whose name says
 * it is a jazz club, a blues bar, a piano bar or a fado house, or a French jazz cellar (a caveau),
 * is an evening out for two, and is kept as a bar.
 */
export function isListeningClub(name: string): boolean {
  const folded = foldName(name);
  if (isNeverUnusual(folded)) return false;
  const found = quirkOfName(name, "bar");
  return found?.quirk === "music" || (found?.quirk === "underground" && (has(folded.plain, "caveau") || has(folded.plain, "caveaux")));
}
