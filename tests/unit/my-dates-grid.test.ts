import { createElement, type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import type { SavedDateSummary, SavedDatesList } from "@/lib/saved-dates/types";

/**
 * /my-dates as its first page is drawn on the server (docs/MEMBERSHIP.md 3.4). The page itself needs
 * a real session, which a test against the production database can't have, so the grid is drawn
 * here from the list the API would answer: the header and quota, the cards (a date, a trip, the
 * partner's, a read-only one), their links, and the empty state, in both languages.
 */

// next-intl's navigation reaches for Next's router, which a unit test doesn't have: a plain link will do.
vi.mock("@/i18n/navigation", async () => {
  const { createElement: h } = await import("react");
  return {
    Link: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) => h("a", { href, ...rest }, children),
    useRouter: () => ({ push: () => undefined, refresh: () => undefined, replace: () => undefined }),
    usePathname: () => "/my-dates",
  };
});
vi.mock("@/lib/analytics/track", () => ({ track: () => undefined }));
const { MyDatesGrid } = await import("@/components/saved-dates/my-dates-grid");

const person = (name: string) => ({ name, initial: name[0] });
const item = (over: Partial<SavedDateSummary>): SavedDateSummary => ({
  id: "5a7ed0a7-0000-4000-8000-000000000001",
  kind: "date",
  title: "Sunset in Alfama",
  city: "Lisbon",
  day: "2026-10-03",
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
  ...over,
});
const trip = { title: "A slow weekend in Lisbon", where: "Lisbon", days: 3, src: "/trips/lisbon.jpg", srcSet: "", from: "#f4a58f", to: "#171a3f" };

const render = (initial: SavedDatesList, locale: "en" | "es" = "en") =>
  renderToStaticMarkup(
    createElement(NextIntlClientProvider, { locale, messages: locale === "es" ? es : en, timeZone: "UTC" } as unknown as ComponentProps<typeof NextIntlClientProvider>, createElement(MyDatesGrid, { initial, monthly: true, currency: "eur", trips: { "lisbon-slow-weekend": trip } })),
  );

describe("My dates", () => {
  const free: SavedDatesList = {
    items: [
      item({}),
      item({ id: "5a7ed0a7-0000-4000-8000-000000000002", kind: "trip", title: "", tripId: "lisbon-slow-weekend", stopsCount: 5, day: null }),
      item({ id: "5a7ed0a7-0000-4000-8000-000000000003", title: "Old one", editable: false }),
    ],
    quota: { used: 3, limit: 3 },
    member: false,
    partner: null,
  };

  it("shows a free account's cards, the quota and the way to more, with a date opening in the plan and a trip on its page", () => {
    const html = render(free);
    expect(html).toContain("My dates");
    expect(html).toContain("3 of 3 free saves");
    expect(html).toContain('href="/pricing?from=saved-dates#for-two"');
    expect(html.match(/data-testid="saved-card"/g)).toHaveLength(3);
    expect(html).toContain("Sunset in Alfama");
    expect(html).toContain("A slow weekend in Lisbon");
    expect(html).toContain('href="/plan#s=5a7ed0a7-0000-4000-8000-000000000001"');
    expect(html).toContain('href="/trips/lisbon-slow-weekend"');
    expect(html).toContain("Read-only");
  });

  it("names the partner while sharing, and marks their dates as theirs", () => {
    const html = render({ items: [item({ mine: false, owner: person("Ben"), lastEditedBy: person("Ben") })], quota: { used: 0, limit: null }, member: true, partner: person("Ben") });
    expect(html).toContain("shared with Ben");
    expect(html).toContain("From Ben");
    expect(html).not.toContain("free saves");
  });

  it("with nothing saved, says where to start", () => {
    const html = render({ items: [], quota: { used: 0, limit: 3 }, member: false, partner: null });
    expect(html).toContain("No saved dates yet");
    expect(html).toContain('href="/dates"');
    expect(html).toContain('href="/trips"');
  });

  it("in Spanish", () => {
    const html = render(free, "es");
    expect(html).toContain("Mis citas");
    expect(html).toContain("Solo lectura");
    expect(render({ items: [], quota: { used: 0, limit: 3 }, member: false, partner: null }, "es")).toContain(es.savedDates.page.empty.title);
  });
});
