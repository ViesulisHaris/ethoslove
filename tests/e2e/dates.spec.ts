import { expect, test, type Page } from "@playwright/test";

/**
 * The Dates pages with the outside world replaced: places, rare finds, the forecast, a place's
 * details and the map's style all come from here, so nothing depends on OpenStreetMap's servers
 * being up, on what is mapped in Lisbon this week, or on the weather.
 */
const LISBON = { lat: 38.714, lng: -9.139 };

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** The day the page starts on: this week's Saturday, or today once the weekend has begun. */
function startingDay(): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  if (day !== 6 && day !== 0) d.setDate(d.getDate() + (6 - day));
  return d;
}

type Mock = { id: string; name: string; kind: string; group: string; dLat: number; dLng: number; score: number };
const PLACES: Mock[] = [
  { id: "node/101", name: "Livraria do Bairro", kind: "bookshop", group: "culture", dLat: 0.001, dLng: 0.001, score: 90 },
  { id: "node/102", name: "Second Chapter Books", kind: "bookshop", group: "culture", dLat: 0.0015, dLng: -0.001, score: 80 },
  { id: "node/103", name: "Café da Esquina", kind: "cafe", group: "sweet", dLat: 0.002, dLng: 0.0015, score: 78 },
  { id: "node/104", name: "Gelados Santini", kind: "dessert", group: "sweet", dLat: -0.001, dLng: 0.002, score: 76 },
  { id: "node/105", name: "Miradouro das Flores", kind: "viewpoint", group: "outdoors", dLat: -0.002, dLng: 0.001, score: 88 },
  { id: "node/106", name: "Taberna Boa Noite", kind: "restaurant", group: "eat", dLat: 0.0005, dLng: -0.002, score: 70 },
  { id: "node/107", name: "Museu do Fado Pequeno", kind: "museum", group: "culture", dLat: 0.003, dLng: 0.0005, score: 74 },
  { id: "node/108", name: "Bar do Rio", kind: "bar", group: "eat", dLat: -0.0015, dLng: -0.0015, score: 60 },
];
const toPlace = (p: Mock) => ({ id: p.id, name: p.name, named: true, kind: p.kind, group: p.group, lat: LISBON.lat + p.dLat, lng: LISBON.lng + p.dLng, distanceKm: 0.2, cuisine: [], outdoorSeating: false, vegetarian: false, stepFree: false, notable: false, score: p.score });

async function mockWorld(page: Page, { wet = false }: { wet?: boolean } = {}) {
  const first = new Date();
  first.setHours(12, 0, 0, 0);
  const days = Array.from({ length: 16 }, (_, i) => {
    const d = new Date(first);
    d.setDate(first.getDate() + i);
    return { date: ymd(d), condition: wet ? "rain" : "clear", tMax: wet ? 14 : 24, tMin: 12, rainChance: wet ? 90 : 5, sunrise: "07:27", sunset: "19:27" };
  });
  await page.route("**/api/dates/search*", (route) => route.fulfill({ json: { center: LISBON, radiusM: 1500, total: PLACES.length, complete: true, places: PLACES.map(toPlace) } }));
  await page.route("**/api/dates/rare*", (route) => route.fulfill({ json: { center: LISBON, radiusM: 8000, places: [{ ...toPlace({ id: "node/201", name: "Bowling Alvalade", kind: "bowling", group: "play", dLat: 0.03, dLng: 0.01, score: 58 }), hours: "Mo-Su 10:00-23:00" }] } }));
  await page.route("**/api/dates/weather*", (route) => route.fulfill({ json: { days, utcOffsetSeconds: 3600, timezone: "Europe/Lisbon" } }));
  await page.route("**/api/dates/here", (route) => route.fulfill({ json: { place: null } }));
  await page.route("**/api/dates/place*", (route) => {
    const id = new URL(route.request().url()).searchParams.get("id");
    return route.fulfill({ json: { details: { id, address: "Rua das Flores 12, Chiado, Lisbon", hours: "Mo-Su 10:00-22:00", website: "https://example.pt/", phone: "+351 210 000 000", cuisine: ["coffee shop"], outdoorSeating: true, vegetarian: false, stepFree: true, notable: false } } });
  });
  // One café has been photographed by somebody generous; nobody has photographed the rest.
  await page.route("**/api/dates/photo*", (route) => {
    const name = new URL(route.request().url()).searchParams.get("name");
    return route.fulfill({ json: { photo: name === "Café da Esquina" ? { src: "https://upload.wikimedia.org/wikipedia/commons/thumb/test/640px-cafe.jpg", width: 640, height: 427, credit: "Inês Almeida", licence: "CC BY 4.0", fileUrl: "https://commons.wikimedia.org/wiki/File:Cafe.jpg" } : null } });
  });
  await page.route("**/api/dates/photos*", (route) => route.fulfill({ json: { center: LISBON, sights: [] } }));
  await page.route("https://upload.wikimedia.org/**", (route) => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64") }));
  // The map draws on plain paper: a style with no sources asks for no tiles.
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.request().url().endsWith("/styles/positron")
      ? route.fulfill({ json: { version: 8, glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf", sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#f2f3f0" } }] } })
      : route.abort(),
  );
}

const lisbonUrl = `/dates?lat=${LISBON.lat}&lng=${LISBON.lng}&q=Lisbon`;

test.describe("finding a date", () => {
  test("with no idea where they are it asks, and a city fills the page", async ({ page }) => {
    await mockWorld(page);
    await page.goto("/dates");
    await expect(page.getByRole("heading", { level: 1, name: "Where are you two?" })).toBeVisible();
    await page.getByRole("button", { name: "Lisbon", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Date ideas in Lisbon" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Livraria do Bairro/ })).toBeVisible();
    // The rare find arrives on its own and joins the list.
    await expect(page.getByRole("button", { name: /^Bowling Alvalade/ })).toBeVisible();
    await expect(page).toHaveURL(/lat=38\.714&lng=-9\.139&q=Lisbon&date=\d{4}-\d{2}-\d{2}$/);
    // Next time it remembers.
    await page.goto("/dates");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Date ideas");
    await expect(page.getByRole("button", { name: /^Livraria do Bairro/ })).toBeVisible();
  });

  test("an idea becomes real stops, another can be swapped in, and it lands in the plan", async ({ page }) => {
    await mockWorld(page);
    await page.goto(lisbonUrl);
    await page.getByRole("button", { name: /^Pick a book for each other/ }).click();
    const panel = page.getByRole("region", { name: "Pick a book for each other" });
    await expect(panel.getByRole("button", { name: "Open: Livraria do Bairro" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Open: Café da Esquina" })).toBeVisible();
    await expect(panel).toContainText("14:00");
    await expect(panel).toContainText("min walk");
    await panel.getByRole("button", { name: "Another" }).first().click();
    await expect(panel.getByRole("button", { name: "Open: Second Chapter Books" })).toBeVisible();

    await panel.getByRole("button", { name: "Add this date to our plan" }).click();
    await expect(panel.getByRole("button", { name: "In your plan" })).toBeDisabled();
    await page.getByRole("link", { name: /Our plan/ }).click();
    await expect(page).toHaveURL(/\/plan$/);
    await expect(page.getByRole("heading", { level: 2, name: "Second Chapter Books" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Café da Esquina" })).toBeVisible();
    await expect(page.getByLabel("Time at Second Chapter Books")).toHaveValue("14:00");

    // It is theirs to edit, and it is still there after a reload.
    await page.getByLabel("Who is it for?").fill("Maya");
    await page.getByRole("button", { name: "Move Café da Esquina earlier" }).click();
    await page.reload();
    await expect(page.getByLabel("Who is it for?")).toHaveValue("Maya");
    await expect(page.getByRole("heading", { level: 2 }).first()).toHaveText("Café da Esquina");
  });

  test("rain takes the picnic off the table and says why", async ({ page }) => {
    await mockWorld(page, { wet: true });
    await page.goto(lisbonUrl);
    await expect(page.getByText("Rain likely (90%)")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Pick a book for each other/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Golden hour picnic/ })).toHaveCount(0);
  });

  test("a place opens with its address and the hours for the day they picked", async ({ page }) => {
    await mockWorld(page);
    await page.goto(lisbonUrl);
    await page.getByRole("button", { name: /^Café da Esquina/ }).click();
    const sheet = page.getByRole("dialog", { name: "Café da Esquina" });
    await expect(sheet).toContainText("Rua das Flores 12, Chiado, Lisbon");
    const weekday = startingDay().toLocaleDateString("en-GB", { weekday: "long" });
    await expect(sheet).toContainText(`Open ${weekday} 10:00–22:00`);
    await expect(sheet).toContainText("Terrace");
    // A real photograph of this very café, and the name of whoever gave it away.
    await expect(sheet.getByRole("link", { name: "Photo: Inês Almeida · CC BY 4.0 · Wikimedia Commons" })).toHaveAttribute("href", "https://commons.wikimedia.org/wiki/File:Cafe.jpg");
    await expect(sheet.getByRole("link", { name: "Directions" })).toHaveAttribute("href", /google\.com\/maps\/dir/);
    await sheet.getByRole("button", { name: "Add to our plan" }).click();
    await expect(sheet.getByRole("button", { name: /In your plan/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Our plan/ })).toContainText("1");
  });

  test("filters narrow the list to one kind of place", async ({ page }) => {
    await mockWorld(page);
    await page.goto(lisbonUrl);
    await expect(page.getByRole("button", { name: /^Taberna Boa Noite/ })).toBeVisible();
    await page.getByRole("button", { name: "Art & culture" }).click();
    await expect(page.getByRole("button", { name: /^Museu do Fado Pequeno/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Taberna Boa Noite/ })).toHaveCount(0);
    await expect(page.getByText("3 places")).toBeVisible();
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Taberna Boa Noite/ })).toBeVisible();
  });

  test("the map draws, on a phone behind its button", async ({ page, isMobile }) => {
    await mockWorld(page);
    await page.goto(lisbonUrl);
    await expect(page.getByRole("button", { name: /^Livraria do Bairro/ })).toBeVisible();
    if (isMobile) await page.getByRole("button", { name: "Map", exact: true }).click();
    const map = page.getByRole("application", { name: "Map of places for a date" });
    await expect(map).toHaveAttribute("data-map-state", "ready", { timeout: 20_000 });
    await expect(map.locator("canvas")).toBeVisible();
    if (isMobile) {
      await page.getByRole("button", { name: "List", exact: true }).click();
      await expect(map).toBeHidden();
    }
  });

  test("in Spanish, all of it", async ({ page }) => {
    await mockWorld(page);
    await page.goto(`/es${lisbonUrl}`);
    await expect(page.getByRole("heading", { level: 1, name: "Ideas para una cita en Lisbon" })).toBeVisible();
    await page.getByRole("button", { name: /^Elegid un libro el uno para el otro/ }).click();
    await expect(page.getByRole("button", { name: "Añadir esta cita a nuestro plan" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Arte y cultura" })).toBeVisible();
  });
});

test.describe("a plan in a link", () => {
  const plan = { v: 1, date: ymd(startingDay()), where: "Lisbon", from: "Marco", to: "Maya", note: "Wear something you can walk in 💚", idea: "golden-hour-picnic", stops: [{ id: "node/104", name: "Gelados Santini", kind: "dessert", lat: 38.713, lng: -9.137, time: "17:45", note: "two scoops, no sharing" }, { id: "node/105", name: "Miradouro das Flores", kind: "viewpoint", lat: 38.712, lng: -9.138, time: "18:45" }] };
  const encoded = Buffer.from(JSON.stringify(plan), "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  test("opens as an invitation that cannot be edited, and can be kept", async ({ page }) => {
    await mockWorld(page);
    await page.goto(`/plan#p=${encoded}`);
    await expect(page.getByText("You're invited")).toBeVisible();
    await expect(page.getByText("For Maya, from Marco")).toBeVisible();
    await expect(page.getByText("Wear something you can walk in 💚")).toBeVisible();
    await expect(page.getByText("two scoops, no sharing")).toBeVisible();
    await expect(page.getByText("Each of you brings one thing the other has never tried.")).toBeVisible();
    await expect(page.getByLabel("Who is it for?")).toHaveCount(0);
    // Nothing of the plan was sent to the server: it is all after the #.
    expect(new URL(page.url()).search).toBe("");

    await page.getByRole("button", { name: "Keep this plan" }).click();
    await expect(page.getByRole("button", { name: "Kept on this device" })).toBeDisabled();
    await page.goto("/plan");
    await expect(page.getByLabel("Who is it for?")).toHaveValue("Maya");
    await expect(page.getByRole("heading", { level: 2, name: "Gelados Santini" })).toBeVisible();
  });

  test("a mangled link says so, and an empty plan points at the map", async ({ page }) => {
    await mockWorld(page);
    await page.goto("/plan#p=bm90LWEtcGxhbg");
    await expect(page.getByRole("heading", { level: 1, name: "That link didn't survive the trip" })).toBeVisible();
    await page.goto("/plan");
    await expect(page.getByRole("heading", { level: 1, name: "Nothing planned yet" })).toBeVisible();
    await page.getByRole("link", { name: "Find a date" }).click();
    await expect(page).toHaveURL(/\/dates$/);
  });
});

test.describe("the other rooms", () => {
  test("the front page's question leads straight to that town's map", async ({ page }) => {
    await mockWorld(page);
    await page.route("**/api/places*", (route) => route.fulfill({ json: { results: [{ name: "Lisbon", kind: "city", lat: 38.7139, lng: -9.1394, country: "Portugal" }] } }));
    await page.goto("/");
    const box = page.getByRole("combobox", { name: "Where" });
    await box.fill("Lisbon");
    await box.press("Enter");
    await expect(page).toHaveURL(/\/dates\?lat=38\.714/);
    await expect(page.getByRole("heading", { level: 1, name: "Date ideas in Lisbon" })).toBeVisible();
  });

  test("long distance: two towns in, the distance, halfway and the clocks out", async ({ page }) => {
    const towns: Record<string, { lat: number; lng: number; offset: number; country: string }> = { Riga: { lat: 56.9494, lng: 24.1052, offset: 10800, country: "Latvia" }, Madrid: { lat: 40.4168, lng: -3.7038, offset: 7200, country: "Spain" } };
    await page.route("**/api/places*", (route) => {
      const q = new URL(route.request().url()).searchParams.get("q") ?? "";
      const town = towns[q];
      return route.fulfill({ json: { results: town ? [{ name: q, kind: "city", lat: town.lat, lng: town.lng, country: town.country }] : [] } });
    });
    await page.route("**/api/dates/weather*", (route) => {
      const lat = Number(new URL(route.request().url()).searchParams.get("lat"));
      return route.fulfill({ json: { days: [], utcOffsetSeconds: lat > 50 ? towns.Riga.offset : towns.Madrid.offset, timezone: "x" } });
    });
    await page.goto("/long-distance");
    const you = page.getByRole("combobox", { name: "Where you are" });
    await you.fill("Riga");
    await you.press("Enter");
    const them = page.getByRole("combobox", { name: "Where they are" });
    await them.fill("Madrid");
    await them.press("Enter");
    await expect(page.getByText(/^2,7\d\d km$/)).toBeVisible();
    await expect(page.getByText("Madrid is 1 h behind")).toBeVisible();
    await expect(page.getByText("You're both awake 09:00–23:00, your time.")).toBeVisible();
    await expect(page.getByRole("link", { name: /^Date ideas in / })).toHaveAttribute("href", /\/dates\?lat=/);
    await expect(page.getByRole("heading", { level: 3, name: "Same recipe, two kitchens" })).toBeVisible();
  });

  test("games: the question deck deals, runs out and reshuffles", async ({ page }) => {
    await page.goto("/games");
    const card = page.getByRole("button", { name: /Card 1 of 12/ });
    await expect(card).toBeVisible();
    // One steady button whose name is the card: its number, the question, and what a tap does.
    const first = (await card.getAttribute("aria-label")) ?? "";
    await card.click();
    await expect(page.getByRole("button", { name: /Card 2 of 12/ })).toBeVisible();
    await page.getByRole("button", { name: "Far apart", exact: true }).click();
    await expect(page.getByRole("button", { name: /Card 1 of 12/ })).toBeVisible();
    await page.getByRole("button", { name: "Light", exact: true }).click();
    await expect(page.getByRole("button", { name: /Card 2 of 12/ })).toBeVisible();
    for (let n = 2; n <= 12; n++) await page.getByRole("button", { name: new RegExp(`Card ${n} of 12`) }).click();
    await expect(page.getByRole("button", { name: /Shuffle and go again/ })).toBeVisible();
    await page.getByRole("button", { name: /Shuffle and go again/ }).click();
    await expect(page.getByRole("button", { name: /Card 1 of 12/ })).toBeVisible();
    expect(first).toMatch(/^Card 1 of 12\. .{15,}\? Next card$/);

    await page.goto("/es/games");
    await expect(page.getByRole("button", { name: /Carta 1 de 12/ })).toBeVisible();
  });
});
