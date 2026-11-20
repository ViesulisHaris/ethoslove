/**
 * A part of the editor's form asking for the send screen, which only the editor's shell can open
 * (the letter's "Keep every word" button, components/editor/sections/words.tsx). The send screen
 * runs its own checks as always: this only opens it.
 */
export const OPEN_PUBLISH_EVENT = "ethos:open-publish";

export function askForSendScreen(): void {
  window.dispatchEvent(new Event(OPEN_PUBLISH_EVENT));
}
