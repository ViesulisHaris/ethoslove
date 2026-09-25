import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { coverCredit, COVER_MAX_BYTES, fetchCover, fileOfCover } from "@/lib/share/cover";
import { firstParams, placeShareHref, planShareHref, readSharedPlace, readShareCard, readSharePreview, SHARE_TITLE_MAX, shareCardPath, shareCover, shareTitle } from "@/lib/share/links";

const STANFORDS = "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Stanfords_-_geograph.org.uk_-_3080550.jpg/1280px-Stanfords_-_geograph.org.uk_-_3080550.jpg";
const SANTA_LUZIA = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/View_from_Miradouro_de_Santa_Luzia%2C_Lisbon%2C_20250603_2016_9045.jpg/1280px-View_from_Miradouro_de_Santa_Luzia%2C_Lisbon%2C_20250603_2016_9045.jpg";

/** Addresses that are not Wikimedia's image hosts, however much they look like them. */
const NOT_WIKIMEDIA = [
  "https://example.com/photo.jpg",
  "http://upload.wikimedia.org/wikipedia/commons/a/ab/Foo.jpg",
  "https://upload.wikimedia.org.evil.example/wikipedia/commons/a/ab/Foo.jpg",
  "https://upload.wikimedia.org@evil.example/Foo.jpg",
  "https://user:pass@upload.wikimedia.org/wikipedia/commons/a/ab/Foo.jpg",
  "https://upload.wikimedia.org:8443/wikipedia/commons/a/ab/Foo.jpg",
  "https://commons.wikimedia.org/wiki/File:Foo.jpg",
  "https://169.254.169.254/latest/meta-data/",
  "http://localhost:3000/api/secret",
  "file:///etc/passwd",
  "javascript:alert(1)",
  "//upload.wikimedia.org/wikipedia/commons/a/ab/Foo.jpg",
  `https://upload.wikimedia.org/${"a".repeat(900)}.jpg`,
];

describe("share links: building", () => {
  it("a plan keeps its # and adds the preview's cover, title and day, in that order", () => {
    const href = planShareHref("/plan", "eyJ2IjoxfQ", { cover: STANFORDS, title: "Books + dinner at 7", date: "2026-10-03" });
    expect(href).toBe(`/plan?c=${encodeURIComponent(STANFORDS)}&t=Books%20%2B%20dinner%20at%207&d=2026-10-03#p=eyJ2IjoxfQ`);
    const url = new URL(href, "https://tryethos.io");
    expect(url.hash).toBe("#p=eyJ2IjoxfQ");
    expect(readSharePreview(url.searchParams)).toEqual({ cover: STANFORDS, title: "Books + dinner at 7", date: "2026-10-03" });
  });

  it("a plan with nothing for the preview is the old link exactly", () => {
    expect(planShareHref("/plan", "abc", {})).toBe("/plan#p=abc");
    expect(planShareHref("/es/plan", "abc", { cover: null, title: "  ", date: "someday" })).toBe("/es/plan#p=abc");
  });

  it("a place is the Dates page around it, the place to open, its photograph and its name", () => {
    const href = placeShareHref("/dates", { id: "node/3080550", name: "Stanfords", lat: 51.5134123, lng: -0.1253456 }, "London", `${STANFORDS}?utm_source=commons.wikimedia.org`);
    expect(href).toBe(`/dates?lat=51.51341&lng=-0.12535&q=London&place=node%2F3080550&c=${encodeURIComponent(STANFORDS)}&t=Stanfords`);
    const params = new URL(href, "https://tryethos.io").searchParams;
    expect(readSharedPlace(params)).toBe("node/3080550");
    expect(readSharePreview(params)).toEqual({ cover: STANFORDS, title: "Stanfords", date: null });
  });

  it("a place with no town to name, no photograph and an id that is not the map's leaves those out", () => {
    expect(placeShareHref("/es/dates", { id: "made-up", name: "Miradouro", lat: 38.7117, lng: -9.1302 }, "", null)).toBe("/es/dates?lat=38.7117&lng=-9.1302&t=Miradouro");
  });

  it("titles are one clean line of at most 80 characters, with no web address in them", () => {
    const long = "A".repeat(200);
    expect(Array.from(shareTitle(long)!)).toHaveLength(SHARE_TITLE_MAX);
    expect(shareTitle(long)!.endsWith("…")).toBe(true);
    expect(shareTitle("Tea‮ksid\u0000 at\n\n  the  Ritz")).toBe("Tea ksid at the Ritz");
    expect(shareTitle("Win a prize at https://evil.example/claim now")).toBe("Win a prize at now");
    expect(shareTitle("see www.evil.example")).toBe("see");
    expect(shareTitle("💚 Café Príncipe Real")).toBe("💚 Café Príncipe Real");
    expect(shareTitle(42)).toBeNull();
  });

  it("reads the first of a repeated parameter, and only a real day", () => {
    expect(readSharePreview(firstParams({ c: [SANTA_LUZIA, "https://example.com/x.jpg"], t: ["One", "Two"], d: "2026-02-30" }))).toEqual({ cover: SANTA_LUZIA, title: "One", date: null });
    expect(readSharedPlace({ place: "way/12345" })).toBe("way/12345");
    expect(readSharedPlace({ place: "../../etc" })).toBeNull();
  });
});

describe("share links: the cover allowlist", () => {
  it("accepts Wikimedia's two image hosts and drops the tracking query", () => {
    expect(shareCover(STANFORDS)).toBe(STANFORDS);
    expect(shareCover(SANTA_LUZIA)).toBe(SANTA_LUZIA);
    expect(shareCover(`${STANFORDS}?utm_source=x#top`)).toBe(STANFORDS);
  });

  it.each(NOT_WIKIMEDIA)("refuses %s", (url) => {
    expect(shareCover(url)).toBeNull();
    expect(readSharePreview({ c: url }).cover).toBeNull();
  });

  it("a card's query is checked again when it is read back", () => {
    const path = shareCardPath({ kind: "plan", locale: "es", cover: SANTA_LUZIA, title: "Atardecer", date: "2026-10-03" });
    expect(path.startsWith("/og/share.jpg?k=plan&l=es&c=")).toBe(true);
    expect(readShareCard(new URL(path, "https://tryethos.io").searchParams)).toEqual({ kind: "plan", locale: "es", cover: SANTA_LUZIA, title: "Atardecer", date: "2026-10-03" });
    expect(readShareCard(new URLSearchParams({ k: "place", c: "https://example.com/x.jpg", t: "X", d: "2026-10-03" }))).toEqual({ kind: "place", locale: "en", cover: null, title: "X", date: null });
    expect(shareCardPath({ kind: "trip", locale: "en", trip: "lisbon-slow-weekend" })).toBe("/og/share.jpg?k=trip&l=en&trip=lisbon-slow-weekend&v=1");
  });
});

const imageResponse = (bytes: number, type = "image/jpeg", length: string | null = String(bytes)) =>
  new Response(new Uint8Array(bytes), { status: 200, headers: { "content-type": type, ...(length === null ? {} : { "content-length": length }) } });

describe("fetching a cover on the server", () => {
  it.each(NOT_WIKIMEDIA)("never fetches %s", async (url) => {
    const fetcher = vi.fn<typeof fetch>();
    expect(await fetchCover(url, fetcher)).toBeNull();
    expect(await coverCredit(url, fetcher)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fetches a Wikimedia photograph with no redirects allowed and a deadline", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(imageResponse(2048));
    const photo = await fetchCover(STANFORDS, fetcher);
    expect(photo?.byteLength).toBe(2048);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe(STANFORDS);
    expect(init?.redirect).toBe("error");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("refuses what is not an image, what says it is too big, and what turns out to be", async () => {
    expect(await fetchCover(STANFORDS, vi.fn<typeof fetch>().mockResolvedValue(imageResponse(100, "text/html")))).toBeNull();
    expect(await fetchCover(STANFORDS, vi.fn<typeof fetch>().mockResolvedValue(imageResponse(10, "image/jpeg", String(COVER_MAX_BYTES + 1))))).toBeNull();
    expect(await fetchCover(STANFORDS, vi.fn<typeof fetch>().mockResolvedValue(imageResponse(COVER_MAX_BYTES + 1, "image/jpeg", null)))).toBeNull();
    expect(await fetchCover(STANFORDS, vi.fn<typeof fetch>().mockResolvedValue(new Response("gone", { status: 404 })))).toBeNull();
    expect(await fetchCover(STANFORDS, vi.fn<typeof fetch>().mockRejectedValue(new TypeError("redirect")))).toBeNull();
  });

  it("asks the wiki the file lives on who took it", async () => {
    expect(fileOfCover(SANTA_LUZIA)).toEqual({ api: "https://commons.wikimedia.org/w/api.php", file: "View_from_Miradouro_de_Santa_Luzia,_Lisbon,_20250603_2016_9045.jpg" });
    expect(fileOfCover("https://upload.wikimedia.org/wikipedia/en/a/ab/Local_file.jpg")).toEqual({ api: "https://en.wikipedia.org/w/api.php", file: "Local_file.jpg" });
    expect(fileOfCover("https://upload.wikimedia.org/wikipedia/fr/a/ab/Autre.jpg")).toBeNull();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ query: { pages: [{ title: "File:Stanfords - geograph.org.uk - 3080550.jpg", imageinfo: [{ extmetadata: { Artist: { value: '<a href="//x">Colin Smith</a>' }, LicenseShortName: { value: "CC BY-SA 2.0" } } }] }] } }),
    );
    expect(await coverCredit(STANFORDS, fetcher)).toEqual({ credit: "Colin Smith", licence: "CC BY-SA 2.0" });
    expect(String(fetcher.mock.calls[0][0])).toMatch(/^https:\/\/commons\.wikimedia\.org\/w\/api\.php\?/);
  });
});
