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
  // Places with a story: their names say so, in English and in Portuguese.
  { id: "node/109", name: "Cellar Door", kind: "bar", group: "eat", dLat: 0.0012, dLng: -0.0025, score: 58 },
  { id: "node/110", name: "Red Frog Speakeasy", kind: "bar", group: "eat", dLat: -0.0022, dLng: 0.0024, score: 57 },
  { id: "node/111", name: "Limão Rooftop Bar", kind: "bar", group: "eat", dLat: 0.0026, dLng: -0.0006, score: 56 },
  { id: "node/112", name: "Tasca do Chico (Casa de Fado)", kind: "restaurant", group: "eat", dLat: -0.0006, dLng: -0.0028, score: 55 },
];
/** The places above whose names make them "something different", and the bowling alley the rare finds add. */
const UNUSUAL = ["Cellar Door", "Red Frog Speakeasy", "Limão Rooftop Bar", "Tasca do Chico (Casa de Fado)", "Bowling Alvalade"];
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
  // Two couples have rated the bookshop; nobody is signed in, so writing one is refused.
  await page.route("**/api/dates/ratings", (route) => route.fulfill({ json: { ratings: { "node/101": { stars: 4.5, reviews: 2, cost: 0 } } } }));
  await page.route("**/api/dates/reviews*", (route) => {
    if (route.request().method() === "POST") return route.fulfill({ status: 401, json: { error: "unauthenticated" } });
    const id = new URL(route.request().url()).searchParams.get("place");
    return route.fulfill({ json: { reviews: id === "node/101" ? [{ id: "r1", stars: 5, cost: 0, wentAs: "first", body: "Ask for the poetry shelf.", name: "Inês", createdAt: "2026-09-20T10:00:00Z", mine: false }, { id: "r2", stars: 4, cost: null, wentAs: null, body: null, name: "Marco", createdAt: "2026-09-19T10:00:00Z", mine: false }] : [] } });
  });
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
    // The ideas are re-sorted as the places and then the rare find arrive: a click before both are
    // in can land on the idea that has just moved under the pointer.
    await expect(page.getByRole("button", { name: /^Livraria do Bairro/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Bowling Alvalade/ })).toBeVisible();
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
    // The time is our own picker, not the browser's: an hour, then the minutes, which close it.
    const time = page.getByRole("button", { name: /^Time at Second Chapter Books/ });
    await expect(time).toHaveText("14:00");
    await time.click();
    const clock = page.getByRole("dialog", { name: "Time at Second Chapter Books" });
    await clock.getByRole("radio", { name: "19" }).click();
    await clock.getByRole("radio", { name: ":30" }).click();
    await expect(clock).toBeHidden();
    await expect(time).toHaveText("19:30");

    // It is theirs to edit, and it is still there after a reload.
    await page.getByLabel("Who is it for?").fill("Maya");
    await page.getByRole("button", { name: "Move Café da Esquina earlier" }).click();
    await page.reload();
    await expect(page.getByLabel("Who is it for?")).toHaveValue("Maya");
    await expect(page.getByRole("heading", { level: 2 }).first()).toHaveText("Café da Esquina");
    await expect(page.getByRole("button", { name: /^Time at Second Chapter Books/ })).toHaveText("19:30");
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
    // The list re-sorts when the rare find joins it: click once it has.
    await expect(page.getByRole("button", { name: /^Bowling Alvalade/ })).toBeVisible();
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

  test("places carry stars, a cost and a rank; the list sorts and filters by cost", async ({ page }) => {
    await mockWorld(page);
    await page.goto(lisbonUrl);
    const shop = page.getByRole("button", { name: /^Livraria do Bairro/ });
    await expect(shop).toBeVisible();
    // The rated bookshop leads the top picks, and its card shows the stars.
    await expect(page.getByRole("region", { name: /Top picks/ }).getByText("#1", { exact: true })).toBeVisible();
    await expect(page.getByText("4.5", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("2 reviews").first()).toBeVisible();
    // A place nobody has rated shows where it stands in its group instead.
    await expect(page.getByText(/#\d+ of \d+ in dinner & drinks/).first()).toBeVisible();
    const cost = page.getByRole("group", { name: "Cost" });
    await cost.getByRole("button", { name: "Free", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Taberna Boa Noite/ })).toHaveCount(0);
    await expect(shop).toBeVisible();
    await cost.getByRole("button", { name: "Free", exact: true }).click();
    // Our own menu, not the browser's select: every order says what it does, and the pill shows the choice.
    const sort = page.getByRole("button", { name: /^Sort by/ });
    await expect(sort).toHaveText(/Best for a date/);
    await sort.click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitemradio", { name: /^Best for a date/ })).toHaveAttribute("aria-checked", "true");
    await expect(menu.getByText("Closest to your search")).toBeVisible();
    await menu.getByRole("menuitemradio", { name: /^Nearest/ }).click();
    await expect(menu).toHaveCount(0);
    await expect(sort).toHaveText(/Nearest/);
    await expect(sort).toBeFocused();
    // The keyboard works it too.
    await sort.press("Enter");
    await expect(page.getByRole("menuitemradio", { name: /^Nearest/ })).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  test("a place opens on what couples said, and asks the signed-out to sign in before rating", async ({ page }) => {
    await mockWorld(page);
    await page.goto(lisbonUrl);
    await page.getByRole("button", { name: /^Livraria do Bairro/ }).first().click();
    const sheet = page.getByRole("dialog", { name: "Livraria do Bairro" });
    await expect(sheet.getByText("4.5 from 2 reviews")).toBeVisible();
    await expect(sheet.getByText("Ask for the poetry shelf.")).toBeVisible();
    await expect(sheet.getByText("Inês")).toBeVisible();
    await expect(sheet.getByText("First date")).toBeVisible();
    // Somewhere to go after: a different kind of place, a short walk away.
    await expect(sheet.getByRole("region", { name: "Make it a date" }).getByRole("button").first()).toBeVisible();
    // What other sites say: with no keys, a search for this exact place on each of them.
    await expect(sheet.getByText("On other sites")).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Tripadvisor" })).toHaveAttribute("href", /tripadvisor\.com\/Search\?q=Livraria%20do%20Bairro/);
    await expect(sheet.getByRole("link", { name: "Yelp" })).toHaveAttribute("href", /yelp\.com\/search/);
    await sheet.getByRole("button", { name: "Rate it" }).click();
    await sheet.getByRole("radio", { name: "Lovely" }).click();
    await sheet.getByRole("button", { name: "Post it" }).click();
    await expect(sheet.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", /\/login\?next=/);
  });

  test("a vibe picks the places too, and every pin on the map says what it costs", async ({ page, isMobile }) => {
    test.skip(isMobile, "the map sits beside the list on a wide screen; on a phone it is behind its button");
    await mockWorld(page);
    await page.goto(lisbonUrl);
    await expect(page.locator(".ethos-pin").first()).toBeAttached({ timeout: 20_000 });
    // Every pin carries its price level, the way the cards do.
    const pins = page.locator(".ethos-pin:not(.is-out)");
    await expect.poll(async () => (await pins.count()) > 0 && (await pins.count()) === (await page.locator(".ethos-pin:not(.is-out) .ethos-pin-price").count())).toBe(true);
    await expect(page.getByRole("button", { name: /^Taberna Boa Noite/ })).toBeVisible();
    // "Free" keeps only free places, on the map and in the list.
    await page.getByRole("group", { name: "Mood" }).getByRole("button", { name: "Free", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Taberna Boa Noite/ })).toHaveCount(0);
    await expect.poll(async () => (await page.locator(".ethos-pin:not(.is-out) .ethos-pin-price").allTextContents()).every((t) => t === "Free")).toBe(true);
    // Off again, and everything is back.
    await page.getByRole("group", { name: "Mood" }).getByRole("button", { name: "Free", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Taberna Boa Noite/ })).toBeVisible();
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

  test("something different: a shelf of places with a story, and a chip that keeps only them in the list and on the map", async ({ page, isMobile }) => {
    await mockWorld(page);
    await page.goto(lisbonUrl);
    const shelf = page.getByRole("region", { name: "Something different in Lisbon" });
    await expect(shelf).toBeVisible();
    await expect(shelf).toContainText("Hidden bars, rooftops, cellars and other places with a story.");
    // Each card says what makes it different, on its picture.
    await expect(shelf.getByRole("button", { name: /^Speakeasy.*Red Frog Speakeasy/ })).toBeVisible();
    await expect(shelf.getByRole("button", { name: /^Rooftop.*Limão Rooftop Bar/ })).toBeVisible();
    await expect(shelf.getByRole("button", { name: /^Underground.*Cellar Door/ })).toBeVisible();
    await expect(shelf.getByRole("button", { name: /^Live music.*Casa de Fado/ })).toBeVisible();
    // A plain café is not on it.
    await expect(shelf.getByRole("button", { name: /Café da Esquina/ })).toHaveCount(0);
    // The list's card says it too.
    await expect(page.locator(".place-card-in").filter({ hasText: "Cellar Door" })).toContainText("Underground");
    await expect(page.locator(".place-card-in").filter({ hasText: "Taberna Boa Noite" })).not.toContainText("Underground");
    // The rare find joins the list before the chip is pressed.
    await expect(page.getByRole("button", { name: /^Bowling Alvalade/ })).toBeVisible();

    const filters = page.getByRole("group", { name: "Kind of place" });
    const chip = filters.getByRole("button", { name: "Something different", exact: true });
    await expect(chip).toHaveAttribute("aria-pressed", "false");
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await expect(filters.getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText(`${UNUSUAL.length} places`)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Cellar Door/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Taberna Boa Noite/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Livraria do Bairro/ })).toHaveCount(0);
    if (!isMobile) {
      // The map keeps the same places: every pin left is one of them.
      await expect(page.getByRole("application", { name: "Map of places for a date" })).toHaveAttribute("data-map-state", "ready", { timeout: 20_000 });
      await expect.poll(async () => {
        const names = await page.locator(".ethos-pin:not(.is-out) .ethos-pin-text").allTextContents();
        return names.length > 0 && names.every((n) => UNUSUAL.includes(n));
      }).toBe(true);
    }
    // With a group as well, the two narrow each other.
    await filters.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Bowling Alvalade/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Cellar Door/ })).toHaveCount(0);
    // "All" lets everything back.
    await filters.getByRole("button", { name: "All", exact: true }).click();
    await expect(chip).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("button", { name: /^Taberna Boa Noite/ })).toBeVisible();

    // Opened from the shelf, the place's sheet says what makes it different.
    await shelf.getByRole("button", { name: /Red Frog Speakeasy/ }).click();
    const sheet = page.getByRole("dialog", { name: "Red Frog Speakeasy" });
    await expect(sheet).toContainText("Speakeasy");
  });

  test("something different, in Spanish", async ({ page }) => {
    await mockWorld(page);
    await page.goto(`/es${lisbonUrl}`);
    const shelf = page.getByRole("region", { name: "Algo diferente en Lisbon" });
    await expect(shelf).toBeVisible();
    await expect(shelf).toContainText("Bares escondidos, azoteas, sótanos y otros sitios con historia.");
    await expect(shelf.getByRole("button", { name: /^Bar escondido.*Red Frog Speakeasy/ })).toBeVisible();
    await expect(shelf.getByRole("button", { name: /^En la azotea.*Limão Rooftop Bar/ })).toBeVisible();
    await expect(shelf.getByRole("button", { name: /^Bajo tierra.*Cellar Door/ })).toBeVisible();
    await expect(shelf.getByRole("button", { name: /^Música en directo/ })).toBeVisible();
    const chip = page.getByRole("group", { name: "Tipo de sitio" }).getByRole("button", { name: "Algo diferente", exact: true });
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /^Taberna Boa Noite/ })).toHaveCount(0);
    // The last set of cards fades out over the new one; once it has gone, the card says it in Spanish.
    const card = page.locator(".place-card-in").filter({ hasText: "Red Frog Speakeasy" });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("Bar escondido");
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
    // As in English: the ideas settle once the places and the rare find are in.
    await expect(page.getByRole("button", { name: /^Livraria do Bairro/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Bowling Alvalade/ })).toBeVisible();
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
    // Kept, it is theirs: the link's copy leaves the address and the plan opens as their own to edit.
    await expect(page.getByLabel("Who is it for?")).toHaveValue("Maya");
    expect(new URL(page.url()).hash).toBe("");
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
    await page.goto("/games/deck");
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

    await page.goto("/es/games/deck");
    await expect(page.getByRole("button", { name: /Carta 1 de 12/ })).toBeVisible();
  });
});

test.describe("games on one phone", () => {
  test("the games table deals every game, and each card opens it", async ({ page }) => {
    await page.goto("/games");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Games for");
    for (const [name, path] of [["How well do you know me?", "/games/know"], ["Would you rather?", "/games/rather"], ["Draw it, guess it", "/games/draw"], ["Memory", "/games/memory"], ["Question cards", "/games/deck"], ["Truth or dare, soft edition", "/games/dare"], ["Dishes roulette", "/games/roulette"]]) {
      await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute("href", path);
    }
    await page.getByRole("link", { name: "Memory", exact: true }).click();
    await expect(page).toHaveURL(/\/games\/memory$/);
    await expect(page.getByRole("heading", { level: 1, name: "Memory" })).toBeVisible();
  });

  test("how well do you know me: two players, one phone, a reveal and a score", async ({ page }) => {
    await page.goto("/games/know");
    await page.getByRole("button", { name: /^One phone/ }).click();
    await page.getByLabel("Your name").fill("Maya");
    await page.getByLabel("Their name").fill("Marco");
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByText("Question 1 of 8 · Maya")).toBeVisible();
    await page.getByRole("group", { name: "Your answer" }).getByRole("button").nth(0).click();
    await page.getByRole("group", { name: /What will Marco say/ }).getByRole("button").nth(1).click();
    await page.getByRole("button", { name: "Lock it in" }).click();
    await expect(page.getByRole("heading", { name: "Hand the phone to Marco" })).toBeVisible();
    await page.getByRole("button", { name: "I'm Marco, go" }).click();
    await expect(page.getByText("Question 1 of 8 · Marco")).toBeVisible();
    await page.getByRole("group", { name: "Your answer" }).getByRole("button").nth(1).click();
    await page.getByRole("group", { name: /What will Maya say/ }).getByRole("button").nth(0).click();
    await page.getByRole("button", { name: "Lock it in" }).click();
    // Maya guessed 1 and Marco said 1; Marco guessed 0 and Maya said 0.
    await expect(page.getByText("Marco got it")).toBeVisible();
    await expect(page.getByText("Maya got it")).toBeVisible();
    await expect(page.getByText("Maya 1 · Marco 1")).toBeVisible();
    await page.getByRole("button", { name: "Next question" }).click();
    await expect(page.getByRole("heading", { name: "Hand the phone to Maya" })).toBeVisible();
  });

  test("would you rather: a match, a clash, and the verdict at the end", async ({ page }) => {
    await page.goto("/games/rather");
    await page.getByRole("button", { name: /^One phone/ }).click();
    await page.getByLabel("Your name").fill("Maya");
    await page.getByLabel("Their name").fill("Marco");
    await page.getByRole("button", { name: "Start" }).click();
    for (let round = 1; round <= 10; round++) {
      await expect(page.getByText(`${round} of 10 · Maya`)).toBeVisible();
      await page.getByTestId("choice-a").click();
      await page.getByRole("button", { name: "I'm Marco, go" }).click();
      await page.getByTestId(round === 1 ? "choice-b" : "choice-a").click();
      await expect(page.getByRole("heading", { name: round === 1 ? "Not the same." : "Same!" })).toBeVisible();
      await page.getByRole("button", { name: round < 10 ? "Next one" : "See the results" }).click();
      if (round < 10) await page.getByRole("button", { name: "I'm Maya, go" }).click();
    }
    await expect(page.getByText("You agreed on 9 of 10.")).toBeVisible();
  });

  test("the roulette spins and the dares deal", async ({ page }) => {
    await page.goto("/games/roulette");
    await page.getByLabel("Your name").fill("Maya");
    await page.getByLabel("Their name").fill("Marco");
    await page.getByRole("button", { name: "Start" }).click();
    await page.getByRole("button", { name: "Spin" }).click();
    await expect(page.getByText(/^(Maya|Marco) (cooks tonight|washes up|picks the film|makes the tea|gets up first tomorrow|books the next date|takes the bins out|chooses the music)\.$/)).toBeVisible({ timeout: 10_000 });
    await page.goto("/games/dare");
    await page.getByLabel("Your name").fill("Maya");
    await page.getByLabel("Their name").fill("Marco");
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByRole("heading", { name: "Maya, truth or dare?" })).toBeVisible();
    await page.getByRole("button", { name: "Dare", exact: true }).click();
    await expect(page.getByText("For Maya")).toBeVisible();
    await page.getByRole("button", { name: /Done\. Marco's turn/ }).click();
    await expect(page.getByRole("heading", { name: "Marco, truth or dare?" })).toBeVisible();
  });

  test("memory: a miss passes the turn, a pair scores and goes again, and the board ends in a winner", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/games/memory");
    await page.getByLabel("Your name").fill("Maya");
    await page.getByLabel("Their name").fill("Marco");
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByText("Maya's turn")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Card \d+, face down$/ })).toHaveCount(16);

    // Play it like a person with a perfect memory: remember every face seen, take a known pair when there is one.
    const card = (n: number) => page.getByRole("button", { name: new RegExp(`^Card ${n}[,:]`) });
    const names = ["Maya", "Marco"];
    const seen = new Map<number, string>();
    const taken = new Set<number>();
    const flip = async (n: number) => {
      await card(n).click();
      const face = ((await card(n).getAttribute("aria-label")) ?? "").split(": ")[1] ?? "";
      expect(face, `card ${n} turned over`).not.toBe("");
      seen.set(n, face);
      return face;
    };
    const unseen = (not?: number) => Array.from({ length: 16 }, (_, i) => i + 1).find((n) => !seen.has(n) && n !== not)!;
    let turn = 0;
    let checkedMiss = false;
    let checkedPair = false;
    while (taken.size < 16) {
      const open = [...seen].filter(([n]) => !taken.has(n));
      const known = open.find(([n, f]) => open.some(([m, g]) => m !== n && g === f));
      let a: number;
      let b: number;
      if (known) {
        a = known[0];
        b = open.find(([m, g]) => m !== a && g === known[1])![0];
        await flip(a);
      } else {
        a = unseen();
        const face = await flip(a);
        b = open.find(([m, g]) => m !== a && g === face)?.[0] ?? unseen(a);
      }
      await flip(b);
      const pair = seen.get(a) === seen.get(b);
      if (pair) {
        taken.add(a);
        taken.add(b);
        if (!checkedPair && taken.size < 16) {
          await expect(page.getByText(`A pair! ${names[turn]} goes again`)).toBeVisible();
          checkedPair = true;
        }
      } else {
        turn = 1 - turn;
        if (!checkedMiss) {
          await expect(page.getByText(`Not a pair. ${names[turn]}'s turn`)).toBeVisible();
          checkedMiss = true;
        }
      }
      // The board takes a moment to settle before the next card can be turned.
      const rest = Array.from({ length: 16 }, (_, i) => i + 1).find((n) => !taken.has(n));
      if (rest) await expect(card(rest)).toBeEnabled();
    }
    await expect(page.getByText(/^(Maya wins|Marco wins|A draw\. Obviously\.)$/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Deal again" })).toBeVisible();
    await page.getByRole("button", { name: "Deal again" }).click();
    await expect(page.getByRole("button", { name: /^Card \d+, face down$/ })).toHaveCount(16);
  });

  test("draw it, guess it: the phone goes over, the word stays private, and a finger leaves ink", async ({ page }) => {
    await page.goto("/games/draw");
    await page.getByRole("button", { name: /^One phone/ }).click();
    await page.getByLabel("Your name").fill("Maya");
    await page.getByLabel("Their name").fill("Marco");
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByRole("heading", { name: "Pass the phone to Maya" })).toBeVisible();
    await page.getByRole("button", { name: "I'm Maya, go" }).click();
    await expect(page.getByText("Maya, your word")).toBeVisible();
    // The word is shown in private, and is gone from the screen once the drawing starts.
    const word = ((await page.getByTestId("peek-word").textContent()) ?? "").trim();
    expect(word.length).toBeGreaterThan(2);
    await page.getByRole("button", { name: "Got it, hide it" }).click();
    const board = page.getByRole("img", { name: "Draw here with your finger" });
    await expect(board).toBeVisible();
    await expect(page.getByText(word, { exact: true })).toHaveCount(0);

    const ink = () => board.evaluate((el) => {
      const canvas = el as HTMLCanvasElement;
      const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
      let lit = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 10) lit++;
      return lit;
    });
    expect(await ink()).toBe(0);
    const box = (await board.boundingBox())!;
    await page.mouse.move(box.x + 40, box.y + 40);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2, { steps: 14 });
    await page.mouse.move(box.x + 60, box.y + box.height - 40, { steps: 14 });
    await page.mouse.up();
    expect(await ink()).toBeGreaterThan(300);
    await page.getByRole("button", { name: "Clear" }).click();
    expect(await ink()).toBe(0);

    await page.getByRole("button", { name: "Marco got it" }).click();
    await expect(page.getByText(`It was ${word}`)).toBeVisible();
    await expect(page.getByText("Got it.")).toBeVisible();
    await page.getByRole("button", { name: "Next round" }).click();
    // The two take it in turns, so the second round goes the other way.
    await expect(page.getByRole("heading", { name: "Pass the phone to Marco" })).toBeVisible();
  });

  test("two phones: a room opens with a code and a link to send", async ({ page }) => {
    await page.goto("/games/rather");
    await page.getByRole("button", { name: /^Two phones/ }).click();
    await page.getByLabel("Your name").fill("Maya");
    await page.getByRole("button", { name: "Make a room" }).click();
    const code = page.getByLabel(/^Room code /);
    await expect(code).toHaveText(/^[A-Z]{4}$/);
    await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText(/Connecting|Waiting/);
  });
});
