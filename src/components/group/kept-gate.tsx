import { keptNoteScript } from "@/lib/group/kept";

/**
 * Rendered by the page at a group card's link, ahead of its form: the few bytes that look in this
 * browser's storage before anything is painted (lib/group/kept.ts says why). It reads one key and
 * marks the document; it sends nothing anywhere and loads nothing.
 */
export function KeptNoteGate({ token }: { token: string }) {
  const code = keptNoteScript(token);
  return code ? <script dangerouslySetInnerHTML={{ __html: code }} /> : null;
}
