import { describe, expect, it } from "vitest";
import { detailsFromTags, parseNominatim } from "@/lib/dates/details";
import type { PlaceKind } from "@/lib/dates/kinds";
import { parseOverpass, type Place } from "@/lib/dates/places";
import { mergePlaces, placesFromPois, type PoiFeature } from "@/lib/dates/tiles";
import { foldName, isListeningClub, MIN_UNUSUAL, QUIRK_IDS, QUIRKS, quirkOfName, quirkOfTags, UNUSUAL_SHELF, unusualIndex, unusualOf, unusualPicks, type Quirk, type Unusual } from "@/lib/dates/unusual";

const quirk = (name: string, kind: PlaceKind) => quirkOfName(name, kind)?.quirk ?? null;

describe("reading a name", () => {
  it("folds case, accents and punctuation into whole words", () => {
    expect(foldName("El Sótano!").plain).toBe(" el sotano ");
    expect(foldName("Café des Chats").plain).toBe(" cafe des chats ");
    expect(foldName("Zeiss-Großplanetarium").tokens).toEqual(["zeiss", "grossplanetarium"]);
    expect(foldName("L'Île flottante").plain).toBe(" l ile flottante ");
    // The accented copy keeps what the plain one drops.
    expect(foldName("Péniche Marcounet").marked).toBe(" péniche marcounet ");
  });

  it.each<[string, PlaceKind, Quirk]>([
    // Underground, in the languages of the cities searched.
    ["Cellar Door", "bar", "underground"],
    ["Cafe in the Crypt", "cafe", "underground"],
    ["Caveau des Oubliettes", "bar", "underground"],
    ["Les Caves du Louvre", "bar", "underground"],
    ["El Sótano", "bar", "underground"],
    ["La Cueva del Jazz", "bar", "underground"],
    ["Bar Steinkeller", "bar", "underground"],
    ["Ratskeller", "restaurant", "underground"],
    ["Bistro De Carrékelder", "restaurant", "underground"],
    ["Piwnica pod Baranami", "bar", "underground"],
    ["TATI goes underground", "bar", "underground"],
    // Hidden.
    ["Red Frog Speakeasy", "bar", "speakeasy"],
    ["Mobster Bar - the speakeasy", "bar", "speakeasy"],
    ["La Prohibition", "bar", "speakeasy"],
    ["Bar Escondido", "bar", "speakeasy"],
    ["Geheim van de Smidt", "bar", "speakeasy"],
    // On a roof, or up high.
    ["Radio Rooftop Bar", "bar", "rooftop"],
    ["Queen Elizabeth Roof Garden & Bar", "bar", "rooftop"],
    ["Skybar Seen by Olivier", "bar", "rooftop"],
    ["Le Perchoir Marais", "bar", "rooftop"],
    ["Amano Dachterrasse", "bar", "rooftop"],
    ["La Azotea", "bar", "rooftop"],
    ["Dachterrasse Humboldt Forum", "viewpoint", "rooftop"],
    ["Energetica - Rooftop NEMO Science Center", "viewpoint", "rooftop"],
    ["One World Observatory", "viewpoint", "high"],
    // Music.
    ["Jazz Dock", "restaurant", "music"],
    ["Reduta Jazz Club", "bar", "music"],
    ["Bluescafé Maloe Melo", "bar", "music"],
    ["The Piano Bar Soho", "bar", "music"],
    ["Tasca do Jaime de Alfama (Casa de Fado)", "restaurant", "music"],
    ["La French Guinguette", "bar", "music"],
    ["Tablao Flamenco Cardamomo", "restaurant", "music"],
    // Everything else.
    ["Tikiboom", "bar", "tiki"],
    ["Péniche Marcounet", "restaurant", "water"],
    ["Houseboat Museum", "museum", "water"],
    ["Stromma Open Boat Tours", "landmark", "water"],
    ["Zeiss-Großplanetarium", "museum", "stars"],
    ["Hayden Planetarium", "museum", "stars"],
    ["Meeples & Coffee Board Game Cafe", "cafe", "games"],
    ["Flight Club", "bar", "games"],
    ["Karaoke Box Bart Paris 3", "bar", "karaoke"],
    ["Le Café des Chats", "cafe", "cats"],
    ["Katzentempel Berlin Mitte", "restaurant", "cats"],
    ["Castelo de São Jorge", "landmark", "castle"],
    ["Berliner Schloss", "landmark", "castle"],
    ["Estufa Fria", "garden", "glasshouse"],
    ["Palmenhaus", "garden", "glasshouse"],
    ["Freiluftkino Kreuzberg", "cinema", "openair"],
    ["Victoria Embankment Open Air Theatre", "theatre", "openair"],
    ["Széchenyi Gyógyfürdő", "spa", "baths"],
    ["Friedrichsbad Therme", "spa", "baths"],
  ])("%s (%s) is %s", (name, kind, expected) => {
    expect(quirk(name, kind)).toBe(expected);
  });

  it.each<[string, PlaceKind]>([
    // English pub names are a genre of their own.
    ["The Castle", "bar"],
    ["The Sir John Oldcastle", "bar"],
    ["Albert's Schloss - London", "bar"],
    ["The Ship", "bar"],
    ["The Windmill", "bar"],
    ["Glasshouse Stores", "bar"],
    ["Tin Roof", "bar"],
    // A terrace on the pavement, a view that is a word.
    ["Terrace Café", "cafe"],
    ["La Terrazza", "restaurant"],
    ["Terrazza a terra", "restaurant"],
    ["Terraço do Chiado", "restaurant"],
    ["La Terraza", "bar"],
    // "Cave", "bodega" and "cantina" are a wine shop, a corner shop and a canteen as often as a cellar.
    ["La Cave de Martin", "bar"],
    ["The Cave", "bar"],
    ["Bodega Negra", "restaurant"],
    ["Cantina Mexicana", "restaurant"],
    ["Adega Machado", "restaurant"],
    // "Sky" inside other words, and a bakery called Sky.
    ["Skylon", "restaurant"],
    ["Happy Sky Japanese Bakery", "dessert"],
    ["Skyscraper Museum", "museum"],
    // Chains and namesakes.
    ["Mikkeller Craft Beer Bar", "bar"],
    ["Ping Pong", "restaurant"],
    ["Jeux Jeux Okonomiyaki", "restaurant"],
    ["Secret Garden LX", "cafe"],
    ["Les secrets du Maghreb", "restaurant"],
    ["Blues & Royals", "cafe"],
    ["Hill Street Blues", "bar"],
    ["Le Piano Vache", "bar"],
    ["Steakhouse Tango", "restaurant"],
    ["Chanson le Salon", "cafe"],
    ["Pastel do Fado", "restaurant"],
    ["Safado", "bar"],
    ["Le Chat Noir", "cafe"],
    ["Il Gatto Nero", "restaurant"],
    ["L'Île flottante", "cafe"],
    ["Peniche", "restaurant"],
    ["Jardim Camilo Castelo Branco", "park"],
    ["Charles Bridge and Castle Viewpoint", "viewpoint"],
    ["Gnomon astronomique", "landmark"],
    ["Terme di Diocleziano", "landmark"],
    ["Caffè delle Terme", "cafe"],
    ["De Friedesche Molen", "bookshop"],
    ["Café des Phares", "cafe"],
    ["Il Faro", "restaurant"],
    ["Farol de Santa Luzia", "restaurant"],
    ["Au Moulin à Vent", "restaurant"],
    ["Planetariumcafé", "cafe"],
    ["Kabarett-Theater Distel", "theatre"],
    ["Rondvaart", "cafe"],
    // Never on a date page's shelf, whatever else the name says.
    ["Nemo Cabaret Club", "bar"],
    ["Secret Strip Club", "bar"],
    ["Red Light Secrets", "museum"],
    ["Dungeon Bar", "bar"],
  ])("%s (%s) is nothing special", (name, kind) => {
    expect(quirk(name, kind)).toBeNull();
  });

  it("has a label in both languages for every quirk", () => {
    for (const id of QUIRK_IDS) {
      expect(QUIRKS[id].label.en.length).toBeGreaterThan(2);
      expect(QUIRKS[id].label.es.length).toBeGreaterThan(2);
    }
  });
});

describe("reading the tags", () => {
  it("knows a cellar, a roof and a boat when the map says so", () => {
    expect(quirkOfTags({ amenity: "bar", name: "Frank's", location: "roof" }, "bar")).toBe("rooftop");
    expect(quirkOfTags({ amenity: "restaurant", location: "rooftop" }, "restaurant")).toBe("rooftop");
    expect(quirkOfTags({ amenity: "bar", location: "underground" }, "bar")).toBe("underground");
    expect(quirkOfTags({ amenity: "pub", level: "-1" }, "bar")).toBe("underground");
    expect(quirkOfTags({ amenity: "bar", floating: "yes" }, "bar")).toBe("water");
    expect(quirkOfTags({ tourism: "attraction", man_made: "lighthouse" }, "landmark")).toBe("lighthouse");
    expect(quirkOfTags({ tourism: "attraction", historic: "castle" }, "landmark")).toBe("castle");
  });

  it("leaves out what only looks like one", () => {
    // A restaurant on level -1 is as often in a shopping centre's food court.
    expect(quirkOfTags({ amenity: "restaurant", level: "-1" }, "restaurant")).toBeNull();
    // A chain's rooftop is a chain.
    expect(quirkOfTags({ amenity: "bar", location: "roof", brand: "Hard Rock Cafe" }, "bar")).toBeNull();
    // A palace is filed as a castle; an observation deck is not a telescope.
    expect(quirkOfTags({ tourism: "attraction", historic: "castle", castle_type: "palace" }, "landmark")).toBeNull();
    expect(quirkOfTags({ tourism: "viewpoint", man_made: "observatory" }, "viewpoint")).toBeNull();
    expect(quirkOfTags({ amenity: "bar" }, "bar")).toBeNull();
  });

  it("reaches the places read from Overpass and the details of one place", () => {
    const json = { elements: [{ type: "node", id: 1, lat: 51.5, lon: -0.12, tags: { amenity: "bar", name: "Frank's", location: "roof" } }, { type: "node", id: 2, lat: 51.5, lon: -0.12, tags: { amenity: "karaoke_box", name: "Lucky Voice" } }] };
    const places = parseOverpass(json, { lat: 51.5, lng: -0.12 }, 8000, () => "");
    expect(places.find((p) => p.id === "node/1")?.quirk).toBe("rooftop");
    expect(places.find((p) => p.id === "node/2")?.quirk).toBeUndefined();
    expect(detailsFromTags("node/1", { amenity: "bar", name: "Frank's", location: "roof" }).quirk).toBe("rooftop");
    expect(detailsFromTags("node/3", { amenity: "cafe", name: "Corner" }).quirk).toBeUndefined();
    // Nominatim keeps what the place is apart from its other tags.
    const nominatim = [{ osm_type: "node", osm_id: 9, category: "amenity", type: "bar", name: "Cellar", extratags: { location: "underground" }, address: {} }];
    expect(parseNominatim(nominatim, "node/9")?.quirk).toBe("underground");
  });
});

const place = (id: string, name: string, kind: PlaceKind, extra: Partial<Place> = {}): Place => ({ id, name, named: true, kind, group: "eat", lat: 51.5, lng: -0.12, distanceKm: 0.5, cuisine: [], outdoorSeating: false, vegetarian: false, stepFree: false, notable: false, score: 50, ...extra });

describe("judging a place", () => {
  it("trusts the tags, then the name, then the kind", () => {
    expect(unusualOf(place("n/1", "Frank's", "bar", { quirk: "rooftop" }))).toEqual({ quirk: "rooftop", strength: 3 });
    expect(unusualOf(place("n/2", "Cellar Door", "bar"))).toEqual({ quirk: "underground", strength: 3 });
    expect(unusualOf(place("n/3", "Lucky Voice", "karaoke"))).toEqual({ quirk: "karaoke", strength: 1 });
    // A planetarium or a karaoke box saying so in its name is still only as strong as its kind.
    expect(unusualOf(place("n/7", "Le Planétarium", "planetarium"))).toEqual({ quirk: "stars", strength: 1 });
    expect(unusualOf(place("n/8", "Sing Sing Karaoke", "karaoke"))).toEqual({ quirk: "karaoke", strength: 1 });
    // A karaoke night in a bar is the bar's story.
    expect(unusualOf(place("n/9", "Karaoke Box Bart", "bar"))).toEqual({ quirk: "karaoke", strength: 3 });
    // Thermal baths come from eight kilometres round: after the neighbourhood's cellars and roofs.
    expect(unusualOf(place("n/10", "Aire Ancient Baths", "spa"))).toEqual({ quirk: "baths", strength: 2 });
    expect(unusualOf(place("n/4", "Planetarium", "planetarium", { named: false }))).toBeNull();
    expect(unusualOf(place("n/5", "The Crown", "bar"))).toBeNull();
    // Nothing gets past the names a date page never shows, not even a tag.
    expect(unusualOf(place("n/6", "Sexy Rooftop", "bar", { quirk: "rooftop" }))).toBeNull();
  });

  it("indexes a set by id", () => {
    const index = unusualIndex([place("a", "Cellar Door", "bar"), place("b", "The Crown", "bar"), place("c", "Some Bowling", "bowling")]);
    expect([...index.keys()]).toEqual(["a", "c"]);
  });

  it("keeps jazz clubs the map files as nightclubs, and no other nightclub", () => {
    expect(isListeningClub("Ronnie Scott's Jazz Club")).toBe(true);
    expect(isListeningClub("Caveau de la Huchette")).toBe(true);
    expect(isListeningClub("Smalls Jazz Club")).toBe(true);
    expect(isListeningClub("Berghain")).toBe(false);
    expect(isListeningClub("Les Caves")).toBe(false);
    expect(isListeningClub("EXCLUSIVE Cabaret Club")).toBe(false);
    const feature = (id: number, name: string, subclass: string): PoiFeature => ({ id: id * 10 + 1, px: 2048, py: 2048, extent: 4096, properties: { name, subclass } });
    const tile = { x: 8185, y: 5448 };
    const found = placesFromPois([feature(1, "Ronnie Scott's Jazz Club", "nightclub"), feature(2, "Fabric", "nightclub"), feature(3, "Cellar Door", "bar")], tile, { lat: 51.5136, lng: -0.1318 }, 5000, "en");
    expect(found.map((p) => [p.name, p.kind])).toEqual([
      ["Ronnie Scott's Jazz Club", "bar"],
      ["Cellar Door", "bar"],
    ]);
  });

  it("keeps what the rare finds' tags said when the tile had the same place", () => {
    const fromTile = place("node/1", "Frank's", "bar", { score: 60 });
    const fromOverpass = place("node/1", "Frank's", "bar", { score: 40, quirk: "rooftop" });
    expect(mergePlaces([fromTile], [fromOverpass])[0]).toMatchObject({ id: "node/1", quirk: "rooftop", score: 60 });
    expect(mergePlaces([fromOverpass], [fromTile])[0].quirk).toBe("rooftop");
  });
});

describe("the shelf", () => {
  // A street of places, 300 m apart unless placed on purpose; rank is their order here.
  const at = (i: number) => ({ lat: 51.5, lng: -0.12 + i * 0.005 });
  const ranked = (list: [string, PlaceKind, Partial<Place>?][]) => list.map(([name, kind, extra], i) => ({ ...place(`n/${i}`, name, kind, { ...at(i), ...extra }), rank: i + 1 }));
  const names = (picks: { name: string }[]) => picks.map((p) => p.name);

  it("leads with a different quirk each time, strong ones before the kinds", () => {
    const list = ranked([
      ["Lucky Voice", "karaoke"],
      ["Rooftop One", "bar"],
      ["Rooftop Two", "bar"],
      ["Rooftop Three", "bar"],
      ["Rooftop Four", "bar"],
      ["Jazz Room", "bar"],
      ["Cellar Bar", "bar"],
      ["Strike", "bowling"],
    ]);
    const picks = unusualPicks(list, unusualIndex(list));
    expect(names(picks)).toEqual(["Rooftop One", "Jazz Room", "Cellar Bar", "Rooftop Two", "Rooftop Three", "Lucky Voice", "Strike"]);
  });

  it("never shows one place twice, mapped twice or under two names", () => {
    const list = ranked([
      ["Red Frog Speakeasy", "bar"],
      ["Red Frog - Speakeasy Bar", "bar", { lat: 51.5011, lng: -0.1201 }],
      ["Castelo de São Jorge", "landmark"],
      ["Jardim do Castelo de São Jorge", "garden", { lat: 51.5005, lng: -0.1095 }],
      ["Cellar Door", "bar"],
    ]);
    expect(names(unusualPicks(list, unusualIndex(list)))).toEqual(["Red Frog Speakeasy", "Castelo de São Jorge", "Cellar Door"]);
  });

  it("puts the top picks' places last, and keeps a shelf already shown as it is", () => {
    const list = ranked([
      ["Rooftop One", "bar"],
      ["Rooftop Two", "bar"],
      ["Jazz Room", "bar"],
    ]);
    const index = unusualIndex(list);
    expect(names(unusualPicks(list, index, UNUSUAL_SHELF, new Set(["n/0"])))).toEqual(["Rooftop Two", "Jazz Room", "Rooftop One"]);
    // A shelf on the screen stays first; what arrives later fits round it.
    const later = ranked([["Cellar Bar", "bar"], ["Rooftop One", "bar"], ["Rooftop Two", "bar"], ["Jazz Room", "bar"], ["Rooftop Three", "bar"], ["Rooftop Four", "bar"]]);
    const shown = [later[3], later[1]];
    expect(names(unusualPicks(later, unusualIndex(later), UNUSUAL_SHELF, undefined, shown))).toEqual(["Jazz Room", "Rooftop One", "Cellar Bar", "Rooftop Two", "Rooftop Three"]);
  });

  it("holds no more than it should, and nothing nameless", () => {
    const many = ranked([...Array.from({ length: 30 }, (_, i): [string, PlaceKind, Partial<Place>?] => [`Jazz ${i}`, "bar"]), ["Strike", "bowling", { named: false }]]);
    const index = unusualIndex(many);
    expect(unusualPicks(many, index).length).toBe(3);
    expect(MIN_UNUSUAL).toBe(3);
    const found = new Map<string, Unusual>(many.map((p) => [p.id, { quirk: QUIRK_IDS[Number(p.id.slice(2)) % QUIRK_IDS.length], strength: 3 }]));
    expect(unusualPicks(many, found).length).toBe(UNUSUAL_SHELF);
  });
});
