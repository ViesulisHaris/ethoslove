import { describe, expect, it } from "vitest";
import { fileTokens, nameMatch, parseGeosearch, photoAt, pickCommonsPhoto } from "@/lib/dates/photos";

const THUMB = "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Royal_Opera_House_and_ballerina.jpg/1280px-Royal_Opera_House_and_ballerina.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail";

describe("a photograph at the size it is shown", () => {
  it("asks Wikimedia for one of its own sizes, about twice the box", () => {
    expect(photoAt({ src: THUMB, width: 1024 }, 104)).toBe(THUMB.replace("/1280px-", "/250px-"));
    expect(photoAt({ src: THUMB, width: 1024 }, 216)).toBe(THUMB.replace("/1280px-", "/500px-"));
    expect(photoAt({ src: THUMB, width: 1024 }, 56)).toBe(THUMB.replace("/1280px-", "/120px-"));
    // Never wider than it was given, and never a size Wikimedia refuses (it answers 400 for 240px).
    expect(photoAt({ src: THUMB, width: 1024 }, 900)).toBe(THUMB);
    expect(photoAt({ src: THUMB.replace("thumb.wikimedia.org", "upload.wikimedia.org"), width: 1024 }, 150)).toBe(THUMB.replace("thumb.wikimedia.org", "upload.wikimedia.org").replace("/1280px-", "/330px-"));
  });

  it("keeps the rest of the address, logos' .png and page prefixes included", () => {
    const svg = "https://thumb.wikimedia.org/wikipedia/en/thumb/7/77/LTMLogo2024.svg/1280px-LTMLogo2024.svg.png";
    expect(photoAt({ src: svg, width: 1024 }, 104)).toBe("https://thumb.wikimedia.org/wikipedia/en/thumb/7/77/LTMLogo2024.svg/250px-LTMLogo2024.svg.png");
    const tif = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Scan.tif/lossy-page1-1280px-Scan.tif.jpg";
    expect(photoAt({ src: tif, width: 1024 }, 104)).toBe("https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Scan.tif/lossy-page1-250px-Scan.tif.jpg");
  });

  it("thumbnails an original sent as it is only when that makes it smaller", () => {
    const original = "https://upload.wikimedia.org/wikipedia/commons/b/b1/FortuneTheatre.jpg?utm_source=en.wikipedia.org&utm_content=thumbnail_unscaled";
    expect(photoAt({ src: original, width: 420 }, 104)).toBe("https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/FortuneTheatre.jpg/250px-FortuneTheatre.jpg?utm_source=en.wikipedia.org&utm_content=thumbnail_unscaled");
    expect(photoAt({ src: original, width: 420 }, 216)).toBe(original);
    expect(photoAt({ src: "https://upload.wikimedia.org/x.jpg", width: 640 }, 104)).toBe("https://upload.wikimedia.org/x.jpg");
  });
});

describe("the right photograph, or none", () => {
  const page = (pageid: number, title: string, pageimage: string) => ({ pageid, title, fullurl: `https://en.wikipedia.org/wiki/${pageid}`, pageimage, coordinates: [{ lat: 51.51, lon: -0.12 }], thumbnail: { source: `https://upload.wikimedia.org/${pageimage}`, width: 640, height: 480 } });

  it("drops an article's logo, map or crest", () => {
    const sights = parseGeosearch({ query: { pages: [page(1, "London Transport Museum", "LTMLogo2024.svg"), page(2, "Imperial War Museum", "Imperial_War_Museums_logo.png"), page(3, "Anglo-Saxon London", "Essex_2.svg"), page(4, "Covent Garden", "Map_of_Covent_Garden.png"), page(5, "Royal Opera House", "Royal_Opera_House_and_ballerina.jpg"), page(6, "London Zoo", "Mappin_Terraces.jpg")] } });
    expect(sights.map((s) => s.pageId)).toEqual([5, 6]);
  });

  it("never gives the bakery Paul the church of St Paul", () => {
    expect(nameMatch("Paul", "St Paul's, Covent Garden")).toBe(0);
    expect(nameMatch("St Paul's Church", "Saint Paul's Church")).toBe(1);
    expect(nameMatch("Lyceum", "Lyceum Theatre")).toBe(1);
    expect(nameMatch("Nola", "Nola Rooftop Bar")).toBe(0);
    const commons = (title: string) => ({ query: { pages: [{ title, index: 1, imageinfo: [{ thumburl: "https://thumb.wikimedia.org/t.jpg", thumbwidth: 640, thumbheight: 480, width: 3000, mime: "image/jpeg" }] }] } });
    expect(pickCommonsPhoto(commons("File:St. Paul, Covent Garden - geograph.org.uk - 1234.jpg"), "Paul")).toBeNull();
    expect(pickCommonsPhoto(commons("File:Portrait of Rules owner.jpg"), "Rules")).toBeNull();
    expect(pickCommonsPhoto(commons("File:Paul bakery, Covent Garden.jpg"), "Paul")).not.toBeNull();
  });

  it("keeps a saint in the middle of a name, and a place on a saint's street", () => {
    expect(nameMatch("Church of St Mary", "St Mary's Church")).toBe(1);
    expect(nameMatch("Rue Saint-Honoré", "Rue St Honoré")).toBe(1);
    const commons = (title: string) => ({ query: { pages: [{ title, index: 1, imageinfo: [{ thumburl: "https://thumb.wikimedia.org/t.jpg", thumbwidth: 640, thumbheight: 480, width: 3000, mime: "image/jpeg" }] }] } });
    expect(pickCommonsPhoto(commons("File:Dishoom Covent Garden, St Martin's Lane.jpg"), "Dishoom Covent Garden")).not.toBeNull();
  });

  it("reads a street's St as a street, not a saint", () => {
    expect(fileTokens("File:Bar Italia, Frith St - geograph.org.uk - 99.jpg")).toEqual(["bar", "italia", "frith"]);
    expect(pickCommonsPhoto({ query: { pages: [{ title: "File:Bar Italia, Frith St.jpg", index: 1, imageinfo: [{ thumburl: "https://thumb.wikimedia.org/t.jpg", thumbwidth: 640, thumbheight: 480, width: 3000, mime: "image/jpeg" }] }] } }, "Bar Italia")).not.toBeNull();
  });
});
