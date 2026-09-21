/**
 * What a place is, for two people deciding what to do. OpenStreetMap has thousands of tag
 * combinations; these are the ones a couple would plan an evening or an afternoon around, in
 * six groups that double as the map's filters.
 */
export type PlaceGroup = "eat" | "sweet" | "outdoors" | "culture" | "play" | "unwind";

export type PlaceKind =
  | "restaurant"
  | "bar"
  | "cafe"
  | "dessert"
  | "viewpoint"
  | "park"
  | "garden"
  | "beach"
  | "picnic"
  | "museum"
  | "gallery"
  | "cinema"
  | "theatre"
  | "planetarium"
  | "bookshop"
  | "landmark"
  | "bowling"
  | "minigolf"
  | "arcade"
  | "escape"
  | "climbing"
  | "skating"
  | "karaoke"
  | "boats"
  | "zoo"
  | "themepark"
  | "spa"
  | "winery";

type L = { en: string; es: string };
export type KindInfo = {
  group: PlaceGroup;
  label: L;
  /** Under a roof: what is left when the forecast says rain. */
  indoor: boolean;
  /** Costs nothing to turn up to. */
  free: boolean;
  /** A place with no name of its own is still worth showing: a viewpoint is a viewpoint. */
  nameless?: boolean;
};

export const KINDS: Record<PlaceKind, KindInfo> = {
  restaurant: { group: "eat", label: { en: "Restaurant", es: "Restaurante" }, indoor: true, free: false },
  bar: { group: "eat", label: { en: "Bar", es: "Bar" }, indoor: true, free: false },
  cafe: { group: "sweet", label: { en: "Café", es: "Cafetería" }, indoor: true, free: false },
  dessert: { group: "sweet", label: { en: "Something sweet", es: "Algo dulce" }, indoor: true, free: false },
  viewpoint: { group: "outdoors", label: { en: "Viewpoint", es: "Mirador" }, indoor: false, free: true, nameless: true },
  park: { group: "outdoors", label: { en: "Park", es: "Parque" }, indoor: false, free: true },
  garden: { group: "outdoors", label: { en: "Garden", es: "Jardín" }, indoor: false, free: true },
  beach: { group: "outdoors", label: { en: "Beach", es: "Playa" }, indoor: false, free: true, nameless: true },
  picnic: { group: "outdoors", label: { en: "Picnic spot", es: "Zona de pícnic" }, indoor: false, free: true, nameless: true },
  museum: { group: "culture", label: { en: "Museum", es: "Museo" }, indoor: true, free: false },
  gallery: { group: "culture", label: { en: "Gallery", es: "Galería" }, indoor: true, free: true },
  cinema: { group: "culture", label: { en: "Cinema", es: "Cine" }, indoor: true, free: false },
  theatre: { group: "culture", label: { en: "Theatre", es: "Teatro" }, indoor: true, free: false },
  planetarium: { group: "culture", label: { en: "Planetarium", es: "Planetario" }, indoor: true, free: false },
  bookshop: { group: "culture", label: { en: "Bookshop", es: "Librería" }, indoor: true, free: true },
  landmark: { group: "culture", label: { en: "Landmark", es: "Lugar emblemático" }, indoor: false, free: true },
  bowling: { group: "play", label: { en: "Bowling", es: "Bolera" }, indoor: true, free: false },
  minigolf: { group: "play", label: { en: "Mini golf", es: "Minigolf" }, indoor: false, free: false },
  arcade: { group: "play", label: { en: "Arcade", es: "Recreativos" }, indoor: true, free: false },
  escape: { group: "play", label: { en: "Escape room", es: "Escape room" }, indoor: true, free: false },
  climbing: { group: "play", label: { en: "Climbing wall", es: "Rocódromo" }, indoor: true, free: false },
  skating: { group: "play", label: { en: "Ice rink", es: "Pista de hielo" }, indoor: true, free: false },
  karaoke: { group: "play", label: { en: "Karaoke", es: "Karaoke" }, indoor: true, free: false },
  boats: { group: "play", label: { en: "Boat hire", es: "Alquiler de barcas" }, indoor: false, free: false },
  zoo: { group: "play", label: { en: "Zoo or aquarium", es: "Zoo o acuario" }, indoor: false, free: false },
  themepark: { group: "play", label: { en: "Theme park", es: "Parque de atracciones" }, indoor: false, free: false },
  spa: { group: "unwind", label: { en: "Spa", es: "Spa" }, indoor: true, free: false },
  winery: { group: "unwind", label: { en: "Winery", es: "Bodega" }, indoor: true, free: false },
};

export const GROUPS: Record<PlaceGroup, { label: L; blurb: L; color: string; soft: string }> = {
  eat: { label: { en: "Dinner & drinks", es: "Cena y copas" }, blurb: { en: "Tables for two", es: "Mesas para dos" }, color: "#B23A5E", soft: "#F9DCE4" },
  sweet: { label: { en: "Coffee & sweet", es: "Café y dulce" }, blurb: { en: "Slow afternoons", es: "Tardes sin prisa" }, color: "#B9772E", soft: "#F8E6CF" },
  outdoors: { label: { en: "Views & outdoors", es: "Vistas y aire libre" }, blurb: { en: "Sunsets, parks, water", es: "Atardeceres, parques, agua" }, color: "#3F7D5C", soft: "#DCEBDF" },
  culture: { label: { en: "Art & culture", es: "Arte y cultura" }, blurb: { en: "Something to talk about after", es: "Algo de lo que hablar después" }, color: "#5B4FB0", soft: "#E4E0F6" },
  play: { label: { en: "Play", es: "Jugar" }, blurb: { en: "Loser buys dessert", es: "Quien pierda invita al postre" }, color: "#2F7FA8", soft: "#D8EAF3" },
  unwind: { label: { en: "Unwind", es: "Relajarse" }, blurb: { en: "Do nothing, together", es: "No hacer nada, juntos" }, color: "#8A5A83", soft: "#EFDFEC" },
};

export const GROUP_IDS = Object.keys(GROUPS) as PlaceGroup[];
export const KIND_IDS = Object.keys(KINDS) as PlaceKind[];
export const kindsIn = (group: PlaceGroup): PlaceKind[] => KIND_IDS.filter((k) => KINDS[k].group === group);

type Tags = Record<string, string | undefined>;

/**
 * Which kind a set of OpenStreetMap tags is, or null for anything a date would not be planned
 * round. Order matters: a sports centre is only interesting here if it is a climbing wall.
 */
export function kindOf(tags: Tags): PlaceKind | null {
  const { amenity, tourism, leisure, shop, natural, craft, sport } = tags;
  if (amenity === "restaurant") return "restaurant";
  if (amenity === "bar" || amenity === "pub" || amenity === "biergarten") return "bar";
  if (amenity === "cafe") return "cafe";
  if (amenity === "ice_cream" || shop === "pastry" || shop === "confectionery" || shop === "chocolate" || shop === "bakery") return "dessert";
  if (tourism === "viewpoint") return "viewpoint";
  if (leisure === "park") return "park";
  if (leisure === "garden") return tags.access === "private" ? null : "garden";
  if (natural === "beach") return "beach";
  if (tourism === "picnic_site") return "picnic";
  if (tourism === "museum") return "museum";
  if (tourism === "gallery" || amenity === "arts_centre") return "gallery";
  if (amenity === "cinema") return "cinema";
  if (amenity === "theatre") return "theatre";
  if (amenity === "planetarium") return "planetarium";
  if (shop === "books") return "bookshop";
  if (tourism === "attraction") return "landmark";
  if (leisure === "bowling_alley") return "bowling";
  if (leisure === "miniature_golf") return "minigolf";
  if (leisure === "amusement_arcade") return "arcade";
  if (leisure === "escape_game") return "escape";
  if (sport === "climbing" && (leisure === "sports_centre" || leisure === "sports_hall")) return "climbing";
  if (leisure === "ice_rink") return "skating";
  if (amenity === "karaoke_box") return "karaoke";
  if (amenity === "boat_rental") return "boats";
  if (tourism === "zoo" || tourism === "aquarium") return "zoo";
  if (tourism === "theme_park") return "themepark";
  if (leisure === "spa" || leisure === "sauna" || amenity === "public_bath") return "spa";
  if (craft === "winery") return "winery";
  return null;
}

/**
 * The same question asked of a map tile, which says less: OpenMapTiles keeps a `class` and, in
 * `subclass`, the original OpenStreetMap value. Public art is filed under galleries there and
 * nightclubs under bars; neither is somewhere to take someone for a first coffee.
 */
const POI_KINDS: Record<string, PlaceKind> = {
  restaurant: "restaurant",
  bar: "bar",
  pub: "bar",
  biergarten: "bar",
  cafe: "cafe",
  ice_cream: "dessert",
  pastry: "dessert",
  confectionery: "dessert",
  chocolate: "dessert",
  bakery: "dessert",
  viewpoint: "viewpoint",
  park: "park",
  garden: "garden",
  picnic_site: "picnic",
  museum: "museum",
  gallery: "gallery",
  arts_centre: "gallery",
  cinema: "cinema",
  theatre: "theatre",
  books: "bookshop",
  attraction: "landmark",
  miniature_golf: "minigolf",
  escape_game: "escape",
  ice_rink: "skating",
  zoo: "zoo",
  aquarium: "zoo",
  theme_park: "themepark",
};

export const kindOfPoi = (subclass: unknown): PlaceKind | null => (typeof subclass === "string" ? (POI_KINDS[subclass] ?? null) : null);
