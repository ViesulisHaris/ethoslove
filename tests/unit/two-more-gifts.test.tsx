import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import type { GiftData } from "@/lib/gift/schema";
import { dayArgs, nextDays, type NextDay } from "@/lib/lifecycle/next-days";

/**
 * The "two more gifts" card under the link and the publish sheet's "It's already paid for."
 * (PLAN-pair.md 5), drawn as the server would first draw them. What happens on a tap (the session
 * asked for, the card's checkout body, a declined wallet) is held in tests/e2e/pair-offer.spec.ts,
 * in a real browser: this suite has no DOM.
 */
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: () => undefined }),
}));
vi.mock("sonner", () => ({ toast: Object.assign(() => undefined, { error: () => undefined }) }));

const { Offer, Bought, UsedOne, TwoMoreGifts } = await import("@/components/editor/two-more-gifts");
const { UsedGiftLine } = await import("@/components/editor/pair-used");
const { AlreadyPaid, openingOf } = await import("@/components/editor/already-paid");

const intl = (node: React.ReactNode, locale: "en" | "es" = "en") =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "es" ? es : en} timeZone="UTC">
      {node}
    </NextIntlClientProvider>,
  );
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ").replace(/ /g, " ");

const days = nextDays(new Date("2026-11-24T00:00:00.000Z"), [], null);
const gift = { templateSlug: "frosted-window", recipientName: "Mia", locale: "en", photos: [] } as unknown as GiftData;

describe("the two more gifts card", () => {
  const offer = { amount: 799, currency: "eur" as const };
  const ent = (pairOffer: typeof offer | null, giftsReady = 0) => ({ signedIn: true, templates: [], packs: [], pass: null, membership: null, giftsReady, pairOffer });

  it("draws nothing at all when the server doesn't offer it", () => {
    expect(intl(<TwoMoreGifts data={gift} ent={null} afterPayment left={0} />)).toBe("");
    expect(intl(<TwoMoreGifts data={gift} ent={ent(null)} afterPayment left={0} />)).toBe("");
  });

  it("draws nothing after a publish that didn't follow a payment for this gift (a free note, a free reply, a template owned before)", () => {
    expect(intl(<TwoMoreGifts data={gift} ent={ent(offer)} afterPayment={false} left={0} />)).toBe("");
    expect(intl(<TwoMoreGifts data={gift} ent={ent(offer)} afterPayment left={0} />)).toContain('data-testid="pair-offer"');
  });

  it("a gift sent on one of the two says so, with or without the card's code and the account's answer", () => {
    // The share screen draws this line itself (pair-used.tsx), never through the offer card.
    for (const saved of [null, []]) {
      const html = text(intl(<UsedGiftLine data={gift} left={1} saved={saved} />));
      expect(html).toContain("This one was already paid for. Nothing to pay.");
      expect(html).toContain("One left, ready for");
    }
    expect(text(intl(<UsedGiftLine data={gift} left={1} saved={null} />, "es"))).toContain("Este ya estaba pagado: era uno de tus regalos. No hay nada que pagar.");
  });

  it("the day rows come from the saved days handed in, so they are right in the first frame", () => {
    // Drawn as the server would draw it: no effect has run, nothing has been fetched.
    const birthday = [{ id: "r1", recipientName: "Mia", occasion: "birthday" as const, month: 12, day: 10, locale: "en" as const, templateSlug: null }];
    vi.useFakeTimers({ now: new Date(2026, 10, 24, 12) });
    try {
      const html = text(intl(<TwoMoreGifts data={gift} ent={ent(offer)} afterPayment left={0} saved={birthday} />));
      expect(html).toContain("Mia's birthday 10 December in 2 weeks");
      // A Christmas gift (frosted-window): the other row is Valentine's Day, not this Christmas.
      expect(html).toContain("Valentine's Day 14 February in 12 weeks");
      expect(html).not.toContain("Christmas 25 December in 4 weeks");
    } finally {
      vi.useRealTimers();
    }
  });

  it("names the two days and the price, in English, for each currency", () => {
    for (const [currency, price, apart] of [["eur", "€7.99", "€19.98"], ["usd", "$8.99", "$23.98"], ["gbp", "£6.99", "£17.98"]] as const) {
      const html = text(intl(<Offer offer={{ amount: { eur: 799, usd: 899, gbp: 699 }[currency], currency }} days={days} name="Mia" onBought={() => {}} />));
      expect(html).toContain("Nobody likes to be forgotten.");
      expect(html).toContain("You remembered today. Next up:");
      expect(html).toContain("Christmas 25 December in 4 weeks");
      expect(html).toContain("Valentine's Day 14 February in 12 weeks");
      expect(html).toContain(`Both gifts Separately ${apart} ${price}`);
      expect(html).toContain(`Add both for ${price}`);
      expect(html).toContain("Any template, with everything in it");
      // "Can": nothing is scheduled until the buyer makes each gift.
      expect(html).toContain("Can open at midnight on their day");
      expect(html).not.toContain("Set to open");
      // The 30-day refund is said once, in the foot beside Terms.
      // Without a wallet: the card button, "Paid once." in the second slot under it, the ticks, then the
      // notice and Terms (with a wallet "Paid once." opens that small line instead: the e2e spec).
      expect(html).toContain(`Add both for ${price} Paid once. They wait on your account. Any template`);
      expect(html).toContain("Can open at midnight on their day A gift you haven't used can be refunded for 30 days. Terms");
      expect(html.match(/Paid once/g)).toHaveLength(1);
      expect(html.match(/30 days/g)).toHaveLength(1);
      expect(html).not.toContain("money back");
      // Nothing that isn't true on this branch yet (the started gift is the next area).
      expect(html).not.toContain("photos already in");
      expect(html).not.toMatch(/!|unforgettable|perfect for/i);
    }
  });

  it("in Spanish, with the price after the number", () => {
    const html = text(intl(<Offer offer={{ amount: 799, currency: "eur" }} days={days} name="Mia" onBought={() => {}} />, "es"));
    expect(html).toContain("Que nadie caiga en el olvido.");
    expect(html).toContain("Hoy te has acordado. Lo próximo:");
    expect(html).toContain("Puede abrirse a medianoche, justo en su día");
    expect(html).not.toContain("¿No lo usas?");
    expect(html.match(/30 días/g)).toHaveLength(1);
    expect(html).toContain("Cualquier plantilla, con todo incluido");
    expect(html).not.toMatch(/listo/);
    expect(html).toContain("Navidad 25 de diciembre en 4 semanas");
    expect(html).toContain("San Valentín 14 de febrero en 12 semanas");
    expect(html).toContain("Por separado 19,98 €");
    expect(html).toContain("Añadir los dos por 7,99 €");
  });

  it("without a wallet here, draws the card button, never Stripe's", () => {
    const html = intl(<Offer offer={{ amount: 799, currency: "eur" }} days={days} name="Mia" onBought={() => {}} />);
    expect(html).toContain('data-testid="pair-add"');
    expect(html).not.toContain('data-testid="pair-wallet"');
  });

  it("once bought: two gifts ready, the first day to start now", () => {
    const html = text(intl(<Bought days={days} name="Mia" />));
    expect(html).toContain("Two gifts are ready.");
    expect(html).toContain("Paid for. Nobody gets forgotten.");
    expect(html).toContain("Start the Christmas one now");
    expect(intl(<Bought days={days} name="Mia" />)).toContain('href="/occasions/christmas"');
    expect(html).toContain("They wait on your account and never expire.");
  });

  it("the Terms link is a whole tap target with a focus ring, without stretching the line it sits on", () => {
    const html = intl(<Offer offer={offer} days={days} name="Mia" onBought={() => {}} />);
    const link = html.match(/<a href="\/legal\/terms"[^>]*>/)?.[0] ?? "";
    // 13 px text plus 2 x 14 px of pseudo-element: at least 44 px tall, and the line box keeps its height.
    expect(link).toContain("after:-inset-y-3.5");
    expect(link).toContain("relative");
    expect(link).not.toMatch(/min-h-|inline-flex/);
    expect(link).toContain("focus-visible:outline-2");
    // It opens a new tab (the share screen must stay), and says so.
    expect(text(html)).toContain("Terms (opens in a new tab)");
    expect(text(intl(<Offer offer={offer} days={days} name="Mia" onBought={() => {}} />, "es"))).toContain("Términos (se abre en otra pestaña)");
  });

  it("buttons that carry a name wrap inside their pill rather than running past it", () => {
    const long = "Maximiliana Alexandra de la Cruz Fernán";
    const withBirthday = nextDays(new Date("2026-11-24T00:00:00.000Z"), [{ occasion: "birthday", month: 12, day: 10, recipientName: long }], null);
    const start = intl(<Bought days={withBirthday} name={long} />).match(/<a href="\/occasions\/birthday"[^>]*>/)?.[0] ?? "";
    const send = intl(<AlreadyPaid ready={2} thumbs={[]} photos={0} name={long} opensWhen={null} busy={false} onSend={() => {}} onPayInstead={() => {}} />).match(/<button[^>]*already-paid-send[^>]*>/)?.[0] ?? "";
    for (const tag of [start, send]) {
      expect(tag).toContain("whitespace-normal");
      expect(tag).toContain("min-h-12");
      expect(tag).toContain("h-auto");
    }
  });

  it("after a gift sent with one of them: one left for the next day, or none", () => {
    const valentines = days.slice(1);
    expect(text(intl(<UsedOne left={1} days={valentines} name="Mia" />))).toContain("This one was already paid for. Nothing to pay. One left, ready for Valentine's Day.");
    expect(text(intl(<UsedOne left={0} days={valentines} name="Mia" />))).toContain("That was your last gift ready.");
  });

  it("names a saved birthday with the person's name", () => {
    const withBirthday = nextDays(new Date("2026-11-24T00:00:00.000Z"), [{ occasion: "birthday", month: 12, day: 10, recipientName: "Mia" }], null);
    const html = text(intl(<Bought days={withBirthday} name="Mia" />));
    expect(html).toContain("Mia's birthday 10 December in 2 weeks");
    expect(html).toContain("Start the one for Mia's birthday now");
    expect(html).not.toMatch(/Start the Mia's/);
  });

  it("reads right with a day tomorrow, and with a single day, in both languages", () => {
    const eve = nextDays(new Date("2026-12-24T00:00:00.000Z"), [], null);
    expect(text(intl(<Offer offer={{ amount: 799, currency: "eur" }} days={eve} name="Mia" onBought={() => {}} />))).toContain("Christmas 25 December in 1 day");
    expect(text(intl(<Offer offer={{ amount: 799, currency: "eur" }} days={eve} name="Mia" onBought={() => {}} />, "es"))).toContain("Navidad 25 de diciembre en 1 día");
    // 10 February: Valentine's Day alone. One row; the product is still two gifts.
    const one = nextDays(new Date("2027-02-10T00:00:00.000Z"), [], null);
    expect(one).toHaveLength(1);
    const offer = intl(<Offer offer={{ amount: 799, currency: "eur" }} days={one} name="Mia" onBought={() => {}} />);
    expect(offer.match(/<li /g)?.length).toBe(3); // one day row + the two ticks
    expect(text(offer)).toContain("Valentine's Day 14 February in 4 days");
    expect(text(offer)).toContain("Add both for €7.99");
    expect(text(intl(<Offer offer={{ amount: 799, currency: "eur" }} days={one} name="Mia" onBought={() => {}} />, "es"))).toContain("San Valentín 14 de febrero en 4 días");
    const bought = text(intl(<Bought days={one} name="Mia" />));
    expect(bought).toContain("Two gifts are ready.");
    expect(bought).toContain("Start the Valentine's one now");
    expect(text(intl(<Bought days={one} name="Mia" />, "es"))).toContain("Empezar ya el de San Valentín");
    expect(text(intl(<UsedOne left={1} days={one} name="Mia" />))).toContain("One left, ready for Valentine's Day.");
    expect(text(intl(<UsedOne left={1} days={one} name="Mia" />, "es"))).toContain("Te queda uno para San Valentín.");
  });
});

describe("a day named inside a sentence, per kind, in both languages", () => {
  const day = (kind: NextDay["kind"], name?: string): NextDay => ({ kind, month: 1, day: 9, daysAway: 40, ...(name ? { name } : {}) });
  const t = (locale: "en" | "es", ns: "editor.share.pair" | "dashboard.ready") => createTranslator({ locale, messages: locale === "es" ? es : en, namespace: ns });
  const cases: [NextDay, string, string, string, string, string, string][] = [
    // day, en startOne, es startOne, en leftOne, es leftOne, en make, es make
    [day("christmas"), "Start the Christmas one now", "Empezar ya el de Navidad", "One left, ready for Christmas.", "Te queda uno para Navidad.", "Make the Christmas one", "Hacer el de Navidad"],
    [day("valentines"), "Start the Valentine's one now", "Empezar ya el de San Valentín", "One left, ready for Valentine's Day.", "Te queda uno para San Valentín.", "Make the Valentine's one", "Hacer el de San Valentín"],
    [day("birthday", "Mia"), "Start the one for Mia's birthday now", "Empezar ya el del cumpleaños de Mia", "One left, ready for Mia's birthday.", "Te queda uno para el cumpleaños de Mia.", "Make the one for Mia's birthday", "Hacer el del cumpleaños de Mia"],
    [day("birthday"), "Start the birthday one now", "Empezar ya el del cumpleaños", "One left, ready for their birthday.", "Te queda uno para su cumpleaños.", "Make the birthday one", "Hacer el del cumpleaños"],
    [day("anniversary"), "Start the anniversary one now", "Empezar ya el del aniversario", "One left, ready for your anniversary.", "Te queda uno para vuestro aniversario.", "Make the anniversary one", "Hacer el del aniversario"],
    [day("other", "Mia"), "Start the one for Mia now", "Empezar ya el de Mia", "One left, ready for Mia's day.", "Te queda uno para el día de Mia.", "Make the one for Mia", "Hacer el de Mia"],
  ];

  it("every start button is worded the same way: the day, then now", () => {
    const en = t("en", "editor.share.pair");
    const es = t("es", "editor.share.pair");
    for (const [d] of cases) expect(en("startOne", dayArgs(d))).toMatch(/^Start .* now$/);
    for (const [d] of cases) expect(es("startOne", dayArgs(d))).toMatch(/^Empezar ya /);
    expect(en("startAny")).toBe("Start one now");
    expect(es("startAny")).toBe("Empezar uno ya");
  });

  it("the gifts page strip's heading starts with a capital, and is read aloud as one sentence", () => {
    expect(t("en", "dashboard.ready")("count", { count: 2 })).toBe("Gifts ready to make");
    expect(t("en", "dashboard.ready")("count", { count: 1 })).toBe("Gift ready to make");
    expect(t("es", "dashboard.ready")("count", { count: 2 })).toBe("Regalos ya pagados, por hacer");
    expect(t("en", "dashboard.ready")("countSr", { count: 2 })).toBe("2 gifts ready to make");
    expect(t("es", "dashboard.ready")("countSr", { count: 2 })).toBe("Te quedan 2 regalos ya pagados por hacer");
    expect(t("es", "dashboard.ready")("line")).not.toMatch(/pagad/);
  });
  for (const [d, enStart, esStart, enLeft, esLeft, enMake, esMake] of cases) {
    it(`${d.kind}${d.name ? " (named)" : ""}`, () => {
      expect(t("en", "editor.share.pair")("startOne", dayArgs(d))).toBe(enStart);
      expect(t("es", "editor.share.pair")("startOne", dayArgs(d))).toBe(esStart);
      expect(t("en", "editor.share.pair")("leftOne", dayArgs(d))).toBe(enLeft);
      expect(t("es", "editor.share.pair")("leftOne", dayArgs(d))).toBe(esLeft);
      expect(t("en", "dashboard.ready")("make", dayArgs(d))).toBe(enMake);
      expect(t("es", "dashboard.ready")("make", dayArgs(d))).toBe(esMake);
    });
  }

  it("the cards say them so: a saved anniversary first, in English and Spanish", () => {
    const anniversary = [day("anniversary")];
    expect(text(intl(<Bought days={anniversary} name="Mia" />))).toContain("Start the anniversary one now");
    expect(text(intl(<Bought days={anniversary} name="Mia" />, "es"))).toContain("Empezar ya el del aniversario");
    expect(text(intl(<UsedOne left={1} days={anniversary} name="Mia" />))).toContain("One left, ready for your anniversary.");
    expect(text(intl(<UsedOne left={1} days={anniversary} name="Mia" />, "es"))).toContain("Te queda uno para vuestro aniversario.");
    expect(text(intl(<UsedOne left={0} days={anniversary} name="Mia" />, "es"))).toContain("Este ya estaba pagado: era uno de tus regalos. No hay nada que pagar. Era el último que te quedaba.");
  });
});

describe("when a scheduled gift opens", () => {
  const now = new Date("2026-11-24T12:00:00.000Z");
  it("is said in the schedule's own timezone, not the phone's, and midnight is midnight", () => {
    // 00:00 on 5 March in Madrid is 23:00 UTC on 4 March.
    expect(openingOf("2027-03-04T23:00:00.000Z", "Europe/Madrid", "en", now)).toEqual({ midnight: true, when: "5 March 2027" });
    expect(openingOf("2027-03-04T23:00:00.000Z", "Europe/Madrid", "es", now)).toEqual({ midnight: true, when: "5 de marzo de 2027" });
    // The same moment in New York is 18:00 on 4 March.
    expect(openingOf("2027-03-04T23:00:00.000Z", "America/New_York", "en", now)).toEqual({ midnight: false, when: "4 March 2027 at 18:00" });
  });
  it("leaves the year out when it is this year, and falls back on a zone it doesn't know", () => {
    expect(openingOf("2026-12-24T23:00:00.000Z", "Europe/Madrid", "en", now)).toEqual({ midnight: true, when: "25 December" });
    expect(openingOf("2026-12-25T00:00:00.000Z", "Not/AZone", "en", now)?.when).toBeTruthy();
    expect(openingOf("nonsense", "UTC", "en", now)).toBeNull();
  });
});

describe("It's already paid for.", () => {
  const draw = (ready: number, opensWhen: { midnight: boolean; when: string } | null = null, locale: "en" | "es" = "en") =>
    text(intl(<AlreadyPaid ready={ready} thumbs={[]} photos={0} name="Mia" opensWhen={opensWhen} busy={false} onSend={() => {}} onPayInstead={() => {}} />, locale));

  it("says which of the two this is, by the count", () => {
    expect(draw(2)).toContain("It's already paid for. One of your two gifts. One left after this.");
    expect(draw(1)).toContain("Your last gift ready.");
    expect(draw(1)).not.toContain("One of your two gifts");
    // Numbers in words throughout, never half in digits.
    expect(draw(3)).toContain("One of your three gifts. Two left after this.");
    expect(draw(4)).toContain("One of your four gifts. Three left after this.");
    expect(draw(3, null, "es")).toContain("Uno de tus tres regalos. Después de este te quedan dos.");
    expect(draw(4, null, "es")).toContain("Uno de tus cuatro regalos. Después de este te quedan tres.");
    expect(draw(1, null, "es")).toContain("Es el último que te queda.");
  });

  it("says when it opens, or that it arrives at once, and names who it is for", () => {
    expect(draw(2)).toContain("Arrives the moment you send it");
    expect(draw(2, { midnight: true, when: "5 March" })).toContain("Opens at midnight on 5 March");
    expect(draw(2, { midnight: false, when: "5 March at 09:30" })).toContain("Opens on 5 March at 09:30");
    expect(draw(2, { midnight: true, when: "5 de marzo" }, "es")).toContain("Se abre a medianoche del 5 de marzo");
    expect(draw(2)).toContain("Yours for good, with everything in it");
    expect(draw(2)).toContain("Send to Mia");
    expect(draw(2)).toContain("Pay for this one instead");
    expect(draw(2, null, "es")).toContain("Ya está pagado. Uno de tus dos regalos. Después de este te queda otro.");
    expect(draw(2, null, "es")).toContain("Enviar a Mia");
  });

  it("has the send button and the quiet way to the pay panel", () => {
    const html = intl(<AlreadyPaid ready={2} thumbs={["/a.webp", "/b.webp"]} photos={2} name="" opensWhen={null} busy={false} onSend={() => {}} onPayInstead={() => {}} />);
    expect(html).toContain('data-testid="already-paid-send"');
    expect(html).toContain('data-testid="already-paid-pay"');
    expect(text(html)).toContain("Send it");
    expect(html.match(/<img /g)).toHaveLength(2);
  });
});
