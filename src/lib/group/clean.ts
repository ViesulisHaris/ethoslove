import { GROUP_LIMITS } from "./limits";

/**
 * What a stranger typed at a group card's link, made safe to keep and to draw. Pure, and the only
 * way a name or a note gets in (the route) or is edited by the sender (the panel): everything it
 * returns is one line of plain text.
 */

/** Control characters, zero-width marks and the bidi overrides that can make a line read backwards. */
const INVISIBLE = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

/**
 * An address: a scheme, "www.", or a bare domain ("evil.example", "bit.ly/x"). A note is words for
 * one person, and a gift is no place to send its reader anywhere, so any of these refuses the note.
 * A sentence that only forgot the space after its full stop ("Love you.Mum") is not one: the part
 * after the dot must be a real ending, lower case, and stand at a word's end.
 */
const SCHEME = /(?:https?:\/\/|www\.)/i;
const ENDINGS = "com|net|org|io|co|uk|es|de|fr|it|nl|ru|cn|app|dev|xyz|info|biz|me|tv|ly|gg|link|site|online|shop|store|club|top|live|example";
const DOMAIN = new RegExp(`\\b[\\p{L}\\p{N}-]{2,}\\.(?:${ENDINGS})(?=$|[\\s/:?#.,;!)])`, "iu");

/** NFC, one line, single spaces, nothing invisible, trimmed. */
export function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.normalize("NFC").replace(/\s+/g, " ").replace(INVISIBLE, "").replace(/ {2,}/g, " ").trim();
}

export function hasLink(text: string): boolean {
  return SCHEME.test(text) || DOMAIN.test(text);
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
