/**
 * What a stranger types at a group card's link, before any of it is kept: one line of plain text,
 * nothing invisible, no addresses, inside the lengths the gift itself allows.
 */
import { describe, expect, it } from "vitest";
import { cleanEntry, cleanLine, cleanText, hasLink, lengthOf } from "@/lib/group/clean";
import { giftContributionSchema } from "@/lib/gift/schema";
import { giftStoragePaths } from "@/lib/gift/storage-paths";

describe("cleaning a line", () => {
  it("makes one line with single spaces, trimmed", () => {
    expect(cleanText("  Happy \n\n birthday,\t\tNora  ")).toBe("Happy birthday, Nora");
    expect(cleanText("a  b")).toBe("a b");
  });

  it("takes out control characters, zero-width marks and the overrides that turn a line round", () => {
    expect(cleanText("Mal\u0000lory\u0007")).toBe("Mallory");
    expect(cleanText("in​vis‍ible﻿")).toBe("invisible");
    // "evil" written to read backwards as a harmless file name.
    expect(cleanText("photo‮gpj.exe")).toBe("photogpj.exe");
    expect(cleanText("⁦a⁩⁧b⁨")).toBe("ab");
  });

  // The joiners are invisible and are also spelling: taken out, a family is three faces and a Persian word is another word.
  const J = "‍";
  const N = "‌";
  const points = (text: string) => [...text].map((point) => point.codePointAt(0)!.toString(16)).join(" ");

  it("keeps the joiner that holds an emoji together: a family, a heart on fire, a flag, a shrug, a cook with a skin tone", () => {
    for (const emoji of [
      `\u{1f468}${J}\u{1f469}${J}\u{1f467}`,
      `❤️${J}\u{1f525}`,
      `\u{1f3f3}️${J}\u{1f308}`,
      `\u{1f937}${J}♀️`,
      `\u{1f469}\u{1f3fd}${J}\u{1f373}`,
      `\u{1f469}${J}❤️${J}\u{1f468}`,
    ]) {
      expect(points(cleanText(emoji)), points(emoji)).toBe(points(emoji));
      expect(points(cleanText(`Happy birthday ${emoji} from us`))).toBe(points(`Happy birthday ${emoji} from us`));
    }
  });

  it("keeps the joiners that spell a Persian or a Hindi word", () => {
    const persian = `می${N}خواهم`;
    const hindi = `क्${J}ष`;
    expect(points(cleanText(persian))).toBe("645 6cc 200c 62e 648 627 647 645");
    expect(points(cleanText(hindi))).toBe("915 94d 200d 937");
    // A whole note, counted as the page's own counter counts it.
    const note = `${persian} تولدت مبارک`;
    const entry = cleanEntry({ name: "مامان", note }, 140);
    expect(entry).toEqual({ ok: true, name: "مامان", note });
  });

  it("still takes a joiner out wherever it joins nothing: in Latin words, at an end, beside a space, after a picture with a letter next", () => {
    expect(cleanText(`in${N}vis${J}ible`)).toBe("invisible");
    expect(cleanText(`${J}Mum${N}`)).toBe("Mum");
    expect(cleanText(`a ${J} b`)).toBe("a b");
    expect(points(cleanText(`\u{1f937}${J}x`))).toBe("1f937 78");
    expect(points(cleanText(`م${N} خ`))).toBe("645 20 62e");
    // A run of them is one at most, and the non-joiner never stands in for the joiner between pictures.
    expect(points(cleanText(`\u{1f468}${J}${J}${N}\u{1f469}`))).toBe("1f468 200d 1f469");
    expect(points(cleanText(`\u{1f468}${N}\u{1f469}`))).toBe("1f468 1f469");
    expect(points(cleanText(`م${N}${N}${J}خ`))).toBe("645 200c 62e");
    // And the other hidden marks still go from every script.
    expect(points(cleanText("م​ی‎خ‮"))).toBe("645 6cc 62e");
  });

  it("composes accents, so the same name is the same text", () => {
    expect(cleanText("José")).toBe("José");
    expect(cleanText("José")).toHaveLength(4);
  });

  it("keeps real writing as it is, in either language, emoji included", () => {
    for (const text of ["¡Feliz cumpleaños, mamá! Te quiero un montón.", "Forty is nothing. Ring me.", "Te debo una cena 🍝 y un abrazo", "L'été, l'année, naïve — fine"]) expect(cleanText(text)).toBe(text);
  });

  it("is empty for anything that is not text", () => {
    for (const value of [null, undefined, 7, {}, ["a"]]) expect(cleanText(value)).toBe("");
  });
});

describe("addresses", () => {
  it("finds a scheme, a www and a bare domain", () => {
    for (const text of ["see https://evil.example/x", "HTTP://EVIL.EXAMPLE", "www.evil.example", "go to evil.com now", "bit.ly/3xYz", "free at prizes.shop!", "mi web: tienda.es"]) expect(hasLink(text), text).toBe(true);
  });

  it("finds the endings a short list would miss, and anything with a path after it", () => {
    for (const text of ["evil.pt", "mira evil.mx hoy", "ask evil.ai for it", "t.me/abc", "write to me on t.me/abc please", "youtu.be/abc", "see evil.co.uk", "EVIL.COM", "Evil.com", "x.com", "(prizes.shop)", "todo en tienda.es.", "my page is about.me"]) expect(hasLink(text), text).toBe(true);
  });

  it("leaves a sentence alone, even one that forgot its space", () => {
    for (const text of ["Love you.Mum", "See you at 7.30", "Te quiero.Papá", "e.g. the one in March", "No. 1 dad", "Happy birthday... finally", "vs. the world", "It cost 3.50 and was worth it"]) expect(hasLink(text), text).toBe(false);
  });

  it("a full stop with no space after it, before a short word, is still a sentence: English and Spanish, with a capital or without", () => {
    for (const text of [
      "Happy birthday.Me and the kids miss you",
      "Gracias por todo.Es un placer",
      "Feliz cumple.De parte de todos",
      "Miss you.It was great",
      "ok.Live well",
      // Typed without the capital too: the word after the dot carries on into a sentence, as no address does.
      "happy birthday.me and the kids miss you",
      "gracias por todo.es un placer",
      "feliz cumple.de parte de todos",
      "miss you.it was great",
      "ok.live well",
      "Te quiero.La abuela",
      "Call me.Shop's shut on Sunday",
      "HAPPY BIRTHDAY.ME AND THE KIDS MISS YOU",
      // Not addresses either: an exclamation, a time, an abbreviation, a word that only holds "www".
      "Awww.That is lovely",
      "See you at 4 p.m. sharp",
      "Love you.Mum/Dad",
    ])
      expect(hasLink(text), text).toBe(false);
  });

  it("a capital does not hide the four endings that are never a word, and makes a word of the others", () => {
    for (const text of ["Visit Evil.Com for prizes", "Evil.ORG has it", "see Prizes.Biz today", "go to Evil.Xyz now"]) expect(hasLink(text), text).toBe(true);
    for (const text of ["Happy birthday.Dev and I miss you", "Miss you.UK trip soon", "God bless.Fr Michael", "All done.Net result: a good year", "Te quiero.Arándanos para todos"]) expect(hasLink(text), text).toBe(false);
  });

  it("a hidden joiner can't split an address past the check", () => {
    for (const text of ["ev‌il.com", "evil.‍com", "www‍.evil.example", "ht‌tps://evil.example"]) expect(hasLink(cleanText(text)), text).toBe(true);
  });

  it("is written without a lookbehind, which Safari before 16.4 refuses to load (the editor's bundle holds this file)", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("src/lib/group/clean.ts", "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(source).not.toMatch(/\(\?<[=!]/);
  });
});

describe("a contributor's name and note", () => {
  it("come back clean when they fit", () => {
    expect(cleanEntry({ name: "  Mum ", note: "You were born at 4 a.m.\nI would not swap it." }, 140)).toEqual({ ok: true, name: "Mum", note: "You were born at 4 a.m. I would not swap it." });
  });

  it("need both, after cleaning", () => {
    expect(cleanEntry({ name: "", note: "hi" }, 140)).toEqual({ ok: false, error: "invalid" });
    expect(cleanEntry({ name: "Mum", note: "​ ​" }, 140)).toEqual({ ok: false, error: "invalid" });
    expect(cleanEntry({ name: null, note: 7 }, 140)).toEqual({ ok: false, error: "invalid" });
  });

  it("hold the name to 24 and the note to the group's own length, never past 280", () => {
    expect(cleanEntry({ name: "W".repeat(24), note: "m".repeat(140) }, 140).ok).toBe(true);
    expect(cleanEntry({ name: "W".repeat(25), note: "hi" }, 140)).toEqual({ ok: false, error: "invalid" });
    expect(cleanEntry({ name: "Mum", note: "m".repeat(141) }, 140)).toEqual({ ok: false, error: "invalid" });
    expect(cleanEntry({ name: "Mum", note: "m".repeat(280) }, 9999).ok).toBe(true);
    expect(cleanEntry({ name: "Mum", note: "m".repeat(281) }, 9999)).toEqual({ ok: false, error: "invalid" });
  });

  it("count the way the page's own counter and the gift's schema do, so a note that got in can always be sent", () => {
    // An emoji is two to all three.
    expect(lengthOf("🍝")).toBe(2);
    const full = cleanEntry({ name: "😀".repeat(12), note: "😀".repeat(70) }, 140);
    expect(full.ok).toBe(true);
    expect(cleanEntry({ name: "😀".repeat(13), note: "hi" }, 140).ok).toBe(false);
    expect(cleanEntry({ name: "Mum", note: "😀".repeat(71) }, 140).ok).toBe(false);
    if (full.ok) expect(giftContributionSchema.safeParse({ key: "abcdefghij", name: full.name, note: full.note }).success).toBe(true);
  });

  it("refuse an address in either", () => {
    expect(cleanEntry({ name: "Mum", note: "look at https://evil.example" }, 140)).toEqual({ ok: false, error: "no_links" });
    expect(cleanEntry({ name: "www.evil.example", note: "hi" }, 140)).toEqual({ ok: false, error: "no_links" });
    // Hidden characters can't split one past the check: they are gone before it looks.
    expect(cleanEntry({ name: "Mum", note: "ev​il.com" }, 140)).toEqual({ ok: false, error: "no_links" });
  });

  it("refuse words dressed as one of the gift's stored files", () => {
    const sneaky = "gifts/6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b/a.webp";
    expect(cleanEntry({ name: "Mum", note: sneaky }, 140)).toEqual({ ok: false, error: "invalid" });
    expect(cleanEntry({ name: "gifts/x", note: "hi" }, 140)).toEqual({ ok: false, error: "invalid" });
    // What does get through is never read as a file by the gift's storage walk.
    const fine = cleanEntry({ name: "Mum", note: "My gifts/are in the hall" }, 140);
    expect(fine.ok && giftStoragePaths({ contributions: [fine] })).toEqual([]);
  });
});

describe("the sender's own lines for the page", () => {
  it("are cleaned the same way and held to their length", () => {
    expect(cleanLine("  Tom ", 40)).toBe("Tom");
    expect(cleanLine("x".repeat(41), 40)).toBeNull();
    expect(cleanLine("", 40)).toBeNull();
    expect(cleanLine("", 140, { required: false })).toBe("");
    expect(cleanLine("one line about her, please", 140, { required: false })).toBe("one line about her, please");
    expect(cleanLine("write at evil.com", 140, { required: false })).toBeNull();
  });
});
