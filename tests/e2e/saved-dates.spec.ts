import { expect, test, type Page } from "@playwright/test";

/**
 * Saved dates on the plan and a trip (docs/MEMBERSHIP.md 3.3, 3.4), against the running dev server,
 * with /api/saved-dates answered here: the dev server uses the production database, so nobody signs
 * in or saves for real. "Signed in" is a session cookie the pages look for and nothing on the server
 * reads (the name is no Supabase project's, so the client library finds no session to refresh).
 * Every request the page makes to the API is kept, to check what it sent.
 */

const ID = "5a7ed0a7-0000-4000-8000-000000000001";
const PLAN_KEY = "ethos.dates.plan.v1";
const stop = (i: number) => ({ id: `s${i}`, name: ["Café Brasileira", "Miradouro de Santa Catarina", "Park Bar"][i - 1], kind: i === 2 ? "viewpoint" : "cafe", lat: 38.7105 + i / 1000, lng: -9.142 + i / 1000 });
const PLAN = { v: 1, where: "Lisbon", stops: [stop(1), stop(2)] };
const SAVED_PLAN = { v: 1, where: "Lisbon", stops: [stop(1), stop(2), stop(3)] };
const person = (name: string) => ({ name, initial: name[0] });

const savedDate = (over: Record<string, unknown> = {}) => ({
  id: ID,
  kind: "date",
  title: "Lisbon",
  city: "Lisbon",
  day: null,
  stopsCount: 3,
  cover: null,
  ideaId: null,
  tripId: null,
  mine: true,
  owner: person("Ana"),
  lastEditedBy: person("Ana"),
  editable: true,
  remind: true,
  version: 1,
  createdAt: "2026-09-20T10:00:00.000Z",
  updatedAt: "2026-09-25T10:00:00.000Z",
  data: SAVED_PLAN,
  ...over,
});
const list = (over: Record<string, unknown> = {}) => ({ items: [], quota: { used: 0, limit: 3 }, member: false, partner: null, ...over });

type Asked = { method: string; url: string; body: unknown; quiet: string | undefined };

/** A session cookie as far as the pages can tell. */
const signIn = (page: Page) => page.context().addCookies([{ name: "sb-e2e-auth-token", value: "e2e", url: test.info().project.use.baseURL ?? "http://localhost:3000" }]);

/** The working plan on this device, as the Dates map leaves it (only if the page hasn't one yet: a reload keeps its own). */
async function withPlan(page: Page, plan: unknown = PLAN) {
  await page.addInitScript(([key, value]) => {
    if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, value);
  }, [PLAN_KEY, JSON.stringify(plan)] as const);
}

/** Answers /api/saved-dates* with `answer`, keeping every request. */
async function api(page: Page, answer: (asked: Asked) => { status: number; body: unknown }) {
  const asked: Asked[] = [];
  await page.route(/\/api\/saved-dates(\/|\?|$)/, async (route) => {
    const request = route.request();
    const entry: Asked = { method: request.method(), url: request.url(), body: request.postDataJSON?.() ?? null, quiet: request.headers()["x-ethos-quiet"] };
    asked.push(entry);
    const { status, body } = answer(entry);
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  return asked;
}

/** Console errors, minus the ones a dev server and the map make on their own. */
function consoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    // Vercel's analytics scripts (/_vercel/insights, /_vercel/speed-insights) are served only on
    // Vercel: a production build run with `next start` answers them 404, which isn't this page's error.
    if (/\/_vercel\//.test(`${message.text()} ${message.location().url}`)) return;
    if (message.type() === "error" && !/tile|maplibre|webgl|favicon|hydrat|Download the React DevTools/i.test(message.text())) errors.push(message.text());
  });
  return errors;
}

test.describe("saving a plan", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("signed in: one tap saves it, and the aside says it's kept", async ({ page }) => {
    await withPlan(page);
    const asked = await api(page, ({ method, body }) => (method === "POST" ? { status: 201, body: { savedDate: savedDate({ data: (body as { data: unknown }).data, stopsCount: 2 }) } } : { status: 200, body: list() }));
    await page.goto("/plan");
    const panel = page.getByTestId("save-plan");
    await expect(panel).toContainText("0 of 3 free saves used");
    await panel.getByRole("button", { name: "Save to my dates" }).click();
    await expect(page.getByTestId("saved-plan")).toContainText("Saved to my dates");
    await expect(page.getByTestId("saved-plan")).toContainText("All changes saved");
    const post = asked.find((a) => a.method === "POST");
    expect(post?.body).toEqual({ kind: "date", data: PLAN, title: "Lisbon" });
    expect(asked.every((a) => a.quiet === "1")).toBe(true);
    await expect(page.getByRole("link", { name: "Open My dates" })).toHaveAttribute("href", "/my-dates");
  });

  test("the fourth save on a free account opens Ethos for Two instead", async ({ page }) => {
    await withPlan(page);
    await api(page, ({ method }) => (method === "POST" ? { status: 403, body: { error: "limit_reached", limit: 3, used: 3 } } : { status: 200, body: list({ quota: { used: 3, limit: 3 } }) }));
    await page.goto("/plan");
    await page.getByTestId("save-plan").getByRole("button", { name: "Save to my dates" }).click();
    const sheet = page.getByTestId("saved-dates-upsell");
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText("Your 3 free saves are used");
    await expect(sheet.getByRole("link", { name: "See Ethos for Two" })).toHaveAttribute("href", "/pricing?from=saved-dates#for-two");
    await expect(sheet.getByRole("link", { name: "Manage my dates" })).toHaveAttribute("href", "/my-dates");
  });

  test("saving unavailable: no button that can only fail, and nothing in the console", async ({ page }) => {
    const errors = consoleErrors(page);
    await withPlan(page);
    const asked = await api(page, () => ({ status: 200, body: { unavailable: true } }));
    await page.goto("/plan");
    await expect(page.getByRole("heading", { name: "Café Brasileira" })).toBeVisible();
    await expect.poll(() => asked.length).toBeGreaterThan(0);
    await expect(page.getByTestId("save-plan")).toHaveCount(0);
    await expect(page.getByTestId("saved-plan")).toHaveCount(0);
    // The next page doesn't ask again: the tab remembers.
    await page.goto("/trips/lisbon-slow-weekend");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId("save-trip")).toHaveCount(0);
    expect(asked).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  test("a 503 from anything on the way hides saving too", async ({ page }) => {
    await withPlan(page);
    await api(page, () => ({ status: 503, body: { error: "not_configured" } }));
    await page.goto("/plan");
    await expect(page.getByRole("heading", { name: "Café Brasileira" })).toBeVisible();
    await expect(page.getByTestId("save-plan")).toHaveCount(0);
  });
});

test.describe("opening a saved date", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("from My dates: it becomes the plan here, linked, and the link's #s= goes", async ({ page }) => {
    await api(page, ({ url }) => (url.includes(ID) ? { status: 200, body: { savedDate: savedDate() } } : { status: 200, body: list({ items: [savedDate()], quota: { used: 1, limit: 3 } }) }));
    await page.goto(`/plan#s=${ID}`);
    await expect(page.getByRole("heading", { name: "Park Bar" })).toBeVisible();
    await expect(page.getByTestId("saved-plan")).toContainText("Saved to my dates");
    await expect.poll(() => new URL(page.url()).hash).toBe("");
    expect(JSON.parse((await page.evaluate((key) => window.localStorage.getItem(key), PLAN_KEY)) ?? "{}").stops).toHaveLength(3);
  });

  test("the partner's date, shared and editable: a change is saved back with the version it was made on", async ({ page }) => {
    const asked = await api(page, ({ method, url, body }) => {
      if (method === "PATCH") return { status: 200, body: { savedDate: savedDate({ mine: false, owner: person("Ben"), lastEditedBy: person("Ana"), version: 3, data: (body as { data: unknown }).data }) } };
      if (url.includes(ID)) return { status: 200, body: { savedDate: savedDate({ mine: false, owner: person("Ben"), lastEditedBy: person("Ben"), version: 2 }) } };
      return { status: 200, body: list({ member: true, quota: { used: 0, limit: null }, partner: person("Ben") }) };
    });
    await page.goto(`/plan#s=${ID}`);
    await expect(page.getByTestId("saved-plan")).toContainText("Ben's date, shared with you.");
    await page.getByRole("textbox").last().fill("Bring a jacket for the viewpoint");
    await expect.poll(() => asked.filter((a) => a.method === "PATCH").length, { timeout: 8000 }).toBe(1);
    const patch = asked.find((a) => a.method === "PATCH")!.body as { baseVersion: number; data: { note?: string } };
    expect(patch.baseVersion).toBe(2);
    expect(patch.data.note).toBe("Bring a jacket for the viewpoint");
    await expect(page.getByTestId("saved-plan")).toContainText("All changes saved");
  });

  test("a date that is read-only opens to read, with a banner and no fields", async ({ page }) => {
    await api(page, ({ url }) => (url.includes(ID) ? { status: 200, body: { savedDate: savedDate({ editable: false }) } } : { status: 200, body: list({ quota: { used: 5, limit: 3 } }) }));
    await page.goto(`/plan#s=${ID}`);
    const banner = page.getByTestId("saved-read-only");
    await expect(banner).toContainText("Read-only");
    await expect(page.getByRole("heading", { name: "Park Bar" })).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveCount(0);
    await banner.getByRole("button", { name: "Why?" }).click();
    await expect(page.getByTestId("saved-dates-upsell")).toContainText("This date is read-only for now");
  });

  test("turning read-only while being edited: a banner that stays, not a toast that goes", async ({ page }) => {
    await api(page, ({ method, url }) => {
      if (method === "PATCH") return { status: 403, body: { error: "read_only" } };
      if (url.includes(ID)) return { status: 200, body: { savedDate: savedDate() } };
      return { status: 200, body: list({ items: [savedDate()], quota: { used: 4, limit: 3 } }) };
    });
    await page.goto(`/plan#s=${ID}`);
    await expect(page.getByTestId("saved-plan")).toBeVisible();
    await page.getByRole("textbox").last().fill("A change that can't be saved");
    const banner = page.getByTestId("saved-detached");
    await expect(banner).toBeVisible({ timeout: 8000 });
    await expect(banner).toContainText("This date is read-only now");
    // Unlinked: the plan is theirs to keep here, and saving it is offered again.
    await expect(page.getByTestId("saved-plan")).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("detached.png") });
    await page.reload();
    await expect(page.getByTestId("saved-detached")).toBeVisible();
    await banner.getByRole("button", { name: "Dismiss this note" }).click();
    await expect(page.getByTestId("saved-detached")).toHaveCount(0);
  });

  test("in Spanish", async ({ page }) => {
    await api(page, ({ method, url }) => {
      if (method === "PATCH") return { status: 403, body: { error: "read_only" } };
      if (url.includes(ID)) return { status: 200, body: { savedDate: savedDate({ mine: false, owner: person("Ben") }) } };
      return { status: 200, body: list({ member: true, quota: { used: 0, limit: null }, partner: person("Ben") }) };
    });
    await page.goto(`/es/plan#s=${ID}`);
    await expect(page.getByTestId("saved-plan")).toContainText("La cita de Ben, compartida contigo.");
    await page.getByRole("textbox").last().fill("Un cambio");
    await expect(page.getByTestId("saved-detached")).toContainText("Ahora esta cita es de solo lectura", { timeout: 8000 });
    await expect(page.getByTestId("saved-detached").getByRole("link", { name: "Gestionar mis citas" })).toHaveAttribute("href", "/es/my-dates");
  });
});

test.describe("signed out", () => {
  test("the plan offers to save, and asks to sign in first", async ({ page }) => {
    await withPlan(page);
    const asked = await api(page, () => ({ status: 401, body: { error: "unauthenticated" } }));
    await page.goto("/plan");
    await page.getByTestId("save-plan").getByRole("button", { name: "Save to my dates" }).click();
    await expect(page.getByRole("dialog")).toContainText("Sign in to save your date");
    // Nothing is asked of the API without a session.
    expect(asked).toEqual([]);
  });

  test("a trip offers Save trip, and asks to sign in first", async ({ page }) => {
    await page.goto("/trips/lisbon-slow-weekend");
    await page.getByTestId("save-trip").click();
    await expect(page.getByRole("dialog")).toContainText("Sign in to save this trip");
  });

  test("My dates sends them to sign in", async ({ page }) => {
    await page.goto("/my-dates");
    await expect(page).toHaveURL(/\/login/);
  });
});

test("a trip saved signed in is a toggle", async ({ page }) => {
  await signIn(page);
  const trip = savedDate({ kind: "trip", tripId: "lisbon-slow-weekend", data: { v: 1, tripId: "lisbon-slow-weekend" } });
  const asked = await api(page, ({ method }) => (method === "POST" ? { status: 201, body: { savedDate: trip } } : method === "DELETE" ? { status: 200, body: { ok: true } } : { status: 200, body: list() }));
  await page.goto("/trips/lisbon-slow-weekend");
  await page.getByTestId("save-trip").click();
  await expect(page.getByTestId("trip-saved")).toContainText("Saved");
  expect(asked.find((a) => a.method === "POST")?.body).toEqual({ kind: "trip", data: { v: 1, tripId: "lisbon-slow-weekend" } });
  await page.getByTestId("trip-saved").getByRole("button", { name: "Remove" }).click();
  await expect(page.getByTestId("save-trip")).toBeVisible();
  expect(asked.some((a) => a.method === "DELETE" && a.url.endsWith(ID))).toBe(true);
});
