import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * What a chat app sees when a link is pasted into it: the page's preview tags, fetched as its
 * crawler fetches them, and the picture they point at (docs/SHARING.md).
 */
const PHOTO = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Stanfords_-_geograph.org.uk_-_3080550.jpg/1280px-Stanfords_-_geograph.org.uk_-_3080550.jpg";
const CRAWLER = { "user-agent": "WhatsApp/2.23.20.0 A" };

async function tags(request: APIRequestContext, path: string) {
  const res = await request.get(path, { headers: CRAWLER });
  expect(res.status()).toBe(200);
  const html = await res.text();
  const head = html.slice(0, html.indexOf("</head>"));
  const read = (attr: "property" | "name", key: string) => head.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1]?.replace(/&amp;/g, "&") ?? null;
  return { image: read("property", "og:image"), title: read("property", "og:title"), url: read("property", "og:url"), twitterImage: read("name", "twitter:image"), twitterCard: read("name", "twitter:card") };
}

/** The picture itself, fetched from this server whatever origin the tags were written for. */
async function card(request: APIRequestContext, image: string) {
  const url = new URL(image);
  const res = await request.get(url.pathname + url.search, { headers: CRAWLER });
  return { status: res.status(), type: res.headers()["content-type"], cache: res.headers()["cache-control"], bytes: (await res.body()).length };
}

test.describe("link previews", () => {
  test("a shared plan's preview is its photograph, its title and its day; the plan itself never reaches the server", async ({ request }) => {
    const found = await tags(request, `/plan?c=${encodeURIComponent(PHOTO)}&t=Books%20and%20dinner&d=2026-10-03`);
    expect(found.title).toBe("Books and dinner");
    expect(found.image).toContain(`/og/share.jpg?k=plan&l=en&c=${encodeURIComponent(PHOTO)}&t=Books%20and%20dinner&d=2026-10-03&v=1`);
    expect(found.twitterImage).toBe(found.image);
    expect(found.twitterCard).toBe("summary_large_image");
    expect(found.url).toMatch(/\/plan\?c=.+&t=Books%20and%20dinner&d=2026-10-03$/);
  });

  test("a plan's old link, with nothing for a preview, keeps the site's card", async ({ request }) => {
    const found = await tags(request, "/plan");
    expect(found.image).toContain("/og.png?locale=en");
    expect(found.title).toBe("Our date plan · Ethos");
  });

  test("a shared place's preview is its photograph and its name, in its language", async ({ request }) => {
    const found = await tags(request, `/es/dates?lat=38.7117&lng=-9.1302&q=Lisboa&place=node%2F105&c=${encodeURIComponent(PHOTO)}&t=Miradouro%20de%20Santa%20Luzia`);
    expect(found.title).toBe("Miradouro de Santa Luzia");
    expect(found.image).toContain(`/og/share.jpg?k=place&l=es&c=${encodeURIComponent(PHOTO)}&t=Miradouro%20de%20Santa%20Luzia&v=1`);
    expect(found.url).toContain("/es/dates?lat=38.7117&lng=-9.1302&q=Lisboa&place=node%2F105&c=");
  });

  test("a cover from anywhere but Wikimedia is dropped, and the card is drawn without it", async ({ request }) => {
    const found = await tags(request, `/dates?lat=51.5&lng=-0.12&c=${encodeURIComponent("https://example.com/x.jpg")}&t=Somewhere`);
    expect(found.image).toContain("/og/share.jpg?k=place&l=en&t=Somewhere&v=1");
    expect(found.image).not.toContain("example.com");
    const drawn = await card(request, found.image!);
    expect(drawn.status).toBe(200);
    expect(drawn.type).toBe("image/jpeg");
    expect(drawn.cache).toContain("s-maxage=31536000");
    // Asked of the card route directly, the foreign address is ignored there too.
    const direct = await request.get(`/og/share.jpg?k=place&l=en&c=${encodeURIComponent("http://169.254.169.254/latest/meta-data/")}&t=Somewhere&v=1`);
    expect(direct.status()).toBe(200);
    expect(direct.headers()["content-type"]).toBe("image/jpeg");
  });

  test("the dates page without a shared place keeps its own card", async ({ request }) => {
    const found = await tags(request, "/dates?lat=38.714&lng=-9.139&q=Lisbon");
    expect(found.image).toContain("/og.png?locale=en");
  });

  test("a trip's preview is its own picture", async ({ request }) => {
    const trip = await tags(request, "/trips/lisbon-slow-weekend");
    expect(trip.image).toContain("/og/share.jpg?k=trip&l=en&trip=lisbon-slow-weekend&v=1");
    const drawn = await card(request, trip.image!);
    expect(drawn.status).toBe(200);
    expect(drawn.type).toBe("image/jpeg");
    // A photograph, not the plain card (which is ~20 KB of flat colour).
    expect(drawn.bytes).toBeGreaterThan(40_000);
    expect(drawn.bytes).toBeLessThan(300_000);
  });
});
