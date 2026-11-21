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

  it("leaves a sentence alone, even one that forgot its space", () => {
    for (const text of ["Love you.Mum", "See you at 7.30", "Te quiero.Papá", "e.g. the one in March", "No. 1 dad", "Happy birthday... finally", "vs. the world", "It cost 3.50 and was worth it"]) expect(hasLink(text), text).toBe(false);
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
