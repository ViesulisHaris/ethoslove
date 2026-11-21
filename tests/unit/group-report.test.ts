/**
 * Reporting a group card's page, or one note sent to it: an email to a person, written in the
 * reader's language (the page speaks the card's, the sender's panel the site's), that quotes a
 * reference and nothing that opens anything. And the account page's list of what is held, which
 * must call a group card's unlock what it is.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BRAND } from "@/config/brand";
import { accountUnlocks } from "@/lib/commerce/entitlements";
import { groupReportLink } from "@/lib/group/report";

const parts = (href: string) => {
  const [to, query] = href.slice("mailto:".length).split("?");
  const params = new URLSearchParams(query);
  return { to, subject: params.get("subject") ?? "", body: params.get("body") ?? "" };
};

describe("a report's email", () => {
  it("goes to the support address and quotes the reference, for the page and for a note", () => {
    const page = parts(groupReportLink("page", "abcd1234", "en"));
    expect(page).toMatchObject({ to: BRAND.supportEmail, subject: "Report group card abcd1234" });
    expect(page.body.startsWith("Group card: abcd1234\n")).toBe(true);
    const note = parts(groupReportLink("note", "note0001", "en"));
    expect(note.subject).toBe("Report a note on a group card (note0001)");
    expect(note.body.startsWith("Note: note0001\n")).toBe(true);
    expect(note.body).toContain("I believe the information in this report is accurate and complete.");
  });

  it("is in Spanish for a Spanish card and a Spanish sender: subject and body, with no English left in it", () => {
    for (const kind of ["page", "note"] as const) {
      const { subject, body } = parts(groupReportLink(kind, "abcd1234", "es"));
      expect(subject).toMatch(/^Denunciar /);
      expect(subject).toContain("abcd1234");
      expect(body).toContain("Qué tiene de malo y por qué");
      expect(body).toContain("Tu nombre:");
      expect(body).toContain("Creo que la información de esta denuncia es exacta y completa.");
      expect(`${subject}\n${body}`).not.toMatch(/\b(Report|What is wrong|Your name|I believe|Note:|Group card:)/);
    }
    expect(parts(groupReportLink("page", "abcd1234", "es")).body.startsWith("Tarjeta en grupo: abcd1234\n")).toBe(true);
    expect(parts(groupReportLink("note", "abcd1234", "es")).body.startsWith("Nota: abcd1234\n")).toBe(true);
  });

  it("any other language reads as English, and the address carries nothing but the reference", () => {
    expect(groupReportLink("page", "abcd1234", "fr")).toBe(groupReportLink("page", "abcd1234", "en"));
    expect(groupReportLink("note", "abcd1234", "es")).not.toMatch(/\/c\/|\/g\/|[0-9a-f]{8}-[0-9a-f]{4}-/);
  });

  it("both screens that offer one use it with their own language (neither keeps an English-only link of its own)", () => {
    for (const file of ["src/components/group/contribute-form.tsx", "src/components/group/panel.tsx"]) {
      const source = readFileSync(file, "utf8");
      expect(source, file).toMatch(/groupReportLink\("(page|note)", [\w.]+, locale\)/);
      expect(source, file).not.toContain("mailto:");
    }
  });
});

describe("what the account page lists as held", () => {
  it("a group card's unlock is listed as group cards on its template, never as a template called 'group:…'", () => {
    const held = accountUnlocks(["the-letter", "group:jar-of-reasons", "jar-of-reasons", "pack:spicy"], ["*"]);
    expect(held.templates).toEqual([
      { slug: "the-letter", lent: false },
      { slug: "jar-of-reasons", lent: false },
      { slug: "*", lent: true },
    ]);
    expect(held.groups).toEqual(["jar-of-reasons"]);
    expect(JSON.stringify(held.templates)).not.toContain("group:");
  });

  it("group cards granted on every template, and the same row held twice, are each said once", () => {
    expect(accountUnlocks(["group:*", "group:the-toast"], ["group:the-toast"]).groups).toEqual(["*", "the-toast"]);
    expect(accountUnlocks([], [])).toEqual({ templates: [], groups: [] });
  });

  it("the page draws its chips from that list, and has the words for a group card in both languages", async () => {
    const page = readFileSync("src/app/[currency]/[locale]/(app)/account/page.tsx", "utf8");
    expect(page).toContain("accountUnlocks(forever, lent)");
    expect(page).not.toMatch(/filter\(\(\{ slug \}\) => !slug\.startsWith\("pack:"\)\)/);
    const en = JSON.parse(readFileSync("messages/en.json", "utf8"));
    const es = JSON.parse(readFileSync("messages/es.json", "utf8"));
    // In the account page's own namespace, which only a signed-in account's pages are sent: under
    // "money.account" they went out in the source of /pricing while group cards were off.
    expect(en.account).toMatchObject({ groupOn: "Group cards on {template}", groupEvery: "Group cards on every template" });
    expect(es.account).toMatchObject({ groupOn: "Tarjetas en grupo con {template}", groupEvery: "Tarjetas en grupo con todas las plantillas" });
    expect(en.money.account.groupOn ?? en.money.account.groupEvery ?? es.money.account.groupOn ?? es.money.account.groupEvery).toBeUndefined();
    expect(page).toContain('t("groupOn"');
  });
});
