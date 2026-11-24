import { GROUP_LIMITS } from "./limits";

/**
 * Where a browser keeps the notes it added at a group card's link (components/group/contribute-form
 * reads and writes them, and so does the "no longer works" page a reset link turns into), and the
 * few bytes of script that look there before the page is drawn.
 *
 * Someone who comes back to the link after adding a note is shown "Your note is with …", which only
 * their browser knows: the server renders the empty form for everyone. Until the page's own script
 * had run, a returning visitor saw that empty form, on a slow phone for seconds, as if the note had
 * gone. `keptNoteScript` runs as the page is read, before anything is painted, and marks the document
 * when this browser holds something for this link; the form is then not drawn until the page knows
 * which screen to show (the form's `[[data-group-kept]_&]:hidden`). A first-time visitor is not
 * touched: their form is there, and can be typed in, from the first frame.
 */
export const KEPT_ATTRIBUTE = "data-group-kept";

export const notesKey = (token: string) => `ethos:group-notes:${token}`;

/** Empty for anything that is not shaped like a link's token: nothing a stranger typed is ever written into a script. */
export function keptNoteScript(token: string): string {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(token)) return "";
  return `try{if(localStorage.getItem(${JSON.stringify(notesKey(token))}))document.documentElement.setAttribute(${JSON.stringify(KEPT_ATTRIBUTE)},"")}catch(e){}`;
}

/**
 * A group card's page as the browser's address has it: /c/<22 characters>, or /es/c/… when it was
 * asked for in Spanish. The same characters lib/group/token.ts makes a token of (that file is the
 * server's: it signs, and cannot be sent to a browser).
 */
const ADDRESS = /^(?:\/[a-z]{2})?\/c\/([A-Za-z0-9_-]{22})\/?$/;

/**
 * The token in a /c/ address, or null for any other address. For the page such an address shows
 * when it opens no card (app/…/c/[token]/not-found.tsx), which is never told its own address.
 */
export function tokenInAddress(pathname: string): string | null {
  return ADDRESS.exec(pathname)?.[1] ?? null;
}

/**
 * A note added from this browser, as the browser keeps it to be able to take it back: the secret the
 * server handed over (`s`), the name it was signed with (`n`, to tell two notes apart when one phone
 * went round a table) and when (`t`). Kept in this browser's own storage under the link, so closing
 * the tab, or adding a second note, takes away nobody's way to withdraw the first; it never leaves
 * the browser except as the secret, when "Take my note back" is tapped.
 */
export type KeptNote = { s: string; n: string; t: number };
/** Longer than any link can stay open, after which the server has nothing left for a secret to find. */
export const KEEP_MS = 120 * 86_400_000;

/** What this browser has stored for the link, as written (null where there is nothing, or storage is off). */
export function storedNotes(token: string): string | null {
  try {
    return window.localStorage.getItem(notesKey(token));
  } catch {
    return null;
  }
}

export function parseNotes(raw: string | null): KeptNote[] {
  if (!raw) return [];
  try {
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter((item): item is KeptNote => Boolean(item) && typeof item.s === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(item.s) && typeof item.n === "string" && typeof item.t === "number").slice(-GROUP_LIMITS.total);
  } catch {
    return [];
  }
}

export function storeNotes(token: string, list: KeptNote[]) {
  try {
    if (list.length) window.localStorage.setItem(notesKey(token), JSON.stringify(list));
    else window.localStorage.removeItem(notesKey(token));
  } catch {
    // Kept for this visit only, then.
  }
}

/**
 * What this browser held for the link when the page came alive, read once and never again. Read on
 * every render, a second tab's form vanished at its next keystroke once the first tab had sent a
 * note: the half-written note was gone and the screen claimed a note that tab never sent. A page
 * changes screens when its own person does something, not when another tab does.
 */
const READ = new Map<string, string | null>();
export function firstRead(token: string): string | null {
  if (!READ.has(token)) READ.set(token, storedNotes(token));
  return READ.get(token) ?? null;
}

/**
 * The notes to write back: what the browser holds now (another tab may have added one, or taken one
 * back, since this page read it) together with what this page knows of, each once. Without the
 * fresh look, the tab that sent second wrote the list back without the first tab's note, and that
 * note could no longer be taken back from anywhere.
 */
export function withStored(token: string, known: KeptNote[]): KeptNote[] {
  const held = parseNotes(storedNotes(token));
  const seen = new Set(held.map((note) => note.s));
  return [...held, ...known.filter((note) => !seen.has(note.s))].sort((a, b) => a.t - b.t);
}
