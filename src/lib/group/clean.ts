import { GROUP_LIMITS } from "./limits";

/**
 * What a stranger typed at a group card's link, made safe to keep and to draw. Pure, and the only
 * way a name or a note gets in (the route). The sender's own form in the panel (a typo fixed, a
 * note typed in for someone) runs the same cleaning and the same link check before it saves, so
 * what it writes is held to the same line: one line of plain text, with no address in it.
 */

/**
 * Control characters, the zero-width space and marks, and the bidi overrides that can make a line
 * read backwards. Written as escapes, so that what this takes out can be read here. The two joiners
 * (U+200C, U+200D) are not in it: they are part of how some writing is spelt, and are judged where
 * they stand (JOINERS, below).
 */
const INVISIBLE = /[\u0000-\u001f\u007f-\u009f​‎‏‪-‮⁠-⁤⁦-⁩﻿]/g;

/**
 * The zero-width joiner and non-joiner are invisible, and are also spelling. U+200D holds a family,
 * a heart on fire, a flag and every "person doing something" emoji together: without it a shrug
 * arrives as a figure followed by a stray female sign. In Persian U+200C keeps two letters apart
 * inside one word, and in Hindi, Bengali and their neighbours either one chooses how a cluster is
 * drawn: taking them out respells the word. So a run of them stays, as one, where it is doing that
 * work: a joiner between two pictures (the first may carry its skin tone or its variation mark), or
 * either of them between two letters of a script that joins. Anywhere else (at an end, beside a
 * space, in the middle of "evil.com") it is only something hidden, and goes.
 */
const JOINERS = /[‌‍]+/g;
const PICTURE = /\p{Extended_Pictographic}/u;
/** What may stand between a picture and its joiner: the "draw me as emoji" mark, or a skin tone. */
const PICTURE_MARK = /[️\u{1f3fb}-\u{1f3ff}]/u;
const LETTER = /[\p{L}\p{M}]/u;
/** The scripts whose letters join or stack, and so use these two to say how. */
const JOINING = /[\p{scx=Arab}\p{scx=Syrc}\p{scx=Mong}\p{scx=Nkoo}\p{scx=Deva}\p{scx=Beng}\p{scx=Guru}\p{scx=Gujr}\p{scx=Orya}\p{scx=Taml}\p{scx=Telu}\p{scx=Knda}\p{scx=Mlym}\p{scx=Sinh}]/u;
const joins = (point: string) => LETTER.test(point) && JOINING.test(point);

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
 * ("EVIL.COM"): "todo.Es" and "you.It" are a new sentence, not a domain. Four endings count however
 * they are written (NEVER_A_WORD, below).
 *
 * It is not a wall, on purpose (docs/GROUP.md, "The address check and its limits"): nothing in a
 * card is ever made a link, and the sender reads every note before it goes in.
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
/**
 * The four endings that are no word, name or abbreviation however they are written: "Evil.Com" is an
 * address, and no sentence goes on "…you.Com". The rest of the plain list keeps the rule above,
 * because a capital can make a word of them: "Happy birthday.Dev and I miss you", "Miss you.UK trip
 * soon", "God bless.Fr Michael", "All done.Net result: a good year".
 */
const NEVER_A_WORD = /^(?:com|org|biz|xyz)$/i;
const anyDomain = (pattern: RegExp, text: string, inAnyCase?: RegExp) => [...text.matchAll(pattern)].some((match) => typedAsAddress(match[1], match[2]) || Boolean(inAnyCase?.test(match[2])));

/** The whole character (both halves of a pair) that ends just before `at`, or the one that starts at it; "" at either end of the text. */
function pointBefore(text: string, at: number): string {
  if (at <= 0) return "";
  const low = text.charCodeAt(at - 1);
  return at >= 2 && low >= 0xdc00 && low <= 0xdfff ? text.slice(at - 2, at) : text[at - 1];
}
const pointAt = (text: string, at: number): string => (at < text.length ? String.fromCodePoint(text.codePointAt(at) ?? 0) : "");

/** Each run of joiners is judged by a function that looks both ways (no lookbehind here either), and what stays is one of them. */
function keepJoiners(text: string): string {
  return text.replace(JOINERS, (run: string, start: number) => {
    const next = pointAt(text, start + run.length);
    const before = pointBefore(text, start);
    let picture = before;
    for (let at = start; picture && PICTURE_MARK.test(picture); picture = pointBefore(text, at)) at -= picture.length;
    if (run.includes("‍") && PICTURE.test(picture) && PICTURE.test(next)) return "‍";
    return joins(before) && joins(next) ? run[0] : "";
  });
}

/** NFC, one line, single spaces, nothing invisible but a joiner that is spelling something, trimmed. */
export function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return keepJoiners(value.normalize("NFC").replace(/\s+/g, " ").replace(INVISIBLE, "")).replace(/ {2,}/g, " ").trim();
}

export function hasLink(text: string): boolean {
  return SCHEME.test(text) || anyDomain(WITH_PATH, text) || anyDomain(ANYWHERE, text, NEVER_A_WORD) || anyDomain(AT_THE_END, text);
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
