import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** The Christmas e-mails the owner sends from Mailchimp (docs/marketing/holiday-emails/README.md). */
const FILES = ["christmas-offer.en.html", "christmas-offer.es.html", "christmas-last-day.en.html", "christmas-last-day.es.html"];
const read = (file: string) => readFileSync(`docs/marketing/holiday-emails/${file}`, "utf8");

describe.each(FILES)("%s", (file) => {
  const html = read(file);
  const imgs = html.match(/<img\b[^>]*>/g) ?? [];

  it("loads the e-mail icon and the tag's picture, and nothing else", () => {
    expect(imgs.map((img) => img.match(/src="([^"]+)"/)![1])).toEqual([
      "https://tryethos.io/icon-email.png",
      file.endsWith(".es.html") ? "https://tryethos.io/email/tree-tag-es.png" : "https://tryethos.io/email/tree-tag.png",
    ]);
  });

  it("with pictures blocked, shows each picture's words in the body's face and colour, in the picture's own room", () => {
    for (const img of imgs) {
      expect(img).toMatch(/alt="[^"]+"/);
      expect(img).toMatch(/style="[^"]*font-family:Inter[^"]*color:#6F665F;/);
      expect(img).toMatch(/\bwidth="\d+"/);
      expect(img).toMatch(/\bheight="\d+"/);
    }
  });

  // "Paid" was untrue: "a note with your photos" is paid, leaves the template locked, and gets no tag
  // (lib/lifecycle/holiday-extras.ts decides on the unlock). The label says "unlocked", once, over the tag.
  it("says 'unlocked' in the label over the tag only, and never 'paid'", () => {
    const text = html.replace(/<[^>]+>/g, "\n").replace(/&nbsp;/g, " ");
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    expect(lines.filter((l) => /\bpaid\b|de pago/i.test(l))).toEqual([]);
    const unlocked = lines.filter((l) => /\bunlocked\b|desbloquead/i.test(l));
    expect(unlocked).toEqual([file.endsWith(".es.html") ? "Con cada regalo desbloqueado hecho hasta el 20 de diciembre" : "With every unlocked gift made by 20 December"]);
  });

  it("keeps the label's date on one line", () => {
    expect(html).toContain(file.endsWith(".es.html") ? ">Con cada regalo desbloqueado hecho hasta el 20&nbsp;de&nbsp;diciembre<" : ">With every unlocked gift made by 20&nbsp;December<");
  });

  it("speaks of making the gift by the 20th, never of ordering it or of any day this month", () => {
    expect(html).not.toMatch(/\bOrder\b|\bEncarga|any day this month|cualquier día de este mes/);
  });

  it("says the tag's line in one voice, as the tag prints it, and unsubscribes in the impersonal form", () => {
    expect(html).not.toContain("Escanéame");
    if (file.endsWith(".es.html")) expect(html).toContain(">Darse de baja<");
  });
});
