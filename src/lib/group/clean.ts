import { GROUP_LIMITS } from "./limits";

/**
 * What a stranger typed at a group card's link, made safe to keep and to draw. Pure, and the only
 * way a name or a note gets in (the route). The sender's own form in the panel (a typo fixed, a
 * note typed in for someone) runs the same cleaning and the same link check before it saves, so
 * what it writes is held to the same line: one line of plain text, with no address in it.
 */

/** Control characters, zero-width marks and the bidi overrides that can make a line read backwards. */
const INVISIBLE = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

/**
 * An address: a scheme, "www.", or a bare domain ("evil.example", "bit.ly/x"). A note is words for
 * one person, and a gift is no place to send its reader anywhere, so any of these refuses the note.
 *
 * A sentence that only forgot the space after its full stop is not one, and people do forget it:
 * "Love you.Mum", "Gracias por todo.Es un placer", "happy birthday.me and the kids miss you". So a
 * word, a dot and a word is an address only when it reads like one:
 *   - anything followed by a path ("t.me/abc", "youtu.be/abc", "bit.ly/3xYz"), whatever the ending;
 *   - an ending that is no word in English or Spanish ("evil.com", "evil.pt", "evil.co.uk"), wherever
 *     it stands;
 *   - an ending that is also a word ("tienda.es", "prizes.shop", "about.me") only where the note
 *     stops there, which is how an address is written and not how a sentence carries on.
 * The ending is lower case, as an address is typed, unless the whole of it is in capitals
 * ("EVIL.COM"): "todo.Es" and "you.It" are a new sentence, not a domain.
 */
const SCHEME = /(?:https?:\/\/|\bwww\.[\p{L}\p{N}])/iu;
/** Endings no sentence starts with. */
const PLAIN = "com|net|org|io|uk|eu|fr|nl|ru|cn|pt|mx|ar|br|cl|ai|dev|xyz|biz|ly|gg|example";
/** Endings that are words too: an address only at the end of the note. */
const WORDS = "es|de|it|me|co|be|to|tv|us|la|app|top|live|shop|store|club|site|info|link|online";
// No lookbehind in any of these: this file is also in the editor's bundle, and Safari before 16.4
// refuses to load a script that holds one. A word's start is "the text's start, or after something
// that is neither a letter nor a digit" instead.
const WITH_PATH = /([\p{L}\p{N}-]+)\.(\p{L}{2,24})\/[^\s]/giu;
const ANYWHERE = new RegExp(`(?:^|[^\\p{L}\\p{N}])([\\p{L}\\p{N}-]+)\\.(${PLAIN})(?![\\p{L}\\p{N}])`, "giu");
const AT_THE_END = new RegExp(`(?:^|[^\\p{L}\\p{N}])([\\p{L}\\p{N}-]{2,})\\.(${WORDS})[.,;:!?)\\]"'»”’]*$`, "giu");

/** Typed as an address is: the ending in lower case, or all of it in capitals. */
const typedAsAddress = (label: string, ending: string) => ending === ending.toLowerCase() || (label + ending === (label + ending).toUpperCase() && /\p{L}/u.test(label));
const anyDomain = (pattern: RegExp, text: string) => [...text.matchAll(pattern)].some((match) => typedAsAddress(match[1], match[2]));

/** NFC, one line, single spaces, nothing invisible, trimmed. */
export function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.normalize("NFC").replace(/\s+/g, " ").replace(INVISIBLE, "").replace(/ {2,}/g, " ").trim();
}

export function hasLink(text: string): boolean {
  return SCHEME.test(text) || anyDomain(WITH_PATH, text) || anyDomain(ANYWHERE, text) || anyDomain(AT_THE_END, text);
}

/**
 * How long a name or a note is, for every limit here: as the browser's own `maxlength` counts and as
 * the gift's schema does (UTF-16 units, so most emoji are two). One way of counting everywhere means
 * the page's counter, this check and publishing can never disagree about the same note.
 */
export const lengthOf = (text: string): number => text.length;

export type CleanEntry = { ok: true; name: string; note: string } | { ok: false; error: "invalid" | "no_links" };

/**
 * A contributor's name and note. `noteMax` is the group's own (its template's). A name or a note
 * that starts like a stored file's path is refused too: the gift's storage walk reads any string
 * that begins "gifts/" as one of the gift's files, and a note must never be mistaken for one.
 */
export function cleanEntry(input: { name: unknown; note: unknown }, noteMax: number): CleanEntry {
  const name = cleanText(input.name);
  const note = cleanText(input.note);
  if (!name || !note) return { ok: false, error: "invalid" };
  if (lengthOf(name) > GROUP_LIMITS.entryName || lengthOf(note) > Math.min(noteMax, GROUP_LIMITS.entryNote)) return { ok: false, error: "invalid" };
  if (hasLink(name) || hasLink(note)) return { ok: false, error: "no_links" };
  if (/^gifts\//i.test(name) || /^gifts\//i.test(note)) return { ok: false, error: "invalid" };
  return { ok: true, name, note };
}

/** One of the sender's own lines for the page at the link (their name, who it is for, the prompt), or null when it won't do. */
export function cleanLine(value: unknown, max: number, { required = true }: { required?: boolean } = {}): string | null {
  const text = cleanText(value);
  if (!text) return required ? null : "";
  if (lengthOf(text) > max || hasLink(text)) return null;
  return text;
}
