import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { AbstractIntlMessages } from "next-intl";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { CLIENT_NAMESPACES, CLIENT_OMIT } from "@/i18n/client-namespaces";
import { omitMessages, pickMessages } from "@/i18n/messages-subset";

/**
 * /pricing shares the `pricing` namespace with the /gifts teaser. The teaser's full dress reads the old card
 * lists ("One premium template, yours for good", "Mix free and premium", "no footer"); /pricing never draws
 * them, so it must not send them to the browser either (pricing-N1-2).
 */
const SCOPE = "(marketing)/pricing/layout" as const;
const read = (rel: string) => readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), "utf8");

describe("cutting branches back out", () => {
  const all = { a: { b: { c: "C", d: "D" }, e: "E" }, f: "F" };

  it("drops the branch under each path and keeps the rest", () => {
    expect(omitMessages(all, ["a.b.c", "f"])).toEqual({ a: { b: { d: "D" }, e: "E" } });
    expect(omitMessages(all, ["a.b"])).toEqual({ a: { e: "E" }, f: "F" });
  });

  it("skips a path it doesn't have, and leaves the input as it was", () => {
    expect(omitMessages(all, ["a.x.y", "nope", "f.g"])).toEqual(all);
    expect(all).toEqual({ a: { b: { c: "C", d: "D" }, e: "E" }, f: "F" });
  });
});

describe("what /pricing sends to the browser", () => {
  for (const [lang, messages] of [["en", en], ["es", es]] as const) {
    const sent = omitMessages(pickMessages(messages as unknown as AbstractIntlMessages, CLIENT_NAMESPACES[SCOPE]), CLIENT_OMIT[SCOPE] ?? []);
    const text = JSON.stringify(sent);

    it(`${lang}: none of the old card lists, blurbs or per-template line`, () => {
      const pricing = (sent as { pricing: { plans: Record<string, Record<string, unknown>> } & Record<string, unknown> }).pricing;
      for (const id of ["single", "pick3", "everything"]) {
        expect(pricing.plans[id].features, id).toBeUndefined();
        expect(pricing.plans[id].blurb, id).toBeUndefined();
        expect(pricing.plans[id].name, id).toBeDefined();
      }
      for (const key of ["perTemplate", "oneTime", "priority"]) expect(pricing[key], key).toBeUndefined();
      // The cards, the picker and the head still get theirs.
      expect(pricing.page).toBeDefined();
      expect(pricing.pick).toBeDefined();
    });

    if (lang === "en") {
      it("en: no 'premium' and no 'footer' in what is sent", () => {
        expect(text).not.toMatch(/premium/i);
        expect(text).not.toMatch(/footer/i);
      });
    }
  }

  it("every branch it cuts is one the catalogue has", () => {
    const has = (p: string) => p.split(".").reduce<unknown>((node, key) => (node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined), en) !== undefined;
    for (const p of CLIENT_OMIT[SCOPE] ?? []) expect(has(p), p).toBe(true);
  });

  it("no client component on /pricing reads what it cuts", () => {
    // The quiet cards (PricingCards with `quiet`) return before the full dress reads its lists.
    const cards = read("src/components/pricing/pricing-cards.tsx");
    const quiet = cards.slice(cards.indexOf("if (quiet) {"), cards.indexOf("const features = t.raw("));
    expect(quiet.length).toBeGreaterThan(100);
    expect(quiet).not.toMatch(/plans\.\$\{id\}\.(features|blurb)|"perTemplate"|"oneTime"|"priority"/);
    for (const file of ["gift-card-offer.tsx", "membership-offer.tsx", "plan-toggle.tsx", "price-head.tsx", "pricing-choice.tsx"]) {
      const src = read(`src/components/pricing/${file}`);
      if (!src.startsWith('"use client"')) continue;
      expect(src, file).not.toMatch(/\.(features|blurb)`|"perTemplate"|"oneTime"|"priority"/);
    }
  });
});

describe("the quiet cards' buttons", () => {
  it("are their own words in both languages, agreeing with the card's name", () => {
    for (const messages of [en, es]) for (const id of ["single", "pick3", "everything"] as const) expect(messages.pricing.page.cards[id].cta).toBeTruthy();
    // "Un regalo": the button is "uno", not the "una" left from "Una plantilla" (pricing-N1-1).
    expect(es.pricing.page.cards.single.cta).toBe("Desbloquear uno");
  });
});
