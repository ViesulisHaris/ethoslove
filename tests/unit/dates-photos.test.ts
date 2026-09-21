import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HERO_ART, ideaImage, KIND_ART } from "@/lib/dates/art";
import { IDEAS } from "@/lib/dates/ideas";
import { KIND_IDS, KINDS } from "@/lib/dates/kinds";
import { commonsSearchUrl, fileTokens, geosearchUrl, imageInfoUrl, isDateWorthy, isQid, isWikimedia, matchPhotos, nameMatch, nameTokens, parseCommonsFile, parseGeosearch, parseImageInfo, parseWikidataImage, pickCommonsPhoto, type Sight } from "@/lib/dates/photos";
import type { Place } from "@/lib/dates/places";

const onDisk = (path: string) => existsSync(new URL(`../../public${path}`, import.meta.url));

describe("the pictures that ship with the site", () => {
  it("has one for every idea, every kind of place and every hero", () => {
    for (const idea of IDEAS) expect(onDisk(ideaImage(idea.id)), idea.id).toBe(true);
    for (const kind of KIND_IDS) expect(onDisk(KIND_ART[kind]), kind).toBe(true);
    for (const path of Object.values(HERO_ART)) expect(onDisk(path), path).toBe(true);
  });
});

const place = (over: Partial<Place> & Pick<Place, "id" | "kind" | "name">): Place => ({ named: true, group: KINDS[over.kind].group, lat: 51.5119, lng: -0.1257, distanceKm: 0.1, cuisine: [], outdoorSeating: false, vegetarian: false, stepFree: false, notable: false, score: 50, ...over });
const sight = (over: Partial<Sight> & Pick<Sight, "pageId" | "title">): Sight => ({ lat: 51.5119, lng: -0.1257, articleUrl: "https://en.wikipedia.org/wiki/X", photo: { src: "https://upload.wikimedia.org/x.jpg", width: 640, height: 480 }, ...over });

describe("photographs from Wikipedia", () => {
  it("only ever trusts Wikimedia's own image hosts", () => {
    expect(isWikimedia("https://upload.wikimedia.org/wikipedia/commons/a.jpg")).toBe(true);
    expect(isWikimedia("https://thumb.wikimedia.org/wikipedia/commons/a.jpg")).toBe(true);
    expect(isWikimedia("https://upload.wikimedia.org.evil.example/a.jpg")).toBe(false);
    expect(isWikimedia("http://upload.wikimedia.org/a.jpg")).toBe(false);
    expect(isWikimedia("javascript:alert(1)")).toBe(false);
    expect(isWikimedia(undefined)).toBe(false);
  });

  it("reads a geosearch answer and drops what has no picture, no place or no safe address", () => {
    const sights = parseGeosearch({
      query: {
        pages: [
          { pageid: 1, title: "Fortune Theatre", fullurl: "https://en.wikipedia.org/wiki/Fortune_Theatre", description: "West End theatre in London", pageimage: "Fortune_Theatre.jpg", coordinates: [{ lat: 51.513, lon: -0.121 }], thumbnail: { source: "https://upload.wikimedia.org/f.jpg", width: 640, height: 427 } },
          { pageid: 2, title: "No picture", fullurl: "https://en.wikipedia.org/wiki/N", coordinates: [{ lat: 1, lon: 1 }] },
          { pageid: 3, title: "No coordinates", fullurl: "https://en.wikipedia.org/wiki/N", thumbnail: { source: "https://upload.wikimedia.org/n.jpg" } },
          { pageid: 4, title: "Hotlinked elsewhere", fullurl: "https://en.wikipedia.org/wiki/H", coordinates: [{ lat: 1, lon: 1 }], thumbnail: { source: "https://example.com/h.jpg" } },
          { pageid: 5, title: "Odd link", fullurl: "javascript:void(0)", coordinates: [{ lat: 1, lon: 1 }], thumbnail: { source: "https://upload.wikimedia.org/o.jpg" } },
        ],
      },
    });
    expect(sights).toHaveLength(1);
    expect(sights[0]).toMatchObject({ pageId: 1, title: "Fortune Theatre", lat: 51.513, lng: -0.121, file: "Fortune_Theatre.jpg", description: "West End theatre in London" });
    expect(parseGeosearch(null)).toEqual([]);
    expect(parseGeosearch({ query: { pages: "no" } })).toEqual([]);
  });

  it("keeps the author and the licence with the picture, as plain text", () => {
    const credits = parseImageInfo({ query: { pages: [{ title: "File:Fortune Theatre.jpg", imageinfo: [{ descriptionurl: "https://commons.wikimedia.org/wiki/File:Fortune_Theatre.jpg", extmetadata: { Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Foo">Foo &amp; Bar</a>' }, LicenseShortName: { value: "CC BY-SA 3.0" } } }] }] } });
    expect(credits.get("Fortune Theatre.jpg")).toEqual({ credit: "Foo & Bar", licence: "CC BY-SA 3.0", fileUrl: "https://commons.wikimedia.org/wiki/File:Fortune_Theatre.jpg" });
    expect(parseImageInfo(undefined).size).toBe(0);
  });

  it("leaves out stations, embassies and streets: they have pictures and are nowhere to take anybody", () => {
    expect(isDateWorthy(sight({ pageId: 1, title: "Covent Garden tube station" }))).toBe(false);
    expect(isDateWorthy(sight({ pageId: 2, title: "Bow Street", description: "street in London" }))).toBe(false);
    expect(isDateWorthy(sight({ pageId: 3, title: "Embajada de Francia" }))).toBe(false);
    expect(isDateWorthy(sight({ pageId: 4, title: "Royal Opera House", description: "opera house in London" }))).toBe(true);
  });

  it("compares names as bags of words, accents and articles aside", () => {
    expect(nameTokens("Café A Brasileira (Lisboa)")).toEqual(["cafe", "brasileira"]);
    expect(nameTokens("Lyceum Theatre, London")).toEqual(["lyceum", "theatre"]);
    expect(nameMatch("The Lamb & Flag", "Lamb and Flag, Covent Garden")).toBe(1);
    expect(nameMatch("Museu do Chiado", "Museo del Chiado")).toBe(0.5);
    expect(nameMatch("Bar", "The Bar")).toBe(0); // no real word to go on
    expect(nameMatch("", "x")).toBe(0);
  });

  it("gives a photograph to the place it is of, and to nothing that merely stands next door", () => {
    const opera = place({ id: "way/1", kind: "theatre", name: "Royal Opera House" });
    const pub = place({ id: "node/2", kind: "bar", name: "The Nag's Head" });
    const farTwin = place({ id: "node/3", kind: "theatre", name: "Royal Opera House", lat: 51.6 });
    const nameless = place({ id: "node/4", kind: "viewpoint", name: "Viewpoint", named: false });
    const park = place({ id: "way/5", kind: "park", name: "Hyde Park", lat: 51.5119 + 0.005 });
    const { byPlace, unmatched } = matchPhotos([opera, pub, farTwin, nameless, park], [sight({ pageId: 10, title: "Royal Opera House" }), sight({ pageId: 11, title: "Bow Street Magistrates' Court" }), sight({ pageId: 12, title: "Hyde Park, London" }), sight({ pageId: 13, title: "Viewpoint" })]);
    expect(byPlace.get("way/1")?.pageId).toBe(10);
    expect(byPlace.has("node/2")).toBe(false);
    expect(byPlace.has("node/3")).toBe(false);
    expect(byPlace.has("node/4")).toBe(false);
    // A park's article points at its middle: it is allowed to be further from the gate.
    expect(byPlace.get("way/5")?.pageId).toBe(12);
    expect(unmatched.map((s) => s.pageId)).toEqual([11, 13]);
  });
});

describe("a photograph of one place, from Wikimedia Commons", () => {
  const page = (title: string, index: number, over: Record<string, unknown> = {}) => ({ title, index, imageinfo: [{ thumburl: "https://thumb.wikimedia.org/t.jpg", thumbwidth: 640, thumbheight: 427, width: 3000, mime: "image/jpeg", descriptionurl: "https://commons.wikimedia.org/wiki/File:T.jpg", extmetadata: { Artist: { value: "<b>Matt Brown</b>" }, LicenseShortName: { value: "CC BY 2.0" } }, ...over }] });

  it("reads a file name as words, without its serial numbers", () => {
    expect(fileTokens("File:The Lamb and Flag, Covent Garden - geograph.org.uk - 351158.jpg")).toEqual(["lamb", "flag", "covent", "garden"]);
    expect(fileTokens("File:A Brasileira (5847933427).jpg")).toEqual(["brasileira"]);
  });

  it("takes the first photograph named after the place, in Commons' own order", () => {
    const json = { query: { pages: [page("File:Monmouth Coffee interior.jpg", 2), page("File:Seven Dials at night.jpg", 1), page("File:Monmouth Coffee, Covent Garden.jpg", 3)] } };
    expect(pickCommonsPhoto(json, "Monmouth Coffee")).toEqual({ src: "https://thumb.wikimedia.org/t.jpg", width: 640, height: 427, credit: "Matt Brown", licence: "CC BY 2.0", fileUrl: "https://commons.wikimedia.org/wiki/File:T.jpg" });
  });

  it("would rather show nothing than the wrong thing", () => {
    expect(pickCommonsPhoto({ query: { pages: [page("File:Monmouth Street.jpg", 1)] } }, "Monmouth Coffee")).toBeNull();
    expect(pickCommonsPhoto({ query: { pages: [page("File:Rules restaurant menu.jpg", 1), page("File:Map of Rules.jpg", 2)] } }, "Rules")).toBeNull();
    expect(pickCommonsPhoto({ query: { pages: [page("File:Rules.svg", 1, { mime: "image/svg+xml" })] } }, "Rules")).toBeNull();
    expect(pickCommonsPhoto({ query: { pages: [page("File:Rules.jpg", 1, { width: 200 })] } }, "Rules")).toBeNull();
    expect(pickCommonsPhoto({ query: { pages: [page("File:Rules.jpg", 1, { thumburl: "https://example.com/r.jpg" })] } }, "Rules")).toBeNull();
    expect(pickCommonsPhoto({ query: { pages: [page("File:Rules tall.jpg", 1, { thumbwidth: 300, thumbheight: 900 })] } }, "Rules")).toBeNull();
    // "Bar" is not a name anybody can be found by.
    expect(pickCommonsPhoto({ query: { pages: [page("File:Bar.jpg", 1)] } }, "Bar")).toBeNull();
    expect(pickCommonsPhoto(null, "Rules")).toBeNull();
  });

  it("finds the picture a Wikidata item names", () => {
    expect(parseWikidataImage({ claims: { P18: [{ mainsnak: { datavalue: { value: "JardimSPedroAlcantara.JPG" } } }] } })).toBe("JardimSPedroAlcantara.JPG");
    expect(parseWikidataImage({ claims: {} })).toBeNull();
    expect(parseCommonsFile({ query: { pages: [page("File:JardimSPedroAlcantara.JPG", 1)] } })).toMatchObject({ credit: "Matt Brown" });
    expect(isQid("Q6672039")).toBe(true);
    expect(isQid("Q0")).toBe(false);
    expect(isQid("Q12&action=edit")).toBe(false);
  });

  it("builds requests that cannot be steered by a place's name", () => {
    const url = commonsSearchUrl('Rules" OR insource:secret', { lat: 51.5107, lng: -0.1233 });
    expect(url).toContain("nearcoord%3A250m%2C51.5107%2C-0.1233");
    expect(decodeURIComponent(url)).not.toContain('"');
    expect(decodeURIComponent(url)).not.toContain("insource:");
    expect(geosearchUrl("es", { lat: 40.4, lng: -3.7 }, 99_999)).toContain("es.wikipedia.org");
    expect(geosearchUrl("es", { lat: 40.4, lng: -3.7 }, 99_999)).toContain("ggsradius=10000");
    expect(geosearchUrl("en", { lat: 40.4, lng: -3.7 }, 1900)).toContain("pilicense=free");
    expect(imageInfoUrl("en", ["A b.jpg", "C.jpg"])).toContain("titles=File%3AA%20b.jpg%7CFile%3AC.jpg");
  });
});
