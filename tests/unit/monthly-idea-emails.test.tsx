import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@react-email/render";
import { fillerIn } from "./filler";

/**
 * The monthly idea e-mail (PLAN-monthly 4.1, E1-E5 and S5), rendered to HTML and read as text.
 *
 * To write the pictures' HTML: MONTHLY_OUT=<folder> npx vitest run tests/unit/monthly-idea-emails.test.tsx
 * (with NEXT_PUBLIC_SITE_URL pointing at a running dev server, so the mark and the poster load).
 */
const state = vi.hoisted(() => ({ sent: [] as { to: string; subject: string; react: ReactElement; headers?: Record<string, string>; idempotencyKey?: string }[] }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => null }));
vi.mock("@/lib/email/send", () => ({
  isUndeliverable: () => false,
  sendEmail: vi.fn(async (message: (typeof state.sent)[number]) => {
    state.sent.push(message);
    return { ok: true, id: "email_1" };
  }),
}));
vi.mock("@/lib/env", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/env")>();
  return { ...real, isConfigured: { ...real.isConfigured, resend: true } };
});

const { IDEA_COPY, MonthlyIdeaEmail } = await import("@/emails/lifecycle");
const notify = await import("@/lib/email/notify");
const { SEASON_IDEAS, SEASON_IDS, seasonFor } = await import("@/lib/lifecycle/suggest");
const { getManifest } = await import("@/templates/manifests");
const { siteUrl, pageUrl } = await import("@/lib/email/urls");
const { priceLastDay, IDEA_REF } = await import("@/lib/lifecycle/monthly-idea");
const { formatMonthDay } = await import("@/lib/lifecycle/reminders");

type L = "en" | "es";
type SeasonId = (typeof SEASON_IDS)[number];

const text = (html: string) =>
  html
    .replace(/<head[\s\S]*?<\/head>/, " ")
    .replace(/<div[^>]*display:none[^>]*>[\s\S]*?<\/div>/, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;| |‌|​|⁠|﻿|͏/g, " ")
    .replace(/\s+/g, " ")
    .replace(/ ([.,:?])/g, "$1")
    .trim();
const words = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w)).length;

const STOP = `${siteUrl()}/api/monthly-idea/stop?t=stop-token&l=en`;
const MORE = `${siteUrl()}/occasions/christmas?ref=email-monthly`;

function props(season: SeasonId, locale: L, over: { priceUntil?: string; basis?: "notice" | "box" | "terms"; slug?: string } = {}) {
  const row = SEASON_IDEAS.find((r) => r.id === season)!;
  const manifest = getManifest(over.slug ?? row.idea)!;
  return {
    locale,
    season,
    idea: { name: manifest.name[locale], tagline: manifest.tagline[locale], url: pageUrl(locale, `/create/${manifest.slug}?ref=${IDEA_REF}`), poster: `${siteUrl()}${manifest.thumbnail.poster}` },
    moreUrl: MORE,
    stopUrl: STOP,
    basis: over.basis ?? ("notice" as const),
    ...(over.priceUntil ? { priceUntil: over.priceUntil } : {}),
  };
}

describe("the monthly idea email", () => {
  it("S5 every season has its words in both languages, short and plain", () => {
    for (const id of SEASON_IDS)
      for (const locale of ["en", "es"] as const) {
        const copy = IDEA_COPY[id][locale];
        expect(copy, `${id} ${locale}`).toBeDefined();
        expect(words(copy.heading), copy.heading).toBeLessThanOrEqual(9);
        expect(copy.heading.endsWith("?"), copy.heading).toBe(true);
        if (locale === "es") expect(copy.heading.startsWith("¿"), copy.heading).toBe(true);
        expect(words(copy.body), copy.body).toBeLessThanOrEqual(30);
        expect(/[:.]$/.test(copy.body), copy.body).toBe(true);
        for (const line of [copy.heading, copy.body, copy.preview]) {
          expect(line).not.toMatch(/\d\s?[$€£]|[$€£]\s?\d|!|—/);
          expect(fillerIn(line, locale), line).toEqual([]);
        }
      }
  });

  it("E1 every season renders in both languages, short", async () => {
    for (const id of SEASON_IDS)
      for (const locale of ["en", "es"] as const) {
        const p = props(id, locale);
        const html = await render(MonthlyIdeaEmail(p));
        const t = text(html);
        expect(html).toMatch(new RegExp(`<html[^>]* lang="${locale}"`));
        expect(t).toContain(IDEA_COPY[id][locale].heading.replace(/'/g, "'"));
        expect(t).toContain(IDEA_COPY[id][locale].body);
        expect(t).toContain(p.idea.name);
        expect(t).toContain(locale === "es" ? "Hacer este regalo" : "Make this one");
        expect(words(t), `${id} ${locale}: ${t}`).toBeLessThanOrEqual(110);
      }
  });

  it("E2 the price paragraph is there only when asked, names the day and no amount", async () => {
    const withPrice = text(await render(MonthlyIdeaEmail(props("christmas", "en", { priceUntil: "27 December" }))));
    expect(withPrice).toContain("until 27 December");
    expect(withPrice).toContain("one-time price");
    expect(words(withPrice)).toBeLessThanOrEqual(150);
    const htmlWith = await render(MonthlyIdeaEmail(props("christmas", "en", { priceUntil: "27 December" })));
    expect(htmlWith).toContain("One idea, and a one-time price on it.");
    const es = text(await render(MonthlyIdeaEmail(props("christmas", "es", { priceUntil: "27 de diciembre" }))));
    expect(es).toContain("hasta el 27 de diciembre");
    const plain = await render(MonthlyIdeaEmail(props("christmas", "en")));
    expect(text(plain)).not.toContain("until 27 December");
    expect(plain).not.toContain("one-time price");
    for (const html of [htmlWith, plain]) expect(text(html)).not.toMatch(/[$€£]\s?\d|\d[.,]\d\d/);
  });

  it("E3 every email can be stopped, and says why it came", async () => {
    const html = await render(MonthlyIdeaEmail(props("june", "en")));
    expect(html.split(STOP.replace(/&/g, "&amp;")).length - 1).toBe(2);
    const footers = {
      en: { notice: "because you sent a gift with Ethos.", terms: "because you sent a free gift with Ethos, which comes with these emails.", box: "because you asked for Ethos offers." },
      es: { notice: "porque enviaste un regalo con Ethos.", terms: "porque enviaste un regalo gratis con Ethos, que incluye estos correos.", box: "porque pediste las ofertas de Ethos." },
    };
    for (const locale of ["en", "es"] as const)
      for (const basis of ["notice", "terms", "box"] as const) {
        const t = text(await render(MonthlyIdeaEmail(props("june", locale, { basis }))));
        expect(t).toContain(footers[locale][basis]);
        expect(t).toContain(locale === "es" ? "Dejar de recibir estos correos" : "Stop these emails");
      }
  });

  it("E4 nothing from a gift, nothing that tracks", async () => {
    for (const priceUntil of [undefined, "27 December"]) {
      const html = await render(MonthlyIdeaEmail(props("christmas", "en", { priceUntil })));
      expect(html).not.toContain("/g/");
      expect(html.match(/<img/g)).toHaveLength(2);
      expect(html).not.toMatch(/width="1"|height="1"/);
      const given = [STOP, MORE, props("christmas", "en").idea.url].map((u) => u.replace(/&/g, "&amp;"));
      for (const [, href] of html.matchAll(/href="([^"]+)"/g)) expect(href.startsWith(siteUrl()) || given.includes(href), href).toBe(true);
      expect(html).not.toContain("Ana");
    }
  });

  it("E5 the sender sets the one-click headers and the once-only key", async () => {
    state.sent.length = 0;
    const ok = await notify.sendMonthlyIdea({ to: "sam@mail.com", locale: "en", season: "october", templateSlug: "spooky-season", ideaUrl: "https://ethos.test/create/spooky-season?ref=email-monthly", moreUrl: MORE, stopUrl: STOP, basis: "notice", onceKey: "monthly-idea/u/2026-10-20" });
    expect(ok).toBe(true);
    expect(state.sent).toHaveLength(1);
    const [message] = state.sent;
    expect(message.subject).toBe("Anyone in mind for Halloween?");
    expect(message.headers).toEqual({ "List-Unsubscribe": `<${STOP}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });
    expect(message.idempotencyKey).toBe("monthly-idea/u/2026-10-20");
    const html = await render(message.react);
    expect(html).toContain("https://ethos.test/create/spooky-season?ref=email-monthly");
    expect(await notify.sendMonthlyIdea({ to: "sam@mail.com", locale: "en", season: "october", templateSlug: "nope", ideaUrl: "x", moreUrl: MORE, stopUrl: STOP, basis: "notice", onceKey: "k" })).toBe(false);
    expect(state.sent).toHaveLength(1);
  });

  // The four sends the pictures show (PLAN-monthly 4.3), written only when MONTHLY_OUT is set.
  const out = process.env.MONTHLY_OUT;
  it.skipIf(!out)("writes the emails for the pictures", async () => {
    const sends = [
      { name: "dec", due: "2026-12-20" },
      { name: "feb", due: "2027-02-05" },
      { name: "jun", due: "2027-06-20" },
      { name: "oct", due: "2027-10-20" },
    ];
    mkdirSync(out!, { recursive: true });
    for (const send of sends) {
      const due = new Date(`${send.due}T00:00:00Z`);
      const season = seasonFor(due);
      const last = priceLastDay(due);
      for (const locale of ["en", "es"] as const)
        for (const price of [true, false]) {
          const priceUntil = price ? formatMonthDay({ month: last.getUTCMonth() + 1, day: last.getUTCDate() }, locale) : undefined;
          const p = { ...props(season.id, locale, { priceUntil }), moreUrl: pageUrl(locale, season.more === "templates" ? `/templates?ref=${IDEA_REF}` : `/occasions/${season.more}?ref=${IDEA_REF}`) };
          const html = await render(MonthlyIdeaEmail(p));
          writeFileSync(join(out!, `email-${send.name}-${locale}-${price ? "price" : "plain"}.html`), html);
        }
    }
  });
});
