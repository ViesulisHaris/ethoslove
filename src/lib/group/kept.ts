/**
 * Where a browser keeps the notes it added at a group card's link (components/group/contribute-form
 * reads and writes them), and the few bytes of script that look there before the page is drawn.
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
