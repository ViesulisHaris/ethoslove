/**
 * The small parts round the page at a group card's link, each of which answers one way the page let
 * someone down when it was used by hand: the notice naming a photo the card never asked for, the
 * support address that had to be selected by hand, the empty form shown to someone whose note was
 * already in, the site's general "not found" for a link that was reset, and the product's name going
 * out in the source of public pages while switched off.
 */
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BRAND } from "@/config/brand";
import { GroupLinkGone } from "@/components/group/link-gone";
import { KeptNoteGate } from "@/components/group/kept-gate";
import { KEPT_ATTRIBUTE, keptNoteScript, notesKey, parseNotes, tokenInAddress } from "@/lib/group/kept";
import { GROUP_RETENTION } from "@/lib/group/limits";
import { groupAgreed, groupNotice } from "@/lib/group/notice";
import { groupWriteInLink } from "@/lib/group/report";
import { groupToken } from "@/lib/group/token";
import { CLIENT_NAMESPACES, messagesForScope, type ClientScope } from "@/i18n/client-namespaces";

describe("the notice a contributor agrees to", () => {
  it("names the photo on a card that takes one", () => {
    expect(groupNotice("en", "Tom", true)).toBe(`Tom will see your name, note and photo and choose whether they go in. If they do, whoever opens the card sees them. What isn't used is deleted within ${GROUP_RETENTION.sentPromiseDays} days of the card being sent.`);
    // One tense from start to end: this sentence is stored, word for word, as what was agreed to.
    expect(groupNotice("es", "Tomás", true)).toContain("Tomás verá tu nombre, tu nota y tu foto, y decidirá si entran en la tarjeta.");
  });

  it("says nothing of a photo on a card that takes none, on the page and in what is stored as agreed", () => {
    for (const text of [groupNotice("en", "Tom", false), groupAgreed("en", "Tom", false)]) {
      expect(text).toContain("Tom will see your name and note and choose whether they go in.");
      expect(text).not.toMatch(/photo/i);
    }
    for (const text of [groupNotice("es", "Tomás", false), groupAgreed("es", "Tomás", false)]) {
      expect(text).toContain("Tomás verá tu nombre y tu nota, y decidirá si entran en la tarjeta.");
      expect(text).not.toMatch(/foto/i);
    }
    // The rest of the promise is the same either way.
    expect(groupNotice("en", "Tom", false).split(". ").slice(1)).toEqual(groupNotice("en", "Tom", true).split(". ").slice(1));
  });
});

describe("writing in to have a note taken out", () => {
  const parts = (href: string) => {
    const [to, query] = href.slice("mailto:".length).split("?");
    const params = new URLSearchParams(query);
    return { to, subject: params.get("subject") ?? "", body: params.get("body") ?? "" };
  };

  it("is an email to the support address with the page's reference in its subject, in the card's language", () => {
    const en = parts(groupWriteInLink("abcd1234", "en"));
    expect(en).toMatchObject({ to: BRAND.supportEmail, subject: "Take my note out of group card abcd1234" });
    expect(en.body).toContain("Group card: abcd1234");
    expect(en.body).toContain("The name on my note:");
    const es = parts(groupWriteInLink("abcd1234", "es"));
    expect(es.subject).toBe("Quitar mi nota de la tarjeta en grupo abcd1234");
    expect(es.body).toContain("Tarjeta en grupo: abcd1234");
    expect(`${es.subject}\n${es.body}`).not.toMatch(/\b(Take|Group card|name)\b/);
  });

  it("from a link that opens no card any more there is no reference to quote: the email asks who sent the link instead", () => {
    const en = parts(groupWriteInLink(null, "en"));
    expect(en).toMatchObject({ to: BRAND.supportEmail, subject: "Take my note out of a group card" });
    expect(en.body.split("\n")).toEqual(["The name on my note:", "", "Who sent me the link:", ""]);
    const es = parts(groupWriteInLink(null, "es"));
    expect(es.subject).toBe("Quitar mi nota de una tarjeta en grupo");
    expect(es.body.split("\n")).toEqual(["El nombre que puse en mi nota:", "", "Quién me envió el enlace:", ""]);
    for (const mail of [en, es]) expect(`${mail.subject}${mail.body}`).not.toMatch(/\{ref\}|null|undefined/);
  });
});

describe("holding the form back for someone whose note is already in", () => {
  const TOKEN = groupToken("6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", 1, "secret");

  /** Runs the script against a made-up browser and says whether it marked the document. */
  function run(code: string, storage: Record<string, string> | "throws") {
    const marked: string[] = [];
    const localStorage = {
      getItem: (key: string) => {
        if (storage === "throws") throw new Error("storage is off");
        return storage[key] ?? null;
      },
    };
    const document = { documentElement: { setAttribute: (name: string) => marked.push(name) } };
    new Function("localStorage", "document", code)(localStorage, document);
    return marked;
  }

  it("marks the document only when this browser holds something for this very link", () => {
    const code = keptNoteScript(TOKEN);
    expect(run(code, { [notesKey(TOKEN)]: "[]" })).toEqual([KEPT_ATTRIBUTE]);
    expect(run(code, {})).toEqual([]);
    expect(run(code, { [notesKey("anotherLinkAnotherLink0")]: "[]" })).toEqual([]);
  });

  it("does nothing, quietly, where storage is switched off", () => {
    expect(run(keptNoteScript(TOKEN), "throws")).toEqual([]);
  });

  it("is written only for something shaped like a token: nothing typed into an address reaches a script", () => {
    for (const bad of ["", "</script><script>alert(1)</script>", 'x";alert(1);"', "a b", "ü".repeat(22), "x".repeat(65)]) {
      expect(keptNoteScript(bad)).toBe("");
      expect(renderToStaticMarkup(<KeptNoteGate token={bad} />)).toBe("");
    }
    const html = renderToStaticMarkup(<KeptNoteGate token={TOKEN} />);
    expect(html.startsWith("<script>") && html.endsWith("</script>")).toBe(true);
    expect(html).toContain(notesKey(TOKEN));
    // It reads one key and sets one attribute: no request, no cookie, nothing loaded.
    expect(html).not.toMatch(/fetch|XMLHttpRequest|cookie|src=|import\(/);
  });

  it("the form is the part that is held back, and the page lets go once it knows which screen to show", () => {
    const form = readFileSync("src/components/group/contribute-form.tsx", "utf8");
    expect(form).toContain(`[[${KEPT_ATTRIBUTE}]_&]:hidden`);
    expect(form).toContain("document.documentElement.removeAttribute(KEPT_ATTRIBUTE)");
    for (const page of ["src/app/[currency]/[locale]/(gift)/c/[token]/page.tsx", "src/app/[currency]/[locale]/(gift)/group-preview/contribute/page.tsx"]) expect(readFileSync(page, "utf8")).toContain("<KeptNoteGate token=");
  });
});

describe("an address under /c/ that opens no card", () => {
  it("says what to do, in both languages, and nothing about any link or person", () => {
    const en = renderToStaticMarkup(<GroupLinkGone locale="en" />);
    expect(en).toContain("This link no longer works.");
    expect(en).toContain("Ask whoever sent it for a new one.");
    expect(en).toContain('href="/templates?ref=group-contribute"');
    const es = renderToStaticMarkup(<GroupLinkGone locale="es" />);
    expect(es).toContain("Este enlace ya no funciona.");
    expect(es).toContain("Pide uno nuevo a quien te lo envió.");
    expect(es).toContain('href="/es/templates?ref=group-contribute"');
    for (const html of [en, es]) expect(html).not.toMatch(/€|\$|£|<form|<input|<button|<script|mailto:/);
  });

  // Someone who wrote a note at the link before its sender made a new one comes back to this page,
  // and their browser still holds the key to that note: the page offers to take it back, from the
  // browser's own storage alone (the server's answer is the same for every address).
  describe("taking back a note written there before the link was reset", () => {
    const token = groupToken("6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", 1, "secret");

    it("finds the link's token in the page's own address, with or without a language, and in no other address", () => {
      expect(tokenInAddress(`/c/${token}`)).toBe(token);
      expect(tokenInAddress(`/es/c/${token}`)).toBe(token);
      expect(tokenInAddress(`/c/${token}/`)).toBe(token);
      for (const other of ["/", "/c/", `/c/${token.slice(1)}`, `/c/${token}x`, `/g/${token}`, `/x/c/${token}/more`, `/group-preview/contribute`, `/c/${token.slice(0, 21)}!`]) expect(tokenInAddress(other), other).toBeNull();
    });

    it("the server's page is the same for everyone: an empty place that only a browser holding a note fills", () => {
      const html = renderToStaticMarkup(<GroupLinkGone locale="en" />);
      const place = /<div[^>]*data-testid="gone-take-back"[^>]*>/.exec(html);
      expect(place?.[0]).toMatch(/class="[^"]*\bhidden\b/);
      expect(html).not.toMatch(/<button|Take my note back|taken back|role="(status|alert)"/);
      // Handed a token (the development preview) or not, the server draws the same.
      expect(renderToStaticMarkup(<GroupLinkGone locale="en" token={token} />)).toBe(html);
    });

    it("reads back only what is shaped like a kept note, so nothing else in storage becomes a button", () => {
      const good = { s: "w".repeat(32), n: "Gran", t: 1 };
      expect(parseNotes(JSON.stringify([good, { s: "short", n: "x", t: 1 }, { s: "w".repeat(32), n: 5, t: 1 }, null, "text"]))).toEqual([good]);
      for (const raw of [null, "", "{", "{}", '"x"']) expect(parseNotes(raw)).toEqual([]);
    });
  });

  describe("which page a 404 there is", () => {
    const state = { on: false, locale: "en", language: "" };
    vi.doMock("@/lib/group/flag", () => ({ groupGiftsEnabled: () => state.on }));
    vi.doMock("next-intl/server", () => ({ getLocale: async () => state.locale }));
    vi.doMock("next/headers", () => ({ headers: async () => new Headers(state.language ? { "accept-language": state.language } : {}) }));
    vi.doMock("@/app/[currency]/[locale]/not-found", () => ({ default: () => <p>the site&apos;s own not found</p> }));
    const draw = async () => {
      const { default: NotFound } = await import("@/app/[currency]/[locale]/(gift)/c/[token]/not-found");
      return renderToStaticMarkup(await NotFound());
    };

    it("is the site's own while group cards are off: nothing says there is such a thing as a card's link", async () => {
      Object.assign(state, { on: false, locale: "en", language: "es-ES" });
      const html = await draw();
      expect(html).toContain("the site&#x27;s own not found");
      expect(html).not.toMatch(/link no longer works|enlace ya no funciona/);
    });

    it("is the one line once they are on, in the reader's language", async () => {
      Object.assign(state, { on: true, locale: "en", language: "en-GB,en;q=0.9" });
      expect(await draw()).toContain("This link no longer works.");
      Object.assign(state, { language: "es-ES,es;q=0.9,en;q=0.8" });
      expect(await draw()).toContain("Este enlace ya no funciona.");
      // Asked for under /es, whatever the browser prefers.
      Object.assign(state, { locale: "es", language: "en-GB" });
      expect(await draw()).toContain("Este enlace ya no funciona.");
      // Spanish further down the list is not the reader's first language.
      Object.assign(state, { locale: "en", language: "en-GB,es;q=0.5" });
      expect(await draw()).toContain("This link no longer works.");
    });
  });
});

describe("what pages send to the browser while group cards are off", () => {
  it("no page carries the words 'group card', the editor and a signed-in account's own pages included", () => {
    for (const lang of ["en", "es"] as const) {
      const all = JSON.parse(readFileSync(`messages/${lang}.json`, "utf8"));
      for (const route of Object.keys(CLIENT_NAMESPACES) as ClientScope[]) {
        expect(JSON.stringify(messagesForScope(all, route)), `${lang} ${route}`).not.toMatch(/group cards?|tarjetas? en grupo/i);
      }
    }
  });
});
