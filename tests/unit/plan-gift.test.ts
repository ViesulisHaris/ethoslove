import { describe, expect, it } from "vitest";
import type { Plan, PlanStop } from "@/lib/dates/plan";
import { PLAN_GIFT_SLUG, planGiftFields } from "@/lib/dates/plan-gift";
import { manifest } from "@/templates/paper-crane/manifest";
import { fieldsSchema } from "@/templates/paper-crane/schema";

const stop = (name: string, time?: string): PlanStop => ({ id: `node/${name}`, name, kind: "cafe", lat: 38.71, lng: -9.14, ...(time ? { time } : {}) });
const plan = (stops: PlanStop[], extra: Partial<Plan> = {}): Plan => ({ v: 1, stops, ...extra });
const NAMES = ["Café da Esquina", "Museu do Fado", "Miradouro das Flores", "Taberna Boa Noite", "Bar do Rio", "Gelados Santini", "Livraria do Bairro", "Cinema Ideal"];

describe("a date plan as a gift", () => {
  it("is a Paper Crane, which needs no photos to send", () => {
    expect(PLAN_GIFT_SLUG).toBe("paper-crane");
    expect(manifest.slug).toBe(PLAN_GIFT_SLUG);
    expect(manifest.features.photos.min).toBe(0);
  });

  it("says the day first, then each stop in order, with its time", () => {
    const fields = planGiftFields(plan([stop("Café da Esquina", "18:00"), stop("Museu do Fado", "19:30"), stop("Bar do Rio")], { date: "2026-10-17" }), "en");
    expect(fields.lines).toEqual(["Saturday 17 October.", "1. Café da Esquina at 18:00", "2. Museu do Fado at 19:30", "3. Bar do Rio"]);
  });

  it("speaks the gift's language", () => {
    const fields = planGiftFields(plan([stop("Café da Esquina", "18:00"), stop("Bar do Rio")], { date: "2026-10-17" }), "es");
    expect(fields.lines).toEqual(["Sábado, 17 de octubre.", "1. Café da Esquina a las 18:00", "2. Bar do Rio"]);
    expect(fields.closing).toBe("Tenemos una cita.");
  });

  it("calls a place with no name by its kind in the gift's language", () => {
    const view: PlanStop = { id: "node/9", name: "Viewpoint", kind: "viewpoint", lat: 38.71, lng: -9.14, named: false };
    expect(planGiftFields(plan([stop("Café da Esquina"), view], { date: "2026-10-17" }), "es").lines[2]).toBe("2. Mirador");
  });

  it("keeps a day nobody has picked yet a promise", () => {
    expect(planGiftFields(plan([stop("A"), stop("B")]), "en").lines[0]).toBe("One day soon. I'll tell you which.");
  });

  it("gives a one-stop plan the three folds a crane needs, the stop last", () => {
    expect(planGiftFields(plan([stop("Bar do Rio", "21:00")], { date: "2026-10-17" }), "en").lines).toEqual(["Saturday 17 October.", "I've planned all of it.", "1. Bar do Rio at 21:00"]);
  });

  it("puts every stop past the fifth on the last of the six folds", () => {
    const { lines } = planGiftFields(plan(["A", "B", "C", "D", "E", "F", "G", "H"].map((n) => stop(n))), "en");
    expect(lines).toEqual(["One day soon. I'll tell you which.", "1. A", "2. B", "3. C", "4. D", "5. E, 6. F, 7. G, 8. H"]);
  });

  it("closes on their note to the other person when it fits on the table, and on a promise when it doesn't", () => {
    expect(planGiftFields(plan([stop("A"), stop("B")], { note: " Wear something you can walk in " }), "en").closing).toBe("Wear something you can walk in");
    expect(planGiftFields(plan([stop("A"), stop("B")], { note: "x".repeat(91) }), "en").closing).toBe("It's a date.");
    expect(planGiftFields(plan([stop("A"), stop("B")]), "en").closing).toBe("It's a date.");
  });

  it("always fits Paper Crane's fields, whatever the plan", () => {
    const long = "A very long name for a place that somebody typed out in full, and then some more words";
    for (const locale of ["en", "es"] as const) {
      for (let n = 0; n <= NAMES.length; n++) {
        for (const extra of [{}, { date: "2026-12-31", note: "Bring the red scarf." }, { note: "y".repeat(280) }]) {
          const stops = NAMES.slice(0, n).map((name, i) => stop(i === 0 ? long : name, i % 2 ? "20:15" : undefined));
          const fields = planGiftFields(plan(stops, extra), locale);
          const parsed = fieldsSchema.safeParse({ ...fields, paper: "ivory" });
          expect(parsed.success, `${locale}, ${n} stops: ${JSON.stringify(fields)}`).toBe(true);
        }
      }
    }
  });

  it("cuts a name too long for a fold, and says it was cut", () => {
    const { lines } = planGiftFields(plan([stop("M".repeat(120)), stop("B")]), "en");
    expect(lines[1]).toHaveLength(72);
    expect(lines[1].endsWith("…")).toBe(true);
  });
});
