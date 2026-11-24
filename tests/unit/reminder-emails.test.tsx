import { readFileSync } from "node:fs";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@react-email/render";

/**
 * The three e-mails before a saved day (PLAN-remind 3), rendered to HTML and read as text, and the one
 * e-mail before them, which kept gifts and a database without 0025 still get, byte for byte.
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

const { ReminderEmail, stagedReminderHeading, stagedReminderSubject } = await import("@/emails/lifecycle");
const notify = await import("@/lib/email/notify");

type Occasion = "birthday" | "anniversary" | "valentines" | "other";
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;| /g, " ")
    .replace(/\s+/g, " ")
    .replace(/ ([.,])/g, "$1");

const idea = { name: "Museum", tagline: "A tagline.", url: "https://ethos.test/create/museum?ref=email-reminder", poster: "https://ethos.test/p.jpg" };
const links = { openUrl: "https://ethos.test/api/reminders/open?t=o&s=1&l=en", moreUrl: "https://ethos.test/api/reminders/open?t=o&s=1&l=en&to=templates", skipUrl: "https://ethos.test/api/reminders/skip?t=s&l=en", removeUrl: "https://ethos.test/api/reminders/remove?t=r&l=en" };
const WHEN = { 1: { en: "next Friday", es: "el viernes que viene" }, 2: { en: "this Friday", es: "este viernes" }, 3: { en: "tomorrow", es: "mañana" } } as const;

async function staged(stage: 1 | 2 | 3, occasion: Occasion, locale: "en" | "es", over: Record<string, unknown> = {}) {
  const html = await render(
    ReminderEmail({
      locale,
      recipientName: "Mia",
      occasion,
      date: locale === "es" ? "5 de marzo" : "5 March",
      idea,
      stage,
      when: WHEN[stage][locale],
      weekday: locale === "es" ? "viernes" : "Friday",
      started: "photos",
      paid: "none",
      ...links,
      ...over,
    }),
  );
  return { html, text: text(html) };
}

const SENTENCE: Record<Occasion, { en: (w: string) => string; es: (w: string) => string }> = {
  birthday: { en: (w) => `Mia's birthday is ${w}.`, es: (w) => `El cumpleaños de Mia es ${w}.` },
  anniversary: { en: (w) => `Your anniversary with Mia is ${w}.`, es: (w) => `Tu aniversario con Mia es ${w}.` },
  valentines: { en: (w) => `Valentine's Day is ${w}.`, es: (w) => `San Valentín es ${w}.` },
  other: { en: (w) => `A day for Mia is ${w}.`, es: (w) => `El día de Mia es ${w}.` },
};
const TWO_DAYS: Record<Occasion, { en: string; es: string }> = {
  birthday: { en: "Two days until Mia's birthday", es: "Faltan dos días para el cumpleaños de Mia" },
  anniversary: { en: "Two days until your anniversary", es: "Faltan dos días para tu aniversario" },
  valentines: { en: "Two days until Valentine's Day", es: "Faltan dos días para San Valentín" },
  other: { en: "Two days until Mia's day", es: "Faltan dos días para el día de Mia" },
};

describe("the three e-mails' headings, subjects and bodies", () => {
  for (const occasion of ["birthday", "anniversary", "valentines", "other"] as const) {
    for (const locale of ["en", "es"] as const) {
      it(`${occasion}, ${locale}`, async () => {
        const s = SENTENCE[occasion][locale];
        // Stage 1: the heading with "next Friday"; the subject is the heading without its full stop.
        expect(stagedReminderHeading(1, occasion, locale, "Mia", WHEN[1][locale])).toBe(s(WHEN[1][locale]));
        expect(stagedReminderSubject(1, occasion, locale, "Mia", WHEN[1][locale])).toBe(s(WHEN[1][locale]).replace(/\.$/, ""));
        // Stage 2: "this Friday", and the two-days subject.
        expect(stagedReminderHeading(2, occasion, locale, "Mia", WHEN[2][locale])).toBe(s(WHEN[2][locale]));
        expect(stagedReminderSubject(2, occasion, locale, "Mia", WHEN[2][locale])).toBe(TWO_DAYS[occasion][locale]);
        // Stage 3: "It's not too late." over the sentence with "tomorrow"; the subject is that sentence.
        expect(stagedReminderHeading(3, occasion, locale, "Mia", WHEN[3][locale])).toBe(locale === "es" ? "Aún estás a tiempo." : "It's not too late.");
        expect(stagedReminderSubject(3, occasion, locale, "Mia", WHEN[3][locale])).toBe(s(WHEN[3][locale]).replace(/\.$/, ""));

        const third = await staged(3, occasion, locale);
        expect(third.text).toContain(
          locale === "es"
            ? `${s("mañana")} Tu regalo son unos diez minutos y llega en cuanto lo envías. O prográmalo para medianoche.`
            : `${s("tomorrow")} Your gift takes about ten minutes and arrives the moment you send it. Or set it to open at midnight.`,
        );
        expect(third.text).toContain(locale === "es" ? "Hacerlo ahora" : "Make it now");
      });
    }
  }

  it("says what is started: photos and both names, or the name alone", async () => {
    expect((await staged(1, "anniversary", "en")).text).toContain(
      "That's 5 March. Your gift is started: both names and your photos are already in. It takes about ten minutes, and it can open at midnight on the day.",
    );
    expect((await staged(1, "anniversary", "en", { started: "name" })).text).toContain(
      "That's 5 March. Your gift is started, with Mia's name already in. It takes about ten minutes, and it can open at midnight on the day.",
    );
    expect((await staged(1, "birthday", "es")).text).toContain(
      "Es el 5 de marzo. Tu regalo ya está empezado: los dos nombres y tus fotos ya están puestos. Son unos diez minutos, y puede abrirse a medianoche de ese día.",
    );
    expect((await staged(1, "birthday", "es", { started: "name" })).text).toContain("Es el 5 de marzo. Tu regalo ya está empezado, con el nombre de Mia puesto.");
    expect((await staged(2, "anniversary", "en")).text).toContain(
      "Your gift for Mia is still waiting, with both names and your photos in. Make it tonight and set it to open at midnight on Friday.",
    );
    expect((await staged(2, "anniversary", "en", { started: "name" })).text).toContain("Your gift for Mia is still waiting. Make it tonight and set it to open at midnight on Friday.");
    expect((await staged(2, "birthday", "es")).text).toContain(
      "Tu regalo para Mia sigue esperando, con los dos nombres y tus fotos puestos. Hazlo esta noche y prográmalo para que se abra a medianoche del viernes.",
    );
    expect((await staged(2, "birthday", "es", { started: "name" })).text).toContain("Tu regalo para Mia sigue esperando. Hazlo esta noche y prográmalo para que se abra a medianoche del viernes.");
  });

  it("has each stage's button, the template's own cover in the first only, and the way to every gift in the first only", async () => {
    const first = await staged(1, "anniversary", "en");
    expect(first.text).toContain("Open my gift");
    expect(first.html).toContain("https://ethos.test/p.jpg");
    expect(first.text).toContain("Rather make something else? Every gift keeps your photos.");
    expect(first.html).toContain(links.moreUrl.replace(/&/g, "&amp;"));
    const second = await staged(2, "anniversary", "en");
    expect(second.text).toContain("Finish my gift");
    expect(second.html).not.toContain("https://ethos.test/p.jpg");
    expect(second.text).not.toContain("Every gift");
    expect((await staged(1, "anniversary", "es")).text).toContain("¿Prefieres otro? Todos los regalos conservan tus fotos.");
    expect((await staged(2, "anniversary", "es")).text).toContain("Terminar mi regalo");
    expect((await staged(1, "anniversary", "es")).text).toContain("Abrir mi regalo");
  });

  it("puts one quiet line under the button: a gift ready, the prices, or nothing", async () => {
    expect((await staged(2, "birthday", "en", { paid: "ready" })).text).toContain("Already paid for: it's one of your gifts ready.");
    expect((await staged(2, "birthday", "es", { paid: "ready" })).text).toContain("Ya está pagado: es uno de tus regalos listos.");
    const price = await staged(1, "birthday", "en", { paid: "price", prices: { single: "€9.99", three: "€14.99" } });
    expect(price.text).toContain("One gift is €9.99. Or this one and your next two for €14.99.");
    expect((await staged(1, "birthday", "es", { paid: "price", prices: { single: "9,99 €", three: "14,99 €" } })).text).toContain("Un regalo cuesta 9,99 €. O este y los dos siguientes por 14,99 €.");
    expect((await staged(1, "birthday", "en", { paid: "price", prices: { single: "€9.99", three: null } })).text).toContain("One gift is €9.99.");
    const none = await staged(1, "birthday", "en", { paid: "none" });
    expect(none.text).not.toMatch(/€|\$|£|Already paid/);
  });

  it("ends with why it came and both ways out", async () => {
    const en = await staged(2, "other", "en");
    expect(en.text).toContain("You asked Ethos to remind you of this day: three emails, which stop once your gift is made. Not this year · Remove this reminder");
    expect(en.html).toContain(links.skipUrl.replace(/&/g, "&amp;"));
    expect(en.html).toContain(links.removeUrl.replace(/&/g, "&amp;"));
    expect((await staged(2, "other", "es")).text).toContain("Le pediste a Ethos que te recordara este día: tres correos, que paran en cuanto haces el regalo. Este año no · Quitar este recordatorio");
  });
});

describe("what an e-mail never carries", () => {
  it("no address of a stored gift file and nothing of the gift it started from", async () => {
    for (const stage of [1, 2, 3] as const) {
      const { html } = await staged(stage, "anniversary", "en");
      expect(html).not.toMatch(/gifts\/[0-9a-f-]{36}|supabase|storage\/v1|idb:|blob:/);
    }
  });
});

describe("sending", () => {
  it("sends a stage with its subject, the one-click unsubscribe, a key per reminder, year and stage, and prices in the reader's language", async () => {
    state.sent = [];
    const ok = await notify.sendReminderEmail({
      to: "leo@icloud.test",
      locale: "es",
      recipientName: "Mia",
      occasion: "birthday",
      date: "5 de marzo",
      removeUrl: links.removeUrl,
      staged: { stage: 1, when: "el viernes que viene", weekday: "viernes", started: "photos", templateSlug: "balloons", openUrl: links.openUrl, moreUrl: links.moreUrl, skipUrl: links.skipUrl, onceKey: "reminder/r:2027:1", paid: "price", prices: { single: 999, three: 1499, currency: "eur" } },
    });
    expect(ok).toBe(true);
    const [mail] = state.sent;
    expect(mail.subject).toBe("El cumpleaños de Mia es el viernes que viene");
    expect(mail.idempotencyKey).toBe("reminder/r:2027:1");
    expect(mail.headers?.["List-Unsubscribe"]).toBe(`<${links.removeUrl}>`);
    const body = text(await render(mail.react));
    expect(body).toContain("Un regalo cuesta 9,99 €. O este y los dos siguientes por 14,99 €.");
    // The suggested template's own cover and name, opening the started gift.
    expect(await render(mail.react)).toContain(links.openUrl.replace(/&/g, "&amp;"));
  });
});

describe("the one e-mail as before", () => {
  it("is unchanged, byte for byte, without a stage", async () => {
    const before = JSON.parse(readFileSync("tests/unit/fixtures/reminder-email-before-stages.json", "utf8")) as string[];
    const now = await Promise.all([
      render(ReminderEmail({ locale: "en", recipientName: "Mia", occasion: "anniversary", date: "5 March", idea, moreUrl: "https://ethos.test/occasions/anniversary?ref=email-reminder", removeUrl: "https://ethos.test/api/reminders/remove?t=x&l=en" })),
      render(ReminderEmail({ locale: "es", recipientName: "", occasion: "birthday", date: "5 de marzo", idea, moreUrl: "https://ethos.test/es/occasions/birthday?ref=keep", removeUrl: "https://ethos.test/api/keep/reminder-off?t=x&l=es" })),
    ]);
    expect(now).toEqual(before);
  });

  it("is what a kept gift's reminder sends: its subject and no idempotency key", async () => {
    state.sent = [];
    await notify.sendReminderEmail({ to: "a@b.test", locale: "en", recipientName: "Leo", occasion: "birthday", date: "5 March", removeUrl: "https://ethos.test/off", ref: "keep" });
    expect(state.sent[0].subject).toBe("Leo's birthday is on 5 March");
    expect(state.sent[0].idempotencyKey).toBeUndefined();
  });
});
