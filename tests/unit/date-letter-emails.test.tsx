import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@react-email/render";
import { fillerIn } from "./filler";

/**
 * The date letter's two e-mails (PLAN-letter 2.2, 2.3; E1-E6), rendered to HTML and read as text.
 *
 * To write the pictures' HTML (the confirming e-mail, five weeks, and the pages behind the links):
 * LETTER_OUT=<folder> npx vitest run tests/unit/date-letter-emails.test.tsx
 * (with NEXT_PUBLIC_SITE_URL pointing at a running dev server, so the mark loads). With LETTER_PRINT
 * set it also writes all 104 letters as text into that folder, to be read once.
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

const { DateLetterEmail, LetterConfirmEmail, letterConfirmSubject } = await import("@/emails/date-letter");
const { LETTER_ENTRIES, letterEntry, letterWords } = await import("@/content/date-letter");
const notify = await import("@/lib/email/notify");
const { siteUrl, pageUrl } = await import("@/lib/email/urls");
const { LETTER_REF } = await import("@/lib/lifecycle/date-letter");

type L = "en" | "es";

const text = (html: string) =>
  html
    .replace(/<head[\s\S]*?<\/head>/, " ")
    .replace(/<div[^>]*display:none[^>]*>[\s\S]*?<\/div>/, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&#820[23];/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;| |‌|​|⁠|﻿|͏/g, " ")
    .replace(/\s+/g, " ")
    .replace(/ ([.,:?»])/g, "$1")
    .trim();
/** What a reader reads: the text without the footer (from the hairline on). */
const body = (html: string) => text(html.split(/<hr/i)[0]);
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

const STOP = "https://ethos.test/api/date-letter/stop?t=00000000-0000-4000-8000-000000000001.sig&l=en";
const CONFIRM = "https://ethos.test/api/date-letter/confirm?t=00000000-0000-4000-8000-000000000001.sig&l=en";

function letter(week: number, locale: L) {
  const words = letterWords(letterEntry(week), locale);
  const planUrl = pageUrl(locale, `/dates?idea=${words.id}&ref=${LETTER_REF}`);
  return { words, planUrl, el: DateLetterEmail({ locale, words, planUrl, stopUrl: STOP }) };
}

describe("the date letter's e-mails", () => {
  it("E1 all fifty-two render in both languages", async () => {
    const out = process.env.LETTER_OUT && process.env.LETTER_PRINT ? process.env.LETTER_OUT : null;
    const lines: string[] = [];
    for (const entry of LETTER_ENTRIES) {
      for (const locale of ["en", "es"] as const) {
        const { words, planUrl, el } = letter(entry.week, locale);
        const html = await render(el);
        const read = body(html);
        const where = `week ${entry.week} ${locale}`;
        expect(html, where).toMatch(new RegExp(`<html[^>]* lang="${locale}"`));
        expect(html, where).toMatch(new RegExp(`<h1[^>]*>${words.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/’/g, "(’|&#x27;|')")}</h1>`));
        expect(read, where).toContain(words.say);
        expect(read, where).toContain(locale === "es" ? "Planear esta cita" : "Plan this date");
        expect(html, where).toContain(planUrl.replace(/&/g, "&amp;"));
        expect(planUrl, where).toBe(`${siteUrl()}${locale === "es" ? "/es" : ""}/dates?idea=${entry.idea}&ref=email-letter`);
        const n = read.split(/\s+/).filter(Boolean).length;
        expect(n, `${where}: ${n} words`).toBeLessThanOrEqual(140);
        expect(fillerIn(read, locale), where).toEqual([]);
        if (out) lines.push(`== ${where} | ${words.subject}\n${read}\n`);
      }
    }
    if (out) {
      mkdirSync(out, { recursive: true });
      writeFileSync(join(out, "letters.txt"), lines.join("\n"));
    }
  });

  it("E2 no price, nothing from a gift, nothing that tracks", async () => {
    for (const entry of LETTER_ENTRIES) {
      for (const locale of ["en", "es"] as const) {
        const html = await render(letter(entry.week, locale).el);
        const where = `week ${entry.week} ${locale}`;
        expect(text(html), where).not.toMatch(/[$€£]\s?\d|\d[.,]\d\d/);
        expect(html, where).not.toContain("/g/");
        // The mark and the date idea's own picture (the owner, 26 Nov 2026: every e-mail carries its picture).
        expect(count(html, "<img"), where).toBe(2);
        expect(html, where).toContain("/email/dates/");
        expect(html, where).not.toContain('width="1"');
        for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
          const url = href.replace(/&amp;/g, "&");
          expect(url.startsWith(siteUrl()) || url === STOP, `${where}: ${url}`).toBe(true);
        }
      }
    }
  });

  it("E3 every letter can be stopped, once", async () => {
    for (const entry of LETTER_ENTRIES) {
      for (const locale of ["en", "es"] as const) {
        const html = await render(letter(entry.week, locale).el);
        expect(count(html, STOP.replace(/&/g, "&amp;")), `week ${entry.week} ${locale}`).toBe(1);
        expect(text(html)).toContain(locale === "es" ? "Recibes esto porque pediste la carta de citas de Ethos." : "You’re getting this because you asked for the date letter on Ethos.");
        expect(text(html)).toContain(locale === "es" ? "Dejar de recibir estos correos" : "Stop these emails");
      }
    }
  });

  it("E4 the gift line is only where the entry says, and it links nowhere: a gift wraps a plan, made behind the button", async () => {
    for (const entry of LETTER_ENTRIES) {
      for (const locale of ["en", "es"] as const) {
        const html = await render(letter(entry.week, locale).el);
        const read = body(html);
        const line = locale === "es" ? "envolver el plan en un regalo" : "wrap the plan in a gift";
        const where = `week ${entry.week} ${locale}`;
        expect(read.includes(line), where).toBe(Boolean(entry.gift));
        // An empty /plan has nothing to wrap (letter-T2): the only links are the button and the stop.
        expect(html, where).not.toContain("/plan");
        const { planUrl } = letter(entry.week, locale);
        const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(([, h]) => h.replace(/&amp;/g, "&"));
        expect(hrefs.filter((h) => h !== planUrl && h !== STOP && h !== siteUrl()), where).toEqual([]);
        if (entry.gift) {
          const sentence = read.slice(read.indexOf(locale === "es" ? "Cuando esté" : "Once it’s"));
          expect(sentence, where).not.toMatch(/\d|price|offer|free|precio|oferta|gratis/i);
        }
      }
    }
  });

  it("E5 the confirming e-mail asks and names nothing", async () => {
    for (const locale of ["en", "es"] as const) {
      const html = await render(LetterConfirmEmail({ locale, confirmUrl: CONFIRM, stopUrl: STOP }));
      const read = text(html);
      expect(read).toContain(locale === "es" ? "Sí, envíame la carta de citas" : "Yes, send me the date letter");
      expect(read).toContain(locale === "es" ? "¿Una idea de cita cada jueves?" : "One date idea every Thursday?");
      // The picture and the button both confirm.
      expect(count(html, CONFIRM.replace(/&/g, "&amp;"))).toBe(2);
      expect(count(html, STOP.replace(/&/g, "&amp;"))).toBe(2);
      expect(html).toMatch(new RegExp(`<html[^>]* lang="${locale}"`));
      expect(fillerIn(read, locale)).toEqual([]);
      expect(letterConfirmSubject(locale)).toBe(locale === "es" ? "Confirma tu carta de citas" : "Confirm your date letter");
    }
  });

  it("E6 the senders set the one-click headers and the once-only key", async () => {
    state.sent.length = 0;
    expect(await notify.sendDateLetter({ to: "sam@mail.com", locale: "es", slot: 6, stopUrl: STOP, onceKey: "date-letter/x/2871" })).toBe(true);
    const [letterSent] = state.sent;
    expect(letterSent.to).toBe("sam@mail.com");
    expect(letterSent.subject).toBe(letterWords(letterEntry(6), "es").subject);
    expect(letterSent.headers).toEqual({ "List-Unsubscribe": `<${STOP}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });
    expect(letterSent.idempotencyKey).toBe("date-letter/x/2871");
    const html = await render(letterSent.react);
    expect(html).toContain(`${siteUrl()}/es/dates?idea=pasta-and-a-slow-walk&amp;ref=email-letter`);
    expect(html).not.toContain("/plan");

    expect(await notify.sendLetterConfirm({ to: "sam@mail.com", locale: "en", confirmUrl: CONFIRM, stopUrl: STOP })).toBe(true);
    const confirm = state.sent[1];
    expect(confirm.subject).toBe(letterConfirmSubject("en"));
    expect(confirm.headers).toEqual({ "List-Unsubscribe": `<${STOP}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });
    expect(confirm.idempotencyKey).toBeUndefined();
  });

  // The pictures of step 12 (PLAN-letter 5.3), written only when LETTER_OUT is set.
  const out = process.env.LETTER_OUT;
  it.skipIf(!out)("writes the e-mails for the pictures", async () => {
    mkdirSync(out!, { recursive: true });
    for (const locale of ["en", "es"] as const) {
      writeFileSync(join(out!, `letter-confirm-${locale}.html`), await render(LetterConfirmEmail({ locale, confirmUrl: CONFIRM, stopUrl: STOP })));
      for (const week of [1, 6, 21, 34, 46]) writeFileSync(join(out!, `letter-week-${String(week).padStart(2, "0")}-${locale}.html`), await render(letter(week, locale).el));
    }
    // The pages behind the links, as the routes draw them (lib/email/link-page.ts), in both languages.
    const { linkPageHtml } = await import("@/lib/email/link-page");
    const messages = { en: (await import("../../messages/en.json")).default, es: (await import("../../messages/es.json")).default };
    for (const locale of ["en", "es"] as const) {
      const w = messages[locale].lifecycle.letter;
      const home = messages[locale].lifecycle.link.home;
      const action = "/api/date-letter/x";
      const pages: Record<string, Parameters<typeof linkPageHtml>[0]> = {
        "confirm-ask": { locale, title: w.confirmTitle, body: w.confirmBody, confirm: { label: w.confirmButton, action }, home },
        "confirm-done": { locale, title: w.doneTitle, body: w.doneBody, next: { label: w.doneNext, href: pageUrl(locale, "/dates?idea=bookshop-and-coffee&ref=email-letter") }, home },
        "stop-ask": { locale, title: w.stopTitle, body: w.stopBody, confirm: { label: w.stopConfirm, action }, home },
        "stop-done": { locale, title: w.stopDoneTitle, body: w.stopDoneBody, home },
        "notme-ask": { locale, title: w.notMeTitle, body: w.notMeBody, confirm: { label: w.notMeConfirm, action }, home },
        "notme-done": { locale, title: w.notMeDoneTitle, body: w.notMeDoneBody, home },
        expired: { locale, title: w.goneTitle, body: w.goneBody, home },
      };
      for (const [name, page] of Object.entries(pages)) writeFileSync(join(out!, `link-${name}-${locale}.html`), linkPageHtml(page));
    }
  });
});
